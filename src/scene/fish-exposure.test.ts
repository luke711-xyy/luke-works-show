import { describe, expect, it } from "vitest";
import {
  estimateFishBodyExposure,
  updateFishLabelVisibility,
  type FishBodyFootprint,
  type FishOccluder,
} from "./fish-exposure";

const fish: FishBodyFootprint = {
  x: 100,
  y: 100,
  length: 100,
  angle: 0,
  scale: 1,
};
const viewport = { width: 300, height: 300 };
const rectangle = (
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): FishOccluder => ({
  bounds: { minX, minY, maxX, maxY },
  polygon: [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ],
});

describe("fish body area exposure", () => {
  it("reports an unobstructed body as fully exposed", () => {
    // A default-zero estimator would keep every mobile name permanently hidden.
    expect(estimateFishBodyExposure(fish, [], viewport)).toBe(1);
  });

  it("reports a body completely beneath a leaf as covered", () => {
    expect(
      estimateFishBodyExposure(fish, [rectangle(0, 0, 200, 200)], viewport),
    ).toBe(0);
  });

  it("measures partial body area instead of testing only the fish center", () => {
    // A left-half leaf covers the center plus 8 left-hand lattice points;
    // 8 of the 21 body-area samples remain exposed.
    expect(
      estimateFishBodyExposure(fish, [rectangle(0, 0, 100.1, 200)], viewport),
    ).toBeCloseTo(8 / 21);
  });

  it("rotates the sampled body with its displayed heading", () => {
    const horizontalLeaf = rectangle(0, 88, 200, 112);
    expect(estimateFishBodyExposure(fish, [horizontalLeaf], viewport)).toBe(0);
    expect(
      estimateFishBodyExposure(
        { ...fish, angle: Math.PI / 2 },
        [horizontalLeaf],
        viewport,
      ),
    ).toBeCloseTo(16 / 21);
  });

  it("scales the body footprint with the displayed fish", () => {
    const horizontalLeaf = rectangle(0, 88, 200, 112);
    expect(
      estimateFishBodyExposure(
        { ...fish, scale: 2 },
        [horizontalLeaf],
        viewport,
      ),
    ).toBeCloseTo(6 / 21);
  });

  it("counts overlapping leaf coverage once", () => {
    const leaf = rectangle(0, 0, 100.1, 200);
    expect(estimateFishBodyExposure(fish, [leaf, leaf], viewport)).toBeCloseTo(
      8 / 21,
    );
  });

  it("includes raised flower ellipses without covering their entire bounds", () => {
    const blossom: FishOccluder = {
      bounds: { minX: 48, minY: 48, maxX: 152, maxY: 152 },
      ellipse: { x: 100, y: 100, rx: 52, ry: 52 },
    };
    expect(estimateFishBodyExposure(fish, [blossom], viewport)).toBe(0);
    const corner: FishBodyFootprint = {
      ...fish,
      x: 145,
      y: 145,
      length: 5,
    };
    expect(estimateFishBodyExposure(corner, [blossom], viewport)).toBe(1);
  });

  it("never exposes an offscreen body or invalid pose", () => {
    for (const pose of [
      { ...fish, x: -200 },
      { ...fish, y: 500 },
      { ...fish, x: NaN },
      { ...fish, scale: 0 },
      { ...fish, angle: Infinity },
    ])
      expect(estimateFishBodyExposure(pose, [], viewport)).toBe(0);
    // Screen clipping is treated as covered area, not a full-body reveal.
    expect(
      estimateFishBodyExposure({ ...fish, x: 0 }, [], viewport),
    ).toBeCloseTo(13 / 21);
  });
});

describe("fish label exposure hysteresis", () => {
  it.each([
    { exposure: 0, wasVisible: false, want: false },
    { exposure: 0.32, wasVisible: false, want: false },
    { exposure: 1 / 3, wasVisible: false, want: true },
    { exposure: 1, wasVisible: false, want: true },
    { exposure: 0.32, wasVisible: true, want: true },
    { exposure: 0.2, wasVisible: true, want: true },
    { exposure: 0.19, wasVisible: true, want: false },
    { exposure: NaN, wasVisible: true, want: false },
    { exposure: Infinity, wasVisible: true, want: false },
  ])(
    "maps $exposure with prior visibility $wasVisible to $want",
    ({ exposure, wasVisible, want }) => {
      expect(updateFishLabelVisibility(exposure, wasVisible)).toBe(want);
    },
  );
});
