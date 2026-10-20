import * as THREE from "three";

type Animate = (time: number, reduced?: boolean) => void;
const cream = "#eee1b9",
  bamboo = "#c4a369",
  cinnabar = "#a85c46",
  wood = "#76553c",
  ink = "#454b3d",
  TAU = Math.PI * 2;
const ease = (value: number) => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
function matte(
  color: string,
  extra: THREE.MeshStandardMaterialParameters = {},
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    metalness: 0,
    ...extra,
  });
}
function mesh(
  geometry: THREE.BufferGeometry,
  color: string,
  extra: THREE.MeshStandardMaterialParameters = {},
) {
  return new THREE.Mesh(geometry, matte(color, extra));
}
function put<T extends THREE.Object3D>(
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
function path(points: THREE.Vector3[], radius: number, color: string) {
  return mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, radius, 6),
    color,
  );
}
function bar(
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  color: string,
  x = 0,
  y = 0,
  z = 0,
) {
  return put(
    parent,
    mesh(new THREE.BoxGeometry(width, height, depth), color),
    x,
    y,
    z,
  );
}
function silhouette(points: [number, number][], color: string) {
  const shape = new THREE.Shape(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
  );
  return mesh(new THREE.ShapeGeometry(shape), color, {
    side: THREE.DoubleSide,
  });
}

function whiteVapour(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  phase: number,
) {
  const segments = 24,
    positions = new Float32Array((segments + 1) * 6);
  const colors: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    for (let side = 0; side < 2; side++)
      colors.push(1, 1, 1, Math.sin(Math.PI * t) ** 0.8 * (1 - t * 0.25));
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
  geometry.setIndex(indices);
  // Unlit white keeps vapour white even on the shaded side of the tea set.
  const material = new THREE.MeshBasicMaterial({
    color: "#fffdf4",
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <alphatest_fragment>",
      `#include <alphatest_fragment>
      vec2 cell = floor(gl_FragCoord.xy);
      vec2 low = mod(cell, 2.0), high = mod(floor(cell / 2.0), 2.0);
      float rank = 4.0 * mod(2.0 * low.x + 3.0 * low.y, 4.0)
        + mod(2.0 * high.x + 3.0 * high.y, 4.0);
      if (diffuseColor.a * 1.6 < (rank + 0.5) / 16.0) discard;
      diffuseColor.a = 0.4;`,
    );
  };
  material.customProgramCacheKey = () => "white-tea-vapour-bayer-v1";
  const ribbon = put(
    parent,
    new THREE.Mesh(geometry, material),
    x,
    y,
    z,
    "white-tea-vapour",
  );
  ribbon.frustumCulled = false;
  const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
  return (time: number) => {
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const sway = Math.sin(t * 6 - time * 1.05 + phase) * (1 + t * 4.8);
      const width = (1.3 + Math.sin(t * Math.PI) * 1.6) * (1 - t * 0.5);
      for (let side = 0; side < 2; side++)
        attribute.setXYZ(
          i * 2 + side,
          sway + (side ? width : -width),
          t * 43,
          Math.sin(t * 4 - time * 0.75 + phase) * t * 2.2,
        );
    }
    attribute.needsUpdate = true;
  };
}

