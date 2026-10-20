import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createKoi } from "./geometry";

describe("koi anatomy", () => {
  it("leads a turn with a slight head bend while keeping the tail more flexible", () => {
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
    expect(headDifference).toBeGreaterThan(0.5);
    expect(headDifference).toBeLessThan(rearDifference * 0.2);
    expect(koi.body.geometry).toBe(geometry);
  });

  it("gently sways the cruising head with eyes, mouth and snout attached", () => {
    const koi = createKoi(100, 711);
    const mouth = koi.group.getObjectByName("mouth")!;
    const eye = koi.group.getObjectByName("eye-left")!;
    const geometry = koi.body.geometry;
    const headZ: number[] = [],
      tailZ: number[] = [],
      angles: number[] = [];
    let initialOrientation: THREE.Quaternion;
    let eyeMouthDistance = 0,
      lipSnoutDistance = 0;
    for (let frame = 0; frame <= 90; frame++) {
      koi.animate(frame / 60, 1, 0);
      koi.group.updateMatrixWorld(true);
      const positions = geometry.getAttribute("position");
      const snout = new THREE.Vector3();
      for (let i = positions.count - 25; i < positions.count; i++)
        snout.add(new THREE.Vector3().fromBufferAttribute(positions, i));
      snout.multiplyScalar(1 / 25).applyMatrix4(koi.body.matrixWorld);
      const lip = mouth.getWorldPosition(new THREE.Vector3());
      const pupil = eye.getWorldPosition(new THREE.Vector3());
      const orientation = mouth.getWorldQuaternion(new THREE.Quaternion());
      if (frame === 0) initialOrientation = orientation.clone();
      headZ.push(snout.z);
      tailZ.push(positions.getZ(0));
      angles.push(orientation.angleTo(initialOrientation!));
      if (frame === 0) {
        eyeMouthDistance = pupil.distanceTo(lip);
        lipSnoutDistance = lip.distanceTo(snout);
      }
      expect(pupil.distanceTo(lip)).toBeCloseTo(eyeMouthDistance, 5);
      expect(lip.distanceTo(snout)).toBeCloseTo(lipSnoutDistance, 4);
    }
    const span = (values: number[]) =>
      Math.max(...values) - Math.min(...values);
    expect(span(headZ)).toBeGreaterThan(0.8);
    expect(span(headZ)).toBeLessThan(span(tailZ) * 0.4);
    expect(span(angles)).toBeGreaterThan(0.015);
    expect(span(angles)).toBeLessThan(0.15);
    for (let i = 1; i < headZ.length; i++)
      expect(Math.abs(headZ[i] - headZ[i - 1])).toBeLessThan(0.2);
    expect(koi.body.geometry).toBe(geometry);
  });

  it("restores the exact neutral pose when head motion is disabled", () => {
    const koi = createKoi(100, 711);
    const original = Array.from(
      koi.body.geometry.getAttribute("position").array,
    );
    const eye = koi.group.getObjectByName("eye-left")!;
    koi.group.updateMatrixWorld(true);
    const rest = eye.getWorldPosition(new THREE.Vector3());
    koi.animate(0.5, 1, 0.7);
    koi.animate(3, 0, -0.7);
    koi.group.updateMatrixWorld(true);
    expect(
      Array.from(koi.body.geometry.getAttribute("position").array),
    ).toEqual(original);
    expect(
      eye.getWorldPosition(new THREE.Vector3()).distanceTo(rest),
    ).toBeLessThan(1e-8);
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

  it("outlines each fin with subtle ink and keeps its rays distinct from the pale membrane", () => {
    const koi = createKoi(100, 711);
    for (const name of [
      "pectoral-left",
      "pectoral-right",
      "tail-membrane",
      "dorsal-fin",
    ]) {
      koi.animate(0, 0);
      koi.group.updateMatrixWorld(true);
      const membrane = koi.group.getObjectByName(name) as THREE.Mesh<
        THREE.ShapeGeometry,
        THREE.MeshStandardMaterial
      >;
      const edge = koi.group.getObjectByName(`${name}-edge`) as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshBasicMaterial
      >;
      const rays = koi.group.getObjectByName(`${name}-rays`) as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshBasicMaterial
      >;
      expect(Boolean(edge), `${name}: no silhouette ink`).toBe(true);
      expect(Boolean(rays), `${name}: no interior fin rays`).toBe(true);
      for (const ink of [edge, rays]) {
        expect(ink.parent).toBe(membrane.parent);
        expect(ink.material.transparent).toBe(true);
        expect(ink.material.depthWrite).toBe(false);
        expect(ink.material.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(
          0.4,
        );
      }
      expect(edge.material.opacity).toBeGreaterThanOrEqual(0.3);
      expect(edge.material.opacity).toBeLessThanOrEqual(0.6);
      expect(rays.material.opacity).toBeGreaterThanOrEqual(0.2);
      expect(rays.material.opacity).toBeLessThan(edge.material.opacity);
      // The edge follows the real curved silhouette, not a bounding rectangle
      // or a thick halo. Check all generated tube vertices against that shape.
      const shape = membrane.geometry.parameters.shapes as THREE.Shape;
      const boundary = shape.getPoints(160);
      const positions = edge.geometry.getAttribute("position");
      const distance = (
        x: number,
        y: number,
        a: THREE.Vector2,
        b: THREE.Vector2,
      ) => {
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const t = Math.max(
          0,
          Math.min(
            1,
            ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1),
          ),
        );
        return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
      };
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i),
          y = name === "dorsal-fin" ? positions.getY(i) : positions.getZ(i);
        let closest = Infinity;
        for (let j = 1; j < boundary.length; j++)
          closest = Math.min(
            closest,
            distance(x, y, boundary[j - 1], boundary[j]),
          );
        expect(closest).toBeLessThan(0.65);
      }
      const geometry = edge.geometry;
      const before = Array.from(positions.array);
      const transform = edge.parent!.matrixWorld.clone();
      koi.animate(2, 1, 0.6);
      koi.group.updateMatrixWorld(true);
      if (name === "dorsal-fin")
        expect(Array.from(positions.array)).not.toEqual(before);
      else expect(edge.parent!.matrixWorld.equals(transform)).toBe(false);
      expect(edge.geometry).toBe(geometry);
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
