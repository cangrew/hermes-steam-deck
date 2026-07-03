import { describe, expect, it } from "vitest";
import { sectorFromStick, stickAngle } from "./wheelMath";

/** Stick vector at `deg` clockwise from up, with the given magnitude. */
function at(deg: number, mag = 1): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [Math.sin(rad) * mag, -Math.cos(rad) * mag];
}

describe("stickAngle", () => {
  it("maps cardinal directions clockwise from up", () => {
    expect(stickAngle(0, -1)).toBeCloseTo(0); // up
    expect(stickAngle(1, 0)).toBeCloseTo(90); // right
    expect(stickAngle(0, 1)).toBeCloseTo(180); // down
    expect(stickAngle(-1, 0)).toBeCloseTo(270); // left
  });
});

describe("sectorFromStick", () => {
  it("returns null near center", () => {
    expect(sectorFromStick(0, 0, null)).toBeNull();
    expect(sectorFromStick(0.2, 0.2, null)).toBeNull();
  });

  it("maps directions to sectors 0..7 clockwise from top", () => {
    expect(sectorFromStick(...at(0), null)).toBe(0);
    expect(sectorFromStick(...at(45), null)).toBe(1);
    expect(sectorFromStick(...at(90), null)).toBe(2);
    expect(sectorFromStick(...at(135), null)).toBe(3);
    expect(sectorFromStick(...at(180), null)).toBe(4);
    expect(sectorFromStick(...at(225), null)).toBe(5);
    expect(sectorFromStick(...at(270), null)).toBe(6);
    expect(sectorFromStick(...at(315), null)).toBe(7);
    // Sector 0 spans both sides of 0°.
    expect(sectorFromStick(...at(350), null)).toBe(0);
  });

  it("engages at ENTER_MAG but holds until below EXIT_MAG", () => {
    const [x, y] = at(0, 0.4);
    expect(sectorFromStick(x, y, null)).toBeNull(); // 0.4 < enter 0.5
    expect(sectorFromStick(x, y, 0)).toBe(0); // held: 0.4 > exit 0.35
    const [x2, y2] = at(0, 0.3);
    expect(sectorFromStick(x2, y2, 0)).toBeNull(); // dropped below exit
  });

  it("keeps the previous sector just past the boundary (angular hysteresis)", () => {
    // Boundary between sector 0 and 1 is 22.5°; hysteresis extends it by 10°.
    expect(sectorFromStick(...at(28), 0)).toBe(0); // within 32.5° → sticky
    expect(sectorFromStick(...at(36), 0)).toBe(1); // clearly past → hands over
    // Fresh engagement (no previous sector) uses the plain nominal mapping.
    expect(sectorFromStick(...at(28), null)).toBe(1);
  });

  it("jumps directly to a far sector without stickiness", () => {
    expect(sectorFromStick(...at(180), 0)).toBe(4);
  });
});
