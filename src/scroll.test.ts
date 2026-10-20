import { describe, expect, it } from "vitest";
import { galleryWheelOffset } from "./scroll";

const input = { deltaX: 0, deltaY: 120, deltaMode: 0, ctrlKey: false };

describe("original gallery vertical wheel direction", () => {
  it("moves the gallery right for a positive vertical signal", () => {
    const offset = galleryWheelOffset(input, 900)!;
    expect(1500 + offset).toBe(1620);
  });

  it("moves left for the opposite signal", () => {
    expect(galleryWheelOffset({ ...input, deltaY: -120 }, 900)).toBe(-120);
  });

  it("keeps trackpad pixel precision rather than quantizing small gestures", () => {
    expect(galleryWheelOffset({ ...input, deltaY: 0.375 }, 900)).toBe(0.375);
  });

  it("normalizes line and page wheels without changing their direction", () => {
    expect(galleryWheelOffset({ ...input, deltaY: 3, deltaMode: 1 }, 900)).toBe(
      84,
    );
    expect(
      galleryWheelOffset({ ...input, deltaY: -1, deltaMode: 2 }, 844),
    ).toBe(-844);
  });

  it("leaves horizontal gestures and pinch-to-zoom to the browser", () => {
    expect(galleryWheelOffset({ ...input, deltaX: 160 }, 900)).toBeNull();
    expect(galleryWheelOffset({ ...input, ctrlKey: true }, 900)).toBeNull();
    expect(galleryWheelOffset({ ...input, deltaY: 0 }, 900)).toBeNull();
  });
});
