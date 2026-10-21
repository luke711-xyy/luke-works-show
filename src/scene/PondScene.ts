import * as THREE from "three";
import { projects, type ProjectId } from "../data/projects";
import type { NavigationState } from "../navigation";
import { DitherPass } from "./dither";
import { createEmblem, createFlower, createKoi, createLeaf } from "./geometry";
import type { Emblem } from "./emblems";
import { KoiWake } from "./wake";
import { SurfaceWake } from "./surface-wake";
import { createGuide, stepGuide, type GuideLeaf } from "./guide";
import { POND_DEPTH_SCALE, setPondLayer } from "./depth";
import { Journey } from "./journey";
import { PondSeam } from "./seam";
import {
  estimateFishBodyExposure,
  type ExposureBounds,
  type FishOccluder,
} from "./fish-exposure";
import {
  activeTapDisturbance,
  createTapDisturbance,
  isVisiblePondLeafHit,
  pondLeafRadius,
  type TapDisturbance,
} from "./input";
import {
  angleDelta,
  clamp,
  createPatrol,
  distance,
  galleryCenter,
  galleryRadius,
  galleryStride,
  homePoints,
  lerp,
  pointInPolygon,
  smooth,
  spring,
  stepPatrol,
  type Patrol,
  type Vec2,
} from "./motion";

const ELEVATION = 0.91,
  SIN = Math.sin(ELEVATION),
  COS = Math.cos(ELEVATION);
type Leaf = ReturnType<typeof createLeaf> & {
  base: Vec2;
  radius: number;
  elevation: number;
  offset: Vec2;
  velocity: Vec2;
  phase: number;
  project?: ProjectId;
  polygon: Vec2[];
  occluder: { bounds: ExposureBounds; polygon: Vec2[] };
  rotation: number;
};
type Fish = ReturnType<typeof createKoi> & {
  id: ProjectId;
  patrol: Patrol;
  screen: Vec2;
  angle: number;
  scale: number;
  exposure: number;
};
type Flower = {
  object: THREE.Group;
  base: Vec2;
  phase: number;
  radius: number;
  center: Vec2;
  reach: Vec2;
  offset: Vec2;
  velocity: Vec2;
  headContour: THREE.Vector3[];
  occluder: {
    bounds: ExposureBounds;
    polygon: Vec2[];
  };
};
export type SceneFrame = {
  inscription: Vec2 & { visible: boolean; radius: number; angle: number };
  projects: {
    id: ProjectId;
    polygon: Vec2[];
    bounds: { x: number; y: number; width: number; height: number };
    title: Vec2;
    radius: number;
    scale: number;
  }[];
  fish: {
    id: ProjectId;
    x: number;
    y: number;
    visible: boolean;
    angle: number;
    exposure: number;
  }[];
  hovered: ProjectId | null;
  progress: number;
  cameraX: number;
  galleryOrigin: number;
  scroll: number;
  travelling: boolean;
  fps: number;
  guide: "weave";
  ready: boolean;
};
type Callbacks = {
  frame: (data: SceneFrame) => void;
  pick: (id: ProjectId) => void;
  error: () => void;
};

function flowerHeadContour(object: THREE.Group) {
  const vertices: THREE.Vector3[] = [];
  object.updateMatrixWorld(true);
  object.traverse((part) => {
    if (!(part instanceof THREE.Mesh)) return;
    // createFlower uses cylinders/tubes only for its thin stems. Select by
    // geometry semantics, not child order; petals, sepals and pod stay included.
    if (["CylinderGeometry", "TubeGeometry"].includes(part.geometry.type))
      return;
    const position = part.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++)
      vertices.push(
        new THREE.Vector3()
          .fromBufferAttribute(position, i)
          .applyMatrix4(part.matrixWorld),
      );
  });
  const screenY = (point: THREE.Vector3) => point.z * SIN - point.y * COS;
  vertices.sort((a, b) => a.x - b.x || screenY(a) - screenY(b));
  const cross = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) =>
    (b.x - a.x) * (screenY(c) - screenY(a)) -
    (screenY(b) - screenY(a)) * (c.x - a.x);
  const hull: THREE.Vector3[] = [];
  for (const vertex of vertices) {
    while (
      hull.length >= 2 &&
      cross(hull[hull.length - 2], hull[hull.length - 1], vertex) <= 0
    )
      hull.pop();
    hull.push(vertex);
  }
  const lowerLength = hull.length;
  for (let i = vertices.length - 2; i >= 0; i--) {
    const vertex = vertices[i];
    while (
      hull.length > lowerLength &&
      cross(hull[hull.length - 2], hull[hull.length - 1], vertex) <= 0
    )
      hull.pop();
    hull.push(vertex);
  }
  hull.pop();
  return hull;
}

function disposeObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      geometries.add(child.geometry);
      (Array.isArray(child.material)
        ? child.material
        : [child.material]
      ).forEach((m) => materials.add(m));
      if (child.customDepthMaterial) materials.add(child.customDepthMaterial);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

