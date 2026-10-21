import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PondScene, type SceneFrame } from "./PondScene";
import { galleryRadius } from "./motion";

// Only the WebGL boundary is replaced; scene construction, resources, layout,
// navigation and the frame loop below use the real implementation.
vi.mock("three", async (original) => ({
  ...(await original<typeof THREE>()),
  WebGLRenderer: class {
    private target: THREE.WebGLRenderTarget | null = null;
    shadowMap = { enabled: false, type: 0 };
    setClearColor() {}
    setPixelRatio() {}
    setSize() {}
    setRenderTarget(target: THREE.WebGLRenderTarget | null) {
      this.target = target;
    }
    getRenderTarget() {
      return this.target;
    }
    async compileAsync(scene: THREE.Object3D) {
      return scene;
    }
    clear() {}
    render(scene: THREE.Scene, camera: THREE.Camera) {
      // Real WebGLRenderer updates both before drawing. Keep projection and
      // picking real even though this fixture has no GPU context.
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
    }
    dispose() {}
  },
}));

let frame: FrameRequestCallback;
const idleJobs = new Map<number, () => void>();
let idleId = 0;

const create = (
  page: "pond" | "works" = "pond",
  width = 390,
  reduced = false,
  onFrame: (data: SceneFrame) => void = () => {},
  coarse = false,
) => {
  vi.stubGlobal("window", {
    innerWidth: width,
    innerHeight: 700,
    matchMedia: (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" ? reduced : coarse,
    }),
    requestIdleCallback: (callback: () => void) => {
      const id = ++idleId;
      idleJobs.set(id, callback);
      return id;
    },
    cancelIdleCallback: (id: number) => idleJobs.delete(id),
  });
  vi.stubGlobal("location", { search: "" });
  vi.stubGlobal("devicePixelRatio", 3);
  vi.stubGlobal("document", { hidden: false });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const pond = new PondScene({} as HTMLCanvasElement, {
    frame: onFrame,
    pick: () => {},
    error: () => {},
  });
  pond.setNavigation({ page, selected: "mosic", detail: null }, 0, true);
  return pond;
};
const meshes = (scene: THREE.Scene) => {
  const result: THREE.Mesh[] = [];
  scene.traverse((part) => {
    if (part instanceof THREE.Mesh) result.push(part);
  });
  return result;
};
afterEach(() => {
  idleJobs.clear();
  vi.unstubAllGlobals();
});

const flowers = (pond: PondScene) =>
  pond.scene.children
    .flatMap((part) => part.children)
    .filter((part) => part.renderOrder >= 80 && part.renderOrder < 96);
const flowerCenter = (flower: THREE.Object3D, pond: PondScene) => {
  const center = new THREE.Box3()
    .setFromObject(flower)
    .getCenter(new THREE.Vector3());
  center.project(pond.camera);
  return {
    x: ((center.x + 1) * window.innerWidth) / 2,
    y: (1 - center.y) * 350,
  };
};
const clockFor = () => {
  let now = performance.now() + 50;
  return (count = 1) => {
    for (let i = 0; i < count; i++) frame((now += 34));
  };
};

describe("mobile home foliage composition", () => {
  it.each([320, 390, 430])(
    "breaks vertical leaf columns without enlarging the foliage budget at %spx",
    (width) => {
      const pond = create("pond", width, true);
      const leaves = (
        pond as unknown as {
          leaves: {
            base: { x: number; y: number };
            radius: number;
            group: THREE.Group;
          }[];
        }
      ).leaves.filter((leaf) => !leaf.group.userData.galleryDecoration);
      const visible = leaves.filter(
        (leaf) =>
          leaf.base.y > 0 &&
          leaf.base.y < 700 &&
          leaf.base.x > -width * 0.1 &&
          leaf.base.x < width * 1.1,
      );
      const aligned = visible.map(
        (leaf) =>
          visible.filter(
            (other) => Math.abs(other.base.x - leaf.base.x) < width * 0.095,
          ).length,
      );
      // A <= 19%-wide vertical strip must not collect a repeated eight-row
      // column; changing only a few pixels of jitter should still fail.
      expect(Math.max(...aligned)).toBeLessThanOrEqual(5);
      const radii = visible.map((leaf) => leaf.radius);
      expect(Math.max(...radii) / Math.min(...radii)).toBeGreaterThan(1.65);
      expect(Math.max(...radii)).toBeLessThan(width * 0.29);
      expect(leaves.length).toBeLessThanOrEqual(24);
      const inscription = leaves.find(
        (leaf) => leaf.group.name === "portfolio-inscription-leaf",
      )!;
      expect(inscription.base.x).toBeGreaterThan(width * 0.35);
      expect(inscription.base.x).toBeLessThan(width * 0.65);
      expect(inscription.base.y).toBeLessThan(700 * 0.4);
      pond.dispose();
    },
  );
});

