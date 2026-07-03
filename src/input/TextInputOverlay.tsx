import { useEffect, useRef } from "react";
import { doesFocusableExist, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { useOsk } from "../state/osk";
import { useStore } from "../state/store";
import { DaisyWheel } from "./DaisyWheel";
import { OnScreenKeyboard } from "./OnScreenKeyboard";

/**
 * Hosts the active text-entry surface. Both the daisywheel (default, fast
 * controller typing) and the grid keyboard write through the same osk store,
 * and the user can switch between them mid-entry; the preference persists
 * with the rest of the settings.
 */
export function TextInputOverlay() {
  const open = useOsk((s) => s.open);
  const mode = useStore((s) => s.settings.typingMode ?? "wheel");
  const updateSettings = useStore((s) => s.updateSettings);

  // Restore spatial focus to the field that opened the overlay once it closes,
  // whichever surface was active.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      const rk = useOsk.getState().returnFocusKey;
      if (rk && doesFocusableExist(rk)) setFocus(rk);
    }
  }, [open]);

  if (!open) return null;

  return mode === "grid" ? (
    <OnScreenKeyboard onSwitchMode={() => updateSettings({ typingMode: "wheel" })} />
  ) : (
    <DaisyWheel onSwitchMode={() => updateSettings({ typingMode: "grid" })} />
  );
}
