import * as THREE from "three";
import { POND_DEPTH_SCALE, setPondLayer } from "../src/scene/depth";
import { DitherPass } from "../src/scene/dither";
import { createLeaf } from "../src/scene/geometry";
import { PondSeam } from "../src/scene/seam";

// Real GPU checks, served only by the development server. No test methods or
// fixture routes are added to the portfolio's production bundle.
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  preserveDrawingBuffer: true,
});
renderer.setSize(64, 64);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.append(renderer.domElement);
const dither = new DitherPass();
dither.resize(64, 64, 1);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 20);
camera.position.z = 10;
camera.lookAt(0, 0, 0);
const results: { name: string; pass: boolean; actual: unknown }[] = [];
const report = (name: string, pass: boolean, actual: unknown) =>
  results.push({ name, pass, actual });
function image(scene: THREE.Scene, view: THREE.Camera = camera) {
  dither.render(renderer, scene, view);
  const pixels = new Uint8Array(64 * 64 * 4);
  renderer
    .getContext()
    .readPixels(
      0,
      0,
      64,
      64,
      renderer.getContext().RGBA,
      renderer.getContext().UNSIGNED_BYTE,
      pixels,
    );
  return (x: number, y: number) =>
    Array.from(pixels.slice((y * 64 + x) * 4, (y * 64 + x) * 4 + 3));
}
const isBlue = (p: number[]) => p[0] < 3 && p[1] < 3 && p[2] > 250;
const isRed = (p: number[]) => p[0] > 250 && p[1] < 3 && p[2] < 3;
const isGreen = (p: number[]) => p[0] < 3 && p[1] > 250 && p[2] < 3;
function plane(color: string, z = 0, opacity = 1) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity === 1,
    }),
  );
  mesh.position.z = z;
  return mesh;
}
function crossing(layered: boolean) {
  const scene = new THREE.Scene(),
    red = plane("#ff0000"),
    blue = plane("#0000ff");
  const pos = red.geometry.getAttribute("position");
  for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getX(i) * 1.5);
  if (layered) {
    setPondLayer(red, 10);
    setPondLayer(blue, 20);
  }
  scene.add(red, blue);
  const pixels = image(scene);
  return [pixels(16, 32), pixels(48, 32)];
}
try {
  // Both geometry sets overlap the entire viewport. Without domain clipping,
  // the higher gallery layer incorrectly paints over the home side.
  const seam = new PondSeam(),
    adjoining = new THREE.Scene();
  const homePanel = plane("#ff0000"),
    worksPanel = plane("#0000ff");
  setPondLayer(homePanel, 10);
  setPondLayer(worksPanel, 40);
  seam.bind(homePanel, "pond");
  seam.bind(worksPanel, "works");
  adjoining.add(homePanel, worksPanel);
  for (const cameraX of [0.5, 1, 1.5]) {
    seam.update(2, cameraX);
    const pixels = image(adjoining),
      edge = Math.round((2 - cameraX) * 32);
    const sides = [pixels(edge - 6, 32), pixels(edge + 6, 32)];
    report(
      `adjoining panels do not overprint at camera ${cameraX}`,
      isRed(sides[0]) && isBlue(sides[1]),
      sides,
    );
  }
  const control = crossing(false);
  report(
    "control reproduces interpenetration",
    isBlue(control[0]) && isRed(control[1]),
    control,
  );
  const layered = crossing(true);
  report(
    "higher leaf covers both sides of crossing geometry",
    layered.every(isBlue),
    layered,
  );

  const internal = new THREE.Scene(),
    group = new THREE.Group();
  group.add(plane("#ff0000", 1), plane("#0000ff", -1));
  setPondLayer(group, 20);
  internal.add(group);
  const internalPixel = image(internal)(32, 32);
  report(
    "depth inside one object is preserved",
    isRed(internalPixel),
    internalPixel,
  );

  const flowerScene = new THREE.Scene(),
    leaf = plane("#0000ff", 2),
    flower = plane("#00ff00", -2);
  setPondLayer(leaf, 33);
  setPondLayer(flower, 80);
  flowerScene.add(leaf, flower);
  const flowerPixel = image(flowerScene)(32, 32);
  report(
    "flower covers a physically closer leaf",
    isGreen(flowerPixel),
    flowerPixel,
  );

  const translucent = new THREE.Scene(),
    fin = plane("#ff0000", 3, 0.65),
    cover = plane("#0000ff", -2);
  setPondLayer(fin, 0);
  setPondLayer(cover, 10);
  translucent.add(fin, cover);
  const finPixel = image(translucent)(32, 32);
  report(
    "underwater transparent parts cannot bleed through leaves",
    isBlue(finPixel),
    finPixel,
  );
  setPondLayer(fin, 0);
  setPondLayer(cover, 10);
  const repeatPixel = image(translucent)(32, 32);
  report(
    "reapplying layers keeps shaders valid",
    isBlue(repeatPixel),
    repeatPixel,
  );

  const botanical = new THREE.Scene();
  const lower = createLeaf(60, 12, "#ff0000", false),
    upper = createLeaf(60, 13, "#0000ff", false);
  const nativeSurfaces = (
    [
      [lower, "#ff0000"],
      [upper, "#0000ff"],
    ] as const
  ).map(([object, color]) => {
    object.group.clear();
    const surface = new THREE.Mesh(
      object.surface.geometry,
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    object.group.add(surface);
    return surface;
  });
  lower.group.position.y = 6;
  upper.group.rotation.y = 1.1;
  setPondLayer(lower.group, 10);
  setPondLayer(upper.group, 20);
  botanical.add(lower.group, upper.group);
  const leafCamera = new THREE.OrthographicCamera(-80, 80, 80, -80, 1, 500);
  leafCamera.position.set(0, 200 * Math.sin(0.91), 200 * Math.cos(0.91));
  leafCamera.lookAt(0, 0, 0);
  const botanicalPixels = image(botanical, leafCamera),
    ray = new THREE.Raycaster();
  let overlaps = 0,
    covered = 0;
  for (let y = 10; y < 55; y += 3)
    for (let x = 10; x < 55; x += 3) {
      ray.setFromCamera(
        new THREE.Vector2((x + 0.5) / 32 - 1, (y + 0.5) / 32 - 1),
        leafCamera,
      );
      if (
        ray.intersectObject(nativeSurfaces[0]).length &&
        ray.intersectObject(nativeSurfaces[1]).length
      ) {
        overlaps++;
        if (isBlue(botanicalPixels(x, y))) covered++;
      }
    }
  report(
    "real folded leaves have whole-surface ownership",
    overlaps > 20 && covered === overlaps,
    { overlaps, covered },
  );

  function shadowSample(casterLayer: number | null) {
    const scene = new THREE.Scene();
    const receiver = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.MeshStandardMaterial({ color: "#00ff00", roughness: 1 }),
    );
    receiver.receiveShadow = true;
    setPondLayer(receiver, 80);
    scene.add(receiver);
    const light = new THREE.DirectionalLight("#ffffff", 2.2);
    light.position.set(-3, 0, 8);
    light.castShadow = true;
    light.shadow.camera.left = light.shadow.camera.bottom = -3;
    light.shadow.camera.right = light.shadow.camera.top = 3;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 30;
    light.shadow.mapSize.set(512, 512);
    light.shadow.bias = -0.0004 * POND_DEPTH_SCALE;
    scene.add(light, new THREE.AmbientLight("#ffffff", 0.05));
    if (casterLayer !== null) {
      const caster = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.7),
        new THREE.MeshBasicMaterial({
          color: "#ff0000",
          side: THREE.DoubleSide,
        }),
      );
      caster.position.z = 2;
      caster.castShadow = true;
      setPondLayer(caster, casterLayer);
      scene.add(caster);
    }
    const view = new THREE.OrthographicCamera(-2, 2, 2, -2, 1, 20);
    view.position.z = 10;
    view.lookAt(0, 0, 0);
    return image(scene, view)(48, 32);
  }
  const lit = shadowSample(null),
    lowerShadow = shadowSample(10),
    upperShadow = shadowSample(90);
  report(
    "lower leaves do not shadow higher flowers",
    Math.abs(lowerShadow[1] - lit[1]) < 5,
    { lit, lowerShadow },
  );
  report(
    "upper objects still cast real shadows",
    upperShadow[1] < lit[1] - 30,
    { lit, upperShadow },
  );
} catch (error) {
  report("GPU execution", false, String(error));
}
document.querySelector("#results")!.textContent = JSON.stringify(
  results,
  null,
  2,
);
const passed = results.filter((result) => result.pass).length;
document.querySelector("[role=status]")!.textContent =
  `${passed} / ${results.length} ${passed === results.length ? "PASS" : "FAIL"}`;
document.title = `Pond depth GPU: ${passed} / ${results.length}`;
