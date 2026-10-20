export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type View = Point & { scale: number };
export type ImageBounds = { viewport: Size; image: Size };
type Drag = { kind: "swipe" | "pan"; id: number; start: Point; view: View };
type Pinch = {
  kind: "pinch";
  ids: [number, number];
  center: Point;
  distance: number;
  view: View;
};
export type Interaction = {
  view: View;
  pointers: Record<number, Point>;
  gesture: Drag | Pinch | null;
};

export const initialInteraction = (): Interaction => ({
  view: { scale: 1, x: 0, y: 0 },
  pointers: {},
  gesture: null,
});
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const validScale = (scale: number) =>
  clamp(Number.isFinite(scale) ? scale : 1, 1, 8);
const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export function fitImage({ viewport, image }: ImageBounds): Size {
  if (
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    image.width <= 0 ||
    image.height <= 0
  )
    return { width: 0, height: 0 };
  const ratio = Math.min(
    viewport.width / image.width,
    viewport.height / image.height,
  );
  return { width: image.width * ratio, height: image.height * ratio };
}

export function clampView(view: View, bounds: ImageBounds): View {
  const scale = validScale(view.scale),
    fit = fitImage(bounds);
  const maxX = Math.max(0, (fit.width * scale - bounds.viewport.width) / 2);
  const maxY = Math.max(0, (fit.height * scale - bounds.viewport.height) / 2);
  return {
    scale,
    x: maxX ? clamp(view.x, -maxX, maxX) : 0,
    y: maxY ? clamp(view.y, -maxY, maxY) : 0,
  };
}

export function zoomAt(
  view: View,
  targetScale: number,
  anchor: Point,
  bounds: ImageBounds,
): View {
  const scale = validScale(targetScale),
    ratio = scale / view.scale;
  return clampView(
    {
      scale,
      x: anchor.x - (anchor.x - view.x) * ratio,
      y: anchor.y - (anchor.y - view.y) * ratio,
    },
    bounds,
  );
}

export function wheelScale(
  scale: number,
  delta: number,
  mode: number,
  height: number,
): number {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? height : 1);
  return validScale(scale * Math.exp(clamp(-pixels * 0.002, -10, 10)));
}

export const imageSequence = <T extends { kind: string }>(
  media: readonly T[],
): T[] => media.filter((item) => item.kind === "image");
export const stepImage = (
  index: number,
  direction: number,
  length: number,
): number => clamp(index + direction, 0, Math.max(0, length - 1));

export function startPointer(
  state: Interaction,
  id: number,
  point: Point,
): Interaction {
  // Retain the original pair; a third pointer must never steal a pinch.
  if (state.pointers[id] || Object.keys(state.pointers).length >= 2)
    return state;
  const pointers = { ...state.pointers, [id]: point };
  const ids = Object.keys(pointers).map(Number);
  if (ids.length === 2) {
    const [a, b] = ids.map((pointer) => pointers[pointer]);
    return {
      ...state,
      pointers,
      gesture: {
        kind: "pinch",
        ids: [ids[0], ids[1]],
        center: midpoint(a, b),
        distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
        view: state.view,
      },
    };
  }
  return {
    ...state,
    pointers,
    gesture: {
      kind: state.view.scale > 1 ? "pan" : "swipe",
      id,
      start: point,
      view: state.view,
    },
  };
}

export function movePointer(
  state: Interaction,
  id: number,
  point: Point,
  bounds: ImageBounds,
): Interaction {
  if (!state.pointers[id] || !state.gesture) return state;
  const pointers = { ...state.pointers, [id]: point },
    gesture = state.gesture;
  if (gesture.kind === "pinch") {
    const [a, b] = gesture.ids.map((pointer) => pointers[pointer]);
    const center = midpoint(a, b);
    const scale = validScale(
      (gesture.view.scale * Math.hypot(b.x - a.x, b.y - a.y)) /
        gesture.distance,
    );
    const ratio = scale / gesture.view.scale;
    return {
      ...state,
      pointers,
      view: clampView(
        {
          scale,
          x: center.x - (gesture.center.x - gesture.view.x) * ratio,
          y: center.y - (gesture.center.y - gesture.view.y) * ratio,
        },
        bounds,
      ),
    };
  }
  if (gesture.kind === "pan")
    return {
      ...state,
      pointers,
      view: clampView(
        {
          ...gesture.view,
          x: gesture.view.x + point.x - gesture.start.x,
          y: gesture.view.y + point.y - gesture.start.y,
        },
        bounds,
      ),
    };
  return { ...state, pointers };
}

export function endPointer(
  state: Interaction,
  id: number,
  point: Point,
  bounds: ImageBounds,
): { state: Interaction; direction: -1 | 0 | 1 } {
  if (!state.pointers[id]) return { state, direction: 0 };
  const moved = movePointer(state, id, point, bounds);
  const pointers = { ...moved.pointers };
  delete pointers[id];
  let direction: -1 | 0 | 1 = 0;
  const gesture = state.gesture;
  if (
    gesture?.kind === "swipe" &&
    gesture.id === id &&
    state.view.scale === 1
  ) {
    const dx = point.x - gesture.start.x,
      dy = point.y - gesture.start.y;
    if (
      Math.abs(dx) >= clamp(bounds.viewport.width * 0.16, 48, 88) &&
      Math.abs(dx) > Math.abs(dy) * 1.35
    )
      direction = dx < 0 ? 1 : -1;
  }
  const remaining = Object.keys(pointers).map(Number)[0];
  // After a pinch, one remaining finger may pan but may never become a swipe.
  return {
    direction,
    state: {
      ...moved,
      pointers,
      gesture:
        remaining === undefined
          ? null
          : {
              kind: "pan",
              id: remaining,
              start: pointers[remaining],
              view: moved.view,
            },
    },
  };
}

export const cancelPointers = (state: Interaction): Interaction => ({
  ...state,
  pointers: {},
  gesture: null,
});
