import { describe, expect, it } from "vitest";
import {
  angleDelta,
  bezier,
  createPatrol,
  galleryCenter,
  galleryStride,
  homePoints,
  leafEdge,
  pointInPolygon,
  random,
  smooth,
  spring,
  stepPatrol,
} from "./motion";
import { navigationUrl, parseLocation } from "../navigation";
import { mediaFor, projects } from "../data/projects";

describe("navigation and project truth", () => {
  it("opens a chosen fish at its work without opening a detail", () => {
    const state = parseLocation("/works", "?focus=teleprompter");
    expect(state).toEqual({
      page: "works",
      selected: "teleprompter",
      detail: null,
    });
    expect(navigationUrl(state)).toBe("/works?focus=teleprompter");
  });
  it("supports direct detail links and malformed paths safely", () => {
    expect(parseLocation("/works/mosic", "").detail).toBe("mosic");
    expect(parseLocation("/works/%E0%A4%A", "").detail).toBeNull();
    expect(parseLocation("/", "?focus=unknown").selected).toBe("mosic");
  });
  it("has eight distinct work entries with supplied media", () => {
    expect(new Set(projects.map((p) => p.id)).size).toBe(8);
    for (const p of projects) {
      expect(mediaFor(p.id).length).toBeGreaterThan(0);
      expect(p.decisions).toHaveLength(3);
      expect(p.repo).toMatch(/^https:\/\/github.com\/luke711-xyy\//);
    }
    expect(mediaFor("moce-film")[0].kind).toBe("video");
  });
});
describe("bounded continuous koi motion", () => {
  it.each([
    [92, 66],
    [27.3, 63.3],
  ])("changes curvature continuously at patrol size %s × %s", (rx, ry) => {
    const dt = 1 / 60;
    let maxAngularAcceleration = 0;
    for (let seed = 711; seed < 723; seed++) {
      const fish = createPatrol({ x: 200, y: 200 }, rx, ry, seed);
      let previousRate: number | undefined;
      for (let n = 0; n < 5400; n++) {
        const before = fish.angle;
        stepPatrol(fish, dt);
        const rate = angleDelta(before, fish.angle) / dt;
        if (previousRate !== undefined)
          maxAngularAcceleration = Math.max(
            maxAngularAcceleration,
            Math.abs(rate - previousRate) / dt,
          );
        previousRate = rate;
      }
    }
    expect(maxAngularAcceleration).toBeLessThan(2);
  });

  it("keeps travelling along curved paths rather than alternating straight legs", () => {
    const fish = createPatrol({ x: 200, y: 200 }, 92, 66, 711);
    const dt = 1 / 60;
    let straightFrames = 0;
    let largestStep = 0;
    for (let n = 0; n < 5400; n++) {
      const before = { x: fish.x, y: fish.y, angle: fish.angle };
      stepPatrol(fish, dt);
      if (Math.abs(angleDelta(before.angle, fish.angle)) / dt < 0.02)
        straightFrames++;
      const travel = Math.hypot(fish.x - before.x, fish.y - before.y);
      expect(travel).toBeGreaterThan(0.05);
      largestStep = Math.max(largestStep, travel);
      // The body should point along its actual travel, including near boundaries.
      expect(
        Math.abs(
          angleDelta(
            fish.angle,
            Math.atan2(fish.y - before.y, fish.x - before.x),
          ),
        ),
      ).toBeLessThan(0.04);
    }
    expect(straightFrames / 5400).toBeLessThan(0.2);
    expect(largestStep).toBeLessThan(0.5);
  });

  it("has reproducible seeds but no fixed visible-fish choreography", () => {
    const a = random(711),
      b = random(711);
    expect(Array.from({ length: 30 }, a)).toEqual(
      Array.from({ length: 30 }, b),
    );
    const fish = homePoints(1440, 900).map((h, i) =>
      createPatrol(h, 92, 66, i * 73 + 711),
    );
    const starts = fish.map((f) => [f.x, f.y]);
    for (let n = 0; n < 7200; n++)
      for (const f of fish) {
        const angle = f.angle;
        stepPatrol(
          f,
          1 / 60,
          fish.filter((o) => o !== f),
          88,
        );
        expect(
          Math.hypot((f.x - f.home.x) / f.rx, (f.y - f.home.y) / f.ry),
        ).toBeLessThanOrEqual(1.000001);
        expect(Math.abs(angleDelta(angle, f.angle))).toBeLessThanOrEqual(
          1.25 / 60 + 1e-8,
        );
      }
    fish.forEach((f, i) =>
      expect(
        Math.hypot(f.x - starts[i][0], f.y - starts[i][1]),
      ).toBeGreaterThan(1),
    );
    for (let i = 0; i < fish.length; i++)
      for (let j = i + 1; j < fish.length; j++)
        expect(
          Math.hypot(fish[i].x - fish[j].x, fish[i].y - fish[j].y),
        ).toBeGreaterThan(90);
  });
  it("settles a disturbed leaf without sustained oscillation", () => {
    let value = 80,
      velocity = 0;
    for (let n = 0; n < 600; n++)
      ({ value, velocity } = spring(value, velocity, 0, 1 / 60));
    expect(Math.abs(value)).toBeLessThan(0.001);
    expect(Math.abs(velocity)).toBeLessThan(0.001);
  });
});
describe("composition and geometry", () => {
  it("puts every project at an exact, reachable horizontal stop", () => {
    for (const w of [390, 768, 1440, 1920])
      for (let i = 0; i < 8; i++)
        expect(galleryCenter(i, w, 900).x - i * galleryStride(w)).toBeCloseTo(
          w / 2,
        );
  });
  it("keeps the transition endpoints continuous", () => {
    expect(smooth(0)).toBe(0);
    expect(smooth(1)).toBe(1);
    const a = { x: 0, y: 10 },
      d = { x: 300, y: 90 };
    expect(bezier(a, { x: 100, y: 0 }, { x: 200, y: 20 }, d, 0)).toEqual(a);
    expect(bezier(a, a, d, d, 1)).toEqual(d);
  });
  it("has organic finite leaf contours and respects occlusion polygons", () => {
    for (let i = 0; i < 88; i++) {
      const r = leafEdge((i / 88) * Math.PI * 2, 12);
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThan(1.12);
    }
    const p = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(pointInPolygon({ x: 50, y: 50 }, p)).toBe(true);
    expect(pointInPolygon({ x: 110, y: 50 }, p)).toBe(false);
  });
});
