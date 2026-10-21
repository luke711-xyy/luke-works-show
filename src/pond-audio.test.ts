import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PondAudio } from "./pond-audio";
import manifest from "../public/audio/manifest.json";

afterEach(() => vi.unstubAllGlobals());
describe("default-on pond audio", () => {
  it("is enabled by default, while construction does not touch Web Audio", () => {
    vi.stubGlobal("window", {
      get AudioContext() {
        throw Error("audio must stay lazy");
      },
    });
    const audio = new PondAudio();
    audio.stir();
    audio.select();
    audio.setVisible(true);
    expect(audio.getSnapshot()).toEqual({ enabled: true, phase: "armed" });
    audio.dispose();
  });
  it("ignores previous mute preferences and never depends on storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw Error("old mute preferences must not be read");
      },
    });
    vi.stubGlobal("window", {
      get AudioContext() {
        throw Error("no gesture yet");
      },
    });
    const audio = new PondAudio();
    audio.setVisible(true);
    audio.select();
    expect(audio.getSnapshot()).toEqual({ enabled: true, phase: "armed" });
    audio.dispose();
  });
  it("keeps unsupported audio nonfatal and eligible for a later retry", () => {
    vi.stubGlobal("window", {});
    const audio = new PondAudio();
    audio.activate();
    expect(audio.getSnapshot()).toEqual({ enabled: true, phase: "error" });
    let attempts = 0;
    vi.stubGlobal("window", {
      get AudioContext() {
        attempts++;
        return undefined;
      },
    });
    audio.activate();
    expect(attempts).toBe(1);
    expect(() => {
      audio.stir();
      audio.select();
      audio.dispose();
    }).not.toThrow();
  });
  it("ships hash-addressed lightweight clips, not the complete long click recording", async () => {
    let bytes = 0;
    for (const clip of Object.values(manifest)) {
      const data = await readFile(
        new URL(`../public${clip.src}`, import.meta.url),
      );
      expect(createHash("sha256").update(data).digest("hex")).toBe(clip.sha256);
      expect(clip.src).toContain(clip.sha256.slice(0, 10));
      bytes += data.length;
    }
    expect(bytes).toBeLessThan(850_000);
    expect(manifest.drop.duration).toBeLessThan(2);
    expect(manifest.drop.sourceRange[0]).toBeGreaterThan(1.9);
  });
});
