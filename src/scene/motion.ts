export type Vec2 = { x: number; y: number };
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleDelta = (a: number, b: number) =>
  Math.atan2(Math.sin(b - a), Math.cos(b - a));
export function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function hash(text: string) {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export const galleryStride = (w: number) => w * (w < 640 ? 0.98 : 0.66);
export const galleryCenter = (i: number, w: number, h: number) => ({
  x: w * 0.5 + i * galleryStride(w),
  y: h * (0.46 + Math.sin(i * 1.7) * 0.065),
});
export const galleryRadius = (w: number, h: number) =>
  Math.min(w * (w < 640 ? 0.45 : 0.3), h * 0.46, 410);
export function homePoints(w: number, h: number) {
  const points = [
    [0.13, 0.27],
    [0.37, 0.34],
    [0.62, 0.24],
    [0.86, 0.37],
    [0.15, 0.74],
    [0.39, 0.63],
    [0.65, 0.77],
    [0.88, 0.67],
  ];
  return points.map(([x, y]) => ({ x: x * w, y: y * h }));
}
export type Patrol = Vec2 & {
  home: Vec2;
  rx: number;
  ry: number;
  angle: number;
  speed: number;
  turnRate: number;
  swimTime: number;
  clock: number;
  cruiseSpeed: number;
  segment: number;
  controls: Vec2[];
  controlAngle: number;
  direction: number;
  rng: () => number;
};

function extendPatrol(fish: Patrol) {
  fish.controlAngle += fish.direction * (1.05 + fish.rng() * 0.3);
  const radius = 0.82 + fish.rng() * 0.1;
  fish.controls.push({
    x: Math.cos(fish.controlAngle) * fish.rx * radius,
    y: Math.sin(fish.controlAngle) * fish.ry * radius,
  });
}

// Successive uniform cubic B-spline spans share position, tangent and curvature.
// Their convex hull stays inside the home ellipse, so no boundary snap is needed.
function patrolCurve(fish: Patrol, t: number) {
  const p = fish.controls,
    u = 1 - t,
    weights = [
      u ** 3,
      3 * t ** 3 - 6 * t * t + 4,
      -3 * t ** 3 + 3 * t * t + 3 * t + 1,
      t ** 3,
    ],
    first = [-3 * u * u, 9 * t * t - 12 * t, -9 * t * t + 6 * t + 3, 3 * t * t],
    second = [6 * u, 18 * t - 12, -18 * t + 6, 6 * t];
  let x = 0,
    y = 0,
    dx = 0,
    dy = 0,
    ddx = 0,
    ddy = 0;
  for (let i = 0; i < 4; i++) {
    x += (p[i].x * weights[i]) / 6;
    y += (p[i].y * weights[i]) / 6;
    dx += (p[i].x * first[i]) / 6;
    dy += (p[i].y * first[i]) / 6;
    ddx += (p[i].x * second[i]) / 6;
    ddy += (p[i].y * second[i]) / 6;
  }
  return { x: x + fish.home.x, y: y + fish.home.y, dx, dy, ddx, ddy };
}

export function createPatrol(
  home: Vec2,
  rx: number,
  ry: number,
  seed: number,
): Patrol {
  const rng = random(seed);
  const cruiseSpeed = (12 + rng() * 9) * clamp(Math.min(rx, ry) / 66, 0.38, 1);
  const fish: Patrol = {
    x: home.x,
    y: home.y,
    home,
    rx,
    ry,
    angle: 0,
    speed: cruiseSpeed,
    turnRate: 0,
    swimTime: rng() * 10,
    clock: rng() * 100,
    cruiseSpeed,
    segment: 0,
    controls: [],
    controlAngle: rng() * Math.PI * 2,
    direction: rng() < 0.5 ? -1 : 1,
    rng,
  };
  for (let i = 0; i < 4; i++) extendPatrol(fish);
  const p = patrolCurve(fish, 0);
  fish.x = p.x;
  fish.y = p.y;
  fish.angle = Math.atan2(p.dy, p.dx);
  return fish;
}
export function stepPatrol(
  fish: Patrol,
  dt: number,
  neighbors: Vec2[] = [],
  separation = 48,
) {
  dt = clamp(dt, 0, 0.05);
  if (!dt) return;
  fish.clock += dt;
  let pace = 1;
  for (const other of neighbors) {
    const dx = other.x - fish.x,
      dy = other.y - fish.y,
      d = Math.hypot(dx, dy),
      ahead = dx * Math.cos(fish.angle) + dy * Math.sin(fish.angle);
    if (d > 0.001 && d < separation && ahead > 0)
      pace = Math.min(pace, 0.55 + 0.45 * smooth(d / separation));
  }
  const targetSpeed =
    fish.cruiseSpeed *
    pace *
    (1 +
      0.1 * Math.sin(fish.clock * 0.37) +
      0.045 * Math.sin(fish.clock * 0.81));
  fish.speed = lerp(fish.speed, targetSpeed, 1 - Math.exp(-dt * 1.4));
  // Midpoint arc-length stepping avoids racing through bends or pausing to turn.
  const start = patrolCurve(fish, fish.segment),
    half =
      fish.segment + (fish.speed * dt) / (2 * Math.hypot(start.dx, start.dy)),
    middle = patrolCurve(fish, half);
  fish.segment += (fish.speed * dt) / Math.hypot(middle.dx, middle.dy);
  while (fish.segment >= 1) {
    fish.segment -= 1;
    fish.controls.shift();
    extendPatrol(fish);
  }
  const p = patrolCurve(fish, fish.segment);
  fish.x = p.x;
  fish.y = p.y;
  fish.angle += angleDelta(fish.angle, Math.atan2(p.dy, p.dx));
  fish.turnRate =
    ((p.dx * p.ddy - p.dy * p.ddx) * fish.speed) / Math.hypot(p.dx, p.dy) ** 3;
  fish.swimTime += dt * (0.76 + (0.24 * fish.speed) / fish.cruiseSpeed);
}
export function spring(
  value: number,
  velocity: number,
  target: number,
  dt: number,
  stiffness = 35,
  damping = 10,
) {
  const v = velocity + ((target - value) * stiffness - velocity * damping) * dt;
  return { value: value + v * dt, velocity: v };
}
export function bezier(a: Vec2, b: Vec2, c: Vec2, d: Vec2, t: number): Vec2 {
  const u = 1 - t;
  return {
    x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
    y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y,
  };
}
export function pointInPolygon(point: Vec2, polygon: Vec2[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function leafEdge(angle: number, seed: number) {
  const d = angleDelta(-1.2 + Math.sin(seed) * 0.4, angle);
  const depth = 0.67 + 0.22 * (0.5 + 0.5 * Math.sin(seed * 1.9));
  const width = 0.014 + 0.022 * (0.5 + 0.5 * Math.cos(seed * 0.7));
  return (
    (1 +
      0.035 * Math.sin(angle * 7 + seed) +
      0.018 * Math.sin(angle * 13 + seed * 0.4) +
      0.046 * Math.cos(angle * 2 + seed)) *
    (1 - depth * Math.exp((-d * d) / width))
  );
}
