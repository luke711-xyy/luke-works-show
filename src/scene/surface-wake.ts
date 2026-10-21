import * as THREE from "three";

type Wave = { x: number; y: number; vx: number; vy: number; age: number };

/** One pressure-wave family: a resting contact is the zero-velocity limit of
 * the same crests that sharpen into a moving contact's bow and trailing wings.
 * This is an analytic, art-directed approximation, not a fluid solver. */
export class SurfaceWake {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly waves: Wave[];
  private readonly positions: THREE.BufferAttribute;
  private readonly ink: THREE.BufferAttribute;
  private readonly segments = 40;
  private readonly dark = new THREE.Color("#89744d");
  private readonly light = new THREE.Color("#fff0c8");
  private readonly cos = new Float32Array(41);
  private readonly sin = new Float32Array(41);
  private pointer = { x: 0, y: 0, vx: 0, vy: 0, time: 0, active: false };
  private distance = 0;
  private emitted = -Infinity;
  private cursor = 0;
  private elapsed = 0;
  private dirty = false;
  private reduced = false;

  constructor(
    capacity = 20,
    private readonly projection = Math.sin(0.91),
  ) {
    this.waves = Array.from(
      { length: Math.max(1, Math.min(24, Math.floor(capacity))) },
      () => ({ x: 0, y: 0, vx: 0, vy: 0, age: Infinity }),
    );
    const vertices = this.waves.length * this.segments * 6 * 3 * 2;
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
        vertexShader: `attribute vec4 ink; varying vec4 vInk;
        #include <clipping_planes_pars_vertex>
        void main(){vInk=ink;vec4 mvPosition=modelViewMatrix*vec4(position,1.);
        gl_Position=projectionMatrix*mvPosition;
        #include <clipping_planes_vertex>
        }`,
        fragmentShader: `precision highp float; varying vec4 vInk;
        #include <clipping_planes_pars_fragment>
        void main(){
        #include <clipping_planes_fragment>
        gl_FragColor=vInk;}`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.mesh.frustumCulled = false;
    this.group.name = "contact-water-waves";
    this.group.add(this.mesh);
    for (let i = 0; i <= this.segments; i++) {
      this.cos[i] = Math.cos((i / this.segments) * Math.PI * 2);
      this.sin[i] = Math.sin((i / this.segments) * Math.PI * 2);
    }
  }

  get activeCount() {
    let count = 0;
    for (const wave of this.waves) if (Number.isFinite(wave.age)) count++;
    return count;
  }

  input(x: number, y: number, active: boolean, time: number) {
    if (!active || !Number.isFinite(x + y + time)) {
      this.pointer.active = false;
      return;
    }
    y /= this.projection;
    const p = this.pointer;
    const dt = time - p.time;
    const travel = Math.hypot(x - p.x, y - p.y);
    const start = !p.active || dt > 0.2 || travel > 240;
    if (start) {
      p.vx = p.vy = 0;
      this.distance = 0;
    } else if (dt > 0) {
      const vx = (x - p.x) / dt,
        vy = (y - p.y) / dt;
      const limit = Math.min(1, 1400 / (Math.hypot(vx, vy) || 1));
      const blend = 1 - Math.exp(-dt / 0.075);
      p.vx += (vx * limit - p.vx) * blend;
      p.vy += (vy * limit - p.vy) * blend;
      this.distance += travel;
    }
    p.x = x;
    p.y = y;
    p.time = time;
    p.active = true;
    if (
      start ||
      (!this.reduced && time - this.emitted >= 0.24 && this.distance >= 14)
    ) {
      if (!this.activeCount) this.dirty = true;
      const wave = this.waves[this.cursor];
      wave.x = x;
      wave.y = y;
      wave.vx = p.vx;
      wave.vy = p.vy;
      wave.age = 0;
      this.cursor = (this.cursor + 1) % this.waves.length;
      this.emitted = time;
      this.distance = 0;
    }
  }

  reset() {
    for (const wave of this.waves) wave.age = Infinity;
    this.pointer.active = false;
    this.distance = this.elapsed = this.cursor = 0;
    this.dirty = false;
    this.emitted = -Infinity;
    this.mesh.geometry.setDrawRange(0, 0);
  }