describe("home contact waves in the real scene", () => {
  it("captures a between-frame phone tap under plants and reuses the resource on resize", () => {
    const pond = create();
    const advance = clockFor();
    advance();
    pond.setPointer(200, 410, true);
    pond.setPointer(-1000, -1000, false);
    advance(4);
    const group = pond.scene.getObjectByName("contact-water-waves");
    expect(group).toBeDefined();
    const mesh = group!.children[0] as THREE.Mesh;
    expect(mesh.geometry.drawRange.count).toBeGreaterThan(0);
    expect(mesh.renderOrder).toBeGreaterThan(0);
    expect(mesh.renderOrder).toBeLessThan(10);
    const geometry = mesh.geometry;
    pond.resize(390, 740);
    expect(pond.scene.getObjectByName("contact-water-waves")).toBe(group);
    expect(mesh.geometry).toBe(geometry);
    expect(mesh.geometry.drawRange.count).toBe(0);
    pond.resize(1280, 740);
    expect(pond.scene.getObjectByName("contact-water-waves")).toBe(group);
    expect(mesh.geometry).toBe(geometry);
    pond.dispose();
  });

  it("does not create first-level contact waves while browsing the gallery", () => {
    const pond = create("works");
    const advance = clockFor();
    advance();
    pond.setPointer(200, 410, true);
    advance(4);
    const group = pond.scene.getObjectByName("contact-water-waves");
    expect(group).toBeDefined();
    expect((group!.children[0] as THREE.Mesh).geometry.drawRange.count).toBe(0);
    pond.dispose();
  });
});

