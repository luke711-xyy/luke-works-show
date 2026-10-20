import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { PondSeam } from "./seam";
import { createLeaf } from "./geometry";
import { setPondLayer } from "./depth";

describe("fixed home-right / gallery-left seam", () => {
  it("clips opposite sides of exactly the same moving boundary", () => {
    const seam = new PondSeam();
    for (const cameraX of [0, 400, 720, 1440, 7440]) {
      seam.update(1440, cameraX);
      const boundary = 720 - cameraX;
      for (const offset of [-50, 50]) {
        const p = new THREE.Vector3(boundary + offset, 120, 900);
        expect(seam.home.distanceToPoint(p) >= 0).toBe(offset < 0);
        expect(seam.works.distanceToPoint(p) >= 0).toBe(offset > 0);
      }
    }
  });

  it("clips the entire leaf and its shadow without losing whole-object depth ordering", () => {
    const seam = new PondSeam();
    const leaf = createLeaf(180, 12, "#333535");
    setPondLayer(leaf.group, 14);
    seam.bind(leaf.group, "pond");
    leaf.group.traverse((part) => {
      if (!(part instanceof THREE.Mesh)) return;
      expect(part.renderOrder).toBe(14);
      for (const material of Array.isArray(part.material)
        ? part.material
        : [part.material]) {
        expect(material.clippingPlanes).toEqual([seam.home]);
        expect(material.clipShadows).toBe(true);
        expect(material.depthTest).toBe(true);
      }
      if (part.castShadow)
        expect(part.customDepthMaterial?.clippingPlanes).toEqual([seam.home]);
    });
    seam.bind(leaf.group, null);
    expect(leaf.surface.material.clippingPlanes).toBeNull();
  });
});
