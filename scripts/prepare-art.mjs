import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const art = path.join(root, "public/art"),
  fonts = path.join(root, "public/fonts");
await fs.mkdir(art, { recursive: true });
await fs.mkdir(fonts, { recursive: true });
const pixels = Buffer.alloc(96 * 96 * 4);
for (let y = 0; y < 96; y++)
  for (let x = 0; x < 96; x++) {
    const i = (y * 96 + x) * 4;
    let rank = 0;
    for (let bit = 0; bit < 3; bit++) {
      const a = (x >> bit) & 1,
        b = (y >> bit) & 1;
      rank = rank * 4 + (b === 0 ? (a === 0 ? 0 : 2) : a === 0 ? 3 : 1);
    }
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
    pixels[i + 3] = rank > 60 ? 205 : 255;
  }
await sharp(pixels, { raw: { width: 96, height: 96, channels: 4 } })
  .png()
  .toFile(path.join(art, "text-grain.png"));
await sharp(path.join(root, "docs/concepts/pond-concept.png"))
  .resize({ width: 1600 })
  .webp({ quality: 86 })
  .toFile(path.join(art, "pond-fallback.webp"));
const copy = (
  await Promise.all(
    ["src/App.tsx", "src/data/projects.ts"].map((f) =>
      fs.readFile(path.join(root, f), "utf8"),
    ),
  )
).join("");
const ascii = Array.from({ length: 95 }, (_, i) =>
  String.fromCharCode(i + 32),
).join("");
const text = [
  ...new Set(
    (
      ascii +
      "·→" +
      (copy.match(/[\u3000-\u303f\uff00-\uffef\u3400-\u9fff]/g) ?? []).join("")
    ).split(""),
  ),
].join("");
const url = new URL("https://fonts.googleapis.com/css2");
url.searchParams.set("family", "Noto Serif SC:wght@400..700");
url.searchParams.set("text", text);
url.searchParams.set("display", "swap");
const css = execFileSync(
  "curl",
  [
    "-fsSL",
    "--max-time",
    "35",
    "-A",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    url.href,
  ],
  { encoding: "utf8" },
);
const fontUrl = css.match(/url\((https:[^)]+)\)/)?.[1];
if (!fontUrl)
  throw new Error("Official font response did not contain a font URL");
execFileSync("curl", [
  "-fsSL",
  "--max-time",
  "45",
  fontUrl,
  "-o",
  path.join(fonts, "folio-serif.woff2"),
]);
execFileSync("curl", [
  "-fsSL",
  "--max-time",
  "30",
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/OFL.txt",
  "-o",
  path.join(fonts, "OFL.txt"),
]);
console.log(
  `Prepared text grain, fallback and self-hosted Noto Serif SC subset (${text.length} characters).`,
);
