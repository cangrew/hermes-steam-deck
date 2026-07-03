/**
 * Character layout for the daisywheel. Eight petals, clockwise from the top;
 * each petal holds four characters selected positionally by the face buttons:
 * slot 0 = top (Y), 1 = left (X), 2 = right (B), 3 = bottom (A).
 */

/** [top(Y), left(X), right(B), bottom(A)] */
export type Petal = readonly [string, string, string, string];
export type WheelLayer = readonly Petal[];

export const SLOT_BUTTONS = ["Y", "X", "B", "A"] as const;

const LOWER: WheelLayer = [
  ["a", "b", "c", "d"],
  ["e", "f", "g", "h"],
  ["i", "j", "k", "l"],
  ["m", "n", "o", "p"],
  ["q", "r", "s", "t"],
  ["u", "v", "w", "x"],
  ["y", "z", "'", "-"],
  [".", ",", "?", "!"],
];

const UPPER: WheelLayer = LOWER.map(
  (p) => p.map((c) => c.toUpperCase()) as unknown as Petal,
);

const SYMBOLS: WheelLayer = [
  ["1", "2", "3", "4"],
  ["5", "6", "7", "8"],
  ["9", "0", "@", "#"],
  ["$", "%", "&", "_"],
  ["(", ")", "[", "]"],
  ["+", "-", "*", "/"],
  [":", ";", '"', "`"],
  ["~", "|", "•", "="],
];

export type WheelLayerName = "lower" | "upper" | "symbols";

export const WHEEL_LAYERS: Record<WheelLayerName, WheelLayer> = {
  lower: LOWER,
  upper: UPPER,
  symbols: SYMBOLS,
};

// --- Shift state machine ---
// off → once (reverts after one character, like the grid OSK's one-shot shift)
// once → caps when Shift is pressed again quickly, otherwise back to off
// caps → off

export type ShiftState = "off" | "once" | "caps";

export const CAPS_DOUBLE_MS = 350;

/** Next shift state when the Shift control is pressed. */
export function shiftPressed(state: ShiftState, sinceLastPressMs: number): ShiftState {
  switch (state) {
    case "off":
      return "once";
    case "once":
      return sinceLastPressMs < CAPS_DOUBLE_MS ? "caps" : "off";
    case "caps":
      return "off";
  }
}

/** Next shift state after a character is inserted (one-shot reverts). */
export function shiftAfterInsert(state: ShiftState): ShiftState {
  return state === "once" ? "off" : state;
}

export function activeLayer(shift: ShiftState, symbols: boolean): WheelLayerName {
  if (symbols) return "symbols";
  return shift === "off" ? "lower" : "upper";
}
