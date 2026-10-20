import type { Vec2 } from "./motion";

export type ExposureBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};
export type FishBodyFootprint = Vec2 & {
  length: number;
  angle: number;
  scale: number;
};
export type FishOccluder = { bounds: ExposureBounds } & (
  { polygon: readonly Vec2[] } | { ellipse: Vec2 & { rx: number; ry: number } }
);

// Equal-area lattice cells inside the body ellipse, excluding the four corner
// cells. The 21 samples and reusable coordinates are allocated once, not per RAF.
const BODY_SAMPLES: readonly Vec2[] = Array.from({ length: 25 }, (_, i) => ({
  x: (i % 5) - 2,
  y: Math.floor(i / 5) - 2,
}))
  .filter((point) => point.x * point.x + point.y * point.y <= 5)
  .map((point) => ({ x: point.x * 0.4, y: point.y * 0.4 }));
const samplePositions = new Float64Array(BODY_SAMPLES.length * 2);
const ALL_SAMPLES = (1 << BODY_SAMPLES.length) - 1;

function contains(occluder: FishOccluder, x: number, y: number) {
  const bounds = occluder.bounds;
  if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY)
    return false;
  if ("ellipse" in occluder) {
    const ellipse = occluder.ellipse;
    return (
      ellipse.rx > 0 &&
      ellipse.ry > 0 &&
      ((x - ellipse.x) / ellipse.rx) ** 2 +
        ((y - ellipse.y) / ellipse.ry) ** 2 <=
        1
    );
  }
  let inside = false;
  const polygon = occluder.polygon;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

export function estimateFishBodyExposure(
  fish: FishBodyFootprint,
  occluders: readonly FishOccluder[],
  viewport: { width: number; height: number },
): number {
  if (
    !Number.isFinite(fish.x + fish.y + fish.length + fish.angle + fish.scale) ||
    fish.length <= 0 ||
    fish.scale <= 0 ||
    !(viewport.width > 0 && viewport.height > 0)
  )
    return 0;
  const along = fish.length * 0.5 * fish.scale,
    across = fish.length * 0.145 * Math.sin(0.91) * fish.scale,
    cos = Math.cos(fish.angle),
    sin = Math.sin(fish.angle),
    extentX = Math.hypot(along * cos, across * sin),
    extentY = Math.hypot(along * sin, across * cos);
  if (
    fish.x + extentX < 0 ||
    fish.x - extentX > viewport.width ||
    fish.y + extentY < 0 ||
    fish.y - extentY > viewport.height
  )
    return 0;

  let visible = ALL_SAMPLES;
  for (let i = 0; i < BODY_SAMPLES.length; i++) {
    const sample = BODY_SAMPLES[i],
      x = fish.x + sample.x * along * cos - sample.y * across * sin,
      y = fish.y + sample.x * along * sin + sample.y * across * cos;
    samplePositions[i * 2] = x;
    samplePositions[i * 2 + 1] = y;
    if (x < 0 || x > viewport.width || y < 0 || y > viewport.height)
      visible &= ~(1 << i);
  }
  for (const occluder of occluders) {
    const bounds = occluder.bounds;
    if (
      bounds.maxX < fish.x - extentX ||
      bounds.minX > fish.x + extentX ||
      bounds.maxY < fish.y - extentY ||
      bounds.minY > fish.y + extentY
    )
      continue;
    for (let i = 0; i < BODY_SAMPLES.length; i++)
      if (
        visible & (1 << i) &&
        contains(occluder, samplePositions[i * 2], samplePositions[i * 2 + 1])
      )
        visible &= ~(1 << i);
    if (!visible) return 0;
  }
  let exposed = 0;
  for (; visible; visible &= visible - 1) exposed++;
  return exposed / BODY_SAMPLES.length;
}

export function updateFishLabelVisibility(
  exposure: number,
  wasVisible: boolean,
): boolean {
  return Number.isFinite(exposure) && exposure >= (wasVisible ? 0.2 : 1 / 3);
}
