import * as THREE from "three";

const TAU = Math.PI * 2;
const bronze = "#a79b65",
  wood = "#84533f",
  cord = "#675139";
const matte = (
  color: string,
  extra: THREE.MeshStandardMaterialParameters = {},
) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    ...extra,
  });
const mesh = (geometry: THREE.BufferGeometry, color: string) =>
  new THREE.Mesh(geometry, matte(color));
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
function beam(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color = wood,
) {
  return put(parent, mesh(new THREE.BoxGeometry(w, h, d), color), x, y, z);
}

export const CHIME_BEAT = 1.7;
export const CHIME_CONTACT = 0.76;

export function chimeMotion(time: number) {
  const beat = Math.floor(time / CHIME_BEAT);
  const phase = time - beat * CHIME_BEAT;
  const smooth = (p: number) => {
    const t = THREE.MathUtils.clamp(p, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const previous = ((beat + 4) % 5) * 20 - 40,
    next = (beat % 5) * 20 - 40;
  const x = THREE.MathUtils.lerp(previous, next, smooth(phase / 0.35));
  const angle =
    phase < CHIME_CONTACT
      ? THREE.MathUtils.lerp(
          0.32,
          -0.4,
          smooth((phase - 0.38) / (CHIME_CONTACT - 0.38)),
        )
      : THREE.MathUtils.lerp(-0.4, 0.32, smooth((phase - CHIME_CONTACT) / 0.5));
  return { index: beat % 5, x, angle, phase };
}

export function ancientMusic(group: THREE.Group) {
  const rack = put(group, new THREE.Group(), 0, 0, -17, "bronze-chime-rack");
  for (const x of [-56, 56]) {
    beam(rack, x, 47, 0, 4, 91, 5);
    beam(rack, x, 3, 0, 15, 5, 21);
    const cap = put(
      rack,
      mesh(new THREE.SphereGeometry(3.7, 12, 8), "#b99558"),
      x,
      96,
    );
    cap.scale.y = 0.65;
  }
  beam(rack, 0, 91, 0, 119, 5, 7);
  beam(rack, 0, 82, 0, 109, 2, 3, "#ad8654");
  const bells = Array.from({ length: 5 }, (_, i) => {
    const bell = put(
      rack,
      new THREE.Group(),
      -40 + i * 20,
      84,
      0,
      `chime-bell-${i}`,
    );
    const height = 31 - i * 2.6,
      radius = 8.3 - i * 0.55;
    const profile = [
      new THREE.Vector2(radius, -height),
      new THREE.Vector2(radius * 1.04, -height + 1.5),
      new THREE.Vector2(radius * 0.78, -height * 0.44),
      new THREE.Vector2(radius * 0.67, -6),
      new THREE.Vector2(radius * 0.5, -3),
      new THREE.Vector2(0, -2.4),
    ];
    const body = put(
      bell,
      mesh(new THREE.LatheGeometry(profile, 32), bronze),
      0,
      0,
      0,
      `chime-body-${i}`,
    );
    body.scale.z = 0.68;
    body.material.metalness = 0.18;
    body.material.side = THREE.DoubleSide;
    const mouth = put(
      bell,
      mesh(new THREE.TorusGeometry(radius, 0.65, 6, 40), "#bfab70"),
      0,
      -height,
    );
    mouth.rotation.x = Math.PI / 2;
    mouth.scale.y = 0.68;
    const hanger = put(
      bell,
      mesh(new THREE.TorusGeometry(2.8, 0.8, 6, 24), cord),
      0,
      -0.6,
    );
    hanger.scale.y = 1.3;
    for (const side of [-1, 1]) {
      const ridge = put(
        bell,
        mesh(new THREE.CylinderGeometry(0.55, 0.55, height - 9, 6), "#827c50"),
        side * 1.3,
        -(height + 5) / 2,
        radius * 0.6,
      );
      for (let row = 0; row < 3; row++)
        for (let column = 0; column < 3; column++) {
          const boss = put(
            bell,
            mesh(new THREE.SphereGeometry(0.8, 7, 5), "#c4b47b"),
            side * (2.6 + column * 1.45),
            -10 - (row * (height - 15)) / 2,
            radius * 0.57,
          );
          boss.scale.z = 0.55;
        }
      ridge.scale.x = 0.8;
    }
    return { bell, height, radius };
  });
  const hammer = put(group, new THREE.Group(), -40, 0, -2, "chime-hammer");
  beam(hammer, 0, 13, 0, 1.9, 26, 1.9, "#9b794e");
  const head = put(
    hammer,
    mesh(new THREE.CylinderGeometry(3.2, 3.2, 8, 16), "#a77b50"),
    0,
    26,
    0,
    "chime-hammer-head",
  );
  head.rotation.z = Math.PI / 2;

  const stand = put(group, new THREE.Group(), -1, 0, 33, "guqin-stand");
  stand.rotation.y = -0.12;
  // Two splayed wooden trestles, tied by a low stretcher: an open silhouette
  // leaves both the instrument and the chimes readable from the pond camera.
  for (const x of [-35, 32]) {
    beam(stand, x, 19.2, 0, 4.2, 2.6, 26, "#785039");
    beam(stand, x, 5.5, 0, 2.3, 2, 23, "#66432f");
    for (const side of [-1, 1]) {
      const leg = beam(stand, x, 9.3, side * 9.8, 2.8, 18.6, 2.8, "#785039");
      leg.rotation.x = -side * 0.16;
      beam(stand, x, 0.8, side * 11.2, 4.5, 1.6, 6, "#66432f");
    }
  }
  beam(stand, -1.5, 6.2, 0, 70, 2, 2.6, "#785039");
  const qin = put(group, new THREE.Group(), -1, 22, 33, "seven-string-guqin");
  qin.rotation.y = -0.12;
  // A low, waisted soundboard, seven strings and thirteen hui markers. The
  // guqin has no row of movable bridges like a guzheng.
  const outline = new THREE.Shape();
  outline.moveTo(-52, -10);
  outline.bezierCurveTo(-55, -6, -55, 7, -51, 10);
  outline.bezierCurveTo(-32, 11, -29, 6, -22, 7);
  outline.bezierCurveTo(-2, 10, 24, 10, 47, 7);
  outline.quadraticCurveTo(55, 0, 47, -7);
  outline.bezierCurveTo(20, -10, -2, -10, -22, -7);
  outline.bezierCurveTo(-30, -6, -34, -11, -52, -10);
  const soundboard = new THREE.ExtrudeGeometry(outline, {
    depth: 4.5,
    steps: 1,
    bevelEnabled: true,
    bevelSize: 1.1,
    bevelThickness: 1.1,
    bevelSegments: 2,
    curveSegments: 16,
  });
  soundboard.rotateX(-Math.PI / 2);
  put(qin, mesh(soundboard, "#623f31"), 0, 0, 0, "guqin-soundboard");
  for (const x of [-35, 32]) beam(qin, x, -1, 0, 5, 5, 11, "#4f382c");
  beam(qin, -47, 5.7, 0, 2, 1.6, 16, "#bc9e64");
  beam(qin, 46, 5.5, 0, 1.3, 1, 13, "#b3935d");
  const strings = Array.from({ length: 7 }, (_, i) => {
    const curve = new THREE.LineCurve3(
      new THREE.Vector3(-47, 6.4, (i - 3) * 1.9),
      new THREE.Vector3(46, 6.4, (i - 3) * 1.9),
    );
    const geometry = new THREE.TubeGeometry(curve, 30, 0.23, 4);
    put(qin, mesh(geometry, "#dfca96"), 0, 0, 0, `guqin-string-${i}`);
    return {
      attribute: geometry.getAttribute("position") as THREE.BufferAttribute,
      base: Float32Array.from(geometry.getAttribute("position").array),
    };
  });
  for (let i = 0; i < 13; i++) {
    const marker = put(
      qin,
      mesh(new THREE.SphereGeometry(i === 6 ? 0.9 : 0.65, 8, 5), "#d7c18e"),
      -41 + i * 6.7,
      6.1,
      -8.2,
    );
    marker.scale.y = 0.3;
  }
  return (time: number, reduced = false) => {
    const t = reduced ? 0.4 : time,
      strike = chimeMotion(t);
    hammer.position.x = strike.x;
    const targetHeight = THREE.MathUtils.lerp(
      bells[(strike.index + 4) % 5].height,
      bells[strike.index].height,
      Math.min(1, strike.phase / 0.35),
    );
    hammer.position.y = 84 - targetHeight * 0.58 - 26 * Math.cos(-0.4);
    const targetRadius = THREE.MathUtils.lerp(
      bells[(strike.index + 4) % 5].radius,
      bells[strike.index].radius,
      Math.min(1, strike.phase / 0.35),
    );
    hammer.position.z = -17 + targetRadius * 0.57 + 3.2 - 26 * Math.sin(-0.4);
    hammer.rotation.x = reduced ? 0.32 : strike.angle;
    bells.forEach(({ bell }, i) => {
      const lastHit = CHIME_CONTACT + i * CHIME_BEAT;
      const age =
        (((t - lastHit) % (CHIME_BEAT * 5)) + CHIME_BEAT * 5) %
        (CHIME_BEAT * 5);
      const active = t >= lastHit;
      bell.rotation.x =
        reduced || !active
          ? 0
          : Math.sin(age * 12) * Math.exp(-age * 2.7) * 0.11;
      bell.rotation.z =
        reduced || !active
          ? 0
          : Math.sin(age * 9) * Math.exp(-age * 2.5) * 0.035;
    });
    strings.forEach(({ attribute, base }, index) => {
      const amplitude = reduced
        ? 0
        : Math.exp(-((t + index * 0.17) % 2.2) * 2) * 0.28;
      for (let i = 0; i < attribute.count; i++) {
        const u = (base[i * 3] + 47) / 93;
        attribute.setY(
          i,
          base[i * 3 + 1] +
            Math.sin(u * Math.PI) * Math.sin(t * 30 + index) * amplitude,
        );
      }
      attribute.needsUpdate = true;
    });
  };
}
