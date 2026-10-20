import * as THREE from "three";
import { createEmblem } from "../src/scene/emblems";
import { createLeaf } from "../src/scene/geometry";
import { DitherPass } from "../src/scene/dither";
import { setPondLayer } from "../src/scene/depth";
import { projects } from "../src/data/projects";

const params = new URLSearchParams(location.search);
const fixed = params.has("time") ? Number(params.get("time")) : null;
const reduced = params.has("reduced");
const models = document.querySelector("#models")!;
const status = document.querySelector("#status")!;
const selected = params.get("id");
if (selected) {
  models.setAttribute(
    "style",
    "grid-template-columns: minmax(0, 520px); justify-content: center",
  );
}
const samples = projects
  .filter((project) => !selected || project.id === selected)
  .map((project, index) => {
    const figure = document.createElement("figure");
    const canvas = document.createElement("canvas");
    const label = document.createElement("figcaption");
    label.textContent = project.title;
    figure.append(canvas, label);
    models.append(figure);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
    });
    renderer.autoClear = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight("#f6f5f1", "#414141", 1.5));
    const light = new THREE.DirectionalLight("#fffdf8", 2.2);
    light.position.set(-700, 1300, 800);
    scene.add(light);
    const leaf = createLeaf(112, index + 88, index % 2 ? "#93948f" : "#333535");
    setPondLayer(leaf.group, 40);
    scene.add(leaf.group);
    const emblem = createEmblem(project.id, 110);
    emblem.group.position.set(0, 10, -8);
    leaf.group.add(emblem.group);
    setPondLayer(leaf.group, 40);
    setPondLayer(emblem.group, 60);
    const camera = new THREE.OrthographicCamera(
      -140,
      140,
      142,
      -125,
      0.1,
      7000,
    );
    camera.position.set(0, 2600 * Math.sin(0.91), 2600 * Math.cos(0.91));
    camera.lookAt(0, 0, 0);
    const dither = new DitherPass();
    const render = (time: number) => {
      const width = canvas.clientWidth,
        height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * 1.5)) {
        renderer.setPixelRatio(1.5);
        renderer.setSize(width, height, false);
        dither.resize(width, height, 1.5);
      }
      emblem.animate(time, reduced);
      dither.render(renderer, scene, camera);
    };
    return { render, renderer, emblem };
  });
const started = performance.now();
function frame(now: number) {
  const time = fixed ?? (now - started) / 1000;
  samples.forEach(({ render }) => render(time));
  status.textContent = `${reduced ? "Reduced motion" : "Animated"} · ${time.toFixed(2)}s · ${samples.length} models`;
  if (fixed === null) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
