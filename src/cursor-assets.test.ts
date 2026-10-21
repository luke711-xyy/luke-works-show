import sharp from "sharp";
import { describe, expect, it } from "vitest";

const raster = (name: string) =>
  sharp(new URL(`../public/art/${name}.svg`, import.meta.url).pathname)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

describe("native koi cursor assets", () => {
  it.each(["koi-cursor", "koi-cursor-active"])(
    "%s fits the native cursor canvas without clipping its silhouette",
    async (name) => {
      const { data, info } = await raster(name);
      expect(info.width).toBeLessThanOrEqual(32);
      expect(info.height).toBeLessThanOrEqual(32);
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++) {
          if (
            x === 0 ||
            y === 0 ||
            x === info.width - 1 ||
            y === info.height - 1
          )
            expect(data[(y * info.width + x) * 4 + 3]).toBeLessThan(30);
        }
      // Both native cursors must keep actual ink at their shared nose hotspot.
      expect(data[(2 * info.width + 2) * 4 + 3]).toBeGreaterThan(100);
    },
  );
  it("enlarges the clickable silhouette rather than only adding empty canvas", async () => {
    const count = (data: Buffer) => {
      let area = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 100) area++;
      return area;
    };
    const normal = await raster("koi-cursor");
    const active = await raster("koi-cursor-active");
    expect(count(active.data)).toBeGreaterThan(count(normal.data) * 1.7);
    const inkWidth = ({ data, info }: Awaited<ReturnType<typeof raster>>) => {
      const xs: number[] = [];
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++)
          if (data[(y * info.width + x) * 4 + 3] > 100) xs.push(x);
      return Math.max(...xs) - Math.min(...xs) + 1;
    };
    expect(inkWidth(normal)).toBeGreaterThanOrEqual(18);
    expect(inkWidth(normal)).toBeLessThanOrEqual(21);
    expect(inkWidth(active)).toBeGreaterThanOrEqual(27);
    expect(inkWidth(active)).toBeLessThanOrEqual(29);
  });
});
