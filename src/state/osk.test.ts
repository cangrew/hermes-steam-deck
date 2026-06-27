import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOsk } from "./osk";

describe("on-screen keyboard store", () => {
  beforeEach(() => useOsk.setState({ open: false, value: "", onChange: undefined, onSubmit: undefined }));

  it("opens with an initial value and label", () => {
    useOsk.getState().openKeyboard({ value: "hi", label: "Name" });
    expect(useOsk.getState().open).toBe(true);
    expect(useOsk.getState().value).toBe("hi");
    expect(useOsk.getState().label).toBe("Name");
  });

  it("inserts and backspaces, notifying onChange", () => {
    const onChange = vi.fn();
    useOsk.getState().openKeyboard({ value: "", onChange });
    useOsk.getState().insert("a");
    useOsk.getState().insert("b");
    expect(useOsk.getState().value).toBe("ab");
    useOsk.getState().backspace();
    expect(useOsk.getState().value).toBe("a");
    expect(onChange).toHaveBeenLastCalledWith("a");
  });

  it("submits the value and closes", () => {
    const onSubmit = vi.fn();
    useOsk.getState().openKeyboard({ value: "done", onSubmit });
    useOsk.getState().submit();
    expect(onSubmit).toHaveBeenCalledWith("done");
    expect(useOsk.getState().open).toBe(false);
  });
});
