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
  const wrap = (value, size) => ((value % size) + size) % size;
  const cloud = (cells) => {
    const values = Float32Array.from(
      { length: cells * cells },
      () => random() - 0.5,
    );
    return (x, y) => {
      const gx = (x / width) * cells,
        gy = (y / width) * cells;
      const ix = Math.floor(gx),
        iy = Math.floor(gy);
      const smooth = (t) => t * t * (3 - 2 * t);
      const tx = smooth(gx - ix),
        ty = smooth(gy - iy);
      const at = (dx, dy) =>
        values[wrap(iy + dy, cells) * cells + wrap(ix + dx, cells)];
      return (
        (at(0, 0) * (1 - tx) + at(1, 0) * tx) * (1 - ty) +
        (at(0, 1) * (1 - tx) + at(1, 1) * tx) * ty
      );
    };
  };
  const broad = cloud(8),
    pulp = cloud(40),
    fine = cloud(128);
  const fibres = new Float32Array(width * width);
  const dab = (x, y, tone) => {
    const ix = Math.floor(x),
      iy = Math.floor(y),
      tx = x - ix,
      ty = y - iy;
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 2; dx++)
        fibres[wrap(iy + dy, width) * width + wrap(ix + dx, width)] +=
          tone * (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty);
  };
  // Irregular short strands, softly rasterized and wrapped across tile edges.
  // They describe paper fibres rather than a second dithering filter.
  for (let i = 0; i < 2800; i++) {
    const x = random() * width,
      y = random() * width;
    const angle = random() * Math.PI * 2,
      length = 3 + random() * 15;
    const bend = (random() - 0.5) * 2.4;
    const tone = (random() < 0.5 ? -1 : 1) * (5 + random() * 12);
    const steps = Math.ceil(length / 0.7);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps,
        curve = Math.sin(t * Math.PI) * bend;
      dab(
        x + Math.cos(angle) * length * t - Math.sin(angle) * curve,
        y + Math.sin(angle) * length * t + Math.cos(angle) * curve,
        tone * Math.sin(Math.PI * t) * 0.7,
      );
    }
  }
  for (let y = 0; y < width; y++)
    for (let x = 0; x < width; x++) {
      const grain = (random() - 0.5) * 18;
      const texture =
        broad(x, y) * 14 +
        pulp(x, y) * 9 +
        fine(x, y) * 4 +
        fibres[y * width + x];
      const i = (y * width + x) * 3;
      [234, 211, 160].forEach(
        (v, c) =>
          (pixels[i + c] = Math.max(0, Math.min(255, v + grain + texture))),
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
