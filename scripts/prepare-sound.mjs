import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const inputs = process.argv.slice(2);
if (inputs.length !== 3)
  throw Error("Pass background, touching-water and drop MP3 paths.");
const output = path.resolve("public/audio");
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "pond-audio-"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const clips = [
  {
    key: "background",
    start: 0,
    end: 27.168,
    crossfade: 0.35,
    loudness: -24,
    channels: 1,
  },
  {
    key: "stir",
    start: 0.6,
    end: 18.3,
    crossfade: 0.2,
    loudness: -23,
    channels: 2,
  },
  { key: "drop", start: 1.95, end: 3.35, crossfade: 0, channels: 2 },
];
try {
  await fs.mkdir(output, { recursive: true });
  const manifest = {};
  for (const [index, clip] of clips.entries()) {
    const file = path.join(temporary, `${clip.key}.mp3`);
    const length = clip.end - clip.start;
    const trim = `atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS`;
    const filter = clip.crossfade
      ? `[0:a]${trim},loudnorm=I=${clip.loudness}:TP=-4:LRA=11,aresample=48000,asplit=3[h][m][t];[h]atrim=end=${clip.crossfade},asetpts=PTS-STARTPTS[head];[m]atrim=start=${clip.crossfade}:end=${length - clip.crossfade},asetpts=PTS-STARTPTS[middle];[t]atrim=start=${length - clip.crossfade},asetpts=PTS-STARTPTS[tail];[tail][head]acrossfade=d=${clip.crossfade}:c1=tri:c2=tri[join];[middle][join]concat=n=2:v=0:a=1[out]`
      : `[0:a]${trim},volume=-3dB,afade=t=in:d=0.012,afade=t=out:st=1.12:d=0.28[out]`;
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-i",
      inputs[index],
      "-filter_complex",
      filter,
      "-map",
      "[out]",
      "-ar",
      "48000",
      "-ac",
      String(clip.channels),
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      "-map_metadata",
      "-1",
      file,
    ]);
    const bytes = await fs.readFile(file);
    const sha = hash(bytes),
      name = `${clip.key}-${sha.slice(0, 10)}.mp3`;
    await fs.writeFile(path.join(output, name), bytes);
    manifest[clip.key] = {
      src: `/audio/${name}`,
      source: path.basename(inputs[index]),
      sourceSha256: hash(await fs.readFile(inputs[index])),
      sha256: sha,
      sourceRange: [clip.start, clip.end],
      loopCrossfade: clip.crossfade,
      duration: Number((length - clip.crossfade).toFixed(3)),
      bytes: bytes.length,
    };
  }
  await fs.writeFile(
    path.join(output, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(JSON.stringify(manifest, null, 2));
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
