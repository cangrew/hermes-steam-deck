import { useEffect, useState } from "react";
import { FocusableButton } from "../focusables";
import { extractCurrentWord, loadedWords, loadWords, suggest } from "./predict";

export interface SuggestionBarProps {
  /** Current field value; the trailing word is completed. */
  value: string;
  /** Suppressed entirely for password fields. */
  password?: boolean;
  /**
   * "grid" renders spatial-navigation focusables (D-pad reaches them, A
   * accepts). "wheel" renders plain buttons and highlights `selectedIndex`,
   * which the wheel drives with the D-pad.
   */
  mode: "grid" | "wheel";
  selectedIndex?: number;
  /** Called with the chosen completion. */
  onAccept: (suggestion: string) => void;
  /** Reports the current suggestion list back to the host (for D-pad bounds). */
  onSuggestions?: (list: string[]) => void;
}

/**
 * Word-completion strip shown above the keyboard. Predictions come from the
 * lazily-loaded frequency list; the bar renders nothing until a word is being
 * typed and at least one match exists.
 */
export function SuggestionBar({
  value,
  password,
  mode,
  selectedIndex = 0,
  onAccept,
  onSuggestions,
}: SuggestionBarProps) {
  const [words, setWords] = useState<string[] | null>(loadedWords());

  useEffect(() => {
    if (words) return;
    let alive = true;
    void loadWords().then((w) => {
      if (alive) setWords(w);
    });
    return () => {
      alive = false;
    };
  }, [words]);

  const word = password ? "" : extractCurrentWord(value);
  const suggestions = words && word ? suggest(words, word) : [];

  useEffect(() => {
    onSuggestions?.(suggestions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions.join("")]);

  if (!suggestions.length) return null;

  return (
    <div className="osk-row suggest-bar">
      {suggestions.map((s, i) =>
        mode === "grid" ? (
          <FocusableButton key={s} className="osk-key suggest" onPress={() => onAccept(s)}>
            {s}
          </FocusableButton>
        ) : (
          <button
            key={s}
            type="button"
            className={`osk-key suggest ${i === selectedIndex ? "selected" : ""}`}
            onClick={() => onAccept(s)}
          >
            {s}
          </button>
        ),
      )}
    </div>
  );
}
