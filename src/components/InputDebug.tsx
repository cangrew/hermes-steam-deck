import { useEffect, useRef, useState } from "react";
import { pickGamepad } from "../input/useGamepad";

interface PadInfo {
  index: number;
  id: string;
  mapping: string;
  connected: boolean;
  active: boolean;
}

/**
 * Live input readout for diagnosing controller issues on the Steam Deck: every
 * pad the browser's Gamepad API sees (with mapping and which one the app uses),
 * the last gamepad button index, and the last keyboard key (Steam Input can map
 * controls to either).
 */
export function InputDebug() {
  const [pads, setPads] = useState<PadInfo[]>([]);
  const [lastButton, setLastButton] = useState("—");
  const [lastKey, setLastKey] = useState("—");
  const raf = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => setLastKey(`${e.key} (code ${e.keyCode})`);
    window.addEventListener("keydown", onKey);

    const prev = new Map<number, boolean>();
    let lastSnapshot = "";
    const loop = () => {
      raf.current = requestAnimationFrame(loop);
      const raw = navigator.getGamepads ? navigator.getGamepads() : [];
      const active = pickGamepad(raw);
      const infos: PadInfo[] = Array.from(raw)
        .filter((p): p is Gamepad => p != null)
        .map((p) => ({
          index: p.index,
          id: p.id,
          mapping: p.mapping,
          connected: p.connected,
          active: p === active,
        }));
      // Array state re-renders every frame unless we explicitly diff it.
      const snapshot = JSON.stringify(infos);
      if (snapshot !== lastSnapshot) {
        lastSnapshot = snapshot;
        setPads(infos);
      }
      if (active) {
        active.buttons.forEach((b, i) => {
          const was = prev.get(i) ?? false;
          if (b.pressed && !was) setLastButton(`button ${i}`);
          prev.set(i, b.pressed);
        });
      }
    };
    raf.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div className="diag">
      <div>
        Gamepads detected:{" "}
        <b className={pads.length > 0 ? "ok" : "bad"}>{pads.length || "none"}</b>
      </div>
      {pads.map((p) => (
        <div key={p.index}>
          #{p.index} — <b>{p.id}</b> — mapping: {p.mapping || "(none)"} —{" "}
          {p.connected ? "connected" : "disconnected"}
          {p.active ? " — (active)" : ""}
        </div>
      ))}
      <div>
        Last gamepad button: <b>{lastButton}</b>
      </div>
      <div>
        Last key received: <b>{lastKey}</b>
      </div>
      <p className="muted">
        Press buttons / D-pad and watch this. A pad with mapping "standard" means
        the Gamepad API path works. If no pad ever appears, press any button once
        (the browser hides pads until the first press); if it still shows none in
        Gaming Mode, the browser sandbox is missing udev access — launch through
        the updated launch-kiosk.sh (or re-run install.sh). Keys appearing instead
        of buttons means your Steam layout sends keyboard input, which the app
        also fully supports.
      </p>
    </div>
  );
}
