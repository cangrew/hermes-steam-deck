import { init } from "@noriginmedia/norigin-spatial-navigation";

let started = false;

/**
 * Initializes spatial (D-pad / arrow-key) navigation once.
 *
 * `shouldFocusDOMNode: true` makes the library call .focus() on the focused
 * element. That gives us three things on the Steam Deck:
 *   1. gamepad "A" can simply click `document.activeElement`,
 *   2. the Steam on-screen keyboard can attach to focused <input>/<textarea>,
 *   3. keyboard-arrow navigation works identically when Steam Input emulates
 *      a keyboard instead of exposing a gamepad.
 */
export function initSpatialNavigation() {
  if (started) return;
  started = true;
  init({
    debug: false,
    visualDebug: false,
    shouldFocusDOMNode: true,
    // Keyboard parity: arrows move focus, Enter activates. The gamepad loop
    // (useGamepad) drives the same actions for controller input.
    throttle: 0,
  });
}