export function teaSet(group: THREE.Group): Animate {
  const tray = put(
    group,
    mesh(new THREE.CylinderGeometry(1, 1, 4, 64), "#9b744e"),
    0,
    2,
    0,
    "tea-tray",
  );
  tray.scale.set(68, 1, 43);
  const inset = put(
    group,
    mesh(new THREE.CircleGeometry(1, 64), "#b58c57", {
      side: THREE.DoubleSide,
    }),
    0,
    4.2,
    0,
  );
  inset.rotation.x = -Math.PI / 2;
  inset.scale.set(64, 39, 1);
  const pot = put(group, new THREE.Group(), -29, 6, 0, "teapot");
  put(
    pot,
    mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(12, 0),
          new THREE.Vector2(18, 6),
          new THREE.Vector2(21, 16),
          new THREE.Vector2(18, 27),
          new THREE.Vector2(12, 32),
        ],
        40,
      ),
      "#aa795d",
    ),
    0,
    0,
    0,
    "teapot-body",
  );
  const lid = put(
    pot,
    mesh(new THREE.SphereGeometry(14.5, 32, 16), "#b98b69"),
    0,
    32,
    0,
  );
  lid.scale.y = 0.24;
  put(pot, mesh(new THREE.SphereGeometry(3.4, 16, 12), wood), 0, 38);
  const foot = put(
    pot,
    mesh(new THREE.TorusGeometry(12, 1.6, 8, 40), wood),
    0,
    1,
  );
  foot.rotation.x = Math.PI / 2;
  pot.add(
    path(
      [
        new THREE.Vector3(-15, 8, 0),
        new THREE.Vector3(-30, 10, 0),
        new THREE.Vector3(-33, 26, 0),
        new THREE.Vector3(-17, 29, 0),
      ],
      2.6,
      wood,
    ),
  );
  const spoutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(15, 12, 0),
    new THREE.Vector3(26, 17, 0),
    new THREE.Vector3(28, 29, 0),
    new THREE.Vector3(35, 34, 0),
  ]);
  const spoutGeometry = new THREE.TubeGeometry(spoutCurve, 28, 4, 12, false);
  const spoutPositions = spoutGeometry.getAttribute(
    "position",
  ) as THREE.BufferAttribute;
  const center = new THREE.Vector3(),
    point = new THREE.Vector3();
  for (let row = 0; row <= 28; row++) {
    spoutCurve.getPointAt(row / 28, center);
    for (let side = 0; side <= 12; side++) {
      const index = row * 13 + side;
      point
        .fromBufferAttribute(spoutPositions, index)
        .sub(center)
        .multiplyScalar(1 - (row / 28) * 0.5)
        .add(center);
      spoutPositions.setXYZ(index, point.x, point.y, point.z);
    }
  }
  spoutGeometry.computeVertexNormals();
  pot.add(mesh(spoutGeometry, "#aa795d", { side: THREE.DoubleSide }));
  const opening = put(
    pot,
    mesh(new THREE.CircleGeometry(1.6, 16), wood, { side: THREE.DoubleSide }),
    35.1,
    34.1,
  );
  opening.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    spoutCurve.getTangent(1),
  );
  const vapour: ((time: number) => void)[] = [];
  const cups = [-22, 22].map((z, index) => {
    const cup = put(group, new THREE.Group(), 30, 6, z, `teacup-${index}`);
    put(
      cup,
      mesh(
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(6.5, 0),
            new THREE.Vector2(10, 7),
            new THREE.Vector2(11, 14),
            new THREE.Vector2(9.3, 14),
            new THREE.Vector2(8.2, 7),
            new THREE.Vector2(5.5, 2),
            new THREE.Vector2(0, 2),
          ],
          32,
        ),
        cream,
      ),
    );
    const rim = put(
      cup,
      mesh(new THREE.TorusGeometry(10.1, 0.65, 6, 40), bamboo),
      0,
      14,
    );
    rim.rotation.x = Math.PI / 2;
    const tea = put(
      cup,
      mesh(new THREE.CircleGeometry(8.9, 32), "#a77836", {
        side: THREE.DoubleSide,
      }),
      0,
      11,
      0,
      `tea-surface-${index}`,
    );
    tea.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 2; i++)
      vapour.push(
        whiteVapour(cup, (i - 0.5) * 5, 16, i * 3 - 1.5, i * 1.8 + index),
      );
    return tea;
  });
  const streamPositions = new Float32Array(25 * 7 * 3),
    streamIndices: number[] = [];
  for (let row = 0; row < 24; row++)
    for (let side = 0; side < 6; side++) {
      const a = row * 7 + side;
      streamIndices.push(a, a + 7, a + 1, a + 1, a + 7, a + 8);
    }
  const streamGeometry = new THREE.BufferGeometry();
  streamGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(streamPositions, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  streamGeometry.setIndex(streamIndices);
  const stream = put(
    group,
    new THREE.Mesh(
      streamGeometry,
      new THREE.MeshBasicMaterial({
        color: "#b98c48",
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    ),
    0,
    0,
    0,
    "tea-stream",
  );
  stream.frustumCulled = false;
  const streamAttribute = streamGeometry.getAttribute(
    "position",
  ) as THREE.BufferAttribute;
  const start = new THREE.Vector3();
  return (time, reduced = false) => {
    const t = reduced ? 0 : time,
      phase = t % 6,
      index = Math.floor(t / 6) % 2;
    const lift = ease((phase - 0.25) / 1.2) * (1 - ease((phase - 4.3) / 1.1));
    pot.position.set(-29 + lift * 11, 6 + lift * 22, (index ? 22 : -22) * lift);
    pot.rotation.z = -0.54 * lift;
    pot.rotation.y = Math.sin(lift * Math.PI) * 0.035;
    pot.updateMatrix();
    const flow = ease((phase - 1.45) / 0.3) * (1 - ease((phase - 4.0) / 0.3));
    stream.visible = flow > 0.01 && !reduced;
    start.set(35.5, 34, 0).applyMatrix4(pot.matrix);
    for (let row = 0; row <= 24; row++) {
      const p = row / 24;
      const x = THREE.MathUtils.lerp(start.x, 30, p);
      const y = THREE.MathUtils.lerp(start.y, 17, p * p);
      const z = THREE.MathUtils.lerp(start.z, index ? 22 : -22, p);
      const radius = (0.6 + Math.sin(p * 12 - t * 8) * 0.08) * flow;
      for (let side = 0; side <= 6; side++) {
        const angle = (side / 6) * TAU;
        streamAttribute.setXYZ(
          row * 7 + side,
          x + Math.cos(angle) * radius,
          y,
          z + Math.sin(angle) * radius,
        );
      }
    }
    streamAttribute.needsUpdate = true;
    cups.forEach((cup, i) => {
      cup.rotation.x = -Math.PI / 2 + Math.sin(t * 1.5 + i) * 0.012;
    });
    vapour.forEach((animate) => animate(t));
  };
}

type Voxel = { x: number; y: number; z: number; color: string };
function gardenRock(parent: THREE.Group, x: number, z: number, small = false) {
  const shape = new THREE.Shape([
    new THREE.Vector2(-12, 0),
    new THREE.Vector2(13, 0),
    new THREE.Vector2(10, 11),
    new THREE.Vector2(15, 22),
    new THREE.Vector2(8, 31),
    new THREE.Vector2(11, 43),
    new THREE.Vector2(3, 54),
    new THREE.Vector2(-3, 48),
    new THREE.Vector2(-8, 50),
    new THREE.Vector2(-11, 39),
    new THREE.Vector2(-7, 30),
    new THREE.Vector2(-15, 24),
    new THREE.Vector2(-10, 14),
  ]);
  for (const [cx, cy, rx, ry] of [
    [-1, 15, 3.2, 4.8],
    [1, 33, 3, 5],
    [-1, 43, 2.3, 2.8],
  ]) {
    const hole = new THREE.Path();
    hole.absellipse(cx, cy, rx, ry, 0, TAU, true, 0.2);
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 10,
    steps: 2,
    bevelEnabled: true,
    bevelThickness: 2.2,
    bevelSize: 1.9,
    bevelSegments: 2,
    curveSegments: 9,
  });
  geometry.translate(0, 0, -5);
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normals = geometry.getAttribute("normal");
  const colors: number[] = [],
    dark = new THREE.Color("#777e70"),
    pale = new THREE.Color("#d2ccb5");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    positions.setZ(i, z + Math.sin(y * 0.31 + x * 0.42) * 1.1);
    const c = dark
      .clone()
      .lerp(
        pale,
        THREE.MathUtils.clamp(
          0.48 +
            normals.getY(i) * 0.22 +
            Math.sin(y * 0.33 + x * 0.2) * 0.15 +
            Math.cos(z * 0.6 - y * 0.2) * 0.12,
          0,
          1,
        ),
      );
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const rock = put(
    parent,
    mesh(geometry, "#ffffff", { vertexColors: true, side: THREE.DoubleSide }),
    x,
    1,
    z,
    small ? "garden-rock-right" : "garden-rock-left",
  );
  rock.rotation.set(-0.18, small ? -0.42 : 0.25, small ? 0.09 : -0.08);
  if (small) rock.scale.set(0.82, 0.67, 0.9);
  for (const dx of [-8, 8]) {
    const foot = put(
      parent,
      mesh(new THREE.DodecahedronGeometry(7, 0), "#969781"),
      x + dx,
      3,
      z + 1,
    );
    foot.scale.set(1, 0.5, 0.8);
  }
}

export function pavilion(group: THREE.Group): Animate {
  const voxels: Voxel[] = [];
  const step = 3.3;
  const voxel = (x: number, y: number, z: number, color: string) =>
    voxels.push({ x, y, z, color });
  for (let x = -39.6; x <= 39.7; x += step)
    for (let z = -33; z <= 33.1; z += step) {
      voxel(x, 1.8, z, "#b1a383");
      if (Math.abs(x) < 36.4 && Math.abs(z) < 29.8) voxel(x, 5.1, z, "#d7c59b");
    }
  for (let x = -16.5; x <= 16.6; x += step)
    for (let z = 36.3; z <= 42.9; z += step)
      voxel(x, 1.8 - (z - 36.3) * 0.15, z, "#c1b18b");
  for (const x of [-29.7, 29.7])
    for (const z of [-23.1, 23.1])
      for (let y = 8.4; y <= 57.9; y += step)
        for (const dx of [-1.65, 1.65])
          for (const dz of [-1.65, 1.65])
            voxel(x + dx, y, z + dz, y < 12 ? "#a29375" : cinnabar);
  for (let x = -33; x <= 33.1; x += step)
    for (const z of [-26.4, 26.4])
      for (const y of [18.3, 54.6, 57.9])
        voxel(x, y, z, y > 50 ? "#966b42" : "#b78f5a");
  for (let z = -23.1; z <= 23.2; z += step)
    for (const x of [-33, 33])
      for (const y of [18.3, 54.6, 57.9])
        voxel(x, y, z, y > 50 ? "#966b42" : "#b78f5a");
  for (const x of [-23.1, -13.2, 13.2, 23.1])
    for (const y of [11.7, 15]) voxel(x, y, -26.4, "#b78f5a");
  for (let x = -49.5; x <= 49.6; x += step)
    for (let z = -42.9; z <= 43; z += step) {
      const r = Math.max(Math.abs(x) / 49.5, Math.abs(z) / 42.9),
        corner = Math.abs(x * z) / (49.5 * 42.9);
      const y = 61 + 26 * (1 - r) ** 1.2 + 11 * r ** 5 * corner ** 2;
      voxel(
        x,
        y,
        z,
        r > 0.9
          ? "#a78e57"
          : Math.round(x / step) % 3 === 0
            ? "#818679"
            : "#5a6961",
      );
      if (r > 0.9) voxel(x, y - step, z, "#a17747");
    }
  for (let y = 88; y < 100; y += step)
    voxel(0, y, 0, y > 94 ? "#ba9c62" : "#667466");
  voxels.sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
  const temple = put(
    group,
    new THREE.Group(),
    0,
    0,
    -4,
    "complete-voxel-pavilion",
  );
  temple.scale.setScalar(0.88);
  const building = put(
    temple,
    new THREE.InstancedMesh(
      new THREE.BoxGeometry(3.02, 3.02, 3.02),
      matte("#ffffff"),
      voxels.length,
    ),
    0,
    0,
    0,
    "pavilion-building-voxels",
  );
  building.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  building.frustumCulled = false;
  const color = new THREE.Color(),
    instance = new THREE.Object3D();
  voxels.forEach((v, i) => building.setColorAt(i, color.set(v.color)));
  gardenRock(group, -62, 9);
  gardenRock(group, 64, 18, true);
  return (time, reduced = false) => {
    // Trim only the empty interval (1.4s -> 0.7s). The active phase still
    // advances at 2x, preserving every block's build/dissolve speed.
    const phase = ((time * 2) % 16.6) + 0.25;
    building.visible = reduced || (phase > 0.5 && phase < 15.7);
    voxels.forEach((v, i) => {
      const order = i / voxels.length;
      const progress = reduced
        ? 1
        : ease((phase - 0.5 - order * 5.2) / 1.1) *
          (1 - ease((phase - 10.2 - (1 - order) * 4.4) / 1.1));
      instance.position.set(
        v.x + (1 - progress) * Math.sin(i * 2) * 11,
        v.y + (1 - progress) * 24,
        v.z + (1 - progress) * 10,
      );
      instance.rotation.set(0, (1 - progress) * 0.7, (1 - progress) * 0.25);
      instance.scale.setScalar(progress);
      instance.updateMatrix();
      building.setMatrixAt(i, instance.matrix);
    });
    building.instanceMatrix.needsUpdate = true;
  };
}

type LegendCharacter = "white-snake" | "green-snake" | "xu-xian";
function puppet(
  parent: THREE.Group,
  character: LegendCharacter,
  x: number,
  scale = 0.82,
) {
  const scholar = character === "xu-xian";
  const color =
    character === "white-snake"
      ? "#f1e5c9"
      : character === "green-snake"
        ? "#779785"
        : "#b19a72";
  const figure = put(
    parent,
    new THREE.Group(),
    x,
    13,
    character === "green-snake" ? 2.7 : 3.4,
    character,
  );
  figure.scale.set(scholar ? -scale : scale, scale, scale);
  const outline = (
    target: THREE.Group,
    points: [number, number][],
    z = 0.25,
  ) => {
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < points.length; i++) {
      const p = points[i],
        q = points[(i + 1) % points.length];
      curve.add(
        new THREE.LineCurve3(
          new THREE.Vector3(p[0], p[1], z),
          new THREE.Vector3(q[0], q[1], z),
        ),
      );
    }
    target.add(
      mesh(
        new THREE.TubeGeometry(curve, points.length * 2, 0.42, 4),
        "#80684d",
      ),
    );
  };
  const robePoints: [number, number][] = [
    [-7, 41],
    [6, 40],
    [7, 26],
    [13, 8],
    [9, 5],
    [4, 6],
    [0, 3],
    [-6, 6],
    [-12, 5],
    [-9, 14],
    [-6, 26],
    [-10, 35],
  ];
  const robe = new THREE.Shape(
    robePoints.map(([x, y]) => new THREE.Vector2(x, y)),
  );
  for (let row = 0; row < 4; row++)
    for (let column = 0; column < 3; column++) {
      const hole = new THREE.Path();
      hole.absellipse(
        -3 + column * 4,
        11 + row * 6,
        0.65,
        1.55,
        0,
        TAU,
        false,
        0.3,
      );
      robe.holes.push(hole);
    }
  put(
    figure,
    mesh(new THREE.ShapeGeometry(robe), color, { side: THREE.DoubleSide }),
  );
  outline(figure, robePoints);
  const face: [number, number][] = [
    [-3, 40],
    [-4, 47],
    [-3, 53],
    [1, 54],
    [4, 51],
    [7, 48],
    [4, 46],
    [5, 44],
    [2, 41],
  ];
  put(figure, silhouette(face, "#e8d1a7"), 0, 0, 0.3);
  outline(figure, face, 0.55);
  const hair: [number, number][] = scholar
    ? [
        [-6, 50],
        [-7, 57],
        [-3, 62],
        [5, 61],
        [7, 57],
        [4, 53],
        [1, 53],
        [-2, 50],
      ]
    : [
        [-5, 46],
        [-7, 53],
        [-5, 58],
        [-1, 60],
        [3, 57],
        [4, 54],
        [1, 54],
        [-2, 51],
        [-2, 46],
      ];
  put(figure, silhouette(hair, "#454536"), 0, 0, 0.65);
  if (scholar) {
    put(
      figure,
      silhouette(
        [
          [-7, 54],
          [-10, 49],
          [-7, 43],
          [-4, 49],
        ],
        "#4d5648",
      ),
      0,
      0,
      0.7,
    );
    bar(figure, 10, 1.2, 0.6, bamboo, -0.8, 55.5, 0.8);
  } else {
    const bun = put(
      figure,
      mesh(new THREE.CircleGeometry(3.4, 18), "#454536", {
        side: THREE.DoubleSide,
      }),
      -3.2,
      60,
      0.8,
    );
    bun.scale.y = 0.75;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * TAU;
      put(
        figure,
        mesh(
          new THREE.CircleGeometry(0.95, 10),
          character === "white-snake" ? "#f5edd6" : "#c8ba86",
          { side: THREE.DoubleSide },
        ),
        -2 + Math.cos(angle) * 1.8,
        61 + Math.sin(angle) * 1.8,
        1.1,
      );
    }
    bar(figure, 9, 0.6, 0.6, bamboo, -4, 59.5, 1.2);
    put(
      figure,
      silhouette(
        [
          [-6, 52],
          [-12, 41],
          [-10, 35],
          [-7, 45],
        ],
        color,
      ),
      0,
      0,
      0.5,
    );
  }
  put(
    figure,
    mesh(new THREE.CircleGeometry(0.62, 10), "#554936", {
      side: THREE.DoubleSide,
    }),
    2.5,
    49,
    0.85,
  );
  bar(figure, 1.8, 0.55, 0.5, "#a9604c", 4.2, 44.8, 0.85);
  for (const x of [-4, 5]) {
    bar(figure, 2, 6, 1, "#5b4d3b", x, 2);
    bar(figure, 5, 1.5, 1, "#5b4d3b", x + 1, -1);
  }
  const arms = [-1, 1].map((side) => {
    const shoulder = put(figure, new THREE.Group(), side * 6, 37, 1);
    const upper: [number, number][] = scholar
      ? [
          [-3, 0],
          [3, 0],
          [4, -15],
          [-2, -18],
        ]
      : [
          [-3, 1],
          [3, 0],
          [6, -8],
          [7, -18],
          [1, -24],
          [-3, -18],
          [-2, -10],
        ];
    put(shoulder, silhouette(upper, color));
    outline(shoulder, upper, 0.2);
    const elbow = put(shoulder, new THREE.Group(), 1, -16, 0.35);
    const lower: [number, number][] = [
      [-2, 1],
      [3, 0],
      [5, -12],
      [3, -17],
      [-1, -16],
      [-3, -9],
    ];
    put(elbow, silhouette(lower, color));
    outline(elbow, lower, 0.25);
    put(
      elbow,
      mesh(new THREE.CircleGeometry(1.7, 12), bamboo, {
        side: THREE.DoubleSide,
      }),
      2,
      -15,
      0.6,
    );
    const control = bar(elbow, 0.6, 35, 0.5, "#a58d62", 2, -32, -0.2);
    return { shoulder, elbow, control };
  });
  return { figure, arms };
}

