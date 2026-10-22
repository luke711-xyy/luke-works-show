import * as THREE from "three";

// All parts are built once. The stroke only moves the rig and six arm joints;
// it shares the emblem's visibility, reduced-motion and Bayer rendering path.
export function createBoatman(boat: THREE.Group, water: THREE.Group) {
  const straw = new THREE.MeshStandardMaterial({
    color: "#a18b60",
    roughness: 1,
  });
  const cloth = new THREE.MeshStandardMaterial({
    color: "#4e574c",
    roughness: 1,
  });
  const skin = new THREE.MeshStandardMaterial({
    color: "#bea27b",
    roughness: 1,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: "#e1dcc6",
    roughness: 1,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#373e34",
    roughness: 1,
  });
  const man = new THREE.Group();
  man.name = "boatman";
  man.position.set(29, 6.8, 4.5);
  man.rotation.y = -1.1;
  boat.add(man);
  const put = (
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    name = "",
  ) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.name = name;
    parent.add(object);
    return object;
  };
  const axis = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  const segment = (mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => {
    direction.copy(b).sub(a);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.y = direction.length();
    mesh.quaternion.setFromUnitVectors(axis, direction.normalize());
  };
  const limb = (parent: THREE.Object3D, radius: number, name = "") =>
    put(
      parent,
      new THREE.CylinderGeometry(radius, radius * 0.85, 1, 8),
      cloth,
      0,
      0,
      0,
      name,
    );
  for (const side of [-1, 1]) {
    segment(
      limb(man, 1.9),
      new THREE.Vector3(-0.4, 10.7, side * 2.1),
      new THREE.Vector3(1, 5.8, side * 2.7),
    );
    segment(
      limb(man, 1.45),
      new THREE.Vector3(1, 5.8, side * 2.7),
      new THREE.Vector3(-0.3, 0.9, side * 2.8),
    );
    const shoe = put(
      man,
      new THREE.SphereGeometry(1, 10, 6),
      dark,
      0.9,
      0.65,
      side * 2.8,
    );
    shoe.scale.set(3, 0.8, 1.5);
  }
  const body = new THREE.Group();
  body.name = "boatman-body";
  body.position.y = 11;
  body.rotation.y = -0.25;
  man.add(body);
  const torso = put(
    body,
    new THREE.CylinderGeometry(3.5, 3.2, 10.6, 12),
    cloth,
    0,
    5.3,
    0,
  );
  torso.scale.x = 0.8;
  put(body, new THREE.CylinderGeometry(1.1, 1.5, 2.5, 8), skin, 0.5, 11.6, 0);
  const head = put(
    body,
    new THREE.SphereGeometry(1, 14, 10),
    skin,
    0.8,
    15.1,
    0,
  );
  head.scale.set(2.65, 3.25, 2.5);
  put(body, new THREE.SphereGeometry(0.65, 8, 6), skin, 3.3, 15, 0);
  for (const side of [-1, 1]) {
    put(
      body,
      new THREE.SphereGeometry(0.65, 8, 6),
      skin,
      0.6,
      15.2,
      side * 2.4,
    );
    put(
      body,
      new THREE.SphereGeometry(0.24, 8, 6),
      dark,
      2.7,
      15.9,
      side * 1.2,
    );
    const brow = put(
      body,
      new THREE.BoxGeometry(0.3, 0.25, 1.4),
      hair,
      2.55,
      16.6,
      side * 1.2,
    );
    brow.rotation.x = side * -0.16;
  }
  const beard = put(
    body,
    new THREE.CylinderGeometry(1.7, 0.13, 5.4, 10),
    hair,
    2.55,
    10.8,
    0,
    "boatman-beard",
  );
  beard.rotation.z = 0.12;
  beard.scale.x = 0.6;

  // The cape wraps the back and shoulders but opens at the chest, leaving the
  // sleeves free. Uneven tapered strips describe straw, not a solid poncho.
  const cape = new THREE.Group();
  cape.name = "boatman-rain-cape";
  body.add(cape);
  const capePositions: number[] = [],
    capeIndices: number[] = [],
    capeColors: number[] = [];
  const strips = 40;
  for (let row = 0; row < 4; row++) {
    const v = row / 3;
    for (let i = 0; i <= strips; i++) {
      const angle = Math.PI * (0.34 + (i / strips) * 1.32);
      const radius = 4.2 + v * 2.8;
      capePositions.push(
        Math.cos(angle) * radius * 0.8 - 0.5,
        10.5 - v * (9.8 + Math.sin(i * 2.4) * 0.7),
        Math.sin(angle) * radius,
      );
      const color = new THREE.Color("#82704e").lerp(
        new THREE.Color("#b2a077"),
        0.18 + 0.36 * (((i * 7) % 13) / 13),
      );
      capeColors.push(color.r, color.g, color.b);
      if (row < 3 && i < strips) {
        const a = row * (strips + 1) + i;
        capeIndices.push(
          a,
          a + strips + 1,
          a + 1,
          a + 1,
          a + strips + 1,
          a + strips + 2,
        );
      }
    }
  }
  const capeGeometry = new THREE.BufferGeometry();
  capeGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(capePositions, 3),
  );
  capeGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(capeColors, 3),
  );
  capeGeometry.setIndex(capeIndices);
  capeGeometry.computeVertexNormals();
  put(
    cape,
    capeGeometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 1,
    }),
    0,
    0,
    0,
  );
  const fringe = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.26, 1, 4),
    straw,
    80,
  );
  cape.add(fringe);
  const dummy = new THREE.Object3D();
  const from = new THREE.Vector3(),
    to = new THREE.Vector3();
  for (let i = 0; i < fringe.count; i++) {
    const angle = Math.PI * (0.34 + (((i % 40) + 0.5) / 40) * 1.32);
    const row = Math.floor(i / 40);
    const radius = 4.5 + row * 1.25;
    from.set(
      Math.cos(angle) * radius * 0.8 - 0.5,
      9.7 - row * 3.8,
      Math.sin(angle) * radius,
    );
    to.set(
      Math.cos(angle) * (radius + 1.6) * 0.8 - 0.5,
      from.y - 5.2 - (i % 3) * 0.55,
      Math.sin(angle) * (radius + 1.6),
    );
    direction.copy(to).sub(from);
    dummy.position.copy(from).add(to).multiplyScalar(0.5);
    dummy.scale.set(1, direction.length(), 1);
    dummy.quaternion.setFromUnitVectors(axis, direction.normalize());
    dummy.updateMatrix();
    fringe.setMatrixAt(i, dummy.matrix);
    fringe.setColorAt(i, new THREE.Color(i % 3 ? "#a49268" : "#6e6045"));
  }

  const hat = new THREE.Group();
  hat.name = "boatman-straw-hat";
  hat.position.set(0.8, 17.8, 0);
  hat.rotation.x = -0.18;
  hat.rotation.z = 0.12;
  body.add(hat);
  put(hat, new THREE.ConeGeometry(8.8, 4.6, 32), straw, 0, 2.3, 0);
  put(hat, new THREE.CylinderGeometry(8.8, 8.8, 0.3, 32), straw, 0, 0, 0);
  const hatRibs = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.09, 0.09, 1, 4),
    new THREE.MeshStandardMaterial({ color: "#796a4f", roughness: 1 }),
    16,
  );
  hat.add(hatRibs);
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    from.set(Math.cos(angle) * 0.3, 4.5, Math.sin(angle) * 0.3);
    to.set(Math.cos(angle) * 8.8, 0.15, Math.sin(angle) * 8.8);
    direction.copy(to).sub(from);
    dummy.position.copy(from).add(to).multiplyScalar(0.5);
    dummy.scale.set(1, direction.length(), 1);
    dummy.quaternion.setFromUnitVectors(axis, direction.normalize());
    dummy.updateMatrix();
    hatRibs.setMatrixAt(i, dummy.matrix);
  }

  const pole = put(
    man,
    new THREE.CylinderGeometry(0.46, 0.4, 1, 10),
    new THREE.MeshStandardMaterial({ color: "#b4a177", roughness: 1 }),
    0,
    0,
    0,
    "boat-punting-pole",
  );
  const nodeMaterial = new THREE.MeshStandardMaterial({
    color: "#746a4e",
    roughness: 1,
  });
  for (let i = 0; i < 9; i++)
    put(
      pole,
      new THREE.CylinderGeometry(0.54, 0.54, 0.006, 10),
      nodeMaterial,
      0,
      -0.43 + i * 0.105,
      0,
    );

  const inverseBody = new THREE.Matrix4();
  const poleBottom = new THREE.Vector3(),
    poleTop = new THREE.Vector3();
  const arm = (side: number, fraction: number) => {
    const name = side < 0 ? "left" : "right";
    const upper = limb(body, 1.7, `boatman-upper-arm-${name}`);
    const fore = limb(body, 1.25, `boatman-forearm-${name}`);
    const hand = put(
      body,
      new THREE.SphereGeometry(1, 10, 6),
      skin,
      0,
      0,
      0,
      `boatman-hand-${name}`,
    );
    const shoulder = new THREE.Vector3(0.4, 9.3, side * 3.3);
    const target = new THREE.Vector3(),
      elbow = new THREE.Vector3(),
      along = new THREE.Vector3(),
      bend = new THREE.Vector3();
    return () => {
      target.copy(poleBottom).lerp(poleTop, fraction).applyMatrix4(inverseBody);
      along.copy(target).sub(shoulder);
      const distance = along.length();
      along.normalize();
      const advance = (8.9 ** 2 - 8.6 ** 2 + distance ** 2) / (2 * distance);
      bend
        .set(0, -1, side * 0.65)
        .addScaledVector(along, -bend.dot(along))
        .normalize();
      elbow
        .copy(shoulder)
        .addScaledVector(along, advance)
        .addScaledVector(bend, Math.sqrt(Math.max(0, 8.9 ** 2 - advance ** 2)));
      segment(upper, shoulder, elbow);
      segment(fore, elbow, target);
      hand.position.copy(target);
    };
  };
  const arms = [arm(-1, 0.73), arm(1, 0.64)];
  // Quintic segments have zero velocity/acceleration at the planted/lifted
  // turning points and at the loop seam. No per-frame geometry is rebuilt.
  const keys = [
    [0, 14, 0, -1, 36],
    [0.12, 12, 0, 0, 36],
    [0.58, -5, 0, 4, 35],
    [0.72, -4, 8, 4, 38],
    [0.86, 12, 9, -1, 38],
    [1, 14, 0, -1, 36],
  ];
  return (time: number) => {
    const phase = (((time % 6) + 6) % 6) / 6;
    const index = keys.findIndex(
      (key, i) =>
        i < keys.length - 1 && phase >= key[0] && phase < keys[i + 1][0],
    );
    const a = keys[Math.max(0, index)],
      b = keys[Math.max(0, index) + 1];
    const u = (phase - a[0]) / (b[0] - a[0]);
    const ease = u * u * u * (10 + u * (-15 + u * 6));
    const interpolate = (i: number) => THREE.MathUtils.lerp(a[i], b[i], ease);
    body.rotation.z = -0.08 - Math.sin(phase * Math.PI * 2) * 0.1;
    body.updateMatrix();
    inverseBody.copy(body.matrix).invert();
    // Author the pole in the boat's frame, independently of the man's facing:
    // the whole stroke stays beyond the rail and clear of the broad hat.
    poleBottom.set(32 + interpolate(1), -5, 25);
    boat.localToWorld(poleBottom);
    water.worldToLocal(poleBottom);
    poleBottom.y = 1.2 + interpolate(2);
    water.localToWorld(poleBottom);
    man.worldToLocal(poleBottom);
    poleTop.set(29 + interpolate(3) * 0.4, 6.8 + interpolate(4), 17);
    boat.localToWorld(poleTop);
    man.worldToLocal(poleTop);
    segment(pole, poleBottom, poleTop);
    arms.forEach((update) => update());
  };
}
