import { useEffect, useRef } from "react";
import { navigateByDirection } from "@noriginmedia/norigin-spatial-navigation";

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
  /** When true, directional input is suppressed (e.g. an OSK owns the d-pad). */
  capture?: boolean;
}

// Standard gamepad mapping (Xbox-like), which Gamescope/Steam Input present to
// the browser for the Steam Deck's built-in controls.
const BTN = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  START: 9,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
} as const;

const DEADZONE = 0.4;
const FIRST_REPEAT_MS = 380;
const REPEAT_MS = 110;

/**
 * Polls the Gamepad API each animation frame and translates the Steam Deck's
 * physical controls into spatial-navigation moves and app actions. Direction
 * presses auto-repeat when held. Falls back silently when no gamepad is
 * present (mouse/touch/keyboard still work).
 */
export function useGamepad(handlers: GamepadHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;

    let raf = 0;
    const prevButtons = new Map<number, boolean>();
    let dir: "up" | "down" | "left" | "right" | null = null;
    let nextDirAt = 0;

    const edge = (index: number, pressed: boolean): boolean => {
      const was = prevButtons.get(index) ?? false;
      prevButtons.set(index, pressed);
      return pressed && !was;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const pads = navigator.getGamepads();
      const pad = Array.from(pads).find((p): p is Gamepad => p != null);
      if (!pad) return;
      const h = ref.current;

      const pressed = (i: number) => !!pad.buttons[i]?.pressed;

      // --- Action buttons (edge-triggered) ---
      if (edge(BTN.A, pressed(BTN.A))) {
        const el = document.activeElement as HTMLElement | null;
        el?.click?.();
      }
      if (edge(BTN.B, pressed(BTN.B))) h.onBack?.();
      if (edge(BTN.X, pressed(BTN.X))) h.onToggleKeyboard?.();
      if (edge(BTN.Y, pressed(BTN.Y))) h.onMenu?.();
      if (edge(BTN.LB, pressed(BTN.LB))) h.onPrevScreen?.();
      if (edge(BTN.RB, pressed(BTN.RB))) h.onNextScreen?.();
      if (edge(BTN.START, pressed(BTN.START))) h.onStart?.();
      if (edge(BTN.LT, pressed(BTN.LT) || (pad.buttons[BTN.LT]?.value ?? 0) > 0.6))
        h.onScroll?.("up");
      if (edge(BTN.RT, pressed(BTN.RT) || (pad.buttons[BTN.RT]?.value ?? 0) > 0.6))
        h.onScroll?.("down");

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
        if (nextDir && !h.capture) move(nextDir);
      } else if (dir && now >= nextDirAt) {
        nextDirAt = now + REPEAT_MS;
        if (!h.capture) move(dir);
      }
    };

    const move = (d: "up" | "down" | "left" | "right") => {
      navigateByDirection(d, {});
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
