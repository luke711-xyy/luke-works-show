import sharp from "sharp";

const bayer = Array.from({ length: 64 }, (_, i) => {
  let rank = 0;
  const x = i % 8,
    y = Math.floor(i / 8);
  for (let bit = 0; bit < 3; bit++) {
    const a = (x >> bit) & 1,
      b = (y >> bit) & 1;
    rank = rank * 4 + (b === 0 ? (a === 0 ? 0 : 2) : a === 0 ? 3 : 1);
  }
  return (rank + 0.5) / 64;
});

// Resize the original BEFORE quantization, never blur an existing Bayer grid.
export async function ditherBuffer(input, maxWidth = 1600) {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const result = Buffer.alloc(data.length);
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const threshold = bayer[(y % 8) * 8 + (x % 8)] - 0.5;
      const i = (y * info.width + x) * 3;
      for (let c = 0; c < 3; c++) {
        const value = Math.min(
          1,
          Math.max(0, (data[i + c] / 255 - 0.5) * 1.04 + 0.5),
        );
        result[i + c] = Math.min(
          255,
          Math.max(0, (Math.floor(value * 7 + threshold + 0.5) / 7) * 255),
        );
      }
    }
  return sharp(result, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .webp({ quality: 92, effort: 5 })
    .toBuffer();
}
