import { describe, expect, it } from "vitest";
import {
  activeLayer,
  shiftAfterInsert,
  shiftPressed,
  WHEEL_LAYERS,
} from "./wheelLayout";
import { ROWS_LOWER, ROWS_SYMBOLS } from "./oskRows";

const layerChars = (layer: readonly (readonly string[])[]) => layer.flat();

describe("wheel layers", () => {
  it("every layer has 8 petals of 4 unique characters", () => {
    for (const layer of Object.values(WHEEL_LAYERS)) {
      expect(layer).toHaveLength(8);
      for (const petal of layer) expect(petal).toHaveLength(4);
      const chars = layerChars(layer);
      expect(new Set(chars).size).toBe(chars.length);
    }
  });

  it("lower layer covers the full alphabet", () => {
    const chars = new Set(layerChars(WHEEL_LAYERS.lower));
    for (const c of "abcdefghijklmnopqrstuvwxyz") expect(chars).toContain(c);
  });

  it("upper layer is the uppercased lower layer", () => {
    expect(layerChars(WHEEL_LAYERS.upper)).toEqual(
      layerChars(WHEEL_LAYERS.lower).map((c) => c.toUpperCase()),
    );
  });

  it("covers every character the grid keyboard offers", () => {
    const wheel = new Set(
      Object.values(WHEEL_LAYERS).flatMap((layer) => layerChars(layer)),
    );
    const grid = new Set([...ROWS_LOWER.flat(), ...ROWS_SYMBOLS.flat()]);
    for (const c of grid) expect(wheel).toContain(c);
  });
});

describe("shift state machine", () => {
  it("cycles off → once → off on slow presses", () => {
    expect(shiftPressed("off", Infinity)).toBe("once");
    expect(shiftPressed("once", 1000)).toBe("off");
  });

  it("double-press promotes to caps, third press releases", () => {
    expect(shiftPressed("once", 200)).toBe("caps");
    expect(shiftPressed("caps", 100)).toBe("off");
  });

  it("one-shot reverts after an insert; caps persists", () => {
    expect(shiftAfterInsert("once")).toBe("off");
    expect(shiftAfterInsert("caps")).toBe("caps");
    expect(shiftAfterInsert("off")).toBe("off");
  });

  it("selects the layer from shift + symbols state", () => {
    expect(activeLayer("off", false)).toBe("lower");
    expect(activeLayer("once", false)).toBe("upper");
    expect(activeLayer("caps", false)).toBe("upper");
    expect(activeLayer("once", true)).toBe("symbols");
  });
});
