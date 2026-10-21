import { describe, expect, it } from "vitest";
import { SurfaceWake } from "./surface-wake";
import type * as THREE from "three";

const create = (capacity = 20) => new SurfaceWake(capacity, Math.sin(0.91));
const vertices = (water: SurfaceWake) => {
  const position = water.mesh.geometry.getAttribute("position");
  return Array.from(position.array).slice(
    0,
    water.mesh.geometry.drawRange.count * 3,
  );
};

describe("continuous contact water waves", () => {
  it("keeps the first touch immediate but emits only four more packets per second of dragging", () => {
    const water = create();
    water.input(100, 220, true, 0);
    expect(water.activeCount).toBe(1);
    for (let i = 1; i <= 100; i++) {
      water.input(100 + i * 4, 220, true, i / 100);
      water.step(0.01);
    }
    // All packets are still alive: one initial contact plus four spaced
    // emissions, instead of the previous dense emission stream.
    expect(water.activeCount).toBe(5);
  });

  it("keeps a quick down/up contact alive as an expanding elliptical wave", () => {
    const water = create();
    water.input(180, 220, true, 0);
    water.input(180, 220, false, 0.01);
    water.step(0.1);
    const first = vertices(water);
    expect(first.length).toBeGreaterThan(0);
    water.step(0.3);
    const second = vertices(water);
    const span = (data: number[], axis: number) => {
      const values = data.filter((_, index) => index % 3 === axis);
      return Math.max(...values) - Math.min(...values);
    };
    expect(span(second, 0)).toBeGreaterThan(span(first, 0));
    // A world-space circle projects to an ellipse on the oblique pond.
    expect(span(second, 2) * Math.sin(0.91)).toBeLessThan(span(second, 0));
    water.step(2);
    expect(water.activeCount).toBe(0);
    expect(water.mesh.geometry.drawRange.count).toBe(0);
  });

  it("deforms the original touch wave continuously when dragging starts", () => {
    const water = create();
    water.input(180, 220, true, 0);
    water.step(0.05);
    const before = vertices(water);
    // Under the emission-distance threshold: this must change the existing
    // wave, not replace it with a second effect or erase the tap wave.
    water.input(190, 220, true, 0.04);
    water.step(0.05);
    expect(water.activeCount).toBe(1);
    const after = vertices(water);
    expect(after.length).toBe(before.length);
    expect(after).not.toEqual(before);
    // The forward crest is narrower than its rear half after accelerating.
    const position = water.mesh.geometry.getAttribute("position");
    const centerY = 220 / Math.sin(0.91);
    let front = 0,
      rear = 0;
    for (let i = 0; i < 40 * 6; i++) {
      const extent = Math.abs(position.getZ(i) - centerY);
      if (position.getX(i) > 182) front = Math.max(front, extent);
      if (position.getX(i) < 178) rear = Math.max(rear, extent);
    }
    expect(front).toBeLessThan(rear);
  });

  it("keeps finite, pooled geometry through curves, pauses and reversed motion", () => {
    const water = create(6);
    const geometry = water.mesh.geometry;
    const buffer = geometry.getAttribute("position").array;
    for (let i = 0; i < 500; i++) {
      water.input(
        200 + Math.sin(i * 0.06) * 150,
        220 + Math.cos(i * 0.06) * 80,
        true,
        i / 120,
      );
      water.step(1 / 120);
      expect(water.activeCount).toBeLessThanOrEqual(6);
    }
    expect(water.activeCount).toBeGreaterThan(0);
    expect(water.mesh.geometry).toBe(geometry);
    expect(geometry.getAttribute("position").array).toBe(buffer);
    expect(vertices(water).every(Number.isFinite)).toBe(true);
  });

  it("does not fill the pool for a stationary pointer or update geometry every render", () => {
    const water = create();
    water.input(180, 220, true, 0);
    water.step(0);
    const position = water.mesh.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    let previous = position.version,
      updates = 0;
    for (let i = 1; i <= 120; i++) {
      water.input(180, 220, true, i / 120);
      water.step(1 / 120);
      if (position.version !== previous) updates++;
      previous = position.version;
      expect(water.activeCount).toBeLessThanOrEqual(1);
    }
    expect(updates).toBeLessThanOrEqual(21);
    expect(updates).toBeGreaterThan(10);
  });

  it("lets released crests propagate without drawing a line to the next contact", () => {
    const water = create();
    water.input(20, 50, true, 0);
    water.step(0.05);
    water.input(-1000, -1000, false, 0.06);
    water.input(800, 50, true, 0.1);
    water.step(0.05);
    expect(water.activeCount).toBe(2);
    const positions = water.mesh.geometry.getAttribute("position");
    for (let i = 0; i < water.mesh.geometry.drawRange.count; i++) {
      const x = positions.getX(i);
      expect(x < 100 || x > 700).toBe(true);
    }
  });

  it("clears disabled waves and makes reduced-motion feedback small and short", () => {
    const water = create();
    water.step(0, true, true);
    water.input(20, 50, true, 0);
    water.step(0.1, true, true);
    const first = vertices(water);
    water.step(0.15, true, true);
    expect(vertices(water)).toEqual(first);
    water.step(0.3, true, true);
    expect(water.activeCount).toBe(0);
    water.input(20, 50, false, 1);
    water.input(20, 50, true, 1.1);
    water.step(0.05);
    water.step(0.05, false);
    expect(water.activeCount).toBe(0);
    expect(water.mesh.geometry.drawRange.count).toBe(0);
  });
});
