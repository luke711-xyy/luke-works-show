import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PondLoading } from "./App";

async function silhouette(scale = 4) {
  const markup = renderToStaticMarkup(createElement(PondLoading));
  const svg = markup.match(/<svg\b[\s\S]*?<\/svg>/)![0];
  const { data, info } = await sharp(Buffer.from(svg))
    .resize(Math.round(128 * scale), Math.round(92 * scale))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const visited = new Uint8Array(info.width * info.height);
  const ink = (index: number) => data[index * 4 + 3] > 127;
  const components: {
    pixels: Set<number>;
    left: number;
    right: number;
    top: number;
    bottom: number;
  }[] = [];
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || !ink(start)) continue;
    const queue = [start];
    visited[start] = 1;
    let left = info.width,
      right = 0,
      top = info.height,
      bottom = 0;
    for (let i = 0; i < queue.length; i++) {
      const index = queue[i],
        x = index % info.width,
        y = Math.floor(index / info.width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          next = ny * info.width + nx;
        if (
          nx >= 0 &&
          nx < info.width &&
          ny >= 0 &&
          ny < info.height &&
          !visited[next] &&
          ink(next)
        ) {
          visited[next] = 1;
          queue.push(next);
        }
      }
    }
    if (queue.length > 10 * scale * scale)
      components.push({ pixels: new Set(queue), left, right, top, bottom });
  }
  return {
    components: components.sort((a, b) => b.pixels.size - a.pixels.size),
    width: info.width,
    inkAt: (x: number, y: number) =>
      ink(Math.round(y * scale) * info.width + Math.round(x * scale)),
  };
}

describe("loading pond silhouette", () => {
  it.each([0.8125, 4])(
    "keeps three distinct subjects with transparent gaps at %sx",
    async (scale) => {
      const { components } = await silhouette(scale);
      expect(components).toHaveLength(3);
    },
  );
  it("places the larger leaf in front, the smaller behind, with opposite openings", async () => {
    const { components, inkAt } = await silhouette();
    expect(components).toHaveLength(3);
    const [front, back, flower] = components;
    expect(front.pixels.size).toBeGreaterThan(back.pixels.size * 1.15);
    expect(front.left).toBeGreaterThan(back.left);
    expect(front.bottom).toBeGreaterThan(back.bottom);
    expect(flower.top).toBeLessThan(front.top);
    expect(inkAt(30, 24)).toBe(false);
    expect(inkAt(95, 76)).toBe(false);
    expect(inkAt(28, 40)).toBe(true);
    expect(inkAt(83, 72)).toBe(true);
  });
  it("keeps the open lotus upright and bilaterally balanced", async () => {
    const { components, width } = await silhouette();
    expect(components).toHaveLength(3);
    const flower = components[2];
    let mismatch = 0;
    for (const index of flower.pixels) {
      const x = index % width,
        y = Math.floor(index / width),
        mirror = y * width + flower.left + flower.right - x;
      if (!flower.pixels.has(mirror)) mismatch++;
    }
    expect(mismatch / flower.pixels.size).toBeLessThan(0.04);
    expect(flower.right - flower.left).toBeGreaterThan(
      flower.bottom - flower.top,
    );
  });
});
