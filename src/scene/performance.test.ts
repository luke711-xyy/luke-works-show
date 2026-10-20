import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PondScene, type SceneFrame } from "./PondScene";
import { galleryRadius } from "./motion";

// Only the WebGL boundary is replaced; scene construction, resources, layout,
// navigation and the frame loop below use the real implementation.
vi.mock("three", async (original) => ({
  ...(await original<typeof THREE>()),
  WebGLRenderer: class {
    shadowMap = { enabled: false, type: 0 };
    setClearColor() {}
    setPixelRatio() {}
    setSize() {}
    setRenderTarget() {}
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

const create = (
  page: "pond" | "works" = "pond",
  width = 390,
  reduced = false,
  onFrame: (data: SceneFrame) => void = () => {},
) => {
  vi.stubGlobal("window", {
    innerWidth: width,
    innerHeight: 700,
    matchMedia: () => ({ matches: reduced }),
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
afterEach(() => vi.unstubAllGlobals());

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