export function shadowTheater(group: THREE.Group): Animate {
  group.rotation.x = -0.26;
  const screen = put(
    group,
    new THREE.Mesh(
      new THREE.PlaneGeometry(108, 82),
      new THREE.MeshBasicMaterial({ color: "#e5cfa0", side: THREE.DoubleSide }),
    ),
    0,
    48,
    0,
    "shadow-theater-screen",
  );
  screen.name = "shadow-theater-screen";
  for (const x of [-57, 57]) bar(group, 4, 98, 5, wood, x, 47);
  bar(group, 124, 5, 6, wood, 0, 96);
  bar(group, 124, 7, 10, wood, 0, 4, 2);
  for (const x of [-45, 45]) bar(group, 5, 9, 9, wood, x, -3, 1);
  for (const side of [-1, 1]) {
    const curtain = put(
      group,
      silhouette(
        [
          [0, 0],
          [17, 0],
          [15, -12],
          [10, -30],
          [15, -75],
          [0, -82],
        ],
        "#9f5846",
      ),
      side * -53,
      91,
      2,
    );
    curtain.scale.x = side;
    for (let i = 0; i < 3; i++)
      bar(
        curtain,
        0.6,
        60 - i * 5,
        0.4,
        "#b48957",
        3 + i * 3,
        -34 - i * 2,
        0.5,
      );
  }
  for (let i = 0; i < 7; i++) {
    const drape = put(
      group,
      mesh(new THREE.SphereGeometry(8, 16, 8), "#a45f48"),
      -46 + i * 15.3,
      90,
      3,
    );
    drape.scale.set(1.05, 0.45, 0.15);
  }
  const players = [
    puppet(group, "white-snake", -29),
    puppet(group, "green-snake", -3, 0.74),
    puppet(group, "xu-xian", 27),
  ];
  const umbrella = put(
    group,
    new THREE.Group(),
    27,
    70,
    1.8,
    "white-snake-paper-umbrella",
  );
  const canopy: [number, number][] = [
    [-20, 0],
    [-15, 9],
    [-7, 14],
    [0, 15],
    [8, 13],
    [16, 7],
    [20, 0],
    [11, 2],
    [3, 0],
    [-5, 2],
    [-13, 0],
  ];
  put(umbrella, silhouette(canopy, "#d7ba7f"));
  bar(umbrella, 0.8, 52, 0.8, wood, 0, -25, 0.2);
  for (const x of [-18, -10, 0, 10, 18])
    umbrella.add(
      path(
        [
          new THREE.Vector3(0, 15, 0.3),
          new THREE.Vector3(x * 0.6, 9, 0.3),
          new THREE.Vector3(x, 1, 0.3),
        ],
        0.4,
        "#a17e50",
      ),
    );
  return (time, reduced = false) => {
    const t = reduced ? 0 : time;
    umbrella.rotation.z = Math.sin(t * 0.6) * 0.025;
    players.forEach(({ figure, arms }, i) => {
      figure.rotation.z = Math.sin(t * 0.65 + i * 2) * 0.035;
      arms.forEach(({ shoulder, elbow, control }, j) => {
        shoulder.rotation.z =
          (j ? -0.85 : 0.3) + Math.sin(t * 0.85 + i * 1.7 + j) * 0.32;
        elbow.rotation.z = -0.35 + Math.sin(t * 1.1 + i * 2.3 + j) * 0.28;
        control.rotation.z =
          -shoulder.rotation.z - elbow.rotation.z - figure.rotation.z;
      });
    });
  };
}

