import { describe, expect, it } from "vitest";
import {
  cancelPointers,
  clampView,
  endPointer,
  fitImage,
  imageSequence,
  initialInteraction,
  movePointer,
  startPointer,
  stepImage,
  wheelScale,
  zoomAt,
} from "./image-viewer-gestures";

const bounds = {
  viewport: { width: 1000, height: 600 },
  image: { width: 2000, height: 1000 },
};

describe("image viewer fit-relative zoom", () => {
  it("fits landscape and portrait images without changing their aspect ratio", () => {
    expect(fitImage(bounds)).toEqual({ width: 1000, height: 500 });
    expect(
      fitImage({ ...bounds, image: { width: 400, height: 1200 } }),
    ).toEqual({ width: 200, height: 600 });
    expect(fitImage({ ...bounds, viewport: { width: 0, height: 0 } })).toEqual({
      width: 0,
      height: 0,
    });
  });

  it("centers and resets pan at the 100 percent minimum", () => {
    expect(clampView({ scale: 0.25, x: 200, y: -100 }, bounds)).toEqual({
      scale: 1,
      x: 0,
      y: 0,
    });
    expect(clampView({ scale: 20, x: 9000, y: -9000 }, bounds)).toEqual({
      scale: 8,
      x: 3500,
      y: -1700,
    });
  });

  it("keeps the chosen image point under the cursor while zooming", () => {
    expect(
      zoomAt({ scale: 1, x: 0, y: 0 }, 2, { x: 100, y: 20 }, bounds),
    ).toEqual({ scale: 2, x: -100, y: -20 });
    expect(
      zoomAt({ scale: 2, x: -100, y: -20 }, 1, { x: 100, y: 20 }, bounds),
    ).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it("normalizes wheel units and keeps zoom within 100 to 800 percent", () => {
    expect(wheelScale(1, -100, 0, 600)).toBeGreaterThan(1);
    expect(wheelScale(2, 3, 1, 600)).toBe(wheelScale(2, 48, 0, 600));
    expect(wheelScale(2, 1, 2, 600)).toBe(wheelScale(2, 600, 0, 600));
    expect(wheelScale(1, 5000, 0, 600)).toBe(1);
    expect(wheelScale(8, -5000, 0, 600)).toBe(8);
  });

  it("keeps unusually large wheel signals at their corresponding zoom limit", () => {
    expect(wheelScale(2, -1e9, 0, 600)).toBe(8);
    expect(wheelScale(2, 1e9, 0, 600)).toBe(1);
  });
});

describe("same-project image navigation", () => {
  it("excludes videos without changing the tertiary image order", () => {
    expect(
      imageSequence([
        { id: "one", kind: "image" },
        { id: "film", kind: "video" },
        { id: "two", kind: "image" },
      ]).map((item) => item.id),
    ).toEqual(["one", "two"]);
  });

  it("stops at the first and last image rather than leaving the project", () => {
    expect(stepImage(0, -1, 5)).toBe(0);
    expect(stepImage(4, 1, 5)).toBe(4);
    expect(stepImage(2, -1, 5)).toBe(1);
    expect(stepImage(2, 1, 5)).toBe(3);
    expect(stepImage(0, 1, 0)).toBe(0);
  });
});

describe("pointer gesture lifecycle", () => {
  it("switches to the next image for a horizontal left swipe at 100 percent", () => {
    const start = startPointer(initialInteraction(), 7, { x: 250, y: 150 });
    const moved = movePointer(start, 7, { x: 100, y: 158 }, bounds);
    expect(endPointer(moved, 7, { x: 100, y: 158 }, bounds).direction).toBe(1);
  });

  it("ignores short, vertical and untracked-pointer swipes", () => {
    const start = startPointer(initialInteraction(), 7, { x: 250, y: 150 });
    expect(endPointer(start, 7, { x: 230, y: 151 }, bounds).direction).toBe(0);
    expect(endPointer(start, 7, { x: 100, y: 400 }, bounds).direction).toBe(0);
    expect(endPointer(start, 8, { x: 100, y: 150 }, bounds).direction).toBe(0);
    expect(start.pointers[7]).toEqual({ x: 250, y: 150 });
  });

  it("pans zoomed details and never uses that drag for image navigation", () => {
    const zoomed = { ...initialInteraction(), view: { scale: 2, x: 0, y: 0 } };
    const start = startPointer(zoomed, 7, { x: 250, y: 150 });
    const moved = movePointer(start, 7, { x: 100, y: 120 }, bounds);
    expect(moved.view).toEqual({ scale: 2, x: -150, y: -30 });
    expect(endPointer(moved, 7, { x: 100, y: 120 }, bounds).direction).toBe(0);
  });

  it("begins a pinch without a jump and scales around its moving midpoint", () => {
    const first = startPointer(initialInteraction(), 1, { x: -100, y: 0 });
    const pinch = startPointer(first, 2, { x: 100, y: 0 });
    expect(pinch.view).toEqual({ scale: 1, x: 0, y: 0 });
    const wider = movePointer(pinch, 2, { x: 300, y: 0 }, bounds);
    expect(wider.view).toEqual({ scale: 2, x: 100, y: 0 });
  });

  it("rebases the remaining finger after a pinch without a jump or accidental swipe", () => {
    const pinch = startPointer(
      startPointer(initialInteraction(), 1, { x: -100, y: 0 }),
      2,
      { x: 100, y: 0 },
    );
    const wider = movePointer(pinch, 2, { x: 300, y: 0 }, bounds);
    const ended = endPointer(wider, 2, { x: 300, y: 0 }, bounds);
    expect(ended.direction).toBe(0);
    const pan = movePointer(ended.state, 1, { x: -80, y: 10 }, bounds);
    expect(pan.view).toEqual({ scale: 2, x: 120, y: 10 });
    expect(endPointer(pan, 1, { x: -80, y: 10 }, bounds).direction).toBe(0);
  });

  it("ignores a third finger instead of retargeting the active pinch", () => {
    const pinch = startPointer(
      startPointer(initialInteraction(), 1, { x: -100, y: 0 }),
      2,
      { x: 100, y: 0 },
    );
    const third = startPointer(pinch, 3, { x: 400, y: 200 });
    expect(movePointer(third, 3, { x: 800, y: 400 }, bounds).view).toEqual({
      scale: 1,
      x: 0,
      y: 0,
    });
    expect(movePointer(third, 2, { x: 300, y: 0 }, bounds).view).toEqual({
      scale: 2,
      x: 100,
      y: 0,
    });
  });

  it("clears canceled, lost-capture and blurred gestures so a new swipe works", () => {
    const start = startPointer(initialInteraction(), 7, { x: 250, y: 150 });
    const canceled = cancelPointers(start);
    expect(canceled.pointers).toEqual({});
    expect(canceled.gesture).toBeNull();
    expect(endPointer(canceled, 7, { x: 100, y: 150 }, bounds).direction).toBe(
      0,
    );
    const next = startPointer(canceled, 9, { x: 100, y: 150 });
    expect(endPointer(next, 9, { x: 250, y: 150 }, bounds).direction).toBe(-1);
  });
});
