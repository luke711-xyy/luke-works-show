import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { depthBand, setPondLayer } from "./depth";
import { createFlower, createLeaf } from "./geometry";

describe("whole-object pond occlusion", () => {
  it("rejects invalid bands rather than silently overlapping objects", () => {
    for (const layer of [-1, 96, 0.5, NaN])
      expect(() => depthBand(layer)).toThrow(RangeError);
  });

  it("keeps whole objects in non-overlapping depth bands, even at extreme fold heights", () => {
    for (let layer = 0; layer < 95; layer++) {
      const back = depthBand(layer),
        front = depthBand(layer + 1);
      expect(front.center + front.scale).toBeLessThan(back.center - back.scale);
      expect(back.center - back.scale).toBeGreaterThan(-1);
      expect(back.center + back.scale).toBeLessThan(1);
    }
    // Literal camera-depth expectations: a flower must precede even the
    // closest point of a leaf, not only its average height or draw order.
    const leaf = depthBand(38),
      flower = depthBand(80);
    expect(flower.center + flower.scale).toBeLessThan(leaf.center - leaf.scale);
  });

  it("preserves the depth test and the leaf's self-occlusion and shadow caster", () => {
    const leaf = createLeaf(180, 12, "#333535");
    const geometry = leaf.surface.geometry;
    const before = Array.from(geometry.getAttribute("position").array);
    setPondLayer(leaf.group, 14);
    expect(leaf.surface.geometry).toBe(geometry);
    expect(Array.from(geometry.getAttribute("position").array)).toEqual(before);
    expect(leaf.surface.material.depthTest).toBe(true);
    expect(leaf.surface.material.depthWrite).toBe(true);
    expect(leaf.surface.castShadow).toBe(true);
    expect(leaf.surface.receiveShadow).toBe(true);
    expect(leaf.surface.customDepthMaterial).toBeInstanceOf(
      THREE.MeshDepthMaterial,
    );
    leaf.group.traverse((part) => {
      if (part instanceof THREE.Mesh) expect(part.renderOrder).toBe(14);
    });
  });

  it("places every petal and bud part in the flower layer, including shadows", () => {
    for (const stage of ["open", "bud"] as const) {
      const flower = createFlower(40, 2, stage);
      setPondLayer(flower, 80);
      flower.traverse((part) => {
        if (!(part instanceof THREE.Mesh)) return;
        expect(part.renderOrder).toBe(80);
        expect(part.material.depthTest).toBe(true);
        if (part.castShadow) expect(part.customDepthMaterial).toBeDefined();
      });
    }
  });

  it("can reapply layers after a resize without nesting shaders or replacing shadow buffers", () => {
    const leaf = createLeaf(120, 12, "#333535");
    setPondLayer(leaf.group, 12);
    const key = leaf.surface.material.customProgramCacheKey();
    const shadow = leaf.surface.customDepthMaterial;
    setPondLayer(leaf.group, 12);
    setPondLayer(leaf.group, 20);
    expect(leaf.surface.material.customProgramCacheKey()).toBe(key);
    expect(leaf.surface.customDepthMaterial).toBe(shadow);
  });
});
