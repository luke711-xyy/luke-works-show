import * as THREE from "three";

export type WakeEmitter = {
  id: string;
  x: number;
  y: number;
  angle: number;
  length: number;
  visible: boolean;
};
type Pulse = {
  x: number;
  y: number;
  angle: number;
  length: number;
  age: number;
  phase: number;
};
type Track = { x: number; y: number; distance: number; elapsed: number };

/** Water-space pulses share one fixed buffer and fade independently of the fish. */
export class KoiWake {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly pulses: (Pulse | null)[];
  private readonly tracks = new Map<string, Track>();
  private readonly positions: THREE.BufferAttribute;
  private readonly ink: THREE.BufferAttribute;
  private cursor = 0;
  private readonly segments = 40;
  private readonly dark = new THREE.Color("#89744d");
  private readonly light = new THREE.Color("#fff0c8");
  constructor(
    capacity = 64,
    private readonly projection = Math.sin(0.91),
  ) {
    this.pulses = Array.from(
      { length: Math.max(1, Math.min(96, Math.floor(capacity))) },
      () => null,
    );
    const vertices = this.pulses.length * this.segments * 6 * 2;
    this.positions = new THREE.BufferAttribute(
      new Float32Array(vertices * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    this.ink = new THREE.BufferAttribute(
      new Float32Array(vertices * 4),
      4,
    ).setUsage(THREE.DynamicDrawUsage);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", this.positions);
    geometry.setAttribute("ink", this.ink);
    geometry.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        vertexShader:
          "attribute vec4 ink; varying vec4 vInk; void main(){vInk=ink;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "precision highp float; varying vec4 vInk; void main(){gl_FragColor=vInk;}",
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.mesh.frustumCulled = false;
    this.group.name = "koi-water-wake";
    this.group.add(this.mesh);
  }

  get activeCount() {
    return this.pulses.filter(Boolean).length;
  }

  reset() {
    this.pulses.fill(null);
    this.tracks.clear();
    this.cursor = 0;
    this.mesh.geometry.setDrawRange(0, 0);
  }

  step(dt: number, emitters: WakeEmitter[], driftX = 0, enabled = true) {
    if (!enabled) {
      this.reset();
      return;
    }
    for (let i = 0; i < this.pulses.length; i++) {
      const pulse = this.pulses[i];
      if (!pulse) continue;
      pulse.age += dt;
      pulse.x += driftX;
      if (pulse.age >= 2.8) this.pulses[i] = null;
    }
    for (const track of this.tracks.values()) track.x += driftX;
    const visible = new Set<string>();
    for (const emitter of emitters) {
      if (!emitter.visible) continue;
      visible.add(emitter.id);
      const track = this.tracks.get(emitter.id);
      if (!track) {
        this.tracks.set(emitter.id, {
          x: emitter.x,
          y: emitter.y,
          distance: 0,
          elapsed: 0,
        });
        continue;
      }
      const travel = Math.hypot(emitter.x - track.x, emitter.y - track.y);
      track.distance += travel;
      track.elapsed += dt;
      if (travel > emitter.length * 3) {
        track.distance = 0;
        track.elapsed = 0;
      }
      if (
        track.distance > Math.max(12, emitter.length * 0.25) &&
        track.elapsed > 0.2
      ) {
        this.pulses[this.cursor] = {
          x: emitter.x - Math.cos(emitter.angle) * emitter.length * 0.2,
          y: emitter.y - Math.sin(emitter.angle) * emitter.length * 0.2,
          angle: emitter.angle,
          length: emitter.length,
          age: 0,
          phase: this.cursor * 1.7,
        };
        this.cursor = (this.cursor + 1) % this.pulses.length;
        track.distance = 0;
        track.elapsed = 0;
      }
      track.x = emitter.x;
      track.y = emitter.y;
    }
    for (const id of this.tracks.keys())
      if (!visible.has(id)) this.tracks.delete(id);
    let vertex = 0;
    const add = (x: number, y: number, color: THREE.Color, alpha: number) => {
      this.positions.setXYZ(vertex, x, 0, y / this.projection);
      this.ink.setXYZW(vertex, color.r, color.g, color.b, alpha);
      vertex++;
    };
    for (const pulse of this.pulses) {
      if (!pulse) continue;
      const t = pulse.age / 2.8,
        r = pulse.length * (0.24 + 0.64 * (1 - (1 - t) ** 1.6)),
        fade = Math.sin(Math.PI * t) ** 0.55 * (1 - t) ** 1.1,
        c = Math.cos(pulse.angle),
        s = Math.sin(pulse.angle);
      for (let band = 0; band < 2; band++) {
        const color = band === 0 ? this.dark : this.light,
          alpha = fade * (band === 0 ? 0.48 : 0.53),
          width = band === 0 ? 1.12 : 0.8;
        for (let i = 0; i < this.segments; i++) {
          const point = (u: number, edge: number) => {
            const a = 0.4 + u * (Math.PI * 2 - 0.8),
              radius =
                r +
                band * 1.6 +
                Math.sin(a * 3 + pulse.phase) * 0.65 +
                edge * width,
              x = Math.cos(a) * radius,
              y = Math.sin(a) * radius * 0.55;
            return { x: pulse.x + x * c - y * s, y: pulse.y + x * s + y * c };
          };
          const a = point(i / this.segments, -0.5),
            b = point((i + 1) / this.segments, -0.5),
            d = point(i / this.segments, 0.5),
            e = point((i + 1) / this.segments, 0.5),
            end = Math.sin((Math.PI * (i + 0.5)) / this.segments) ** 0.3;
          for (const p of [a, b, d, b, e, d]) add(p.x, p.y, color, alpha * end);
        }
      }
    }
    this.mesh.geometry.setDrawRange(0, vertex);
    this.positions.needsUpdate = true;
    this.ink.needsUpdate = true;
  }
}
