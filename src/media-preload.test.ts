import { afterEach, describe, expect, it, vi } from "vitest";
import { preloadImage } from "./media-preload";

class FakeImage {
  static created: FakeImage[] = [];
  decoding: "sync" | "async" | "auto" = "auto";
  fetchPriority: "high" | "low" | "auto" = "auto";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";

  constructor() {
    FakeImage.created.push(this);
  }

  load() {
    this.onload?.();
  }

  fail() {
    this.onerror?.();
  }
}

describe("image preloading", () => {
  afterEach(() => {
    FakeImage.created = [];
    vi.unstubAllGlobals();
  });

  it("shares one in-flight request for the same image URL", async () => {
    vi.stubGlobal("Image", FakeImage);

    const first = preloadImage("/media/project/cover.webp", "high");
    const duplicate = preloadImage("/media/project/cover.webp", "low");

    expect(FakeImage.created).toHaveLength(1);
    expect(FakeImage.created[0].src).toBe("/media/project/cover.webp");
    expect(FakeImage.created[0].fetchPriority).toBe("high");

    FakeImage.created[0].load();
    await Promise.all([first, duplicate]);
  });

  it("allows a failed image request to be retried", async () => {
    vi.stubGlobal("Image", FakeImage);

    const first = preloadImage("/media/project/retry.webp");
    FakeImage.created[0].fail();
    await first;

    const retry = preloadImage("/media/project/retry.webp");
    expect(FakeImage.created).toHaveLength(2);

    FakeImage.created[1].load();
    await retry;
  });
});
