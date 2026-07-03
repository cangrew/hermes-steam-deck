import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  currentCapture,
  registerGamepadCapture,
  type GamepadFrame,
} from "./gamepadCapture";
import { BTN, useGamepad } from "./useGamepad";

describe("registerGamepadCapture", () => {
  it("last registered handler wins and unregister restores the previous one", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = registerGamepadCapture(a);
    expect(currentCapture()).toBe(a);
    const offB = registerGamepadCapture(b);
    expect(currentCapture()).toBe(b);
    offB();
    expect(currentCapture()).toBe(a);
    offA();
    expect(currentCapture()).toBeNull();
  });

  it("unregister is idempotent and order-independent", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = registerGamepadCapture(a);
    const offB = registerGamepadCapture(b);
    offA();
    offA();
    expect(currentCapture()).toBe(b);
    offB();
    expect(currentCapture()).toBeNull();
  });
});

// --- Loop-level behavior: capture suppresses default dispatch ---

type FakeButton = { pressed: boolean; value: number };

function makePad(buttonCount = 16): {
  pad: Gamepad;
  press: (i: number) => void;
  release: (i: number) => void;
} {
  const buttons: FakeButton[] = Array.from({ length: buttonCount }, () => ({
    pressed: false,
    value: 0,
  }));
  const pad = {
    index: 0,
    id: "test-pad",
    mapping: "standard",
    connected: true,
    axes: [0, 0, 0, 0],
    buttons,
    timestamp: 0,
    vibrationActuator: null,
  } as unknown as Gamepad;
  return {
    pad,
    press: (i) => {
      buttons[i].pressed = true;
      buttons[i].value = 1;
    },
    release: (i) => {
      buttons[i].pressed = false;
      buttons[i].value = 0;
    },
  };
}

describe("useGamepad capture branch", () => {
  let rafCb: FrameRequestCallback | null = null;
  let now = 0;

  const step = () => {
    now += 16;
    const cb = rafCb;
    rafCb = null;
    cb?.(now);
  };

  const setup = () => {
    const { pad, press, release } = makePad();
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((cb: FrameRequestCallback) => {
        rafCb = cb;
        return 1;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [pad],
    });
    return { press, release };
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes frames to the capture handler and suppresses default actions", () => {
    const { press, release } = setup();
    const onBack = vi.fn();
    renderHook(() => useGamepad({ onBack }));

    // Without capture, a B edge fires onBack.
    step();
    press(BTN.B);
    step();
    expect(onBack).toHaveBeenCalledTimes(1);
    release(BTN.B);
    step();

    // Under capture, the handler sees the edge and onBack stays quiet.
    const frames: (GamepadFrame | null)[] = [];
    const off = registerGamepadCapture((f) => frames.push(f));
    press(BTN.B);
    step();
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(frames[frames.length - 1]?.edge(BTN.B)).toBe(true);
    step();
    expect(frames[frames.length - 1]?.edge(BTN.B)).toBe(false); // held, not a new edge
    expect(frames[frames.length - 1]?.pressed(BTN.B)).toBe(true);
    off();
  });

  it("does not re-fire a press held across a capture release", () => {
    const { press } = setup();
    const onBack = vi.fn();
    renderHook(() => useGamepad({ onBack }));
    step();

    const off = registerGamepadCapture(() => {});
    press(BTN.B);
    step(); // edge consumed by the capture handler
    off();
    step(); // still held — default path must not treat it as a new edge
    expect(onBack).not.toHaveBeenCalled();
  });
});
