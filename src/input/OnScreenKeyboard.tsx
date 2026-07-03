import { useEffect, useState } from "react";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { useOsk } from "../state/osk";
import { FocusableButton, FocusSection } from "./focusables";
import { ROWS_LOWER, ROWS_SYMBOLS, ROWS_UPPER } from "./oskRows";
import { SuggestionBar } from "./predict/SuggestionBar";
import { acceptSuggestion } from "./predict/predict";

type Layer = "lower" | "upper" | "symbols";

const FIRST_KEY = "osk-key-0-0";

export interface OnScreenKeyboardProps {
  /** Switch to the daisywheel (preference persisted by the host). */
  onSwitchMode?: () => void;
}

/**
 * The grid on-screen keyboard overlay. Every key is a spatial-navigation
 * focusable, so the d-pad/stick moves between keys and A/Enter presses them.
 * Navigation is trapped inside the keyboard while it is open. Focus restore
 * on close is handled by the hosting TextInputOverlay.
 */
export function OnScreenKeyboard({ onSwitchMode }: OnScreenKeyboardProps) {
  const {
    open,
    value,
    label,
    multiline,
    password,
    insert,
    backspace,
    submit,
    close,
    setValue,
  } = useOsk();
  const [layer, setLayer] = useState<Layer>("lower");

  useEffect(() => {
    if (!open) return;
    setLayer("lower");
    // Focus the keyboard once it has mounted.
    const t = setTimeout(() => setFocus(FIRST_KEY), 0);
    return () => clearTimeout(t);
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
            {value ? (
              password ? (
                "•".repeat(value.length)
              ) : (
                value
              )
            ) : (
              <span className="placeholder">type…</span>
            )}
            <span className="osk-caret" />
          </span>
        </div>

        <SuggestionBar
          value={value}
          password={password}
          mode="grid"
          onAccept={(s) => setValue(acceptSuggestion(value, s))}
        />

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
          {onSwitchMode && (
            <FocusableButton className="osk-key osk-wide" onPress={onSwitchMode}>
              ◎ Wheel
            </FocusableButton>
          )}
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
