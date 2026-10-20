import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = "/Users/huazhi_luke/.codex/skills/impeccable/scripts/impeccable";
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "public/media/manifest.json"), "utf8"),
);
const entries = [];
for (const [project, media] of Object.entries(manifest))
  for (const item of media) {
    for (const field of ["dither", "clear", "poster"]) {
      const url = item[field];
      if (!url || !/\.(webp|png|jpe?g)$/.test(url)) continue;
      entries.push([
        path.join(root, "public", url),
        `Source: user-supplied project ${project}, original ${item.source}, SHA-256 ${item.sha256}. Derived locally by scripts/prepare-media.mjs, ${field === "clear" ? "clear visual copy" : "Bayer 8x8 ordered dithering"}. Original source is not modified.`,
      ]);
    }
  }
entries.push([
  path.join(root, "public/media/moce-film/poster-clear.png"),
  "Source: frame at 22 seconds of the user-supplied Moce Designer product video; extracted locally by ffmpeg for the derived poster.",
]);
entries.push([
  path.join(root, "public/art/paper.png"),
  "Source: procedural warm xuan-paper grain, seed 711, base RGB 234 211 160, generated locally by scripts/prepare-paper.mjs. No external image or AI generation.",
]);
entries.push([
  path.join(root, "public/art/text-grain.png"),
  "Source: procedural Bayer 8x8 ordered alpha threshold mask, generated locally by scripts/prepare-art.mjs for readable text dithering.",
]);
entries.push([
  path.join(root, "public/art/pond-fallback.webp"),
  await fs.readFile(path.join(root, "docs/concepts/pond.prompt.txt"), "utf8"),
]);
for (const [file, prompt] of entries) {
  const result = spawnSync(cli, ["embed-prompt", file, "--prompt", prompt], {
    encoding: "utf8",
  });
  if (result.status !== 0)
    throw new Error(
      `${path.basename(file)}: ${result.stderr || result.stdout}`,
    );
}
console.log(
  `Embedded source provenance into ${entries.length} shipping raster entries.`,
);
