import { useEffect, useRef, useState } from "react";
import { useOsk } from "../state/osk";
import { registerGamepadCapture } from "./gamepadCapture";
import { BTN } from "./useGamepad";
import { sectorFromStick } from "./wheelMath";
import {
  activeLayer,
  shiftAfterInsert,
  shiftPressed,
  WHEEL_LAYERS,
  type ShiftState,
} from "./wheelLayout";

const BACKSPACE_FIRST_MS = 380;
const BACKSPACE_REPEAT_MS = 110;

// SVG geometry (viewBox units).
const SIZE = 400;
const C = SIZE / 2;
const OUTER_R = 192;
const INNER_R = 74;
const SECTOR_DEG = 45;

/** Polar → screen coords, angle in degrees clockwise from straight up. */
function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)];
}

function wedgePath(sector: number): string {
  const a0 = sector * SECTOR_DEG - SECTOR_DEG / 2;
  const a1 = sector * SECTOR_DEG + SECTOR_DEG / 2;
  const [ix0, iy0] = polar(INNER_R, a0);
  const [ox0, oy0] = polar(OUTER_R, a0);
  const [ox1, oy1] = polar(OUTER_R, a1);
  const [ix1, iy1] = polar(INNER_R, a1);
  return [
    `M ${ix0} ${iy0}`,
    `L ${ox0} ${oy0}`,
    `A ${OUTER_R} ${OUTER_R} 0 0 1 ${ox1} ${oy1}`,
    `L ${ix1} ${iy1}`,
    `A ${INNER_R} ${INNER_R} 0 0 0 ${ix0} ${iy0}`,
    "Z",
  ].join(" ");
}

// Character slots sit in a diamond around each petal's centroid, mirroring the
// face-button layout: 0=top(Y), 1=left(X), 2=right(B), 3=bottom(A).
const SLOT_R = (OUTER_R + INNER_R) / 2;
const SLOT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, -27],
  [-31, 0],
  [31, 0],
  [0, 27],
];
const SLOT_CLASSES = ["wheel-slot-y", "wheel-slot-x", "wheel-slot-b", "wheel-slot-a"];

function slotCenter(sector: number, slot: number): [number, number] {
  const [cx, cy] = polar(SLOT_R, sector * SECTOR_DEG);
  const [dx, dy] = SLOT_OFFSETS[slot];
  return [cx + dx, cy + dy];
}

export interface DaisyWheelProps {
  /** Switch to the grid keyboard (preference persisted by the host). */
  onSwitchMode?: () => void;
}

/**
 * Fast controller-native typing: the left stick points at one of 8 petals and
 * A/B/X/Y pick a character positionally, so most characters cost two inputs
 * and zero cursor traversal. While open it owns the gamepad via the capture
 * registry — face buttons type (B included), SELECT cancels, START submits.
 * Petals are also tappable for touch, and a hardware keyboard types directly.
 */
