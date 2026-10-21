import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

// Keep the complete opening poem in one tiny, critical face. Do not regenerate
// the main site's larger font or artwork when changing the loading screen.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await fs.readFile(path.join(root, "src/App.tsx"), "utf8");
const poem = source.match(
  /<div className="loading-poem">([\s\S]*?)<\/div>/,
)?.[1];
if (!poem) throw Error("Opening poem was not found");
const text = [...new Set(poem.replace(/<[^>]+>/g, "").replace(/\s/g, ""))].join(
  "",
);
const url = new URL("https://fonts.googleapis.com/css2");
url.searchParams.set("family", "Noto Serif SC:wght@400");
url.searchParams.set("text", text);
url.searchParams.set("display", "swap");
const response = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36" },
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw Error(`Font stylesheet: HTTP ${response.status}`);
const fontUrl = (await response.text()).match(/url\((https:[^)]+)\)/)?.[1];
if (!fontUrl) throw Error("Official font stylesheet has no font URL");
const font = await fetch(fontUrl, { signal: AbortSignal.timeout(30000) });
if (!font.ok) throw Error(`Font asset: HTTP ${font.status}`);
const bytes = Buffer.from(await font.arrayBuffer());
const sha = createHash("sha256").update(bytes).digest("hex");
const name = `pond-poem-${sha.slice(0, 10)}.woff2`;
await fs.writeFile(path.join(root, "public/fonts", name), bytes);
console.log(
  JSON.stringify(
    { file: name, characters: text, bytes: bytes.length, sha256: sha },
    null,
    2,
  ),
);
