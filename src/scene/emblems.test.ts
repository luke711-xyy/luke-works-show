import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { projects } from "../data/projects";
import { createEmblem } from "./emblems";
import { CHIME_BEAT, CHIME_CONTACT } from "./musical-emblem";
import { clepsydra } from "./clepsydra-emblem";

function dispose(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    (Array.isArray(object.material)
      ? object.material
      : [object.material]
    ).forEach((m) => materials.add(m));
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

describe("project emblem motion", () => {
  it("builds a seven-string guqin and contacts each bronze chime from the front", () => {
    const emblem = createEmblem("mosic", 100);
    const strings: THREE.Object3D[] = [];
    emblem.group.traverse((object) => {
      if (object.name.startsWith("guqin-string-")) strings.push(object);
    });
    expect(strings).toHaveLength(7);
    const head = emblem.group.getObjectByName("chime-hammer-head")!;
    const origin = new THREE.Vector3(),
      direction = new THREE.Vector3();
    for (let i = 0; i < 5; i++) {
      emblem.animate(CHIME_CONTACT + i * CHIME_BEAT);
      emblem.group.updateMatrixWorld(true);
      const bell = emblem.group.getObjectByName("chime-bell-" + i)!;
      const body = emblem.group.getObjectByName("chime-body-" + i)!;
      head.getWorldPosition(origin);
      // Probe within the hammer face, away from the lathe's duplicated seam.
      origin.add(
        new THREE.Vector3(1, 0, 0)
          .transformDirection(bell.matrixWorld)
          .multiplyScalar(0.5),
      );
      direction.set(0, 0, -1).transformDirection(bell.matrixWorld);
      const hits = new THREE.Raycaster(
        origin,
        direction,
        0,
        20,
      ).intersectObject(body, false);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].distance).toBeGreaterThan(2.5);
      expect(
        hits[0].distance,
        "bell " +
          i +
          " at " +
          JSON.stringify(bell.worldToLocal(origin.clone()).toArray()),
      ).toBeLessThan(4.5);
      emblem.animate(CHIME_CONTACT + i * CHIME_BEAT + 0.1);
      expect(Math.abs(bell.rotation.x)).toBeGreaterThan(0.04);
    }
    dispose(emblem.group);
  });

  it("rolls the bamboo mat sideways with fixed writing and a stationary closed bundle", () => {
    const emblem = createEmblem("teleprompter", 100);
    const text = emblem.group.getObjectByName(
      "bamboo-fixed-script",
    ) as THREE.InstancedMesh;
    const closed = emblem.group.getObjectByName("closed-bamboo-scroll")!;
    const pose = (time: number) => {
      emblem.animate(time);
      emblem.group.updateMatrixWorld(true);
      const centers: number[] = [];
      const heights: number[] = [];
      for (let i = 0; i < 15; i++)
        centers.push(
          emblem.group.getObjectByName("rolling-bamboo-slat-" + i)!.position.x,
        );
      for (let i = 0; i < text.count; i++)
        heights.push(text.instanceMatrix.array[i * 16 + 13]);
      return {
        width: Math.max(...centers) - Math.min(...centers),
        heights,
        closed: closed.matrixWorld.toArray(),
      };
    };
    const rolled = pose(3.1),
      open = pose(1);
    expect(open.width).toBeGreaterThan(rolled.width * 2.5);
    expect(open.heights).toEqual(rolled.heights);
    expect(open.closed).toEqual(rolled.closed);
    dispose(emblem.group);
  });

  it("holds the bamboo mat open for one fifth of the previous duration without changing its roll speeds", () => {
    const emblem = createEmblem("teleprompter", 100);
    const slats = Array.from({ length: 15 }, (_, i) =>
      emblem.group.getObjectByName("rolling-bamboo-slat-" + i)!,
    );
    const widthAt = (time: number) => {
      emblem.animate(time);
      const centers = slats.map((slat) => slat.position.x);
      return Math.max(...centers) - Math.min(...centers);
    };
    const openWidth = widthAt(0);
    for (const cycleStart of [0, 4.48]) {
      expect(widthAt(cycleStart + 2.38)).toBeCloseTo(openWidth);
      expect(widthAt(cycleStart + 2.68)).toBeLessThan(openWidth * 0.9);
      const closedWidth = widthAt(cycleStart + 2.98);
      expect(closedWidth).toBeLessThan(openWidth * 0.4);
      expect(widthAt(cycleStart + 3.27)).toBeCloseTo(closedWidth);
      expect(widthAt(cycleStart + 3.88)).toBeGreaterThan(closedWidth * 1.5);
      expect(widthAt(cycleStart + 4.48)).toBeCloseTo(openWidth);
    }
    expect(widthAt(4.479)).toBeCloseTo(widthAt(4.48), 3);
    dispose(emblem.group);
  });

  it("removes and rebuilds every pavilion block while the two garden rocks stay in place", () => {
    const emblem = createEmblem("worldmaker", 100);
    const building = emblem.group.getObjectByName(
      "pavilion-building-voxels",
    ) as THREE.InstancedMesh;
    const rockNames = ["garden-rock-left", "garden-rock-right"];
    const pose = (time: number) => {
      emblem.animate(time);
      emblem.group.updateMatrixWorld(true);
      const scales: number[] = [];
      for (let i = 0; i < building.count; i++) {
        const o = i * 16;
        scales.push(
          Math.hypot(
            building.instanceMatrix.array[o],
            building.instanceMatrix.array[o + 1],
            building.instanceMatrix.array[o + 2],
          ),
        );
      }
      return {
        scales,
        rocks: rockNames.map((name) =>
          emblem.group.getObjectByName(name)!.matrixWorld.toArray(),
        ),
      };
    };
    const built = pose(4),
      gone = pose(8.5),
      next = pose(13);
    expect(building.count).toBeGreaterThan(1500);
    expect(built.scales.every((s) => Math.abs(s - 1) < 0.00001)).toBe(true);
    expect(gone.scales.every((s) => s === 0)).toBe(true);
    expect(next.scales).toEqual(built.scales);
    expect(gone.rocks).toEqual(built.rocks);
    dispose(emblem.group);
  });

  it("supports the guqin above the ground on a full-height wooden stand", () => {
    const emblem = createEmblem("mosic", 100);
    emblem.group.updateMatrixWorld(true);
    const stand = emblem.group.getObjectByName("guqin-stand");
    expect(stand).toBeDefined();
    const standBounds = new THREE.Box3().setFromObject(stand!);
    const boardBounds = new THREE.Box3().setFromObject(
      emblem.group.getObjectByName("guqin-soundboard")!,
    );
    expect(standBounds.min.y).toBeLessThan(1);
    expect(standBounds.max.y - standBounds.min.y).toBeGreaterThan(17);
    expect(boardBounds.min.y).toBeGreaterThan(20);
    expect(boardBounds.min.y - standBounds.max.y).toBeLessThan(3);
    dispose(emblem.group);
  });

  it("keeps a sealed wooden cabin floor above the water throughout boat rocking", () => {
    const emblem = createEmblem("lanbridge", 100);
    const floor = emblem.group.getObjectByName(
      "boat-cabin-floor",
    ) as THREE.Mesh;
    expect(floor).toBeDefined();
    const pond = emblem.group.getObjectByName("boat-pond")!;
    const boat = emblem.group.getObjectByName("boat")!;
    for (let time = 0; time < 70; time += 0.5) {
      emblem.animate(time);
      emblem.group.updateMatrixWorld(true);
      expect(new THREE.Box3().setFromObject(floor).min.y).toBeGreaterThan(1.5);
      const ray = new THREE.Raycaster(
        boat.localToWorld(new THREE.Vector3(0, 30, 0)),
        new THREE.Vector3(0, -1, 0).transformDirection(boat.matrixWorld),
      );
      const woodHit = ray.intersectObject(floor, false);
      const waterHit = ray.intersectObject(pond, false);
      expect(woodHit.length).toBeGreaterThan(0);
      expect(waterHit.length).toBeGreaterThan(0);
      expect(woodHit[0].distance).toBeLessThan(waterHit[0].distance);
    }
    dispose(emblem.group);
  });

  it("gallops a miniature horse along the sand table without leaving the terrain", () => {
    const emblem = createEmblem("huazhi", 100);
    const horse = emblem.group.getObjectByName("sand-table-horse");
    expect(horse).toBeDefined();
    const legs = horse!.children.filter((part) =>
      part.name.startsWith("horse-leg-"),
    );
    expect(legs).toHaveLength(4);
    emblem.animate(3);
    const firstPosition = horse!.position.clone();
    const firstLegs = legs.map((leg) => leg.rotation.z);
    emblem.animate(4);
    expect(horse!.position.distanceTo(firstPosition)).toBeGreaterThan(3);
    expect(legs.map((leg) => leg.rotation.z)).not.toEqual(firstLegs);
    for (let time = 0; time < 30; time += 0.1) {
      emblem.animate(time);
      horse!.updateWorldMatrix(true, true);
      // Inspect the horse in map coordinates, not the emblem's presentation yaw.
      const bounds = new THREE.Box3();
      const inverseMap = emblem.group.matrixWorld.clone().invert();
      horse!.traverse((part) => {
        if (!(part instanceof THREE.Mesh)) return;
        const vertices = part.geometry.getAttribute("position");
        const toMap = inverseMap.clone().multiply(part.matrixWorld);
        for (let i = 0; i < vertices.count; i++)
          bounds.expandByPoint(
            new THREE.Vector3()
              .fromBufferAttribute(vertices, i)
              .applyMatrix4(toMap),
          );
      });
      expect(bounds.min.x).toBeGreaterThan(-52);
      expect(bounds.max.x).toBeLessThan(52);
      expect(bounds.min.z).toBeGreaterThan(14);
      expect(bounds.max.z).toBeLessThan(38);
    }
    dispose(emblem.group);
  });

  it("stages Bai Suzhen, Xiaoqing and Xu Xian with a paper umbrella", () => {
    const emblem = createEmblem("moce-film", 100);
    for (const name of [
      "white-snake",
      "green-snake",
      "xu-xian",
      "white-snake-paper-umbrella",
    ])
      expect(emblem.group.getObjectByName(name)).toBeDefined();
    dispose(emblem.group);
  });

  it("keeps each water-clock platform above its support throughout hover scaling", () => {
    const group = new THREE.Group();
    const animate = clepsydra(group);
    animate(9);
    const ray = new THREE.Raycaster();
    // Probe the exposed board and the front upright's top, clear of the pots.
    for (let step = 0; step <= 32; step++) {
      group.scale.setScalar(1 + (0.022 * step) / 32);
      group.updateMatrixWorld(true);
      for (let i = 0; i < 3; i++) {
        const x = -42 + i * 28,
          top = 94 - i * 30;
        for (const [dx, z] of [
          [10, 8],
          [-13.6, 10.8],
        ]) {
          ray.set(
            new THREE.Vector3(x + dx, top + 0.5, z).applyMatrix4(
              group.matrixWorld,
            ),
            new THREE.Vector3(0, -1, 0),
          );
          const hits = ray.intersectObjects(group.children, false);
          expect(hits.length).toBeGreaterThan(1);
          const surface = group.worldToLocal(hits[0].point.clone()).y;
          expect(surface).toBeCloseTo(top, 3);
          expect(
            hits.filter(
              (hit) => Math.abs(hit.distance - hits[0].distance) < 0.03,
            ).length,
            `step ${i}, hover ${step}: competing top surfaces`,
          ).toBe(1);
          const support = group.worldToLocal(hits[1].point.clone()).y;
          expect(surface - support).toBeGreaterThan(1.5);
        }
      }
    }
    dispose(group);
  });

  it("raises a floating time arrow with the receiving water in a stationary four-vessel clepsydra", () => {
    const emblem = createEmblem("meet-countdown", 100);
    const vessels = Array.from({ length: 4 }, (_, i) =>
      emblem.group.getObjectByName(`clepsydra-vessel-${i}`),
    );
    expect(vessels.every(Boolean)).toBe(true);
    const water = emblem.group.getObjectByName("clepsydra-water-3")!;
    const arrow = emblem.group.getObjectByName("clepsydra-float-arrow")!;
    const heights: number[] = [];
    const poses = vessels.map((vessel) => vessel!.quaternion.toArray());
    for (const time of [0, 3, 6, 12, 18]) {
      emblem.animate(time);
      heights.push(arrow.position.y);
      expect(arrow.position.y - water.position.y).toBeCloseTo(1);
      expect(vessels.map((vessel) => vessel!.quaternion.toArray())).toEqual(
        poses,
      );
    }
    expect(heights[4] - heights[0]).toBeGreaterThan(10);
    expect(
      heights.every((height, i) => i === 0 || height > heights[i - 1]),
    ).toBe(true);
    emblem.animate(21);
    expect(arrow.position.y).toBeLessThan(heights[4]);
    emblem.animate(22);
    expect(arrow.position.y).toBeCloseTo(heights[0]);
    dispose(emblem.group);
  });

  it("drops water from all three spouts into the next vessel and pauses the flow during emptying", () => {
    const emblem = createEmblem("meet-countdown", 100);
    for (const time of [2, 8, 17]) {
      emblem.animate(time);
      for (let i = 0; i < 3; i++) {
        const drops = emblem.group.getObjectByName(
          `clepsydra-drops-${i}`,
        ) as THREE.InstancedMesh;
        expect(drops).toBeDefined();
        expect(drops.visible).toBe(true);
        const source = emblem.group.getObjectByName(`clepsydra-outlet-${i}`)!;
        const target = emblem.group.getObjectByName(
          `clepsydra-vessel-${i + 1}`,
        )!;
        const water = emblem.group.getObjectByName(`clepsydra-water-${i + 1}`)!;
        emblem.group.updateMatrixWorld(true);
        const outlet = new THREE.Vector3();
        source.getWorldPosition(outlet);
        emblem.group.worldToLocal(outlet);
        const matrix = new THREE.Matrix4();
        for (let j = 0; j < drops.count; j++) {
          drops.getMatrixAt(j, matrix);
          const drop = new THREE.Vector3().setFromMatrixPosition(matrix);
          expect(drop.y).toBeLessThanOrEqual(outlet.y + 0.001);
          expect(drop.y).toBeGreaterThanOrEqual(
            target.position.y + water.position.y - 0.001,
          );
          expect(
            Math.hypot(drop.x - target.position.x, drop.z - target.position.z),
          ).toBeLessThan(10);
        }
      }
    }
    emblem.animate(20);
    for (let i = 0; i < 3; i++)
      expect(
        emblem.group.getObjectByName(`clepsydra-drops-${i}`)!.visible,
      ).toBe(false);
    emblem.animate(0);
    const arrow = emblem.group.getObjectByName("clepsydra-float-arrow")!;
    const start = arrow.position.y;
    emblem.animate(21.999);
    expect(arrow.position.y).toBeCloseTo(start, 3);
    dispose(emblem.group);
  });

  it("keeps the tea stream attached to the spout and inside each cup on alternate pours", () => {
    const emblem = createEmblem("water-reminder", 100);
    const pot = emblem.group.getObjectByName("teapot")!;
    const stream = emblem.group.getObjectByName("tea-stream") as THREE.Mesh;
    const positions = stream.geometry.getAttribute("position");
    for (const time of [3, 9]) {
      emblem.animate(time);
      expect(stream.visible).toBe(true);
      const spout = new THREE.Vector3(35.5, 34, 0).applyMatrix4(pot.matrix);
      const first = new THREE.Vector3().fromBufferAttribute(positions, 0);
      expect(first.distanceTo(spout)).toBeLessThan(0.8);
      const landing = new THREE.Vector3().fromBufferAttribute(
        positions,
        positions.count - 1,
      );
      expect(
        Math.hypot(landing.x - 30, landing.z - (time === 3 ? -22 : 22)),
      ).toBeLessThan(1);
      expect(landing.y).toBe(17);
    }
    emblem.animate(5.8);
    expect(stream.visible).toBe(false);
    dispose(emblem.group);
  });

  it("keeps reduced-motion poses fixed for every model", () => {
    for (const project of projects) {
      const emblem = createEmblem(project.id, 100);
      const pose = (time: number) => {
        emblem.animate(time, true);
        emblem.group.updateMatrixWorld(true);
        const matrices: number[] = [];
        emblem.group.traverse((object) => {
          matrices.push(...object.matrixWorld.elements);
          if (object instanceof THREE.InstancedMesh)
            matrices.push(...object.instanceMatrix.array);
          if (object instanceof THREE.Mesh) {
            const positions = object.geometry.getAttribute("position");
            for (let i = 0; i < positions.count; i++)
              matrices.push(positions.getZ(i));
          }
        });
        return matrices;
      };
      expect(pose(20)).toEqual(pose(0));
      dispose(emblem.group);
    }
  });

  it("animates every project without creating new scene objects each frame", () => {
    for (const project of projects) {
      const emblem = createEmblem(project.id, 100);
      const pose = (time: number) => {
        emblem.animate(time);
        emblem.group.updateMatrixWorld(true);
        const objects: THREE.Object3D[] = [];
        const values: number[] = [];
        emblem.group.traverse((object) => {
          objects.push(object);
          values.push(...object.matrixWorld.elements);
          if (object instanceof THREE.InstancedMesh)
            values.push(...object.instanceMatrix.array);
          if (object instanceof THREE.Mesh) {
            const positions = object.geometry.getAttribute("position");
            for (let i = 0; i < positions.count; i++)
              values.push(positions.getZ(i));
          }
        });
        return { objects, values };
      };
      const first = pose(0),
        later = pose(project.id === "teleprompter" ? 3.1 : 2.5);
      expect(later.objects).toEqual(first.objects);
      expect(later.values).not.toEqual(first.values);
      expect(later.values.every(Number.isFinite)).toBe(true);
      dispose(emblem.group);
    }
  });
});
