import { pointInPolygon, type Vec2 } from "./motion";

export type TapDisturbance = Vec2 & { until: number };
const TAP_HOLD_SECONDS = 1.4;
const TAP_MOVEMENT_LIMIT = 12;
const MOBILE_LEAF_SCALE = 0.78;

export function createTapDisturbance(point: Vec2, now: number): TapDisturbance {
  return { ...point, until: now + TAP_HOLD_SECONDS };
}

export function activeTapDisturbance(
  disturbance: TapDisturbance | null,
  now: number,
) {
  return disturbance && now < disturbance.until
    ? { x: disturbance.x, y: disturbance.y, active: true as const }
    : null;
}

export function isTapGesture(start: Vec2, end: Vec2) {
  return Math.hypot(end.x - start.x, end.y - start.y) < TAP_MOVEMENT_LIMIT;
}

export function isVisiblePondLeafHit(
  point: Vec2,
  leaves: {
    polygon: Vec2[];
    visible: boolean;
    decoration?: boolean;
  }[],
) {
  return leaves.some(
    (leaf) =>
      leaf.visible && !leaf.decoration && pointInPolygon(point, leaf.polygon),
  );
}

export function shouldTrackPondPointer(
  pointerType: string,
  touchActive: boolean,
) {
  return pointerType !== "touch" || touchActive;
}

export function pondLeafRadius(
  width: number,
  height: number,
  relative: number,
) {
  const mobile = width < 640;
  const radius = Math.min(
    width * relative * (mobile ? 1.14 : 0.94),
    height * 0.265,
  );
  return radius * (mobile ? MOBILE_LEAF_SCALE : 1);
}