describe("home fish body exposure", () => {
  it.each([
    { stage: "open", flower: 0, x: 122, y: 182, angle: 0 },
    { stage: "bud", flower: 3, x: 150, y: 138, angle: Math.PI / 2 },
  ])(
    "does not treat empty stem/head bounding-box corners as opaque for $stage flowers",
    ({ flower: flowerIndex, x, y, angle }) => {
      const frames: SceneFrame[] = [];
      const pond = create("pond", 390, true, (data) => frames.push(data));
      // Place the real generated geometry at the reported regression poses.
      // Test-only layout access stays here, out of the production scene API.
      const layout = pond as unknown as {
        leaves: { base: { x: number; y: number } }[];
        flowers: {
          base: { x: number; y: number };
          object: THREE.Group;
        }[];
        fish: {
          body: THREE.Mesh;
          patrol: { x: number; y: number; angle: number };
        }[];
      };
      for (const leaf of layout.leaves) leaf.base.x = -10000;
      for (const flower of layout.flowers) flower.base.x = -10000;
      const flower = layout.flowers[flowerIndex];
      flower.base = { x: 150, y: 150 };
      const koi = layout.fish[0];
      Object.assign(koi.patrol, { x, y, angle });
      clockFor()();

      // Independent reference: ray-test actual rendered body/flower triangles,
      // not the exposure estimator's polygons, ellipse, or sample positions.
      const ray = new THREE.Raycaster(),
        ndc = new THREE.Vector2();
      let bodyPixels = 0,
        exposedPixels = 0;
      for (let px = x - 30; px <= x + 30; px += 2)
        for (let py = y - 30; py <= y + 30; py += 2) {
          ray.setFromCamera(
            ndc.set((px / 390) * 2 - 1, 1 - (py / 700) * 2),
            pond.camera,
          );
          if (!ray.intersectObject(koi.body).length) continue;
          bodyPixels++;
          if (!ray.intersectObject(flower.object, true).length) exposedPixels++;
        }
      expect(bodyPixels).toBeGreaterThan(30);
      expect(exposedPixels / bodyPixels).toBeGreaterThan(0.75);
      expect(frames.at(-1)!.fish[0].exposure).toBeGreaterThan(1 / 3);
      pond.dispose();
    },
  );

  it("reports finite body exposure and follows the rendered home leaves", () => {
    const frames: SceneFrame[] = [];
    const pond = create("pond", 390, true, (data) => frames.push(data));
    const advance = clockFor();
    advance();
    // Removing the exposure field, or emitting an unbounded value, must fail
    // before the fixture changes any foliage geometry.
    for (const fish of frames.at(-1)!.fish) {
      expect(Number.isFinite(fish.exposure)).toBe(true);
      expect(fish.exposure).toBeGreaterThanOrEqual(0);
      expect(fish.exposure).toBeLessThanOrEqual(1);
    }
    const homeFoliage = pond.scene.children
      .flatMap((part) => part.children)
      .filter(
        (part) =>
          part.renderOrder >= 10 &&
          !part.userData.galleryDecoration &&
          (part.renderOrder < 40 || part.renderOrder >= 80),
      );
    homeFoliage.forEach((part) => part.scale.setScalar(0));
    advance();
    expect(frames.at(-1)!.fish.every((fish) => fish.exposure === 1)).toBe(true);
    homeFoliage
      .filter((part) => part.renderOrder < 40)
      .forEach((part) => part.scale.setScalar(8));
    advance();
    expect(frames.at(-1)!.fish.every((fish) => fish.exposure === 0)).toBe(true);
    pond.dispose();
  });

  it("keeps a fish covered by a raised home bloom hidden when the leaves part", () => {
    const frames: SceneFrame[] = [];
    const pond = create("pond", 390, true, (data) => frames.push(data));
    const advance = clockFor();
    advance();
    const rootParts = pond.scene.children.flatMap((part) => part.children);
    rootParts
      .filter((part) => part.renderOrder >= 10 && part.renderOrder < 40)
      .forEach((part) => part.scale.setScalar(0));
    flowers(pond).forEach((part) => part.scale.setScalar(0));
    advance();
    expect(frames.at(-1)!.fish[0].exposure).toBe(1);
    const bloom = flowers(pond)[0];
    bloom.scale.setScalar(8);
    advance();
    expect(frames.at(-1)!.fish[0].exposure).toBe(0);
    bloom.scale.setScalar(0);
    advance();
    expect(frames.at(-1)!.fish[0].exposure).toBe(1);
    pond.dispose();
  });

  it.each([
    { width: 390, coarse: false, exposure: 1 },
    { width: 820, coarse: true, exposure: 1 },
    { width: 1280, coarse: false, exposure: 0 },
  ])(
    "measures mobile-label consumers at width $width and coarse $coarse only at home",
    ({ width, coarse, exposure }) => {
      const frames: SceneFrame[] = [];
      const pond = create(
        "pond",
        width,
        true,
        (data) => frames.push(data),
        coarse,
      );
      const advance = clockFor();
      advance();
      pond.scene.children
        .flatMap((part) => part.children)
        .filter(
          (part) =>
            !part.userData.galleryDecoration &&
            part.renderOrder >= 10 &&
            (part.renderOrder < 40 || part.renderOrder >= 80),
        )
        .forEach((part) => part.scale.setScalar(0));
      advance();
      expect(
        frames.at(-1)!.fish.every((fish) => fish.exposure === exposure),
      ).toBe(true);
      pond.setNavigation(
        { page: "works", selected: "mosic", detail: null },
        0,
        true,
      );
      advance();
      expect(frames.at(-1)!.fish.every((fish) => fish.exposure === 0)).toBe(
        true,
      );
      pond.dispose();
    },
  );
});

describe("home leaf inscription", () => {
  it.each([390, 1280])("follows its leaf when parted at width %s", (width) => {
    const frames: SceneFrame[] = [];
    const pond = create("pond", width, true, (data) => frames.push(data));
    const advance = clockFor();
    advance();
    const before = frames.at(-1)!.inscription;
    expect(before).toBeDefined();
    expect(before.visible).toBe(true);
    expect(before.x).toBeGreaterThan(width * 0.3);
    expect(before.x).toBeLessThan(width * 0.7);
    expect(before.y).toBeLessThan(700 * 0.4);
    const leaf = pond.scene.getObjectByName("portfolio-inscription-leaf")!;
    const rest = leaf.position.clone();
    pond.setPointer(before.x - 18, before.y, true);
    advance(24);
    const after = frames.at(-1)!.inscription;
    const projected = leaf.position.clone().project(pond.camera);
    const original = rest.project(pond.camera);
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(
      10,
    );
    expect(after.x - before.x).toBeCloseTo(
      ((projected.x - original.x) * width) / 2,
      2,
    );
    expect(after.y - before.y).toBeCloseTo((original.y - projected.y) * 350, 2);
    pond.setNavigation(
      { page: "works", selected: "mosic", detail: null },
      0,
      true,
    );
    advance();
    expect(frames.at(-1)!.inscription.visible).toBe(false);
    pond.dispose();
  });
});