const glyphs: [number, number, number, number][][] = [
  [
    [-2, -2, -2, 2],
    [0, -2, 0, 3],
    [2, -2, 2, 2],
    [-2, -2, 2, -2],
  ],
  [
    [-2, -2, -1, 2],
    [0, -2, 0, 2],
    [2, -2, 2, 2],
  ],
  [
    [-2, -2, -2, 2],
    [-2, 2, 2, 2],
    [2, 2, 2, -2],
    [-2, -2, 2, -2],
    [-2, 0, 2, 0],
  ],
  [
    [-2, -2, -1, 2],
    [-1, 2, 2, 2],
    [2, 2, 2, -2],
    [-1, 0, 2, 0],
    [-1, 1, 2, 1],
  ],
  [
    [-2, 2, 2, 2],
    [-2, 0, 2, 0],
    [0, 3, 0, -2],
    [-2, -2, 0, 0],
    [0, 0, 2, -2],
  ],
  [
    [-2, 1, 2, 1],
    [-1, 3, 1, 3],
    [0, 3, 0, -2],
    [-2, -1, 2, -1],
  ],
];

export function bambooScrolls(group: THREE.Group): Animate {
  group.rotation.z = -0.2;
  group.rotation.x = -0.28;
  const closed = put(
    group,
    new THREE.Group(),
    -45,
    43,
    8,
    "closed-bamboo-scroll",
  );
  closed.rotation.z = -0.22;
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * TAU;
    const slat = bar(
      closed,
      3.4,
      66,
      1.7,
      i % 3 ? bamboo : "#d9bd82",
      Math.cos(angle) * 10,
      0,
      Math.sin(angle) * 10,
    );
    slat.rotation.y = -angle + Math.PI / 2;
  }
  for (const y of [-19.8, 19.8]) {
    const tie = put(
      closed,
      mesh(new THREE.TorusGeometry(11.2, 0.65, 6, 48), wood),
      0,
      y,
    );
    tie.rotation.x = Math.PI / 2;
  }
  const knot = put(
    closed,
    mesh(new THREE.TorusGeometry(3.1, 0.65, 6, 24), wood),
    0,
    0,
    12,
  );
  knot.rotation.z = 0.4;
  const open = put(group, new THREE.Group(), 17, 45, -3, "open-bamboo-scroll");
  open.rotation.z = 0.08;
  const width = 15 * 4.6;
  const slats = Array.from({ length: 15 }, (_, i) => {
    const slat = bar(open, 4.1, 68, 2, i % 3 === 0 ? "#d7ba7d" : "#c3a365");
    slat.name = "rolling-bamboo-slat-" + i;
    return slat;
  });
  // The material coordinate stays attached to its slat, whether flat or
  // wrapped around the free edge. No text moves vertically through the mat.
  const sample = (s: number, exposure: number) => {
    const edge = width * exposure,
      excess = Math.max(0, s - edge);
    const pitch = 3.3 / TAU;
    const angle = (Math.sqrt(6.4 * 6.4 + 2 * pitch * excess) - 6.4) / pitch;
    const radius = 6.4 + pitch * angle;
    return {
      x: -34 + Math.min(s, edge) + Math.sin(angle) * radius,
      z: 4 + 6.4 - Math.cos(angle) * radius,
      angle: angle - Math.atan(pitch / radius) * ease(excess / 3),
    };
  };
  const ties = [-22, 22].map((y) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(61 * 6 * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(new Float32Array(61 * 6 * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    const indices: number[] = [];
    for (let row = 0; row < 60; row++)
      for (let side = 0; side < 5; side++) {
        const a = row * 6 + side;
        indices.push(a, a + 6, a + 1, a + 1, a + 6, a + 7);
      }
    geometry.setIndex(indices);
    const tie = put(open, mesh(geometry, wood), 0, y);
    tie.frustumCulled = false;
    return {
      position: geometry.getAttribute("position") as THREE.BufferAttribute,
      normal: geometry.getAttribute("normal") as THREE.BufferAttribute,
    };
  });
  const strokes: {
    slat: number;
    row: number;
    a: number;
    b: number;
    c: number;
    d: number;
  }[] = [];
  for (let column = 0; column < 7; column++)
    for (let row = 0; row < 6; row++)
      for (const [a, b, c, d] of glyphs[(column + row) % glyphs.length])
        strokes.push({ slat: 13 - column * 2, row, a, b, c, d });
  const text = put(
    open,
    new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.55, 0.5),
      matte("#635538"),
      strokes.length,
    ),
    0,
    0,
    0,
    "bamboo-fixed-script",
  );
  text.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  text.frustumCulled = false;
  const stroke = new THREE.Object3D(),
    zRotation = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  return (time, reduced = false) => {
    const phase = time % 4.48;
    // Keep the roll speeds; shorten the previous 11.9s open hold to one fifth.
    const exposure = reduced
      ? 1
      : 1 - ease((phase - 2.38) / 0.6) + ease((phase - 3.28) / 1.2);
    const samples = slats.map((slat, i) => {
      const position = sample((i + 0.5) * 4.6, exposure);
      slat.position.set(position.x, 0, position.z);
      slat.rotation.y = -position.angle;
      return position;
    });
    ties.forEach(({ position, normal }) => {
      for (let row = 0; row <= 60; row++) {
        const point = sample((row / 60) * width, exposure);
        const nx = -Math.sin(point.angle),
          nz = Math.cos(point.angle);
        for (let side = 0; side <= 5; side++) {
          const angle = (side / 5) * TAU;
          const offset = 1.4 + Math.cos(angle) * 0.6;
          position.setXYZ(
            row * 6 + side,
            point.x + nx * offset,
            Math.sin(angle) * 0.6,
            point.z + nz * offset,
          );
          normal.setXYZ(
            row * 6 + side,
            nx * Math.cos(angle),
            Math.sin(angle),
            nz * Math.cos(angle),
          );
        }
      }
      position.needsUpdate = true;
      normal.needsUpdate = true;
    });
    strokes.forEach(({ slat, row, a, b, c, d }, i) => {
      const point = samples[slat],
        x = (a + c) * 0.5;
      const tangentX = Math.cos(point.angle),
        tangentZ = Math.sin(point.angle);
      stroke.position.set(
        point.x + tangentX * x - tangentZ * 1.55,
        -24 + row * 9 + (b + d) * 0.5,
        point.z + tangentZ * x + tangentX * 1.55,
      );
      stroke.rotation.set(0, -point.angle, 0);
      zRotation.setFromAxisAngle(zAxis, Math.atan2(d - b, c - a));
      stroke.quaternion.multiply(zRotation);
      stroke.scale.set(Math.hypot(c - a, d - b), 1, 1);
      stroke.updateMatrix();
      text.setMatrixAt(i, stroke.matrix);
    });
    text.instanceMatrix.needsUpdate = true;
  };
}

