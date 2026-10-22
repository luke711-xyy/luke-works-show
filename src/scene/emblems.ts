import * as THREE from "three";
import type { ProjectId } from "../data/projects";
import { ancientMusic } from "./musical-emblem";
import { clepsydra } from "./clepsydra-emblem";
import { createBoatman } from "./boatman";
import {
  bambooScrolls,
  pavilion,
  sandTable,
  shadowTheater,
  teaSet,
} from "./chinese-emblems";

const water = "#79968d",
  TAU = Math.PI * 2;

export type Emblem = {
  group: THREE.Group;
  animate: (time: number, reduced?: boolean) => void;
};

function material(
  color: string,
  extra: THREE.MeshStandardMaterialParameters = {},
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.94,
    metalness: 0,
    ...extra,
  });
}

function mesh(
  geometry: THREE.BufferGeometry,
  color: string,
  extra: THREE.MeshStandardMaterialParameters = {},
) {
  return new THREE.Mesh(geometry, material(color, extra));
}

function place<T extends THREE.Object3D>(
  parent: THREE.Object3D,
  object: T,
  x = 0,
  y = 0,
  z = 0,
  name?: string,
): T {
  object.position.set(x, y, z);
  if (name) object.name = name;
  parent.add(object);
  return object;
}

function tube(points: THREE.Vector3[], radius: number, color: string) {
  return mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, radius, 6),
    color,
  );
}

// Ordered coverage makes fading water marks actual stippled geometry. Their
// colour still passes through the pond's shared Bayer pass.
function stippled(color: string, opacity = 1, vertexColors = false) {
  const result = material(color, {
    opacity,
    vertexColors,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  result.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <alphatest_fragment>",
      `#include <alphatest_fragment>
      vec2 p = floor(gl_FragCoord.xy);
      vec2 a = mod(p, 2.0), b = mod(floor(p / 2.0), 2.0);
      float rank = 4.0 * mod(2.0 * a.x + 3.0 * a.y, 4.0)
        + mod(2.0 * b.x + 3.0 * b.y, 4.0);
      if (diffuseColor.a <= (rank + 0.5) / 16.0) discard;
      diffuseColor.a = 1.0;`,
    );
  };
  result.customProgramCacheKey = () => "emblem-ordered-coverage-v1";
  return result;
}