export class PondScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera();
  readonly dither = new DitherPass();
  private sunlight = new THREE.DirectionalLight("#fffdf8", 2.2);
  private root = new THREE.Group();
  private wake = new KoiWake(64, SIN);
  private contactWater = new SurfaceWake(20, SIN);
  private wakeView = 0;
  private leaves: Leaf[] = [];
  private galleryLeaves: Leaf[] = [];
  private flowers: Flower[] = [];
  private fish: Fish[] = [];
  private labelMedia = window.matchMedia("(hover: none), (pointer: coarse)");
  private exposureOccluders: FishOccluder[] = [];
  private exposurePoint = new THREE.Vector3();
  private exposureFish = { x: 0, y: 0, length: 1, angle: 0, scale: 1 };
  private exposureViewport = { width: 1, height: 1 };
  private emblems: {
    object: THREE.Group;
    id: ProjectId;
    animate: Emblem["animate"];
  }[] = [];
  private warmJob: number | null = null;
  private warmIdle = false;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private seed = 711;
  private pointer = { x: -1000, y: -1000, active: false };
  private tapDisturbance: TapDisturbance | null = null;
  private focused: ProjectId | null = null;
  private selected: ProjectId = "mosic";
  private detail = false;
  private hovered: ProjectId | null = null;
  private hoverProject: ProjectId | null = null;
  private projectRay = new THREE.Raycaster();
  private projectPoint = new THREE.Vector2();
  private scroll = 0;
  private scrollVelocity = 0;
  private progress = 0;
  private started = performance.now();
  private previous = this.started;
  private lastFrame = 0;
  private raf = 0;
  private disposed = false;
  private time = 0;
  private fps = 60;
  private fpsTime = 0;
  private frames = 0;
  private pressure = 0;
  private pacing = 60;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  private journey = new Journey(1, this.reduced);
  private seam = new PondSeam();
  private guideLeaves: GuideLeaf[] = [];
  private guide = createGuide(1, 1, 0, []);
  constructor(
    private canvas: HTMLCanvasElement,
    private callbacks: Callbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0, 0);
    this.renderer.autoClear = false;
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.camera.near = 0.1;
    this.camera.far = 7000;
    this.camera.position.set(0, 2600 * SIN, 2600 * COS);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight("#f6f5f1", "#414141", 1.5));
    const sunlight = this.sunlight;
    sunlight.position.set(-700, 1300, 800);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    sunlight.shadow.normalBias = 1.2;
    sunlight.shadow.bias = -0.0004 * POND_DEPTH_SCALE;
    this.scene.add(sunlight);
    this.scene.add(this.root);
    const debugSeed = Number(new URLSearchParams(location.search).get("seed"));
    if (debugSeed) this.seed = debugSeed;
    this.resize(window.innerWidth, window.innerHeight);
    this.raf = requestAnimationFrame(this.tick);
  }

  resize(width: number, height: number) {
    if (this.w === width && this.h === height) return;
    const previousHeight = this.h;
    const relayoutOnly =
      this.w === width &&
      width < 640 &&
      Math.min(previousHeight, height) > width * 1.25;
    const destinationScroll =
      (this.journey.destinationScroll / galleryStride(this.w)) *
      galleryStride(width);
    this.w = width;
    this.h = height;
    this.exposureViewport.width = width;
    this.exposureViewport.height = height;
    this.dpr = Math.min(devicePixelRatio || 1, width < 640 ? 1 : 1.5);
    this.pacing = width < 640 ? 30 : 60;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(width, height, false);
    this.dither.resize(width, height, this.dpr);
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    // Hit contours are projected before the renderer's first camera update.
    this.camera.updateMatrixWorld(true);
    const shadowCamera = this.sunlight.shadow.camera,
      bound = Math.max(width, height) * 0.85;
    shadowCamera.left = -bound;
    shadowCamera.right = bound;
    shadowCamera.top = bound;
    shadowCamera.bottom = -bound;
    shadowCamera.near = 100;
    shadowCamera.far = 4000;
    shadowCamera.updateProjectionMatrix();
    if (relayoutOnly) {
      this.journey.resize(width, destinationScroll, this.journey.origin);
      this.scroll = this.journey.scroll;
      // Mobile browser chrome changes height during a gesture. Reuse every
      // geometry/material/shader, and move the existing layout instead.
      const scale = height / previousHeight;
      for (const leaf of [...this.leaves, ...this.galleryLeaves])
        leaf.base.y *= scale;
      for (const flower of this.flowers) flower.base.y *= scale;
      for (const fish of this.fish) {
        fish.patrol.y *= scale;
        fish.patrol.home.y *= scale;
        fish.patrol.ry *= scale;
        for (const point of fish.patrol.controls) point.y *= scale;
      }
      for (const leaf of this.guideLeaves) leaf.y *= scale;
      this.guide.y *= scale;
      this.wake.reset();
      this.contactWater.reset();
      return;
    }
    this.root.remove(this.wake.group);
    this.root.remove(this.contactWater.group);
    this.wake.reset();
    this.contactWater.reset();
    this.wakeView = 0;
    this.tapDisturbance = null;
    disposeObject(this.root);
    this.root.clear();
    this.leaves = [];
    this.galleryLeaves = [];
    this.flowers = [];
    this.fish = [];
    this.emblems = [];
    this.build();
    // Keep the existing viewport composition. Only the unseen world extends:
    // include each complete leaf plus its maximum spring/rotation envelope.
    const origin = Math.ceil(
      Math.max(
        width,
        ...this.leaves
          .filter((leaf) => !leaf.group.userData.galleryDecoration)
          .map(
            (leaf) =>
              leaf.base.x +
              Math.max(
                ...leaf.contour.map(
                  (point) =>
                    point.x * Math.cos(leaf.rotation) +
                    point.z * Math.sin(leaf.rotation),
                ),
              ) +
              leaf.radius * 2 +
              24,
          ),
      ),
    );
    this.journey.resize(width, destinationScroll, origin);
    this.scroll = this.journey.scroll;
    this.root.add(this.wake.group);
    this.root.add(this.contactWater.group);
    setPondLayer(this.wake.group, 1);
    setPondLayer(this.contactWater.group, 2);
    this.seam.bind(this.contactWater.group, "pond");
    this.fish.forEach((fish) => setPondLayer(fish.group, 0));
    this.leaves
      .filter((leaf) => !leaf.group.userData.galleryDecoration)
      .sort((a, b) => a.elevation - b.elevation || a.base.y - b.base.y)
      .forEach((leaf, i) => setPondLayer(leaf.group, 10 + i));
    this.leaves
      .filter((leaf) => leaf.group.userData.galleryDecoration)
      .forEach((leaf, i) => setPondLayer(leaf.group, 10 + i));
    this.galleryLeaves.forEach((leaf, i) => setPondLayer(leaf.group, 40 + i));
    this.emblems.forEach((emblem, i) => setPondLayer(emblem.object, 60 + i));
    this.flowers.forEach((flower, i) => setPondLayer(flower.object, 80 + i));
    this.leaves.forEach((leaf) =>
      this.seam.bind(
        leaf.group,
        leaf.group.userData.galleryDecoration ? "works" : "pond",
      ),
    );
    this.galleryLeaves.forEach((leaf) => this.seam.bind(leaf.group, "works"));
    this.flowers.forEach((flower) =>
      this.seam.bind(
        flower.object,
        flower.object.userData.galleryDecoration ? "works" : "pond",
      ),
    );
    this.fish.forEach((fish) =>
      this.seam.bind(fish.group, fish.id === this.selected ? null : "pond"),
    );
    this.guideLeaves = this.galleryLeaves.map((leaf) => ({
      ...leaf.base,
      rx: leaf.radius,
      ry: leaf.radius * SIN,
    }));
    this.guide = createGuide(width, height, this.scroll, this.guideLeaves);
  }

  private addLeaf(
    base: Vec2,
    radius: number,
    seed: number,
    tone: string,
    elevation: number,
    project?: ProjectId,
  ) {
    const object = createLeaf(
      radius,
      seed,
      tone,
      true,
      this.w < 640 ? "compact" : "full",
    );
    const leaf: Leaf = {
      ...object,
      base,
      radius,
      elevation,
      project,
      offset: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      phase: seed * 0.47,
      polygon: [],
      occluder: {
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        polygon: [],
      },
      rotation: Math.sin(seed * 1.7) * 0.35,
    };
    leaf.rotation = Math.sin(seed * 2.13) * 2.6;
    leaf.group.rotation.y = leaf.rotation;
    this.root.add(leaf.group);
    (project ? this.galleryLeaves : this.leaves).push(leaf);
    return leaf;
  }

  private build() {
    const w = this.w,
      h = this.h,
      mobile = w < 640;
    const tones = [
      "#434343",
      "#838383",
      "#5c5e5b",
      "#9b9c98",
      "#333535",
      "#70716e",
    ];
    const desktop = [
      [-0.03, 0.02, 0.18],
      [0.21, -0.01, 0.17],
      [0.46, 0.02, 0.19],
      [0.72, -0.02, 0.18],
      [0.97, 0.07, 0.18],
      [0.05, 0.25, 0.15],
      [0.29, 0.24, 0.16],
      [0.55, 0.26, 0.16],
      [0.83, 0.25, 0.16],
      [1.06, 0.33, 0.16],
      [-0.03, 0.51, 0.17],
      [0.23, 0.49, 0.17],
      [0.48, 0.49, 0.13],
      [0.72, 0.5, 0.16],
      [0.96, 0.55, 0.18],
      [0.04, 0.77, 0.17],
      [0.32, 0.76, 0.17],
      [0.58, 0.72, 0.125],
      [0.84, 0.83, 0.19],
      [-0.02, 1.02, 0.18],
      [0.24, 1.04, 0.17],
      [0.51, 1.22, 0.19],
      [0.78, 1.08, 0.18],
      [1.04, 1.02, 0.19],
    ];
    // Authored clusters, not jittered rows: unequal gaps and small companion
    // leaves break the three vertical bands while preserving the same budget.
    // Index 7 remains the upper-center inscription leaf; edge foliage still
    // exists beyond the viewport for the continuous transition to the works.
    const arrangement = mobile
      ? [
          [-0.1, -0.03, 0.29],
          [0.29, -0.07, 0.25],
          [0.86, 0.02, 0.3],
          [0.08, 0.16, 0.24],
          [0.74, 0.135, 0.2],
          [1.04, 0.24, 0.275],
          [-0.15, 0.38, 0.255],
          [0.53, 0.286, 0.3],
          [0.23, 0.375, 0.17],
          [0.96, 0.44, 0.3],
          [0.63, 0.43, 0.24],
          [0.07, 0.535, 0.28],
          [0.45, 0.565, 0.16],
          [1.14, 0.65, 0.29],
          [0.78, 0.62, 0.25],
          [0.34, 0.74, 0.27],
          [-0.06, 0.82, 0.24],
          [0.94, 0.85, 0.28],
          [-0.18, 0.99, 0.26],
          [0.64, 1.12, 0.22],
          [1.12, 0.975, 0.23],
          [0.2, 1.06, 0.29],
          [0.47, 1.24, 0.18],
          [0.98, 1.17, 0.26],
        ]
      : desktop;
    arrangement.forEach(([x, y, r], i) =>
      this.addLeaf(
        {
          x: (x + Math.sin(i * 2.4) * 0.035) * w,
          y: (y + Math.sin(i * 1.6) * 0.04) * h,
        },
        pondLeafRadius(w, h, r),
        i + 12,
        tones[(i * 7 + 2) % tones.length],
        8 + (i % 4) * 8,
      ),
    );
    this.leaves[7].group.name = "portfolio-inscription-leaf";
    const bloomLocations = mobile
      ? [
          [0.19, 0.22, 0.14],
          [0.84, 0.63, 0.115],
          [0.13, 0.94, 0.1],
        ]
      : [
          [0.14, 0.23, 0.06],
          [0.85, 0.65, 0.048],
          [0.38, 0.91, 0.043],
        ];
    bloomLocations.forEach(([x, y, r], i) =>
      this.addFlower({ x: x * w, y: y * h }, w * r, i * 0.5 + 2, i * 2),
    );
    const budLocations = mobile
      ? [[0.88, 0.42, 0.052]]
      : [
          [0.075, 0.63, 0.022],
          [0.925, 0.31, 0.019],
        ];
    budLocations.forEach(([x, y, r], i) =>
      this.addFlower({ x: x * w, y: y * h }, w * r, i + 7, i + 1, "bud"),
    );
    homePoints(w, h).forEach((home, i) => {
      const length = clamp(w * 0.071, 51, 112),
        object = createKoi(length, this.seed + i * 193);
      this.root.add(object.group);
      this.fish.push({
        ...object,
        id: projects[i].id,
        patrol: createPatrol(
          home,
          Math.min(w * 0.07, 92),
          Math.min(h * 0.075, 66),
          this.seed + i * 307,
        ),
        screen: home,
        angle: 0,
        scale: 1,
        exposure: 0,
      });
    });
    const radius = galleryRadius(w, h);
    const galleryTones = [
      "#333535",
      "#92938f",
      "#434343",
      "#93948f",
      "#92948e",
      "#9b9c98",
      "#333535",
      "#969891",
    ];
    projects.forEach((project, i) => {
      const base = galleryCenter(i, w, h),
        leaf = this.addLeaf(
          base,
          radius * (i % 3 === 1 ? 0.92 : 1),
          i + 88,
          galleryTones[i],
          18 + (i % 3) * 5,
          project.id,
        );
      leaf.rotation = Math.sin(i * 1.7) * 0.16;
      leaf.group.rotation.y = leaf.rotation;
      const little = this.addLeaf(
        { x: base.x - radius * 0.75, y: h * 0.9 + Math.sin(i) * h * 0.03 },
        radius * 0.35,
        i + 220,
        tones[i % tones.length],
        6,
      );
      little.group.userData.galleryDecoration = true;
      if (i % 3 === 0) {
        this.addFlower(
          { x: base.x - radius * 0.78, y: h * 0.72 },
          radius * 0.19,
          i,
          i,
          "open",
          true,
        );
      }
    });
  }

  private addFlower(
    base: Vec2,
    radius: number,
    seed: number,
    phase: number,
    stage: "open" | "bud" = "open",
    decoration = false,
  ) {
    const object = createFlower(radius, seed, stage);
    object.userData.galleryDecoration = decoration;
    const headContour = decoration ? [] : flowerHeadContour(object);
    // Cache the projected extent once, not per frame. A raised bud is well
    // above its root anchor; its visible head must receive touch/hover too.
    const bounds = new THREE.Box3().setFromObject(object);
    let top = Infinity,
      bottom = -Infinity;
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        const projectedY = z * SIN - y * COS;
        top = Math.min(top, projectedY);
        bottom = Math.max(bottom, projectedY);
      }
    this.root.add(object);
    this.flowers.push({
      object,
      base,
      radius,
      phase,
      center: { x: (bounds.min.x + bounds.max.x) / 2, y: (top + bottom) / 2 },
      reach: {
        x: Math.max(radius * 0.65, (bounds.max.x - bounds.min.x) / 2),
        y: Math.max(radius * 0.5, (bottom - top) / 2),
      },
      offset: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      headContour,
      occluder: {
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        polygon: headContour.map(() => ({ x: 0, y: 0 })),
      },
    });
  }

  private buildEmblem(index: number) {
    const leaf = this.galleryLeaves[index];
    if (!leaf || this.emblems.some((emblem) => emblem.id === leaf.project))
      return;
    const radius = galleryRadius(this.w, this.h);
    const emblem = createEmblem(leaf.project!, radius * 0.49);
    emblem.group.position.set(0, 9, -radius * 0.13);
    setPondLayer(emblem.group, 60 + index);
    this.seam.bind(emblem.group, "works");
    leaf.group.add(emblem.group);
    this.emblems.push({
      object: emblem.group,
      id: leaf.project!,
      animate: emblem.animate,
    });
    // compileAsync traverses this object even when its parent is offscreen.
    // Use the real scene's lights, without painting it into the current pond.
    if (this.renderer.compileAsync) {
      emblem.group.visible = false;
      const reveal = () => {
        if (!this.disposed) emblem.group.visible = true;
      };
      const target = this.renderer.getRenderTarget();
      try {
        // Shader cache keys include the render target's output color space.
        // Match the linear offscreen pass, not the final sRGB framebuffer.
        this.renderer.setRenderTarget(this.dither.target);
        void this.renderer
          .compileAsync(emblem.group, this.camera, this.scene)
          .then(reveal, reveal);
      } finally {
        this.renderer.setRenderTarget(target);
      }
    }
  }

  private queueWarmup() {
    if (
      this.warmJob !== null ||
      this.disposed ||
      this.detail ||
      this.journey.moving ||
      this.emblems.length === this.galleryLeaves.length
    )
      return;
    const work = () => {
      this.warmJob = null;
      if (this.disposed || this.detail || this.journey.moving) return;
      const missing = this.galleryLeaves
        .map((leaf, index) => ({ leaf, index }))
        .filter(
          ({ leaf }) =>
            !this.emblems.some((emblem) => emblem.id === leaf.project),
        )
        .sort(
          (a, b) =>
            Math.abs(
              this.journey.origin + a.leaf.base.x - this.journey.x - this.w / 2,
            ) -
            Math.abs(
              this.journey.origin + b.leaf.base.x - this.journey.x - this.w / 2,
            ),
        );
      const next =
        missing.find(({ leaf }) => leaf.project === this.selected) ??
        missing[0];
      if (next) this.buildEmblem(next.index);
      this.queueWarmup();
    };
    this.warmIdle = typeof window.requestIdleCallback === "function";
    this.warmJob = this.warmIdle
      ? window.requestIdleCallback(work, { timeout: 1000 })
      : window.setTimeout(work, 120);
  }

  setNavigation(
    state: NavigationState,
    destinationScroll: number,
    immediate = false,
  ) {
    const entering = state.page === "works" && this.progress < 0.05;
    const changedFish = this.selected !== state.selected;
    this.selected = state.selected;
    this.detail = Boolean(state.detail);
    if (state.page !== "pond") this.contactWater.input(0, 0, false, 0);
    if (this.detail) this.contactWater.reset();
    if (state.page !== "pond") this.tapDisturbance = null;
    this.focused = null;
    this.hovered = null;
    this.journey.go(state.page, destinationScroll, immediate);
    this.progress = this.journey.progress;
    this.scroll = this.journey.scroll;
    if (changedFish)
      this.fish.forEach((fish) =>
        this.seam.bind(fish.group, fish.id === this.selected ? null : "pond"),
      );
    if (state.page === "works" && (immediate || entering)) {
      this.guide = createGuide(this.w, this.h, this.scroll, this.guideLeaves);
    }
  }
  setScroll(left: number, velocity = 0) {
    if (this.journey.moving || this.progress < 1) return;
    this.journey.setScroll(left);
    this.scroll = Math.max(0, left);
    this.scrollVelocity = velocity;
  }
  setPointer(x: number, y: number, active: boolean) {
    if (active) this.tapDisturbance = null;
    this.pointer = { x, y, active };
    this.contactWater.input(
      x + this.journey.x,
      y,
      active && !this.detail && !this.journey.moving && this.progress < 0.08,
      performance.now() / 1000,
    );
    return (
      active && !this.detail && this.progress < 0.7 && this.partingAt(x, y)
    );
  }
  private partingAt(x: number, y: number) {
    const worldX = x + this.journey.x;
    // Match the spring footprint after leaves have already exposed the water.
    return (
      this.leaves.some(
        (leaf) =>
          leaf.group.visible &&
          !leaf.group.userData.galleryDecoration &&
          Math.hypot(
            (leaf.base.x - worldX) / leaf.radius,
            (leaf.base.y - y) / (leaf.radius * SIN),
          ) < 1.65,
      ) ||
      this.flowers.some(
        (flower) =>
          flower.object.visible &&
          !flower.object.userData.galleryDecoration &&
          Math.hypot(
            (flower.base.x + flower.center.x - worldX) / flower.reach.x,
            (flower.base.y + flower.center.y - y) / flower.reach.y,
          ) < 1.65,
      )
    );
  }
  private plantAt(x: number, y: number) {
    return (
      isVisiblePondLeafHit(
        { x, y },
        this.leaves.map((leaf) => ({
          polygon: leaf.polygon,
          visible: leaf.group.visible,
          decoration: Boolean(leaf.group.userData.galleryDecoration),
        })),
      ) ||
      this.flowers.some(
        (flower) =>
          flower.object.visible &&
          !flower.object.userData.galleryDecoration &&
          Math.hypot(
            (x -
              flower.base.x -
              flower.offset.x -
              flower.center.x +
              this.journey.x) /
              flower.reach.x,
            (y - flower.base.y - flower.offset.y - flower.center.y) /
              flower.reach.y,
          ) <= 1.1,
      )
    );
  }
  disturbLeafAt(x: number, y: number) {
    if (
      this.w >= 640 ||
      this.detail ||
      this.progress > 0.08 ||
      !this.plantAt(x, y)
    )
      return false;
    this.tapDisturbance = createTapDisturbance({ x, y }, this.time);
    return true;
  }
  setHoveredProject(id: ProjectId | null) {
    this.hoverProject = id;
  }
  focusKoi(id: ProjectId | null) {
    this.focused = id;
  }
  selectAt(x: number, y: number) {
    const id = this.hitFish({ x, y });
    if (id && this.progress < 0.08) this.callbacks.pick(id);
  }

  private put(object: THREE.Object3D, x: number, y: number, elevation: number) {
    object.position.set(
      x - this.w / 2,
      elevation,
      (y - this.h / 2 + COS * elevation) / SIN,
    );
  }
  private project(v: THREE.Vector3): Vec2 {
    const p = v.clone().project(this.camera);
    return { x: ((p.x + 1) * this.w) / 2, y: ((1 - p.y) * this.h) / 2 };
  }
  private outline(leaf: Leaf) {
    return leaf.contour.map((v) =>
      this.project(v.clone().applyMatrix4(leaf.group.matrixWorld)),
    );
  }
  private updateFishExposure() {
    // Labels consume this only on the home pond's compact/touch layout. Never
    // spend polygon-sampling work in the gallery or on hover-only desktops.
    if (
      this.detail ||
      this.progress >= 0.08 ||
      !(this.w < 640 || this.labelMedia.matches)
    ) {
      for (const fish of this.fish) fish.exposure = 0;
      return;
    }
    const occluders = this.exposureOccluders;
    occluders.length = 0;
    for (const leaf of this.leaves) {
      if (!leaf.group.visible || leaf.group.userData.galleryDecoration)
        continue;
      const occluder = leaf.occluder,
        bounds = occluder.bounds;
      occluder.polygon = leaf.polygon;
      bounds.minX = bounds.minY = Infinity;
      bounds.maxX = bounds.maxY = -Infinity;
      for (const point of leaf.polygon) {
        bounds.minX = Math.min(bounds.minX, point.x);
        bounds.minY = Math.min(bounds.minY, point.y);
        bounds.maxX = Math.max(bounds.maxX, point.x);
        bounds.maxY = Math.max(bounds.maxY, point.y);
      }
      occluders.push(occluder);
    }
    for (const flower of this.flowers) {
      if (!flower.object.visible || flower.object.userData.galleryDecoration)
        continue;
      const occluder = flower.occluder,
        bounds = occluder.bounds;
      bounds.minX = bounds.minY = Infinity;
      bounds.maxX = bounds.maxY = -Infinity;
      // Project only the cached head hull, never the whole 3D bounds (which
      // include opaque-looking empty space between the thin stem and petals).
      for (let i = 0; i < flower.headContour.length; i++) {
        const point = this.exposurePoint
          .copy(flower.headContour[i])
          .applyMatrix4(flower.object.matrixWorld)
          .project(this.camera);
        const x = ((point.x + 1) * this.w) / 2,
          y = ((1 - point.y) * this.h) / 2;
        occluder.polygon[i].x = x;
        occluder.polygon[i].y = y;
        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.maxY = Math.max(bounds.maxY, y);
      }
      occluders.push(occluder);
    }
    const body = this.exposureFish;
    for (const fish of this.fish) {
      body.x = fish.screen.x;
      body.y = fish.screen.y;
      body.length = fish.length;
      body.angle = fish.angle;
      body.scale = fish.scale;
      fish.exposure = fish.group.visible
        ? estimateFishBodyExposure(body, occluders, this.exposureViewport)
        : 0;
    }
  }
  getProjectOutline(id: ProjectId) {
    const leaf = this.galleryLeaves.find((l) => l.project === id);
    if (!leaf || leaf.polygon.length < 3) return "circle(0% at 50% 50%)";
    return `polygon(${leaf.polygon.map((p) => `${((p.x / this.w) * 100).toFixed(2)}% ${((p.y / this.h) * 100).toFixed(2)}%`).join(",")})`;
  }

  projectAt(x: number, y: number): ProjectId | null {
    if (this.detail || this.progress < 0.7 || this.journey.moving) return null;
    const leaf = this.galleryLeaves.find(
      (leaf) => leaf.group.visible && pointInPolygon({ x, y }, leaf.polygon),
    );
    if (leaf) return leaf.project!;
    // A raised icon can extend beyond a curled leaf's silhouette. It belongs
    // to the same project, not to the non-interactive background canvas.
    this.projectRay.setFromCamera(
      this.projectPoint.set((x / this.w) * 2 - 1, 1 - (y / this.h) * 2),
      this.camera,
    );
    for (const emblem of this.emblems)
      if (
        emblem.object.parent?.visible &&
        this.projectRay.intersectObject(emblem.object, true).length
      )
        return emblem.id;
    return null;
  }

  private hitFish(point: Vec2): ProjectId | null {
    if (this.detail || this.progress > 0.08) return null;
    if (this.leaves.some((leaf) => pointInPolygon(point, leaf.polygon)))
      return null;
    const candidates = this.fish.filter((f) => {
      const dx = point.x - f.screen.x,
        dy = point.y - f.screen.y,
        a = f.patrol.angle;
      const along = dx * Math.cos(a) + dy * Math.sin(a),
        across = -dx * Math.sin(a) + dy * Math.cos(a);
      return (
        (along / (f.length * 0.66)) ** 2 + (across / (f.length * 0.22)) ** 2 < 1
      );
    });
    return candidates[0]?.id ?? null;
  }

  private updateGuide(dt: number) {
    stepGuide(
      this.guide,
      dt,
      this.w,
      this.h,
      this.scroll,
      this.scrollVelocity,
      this.guideLeaves,
      this.reduced,
    );
  }

  private tick = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    if (document.hidden) return;
    if (this.detail && this.lastFrame > 0) return;
    if (now - this.lastFrame < 1000 / this.pacing - 1) return;
    const dt = clamp((now - this.previous) / 1000, 0.001, 0.05);
    this.previous = now;
    this.lastFrame = now;
    // RAF can be timestamped just before this scene was constructed within the
    // same rendering update. Do not pass negative time to cyclic model poses.
    this.time = Math.max(0, (now - this.started) / 1000);
    const wasTravelling = this.journey.moving;
    const previousScroll = this.scroll;
    this.journey.step(dt);
    this.progress = this.journey.progress;
    this.scroll = this.journey.scroll;
    const shift = this.journey.x;
    this.seam.update(this.w, shift, this.journey.origin);
    if (wasTravelling) {
      this.scrollVelocity = (this.scroll - previousScroll) / dt;
      // During the authored pan, keep the same koi in view. Normal manual
      // scrolling retains the existing gentle lead/lag transport.
      this.guide.x += (this.scroll - this.guide.scroll) * 0.15;
    }
    if (!this.journey.moving && wasTravelling) this.scrollVelocity = 0;
    if (!this.detail) {
      this.fish.forEach((f) => {
        if (!this.reduced)
          stepPatrol(
            f.patrol,
            dt,
            this.fish.filter((o) => o !== f).map((o) => o.patrol),
            f.length * 0.8,
          );
      });
      if (this.progress > 0.05) this.updateGuide(dt);
    }
    const focus = this.fish.find((f) => f.id === this.focused);
    const tapPoint = activeTapDisturbance(this.tapDisturbance, this.time);
    if (this.tapDisturbance && !tapPoint) this.tapDisturbance = null;
    const pointer = focus
      ? { ...focus.patrol, active: true }
      : tapPoint && !this.detail
        ? { x: tapPoint.x + shift, y: tapPoint.y, active: true }
        : {
            x: this.pointer.x + shift,
            y: this.pointer.y,
            active: this.pointer.active && !this.detail,
          };
    for (const leaf of this.leaves) {
      const isDecoration = Boolean(leaf.group.userData.galleryDecoration);
      const x = leaf.base.x + (isDecoration ? this.journey.origin : 0),
        dx = x - pointer.x,
        dy = leaf.base.y - pointer.y;
      const dist = Math.hypot(dx / leaf.radius, dy / (leaf.radius * SIN)),
        strength =
          !isDecoration && pointer.active && this.progress < 0.7
            ? Math.max(0, 1.65 - dist)
            : 0;
      const len = Math.hypot(dx, dy) || 1,
        push = leaf.radius * (focus ? 0.95 : 0.58) * strength;
      const sx = spring(leaf.offset.x, leaf.velocity.x, (dx / len) * push, dt),
        sy = spring(leaf.offset.y, leaf.velocity.y, (dy / len) * push, dt);
      leaf.offset = { x: sx.value, y: sy.value };
      leaf.velocity = { x: sx.velocity, y: sy.velocity };
      this.put(
        leaf.group,
        x + leaf.offset.x - shift,
        leaf.base.y + leaf.offset.y,
        leaf.elevation,
      );
      leaf.group.rotation.y =
        leaf.rotation + (leaf.offset.x / leaf.radius) * 0.09;
      leaf.group.rotation.z = this.reduced
        ? 0
        : Math.sin(this.time * 0.23 + leaf.phase) * 0.008;
      leaf.group.visible =
        x + leaf.offset.x - shift > -leaf.radius * 1.4 &&
        x + leaf.offset.x - shift < this.w + leaf.radius * 1.4;
    }
    for (const leaf of this.galleryLeaves) {
      const x = this.journey.origin + leaf.base.x - shift;
      this.put(leaf.group, x, leaf.base.y, leaf.elevation);
      const targetScale = this.hoverProject === leaf.project ? 1.022 : 1;
      leaf.group.scale.setScalar(lerp(leaf.group.scale.x, targetScale, dt * 5));
      leaf.group.visible =
        x > -leaf.radius * 1.2 && x < this.w + leaf.radius * 1.2;
    }
    for (const flower of this.flowers) {
      const decor = Boolean(flower.object.userData.galleryDecoration);
      const x = flower.base.x + (decor ? this.journey.origin : 0);
      const dx = x + flower.center.x - pointer.x;
      const dy = flower.base.y + flower.center.y - pointer.y;
      const dist = Math.hypot(dx / flower.reach.x, dy / flower.reach.y);
      const strength =
        !decor && pointer.active && this.progress < 0.7
          ? Math.max(0, 1.65 - dist)
          : 0;
      const len = Math.hypot(dx, dy);
      const push =
        flower.radius *
        (focus ? 0.95 : 0.58) *
        strength *
        (this.reduced ? 0.5 : 1);
      // Give a centered tap a stable escape direction rather than zero force.
      const sx = spring(
        flower.offset.x,
        flower.velocity.x,
        (len > 0.5 ? dx / len : Math.cos(flower.phase + 0.7)) * push,
        dt,
      );
      const sy = spring(
        flower.offset.y,
        flower.velocity.y,
        (len > 0.5 ? dy / len : Math.sin(flower.phase + 0.7)) * push,
        dt,
      );
      flower.offset = { x: sx.value, y: sy.value };
      flower.velocity = { x: sx.velocity, y: sy.velocity };
      const screenX = x + flower.offset.x - shift;
      this.put(flower.object, screenX, flower.base.y + flower.offset.y, 24);
      flower.object.rotation.z = this.reduced
        ? 0
        : Math.sin(this.time * 0.3 + flower.phase) * 0.012;
      flower.object.visible = screenX > -150 && screenX < this.w + 150;
    }
    this.emblems.forEach((e) => {
      if (e.object.parent?.visible) e.animate(this.time, this.reduced);
    });
    this.fish.forEach((f) => {
      let x = f.patrol.x,
        y = f.patrol.y,
        heading = f.patrol.angle,
        turnRate = f.patrol.turnRate;
      if (f.id === this.selected && this.progress > 0) {
        x = lerp(x, this.journey.origin + this.guide.x, smooth(this.progress));
        y =
          lerp(y, this.guide.y, smooth(clamp(this.progress * 1.25, 0, 1))) -
          Math.sin(Math.PI * this.progress) * this.h * 0.055;
        heading +=
          angleDelta(heading, this.guide.angle) * smooth(this.progress);
        turnRate = lerp(turnRate, this.guide.turnRate, smooth(this.progress));
      }
      x -= shift;
      this.put(f.group, x, y, -8);
      f.screen = { x, y };
      f.angle = heading;
      f.group.rotation.y = -Math.atan2(
        Math.sin(heading) / SIN,
        Math.cos(heading),
      );
      const targetScale =
        this.hovered === f.id || this.focused === f.id ? 1.1 : 1;
      f.scale = lerp(f.scale, targetScale, dt * 8);
      f.group.scale.setScalar(f.scale);
      f.group.visible =
        x > -f.length &&
        x < this.w + f.length &&
        (this.progress < 0.999 || f.id === this.selected);
      if (!this.detail && f.group.visible)
        f.animate(
          this.reduced ? 0 : f.patrol.swimTime,
          this.reduced ? 0.1 : 1,
          this.reduced ? 0 : turnRate,
        );
    });
    const waterView = shift,
      driftX = this.wakeView - waterView;
    if (Math.abs(driftX) > this.w * 0.25) this.wake.reset();
    this.wake.step(
      dt,
      this.fish.map((f) => ({
        id: f.id,
        ...f.screen,
        angle: f.angle,
        length: f.length,
        visible: f.group.visible,
      })),
      Math.abs(driftX) > this.w * 0.25 ? 0 : driftX,
      !this.detail && !this.reduced,
    );
    this.wakeView = waterView;
    this.put(this.wake.group, 0, 0, -3);
    this.contactWater.step(dt, !this.detail && this.progress < 1, this.reduced);
    this.put(this.contactWater.group, -shift, 0, -2);
    this.root.updateMatrixWorld(true);
    this.leaves
      .filter((l) => l.group.visible)
      .forEach((l) => (l.polygon = this.outline(l)));
    this.galleryLeaves
      .filter((l) => l.group.visible)
      .forEach((l) => (l.polygon = this.outline(l)));
    this.updateFishExposure();
    this.hovered =
      focus?.id ?? (this.pointer.active ? this.hitFish(this.pointer) : null);
    const begin = performance.now();
    try {
      this.dither.render(this.renderer, this.scene, this.camera);
    } catch {
      this.callbacks.error();
      this.dispose();
      return;
    }
    const work = performance.now() - begin;
    this.pressure = Math.max(0, this.pressure + (work > 20 ? dt : -dt * 0.5));
    if (this.pressure > 3) this.pacing = 30;
    if (this.pressure === 0) this.pacing = this.w < 640 ? 30 : 60;
    this.frames++;
    if (this.time - this.fpsTime > 1) {
      this.fps = this.frames / (this.time - this.fpsTime);
      this.frames = 0;
      this.fpsTime = this.time;
    }
    const inscriptionLeaf = this.leaves[7];
    this.callbacks.frame({
      inscription: {
        ...this.project(inscriptionLeaf.group.position),
        radius: inscriptionLeaf.radius,
        angle: inscriptionLeaf.group.rotation.z,
        visible: inscriptionLeaf.group.visible && this.progress < 1,
      },
      projects: this.galleryLeaves
        .filter((leaf) => leaf.group.visible)
        .map((leaf) => {
          const xs = leaf.polygon.map((p) => p.x),
            ys = leaf.polygon.map((p) => p.y);
          const x = Math.min(...xs),
            y = Math.min(...ys);
          return {
            id: leaf.project!,
            polygon: leaf.polygon,
            bounds: {
              x,
              y,
              width: Math.max(...xs) - x,
              height: Math.max(...ys) - y,
            },
            title: this.project(
              new THREE.Vector3(
                0,
                0,
                leaf.radius * (this.w < 640 ? 0.22 : 0.26),
              ).applyMatrix4(leaf.group.matrixWorld),
            ),
            radius: leaf.radius,
            scale: leaf.group.scale.x,
          };
        }),
      fish: this.fish.map((f) => ({
        id: f.id,
        ...f.screen,
        angle: f.angle,
        visible: f.group.visible,
        exposure: f.exposure,
      })),
      hovered: this.hovered,
      progress: this.progress,
      cameraX: shift,
      galleryOrigin: this.journey.origin,
      scroll: this.scroll,
      travelling: this.journey.moving,
      fps: this.fps,
      guide: "weave",
      ready: true,
    });
    this.queueWarmup();
  };

  debug() {
    return {
      fish: this.fish.map((f) => ({
        id: f.id,
        x: f.patrol.x,
        y: f.patrol.y,
        home: f.patrol.home,
        screen: f.screen,
        angle: f.angle,
        speed: f.patrol.speed,
        turnRate: f.patrol.turnRate,
      })),
      fps: this.fps,
      contexts: 1,
      progress: this.progress,
      cameraX: this.journey.x,
      galleryOrigin: this.journey.origin,
      travelling: this.journey.moving,
      guide: "weave",
      guidePosition: { ...this.guide },
      scroll: this.scroll,
      waterRipples: this.wake.activeCount,
      contactRipples: this.contactWater.activeCount,
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.warmJob !== null) {
      if (this.warmIdle) window.cancelIdleCallback(this.warmJob);
      else window.clearTimeout(this.warmJob);
    }
    cancelAnimationFrame(this.raf);
    disposeObject(this.root);
    this.dither.dispose();
    this.sunlight.shadow.dispose();
    this.renderer.dispose();
  }
}
