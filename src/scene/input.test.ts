import { describe, expect, it } from "vitest";
import {
  activeTapDisturbance,
  createTapDisturbance,
  isVisiblePondLeafHit,
  isTapGesture,
  pondLeafRadius,
  shouldTrackPondPointer,
} from "./input";

describe("pond touch input", () => {
  it("holds a tapped leaf open briefly, then releases the disturbance", () => {
    const hold = createTapDisturbance({ x: 120, y: 240 }, 3);

    expect(activeTapDisturbance(hold, 4.39)).toEqual({
      x: 120,
      y: 240,
      active: true,
    });
    expect(activeTapDisturbance(hold, 4.4)).toBeNull();
  });

  it("treats a short touch as a tap but a finger drag as movement", () => {
    expect(isTapGesture({ x: 20, y: 30 }, { x: 29, y: 35 })).toBe(true);
    expect(isTapGesture({ x: 20, y: 30 }, { x: 32, y: 30 })).toBe(false);
  });

  it("keeps mouse hover live and tracks touch only while the finger is down", () => {
    expect(shouldTrackPondPointer("mouse", false)).toBe(true);
    expect(shouldTrackPondPointer("touch", true)).toBe(true);
    expect(shouldTrackPondPointer("touch", false)).toBe(false);
  });

  it("disturbs only a visible first-level leaf, not empty water or decorations", () => {
    const leaf = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const point = { x: 50, y: 50 };

    expect(
      isVisiblePondLeafHit(point, [{ polygon: leaf, visible: true }]),
    ).toBe(true);
    expect(
      isVisiblePondLeafHit(point, [{ polygon: leaf, visible: false }]),
    ).toBe(false);
    expect(
      isVisiblePondLeafHit(point, [
        { polygon: leaf, visible: true, decoration: true },
      ]),
    ).toBe(false);
    expect(isVisiblePondLeafHit(point, [])).toBe(false);
  });

  it("shrinks only first-level phone leaves", () => {
    expect(pondLeafRadius(390, 844, 0.28)).toBeCloseTo(97.1, 0);
    expect(pondLeafRadius(1440, 900, 0.28)).toBeCloseTo(238.5, 1);
  });
});
