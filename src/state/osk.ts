import { create } from "zustand";

export interface OpenKeyboardOptions {
  value: string;
  label?: string;
  multiline?: boolean;
  /** Mask the value preview (API keys etc.). */
  password?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  /** Restore spatial focus here when the keyboard closes. */
  returnFocusKey?: string;
}

interface OskState extends OpenKeyboardOptions {
  open: boolean;
  openKeyboard: (opts: OpenKeyboardOptions) => void;
  setValue: (value: string) => void;
  insert: (text: string) => void;
  backspace: () => void;
  submit: () => void;
  close: () => void;
}

/**
 * Built-in, controller-driven on-screen keyboard state. This is the reliable
 * text-entry path on the Steam Deck — it does not depend on the Steam OSK
 * popping up for a non-Steam browser app. Hardware/Steam keyboards still work
 * by typing directly into the focused field.
 */
export const useOsk = create<OskState>((set, get) => ({
  open: false,
  value: "",

  openKeyboard: (opts) => set({ open: true, ...opts }),

  setValue: (value) => {
    get().onChange?.(value);
    set({ value });
  },

  insert: (text) => get().setValue(get().value + text),

  backspace: () => {
    const v = get().value;
    get().setValue(v.slice(0, -1));
  },

  submit: () => {
    get().onSubmit?.(get().value);
    set({ open: false });
  },

  close: () => set({ open: false }),
}));
