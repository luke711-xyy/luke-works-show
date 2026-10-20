import { describe, expect, it } from "vitest";
import { createGuide, stepGuide, type GuideLeaf } from "./guide";
import {
  angleDelta,
  galleryCenter,
  galleryRadius,
  galleryStride,
} from "./motion";

function layout(w: number, h: number): GuideLeaf[] {
  return Array.from({ length: 8 }, (_, i) => ({
    ...galleryCenter(i, w, h),
    rx: galleryRadius(w, h) * (i % 3 === 1 ? 0.92 : 1),
    ry: galleryRadius(w, h) * (i % 3 === 1 ? 0.92 : 1) * Math.sin(0.91),
  }));
}

describe("gallery waterway guide", () => {
  it("enters the waterway facing its initial travel direction", () => {
    const w = 1440,
      h = 900,
      leaves = layout(w, h);
    const g = createGuide(w, h, 0, leaves);
    for (let n = 0; n < 30; n++) {
      stepGuide(g, 1 / 60, w, h, 0, 0, leaves);
      expect(
        Math.abs(angleDelta(g.angle, Math.atan2(g.vy, g.vx))),
      ).toBeLessThan(0.15);
    }
  });

  it.each([
    [1440, 900],
    [854, 912],
    [390, 844],
  ])(
    "roams through the leaf gaps instead of staying at the bottom at %s × %s",
    (w, h) => {
      const leaves = layout(w, h);
      for (const index of [0, 1, 3, 7]) {
        const scroll = index * galleryStride(w);
        const g = createGuide(w, h, scroll, leaves);
        let minY = Infinity,
          maxY = -Infinity,
          exposed = 0;
        for (let n = 0; n < 7200; n++) {
          stepGuide(g, 1 / 60, w, h, scroll, 0, leaves);
          minY = Math.min(minY, g.y);
          maxY = Math.max(maxY, g.y);
          const underLeaf = leaves.some(
            (leaf) =>
              ((g.x - leaf.x) / leaf.rx) ** 2 +
                ((g.y - leaf.y) / leaf.ry) ** 2 <
              1,
          );
          if (!underLeaf) exposed++;
          expect(g.x - scroll).toBeGreaterThan(w * 0.15);
          expect(g.x - scroll).toBeLessThan(w * 0.98);
          expect(g.y).toBeGreaterThan(h * 0.06);
          expect(g.y).toBeLessThan(h * 0.94);
        }
        expect(maxY - minY).toBeGreaterThan(h * 0.22);
        expect(minY).toBeLessThan(h * 0.6);
        expect(exposed / 7200).toBeGreaterThan(0.45);
      }
    },
  );

  it("keeps turns gentle through fast scrolling and scroll reversals", () => {
    const w = 1440,
      h = 900,
      leaves = layout(w, h);
    const g = createGuide(w, h, 0, leaves);
    let scroll = 0,
      previousRate = 0;
    for (let n = 0; n < 4800; n++) {
      const velocity = n < 1200 ? 800 : n < 2400 ? -800 : 0;
      scroll = Math.max(0, scroll + velocity / 60);
      const angle = g.angle;
      stepGuide(g, 1 / 60, w, h, scroll, velocity, leaves);
      const rate = angleDelta(angle, g.angle) * 60;
      expect(Math.abs(rate)).toBeLessThanOrEqual(0.8);
      expect(Math.abs(rate - previousRate) * 60).toBeLessThan(3);
      expect(Math.hypot(g.vx, g.vy)).toBeLessThanOrEqual(65);
      expect(Number.isFinite(g.x + g.y + g.angle)).toBe(true);
      previousRate = rate;
    }
  });

  it("does not autoplay when reduced motion is enabled", () => {
    const w = 390,
      h = 844,
      leaves = layout(w, h);
    const g = createGuide(w, h, 0, leaves);
    const start = { x: g.x, y: g.y, phase: g.phase };
    for (let n = 0; n < 600; n++)
      stepGuide(g, 1 / 60, w, h, 0, 0, leaves, true);
    expect(g.x).toBe(start.x);
    expect(g.y).toBe(start.y);
    expect(g.phase).toBe(start.phase);
  });
});
