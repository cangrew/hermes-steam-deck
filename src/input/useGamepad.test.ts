import { describe, expect, it } from "vitest";
import { pickGamepad } from "./useGamepad";

function pad(overrides: Partial<Gamepad>): Gamepad {
  return {
    index: 0,
    id: "pad",
    mapping: "standard",
    connected: true,
    axes: [],
    buttons: [],
    timestamp: 0,
    vibrationActuator: null,
    ...overrides,
  } as unknown as Gamepad;
}

describe("pickGamepad", () => {
  it("returns null when there are no pads", () => {
    expect(pickGamepad([])).toBeNull();
    expect(pickGamepad([null, null])).toBeNull();
  });

  it("prefers a standard-mapping pad over an earlier non-standard one", () => {
    const phantom = pad({ index: 0, id: "phantom", mapping: "" });
    const x360 = pad({ index: 1, id: "Xbox 360 Controller", mapping: "standard" });
    expect(pickGamepad([phantom, x360])).toBe(x360);
  });

  it("skips null slots and disconnected pads", () => {
    const dead = pad({ index: 0, connected: false });
    const live = pad({ index: 2, id: "live", mapping: "standard" });
    expect(pickGamepad([dead, null, live])).toBe(live);
  });

  it("falls back to the first connected pad when none are standard", () => {
    const a = pad({ index: 0, id: "a", mapping: "" });
    const b = pad({ index: 1, id: "b", mapping: "" });
    expect(pickGamepad([null, a, b])).toBe(a);
  });
});