function littleBoat(group: THREE.Group): Emblem["animate"] {
  const pondPositions = [0, 1, 0],
    pondColors: number[] = [];
  const pondIndices: number[] = [];
  const tone = new THREE.Color(water);
  pondColors.push(tone.r, tone.g, tone.b);
  for (let i = 0; i <= 72; i++) {
    const angle = (i / 72) * TAU;
    const edge = 1 + 0.045 * Math.sin(angle * 5) + 0.025 * Math.cos(angle * 7);
    pondPositions.push(
      Math.cos(angle) * 69 * edge,
      1,
      Math.sin(angle) * 42 * edge,
    );
    const color = tone.clone().lerp(new THREE.Color("#d8d6af"), 0.3);
    pondColors.push(color.r, color.g, color.b);
    if (i < 72) pondIndices.push(0, i + 1, i + 2);
  }
  const pond = new THREE.BufferGeometry();
  pond.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(pondPositions, 3),
  );
  pond.setAttribute("color", new THREE.Float32BufferAttribute(pondColors, 3));
  pond.setIndex(pondIndices);
  pond.computeVertexNormals();
  place(
    group,
    mesh(pond, "#ffffff", { vertexColors: true, side: THREE.DoubleSide }),
    0,
    0,
    0,
    "boat-pond",
  );
  const boat = place(group, new THREE.Group(), 0, 5, 0, "boat");
  const hullPositions: number[] = [],
    hullIndices: number[] = [],
    rimLeft: THREE.Vector3[] = [],
    rimRight: THREE.Vector3[] = [];
  const rows = 32,
    columns = 12;
  for (let row = 0; row <= rows; row++) {
    const u = row / rows,
      x = (u - 0.5) * 87;
    const width = Math.sin(u * Math.PI) ** 0.65 * 16;
    const ends = Math.abs(u * 2 - 1) ** 3 * 13;
    for (let column = 0; column <= columns; column++) {
      const v = (column / columns) * 2 - 1;
      const y = -5 + Math.abs(v) ** 1.5 * 12 + ends;
      hullPositions.push(x, y, width * v);
      if (column === 0) rimLeft.push(new THREE.Vector3(x, y, -width));
      if (column === columns) rimRight.push(new THREE.Vector3(x, y, width));
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column;
        hullIndices.push(
          a,
          a + columns + 1,
          a + 1,
          a + 1,
          a + columns + 1,
          a + columns + 2,
        );
      }
    }
  }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(hullPositions, 3),
  );
  hull.setIndex(hullIndices);
  hull.computeVertexNormals();
  place(
    boat,
    mesh(hull, "#6b5039", { side: THREE.DoubleSide }),
    0,
    0,
    0,
    "boat-hull",
  );
  boat.add(tube(rimLeft, 0.85, "#b7a07a"), tube(rimRight, 0.85, "#b7a07a"));
  // The keel sits below the waterline. A sealed raised inner bottom prevents
  // the exterior pond surface from appearing inside the open cabin as it rocks.
  const floorHeight = 1.4;
  const floorEnd = 43.5 * Math.cbrt((floorHeight + 5) / 13);
  const floorWidth = (x: number) => {
    const u = x / 87 + 0.5;
    const ends = Math.abs(u * 2 - 1) ** 3 * 13;
    return (
      Math.sin(u * Math.PI) ** 0.65 *
      16 *
      Math.max(0, (floorHeight + 5 - ends) / 12) ** (2 / 3)
    );
  };
  const floorPoints: THREE.Vector2[] = [];
  for (const side of [-1, 1])
    for (let i = 0; i <= 48; i++) {
      const x = side * (-floorEnd + (i / 48) * floorEnd * 2);
      floorPoints.push(new THREE.Vector2(x, side * floorWidth(x)));
    }
  const floorGeometry = new THREE.ExtrudeGeometry(
    new THREE.Shape(floorPoints),
    {
      depth: 0.9,
      bevelEnabled: false,
      steps: 1,
    },
  );
  floorGeometry.rotateX(-Math.PI / 2);
  place(
    boat,
    mesh(floorGeometry, "#bf945b"),
    0,
    floorHeight - 0.9,
    0,
    "boat-cabin-floor",
  );
  for (let x = -30; x <= 30; x += 6)
    place(
      boat,
      mesh(new THREE.BoxGeometry(0.25, 0.12, floorWidth(x) * 1.94), "#89653f"),
      x,
      floorHeight + 0.03,
    );
  for (const x of [-20, -1])
    place(boat, mesh(new THREE.BoxGeometry(5, 1.8, 24), "#b79a6e"), x, 5);

  const deckPositions: number[] = [],
    deckIndices: number[] = [];
  const deckHeight = (x: number) =>
    6.5 + Math.max(0, (x - 32) / 11.5) ** 2 * 1.7;
  for (let row = 0; row <= 20; row++) {
    const x = 18 + (row / 20) * 25.5;
    const width = Math.sin((x / 87 + 0.5) * Math.PI) ** 0.65 * 14.8;
    deckPositions.push(x, deckHeight(x), -width, x, deckHeight(x), width);
    if (row < 20) {
      const a = row * 2;
      deckIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const deck = new THREE.BufferGeometry();
  deck.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(deckPositions, 3),
  );
  deck.setIndex(deckIndices);
  deck.computeVertexNormals();
  place(
    boat,
    mesh(deck, "#a68a60", { side: THREE.DoubleSide }),
    0,
    0,
    0,
    "boat-bow-deck",
  );
  for (let x = 19; x < 43; x += 4) {
    const width = Math.sin((x / 87 + 0.5) * Math.PI) ** 0.65 * 29;
    place(
      boat,
      mesh(new THREE.BoxGeometry(0.22, 0.1, width), "#725a3e"),
      x,
      deckHeight(x) + 0.08,
    );
  }

  // A thin, closed shell with two genuinely open archways. Ribs sit proud of
  // the cover, so their highlights cannot z-fight with the dark woven surface.
  const canopyPositions: number[] = [],
    canopyColors: number[] = [],
    canopyIndices: number[] = [];
  const lengthSteps = 8,
    arcSteps = 28,
    stride = arcSteps + 1;
  const layerSize = (lengthSteps + 1) * stride;
  for (let layer = 0; layer < 2; layer++) {
    for (let row = 0; row <= lengthSteps; row++) {
      const u = row / lengthSteps,
        x = -28 + u * 40;
      for (let i = 0; i <= arcSteps; i++) {
        const angle = (i / arcSteps) * Math.PI;
        canopyPositions.push(
          x,
          7 + Math.sin(angle) * (19 - layer * 0.55),
          Math.cos(angle) * (14 - layer * 0.55),
        );
        const tone = new THREE.Color(layer ? "#333830" : "#3b413b").lerp(
          new THREE.Color("#66685a"),
          layer ? 0 : 0.25 * Math.sin(angle) + 0.08 * Math.cos(u * 8),
        );
        canopyColors.push(tone.r, tone.g, tone.b);
        if (row < lengthSteps && i < arcSteps) {
          const a = layer * layerSize + row * stride + i;
          canopyIndices.push(
            a,
            a + stride,
            a + 1,
            a + 1,
            a + stride,
            a + stride + 1,
          );
        }
      }
    }
  }
  const join = (a: number, b: number) =>
    canopyIndices.push(a, b, a + layerSize, b, b + layerSize, a + layerSize);
  for (let row = 0; row < lengthSteps; row++) {
    join(row * stride, (row + 1) * stride);
    join(row * stride + arcSteps, (row + 1) * stride + arcSteps);
  }
  for (let i = 0; i < arcSteps; i++) {
    join(i, i + 1);
    join(lengthSteps * stride + i, lengthSteps * stride + i + 1);
  }
  const canopyGeometry = new THREE.BufferGeometry();
  canopyGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(canopyPositions, 3),
  );
  canopyGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(canopyColors, 3),
  );
  canopyGeometry.setIndex(canopyIndices);
  canopyGeometry.computeVertexNormals();
  const canopy = place(boat, new THREE.Group(), 0, 0, 0, "boat-canopy");
  canopy.add(
    mesh(canopyGeometry, "#ffffff", {
      vertexColors: true,
      side: THREE.DoubleSide,
    }),
  );
  for (const x of [-28.2, -20, -12, -4, 4, 12.2]) {
    const arch = Array.from({ length: 29 }, (_, i) => {
      const angle = (i / 28) * Math.PI;
      return new THREE.Vector3(
        x,
        7 + Math.sin(angle) * 19.45,
        Math.cos(angle) * 14.45,
      );
    });
    canopy.add(tube(arch, 0.38, "#8a7959"));
  }
  for (const angle of [0.44, 1.05, 2.1, 2.7]) {
    canopy.add(
      tube(
        [
          new THREE.Vector3(
            -28,
            7 + Math.sin(angle) * 19.25,
            Math.cos(angle) * 14.25,
          ),
          new THREE.Vector3(
            12,
            7 + Math.sin(angle) * 19.25,
            Math.cos(angle) * 14.25,
          ),
        ],
        0.17,
        "#5d6051",
      ),
    );
  }
  const animateBoatman = createBoatman(boat, group);
  const ripples = Array.from({ length: 3 }, (_, i) => {
    const ripple = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.009, 4, 80),
      stippled("#eee1b9", 0.55),
    );
    ripple.rotation.x = Math.PI / 2;
    return place(group, ripple, 0, 1.5, 0, `boat-ripple-${i}`);
  });
  return (time, reduced = false) => {
    const t = reduced ? 0 : time;
    boat.position.set(
      Math.sin(t * 0.32) * 5,
      5 + Math.sin(t * 1.3) * 0.7,
      Math.sin(t * 0.25) * 3,
    );
    boat.rotation.set(
      Math.sin(t * 0.85) * 0.035,
      -0.17 + Math.sin(t * 0.3) * 0.1,
      Math.sin(t * 1.1) * 0.025,
    );
    animateBoatman(t);
    ripples.forEach((ripple, i) => {
      const age = (t * 0.17 + i / 3) % 1;
      ripple.scale.set(32 + age * 32, 20 + age * 19, 1);
      ripple.material.opacity = Math.sin(age * Math.PI) * 0.52;
    });
  };
}

export function createEmblem(id: ProjectId, scale: number): Emblem {
  const group = new THREE.Group();
  group.name = `emblem-${id}`;
  const builders: Record<
    ProjectId,
    (parent: THREE.Group) => Emblem["animate"]
  > = {
    mosic: ancientMusic,
    "meet-countdown": clepsydra,
    "water-reminder": teaSet,
    worldmaker: pavilion,
    "moce-film": shadowTheater,
    teleprompter: bambooScrolls,
    huazhi: sandTable,
    lanbridge: littleBoat,
  };
  const animate = builders[id](group);
  group.scale.setScalar(scale / 100);
  group.rotation.y = -0.22;
  animate(0);
  return { group, animate };
}
