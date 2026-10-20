import * as THREE from "three";
import type { ProjectId } from "../data/projects";
import { ancientMusic } from "./musical-emblem";
import { clepsydra } from "./clepsydra-emblem";
import {
  bambooScrolls,
  pavilion,
  sandTable,
  shadowTheater,
  teaSet,
} from "./chinese-emblems";

const ivory = "#eee1b9",
  gold = "#c5a05c",
  red = "#b6432e",
  water = "#79968d",
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

function rod(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  color: string,
) {
  const result = mesh(
    new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 10),
    color,
  );
  result.position.copy(a).lerp(b, 0.5);
  result.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  return result;
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
    const ends = Math.abs(u * 2 - 1) ** 3 * 7;
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
    mesh(hull, "#a37a46", { side: THREE.DoubleSide }),
    0,
    0,
    0,
    "boat-hull",
  );
  boat.add(tube(rimLeft, 1.25, gold), tube(rimRight, 1.25, gold));
  // The keel sits below the waterline. A sealed raised inner bottom prevents
  // the exterior pond surface from appearing inside the open cabin as it rocks.
  const floorHeight = 1.4;
  const floorEnd = 43.5 * Math.cbrt((floorHeight + 5) / 7);
  const floorWidth = (x: number) => {
    const u = x / 87 + 0.5;
    const ends = Math.abs(u * 2 - 1) ** 3 * 7;
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
  for (let x = -36; x <= 36; x += 6)
    place(
      boat,
      mesh(new THREE.BoxGeometry(0.25, 0.12, floorWidth(x) * 1.94), "#89653f"),
      x,
      floorHeight + 0.03,
    );
  for (const x of [-22, 1, 23])
    place(boat, mesh(new THREE.BoxGeometry(6, 2.2, 24), "#d0ad6e"), x, 5);
  boat.add(
    rod(
      new THREE.Vector3(-7, 1, 0),
      new THREE.Vector3(-7, 77, 0),
      1.4,
      "#8e7046",
    ),
  );
  const sailPositions: number[] = [],
    sailIndices: number[] = [];
  const sailRows = 16;
  for (let row = 0; row <= sailRows; row++) {
    const t = row / sailRows;
    for (let column = 0; column <= 8; column++) {
      const u = column / 8;
      sailPositions.push(
        -4 + u * t * 34,
        72 - t * 52,
        2 + Math.sin(u * Math.PI) * Math.sin(t * Math.PI) * 8,
      );
      if (row < sailRows && column < 8) {
        const a = row * 9 + column;
        sailIndices.push(a, a + 9, a + 1, a + 1, a + 9, a + 10);
      }
    }
  }
  const sailGeometry = new THREE.BufferGeometry();
  sailGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(sailPositions, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  sailGeometry.setIndex(sailIndices);
  sailGeometry.computeVertexNormals();
  place(
    boat,
    mesh(sailGeometry, ivory, { side: THREE.DoubleSide }),
    0,
    0,
    0,
    "boat-sail",
  );
  const sail = sailGeometry.getAttribute("position") as THREE.BufferAttribute;
  const pennant = place(
    boat,
    mesh(
      new THREE.ShapeGeometry(
        new THREE.Shape([
          new THREE.Vector2(-7, 76),
          new THREE.Vector2(8, 72),
          new THREE.Vector2(-7, 68),
        ]),
      ),
      red,
      { side: THREE.DoubleSide },
    ),
    0,
    0,
    1,
  );
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
    pennant.rotation.y = Math.sin(t * 1.6) * 0.12;
    for (let row = 0; row <= sailRows; row++) {
      const v = row / sailRows;
      for (let column = 0; column <= 8; column++) {
        const u = column / 8;
        sail.setZ(
          row * 9 + column,
          2 +
            Math.sin(u * Math.PI) *
              Math.sin(v * Math.PI) *
              (8 + Math.sin(t * 1.5 - v * 4) * 1.4),
        );
      }
    }
    sail.needsUpdate = true;
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
