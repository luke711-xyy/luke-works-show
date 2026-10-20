import { describe, expect, it } from "vitest";
import { Journey } from "./journey";

describe("one continuous home-to-gallery camera", () => {
  it("finishes a distant level transition and its return within 1.7 seconds", () => {
    const view = new Journey(1440);
    view.go("works", 6000);
    view.step(1.7);
    expect(view.x).toBe(7440);

    view.go("pond", 6000);
    view.step(1.7);
    expect(view.x).toBe(0);
  });

  it("passes the gallery's start before reaching a distant project, without stopping at the seam", () => {
    const view = new Journey(1440);
    view.go("works", 6000);
    expect(view.x).toBe(0);
    let previous = 0;
    const seamSpeeds: number[] = [];
    let sawStart = false;
    for (let n = 0; n < 180; n++) {
      view.step(1 / 60);
      expect(view.x).toBeGreaterThanOrEqual(previous);
      expect(view.x - previous).toBeLessThan(150);
      if (view.x > 1100 && view.x < 1750)
        seamSpeeds.push((view.x - previous) * 60);
      if (view.x > 0 && view.x < 1440) {
        sawStart = true;
        expect(view.scroll).toBe(0);
      }
      // The two DOM panels and the canvas share the same unbroken coordinate.
      expect(1440 * view.progress - 1440 + view.scroll).toBeCloseTo(
        view.x - 1440,
      );
      previous = view.x;
    }
    expect(sawStart).toBe(true);
    expect(Math.min(...seamSpeeds)).toBeGreaterThan(1000);
    expect(view.x).toBe(7440);
    expect(view.scroll).toBe(6000);
    expect(view.moving).toBe(false);
  });

  it("returns through the first project before revealing home, with no scroll reset jump", () => {
    const view = new Journey(1440);
    view.go("works", 6000, true);
    view.go("pond", 6000);
    expect(view.x).toBe(7440);
    let previous = view.x;
    let sawGalleryStart = false;
    for (let n = 0; n < 180; n++) {
      view.step(1 / 60);
      expect(view.x).toBeLessThanOrEqual(previous);
      expect(previous - view.x).toBeLessThan(150);
      if (view.x < 1440 && view.x > 0) {
        sawGalleryStart = true;
        expect(view.scroll).toBe(0);
      }
      previous = view.x;
    }
    expect(sawGalleryStart).toBe(true);
    expect(view.x).toBe(0);
  });

  it("can reverse an unfinished journey without teleporting", () => {
    const view = new Journey(1440);
    view.go("works", 6000);
    view.step(0.45);
    const halfway = view.x;
    expect(halfway).toBeGreaterThan(0);
    view.go("pond", 0);
    expect(view.x).toBe(halfway);
    for (let n = 0; n < 180; n++) view.step(1 / 60);
    expect(view.x).toBe(0);
  });

  it("keeps normal gallery scroll immediate and restores direct links without an entrance flight", () => {
    const view = new Journey(1440);
    view.go("works", 2400, true);
    expect(view.x).toBe(3840);
    expect(view.scroll).toBe(2400);
    view.setScroll(2800);
    expect(view.x).toBe(4240);
    expect(view.moving).toBe(false);
  });

  it("resizes the continuous coordinate and destination without restarting at the seam", () => {
    const view = new Journey(1440);
    view.go("works", 6000);
    view.step(0.5);
    const before = view.x;
    view.resize(720, 3000);
    expect(view.x).toBeCloseTo(before / 2);
    for (let n = 0; n < 180; n++) view.step(1 / 60);
    expect(view.x).toBe(3720);
  });

  it("honors reduced motion in both directions without a long camera sweep", () => {
    const view = new Journey(390, true);
    view.go("works", 1800);
    expect(view.x).toBe(2190);
    expect(view.moving).toBe(false);
    view.go("pond", 1800);
    expect(view.x).toBe(0);
  });

  it("does not jump when a mid-flight resize changes the gallery's stride at the mobile breakpoint", () => {
    const view = new Journey(1440);
    view.go("works", 6652.8);
    view.step(0.6);
    view.resize(390, 2675.4);
    const resized = view.x;
    view.step(1 / 60);
    expect(Math.abs(view.x - resized)).toBeLessThan(50);
    for (let n = 0; n < 180; n++) view.step(1 / 60);
    expect(view.x).toBe(3065.4);
  });
});
