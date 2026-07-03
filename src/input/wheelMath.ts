/**
 * Sector math for the daisywheel: maps a raw left-stick vector to one of 8
 * petals (0 = top, clockwise), or null when the stick is near center.
 *
 * Two kinds of hysteresis keep the highlight stable:
 * - Magnitude: a petal engages at ENTER_MAG but stays engaged until the stick
 *   drops below EXIT_MAG, so a wobbling hold doesn't flicker in and out.
 * - Angle: once a petal is active, the stick must leave it by HYST_DEG past
 *   the shared boundary before the neighbor takes over.
 */

export const ENTER_MAG = 0.5;
export const EXIT_MAG = 0.35;
export const HYST_DEG = 10;

export const SECTOR_COUNT = 8;
const SECTOR_DEG = 360 / SECTOR_COUNT;

/** Stick vector → degrees clockwise from straight up, in [0, 360). */
export function stickAngle(x: number, y: number): number {
  // Gamepad axes: +x right, +y down. atan2(x, -y) puts 0° at up, clockwise.
  return (Math.atan2(x, -y) * (180 / Math.PI) + 360) % 360;
}

/** Shortest angular distance between two angles, in [0, 180]. */
function angularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function sectorFromStick(
  x: number,
  y: number,
  prev: number | null,
): number | null {
  const mag = Math.hypot(x, y);
  if (mag < (prev === null ? ENTER_MAG : EXIT_MAG)) return null;

  const deg = stickAngle(x, y);
  const nominal = Math.round(deg / SECTOR_DEG) % SECTOR_COUNT;
  if (prev === null || nominal === prev) return nominal;

  // Stick has crossed into another sector's nominal range: only hand over
  // once it is clearly past the boundary.
  const escaped = angularDistance(deg, prev * SECTOR_DEG) > SECTOR_DEG / 2 + HYST_DEG;
  return escaped ? nominal : prev;
}
