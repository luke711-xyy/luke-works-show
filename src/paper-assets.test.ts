import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("xuan-paper surface", () => {
  it("retains warm paper color with visible grain and larger fibre clusters", async () => {
    const { data, info } = await sharp("public/art/paper.png")
      .raw()
      .toBuffer({ resolveWithObject: true });
    const red = (x: number, y: number) =>
      data[(y * info.width + x) * info.channels];
    const means: number[] = [];
    let total = 0;
    let squares = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const value = red(x, y);
        total += value;
        squares += value * value;
      }
    }
    const count = info.width * info.height;
    const mean = total / count;
    expect(mean).toBeGreaterThan(231);
    expect(mean).toBeLessThan(237);
    expect(Math.sqrt(squares / count - mean * mean)).toBeGreaterThan(5.5);
    for (let y = 0; y < info.height; y += 16) {
      for (let x = 0; x < info.width; x += 16) {
        let sum = 0;
        for (let dy = 0; dy < 16; dy++)
          for (let dx = 0; dx < 16; dx++) sum += red(x + dx, y + dy);
        means.push(sum / 256);
      }
    }
    // A fine white-noise overlay alone disappears at viewport scale. Paper
    // needs visible larger-scale variation as well as individual grain.
    const meanSquare = means.reduce(
      (sum, value) => sum + (value - mean) ** 2,
      0,
    );
    expect(Math.sqrt(meanSquare / means.length)).toBeGreaterThan(1.5);
  });
});
