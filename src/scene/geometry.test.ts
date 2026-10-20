import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createFlower, createLeaf } from "./geometry";
import { leafEdge } from "./motion";

const luminance = (c: THREE.Color) =>
  c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;

describe("botanical surfaces", () => {
  it.each(["full", "compact"] as const)(
    "does not add a perimeter stroke to %s leaves, while retaining interior veins",
    (detail) => {
      const plain = createLeaf(180, 93, "#93948f", false, detail);
      expect(
        plain.group.children.every(
          (part) =>
            part instanceof THREE.Mesh &&
            part.geometry === plain.surface.geometry,
        ),
      ).toBe(true);

      const veined = createLeaf(180, 93, "#93948f", true, detail);
      const veins = veined.group.children.filter(
        (part) =>
          part instanceof THREE.Mesh &&
          part.geometry !== veined.surface.geometry,
      ) as THREE.Mesh[];
      expect(veins.length).toBeGreaterThan(0);
      for (const vein of veins) {
        const vertices = vein.geometry.getAttribute("position");
        let outermost = 0;
        for (let i = 0; i < vertices.count; i++) {
          const x = vertices.getX(i),
            z = vertices.getZ(i);
          outermost = Math.max(
            outermost,
            Math.hypot(x, z) / (180 * leafEdge(Math.atan2(z, x), 93)),
          );
        }
        expect(outermost).toBeLessThan(0.98);
      }
    },
  );
  it("halves phone leaf triangles without changing its outline or pale folds", () => {
    const full = createLeaf(120, 12, "#333535", false);
    const phone = createLeaf(120, 12, "#333535", false, "compact");
    const triangles = phone.surface.geometry.index!.count / 3;
    expect(triangles).toBeLessThan(4000);
    expect(phone.contour.map((point) => point.toArray())).toEqual(
      full.contour.map((point) => point.toArray()),
    );
    const colors = phone.surface.geometry.getAttribute("color");
    const values = Array.from({ length: colors.count }, (_, i) =>
      luminance(new THREE.Color().fromBufferAttribute(colors, i)),
    );
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.18);
  });
  it("gives a dark leaf both ink pools and broad pale regions", () => {
    const leaf = createLeaf(120, 12, "#333535", false);
    const colors = leaf.surface.geometry.getAttribute("color");
    const values = Array.from({ length: colors.count }, (_, i) =>
      luminance(new THREE.Color().fromBufferAttribute(colors, i)),
    );
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.18);
    expect(values.filter((v) => v < 0.08).length).toBeGreaterThan(
      values.length * 0.15,
    );
    expect(values.filter((v) => v > 0.2).length).toBeGreaterThan(
      values.length * 0.08,
    );
  });

  it("sculpts folds across the leaf rather than only lifting its rim", () => {
    const leaf = createLeaf(120, 12, "#333535", false);
    const positions = leaf.surface.geometry.getAttribute("position");
    const middle = Array.from({ length: positions.count }, (_, i) => ({
      radius: Math.hypot(positions.getX(i), positions.getZ(i)),
      height: positions.getY(i),
    })).filter((v) => v.radius > 65 && v.radius < 78);
    const heights = middle.map((v) => v.height);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(9);
  });

  it("keeps open petals pale near their roots and richer at the tips", () => {
    const flower = createFlower(40, 2);
    const petals = flower.children.filter(
      (child) => child instanceof THREE.Mesh && child.material.vertexColors,
    ) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[];
    expect(petals.length).toBeGreaterThan(10);
    for (const petal of petals) {
      const pos = petal.geometry.getAttribute("position"),
        colors = petal.geometry.getAttribute("color");
      const length =
        petal.geometry.boundingBox?.max.x ??
        Math.max(...Array.from({ length: pos.count }, (_, i) => pos.getX(i)));
      const root: THREE.Color[] = [],
        tip: THREE.Color[] = [];
      for (let i = 0; i < pos.count; i++) {
        const t = pos.getX(i) / length;
        if (t > 0.18 && t < 0.5)
          root.push(new THREE.Color().fromBufferAttribute(colors, i));
        if (t > 0.88)
          tip.push(new THREE.Color().fromBufferAttribute(colors, i));
      }
      const mean = (items: THREE.Color[], f: (c: THREE.Color) => number) =>
        items.reduce((sum, c) => sum + f(c), 0) / items.length;
      expect(mean(root, luminance)).toBeGreaterThan(mean(tip, luminance) + 0.1);
      const chroma = (c: THREE.Color) =>
        Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
      expect(mean(tip, chroma)).toBeGreaterThan(mean(root, chroma) + 0.08);
    }
  });

  it("builds an upright closed bud instead of another open rosette", () => {
    const bud = createFlower(30, 4, "bud");
    const bounds = new THREE.Box3().setFromObject(bud),
      size = bounds.getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(Math.max(size.x, size.z) * 1.8);
    expect(size.x).toBeGreaterThan(20);
    expect(Number.isFinite(bounds.max.y)).toBe(true);
  });
});
