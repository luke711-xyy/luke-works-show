import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createKoi } from "./geometry";

describe("koi anatomy", () => {
  it("bends the trailing body into a turn while keeping the head stable", () => {
    const koi = createKoi(100, 711);
    const geometry = koi.body.geometry;
    koi.animate(1, 1, 0.6);
    const right = Array.from(geometry.getAttribute("position").array);
    koi.animate(1, 1, -0.6);
    const left = geometry.getAttribute("position");
    let rearDifference = 0;
    let headDifference = 0;
    for (let i = 0; i < left.count; i++) {
      const delta = Math.abs(left.getZ(i) - right[i * 3 + 2]);
      if (left.getX(i) < -35) rearDifference = Math.max(rearDifference, delta);
      if (left.getX(i) > 33) headDifference = Math.max(headDifference, delta);
      expect(Number.isFinite(left.getZ(i))).toBe(true);
    }
    expect(rearDifference).toBeGreaterThan(5);
    expect(headDifference).toBeLessThan(0.5);
    expect(koi.body.geometry).toBe(geometry);
  });

  it("keeps pectoral and tail fins clearly visible with only slight translucency", () => {
    const koi = createKoi(100, 711);
    for (const name of ["pectoral-left", "pectoral-right", "tail-membrane"]) {
      const fin = koi.group.getObjectByName(name) as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshStandardMaterial
      >;
      expect(fin).toBeDefined();
      expect(fin.material.transparent).toBe(true);
      expect(fin.material.opacity).toBeGreaterThanOrEqual(0.75);
      expect(fin.material.opacity).toBeLessThan(1);
      expect(fin.material.depthWrite).toBe(false);
    }
  });

  it("raises the dorsal fin above the body and keeps its base seated", () => {
    const koi = createKoi(100, 711);
    const fin = koi.group.getObjectByName("dorsal-fin") as THREE.Mesh;
    expect(fin).toBeDefined();
    const positions = fin.geometry.getAttribute("position");
    const heights = Array.from({ length: positions.count }, (_, i) =>
      positions.getY(i),
    );
    expect(Math.max(...heights)).toBeGreaterThan(14);
    expect(Math.min(...heights)).toBeLessThan(10);
  });

  it("places layered eyes at the front of the head", () => {
    const koi = createKoi(100, 711);
    for (const side of ["left", "right"]) {
      const eye = koi.group.getObjectByName(`eye-${side}`)!;
      expect(eye).toBeDefined();
      expect(eye.position.x).toBeGreaterThan(33);
      const colors = new Set<string>();
      eye.traverse((object) => {
        if (object instanceof THREE.Mesh)
          colors.add(object.material.color.getHexString());
      });
      expect(colors.size).toBeGreaterThanOrEqual(4);
    }
  });

  it("uses a blunt snout with a wide oval mouth", () => {
    const koi = createKoi(100, 711);
    const positions = koi.body.geometry.getAttribute("position");
    const nose = Array.from({ length: positions.count }, (_, i) => ({
      x: positions.getX(i),
      z: positions.getZ(i),
    })).filter((p) => p.x > 49.9);
    expect(Math.max(...nose.map((p) => Math.abs(p.z)))).toBeGreaterThan(3.5);
    const mouth = koi.group.getObjectByName("mouth")!;
    expect(mouth).toBeDefined();
    expect(mouth.position.x).toBeGreaterThan(47);
    const size = new THREE.Box3()
      .setFromObject(mouth)
      .getSize(new THREE.Vector3());
    expect(size.z).toBeGreaterThan(size.y * 1.6);
  });

  it("gently narrows and projects the snout without turning it into a sharp tip", () => {
    const koi = createKoi(100, 711);
    const positions = koi.body.geometry.getAttribute("position");
    const points = Array.from({ length: positions.count }, (_, i) => ({
      x: positions.getX(i),
      z: positions.getZ(i),
    }));
    const tipX = Math.max(...points.map((p) => p.x));
    const tipWidth = Math.max(
      ...points.filter((p) => p.x > tipX - 0.01).map((p) => Math.abs(p.z)),
    );
    expect(tipX).toBeGreaterThan(50.5);
    expect(tipX).toBeLessThan(51.5);
    expect(tipWidth).toBeGreaterThan(3.7);
    expect(tipWidth).toBeLessThan(4.7);
    const mouth = koi.group.getObjectByName("mouth")!;
    const size = new THREE.Box3()
      .setFromObject(mouth)
      .getSize(new THREE.Vector3());
    expect(size.z).toBeLessThan(7.8);
    expect(size.z).toBeGreaterThan(7);
    expect(mouth.position.x).toBeGreaterThan(49.5);
    expect(mouth.position.x).toBeLessThan(tipX);
  });
});
