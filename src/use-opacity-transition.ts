import { useLayoutEffect, useRef, type RefObject } from "react";

// Reverse from the current opacity if history interrupts a fade. Never move
// or recreate the scene underneath, and release compositor hints on completion.
export function useOpacityTransition(
  ref: RefObject<HTMLElement | null>,
  visible: boolean,
  enterMs: number,
  exitMs: number,
  onExited?: () => void,
) {
  const exited = useRef(onExited);
  exited.current = onExited;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let active = true;
    const target = visible ? 1 : 0;
    const complete = () => {
      if (!active) return;
      element.style.opacity = String(target);
      element.style.willChange = "";
      if (!visible) exited.current?.();
    };
    const from = Number(getComputedStyle(element).opacity);
    if (from === target || typeof element.animate !== "function") {
      queueMicrotask(complete);
      return () => {
        active = false;
      };
    }
    element.style.willChange = "opacity";
    const animation = element.animate(
      [{ opacity: from }, { opacity: target }],
      {
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 1
          : visible
            ? enterMs
            : exitMs,
        easing: "ease-out",
        fill: "both",
      },
    );
    void animation.finished.then(
      () => {
        complete();
        animation.cancel();
      },
      () => {},
    );
    return () => {
      active = false;
      element.style.opacity = getComputedStyle(element).opacity;
      element.style.willChange = "";
      animation.cancel();
    };
  }, [ref, visible, enterMs, exitMs]);
}