  step(dt: number, enabled = true, reduced = false) {
    this.reduced = reduced;
    if (!enabled) {
      this.reset();
      return;
    }
    const life = reduced ? 0.45 : 1.85;
    for (const wave of this.waves) {
      if (!Number.isFinite(wave.age)) continue;
      wave.age += Math.max(0, dt);
      if (wave.age >= life) {
        wave.age = Infinity;
        continue;
      }
      // The initial pressure footprint responds briefly to the ongoing stroke.
      // This morphs the very same tap wave into the drag, without crossfading
      // unrelated effects. Once released, each crest keeps its own momentum.
      if (
        wave.age < 0.28 &&
        this.pointer.active &&
        Math.hypot(wave.x - this.pointer.x, wave.y - this.pointer.y) < 70
      ) {
        const blend = 1 - Math.exp(-dt / 0.085);
        wave.vx += (this.pointer.vx - wave.vx) * blend;
        wave.vy += (this.pointer.vy - wave.vy) * blend;
      }
    }
    this.elapsed += Math.max(0, dt);
    if (!this.dirty && this.elapsed < 0.05) return;
    this.elapsed %= 0.05;
    this.dirty = false;
    this.draw(life);
  }

  private draw(life: number) {
    let vertex = 0;
    const add = (x: number, y: number, color: THREE.Color, alpha: number) => {
      this.positions.setXYZ(vertex, x, 0, y);
      this.ink.setXYZW(vertex++, color.r, color.g, color.b, alpha);
    };
    for (const wave of this.waves) {
      if (!Number.isFinite(wave.age)) continue;
      const speed = Math.hypot(wave.vx, wave.vy);
      const c = speed > 0.001 ? wave.vx / speed : 1;
      const s = speed > 0.001 ? wave.vy / speed : 0;
      // A smooth speed response, not a tap/drag branch. Distant wavefronts
      // relax towards circles as their directional energy dissipates.
      const q = this.reduced
        ? 0
        : 0.94 * (1 - Math.exp(-speed / 210)) * Math.exp(-wave.age * 0.26);
      for (let crest = 0; crest < (this.reduced ? 1 : 3); crest++) {
        const age = wave.age - crest * 0.12;
        if (age <= 0) continue;
        const radius = this.reduced ? 12 : 5 + 58 * Math.pow(age, 0.82);
        const fade =
          (Math.min(1, age / 0.065) * Math.pow(1 - wave.age / life, 1.5)) /
          (1 + crest * 0.24);
        for (let band = 0; band < 2; band++) {
          const color = band === 0 ? this.dark : this.light;
          const width = band === 0 ? 1.4 : 1;
          const opacity = fade * (band === 0 ? 0.58 : 0.8);
          let ax = 0,
            ay = 0,
            bx = 0,
            by = 0,
            previousAlpha = 0;
          for (let i = 0; i <= this.segments; i++) {
            const co = this.cos[i],
              si = this.sin[i];
            const localX = radius * co;
            const localY = radius * si * (1 - q * co);
            const dx = -si,
              dy = co * (1 - q * co) + q * si * si;
            const norm = Math.hypot(dx, dy) || 1;
            const nx = (dy * c + dx * s) / norm;
            const ny = (dy * s - dx * c) / norm;
            const x = wave.x + localX * c - localY * s;
            const y = wave.y + localX * s + localY * c;
            const offset = band * 1.2;
            const cx = x + nx * (offset - width / 2);
            const cy = y + ny * (offset - width / 2);
            const ex = x + nx * (offset + width / 2);
            const ey = y + ny * (offset + width / 2);
            const alpha = opacity * (1 - q * 0.88 * Math.max(0, -co));
            if (i) {
              add(ax, ay, color, previousAlpha);
              add(cx, cy, color, alpha);
              add(bx, by, color, previousAlpha);
              add(cx, cy, color, alpha);
              add(ex, ey, color, alpha);
              add(bx, by, color, previousAlpha);
            }
            ax = cx;
            ay = cy;
            bx = ex;
            by = ey;
            previousAlpha = alpha;
          }
        }
      }
    }
    this.mesh.geometry.setDrawRange(0, vertex);
    // No uploads on completely idle frames; existing scene RAF stays untouched.
    if (vertex) {
      this.positions.needsUpdate = true;
      this.ink.needsUpdate = true;
    }
  }
}
