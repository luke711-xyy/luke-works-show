import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { leafEdge, random } from "./motion";
const matte = (
  color: string,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    metalness: 0,
    ...extra,
  });
const mesh = (
  geometry: THREE.BufferGeometry,
  color: string,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
) => new THREE.Mesh(geometry, matte(color, extra));
function ball(radius: number, color: string) {
  return mesh(new THREE.SphereGeometry(radius, 24, 16), color);
}
function rod(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  color: string,
) {
  const line = mesh(
    new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 6),
    color,
  );
  line.position.copy(a).lerp(b, 0.5);
  line.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  return line;
}
function line(points: THREE.Vector3[], color: string, radius: number) {
  return mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      20,
      radius,
      3,
      false,
    ),
    color,
  );
}

export function createLeaf(
  radius: number,
  seed: number,
  color: string,
  veins = true,
  detail: "full" | "compact" = "full",
) {
  const group = new THREE.Group(),
    rng = random(seed),
    positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const rings = detail === "compact" ? 18 : 26,
    segments = detail === "compact" ? 96 : 144,
    base = new THREE.Color(color);
  const height = (a: number, t: number) =>
    radius *
    ((0.13 + 0.11 * (0.5 + 0.5 * Math.sin(seed * 2.1))) * t * t -
      0.05 +
      0.065 * Math.sin(a * 3 + seed) * t ** 4 +
      0.032 * Math.sin(a * 7 + seed * 0.3) * t ** 5 +
      0.023 * Math.sin(a * 9 + seed * 0.7 + t * 2.2) * t ** 1.8 +
      0.006 * Math.sin(a * 19 - seed + t * 4) * t ** 3);
  for (let ring = 0; ring <= rings; ring++)
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        t = ring / rings,
        r = radius * t * leafEdge(a, seed);
      positions.push(Math.cos(a) * r, height(a, t), Math.sin(a) * r);
      const c = base
        .clone()
        .multiplyScalar(
          0.66 +
            0.12 * t +
            0.18 *
              Math.sin(a * 2 + seed + t * 3) *
              Math.cos(a * 3 - seed + t * 4) -
            0.22 * Math.max(0, Math.sin(a * 4 - seed + t * 6)) ** 2 +
            rng() * 0.018,
        );
      colors.push(c.r, c.g, c.b);
      if (ring < rings && i < segments) {
        const k = ring * (segments + 1) + i,
          j = k + segments + 1;
        indices.push(k, k + 1, j, k + 1, j + 1, j);
      }
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Pale wax follows lifted, light-facing folds; the rim is never a flat white ring.
  const normals = geometry.getAttribute("normal"),
    pigment = geometry.getAttribute("color"),
    sun = new THREE.Vector3(-700, 1300, 800).normalize(),
    pale = new THREE.Color("#dcd9cd"),
    normal = new THREE.Vector3();
  for (let ring = 0; ring <= rings; ring++)
    for (let i = 0; i <= segments; i++) {
      const k = ring * (segments + 1) + i,
        a = (i / segments) * Math.PI * 2,
        t = ring / rings,
        exposure = THREE.MathUtils.smoothstep(
          normal.fromBufferAttribute(normals, k).dot(sun),
          0.56,
          0.97,
        ),
        edge = THREE.MathUtils.smoothstep(t, 0.56, 1),
        broadLight = 0.5 + 0.5 * Math.cos(a + 0.87),
        bloom = Math.max(0, Math.sin(a * 2.2 - t * 4 + seed)) ** 2,
        bleach = Math.min(
          0.68,
          edge * (0.13 + (exposure * 0.55 + broadLight * 0.45) * 0.55) +
            bloom * 0.13 * THREE.MathUtils.smoothstep(t, 0.12, 0.68),
        ),
        c = new THREE.Color()
          .fromBufferAttribute(pigment, k)
          .lerp(pale, bleach);
      pigment.setXYZ(k, c.r, c.g, c.b);
    }
  const surface = new THREE.Mesh(
    geometry,
    matte("#ffffff", { vertexColors: true, side: THREE.DoubleSide }),
  );
  surface.castShadow = true;
  surface.receiveShadow = true;
  group.add(surface);
  const shadow = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: "#403c2d",
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  shadow.position.set(radius * 0.045, -16, radius * 0.06);
  shadow.scale.y = 0.05;
  group.add(shadow);
  if (veins) {
    const veinColor = new THREE.Color(color)
      .lerp(new THREE.Color("#c7c7bd"), 0.3)
      .getStyle();
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * Math.PI * 2 + 0.08;
      if (leafEdge(a, seed) < 0.7) continue;
      const pts = Array.from({ length: 7 }, (_, j) => {
        const t = 0.03 + (j / 6) * 0.92,
          theta = a + Math.sin(t * 3 + k) * 0.018;
        const r = radius * t * leafEdge(theta, seed);
        return new THREE.Vector3(
          Math.cos(theta) * r,
          height(theta, t) + 0.7,
          Math.sin(theta) * r,
        );
      });
      group.add(line(pts, veinColor, Math.max(0.65, radius * 0.0035)));
      if (radius > 120 && k % 2 === 0)
        for (const sign of [-1, 1]) {
          const start = pts[3],
            endAngle = a + sign * 0.16,
            r = radius * 0.89 * leafEdge(endAngle, seed);
          group.add(
            line(
              [
                start,
                start
                  .clone()
                  .lerp(
                    new THREE.Vector3(
                      Math.cos(endAngle) * r,
                      height(endAngle, 0.89) + 0.8,
                      Math.sin(endAngle) * r,
                    ),
                    0.5,
                  ),
                new THREE.Vector3(
                  Math.cos(endAngle) * r,
                  height(endAngle, 0.89) + 0.8,
                  Math.sin(endAngle) * r,
                ),
              ],
              veinColor,
              Math.max(0.4, radius * 0.002),
            ),
          );
        }
    }
  }
  const details = group.children.filter(
    (o) => o !== surface && o !== shadow,
  ) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[];
  const merged = details.length
    ? mergeGeometries(details.map((o) => o.geometry))
    : null;
  if (merged) {
    group.remove(...details);
    details.forEach((o) => {
      o.geometry.dispose();
      o.material.dispose();
    });
    group.add(
      new THREE.Mesh(
        merged,
        matte(
          new THREE.Color(color)
            .lerp(new THREE.Color("#c7c7bd"), 0.3)
            .getStyle(),
        ),
      ),
    );
  }
  const contour = Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2,
      r = radius * leafEdge(a, seed);
    return new THREE.Vector3(Math.cos(a) * r, height(a, 1), Math.sin(a) * r);
  });
  return { group, surface, contour };
}