describe("one rendered gallery frame for leaf, title and hit target", () => {
  it.each([390, 1280])(
    "keeps the label anchored to the actual leaf at width %s",
    (width) => {
      const frames: SceneFrame[] = [];
      const pond = create("works", width, false, (data) => frames.push(data));
      const advance = clockFor();
      advance();
      expect(Array.isArray(frames.at(-1)?.projects)).toBe(true);
      const leaf = pond.scene.children
        .flatMap((p) => p.children)
        .find((p) => p.renderOrder === 40)!;
      const check = () => {
        const entry = frames.at(-1)!.projects.find((p) => p.id === "mosic")!;
        const expected = new THREE.Vector3(
          0,
          0,
          galleryRadius(width, 700) * (width < 640 ? 0.22 : 0.26),
        )
          .applyMatrix4(leaf.matrixWorld)
          .project(pond.camera);
        expect(entry.title.x).toBeCloseTo(((expected.x + 1) * width) / 2, 4);
        expect(entry.title.y).toBeCloseTo((1 - expected.y) * 350, 4);
        expect(entry.polygon.length).toBeGreaterThan(40);
        return entry;
      };
      const before = check();
      expect(pond.projectAt(before.title.x, before.title.y)).toBe("mosic");
      pond.setScroll(60, 200);
      // Input alone does not move one layer ahead of the last rendered scene.
      expect(
        frames.at(-1)!.projects.find((p) => p.id === "mosic")!.title,
      ).toEqual(before.title);
      advance();
      const after = check();
      expect(after.title.x - before.title.x).toBeCloseTo(-60, 3);
      expect(pond.projectAt(after.title.x, after.title.y)).toBe("mosic");
      expect(pond.projectAt(0, 0)).toBeNull();
      pond.dispose();
    },
  );
});

describe("pond flower disturbance", () => {
  it("parts a whole bloom on pointer movement and returns smoothly after leaving", () => {
    const pond = create("pond", 1280);
    const advance = clockFor();
    advance();
    const bloom = flowers(pond)[0];
    const rest = bloom.position.clone();
    const center = flowerCenter(bloom, pond);
    pond.setPointer(center.x - 12, center.y, true);
    advance(20);
    expect(bloom.position.distanceTo(rest)).toBeGreaterThan(10);
    bloom.traverse((part) =>
      expect(part.renderOrder).toBeGreaterThanOrEqual(80),
    );
    pond.setPointer(center.x, center.y, false);
    advance();
    // A spring return must not snap back on the first frame after release.
    expect(bloom.position.distanceTo(rest)).toBeGreaterThan(5);
    advance(110);
    expect(bloom.position.distanceTo(rest)).toBeLessThan(0.5);
    pond.dispose();
  });

  it("recognizes the raised bud itself, holds a touch parting, then rebounds", () => {
    const pond = create();
    const advance = clockFor();
    advance();
    const bud = flowers(pond)[3];
    const rest = bud.position.clone();
    const center = flowerCenter(bud, pond);
    // Isolate the flower hit: a tap on a blossom above open water must not
    // rely on an unrelated underlying leaf to activate the hold.
    pond.scene.children
      .flatMap((part) => part.children)
      .forEach((part) => {
        if (part.renderOrder >= 10 && part.renderOrder < 40)
          part.visible = false;
      });
    expect(pond.disturbLeafAt(center.x, center.y)).toBe(true);
    advance(22);
    expect(bud.position.distanceTo(rest)).toBeGreaterThan(10);
    advance(15);
    expect(bud.position.distanceTo(rest)).toBeGreaterThan(10);
    advance(110);
    expect(bud.position.distanceTo(rest)).toBeLessThan(0.5);
    pond.dispose();
  });

  it("leaves gallery decorations stationary while its pointer is active", () => {
    const pond = create("works");
    const advance = clockFor();
    advance();
    const decor = flowers(pond).find(
      (part) => part.userData.galleryDecoration,
    )!;
    const rest = decor.position.clone();
    const center = flowerCenter(decor, pond);
    pond.setPointer(center.x - 10, center.y, true);
    advance(30);
    expect(decor.position.distanceTo(rest)).toBe(0);
    pond.dispose();
  });

  it("retains interactive feedback without ambient sway in reduced motion", () => {
    const pond = create("pond", 390, true);
    const advance = clockFor();
    advance();
    const bloom = flowers(pond)[0];
    const rest = bloom.position.clone();
    const center = flowerCenter(bloom, pond);
    pond.setPointer(center.x - 12, center.y, true);
    advance(20);
    expect(bloom.position.distanceTo(rest)).toBeGreaterThan(5);
    expect(bloom.rotation.z).toBe(0);
    pond.dispose();
  });
});

