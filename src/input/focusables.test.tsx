import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FocusableButton, FocusableField } from "./focusables";
import { initSpatialNavigation } from "./spatial";
import { useOsk } from "../state/osk";

initSpatialNavigation();

describe("FocusableButton", () => {
  it("invokes onPress on click (gamepad A clicks the focused DOM node)", async () => {
    const onPress = vi.fn();
    render(<FocusableButton onPress={onPress}>Go</FocusableButton>);
    await userEvent.click(screen.getByText("Go"));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", async () => {
    const onPress = vi.fn();
    render(
      <FocusableButton onPress={onPress} disabled>
        Nope
      </FocusableButton>,
    );
    await userEvent.click(screen.getByText("Nope"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("FocusableField", () => {
  it("opens the on-screen keyboard when activated", async () => {
    useOsk.setState({ open: false });
    render(<FocusableField value="hello" onChange={() => {}} label="Name" />);
    await userEvent.click(screen.getByText("hello"));
    expect(useOsk.getState().open).toBe(true);
    expect(useOsk.getState().value).toBe("hello");
  });
});
