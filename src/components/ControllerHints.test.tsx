import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ControllerHints } from "./ControllerHints";
import { COMMON_HINTS } from "./hints";

describe("ControllerHints", () => {
  it("renders a button glyph and label for each hint", () => {
    render(<ControllerHints hints={COMMON_HINTS} />);
    expect(screen.getByText("Select")).toBeInTheDocument();
    expect(screen.getByText("Keyboard")).toBeInTheDocument();
    expect(screen.getByText("Switch tab")).toBeInTheDocument();
  });
});
