import * as THREE from "three";

const TAU = Math.PI * 2;
const bronze = "#9d8557",
  edge = "#c0a16c",
  dark = "#66573c";
const smooth = (value: number) => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const material = (color: string) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0.12,
  });
function put<T extends THREE.Object3D>(
  parent: THREE.Object3D,
  object: T,
  x = 0,
  y = 0,
  z = 0,
  name?: string,
) {
  object.position.set(x, y, z);
  if (name) object.name = name;
  parent.add(object);
  return object;
}
function mesh(geometry: THREE.BufferGeometry, color = bronze) {
  return new THREE.Mesh(geometry, material(color));
}
function block(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color = dark,
) {
  return put(parent, mesh(new THREE.BoxGeometry(w, h, d), color), x, y, z);
}
function pipe(points: THREE.Vector3[], radius: number, color = bronze) {
  return mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, radius, 8),
    color,
  );
}

function vessel(parent: THREE.Group, index: number) {
  const pot = put(
    parent,
    new THREE.Group(),
    -42 + index * 28,
    94 - index * 30,
    0,
    `clepsydra-vessel-${index}`,
  );
  // A tapered copper body with a genuine inner wall, floor and rolled lip.
  const body = new THREE.LatheGeometry(
    [
      [0, 0],
      [9.4, 0],
      [10.3, 1.5],
      [12.8, 21],
      [13.3, 22],
      [13.3, 23],
      [12.2, 23],
      [12, 21.7],
      [9.6, 2.1],
      [0, 2.1],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    40,
  );
  const vertices = body.getAttribute("position"),
    colors: number[] = [];
  const copper = new THREE.Color(bronze),
    patina = new THREE.Color("#687c68"),
    tone = new THREE.Color();
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      y = vertices.getY(i),
      z = vertices.getZ(i);
    const stain =
      0.28 +
      0.22 *
        Math.sin(x * 0.7 + z * 0.8 + y * 0.37) *
        Math.sin(y * 1.1 - z * 0.5);
    tone
      .copy(copper)
      .lerp(patina, stain)
      .multiplyScalar(0.94 + Math.sin(y * 2.8) * 0.035);
    colors.push(tone.r, tone.g, tone.b);
  }
  body.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const shell = put(
    pot,
    mesh(body, "#ffffff"),
    0,
    0,
    0,
    `clepsydra-copper-body-${index}`,
  );
  shell.material.vertexColors = true;
  for (const [radius, y] of [
    [10.5, 2.8],
    [11.4, 12.5],
    [11.5, 13.7],
    [13, 22.5],
  ]) {
    const ring = put(
      pot,
      mesh(new THREE.TorusGeometry(radius, 0.35, 6, 48), edge),
      0,
      y,
    );
    ring.rotation.x = Math.PI / 2;
  }
  // Sun, crescent and seven-star reliefs distinguish the three supply vessels.
  if (index === 0) {
    put(pot, mesh(new THREE.TorusGeometry(2.7, 0.3, 6, 32), edge), 0, 17, 12.4);
    put(
      pot,
      mesh(new THREE.SphereGeometry(1.4, 10, 6), edge),
      0,
      17,
      12.4,
    ).scale.z = 0.3;
  } else if (index === 1) {
    const moon = new THREE.Shape();
    moon.moveTo(0.9, 2.9);
    moon.bezierCurveTo(-4, 2.8, -4, -2.8, 0.9, -2.9);
    moon.bezierCurveTo(-1.3, -1.2, -1.3, 1.2, 0.9, 2.9);
    put(
      pot,
      mesh(
        new THREE.ExtrudeGeometry(moon, { depth: 0.35, bevelEnabled: false }),
        edge,
      ),
      0,
      17,
      12.2,
    );
  } else if (index === 2) {
    const stars = [
      [-4, 1.8],
      [-2.2, 2.2],
      [-0.5, 0.8],
      [1.6, 1],
      [2.7, -0.8],
      [1.1, -2.3],
      [-0.8, -1.7],
    ];
    stars.forEach(([x, y]) =>
      put(
        pot,
        mesh(new THREE.SphereGeometry(0.45, 6, 5), edge),
        x,
        17 + y,
        12.3,
      ),
    );
  }
  const water = put(
    pot,
    mesh(new THREE.CircleGeometry(10.4, 40), "#8caa96"),
    0,
    18.3,
    0,
    `clepsydra-water-${index}`,
  );
  water.rotation.x = -Math.PI / 2;
  let outlet: THREE.Object3D | undefined;
  if (index < 3) {
    pot.add(
      pipe(
        [
          new THREE.Vector3(9.5, 6, 0),
          new THREE.Vector3(14, 6.7, 0),
          new THREE.Vector3(21.8, 5.5, 0),
          new THREE.Vector3(25, 4.5, 0),
        ],
        1,
      ),
    );
    const head = put(pot, mesh(new THREE.SphereGeometry(1, 12, 8)), 22.1, 5.8);
    head.scale.set(3.1, 1.8, 1.5);
    for (const side of [-1, 1]) {
      put(
        pot,
        mesh(new THREE.SphereGeometry(0.38, 6, 5), dark),
        22.7,
        6.8,
        side * 1.35,
      );
      const horn = put(
        pot,
        mesh(new THREE.ConeGeometry(0.55, 2.8, 6), edge),
        20.8,
        8.1,
        side * 0.9,
      );
      horn.rotation.z = 0.4;
    }
    const mouth = put(
      pot,
      mesh(new THREE.TorusGeometry(0.85, 0.35, 6, 20), dark),
      25.1,
      4.5,
    );
    mouth.rotation.y = Math.PI / 2;
    outlet = put(
      pot,
      new THREE.Object3D(),
      25.5,
      4.4,
      0,
      `clepsydra-outlet-${index}`,
    );
  }
  const radiusScale = [1.15, 1.03, 0.95, 0.85][index];
  const heightScale = index === 3 ? 1.35 : 1.15;
  const proportions = new THREE.Matrix4().makeScale(
    radiusScale,
    heightScale,
    radiusScale,
  );
  pot.children.forEach((part) => part.applyMatrix4(proportions));
  return { pot, water, outlet, radiusScale, heightScale };
}

