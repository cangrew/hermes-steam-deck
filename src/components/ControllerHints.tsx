import type { Hint } from "./hints";

const TONE_CLASS: Record<NonNullable<Hint["tone"]>, string> = {
  a: "hint-a",
  b: "hint-b",
  x: "hint-x",
  y: "hint-y",
  bumper: "hint-bumper",
};

/** Persistent bottom bar showing what each control does on the current screen. */
export function ControllerHints({ hints }: { hints: Hint[] }) {
  return (
    <footer className="hints" aria-hidden>
      {hints.map((h) => (
        <span className="hint" key={h.button + h.label}>
          <span className={`hint-btn ${h.tone ? TONE_CLASS[h.tone] : ""}`}>
            {h.button}
          </span>
          <span className="hint-label">{h.label}</span>
        </span>
      ))}
    </footer>
  );
}
