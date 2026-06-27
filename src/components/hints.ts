export interface Hint {
  button: string;
  label: string;
  tone?: "a" | "b" | "x" | "y" | "bumper";
}

/** Default control hints shown in the bottom bar across screens. */
export const COMMON_HINTS: Hint[] = [
  { button: "A", label: "Select", tone: "a" },
  { button: "B", label: "Back", tone: "b" },
  { button: "X", label: "Keyboard", tone: "x" },
  { button: "LB/RB", label: "Switch tab", tone: "bumper" },
  { button: "☰", label: "Settings" },
];