function sandHorse(parent: THREE.Group) {
  const horse = put(parent, new THREE.Group(), 0, 0, 0, "sand-table-horse");
  horse.scale.setScalar(0.75);
  const body = put(horse, new THREE.Group());
  const coat = "#774c35",
    mane = "#3c3028";
  const rounded = (
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color = coat,
  ) => {
    const part = put(
      body,
      mesh(new THREE.SphereGeometry(1, 12, 8), color),
      x,
      y,
      z,
    );
    part.scale.set(sx, sy, sz);
    return part;
  };
  rounded(0, 8.7, 0, 4.8, 2.1, 1.65);
  rounded(-3.1, 8.8, 0, 2.2, 2.4, 1.8);
  rounded(3.2, 9.2, 0, 2, 2.7, 1.6);
  const neck = rounded(4.2, 12, 0, 1.45, 3.8, 1.2);
  neck.rotation.z = -0.32;
  rounded(6, 15.1, 0, 2, 1.35, 1.05);
  rounded(7.5, 14.5, 0, 1.1, 0.75, 0.82, "#986c4b");
  for (const side of [-1, 1]) {
    const ear = put(
      body,
      mesh(new THREE.ConeGeometry(0.53, 2, 6), coat),
      5.5,
      17.1,
      side * 0.65,
    );
    ear.rotation.z = -0.2;
    put(
      body,
      mesh(new THREE.SphereGeometry(0.2, 6, 5), "#241e19"),
      6.7,
      15.5,
      side * 0.92,
    );
  }
  body.add(
    path(
      [
        new THREE.Vector3(2.9, 10.1, 0),
        new THREE.Vector3(2.8, 12.2, 0),
        new THREE.Vector3(4.4, 16, 0),
        new THREE.Vector3(5.5, 16.2, 0),
      ],
      0.48,
      mane,
    ),
  );
  const tail = put(body, new THREE.Group(), -4.2, 9.3);
  tail.add(
    path(
      [
        new THREE.Vector3(),
        new THREE.Vector3(-1.9, -0.5, 0),
        new THREE.Vector3(-2.8, -2, 0.3),
        new THREE.Vector3(-3.1, -4.4, 0.5),
      ],
      0.55,
      mane,
    ),
  );
  bar(body, 3.7, 0.7, 3.8, "#a3593e", -0.5, 10.9);
  const legs = [-1, 1].flatMap((side) =>
    [-1, 1].map((end) => {
      const leg = put(
        horse,
        new THREE.Group(),
        end * 2.9,
        8.4,
        side * 1.2,
        `horse-leg-${end}-${side}`,
      );
      const thigh = put(
        leg,
        mesh(new THREE.CylinderGeometry(0.68, 0.4, 3.6, 7), coat),
        0,
        -1.8,
      );
      thigh.rotation.z = end < 0 ? -0.12 : 0;
      const shin = put(leg, new THREE.Group(), 0, -3.6);
      put(
        shin,
        mesh(new THREE.CylinderGeometry(0.37, 0.25, 3.4, 7), coat),
        0,
        -1.7,
      );
      bar(shin, 1.05, 0.7, 0.8, mane, 0.22, -3.5);
      return {
        leg,
        shin,
        phase: (side < 0 ? 0 : 0.55) + (end < 0 ? 2.1 : 0),
        end,
      };
    }),
  );
  return {
    horse,
    animate(time: number, activity: number) {
      const stride = time * 8.8;
      body.position.y = (0.35 + Math.sin(stride * 2) * 0.35) * activity;
      body.rotation.z = Math.sin(stride) * 0.035 * activity;
      tail.rotation.x = Math.sin(time * 3.1) * 0.25;
      tail.rotation.z = Math.sin(stride + 0.7) * 0.12 * activity;
      legs.forEach(({ leg, shin, phase, end }) => {
        const swing = Math.sin(stride + phase);
        leg.rotation.z = swing * 0.7 * activity;
        shin.rotation.z =
          Math.max(0, -swing) * (end < 0 ? -0.9 : 1.05) * activity;
      });
    },
  };
}

