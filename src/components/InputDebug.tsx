import { useEffect, useRef, useState } from "react";

/**
 * Live input readout for diagnosing controller issues on the Steam Deck:
 * whether the browser's Gamepad API sees a pad, the last gamepad button index,
 * and the last keyboard key (Steam Input can map controls to either).
 */
export function InputDebug() {
  const [pad, setPad] = useState<string | null>(null);
  const [lastButton, setLastButton] = useState("—");
  const [lastKey, setLastKey] = useState("—");
  const raf = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => setLastKey(`${e.key} (code ${e.keyCode})`);
    window.addEventListener("keydown", onKey);

    const prev = new Map<number, boolean>();
    const loop = () => {
      raf.current = requestAnimationFrame(loop);
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const p = Array.from(pads).find((x): x is Gamepad => x != null) ?? null;
      // setState with the same primitive is a no-op in React, so this won't
      // re-render every frame unless something actually changed.
      setPad(p ? p.id : null);
      if (p) {
        p.buttons.forEach((b, i) => {
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
        Gamepad detected:{" "}
        <b className={pad ? "ok" : "bad"}>{pad ?? "no"}</b>
      </div>
      <div>
        Last gamepad button: <b>{lastButton}</b>
      </div>
      <div>
        Last key received: <b>{lastKey}</b>
      </div>
      <p className="muted">
        Press buttons / D-pad and watch this. If "Gamepad detected" stays "no" but
        keys appear, your Steam layout is sending keyboard input (good — the app
        uses it). If neither changes, the controller isn't reaching the browser.
      </p>
    </div>
  );
}