function petal(length: number, width: number, rise: number, color: string) {
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [],
    base = new THREE.Color("#f2eee8"),
    tip = new THREE.Color(color);
  const n = 20,
    m = 10;
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= m; j++) {
      const t = i / n,
        v = (j / m) * 2 - 1;
      positions.push(
        t * length,
        Math.sin(t * 1.5) * rise +
          v * v * rise * (0.25 + t * 0.2) +
          Math.sin(t * Math.PI) * Math.sin(t * 9 + v * 3) * rise * 0.04,
        v * Math.sin(Math.PI * t) ** 0.75 * width,
      );
      const pigment =
          THREE.MathUtils.smoothstep(t, 0.38, 1) * 0.91 +
          v * v * 0.17 * THREE.MathUtils.smoothstep(t, 0.15, 0.95),
        c = base.clone().lerp(tip, Math.min(1, pigment));
      c.multiplyScalar(0.98 + Math.cos(v * 22 + t * 3) * 0.018);
      colors.push(c.r, c.g, c.b);
      if (i < n && j < m) {
        const k = i * (m + 1) + j;
        indices.push(k, k + 1, k + m + 1, k + 1, k + m + 2, k + m + 1);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const surface = new THREE.Mesh(
    g,
    matte("#ffffff", { vertexColors: true, side: THREE.DoubleSide }),
  );
  surface.castShadow = true;
  surface.receiveShadow = true;
  return surface;
}
export function createFlower(
  radius: number,
  seed: number,
  stage: "open" | "bud" = "open",
) {
  const group = new THREE.Group();
  if (stage === "bud") {
    group.add(
      line(
        [
          new THREE.Vector3(radius * 0.12, -radius * 1.65, 0),
          new THREE.Vector3(-radius * 0.08, -radius * 0.45, radius * 0.06),
          new THREE.Vector3(0, radius * 0.38, 0),
        ],
        "#64614e",
        radius * 0.045,
      ),
    );
    for (let panel = 0; panel < 8; panel++) {
      const positions: number[] = [],
        colors: number[] = [],
        indices: number[] = [],
        pale = new THREE.Color("#e7decb"),
        rose = new THREE.Color("#a57b94"),
        n = 22,
        m = 8;
      for (let i = 0; i <= n; i++)
        for (let j = 0; j <= m; j++) {
          const t = i / n,
            v = j / m,
            a = ((panel + (v - 0.5) * 1.12) / 8) * Math.PI * 2 + seed,
            r =
              radius *
              0.62 *
              Math.sin(Math.PI * t) ** 0.7 *
              (1.18 - t * 0.32) *
              (1 + Math.sin(v * Math.PI) * 0.045),
            c = pale
              .clone()
              .lerp(
                rose,
                0.15 + THREE.MathUtils.smoothstep(t, 0.2, 0.97) * 0.8,
              );
          c.multiplyScalar(0.84 + Math.sin(v * Math.PI) * 0.16);
          positions.push(
            Math.cos(a) * r,
            radius * (0.3 + t * 3.1),
            Math.sin(a) * r,
          );
          colors.push(c.r, c.g, c.b);
          if (i < n && j < m) {
            const k = i * (m + 1) + j;
            indices.push(k, k + 1, k + m + 1, k + 1, k + m + 2, k + m + 1);
          }
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      const p = new THREE.Mesh(
        g,
        matte("#ffffff", { vertexColors: true, side: THREE.DoubleSide }),
      );
      p.castShadow = p.receiveShadow = true;
      group.add(p);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + seed,
        sepal = mesh(
          new THREE.ConeGeometry(radius * 0.13, radius * 1.04, 4),
          "#72705b",
        );
      sepal.position.set(
        Math.cos(a) * radius * 0.43,
        radius * 0.65,
        Math.sin(a) * radius * 0.43,
      );
      sepal.rotation.z = Math.cos(a) * 0.32;
      sepal.rotation.x = Math.sin(a) * 0.32;
      group.add(sepal);
    }
    for (const part of group.children) part.position.y += radius * 1.75;
    return group;
  }
  group.add(
    rod(
      new THREE.Vector3(0, -40, 0),
      new THREE.Vector3(0, 14, 0),
      radius * 0.03,
      "#61674b",
    ),
  );
  for (let tier = 0; tier < 3; tier++) {
    const count = tier === 0 ? 10 : tier === 1 ? 8 : 6;
    for (let k = 0; k < count; k++) {
      const p = petal(
        radius * (1 - tier * 0.16),
        radius * (0.27 - tier * 0.035),
        radius * (0.25 + tier * 0.18),
        tier === 0 ? "#a87898" : "#b583a0",
      );
      const a = (k / count) * Math.PI * 2 + tier * 0.34 + seed;
      p.rotation.y = a;
      p.position.set(Math.cos(a) * 3, 12 + tier * 3, -Math.sin(a) * 3);
      group.add(p);
    }
  }
  const pod = mesh(new THREE.SphereGeometry(radius * 0.23, 20, 10), "#b9a668");
  pod.scale.y = 0.35;
  pod.position.y = 24;
  group.add(pod);
  for (let i = 0; i < 15; i++) {
    const a = i * 2.4,
      r = radius * 0.16 * Math.sqrt(i / 15),
      dot = ball(radius * 0.018, "#695b36");
    dot.position.set(Math.cos(a) * r, 24 + radius * 0.075, Math.sin(a) * r);
    group.add(dot);
  }
  return group;
}

export function createKoi(length: number, seed: number) {
  const group = new THREE.Group(),
    width = length * 0.145,
    positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [],
    rng = random(seed);
  const n = 48,
    m = 24,
    patch = rng() * 10,
    warm = seed % 3 === 0 ? "#cda153" : seed % 3 === 1 ? "#b74730" : "#ce7135";
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= m; j++) {
      const t = i / n,
        a = (j / m) * Math.PI * 2,
        r =
          width *
          (Math.sin(Math.PI * t) ** 0.75 * (0.72 + 0.3 * t) +
            0.3 * THREE.MathUtils.smoothstep(t, 0.76, 1) +
            0.055 * (1 - t));
      positions.push(
        (t - 0.5 + 0.01 * THREE.MathUtils.smoothstep(t, 0.82, 1)) * length,
        Math.cos(a) * r * (0.58 + t * 0.08),
        Math.sin(a) * r,
      );
      const pattern =
        Math.sin(t * 17 + patch + Math.sin(a * 3) * 1.6) +
        0.7 * Math.cos(t * 27 - a * 2 + patch);
      const c = new THREE.Color(pattern > -0.12 ? warm : "#eaddbb");
      if (t > 0.86)
        c.lerp(
          new THREE.Color("#eaddbb"),
          THREE.MathUtils.smoothstep(t, 0.86, 1) * 0.36,
        );
      c.multiplyScalar(0.9 + Math.cos(a) * 0.1);
      colors.push(c.r, c.g, c.b);
      if (i < n && j < m) {
        const k = i * (m + 1) + j;
        indices.push(k, k + 1, k + m + 1, k + 1, k + m + 2, k + m + 1);
      }
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const body = new THREE.Mesh(
    geometry,
    matte("#ffffff", { vertexColors: true }),
  );
  body.name = "koi-body";
  group.add(body);
  // The head stays rigid internally, but is no longer pinned in space. Keep
  // all facial details on the same pivot as the front of the body surface.
  const headPivot = length * 0.18;
  const head = new THREE.Group(),
    headFeatures = new THREE.Group();
  head.name = "koi-head";
  head.position.x = headPivot;
  headFeatures.position.x = -headPivot;
  head.add(headFeatures);
  group.add(head);
  const finMat = matte("#e3dbc5", {
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const fin = (shape: THREE.Shape, name: string) => {
    const object = new THREE.Mesh(new THREE.ShapeGeometry(shape), finMat);
    object.name = name;
    object.rotation.x = Math.PI / 2;
    return object;
  };
  const rays = (
    curves: THREE.Vector3[][],
    color: string,
    opacity = 0.38,
    ink?: "edge" | "ray",
  ) => {
    const parts = curves.map(
      (points) =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          16,
          length * (ink === "edge" ? 0.0022 : 0.0014),
          3,
          false,
        ),
    );
    const geometry = mergeGeometries(parts)!;
    parts.forEach((part) => part.dispose());
    return new THREE.Mesh(
      geometry,
      ink
        ? new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            depthWrite: false,
          })
        : matte(color, { transparent: true, opacity, depthWrite: false }),
    );
  };
  const finEdge = (shape: THREE.Shape, name: string, vertical = false) => {
    const edge = rays(
      [
        shape
          .getSpacedPoints(80)
          .map((p) =>
            vertical
              ? new THREE.Vector3(p.x, p.y, 0.18)
              : new THREE.Vector3(p.x, 0.18, p.y),
          ),
      ],
      "#726b5a",
      0.48,
      "edge",
    );
    edge.name = `${name}-edge`;
    return edge;
  };
  const pectorals: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(length * 0.14, side * width * 0.56);
    shape.quadraticCurveTo(
      length * 0.16,
      side * width * 1.65,
      -length * 0.035,
      side * width * 2.03,
    );
    shape.quadraticCurveTo(
      -length * 0.11,
      side * width * 2.05,
      -length * 0.18,
      side * width * 1.38,
    );
    shape.quadraticCurveTo(
      -length * 0.09,
      side * width * 0.94,
      length * 0.025,
      side * width * 0.52,
    );
    shape.closePath();
    const fan = new THREE.Group();
    fan.position.y = -width * 0.15;
    const name = side < 0 ? "pectoral-left" : "pectoral-right";
    fan.add(fin(shape, name), finEdge(shape, name));
    const finRays = rays(
      Array.from({ length: 7 }, (_, k) => [
        new THREE.Vector3(length * 0.12, 0.25, side * width * 0.65),
        new THREE.Vector3(
          length * (0.035 - k * 0.012),
          0.3,
          side * width * (1.18 + k * 0.055),
        ),
        new THREE.Vector3(
          length * (0.015 - k * 0.027),
          0.25,
          side * width * (1.96 - k * 0.077),
        ),
      ]),
      "#827862",
      0.32,
      "ray",
    );
    finRays.name = `${name}-rays`;
    fan.add(finRays);
    group.add(fan);
    pectorals.push(fan);

    const eye = new THREE.Group();
    eye.name = side < 0 ? "eye-left" : "eye-right";
    eye.position.set(length * 0.365, width * 0.29, side * width * 0.53);
    eye.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0.2, 0.66, side * 0.73).normalize(),
    );
    const sclera = ball(length * 0.031, "#cfc3a0");
    sclera.scale.set(1, 0.88, 0.67);
    eye.add(sclera);
    const iris = ball(length * 0.0225, "#9d8755");
    iris.scale.z = 0.35;
    iris.position.z = length * 0.015;
    eye.add(iris);
    const pupil = ball(length * 0.0108, "#171e1b");
    pupil.scale.set(0.88, 1, 0.34);
    pupil.position.z = length * 0.021;
    eye.add(pupil);
    const cornea = ball(length * 0.025, "#fff6da");
    cornea.scale.z = 0.22;
    cornea.position.z = length * 0.02;
    (cornea.material as THREE.MeshStandardMaterial).transparent = true;
    (cornea.material as THREE.MeshStandardMaterial).opacity = 0.12;
    (cornea.material as THREE.MeshStandardMaterial).depthWrite = false;
    (cornea.material as THREE.MeshStandardMaterial).roughness = 0.18;
    eye.add(cornea);
    const glint = ball(length * 0.0065, "#fff8e6");
    glint.position.set(-length * 0.005, length * 0.006, length * 0.027);
    eye.add(glint);
    headFeatures.add(eye);
    headFeatures.add(
      rays(
        [
          [
            new THREE.Vector3(length * 0.24, width * 0.46, side * width * 0.38),
            new THREE.Vector3(
              length * 0.225,
              width * 0.12,
              side * width * 0.77,
            ),
            new THREE.Vector3(length * 0.2, -width * 0.16, side * width * 0.81),
          ],
        ],
        "#806e52",
        0.42,
      ),
    );
  }
  const tail = new THREE.Group();
  tail.position.x = -length * 0.44;
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.quadraticCurveTo(
    -length * 0.1,
    -width * 0.82,
    -length * 0.24,
    -width * 1.47,
  );
  tailShape.quadraticCurveTo(
    -length * 0.31,
    -width * 1.5,
    -length * 0.275,
    -width * 0.62,
  );
  tailShape.quadraticCurveTo(-length * 0.24, -width * 0.25, -length * 0.19, 0);
  tailShape.quadraticCurveTo(
    -length * 0.24,
    width * 0.25,
    -length * 0.275,
    width * 0.62,
  );
  tailShape.quadraticCurveTo(
    -length * 0.31,
    width * 1.5,
    -length * 0.24,
    width * 1.47,
  );
  tailShape.quadraticCurveTo(-length * 0.1, width * 0.82, 0, 0);
  tailShape.closePath();
  tail.add(
    fin(tailShape, "tail-membrane"),
    finEdge(tailShape, "tail-membrane"),
  );
  group.add(tail);
  const tailRays = rays(
    Array.from({ length: 11 }, (_, k) => {
      const f = (k - 5) / 5;
      return [
        new THREE.Vector3(0, 0.25, 0),
        new THREE.Vector3(-length * 0.12, 0.3, f * width * 0.65),
        new THREE.Vector3(
          -length * (0.19 + Math.abs(f) * 0.07),
          0.25,
          f * width * 1.38,
        ),
      ];
    }),
    "#827862",
    0.32,
    "ray",
  );
  tailRays.name = "tail-membrane-rays";
  tail.add(tailRays);
  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(-length * 0.28, width * 0.38);
  dorsalShape.quadraticCurveTo(
    -length * 0.23,
    width * 1.5,
    -length * 0.12,
    width * 1.29,
  );
  dorsalShape.quadraticCurveTo(
    length * 0.04,
    width * 1.1,
    length * 0.2,
    width * 0.5,
  );
  dorsalShape.quadraticCurveTo(
    -length * 0.03,
    width * 0.62,
    -length * 0.28,
    width * 0.38,
  );
  const dorsal = new THREE.Group(),
    dorsalFin = new THREE.Mesh(
      new THREE.ShapeGeometry(dorsalShape),
      finMat.clone(),
    );
  dorsalFin.name = "dorsal-fin";
  dorsalFin.material.opacity = 0.45;
  dorsal.add(dorsalFin, finEdge(dorsalShape, "dorsal-fin", true));
  const dorsalRays = rays(
    [
      ...Array.from({ length: 7 }, (_, i) => {
        const t = i / 6;
        return [
          new THREE.Vector3(
            length * (-0.25 + t * 0.4),
            width * (0.43 + 0.15 * Math.sin(t * Math.PI)),
            0,
          ),
          new THREE.Vector3(
            length * (-0.21 + t * 0.37),
            width * (1.3 - t * 0.66),
            0,
          ),
        ];
      }),
    ],
    "#827862",
    0.32,
    "ray",
  );
  dorsalRays.name = "dorsal-fin-rays";
  dorsal.add(dorsalRays);
  group.add(dorsal);

  const mouth = new THREE.Group();
  mouth.name = "mouth";
  mouth.position.set(length * 0.5, -width * 0.04, 0);
  mouth.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(-0.51, 0.86, 0).normalize(),
      new THREE.Vector3(0.86, 0.51, 0).normalize(),
    ),
  );
  const lipGeometry = new THREE.TorusGeometry(
    length * 0.026,
    length * 0.005,
    8,
    40,
  );
  lipGeometry.scale(1.2, 0.55, 1);
  mouth.add(mesh(lipGeometry, "#d9b99a"));
  const opening = mesh(
    new THREE.CircleGeometry(length * 0.0235, 40),
    "#655b4b",
    { side: THREE.DoubleSide },
  );
  opening.scale.set(1.18, 0.54, 1);
  opening.position.z = -length * 0.002;
  mouth.add(opening);
  headFeatures.add(mouth);
  for (const side of [-1, 1])
    headFeatures.add(
      rays(
        [
          [
            new THREE.Vector3(
              length * 0.497,
              -width * 0.025,
              side * width * 0.28,
            ),
            new THREE.Vector3(
              length * 0.52,
              -width * 0.04,
              side * width * 0.44,
            ),
            new THREE.Vector3(
              length * 0.505,
              -width * 0.09,
              side * width * 0.56,
            ),
          ],
        ],
        "#d9c9a4",
        0.62,
      ),
    );

  const base = new Float32Array(geometry.getAttribute("position").array);
  const dorsalParts: {
    attribute: THREE.BufferAttribute;
    base: Float32Array;
  }[] = [];
  dorsal.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const attribute = object.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      dorsalParts.push({ attribute, base: new Float32Array(attribute.array) });
    }
  });
  return {
    group,
    body,
    length,
    animate(time: number, activity = 1, turnRate = 0) {
      const attribute = geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      const bend = THREE.MathUtils.clamp(turnRate, -0.8, 0.8) * length * 0.24;
      const spine = (t: number) =>
        (Math.sin(time * 4.4 - t * 7) * (1 - t) ** 2 * width * 0.35 +
          bend * THREE.MathUtils.clamp((0.78 - t) / 0.78, 0, 1) ** 2) *
        activity;
      // A small phase-linked yaw and turn lead, blended continuously through
      // the neck. The front stays rigid so eyes, lips, gills and barbels cannot
      // slide off its surface. Rear undulation and the swim path are unchanged.
      const headAngle =
        -(
          Math.sin(time * 4.4 - 1.8) * 0.045 +
          THREE.MathUtils.clamp(turnRate, -0.8, 0.8) * 0.055
        ) * activity;
      head.rotation.y = headAngle;
      const deform = (
        target: THREE.BufferAttribute,
        rest: Float32Array,
        i: number,
      ) => {
        const x = rest[i * 3],
          z = rest[i * 3 + 2];
        const t = x / length + 0.5;
        const weight = THREE.MathUtils.smoothstep(t, 0.52, 0.7);
        const a = headAngle * weight,
          c = Math.cos(a),
          s = Math.sin(a);
        target.setX(i, headPivot + (x - headPivot) * c + z * s);
        target.setZ(i, z * c - (x - headPivot) * s + spine(t) * (1 - weight));
      };
      for (let i = 0; i < attribute.count; i++) deform(attribute, base, i);
      attribute.needsUpdate = true;
      tail.position.z = spine(0.06);
      tail.rotation.y = -Math.atan2(spine(0.07) - spine(0.05), length * 0.02);
      pectorals.forEach(
        (fin, i) =>
          (fin.rotation.y =
            (Math.sin(time * 3.1 + i * 0.8) * 0.07 +
              THREE.MathUtils.clamp(turnRate, -0.8, 0.8) * (i ? 0.14 : -0.14)) *
            activity),
      );
      for (const part of dorsalParts) {
        for (let i = 0; i < part.attribute.count; i++)
          deform(part.attribute, part.base, i);
        part.attribute.needsUpdate = true;
      }
      mouth.scale.y = 1 + Math.sin(time * 1.6) * 0.045 * activity;
    },
  };
}

export { createEmblem } from "./emblems";
