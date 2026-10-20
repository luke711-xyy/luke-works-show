import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export async function prepareResponsiveMedia() {
  const manifest = JSON.parse(
    await fs.readFile(path.join(root, "public/media/manifest.json"), "utf8"),
  );
  const directory = path.join(root, "public/media-mobile");
  await fs.mkdir(directory, { recursive: true });
  const mobile = {};
  let desktopBytes = 0,
    mobileBytes = 0;
  for (const item of Object.values(manifest).flat()) {
    if (item.kind !== "image") continue;
    // Keep original colors and smooth gradients: detail screenshots are not
    // part of the pond's Bayer rendering pipeline.
    const buffer = await sharp(path.join(root, "public", item.clear))
      .rotate()
      .resize({ width: 720, withoutEnlargement: true })
      .webp({ quality: 92, effort: 5 })
      .toBuffer();
    const digest = createHash("sha256")
      .update(buffer)
      .digest("hex")
      .slice(0, 12);
    const name = `${item.id}-clear-720.${digest}.webp`;
    await fs.writeFile(path.join(directory, name), buffer);
    const { width, height } = await sharp(buffer).metadata();
    mobile[item.id] = { src: `/media-mobile/${name}`, width, height };
    desktopBytes += (await fs.stat(path.join(root, "public", item.clear))).size;
    mobileBytes += buffer.length;
  }
  await fs.writeFile(
    path.join(root, "src/data/media-responsive.generated.json"),
    JSON.stringify(mobile, null, 2) + "\n",
  );
  console.log(
    `Original-color mobile images: ${Object.keys(mobile).length}; ${Math.round(desktopBytes / 1024)} → ${Math.round(mobileBytes / 1024)} KiB (${Math.round((1 - mobileBytes / desktopBytes) * 100)}% smaller). Originals unchanged.`,
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await prepareResponsiveMedia();