/** A small interpretation of the four-vessel, floating-arrow Chinese water clock. */
export function clepsydra(group: THREE.Group) {
  block(group, 0, 2, 4, 124, 4, 55, "#69513a");
  block(group, 0, 4.4, -19, 124, 1.2, 2, "#c2a16b");
  for (let i = 0; i < 3; i++) {
    const x = -42 + i * 28,
      top = 94 - i * 30;
    block(group, x, (top + 4) / 2, -4, 28, top - 4, 29, "#aa8759");
    block(group, x, top - 0.8, -4, 29, 1.6, 31, "#77573b");
    block(group, x - 13.6, (top + 4) / 2, 10.8, 1, top - 4, 1.2, "#74513a");
  }
  const vessels = Array.from({ length: 4 }, (_, i) => vessel(group, i));
  const receiver = vessels[3].pot;
  const ruler = put(
    receiver,
    new THREE.Group(),
    4,
    22,
    -1,
    "clepsydra-time-ruler",
  );
  block(ruler, 0, 21, 0, 2.8, 44, 1.2, edge);
  for (let i = 0; i < 12; i++)
    block(
      ruler,
      i % 3 === 0 ? -0.2 : 0.3,
      2 + i * 3.5,
      0.7,
      i % 3 === 0 ? 2.7 : 1.7,
      0.35,
      0.3,
      dark,
    );
  const arrow = put(
    receiver,
    new THREE.Group(),
    0,
    0,
    1,
    "clepsydra-float-arrow",
  );
  put(arrow, mesh(new THREE.CylinderGeometry(6.8, 6.8, 0.8, 24), "#a78659"));
  block(arrow, 0, 16, 0, 1.3, 32, 1.2, "#614832");
  block(arrow, 1.7, 32, 0, 5.2, 1, 1.3, "#d0b77d");

  const dropGeometry = new THREE.SphereGeometry(0.65, 7, 5);
  const dropMaterial = new THREE.MeshBasicMaterial({ color: "#dee6cc" });
  const drops = Array.from({ length: 3 }, (_, i) => {
    const mesh = put(
      group,
      new THREE.InstancedMesh(dropGeometry, dropMaterial, 8),
      0,
      0,
      0,
      `clepsydra-drops-${i}`,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    return mesh;
  });
  const ripples = vessels.slice(1).map(({ water }, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.08, 5, 36),
      new THREE.MeshBasicMaterial({
        color: "#e2dfbe",
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    // A water-local XY plane follows the receiving surface as it rises.
    return put(water, ring, -3, 0, 0.06, `clepsydra-ripple-${i}`);
  });
  // A small lower tap and catch tray make the loop's emptying leg explicit.
  receiver.add(
    pipe(
      [
        new THREE.Vector3(0, 5, 9.5),
        new THREE.Vector3(0, 5.3, 15),
        new THREE.Vector3(0, 4.2, 19),
      ],
      0.8,
    ),
  );
  const tap = block(receiver, 0, 7, 14, 5.2, 0.8, 1, edge);
  block(group, 42, 4.8, 22, 29, 1.5, 16, bronze);
  block(group, 42, 5.7, 22, 25, 0.25, 12, "#8caa96");
  const drainingDrops = put(
    group,
    new THREE.InstancedMesh(dropGeometry, dropMaterial, 4),
    0,
    0,
    0,
    "clepsydra-draining-drops",
  );
  drainingDrops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  drainingDrops.frustumCulled = false;
  const instance = new THREE.Object3D();
  return (time: number, reduced = false) => {
    const t = reduced ? 9 : time,
      phase = ((t % 22) + 22) % 22;
    const emptying = phase > 19.5;
    const progress = phase < 18 ? phase / 18 : 1 - smooth((phase - 19.5) / 2.5);
    const level = 8 + progress * 18;
    vessels[3].water.position.y = level;
    vessels[3].water.scale.setScalar(
      ((9.6 + (level / vessels[3].heightScale - 2.1) * (2.4 / 19.6)) *
        vessels[3].radiusScale) /
        10.4,
    );
    arrow.position.y = level + 1;
    drops.forEach((mesh, i) => {
      mesh.visible = phase < 18 && !reduced;
      const source = vessels[i].pot.position,
        outlet = vessels[i].outlet!.position,
        target = vessels[i + 1];
      for (let j = 0; j < mesh.count; j++) {
        const age = (t * 1.25 + j / mesh.count + i * 0.27) % 1;
        instance.position.set(
          source.x + outlet.x,
          THREE.MathUtils.lerp(
            source.y + outlet.y,
            target.pot.position.y + target.water.position.y,
            age * age,
          ),
          0,
        );
        instance.scale.set(0.8, 1.1 + age * 0.8, 0.8);
        instance.updateMatrix();
        mesh.setMatrixAt(j, instance.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
    ripples.forEach((ring, i) => {
      const age = (t * 1.1 + i * 0.3) % 1;
      ring.position.x =
        (vessels[i].pot.position.x +
          vessels[i].outlet!.position.x -
          vessels[i + 1].pot.position.x) /
        vessels[i + 1].water.scale.x;
      ring.visible = phase < 18 && !reduced;
      ring.scale.setScalar(0.8 + age * 5);
      ring.material.opacity = (1 - age) * 0.5;
    });
    drainingDrops.visible = emptying && !reduced;
    tap.rotation.y = emptying
      ? (Math.PI / 2) * Math.sin((Math.PI * (phase - 19.5)) / 2.5)
      : 0;
    for (let i = 0; i < drainingDrops.count; i++) {
      const age = (t * 1.8 + i / drainingDrops.count) % 1;
      instance.position.set(42, 8.2 - age * age * 2.4, 19);
      instance.scale.set(0.7, 1.2, 0.7);
      instance.updateMatrix();
      drainingDrops.setMatrixAt(i, instance.matrix);
    }
    drainingDrops.instanceMatrix.needsUpdate = true;
  };
}