export function DaisyWheel({ onSwitchMode }: DaisyWheelProps) {
  const { value, label, multiline, password } = useOsk();

  const [sector, setSector] = useState<number | null>(null);
  const [shift, setShift] = useState<ShiftState>("off");
  const [symbols, setSymbols] = useState(false);

  // The capture handler runs per animation frame; refs mirror the interactive
  // state so a single stable handler never sees stale closures.
  const sectorRef = useRef(sector);
  const shiftRef = useRef(shift);
  const symbolsRef = useRef(symbols);
  const lastShiftAt = useRef(-Infinity);
  const nextBackspaceAt = useRef(0);

  const updateShift = (next: ShiftState) => {
    shiftRef.current = next;
    setShift(next);
  };

  const insertChar = (c: string) => {
    useOsk.getState().insert(c);
    updateShift(shiftAfterInsert(shiftRef.current));
  };

  const pressShift = (now: number) => {
    const since = now - lastShiftAt.current;
    lastShiftAt.current = now;
    updateShift(shiftPressed(shiftRef.current, since));
  };

  const toggleSymbols = () => {
    symbolsRef.current = !symbolsRef.current;
    setSymbols(symbolsRef.current);
  };

  // --- Gamepad ownership ---
  useEffect(() => {
    return registerGamepadCapture((frame) => {
      if (!frame) {
        if (sectorRef.current !== null) {
          sectorRef.current = null;
          setSector(null);
        }
        return;
      }

      const next = sectorFromStick(frame.lx, frame.ly, sectorRef.current);
      if (next !== sectorRef.current) {
        sectorRef.current = next;
        setSector(next);
      }

      if (sectorRef.current !== null) {
        const layer = WHEEL_LAYERS[activeLayer(shiftRef.current, symbolsRef.current)];
        const petal = layer[sectorRef.current];
        if (frame.edge(BTN.Y)) insertChar(petal[0]);
        if (frame.edge(BTN.X)) insertChar(petal[1]);
        if (frame.edge(BTN.B)) insertChar(petal[2]);
        if (frame.edge(BTN.A)) insertChar(petal[3]);
      }

      if (frame.edge(BTN.RT)) useOsk.getState().insert(" ");

      if (frame.pressed(BTN.LT)) {
        if (frame.edge(BTN.LT)) {
          useOsk.getState().backspace();
          nextBackspaceAt.current = frame.now + BACKSPACE_FIRST_MS;
        } else if (frame.now >= nextBackspaceAt.current) {
          useOsk.getState().backspace();
          nextBackspaceAt.current = frame.now + BACKSPACE_REPEAT_MS;
        }
      }

      if (frame.edge(BTN.LB)) pressShift(frame.now);
      if (frame.edge(BTN.RB)) toggleSymbols();
      if (frame.edge(BTN.SELECT)) useOsk.getState().close();
      if (frame.edge(BTN.START)) useOsk.getState().submit();
      if (frame.edge(BTN.R3) && useOsk.getState().multiline) {
        useOsk.getState().insert("\n");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Hardware keyboard path ---
  // Capture phase + stopPropagation so the app's global bindings ([/] tab
  // switching, spatial-nav Enter) don't react to typed characters.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const osk = useOsk.getState();
      if (e.key === "Escape") osk.close();
      else if (e.key === "Enter") {
        if (osk.multiline) osk.insert("\n");
        else osk.submit();
      } else if (e.key === "Backspace") osk.backspace();
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)
        osk.insert(e.key);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const layerName = activeLayer(shift, symbols);
  const layer = WHEEL_LAYERS[layerName];
  const active = sector !== null ? layer[sector] : null;
  const display = password && value ? "•".repeat(value.length) : value;

  const strip = (
    <div className="osk-row wheel-strip">
      <button
        type="button"
        className={`osk-key osk-wide ${shift !== "off" ? "wheel-key-active" : ""}`}
        onClick={() => pressShift(performance.now())}
      >
        {shift === "caps" ? "⇪ CAPS" : "⇧ Shift"}
      </button>
      <button
        type="button"
        className={`osk-key osk-wide ${symbols ? "wheel-key-active" : ""}`}
        onClick={toggleSymbols}
      >
        {symbols ? "ABC" : "?123"}
      </button>
      <button
        type="button"
        className="osk-key osk-space"
        onClick={() => useOsk.getState().insert(" ")}
      >
        space
      </button>
      <button type="button" className="osk-key osk-wide" onClick={() => useOsk.getState().backspace()}>
        ⌫
      </button>
      {multiline && (
        <button type="button" className="osk-key osk-wide" onClick={() => useOsk.getState().insert("\n")}>
          ⏎
        </button>
      )}
      <button type="button" className="osk-key osk-cancel" onClick={() => useOsk.getState().close()}>
        Cancel
      </button>
      <button type="button" className="osk-key osk-done" onClick={() => useOsk.getState().submit()}>
        Done
      </button>
    </div>
  );

  return (
    <div className="osk-backdrop" role="dialog" aria-label="Daisywheel keyboard">
      <div className="osk wheel">
        <div className="osk-preview">
          <span className="osk-label">{label ?? "Input"}</span>
          <span className="osk-text">
            {display || <span className="placeholder">type…</span>}
            <span className="osk-caret" />
          </span>
        </div>

        <div className="wheel-body">
          <svg
            className="wheel-svg"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            aria-hidden="true"
          >
            {layer.map((petal, s) => (
              <g key={s} className={`wheel-petal ${s === sector ? "active" : ""}`}>
                <path d={wedgePath(s)} className="wheel-wedge" />
                {petal.map((ch, slot) => {
                  const [x, y] = slotCenter(s, slot);
                  return (
                    <g key={slot} className="wheel-char" onClick={() => insertChar(ch)}>
                      <circle cx={x} cy={y} r={20} className="wheel-char-hit" />
                      <text x={x} y={y} className="wheel-char-text">
                        {ch}
                      </text>
                    </g>
                  );
                })}
              </g>
            ))}

            {/* Hub: the active petal's characters with their face buttons. */}
            <circle cx={C} cy={C} r={INNER_R - 6} className="wheel-hub" />
            {active ? (
              SLOT_OFFSETS.map(([dx, dy], slot) => (
                <g key={slot} onClick={() => insertChar(active[slot])}>
                  <circle
                    cx={C + dx * 1.35}
                    cy={C + dy * 1.35}
                    r={17}
                    className={`wheel-badge ${SLOT_CLASSES[slot]}`}
                  />
                  <text x={C + dx * 1.35} y={C + dy * 1.35} className="wheel-badge-text">
                    {active[slot]}
                  </text>
                </g>
              ))
            ) : (
              <text x={C} y={C} className="wheel-hub-hint">
                ◉ point
              </text>
            )}
          </svg>

          <div className="wheel-side">
            <div className="wheel-hints">
              <span className="hint">
                <span className="hint-btn">LS</span> petal
              </span>
              <span className="hint">
                <span className="hint-btn hint-y">Y</span>
                <span className="hint-btn hint-x">X</span>
                <span className="hint-btn hint-b">B</span>
                <span className="hint-btn hint-a">A</span> type
              </span>
              <span className="hint">
                <span className="hint-btn">RT</span> space
              </span>
              <span className="hint">
                <span className="hint-btn">LT</span> backspace
              </span>
              <span className="hint">
                <span className="hint-btn">LB</span> shift
              </span>
              <span className="hint">
                <span className="hint-btn">RB</span> {symbols ? "abc" : "?123"}
              </span>
              {multiline && (
                <span className="hint">
                  <span className="hint-btn">R3</span> newline
                </span>
              )}
              <span className="hint">
                <span className="hint-btn">⧉</span> cancel
              </span>
              <span className="hint">
                <span className="hint-btn">☰</span> done
              </span>
            </div>
            {onSwitchMode && (
              <button type="button" className="osk-key wheel-mode-toggle" onClick={onSwitchMode}>
                ⌨ Grid keyboard
              </button>
            )}
          </div>
        </div>

        {strip}
      </div>
    </div>
  );
}