describe("mobile scene work budget", () => {
  it("precompiles the same offscreen pass used for drawing and restores the renderer target before revealing", async () => {
    const pond = create("works");
    const advance = clockFor();
    advance();
    let resolve!: (scene: THREE.Object3D) => void;
    let compiledTarget: THREE.WebGLRenderTarget | null = null;
    const pending = new Promise<THREE.Object3D>((done) => {
      resolve = done;
    });
    vi.spyOn(pond.renderer, "compileAsync").mockImplementation(() => {
      compiledTarget = pond.renderer.getRenderTarget();
      return pending;
    });
    const [id, job] = idleJobs.entries().next().value!;
    idleJobs.delete(id);
    job();
    expect(compiledTarget).toBe(pond.dither.target);
    expect(pond.renderer.getRenderTarget()).toBeNull();
    const chime = pond.scene.getObjectByName("chime-hammer-head")!;
    let root: THREE.Object3D = chime;
    while (
      root.parent &&
      root.renderOrder === 60 &&
      root.parent.renderOrder === 60
    )
      root = root.parent;
    expect(root.visible).toBe(false);
    resolve(pond.scene);
    await pending;
    expect(root.visible).toBe(true);
    pond.dispose();
  });
  it("warms models in idle time, defers a pending warmup during travel and cancels it on disposal", () => {
    const pond = create("pond", 1280);
    const advance = clockFor();
    const runIdle = () => {
      const [id, callback] = idleJobs.entries().next().value!;
      idleJobs.delete(id);
      callback();
    };
    advance();
    expect(Boolean(pond.scene.getObjectByName("chime-hammer-head"))).toBe(
      false,
    );
    runIdle();
    expect(Boolean(pond.scene.getObjectByName("chime-hammer-head"))).toBe(true);
    pond.setNavigation(
      { page: "works", selected: "lanbridge", detail: null },
      5900,
    );
    runIdle();
    expect(Boolean(pond.scene.getObjectByName("bamboo-fixed-script"))).toBe(
      false,
    );
    advance(60);
    expect(pond.debug().travelling).toBe(false);
    expect(idleJobs.size).toBe(1);
    pond.dispose();
    expect(idleJobs.size).toBe(0);
  });
  it.each([390, 1280])(
    "keeps complete right-edge foliage in a persistent buffer at width %s",
    (width) => {
      const frames: SceneFrame[] = [];
      const pond = create("pond", width, true, (data) => frames.push(data));
      const advance = clockFor();
      advance();
      const homeLeaves = pond.scene.children
        .flatMap((p) => p.children)
        .filter(
          (p) =>
            p.renderOrder >= 10 &&
            p.renderOrder < 40 &&
            !p.userData.galleryDecoration,
        );
      const right = Math.max(
        ...homeLeaves.map((leaf) => {
          const bounds = new THREE.Box3().setFromObject(leaf);
          return bounds.max.x + width / 2;
        }),
      );
      // The authored layout is unchanged: there really are leaves past the
      // viewport. Their eventual boundary must lie beyond their whole extent.
      expect(right).toBeGreaterThan(width);
      pond.setNavigation(
        { page: "works", selected: "mosic", detail: null },
        0,
        true,
      );
      advance();
      expect(frames.at(-1)!.cameraX).toBeGreaterThan(right);
      const boundary = frames.at(-1)!.cameraX;
      pond.setNavigation(
        { page: "pond", selected: "mosic", detail: null },
        0,
        true,
      );
      advance();
      for (const leaf of homeLeaves)
        leaf.traverse((part) => {
          if (!(part instanceof THREE.Mesh)) return;
          const materials = Array.isArray(part.material)
            ? part.material
            : [part.material];
          for (const material of materials)
            for (const plane of material.clippingPlanes ?? []) {
              const bounds = new THREE.Box3().setFromObject(part);
              for (const x of [bounds.min.x, bounds.max.x])
                expect(
                  plane.distanceToPoint(new THREE.Vector3(x, 0, 0)),
                ).toBeGreaterThanOrEqual(0);
            }
        });
      // A direct-link round trip keeps the same persistent edge, not a
      // history-dependent width based on the currently visible leaf subset.
      pond.setNavigation(
        { page: "works", selected: "mosic", detail: null },
        0,
        true,
      );
      advance();
      expect(frames.at(-1)!.cameraX).toBe(boundary);
      pond.dispose();
    },
  );

  it("does not construct intricate emblems inside an animated level transition", () => {
    const pond = create("pond", 1280);
    const advance = clockFor();
    advance();
    pond.setNavigation(
      { page: "works", selected: "lanbridge", detail: null },
      5900,
    );
    // Sample the same in-flight phase after the approximately 2.8x speedup.
    advance(7);
    expect(pond.debug().travelling).toBe(true);
    expect(Boolean(pond.scene.getObjectByName("chime-hammer-head"))).toBe(
      false,
    );
    pond.dispose();
  });

  it("survives a first RAF timestamp slightly before scene initialization", () => {
    const clock = vi.spyOn(performance, "now").mockReturnValue(1000);
    try {
      const pond = create("works");
      // Browsers timestamp RAF at the start of the rendering update, not at
      // callback execution. A model initialized within it can be newer.
      expect(() => frame(990)).not.toThrow();
      pond.dispose();
    } finally {
      clock.mockRestore();
    }
  });
  it("retains geometry when only the mobile address-bar height changes", () => {
    const pond = create();
    const before = meshes(pond.scene);
    const disposed = vi.fn();
    before[0].geometry.addEventListener("dispose", disposed);
    pond.resize(390, 720);
    const after = meshes(pond.scene);
    expect(after.length).toBe(before.length);
    expect(after.every((part, i) => part === before[i])).toBe(true);
    expect(disposed).not.toHaveBeenCalled();
    expect(pond.camera.top).toBe(360);
    pond.dispose();
  });

  it("does not construct offscreen project models at home startup", () => {
    const pond = create();
    expect(Boolean(pond.scene.getObjectByName("chime-hammer-head"))).toBe(
      false,
    );
    expect(Boolean(pond.scene.getObjectByName("bamboo-fixed-script"))).toBe(
      false,
    );
    pond.dispose();
  });

  it("bounds the mobile drawing buffer without dropping dithering", () => {
    const pond = create();
    expect(pond.dither.target.width).toBe(390);
    expect(pond.dither.target.height).toBe(700);
    expect(pond.dither.material.uniforms.uPixel.value).toBe(0.9);
    pond.dispose();
  });

  it("constructs only nearby models and binds their occlusion layers before drawing", () => {
    const pond = create("works");
    frame(performance.now() + 100);
    expect(Boolean(pond.scene.getObjectByName("chime-hammer-head"))).toBe(
      false,
    );
    const [id, job] = idleJobs.entries().next().value!;
    idleJobs.delete(id);
    job();
    const chime = pond.scene.getObjectByName("chime-hammer-head");
    expect(Boolean(chime)).toBe(true);
    expect(chime?.renderOrder).toBe(60);
    expect(Boolean(pond.scene.getObjectByName("bamboo-fixed-script"))).toBe(
      false,
    );
    pond.dispose();
  });

  it("stops rendering immediately when a case opens, then resumes after closing", () => {
    const pond = create("works");
    const render = vi.spyOn(pond.renderer, "render");
    let now = performance.now() + 100;
    frame(now);
    const drawn = render.mock.calls.length;
    expect(drawn).toBeGreaterThan(0);
    pond.setNavigation(
      { page: "works", selected: "mosic", detail: "mosic" },
      0,
    );
    frame((now += 100));
    frame((now += 100));
    expect(render.mock.calls.length).toBe(drawn);
    pond.setNavigation({ page: "works", selected: "mosic", detail: null }, 0);
    frame((now += 100));
    expect(render.mock.calls.length).toBeGreaterThan(drawn);
    pond.dispose();
  });
});
