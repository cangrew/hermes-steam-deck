import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { DaisyWheel } from "./DaisyWheel";
import { currentCapture } from "./gamepadCapture";
import { BTN } from "./useGamepad";
import { useOsk } from "../state/osk";

/** A synthetic capture frame: stick vector + a set of freshly-pressed buttons. */
function frame(
  lx: number,
  ly: number,
  edges: number[] = [],
  held: number[] = edges,
  now = 0,
) {
  return {
    now,
    lx,
    ly,
    pressed: (b: number) => held.includes(b),
    edge: (b: number) => edges.includes(b),
  };
}

const UP: [number, number] = [0, -1]; // petal 0 = [a, b, c, d]

describe("DaisyWheel", () => {
  beforeEach(() => {
    useOsk.setState({
      open: true,
      value: "",
      label: undefined,
      multiline: false,
      password: false,
      onChange: undefined,
      onSubmit: undefined,
      returnFocusKey: undefined,
    });
  });

  const feed = (...frames: ReturnType<typeof frame>[]) => {
    const cap = currentCapture();
    expect(cap).toBeTruthy();
    act(() => {
      for (const f of frames) cap!(f);
    });
  };

  it("types characters from the pointed petal with face buttons", () => {
    render(<DaisyWheel />);
    feed(
      frame(...UP), // engage petal 0
      frame(...UP, [BTN.Y]),
      frame(...UP, [BTN.X]),
      frame(...UP, [BTN.B]),
      frame(...UP, [BTN.A]),
    );
    expect(useOsk.getState().value).toBe("abcd");
  });

  it("ignores face buttons when the stick is centered", () => {
    render(<DaisyWheel />);
    feed(frame(0, 0, [BTN.A]));
    expect(useOsk.getState().value).toBe("");
  });

  it("shift is one-shot; space and backspace work", () => {
    render(<DaisyWheel />);
    feed(
      frame(...UP, [BTN.LB]),
      frame(...UP, [BTN.Y]), // A (shifted)
      frame(...UP, [BTN.Y]), // a (shift reverted)
      frame(...UP, [BTN.RT]), // space
      frame(...UP, [BTN.LT]), // backspace
    );
    expect(useOsk.getState().value).toBe("Aa");
  });

  it("holding backspace repeats after the initial delay", () => {
    render(<DaisyWheel />);
    act(() => useOsk.setState({ value: "hello" }));
    feed(
      frame(0, 0, [BTN.LT], [BTN.LT], 0), // edge → 1 delete, next at 380
      frame(0, 0, [], [BTN.LT], 200), // held, before repeat window
      frame(0, 0, [], [BTN.LT], 400), // repeat → 2nd delete
      frame(0, 0, [], [BTN.LT], 520), // repeat → 3rd delete
    );
    expect(useOsk.getState().value).toBe("he");
  });

  it("symbols layer toggles with RB", () => {
    render(<DaisyWheel />);
    feed(frame(...UP, [BTN.RB]), frame(...UP, [BTN.Y]));
    expect(useOsk.getState().value).toBe("1");
  });

  it("SELECT cancels and START submits", () => {
    const onSubmit = vi.fn();
    useOsk.setState({ onSubmit });
    render(<DaisyWheel />);
    feed(frame(0, 0, [BTN.START]));
    expect(onSubmit).toHaveBeenCalled();
    expect(useOsk.getState().open).toBe(false);

    act(() => useOsk.setState({ open: true }));
    feed(frame(0, 0, [BTN.SELECT]));
    expect(useOsk.getState().open).toBe(false);
  });

  it("R3 inserts a newline only for multiline fields", () => {
    render(<DaisyWheel />);
    feed(frame(0, 0, [BTN.R3]));
    expect(useOsk.getState().value).toBe("");
    act(() => useOsk.setState({ multiline: true }));
    feed(frame(0, 0, [BTN.R3]));
    expect(useOsk.getState().value).toBe("\n");
  });

  it("hardware keyboard types, Enter submits, Escape cancels", () => {
    const onSubmit = vi.fn();
    useOsk.setState({ onSubmit });
    render(<DaisyWheel />);
    fireEvent.keyDown(window, { key: "h" });
    fireEvent.keyDown(window, { key: "i" });
    expect(useOsk.getState().value).toBe("hi");
    fireEvent.keyDown(window, { key: "Backspace" });
    expect(useOsk.getState().value).toBe("h");
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("h");
  });

  it("masks the preview for password fields", () => {
    useOsk.setState({ password: true, value: "secret" });
    render(<DaisyWheel />);
    expect(screen.getByText("••••••")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("unregisters capture on unmount", () => {
    const { unmount } = render(<DaisyWheel />);
    expect(currentCapture()).toBeTruthy();
    unmount();
    expect(currentCapture()).toBeNull();
  });
});
