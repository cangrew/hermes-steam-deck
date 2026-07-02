/**
 * Raw gamepad capture registry. While a handler is registered, `useGamepad`
 * hands it the full pad state every animation frame and suppresses ALL default
 * dispatch (face buttons, bumpers, triggers, Start) and spatial navigation.
 *
 * This exists for overlays like the daisywheel where the face buttons type
 * characters — B must insert a letter, not trigger the global "back" action.
 *
 * Handlers form a stack; the most recently registered one wins. Registering
 * returns an unregister function (safe to call more than once), which keeps
 * mount/unmount pairs balanced under React StrictMode's double-invoke.
 */

export interface GamepadFrame {
  /** requestAnimationFrame timestamp for the frame. */
  now: number;
  /** Raw left-stick axes (no deadzone applied). */
  lx: number;
  ly: number;
  /** Whether a button is held this frame (analog triggers count past 0.6). */
  pressed: (btn: number) => boolean;
  /** Whether a button was newly pressed this frame (rising edge). */
  edge: (btn: number) => boolean;
}

/** Receives a frame per tick, or `null` when no gamepad is connected. */
export type CaptureHandler = (frame: GamepadFrame | null) => void;

const stack: CaptureHandler[] = [];

export function registerGamepadCapture(handler: CaptureHandler): () => void {
  stack.push(handler);
  return () => {
    const i = stack.lastIndexOf(handler);
    if (i !== -1) stack.splice(i, 1);
  };
}

export function currentCapture(): CaptureHandler | null {
  return stack[stack.length - 1] ?? null;
}
