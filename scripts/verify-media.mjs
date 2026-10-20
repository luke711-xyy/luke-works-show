import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:5188";
const root = process.cwd(),
  manifest = JSON.parse(
    await fs.readFile("public/media/manifest.json", "utf8"),
  );
const folders = await fs.readdir("screenshots for use");
let originals = 0,
  urls = 0;
for (const items of Object.values(manifest))
  for (const item of items) {
    let source;
    for (const folder of folders) {
      const candidate = path.join(
        root,
        "screenshots for use",
        folder,
        item.source,
      );
      try {
        await fs.access(candidate);
        source = candidate;
        break;
      } catch {}
    }
    if (!source) throw new Error(`Missing source: ${item.source}`);
    const sha = createHash("sha256")
      .update(await fs.readFile(source))
      .digest("hex");
    if (sha !== item.sha256)
      throw new Error(`Original hash mismatch: ${item.source}`);
    if (item.clear) {
      const [a, b] = await Promise.all([
        sharp(source).raw().toBuffer(),
        sharp(path.join(root, "public", item.clear))
          .raw()
          .toBuffer(),
      ]);
      if (!a.equals(b))
        throw new Error(`Clear image pixels differ: ${item.source}`);
      originals++;
    }
    for (const field of ["dither", "clear", "poster"])
      if (item[field]) {
        const response = await fetch(new URL(item[field], baseUrl), {
          method: "HEAD",
        });
        if (
          !response.ok ||
          !/^(image|video)\//.test(response.headers.get("content-type") ?? "")
        )
          throw new Error(`Bad media URL: ${item[field]}`);
        urls++;
      }
  }
console.log(
  `Verified ${Object.values(manifest).flat().length} original hashes, ${originals} pixel-identical clear images, ${urls} production media URLs.`,
);
