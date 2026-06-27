import { useEffect, useState } from "react";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { useOsk } from "../state/osk";
import { FocusableButton, FocusSection } from "./focusables";

const ROWS_LOWER = [
  "1234567890".split(""),
  "qwertyuiop".split(""),
  "asdfghjkl".split(""),
  "zxcvbnm".split(""),
];
const ROWS_UPPER = [
  "1234567890".split(""),
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  "ZXCVBNM".split(""),
];
const ROWS_SYMBOLS = [
  "1234567890".split(""),
  "@#$_&-+()".split(""),
  "*\"':;!?/".split(""),
  ".,~`|•".split(""),
];

type Layer = "lower" | "upper" | "symbols";

const FIRST_KEY = "osk-key-0-0";

/**
 * The built-in on-screen keyboard overlay. Every key is a spatial-navigation
 * focusable, so the d-pad/stick moves between keys and A/Enter presses them.
 * Navigation is trapped inside the keyboard while it is open.
 */
export function OnScreenKeyboard() {
  const { open, value, label, multiline, insert, backspace, submit, close, setValue } =
    useOsk();
  const [layer, setLayer] = useState<Layer>("lower");

  useEffect(() => {
    if (open) {
      setLayer("lower");
      // Focus the keyboard once it has mounted.
      const t = setTimeout(() => setFocus(FIRST_KEY), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const rows =
    layer === "lower" ? ROWS_LOWER : layer === "upper" ? ROWS_UPPER : ROWS_SYMBOLS;

  const press = (k: string) => {
    insert(k);
    if (layer === "upper") setLayer("lower"); // shift is one-shot
  };

  return (
    <div className="osk-backdrop" role="dialog" aria-label="On-screen keyboard">
      <FocusSection className="osk" boundary focusKey="osk">
        <div className="osk-preview">
          <span className="osk-label">{label ?? "Input"}</span>
          <span className="osk-text">
            {value || <span className="placeholder">type…</span>}
            <span className="osk-caret" />
          </span>
        </div>

        {rows.map((row, r) => (
          <div className="osk-row" key={r}>
            {row.map((k, c) => (
              <FocusableButton
                key={k}
                focusKey={`osk-key-${r}-${c}`}
                className="osk-key"
                onPress={() => press(k)}
              >
                {k}
              </FocusableButton>
            ))}
          </div>
        ))}

        <div className="osk-row">
          <FocusableButton
            className="osk-key osk-wide"
            onPress={() => setLayer(layer === "upper" ? "lower" : "upper")}
          >
            ⇧ Shift
          </FocusableButton>
          <FocusableButton
            className="osk-key osk-wide"
            onPress={() => setLayer(layer === "symbols" ? "lower" : "symbols")}
          >
            {layer === "symbols" ? "ABC" : "?123"}
          </FocusableButton>
          <FocusableButton className="osk-key osk-space" onPress={() => insert(" ")}>
            space
          </FocusableButton>
          <FocusableButton className="osk-key osk-wide" onPress={backspace}>
            ⌫
          </FocusableButton>
          {multiline && (
            <FocusableButton className="osk-key osk-wide" onPress={() => insert("\n")}>
              ⏎
            </FocusableButton>
          )}
        </div>

        <div className="osk-row">
          <FocusableButton className="osk-key osk-clear" onPress={() => setValue("")}>
            Clear
          </FocusableButton>
          <FocusableButton className="osk-key osk-cancel" onPress={close}>
            Cancel (B)
          </FocusableButton>
          <FocusableButton className="osk-key osk-done" onPress={submit}>
            Done
          </FocusableButton>
        </div>
      </FocusSection>
    </div>
  );
}
