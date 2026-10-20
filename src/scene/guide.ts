import { angleDelta, clamp, lerp, type Vec2 } from "./motion";

export type GuideLeaf = Vec2 & { rx: number; ry: number };
export type Guide = Vec2 & {
  vx: number;
  vy: number;
  angle: number;
  turnRate: number;
  phase: number;
  scroll: number;
};

function waterTarget(
  w: number,
  h: number,
  scroll: number,
  phase: number,
  leaves: GuideLeaf[],
) {
  const padding = Math.min(26, w * 0.025);
  const y = h * (0.5 + 0.27 * Math.sin(phase + 0.6));
  let x = scroll + w * (0.72 + 0.16 * Math.sin(phase * 0.83 + 2.4));
  // Keep the destination in a gap, following the nearby leaf's side rather
  // than choosing a bottom lane or switching into a pre-scripted orbit.
  for (const leaf of leaves) {
    const dy = (y - leaf.y) / (leaf.ry + padding);
    if (Math.abs(dy) >= 1) continue;
    const edge = (leaf.rx + padding) * Math.sqrt(1 - dy * dy);
    if (Math.abs(x - leaf.x) < edge) x = leaf.x + (x < leaf.x ? -edge : edge);
  }
  return { x: scroll + clamp(x - scroll, w * 0.16, w * 0.94), y };
}

export function createGuide(
  w: number,
  h: number,
  scroll: number,
  leaves: GuideLeaf[],
): Guide {
  const phase = 1.7;
  const start = waterTarget(w, h, scroll, phase, leaves);
  const ahead = waterTarget(w, h, scroll, phase + 0.001, leaves);
  return {
    ...start,
    vx: 0,
    vy: 0,
    angle: Math.atan2(ahead.y - start.y, ahead.x - start.x),
    turnRate: 0,
    phase,
    scroll,
  };
}

export function stepGuide(
  g: Guide,
  dt: number,
  w: number,
  h: number,
  scroll: number,
  scrollVelocity: number,
  leaves: GuideLeaf[],
  reduced = false,
) {
  dt = clamp(dt, 0, 0.05);
  if (!dt) return;
  const pan = scroll - g.scroll;
  g.scroll = scroll;
  // Camera transport preserves the same swimmer during scrolling, without
  // an acceleration threshold, lap timer, or closed-circle animation.
  g.x += pan * 0.85;
  if (reduced) {
    g.x += pan * 0.15;
    g.vx = g.vy = g.turnRate = 0;
    return;
  }
  g.phase += dt * 0.13;
  const target = waterTarget(w, h, scroll, g.phase, leaves);
  target.x += clamp(scrollVelocity * 0.035, -w * 0.035, w * 0.035);
  let vx = (target.x - g.x) * 0.8,
    vy = (target.y - g.y) * 0.8;
  const limit = clamp(Math.min(w * 0.06, h * 0.07), 22, 58),
    speed = Math.hypot(vx, vy);
  if (speed > limit) {
    vx *= limit / speed;
    vy *= limit / speed;
  }
  const response = 1 - Math.exp(-dt * 3.2);
  g.vx = lerp(g.vx, vx, response);
  g.vy = lerp(g.vy, vy, response);
  g.x += g.vx * dt;
  g.y += g.vy * dt;
  const headingX = g.vx + (pan * 0.85) / dt;
  const desiredRate =
    Math.hypot(headingX, g.vy) > 0.4
      ? clamp(
          angleDelta(g.angle, Math.atan2(g.vy, headingX)) * 2.8,
          -0.75,
          0.75,
        )
      : 0;
  g.turnRate = lerp(g.turnRate, desiredRate, 1 - Math.exp(-dt * 2.6));
  g.angle += g.turnRate * dt;
}
