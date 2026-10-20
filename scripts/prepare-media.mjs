import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { preparePaper } from "./prepare-paper.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "screenshots for use");
const output = path.join(root, "public/media");
if (output.startsWith(source + path.sep) || output === source)
  throw new Error("Media output must be outside source material");
const groups = [
  ["mosic", "1 MOSIC 音乐星球"],
  ["meet-countdown", "2 Meet-Countdown 见面倒计时"],
  ["water-reminder", "3 water-reminder 喝水提醒设备+App"],
  ["worldmaker", "4 Moce-Worldmaker 莫测造境"],
  ["moce-film", "5 Moce Designer 宣传视频"],
  ["teleprompter", "6 语音识别提词器"],
  ["huazhi", "7 Huazhi-Displayboard 公司具身全景图"],
  ["lanbridge", "8 lanbridge 跨系统文件快传"],
];
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
const hash = async (file) =>
  createHash("sha256")
    .update(await fs.readFile(file))
    .digest("hex");
await fs.mkdir(output, { recursive: true });
let previous = {};
try {
  previous = JSON.parse(
    await fs.readFile(path.join(output, "manifest.json"), "utf8"),
  );
} catch {}
const manifest = {},
  sourceHashes = [];

async function dither(input, destination, maxWidth = 1600) {
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
  await sharp(result, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .webp({ quality: 92, effort: 5 })
    .toFile(destination);
}

for (const [id, directory] of groups) {
  const folder = path.join(source, directory);
  const files = (await fs.readdir(folder))
    .filter((name) => /\.(png|jpe?g|mp4)$/i.test(name))
    .sort();
  const target = path.join(output, id);
  await fs.mkdir(target, { recursive: true });
  manifest[id] = [];
  for (let index = 0; index < files.length; index++) {
    const name = files[index],
      input = path.join(folder, name),
      sourceHash = await hash(input);
    sourceHashes.push([input, sourceHash]);
    const key = `${id}-${index + 1}`;
    const old = previous[id]?.find(
      (item) => item.source === name && item.sha256 === sourceHash,
    );
    if (/\.mp4$/i.test(name)) {
      const videoOut = path.join(target, "film-dither.mp4"),
        poster = path.join(target, "poster.webp");
      let cached = false;
      try {
        await fs.access(videoOut);
        await fs.access(poster);
        cached = Boolean(old);
      } catch {}
      if (!cached) {
        const posterRaw = path.join(target, "poster-clear.png");
        const shot = spawnSync("ffmpeg", [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-ss",
          "22",
          "-i",
          input,
          "-frames:v",
          "1",
          "-vf",
          "scale=1280:-2",
          posterRaw,
        ]);
        if (shot.status !== 0)
          throw new Error(`Video poster failed: ${shot.stderr}`);
        await dither(posterRaw, poster, 1280);
        const encode = spawnSync(
          "ffmpeg",
          [
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            input,
            "-filter_complex",
            "[0:v]fps=24,scale=1280:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=48:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3[v]",
            "-map",
            "[v]",
            "-map",
            "0:a?",
            "-c:v",
            "libx264",
            "-crf",
            "22",
            "-preset",
            "fast",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            videoOut,
          ],
          { timeout: 240000 },
        );
        if (encode.status !== 0)
          throw new Error(`Dither video encode failed: ${encode.stderr}`);
      }
      manifest[id].push({
        id: key,
        kind: "video",
        source: name,
        sha256: sourceHash,
        dither: `/media/${id}/film-dither.mp4`,
        poster: `/media/${id}/poster.webp`,
        width: 1920,
        height: 1080,
      });
    } else {
      const extension = path.extname(name).toLowerCase();
      const clearName = `${key}-original${extension}`;
      const clear = path.join(target, clearName),
        processed = path.join(target, `${key}-dither.webp`);
      let cached = false;
      try {
        await fs.access(clear);
        await fs.access(processed);
        cached = Boolean(old);
      } catch {}
      const info = await sharp(input).metadata();
      if (!cached) {
        await fs.copyFile(input, clear);
        await dither(input, processed);
      }
      manifest[id].push({
        id: key,
        kind: "image",
        source: name,
        sha256: sourceHash,
        clear: `/media/${id}/${clearName}`,
        dither: `/media/${id}/${key}-dither.webp`,
        width: info.width,
        height: info.height,
      });
      const obsolete = path.join(target, `${key}-clear.webp`);
      try {
        await fs.unlink(obsolete);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
}

await preparePaper();
for (const [file, before] of sourceHashes)
  if ((await hash(file)) !== before)
    throw new Error(`Source changed during media preparation: ${file}`);
await fs.writeFile(
  path.join(output, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
await fs.writeFile(
  path.join(root, "src/data/media.generated.json"),
  JSON.stringify(manifest, null, 2),
);
console.log(
  `Prepared ${sourceHashes.length} media files; all source hashes unchanged.`,
);
