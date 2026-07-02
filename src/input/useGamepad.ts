import { useEffect, useRef } from "react";
import { navigateByDirection } from "@noriginmedia/norigin-spatial-navigation";
import { currentCapture } from "./gamepadCapture";

export interface GamepadHandlers {
  /** B button — contextual back / cancel. */
  onBack?: () => void;
  /** X button — toggle the on-screen keyboard. */
  onToggleKeyboard?: () => void;
  /** Y button — context menu / secondary action. */
  onMenu?: () => void;
  /** Left bumper — previous screen/tab. */
  onPrevScreen?: () => void;
  /** Right bumper — next screen/tab. */
  onNextScreen?: () => void;
  /** Start — open settings. */
  onStart?: () => void;
  /** Triggers — page scroll. */
  onScroll?: (direction: "up" | "down") => void;
  /** Ensure something is focused before navigating (anchors the focus cursor). */
  ensureFocus?: () => void;
}

// Standard gamepad mapping (Xbox-like), which Gamescope/Steam Input present to
// the browser for the Steam Deck's built-in controls.
export const BTN = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  L3: 10,
  R3: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
} as const;

const DEADZONE = 0.4;
const FIRST_REPEAT_MS = 380;
const REPEAT_MS = 110;

// Analog triggers report `value` without always flipping `pressed`.
const ANALOG_THRESHOLD = 0.6;

/**
 * Pick the pad to drive the app: prefer a connected standard-mapping pad (what
 * Steam Input's virtual X360 gamepad reports), fall back to the first connected
 * pad. Game Mode can expose several entries (virtual pad, raw "Steam Deck"
 * device, phantom slots), and a non-standard pad would break the button map.
 */
export function pickGamepad(pads: readonly (Gamepad | null)[]): Gamepad | null {
  const live = Array.from(pads).filter((p): p is Gamepad => p != null && p.connected);
  return live.find((p) => p.mapping === "standard") ?? live[0] ?? null;
}

/**
 * Polls the Gamepad API each animation frame and translates the Steam Deck's
 * physical controls into spatial-navigation moves and app actions. Direction
 * presses auto-repeat when held. Falls back silently when no gamepad is
 * present (mouse/touch/keyboard still work).
 *
 * When a capture handler is registered (see gamepadCapture.ts), the raw frame
 * goes to that handler instead and none of the default actions fire.
 */
export function useGamepad(handlers: GamepadHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;

    let raf = 0;
    const prevButtons = new Map<number, boolean>();
    let padIndex = -1;
    let dir: "up" | "down" | "left" | "right" | null = null;
    let nextDirAt = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const pads = navigator.getGamepads();
      const pad = pickGamepad(pads);
      const cap = currentCapture();
      if (!pad) {
        cap?.(null);
        return;
      }
      // If the selected pad changed (Steam Input reconnecting, a better-mapped
      // pad appearing), drop edge/repeat state so it can't swallow or fabricate
      // presses on the new device.
      if (pad.index !== padIndex) {
        padIndex = pad.index;
        prevButtons.clear();
        dir = null;
      }
      const h = ref.current;

      // Edge state is tracked every frame — even under capture — so a press
      // held across a capture handoff is neither swallowed nor re-fired.
      const held: boolean[] = [];
      const edges: boolean[] = [];
      for (let i = 0; i < pad.buttons.length; i++) {
        const b = pad.buttons[i];
        const p = !!b && (b.pressed || (b.value ?? 0) > ANALOG_THRESHOLD);
        held[i] = p;
        edges[i] = p && !(prevButtons.get(i) ?? false);
        prevButtons.set(i, p);
      }
      const pressed = (i: number) => !!held[i];
      const edge = (i: number) => !!edges[i];

      if (cap) {
        cap({ now, lx: pad.axes[0] ?? 0, ly: pad.axes[1] ?? 0, pressed, edge });
        // Reset repeat state so releasing capture starts direction input fresh.
        dir = null;
        return;
      }

      // --- Action buttons (edge-triggered) ---
      if (edge(BTN.A)) {
        h.ensureFocus?.();
        const el = document.activeElement as HTMLElement | null;
        el?.click?.();
      }
      if (edge(BTN.B)) h.onBack?.();
      if (edge(BTN.X)) h.onToggleKeyboard?.();
      if (edge(BTN.Y)) h.onMenu?.();
      if (edge(BTN.LB)) h.onPrevScreen?.();
      if (edge(BTN.RB)) h.onNextScreen?.();
      if (edge(BTN.START)) h.onStart?.();
      if (edge(BTN.LT)) h.onScroll?.("up");
      if (edge(BTN.RT)) h.onScroll?.("down");

      // --- Direction (d-pad + left stick), with auto-repeat ---
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      let nextDir: typeof dir = null;
      if (pressed(BTN.DPAD_UP) || ay < -DEADZONE) nextDir = "up";
      else if (pressed(BTN.DPAD_DOWN) || ay > DEADZONE) nextDir = "down";
      else if (pressed(BTN.DPAD_LEFT) || ax < -DEADZONE) nextDir = "left";
      else if (pressed(BTN.DPAD_RIGHT) || ax > DEADZONE) nextDir = "right";

      if (nextDir !== dir) {
        dir = nextDir;
        nextDirAt = now + (nextDir ? FIRST_REPEAT_MS : 0);
        if (nextDir) {
          h.ensureFocus?.();
          move(nextDir);
        }
      } else if (dir && now >= nextDirAt) {
        nextDirAt = now + REPEAT_MS;
        move(dir);
      }
    };

    const move = (d: "up" | "down" | "left" | "right") => {
      navigateByDirection(d, {});
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
