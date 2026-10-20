import { describe, expect, it } from "vitest";
import { Journey } from "./journey";

// Hand-checked arrival times, based on the old curve and the approved
// 1.50 / 2.025 / 2.55 / 3.075 speed multipliers at 1 / 2 / 4 / 8 widths.
const flightTimings = [
  { widths: 0.5, oldSeconds: 0.9105865002596162, seconds: 0.6070576668397442 },
  { widths: 1, oldSeconds: 1.06, seconds: 0.7066666666666667 },
  { widths: 2, oldSeconds: 1.2705865002596162, seconds: 0.6274501235849955 },
  { widths: 4, oldSeconds: 1.5358941141594502, seconds: 0.6023114173174315 },
  { widths: 8, oldSeconds: 1.65, seconds: 0.5365853658536586 },
];

describe("one continuous home-to-gallery camera", () => {
  it.each(flightTimings)(
    "crosses $widths viewport widths at the approved speed in either direction",
    ({ widths, seconds }) => {
      for (const width of [390, 1440]) {
        const origin = Math.min(1, widths) * width;
        const scroll = Math.max(0, widths - 1) * width;
        const distance = widths * width;
        const forward = new Journey(width, false, origin);
        const backward = new Journey(width, false, origin);
        forward.go("works", scroll);
        backward.go("works", scroll, true);
        backward.go("pond", scroll);

        // Accelerating must still start from the current camera coordinate.
        expect(forward.x).toBe(0);
        expect(backward.x).toBe(distance);
        forward.step(seconds / 2);
        backward.step(seconds / 2);
        expect(forward.x).toBeCloseTo(distance / 2, 5);
        expect(backward.x).toBeCloseTo(distance / 2, 5);
        expect(forward.moving).toBe(true);
        expect(backward.moving).toBe(true);

        forward.step(seconds / 2 - 0.001);
        backward.step(seconds / 2 - 0.001);
        expect(forward.moving).toBe(true);
        expect(backward.moving).toBe(true);
        forward.step(0.002);
        backward.step(0.002);
        expect(forward.x).toBe(distance);
        expect(backward.x).toBe(0);
        expect(forward.moving).toBe(false);
        expect(backward.moving).toBe(false);
      }
    },
  );

  it("increases the measured speed multiplier with tapering gains per added viewport", () => {
    const speeds = flightTimings.slice(1).map(({ widths, oldSeconds }) => {
      const view = new Journey(1440);
      view.go("works", (widths - 1) * 1440);
      let steps = 0;
      while (view.moving && steps < 4000) {
        view.step(1 / 2000);
        steps++;
      }
      expect(view.moving).toBe(false);
      return oldSeconds / (steps / 2000);
    });
    expect(speeds[0]).toBeCloseTo(1.5, 2);
    expect(speeds[1]).toBeCloseTo(2.025, 2);
    expect(speeds[2]).toBeCloseTo(2.55, 2);
    expect(speeds[3]).toBeCloseTo(3.075, 2);
    const gains = speeds
      .slice(1)
      .map((speed, i) => (speed - speeds[i]) / [1, 2, 4][i]);
    expect(gains[0]).toBeGreaterThan(gains[1]);
    expect(gains[1]).toBeGreaterThan(gains[2]);
    expect(gains[2]).toBeGreaterThan(0);
  });

  it("eases into and out of the faster flight without a seam stop", () => {
    const forward = new Journey(1440);
    const backward = new Journey(1440);
    forward.go("works", 4320);
    backward.go("works", 4320, true);
    backward.go("pond", 4320);
    const duration = 0.6023114173174315;
    const positions = [0];
    for (let step = 1; step <= 20; step++) {
      forward.step(duration / 20);
      backward.step(duration / 20);
      positions.push(forward.x);
      expect(forward.x + backward.x).toBeCloseTo(5760, 5);
    }
    const displacements = positions.slice(1).map((x, i) => x - positions[i]);
    expect(displacements[0]).toBeGreaterThan(0);
    expect(displacements[0]).toBeLessThan(displacements[1]);
    expect(displacements[8]).toBeLessThan(displacements[9]);
    expect(displacements[10]).toBeGreaterThan(displacements[11]);
    expect(displacements[18]).toBeGreaterThan(displacements[19]);
    expect(positions[5]).toBeCloseTo(900, 5);
    expect(positions[10]).toBeCloseTo(2880, 5);
    expect(positions[15]).toBeCloseTo(4860, 5);
    expect(forward.x).toBe(5760);
    expect(backward.x).toBe(0);
  });

  it("crosses the complete offscreen foliage before entering the gallery", () => {
    const view = new Journey(1280, false, 1800);
    view.go("works", 0);
    view.step(1.7);
    expect(view.x).toBe(1800);
    expect(view.scroll).toBe(0);
    expect(view.progress).toBe(1);
    view.setScroll(200);
    expect(view.x).toBe(2000);
    view.go("pond", 0);
    view.step(1.7);
    expect(view.x).toBe(0);
  });
  it("finishes a distant level transition and its return within 0.61 seconds", () => {
    const view = new Journey(1440);
    view.go("works", 6000);
    view.step(0.61);
    expect(view.x).toBe(7440);

    view.go("pond", 6000);
    view.step(0.61);
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
      // Three samples per old frame keep the existing <150px continuity
      // budget meaningful with this route's approximately 2.74x speedup.
      view.step(1 / 180);
      expect(view.x).toBeGreaterThanOrEqual(previous);
      expect(view.x - previous).toBeLessThan(150);
      if (view.x > 1100 && view.x < 1750)
        seamSpeeds.push((view.x - previous) * 180);
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
    expect(seamSpeeds.length).toBeGreaterThan(0);
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
      view.step(1 / 180);
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
    view.step(0.15);
    const halfway = view.x;
    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(7440);
    expect(view.moving).toBe(true);
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
    view.step(0.17);
    const before = view.x;
    expect(view.moving).toBe(true);
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
    view.step(0.2);
    expect(view.moving).toBe(true);
    view.resize(390, 2675.4);
    const resized = view.x;
    view.step(1 / 180);
    expect(Math.abs(view.x - resized)).toBeLessThan(50);
    for (let n = 0; n < 180; n++) view.step(1 / 60);
    expect(view.x).toBe(3065.4);
  });
});
