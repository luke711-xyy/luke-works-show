import { describe, expect, it } from "vitest";
import { KoiWake } from "./wake";

const fish = (x: number) => ({
  id: "mosic",
  x,
  y: 100,
  angle: 0,
  length: 100,
  visible: true,
});

describe("pooled koi water wake", () => {
  it("leaves expanding marks behind a moving fish", () => {
    const wake = new KoiWake(12, Math.sin(0.91));
    for (let i = 0; i < 12; i++) wake.step(0.1, [fish(i * 12)]);
    expect(wake.activeCount).toBeGreaterThan(0);
    const positions = wake.mesh.geometry.getAttribute("position");
    const before = Array.from(positions.array);
    wake.step(0.3, []);
    expect(Array.from(positions.array)).not.toEqual(before);
    for (let i = 0; i < 40; i++) wake.step(0.1, []);
    expect(wake.activeCount).toBe(0);
  });

  it("reuses one bounded geometry pool during extended movement", () => {
    const wake = new KoiWake(6, Math.sin(0.91));
    const geometry = wake.mesh.geometry;
    for (let i = 0; i < 500; i++) {
      wake.step(0.1, [fish(i * 20)]);
      expect(wake.activeCount).toBeLessThanOrEqual(6);
      expect(wake.mesh.geometry).toBe(geometry);
    }
  });

  it("does not emit for stationary, hidden or reduced-motion fish", () => {
    for (const mode of ["stationary", "hidden", "reduced"]) {
      const wake = new KoiWake(6, Math.sin(0.91));
      for (let i = 0; i < 30; i++)
        wake.step(
          0.1,
          [
            {
              ...fish(mode === "stationary" ? 10 : i * 20),
              visible: mode !== "hidden",
            },
          ],
          0,
          mode !== "reduced",
        );
      expect(wake.activeCount).toBe(0);
    }
  });

  it("does not mistake a scrolling water plane for fish movement", () => {
    const wake = new KoiWake(6, Math.sin(0.91));
    wake.step(0.1, [fish(100)]);
    for (let i = 1; i < 20; i++) wake.step(0.1, [fish(100 - i * 20)], -20);
    expect(wake.activeCount).toBe(0);
  });
});