export function sandTable(group: THREE.Group): Animate {
  const height = (x: number, z: number) =>
    12 +
    17 * Math.exp(-((x + 28) ** 2 / 180 + (z + 20) ** 2 / 100)) +
    12 * Math.exp(-((x - 25) ** 2 / 150 + (z + 18) ** 2 / 90)) +
    7 * Math.exp(-((x - 32) ** 2 / 180 + (z - 24) ** 2 / 70));
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const columns = 40,
    rows = 30;
  const sand = new THREE.Color("#b8a074"),
    ridge = new THREE.Color("#dbcca3"),
    river = new THREE.Color("#728e84");
  for (let row = 0; row <= rows; row++)
    for (let column = 0; column <= columns; column++) {
      const x = (column / columns - 0.5) * 104,
        z = (row / rows - 0.5) * 76;
      const riverZ = Math.sin(x * 0.065) * 10 + 1;
      const inRiver = Math.abs(z - riverZ) < 3.8;
      const y = inRiver ? 11.7 : height(x, z);
      positions.push(x, y, z);
      const color = inRiver
        ? river
        : sand.clone().lerp(ridge, Math.min(1, (y - 12) / 16));
      colors.push(color.r, color.g, color.b);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column;
        indices.push(
          a,
          a + columns + 1,
          a + 1,
          a + 1,
          a + columns + 1,
          a + columns + 2,
        );
      }
    }
  const terrain = new THREE.BufferGeometry();
  terrain.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  terrain.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  terrain.setIndex(indices);
  terrain.computeVertexNormals();
  put(
    group,
    mesh(terrain, "#ffffff", { vertexColors: true, side: THREE.DoubleSide }),
    0,
    0,
    0,
    "sand-table-terrain",
  );
  bar(group, 111, 8, 83, wood, 0, 6);
  for (const x of [-55, 55]) bar(group, 3, 8, 83, "#9b754c", x, 11);
  for (const z of [-40, 40]) bar(group, 111, 8, 3, "#9b754c", 0, 11, z);
  for (const x of [-43, 43])
    for (const z of [-29, 29]) bar(group, 5, 9, 5, wood, x, -1, z);
  const flags: { attribute: THREE.BufferAttribute; phase: number }[] = [];
  for (const [i, [x, z]] of [
    [-25, -8],
    [23, 22],
    [10, -23],
    [-27, 23],
  ].entries()) {
    const camp = put(
      group,
      new THREE.Group(),
      x,
      height(x, z) + 0.6,
      z,
      `sand-table-camp-${i}`,
    );
    const tent = new THREE.BufferGeometry();
    tent.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [-7, 0, -6, 0, 10, -6, 7, 0, -6, -7, 0, 6, 0, 10, 6, 7, 0, 6],
        3,
      ),
    );
    tent.setIndex([0, 3, 1, 1, 3, 4, 1, 4, 2, 2, 4, 5, 0, 1, 2, 3, 5, 4]);
    tent.computeVertexNormals();
    put(
      camp,
      mesh(tent, i % 2 ? "#b48861" : cream, { side: THREE.DoubleSide }),
    );
    put(
      camp,
      silhouette(
        [
          [-2.7, 0],
          [0, 7],
          [2.7, 0],
        ],
        wood,
      ),
      0,
      0.1,
      6.1,
    );
    bar(camp, 0.8, 26, 0.8, wood, -10, 13, 0);
    const flagGeometry = new THREE.PlaneGeometry(10, 6, 10, 3);
    put(
      camp,
      mesh(flagGeometry, i % 2 ? "#927553" : cinnabar, {
        side: THREE.DoubleSide,
      }),
      -5,
      23,
      0,
      `camp-banner-${i}`,
    );
    flags.push({
      attribute: flagGeometry.getAttribute("position") as THREE.BufferAttribute,
      phase: i * 1.7,
    });
  }
  const routePoints = Array.from({ length: 28 }, (_, i) => {
    const x = -36 + (i / 27) * 71,
      z = 18 + Math.sin((i / 27) * Math.PI) * 10;
    return new THREE.Vector3(x, height(x, z) + 1, z);
  });
  const route = new THREE.CatmullRomCurve3(routePoints);
  group.add(mesh(new THREE.TubeGeometry(route, 40, 0.5, 5), "#a66e45"));
  const token = put(
    group,
    mesh(new THREE.CylinderGeometry(2.4, 2.4, 2.8, 12), cinnabar),
    0,
    0,
    0,
    "sand-table-route-marker",
  );
  const marker = new THREE.Vector3();
  const { horse, animate: gallop } = sandHorse(group);
  const pavilion = put(group, new THREE.Group(), -3, height(-3, 2) + 1, 2);
  for (const x of [-7, 7]) bar(pavilion, 1, 6, 11, wood, x, 2);
  bar(pavilion, 16, 1.5, 12, "#b89b69", 0, 5);
  return (time, reduced = false) => {
    const t = reduced ? 0 : time;
    flags.forEach(({ attribute, phase }) => {
      for (let i = 0; i < attribute.count; i++) {
        const u = (attribute.getX(i) + 5) / 10;
        attribute.setZ(i, Math.sin(u * 5 - t * 2 + phase) * u * 1.2);
      }
      attribute.needsUpdate = true;
    });
    const travel = (1 - Math.cos(t * 0.32)) / 2;
    route.getPointAt(travel, marker);
    token.position.copy(marker);
    token.position.y += 2.3;
    // A continuous patrol in the clear foreground, leaving the camps and river free.
    const angle = t * 0.22 + Math.PI / 2;
    const x = Math.cos(angle) * 39,
      z = 31.5 + Math.sin(angle) * 1.3;
    horse.position.set(x, height(x, z) + 0.1, z);
    horse.rotation.y = -Math.atan2(
      Math.cos(angle) * 1.3,
      -Math.sin(angle) * 39,
    );
    const speed =
      Math.hypot(Math.sin(angle) * 39, Math.cos(angle) * 1.3) * 0.22;
    gallop(t, reduced ? 0 : Math.min(1, speed / 4));
  };
}
