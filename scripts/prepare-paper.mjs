import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export async function preparePaper() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const output = path.join(root, "public/art/paper.png");
  const width = 512,
    pixels = Buffer.alloc(width * width * 3);
  let seed = 711;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < width; y++)
    for (let x = 0; x < width; x++) {
      const grain =
        (random() - 0.5) * 12 + Math.sin(y * 0.075 + Math.sin(x * 0.018)) * 0.8;
      const fiber = random() > 0.998 ? -12 : 0,
        i = (y * width + x) * 3;
      [234, 211, 160].forEach(
        (v, c) =>
          (pixels[i + c] = Math.max(0, Math.min(255, v + grain + fiber))),
      );
    }
  await fs.mkdir(path.dirname(output), { recursive: true });
  await sharp(pixels, { raw: { width, height: width, channels: 3 } })
    .png()
    .toFile(output);
  return output;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(await preparePaper());
