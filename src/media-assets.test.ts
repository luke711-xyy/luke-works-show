import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { mediaFor, projects } from "./data/projects";

describe("responsive media integrity", () => {
  it("maps every screenshot to a real, versioned mobile image without losing its aspect ratio", async () => {
    for (const project of projects) {
      for (const item of mediaFor(project.id)) {
        if (item.kind !== "image") continue;
        const original = await sharp(`public${item.clear}`).metadata();
        expect(Boolean(item.mobile), item.id).toBe(true);
        const mobile = await fs.readFile(`public${item.mobile!.src}`);
        const metadata = await sharp(mobile).metadata();
        expect(metadata.width, item.id).toBeLessThanOrEqual(720);
        expect(metadata.width).toBe(item.mobile!.width);
        expect(metadata.height).toBe(item.mobile!.height);
        expect(
          Math.abs(
            metadata.width! / metadata.height! -
              original.width! / original.height!,
          ),
          item.id,
        ).toBeLessThan(0.005);
        const digest = createHash("sha256")
          .update(mobile)
          .digest("hex")
          .slice(0, 12);
        expect(item.mobile!.src.endsWith(`.${digest}.webp`), item.id).toBe(
          true,
        );
        const expected = await sharp(`public${item.clear}`)
          .rotate()
          .resize({ width: 720, withoutEnlargement: true })
          .removeAlpha()
          .raw()
          .toBuffer();
        const actual = await sharp(mobile).removeAlpha().raw().toBuffer();
        expect(actual.length).toBe(expected.length);
        let colorError = 0;
        for (let i = 0; i < actual.length; i++)
          colorError += Math.abs(actual[i] - expected[i]);
        expect(
          colorError / actual.length,
          `${item.id}: original-color fidelity`,
        ).toBeLessThan(3);
      }
    }
  });
});
