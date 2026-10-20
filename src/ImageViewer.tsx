import { useCallback, useEffect, useRef, useState } from "react";
import type { Media } from "./data/projects";
import {
  cancelPointers,
  clampView,
  endPointer,
  fitImage,
  initialInteraction,
  movePointer,
  startPointer,
  stepImage,
  wheelScale,
  zoomAt,
  type ImageBounds,
  type Interaction,
  type Point,
} from "./image-viewer-gestures";
import "./image-viewer.css";

function ViewerIcon({
  name,
}: {
  name: "close" | "previous" | "next" | "minus" | "plus";
}) {
  const paths = {
    close: "m6 6 12 12M18 6 6 18",
    previous: "M19 12H5m6-6-6 6 6 6",
    next: "M5 12h14m-6-6 6 6-6 6",
    minus: "M5 12h14",
    plus: "M5 12h14M12 5v14",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export default function ImageViewer({
  images,
  initialIndex,
  title,
  close,
}: {
  images: readonly Media[];
  initialIndex: number;
  title: string;
  close: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null),
    stageRef = useRef<HTMLDivElement>(null),
    closeRef = useRef<HTMLButtonElement>(null),
    zoomInRef = useRef<HTMLButtonElement>(null),
    restoreZoomFocus = useRef(false);
  const [index, setIndex] = useState(() =>
    stepImage(initialIndex, 0, images.length),
  );
  const indexRef = useRef(index),
    interaction = useRef(initialInteraction());
  const [view, setView] = useState(interaction.current.view),
    [active, setActive] = useState(false);
  const [load, setLoad] = useState<"loading" | "ready" | "failed">("loading"),
    [retry, setRetry] = useState(0);
  const item = images[index];
  const firstBounds: ImageBounds = {
    viewport: { width: 0, height: 0 },
    image: { width: item?.width ?? 1, height: item?.height ?? 1 },
  };
  const boundsRef = useRef(firstBounds),
    [bounds, setBounds] = useState(firstBounds);
  const commit = useCallback((next: Interaction) => {
    interaction.current = next;
    setView(next.view);
    setActive(Boolean(next.gesture));
  }, []);
  const releaseCapture = useCallback((ids: number[]) => {
    const stage = stageRef.current;
    for (const id of ids) {
      try {
        if (stage?.hasPointerCapture(id)) stage.releasePointerCapture(id);
      } catch {
        /* Capture can already be released by the browser on cancellation. */
      }
    }
  }, []);
  const cancelGesture = useCallback(() => {
    const ids = Object.keys(interaction.current.pointers).map(Number);
    commit(cancelPointers(interaction.current));
    releaseCapture(ids);
  }, [commit, releaseCapture]);
  const zoomTo = useCallback(
    (scale: number, anchor: Point = { x: 0, y: 0 }) => {
      cancelGesture();
      commit({
        ...interaction.current,
        view: zoomAt(
          interaction.current.view,
          scale,
          anchor,
          boundsRef.current,
        ),
      });
    },
    [cancelGesture, commit],
  );
  const goTo = useCallback(
    (direction: number) => {
      const next = stepImage(indexRef.current, direction, images.length);
      if (next === indexRef.current) return;
      cancelGesture();
      indexRef.current = next;
      const nextBounds = {
        ...boundsRef.current,
        image: { width: images[next].width, height: images[next].height },
      };
      boundsRef.current = nextBounds;
      setBounds(nextBounds);
      commit(initialInteraction());
      setLoad("loading");
      setRetry(0);
      setIndex(next);
    },
    [images, cancelGesture, commit],
  );
  const pointInStage = (clientX: number, clientY: number): Point => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  };

  useEffect(() => {
    const dialog = dialogRef.current!;
    // Capture before opening: React autoFocus would already have replaced
    // this with a viewer control during mount, before showModal can run.
    const opener = dialog.ownerDocument.activeElement as HTMLElement | null;
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      // React removes this dialog during unmount. Restore after the parent
      // modal is active again rather than relying on detached-dialog close.
      queueMicrotask(() => {
        const parentDialog = opener?.closest("dialog");
        if (
          !dialog.open &&
          opener?.isConnected &&
          (!parentDialog || parentDialog.open)
        )
          opener.focus({ preventScroll: true });
      });
    };
  }, []);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      cancelGesture();
      const next = {
        ...boundsRef.current,
        viewport: { width: stage.clientWidth, height: stage.clientHeight },
      };
      boundsRef.current = next;
      setBounds(next);
      commit({
        ...interaction.current,
        view: clampView(interaction.current.view, next),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    const owner = stage.ownerDocument.defaultView!;
    owner.addEventListener("blur", cancelGesture);
    return () => {
      observer.disconnect();
      owner.removeEventListener("blur", cancelGesture);
      releaseCapture(Object.keys(interaction.current.pointers).map(Number));
    };
  }, [cancelGesture, commit, releaseCapture]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (load === "failed") return;
      const rect = stage.getBoundingClientRect();
      zoomTo(
        wheelScale(
          interaction.current.view.scale,
          event.deltaY,
          event.deltaMode,
          rect.height,
        ),
        {
          x: event.clientX - rect.left - rect.width / 2,
          y: event.clientY - rect.top - rect.height / 2,
        },
      );
    };
    stage.addEventListener("wheel", wheel, { passive: false });
    return () => stage.removeEventListener("wheel", wheel);
  }, [load, zoomTo]);

  const fit = fitImage(bounds),
    zoomed = view.scale > 1;
  useEffect(() => {
    if (!zoomed && restoreZoomFocus.current) {
      restoreZoomFocus.current = false;
      zoomInRef.current?.focus();
    }
  }, [zoomed]);
  const source = item?.clear ?? "";
  const imageUrl = retry
    ? `${source}${source.includes("?") ? "&" : "?"}viewer-retry=${retry}`
    : source;
  return (
    <dialog
      ref={dialogRef}
      className="image-viewer extended-viewer"
      aria-label={`${title}截图查看器`}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          goTo(event.key === "ArrowLeft" ? -1 : 1);
        } else if (["+", "=", "-", "0"].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          if (load !== "failed")
            zoomTo(
              event.key === "0"
                ? 1
                : interaction.current.view.scale +
                    (event.key === "-" ? -0.25 : 0.25),
            );
        }
      }}
    >
      <div className="viewer-toolbar">
        <div className="viewer-heading">
          <span className="viewer-title" title={title}>
            {title}
          </span>
          <span
            className="viewer-position"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`图片 ${index + 1}，共 ${images.length} 张`}
          >
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(images.length).padStart(2, "0")}
          </span>
        </div>
        <div className="viewer-actions">
          <button
            className="viewer-icon"
            aria-label="缩小图片"
            disabled={!zoomed || load === "failed"}
            onClick={() => zoomTo(interaction.current.view.scale - 0.25)}
          >
            <ViewerIcon name="minus" />
          </button>
          <div className="viewer-zoom-readout">
            {zoomed ? (
              <button
                className="viewer-reset"
                aria-label="还原图片"
                onClick={() => {
                  restoreZoomFocus.current = true;
                  zoomTo(1);
                }}
              >
                还原
              </button>
            ) : null}
            <output
              className="viewer-percentage"
              aria-label="相对适应窗口的缩放比例"
            >
              {Math.ceil(view.scale * 100)}%
            </output>
          </div>
          <button
            ref={zoomInRef}
            className="viewer-icon"
            aria-label="放大图片"
            disabled={view.scale >= 8 || load === "failed"}
            onClick={() => zoomTo(interaction.current.view.scale + 0.25)}
          >
            <ViewerIcon name="plus" />
          </button>
          <button
            ref={closeRef}
            className="viewer-icon viewer-close"
            aria-label="关闭图片"
            onClick={close}
          >
            <ViewerIcon name="close" />
          </button>
        </div>
      </div>
      <div className="viewer-content">
        <div
          ref={stageRef}
          className={`viewer-stage ${zoomed ? "is-zoomed" : ""} ${active ? "is-dragging" : ""}`}
          aria-label={zoomed ? "拖动查看图片细节" : "左右滑动切换项目图片"}
          onPointerDown={(event) => {
            if (
              event.button !== 0 ||
              load === "failed" ||
              (event.target as HTMLElement).closest("button")
            )
              return;
            event.preventDefault();
            const next = startPointer(
              interaction.current,
              event.pointerId,
              pointInStage(event.clientX, event.clientY),
            );
            commit(next);
            if (next.pointers[event.pointerId]) {
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                /* Synthesized events have no browser-owned active pointer. */
              }
            }
          }}
          onPointerMove={(event) =>
            commit(
              movePointer(
                interaction.current,
                event.pointerId,
                pointInStage(event.clientX, event.clientY),
                boundsRef.current,
              ),
            )
          }
          onPointerUp={(event) => {
            const result = endPointer(
              interaction.current,
              event.pointerId,
              pointInStage(event.clientX, event.clientY),
              boundsRef.current,
            );
            commit(result.state);
            releaseCapture([event.pointerId]);
            if (result.direction) goTo(result.direction);
          }}
          onPointerCancel={cancelGesture}
          onLostPointerCapture={(event) => {
            if (interaction.current.pointers[event.pointerId]) cancelGesture();
          }}
          onDragStart={(event) => event.preventDefault()}
        >
          {item && load !== "failed" ? (
            <img
              key={`${item.id}-${retry}`}
              className="viewer-image"
              src={imageUrl}
              alt={item.caption}
              draggable={false}
              decoding="async"
              width={item.width}
              height={item.height}
              style={{
                width: fit.width,
                height: fit.height,
                marginLeft: -fit.width / 2,
                marginTop: -fit.height / 2,
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              }}
              onLoad={(event) => {
                const image = event.currentTarget;
                const next = {
                  ...boundsRef.current,
                  image: {
                    width: image.naturalWidth || item.width,
                    height: image.naturalHeight || item.height,
                  },
                };
                boundsRef.current = next;
                setBounds(next);
                setLoad("ready");
                commit({
                  ...interaction.current,
                  view: clampView(interaction.current.view, next),
                });
              }}
              onError={() => {
                cancelGesture();
                setLoad("failed");
              }}
            />
          ) : null}
          {load === "loading" ? (
            <div className="viewer-loading" role="status">
              正在载入原图…
            </div>
          ) : null}
          {load === "failed" || !item ? (
            <div className="viewer-failure" role="status">
              <p>{item ? "这张图片暂时未能载入。" : "这个项目暂无图片。"}</p>
              {item ? (
                <button
                  aria-label="重新载入图片"
                  onClick={() => {
                    setRetry((value) => value + 1);
                    setLoad("loading");
                  }}
                >
                  重新载入
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <button
          className="viewer-nav viewer-previous"
          aria-label="上一张图片"
          disabled={index === 0}
          onClick={() => goTo(-1)}
        >
          <ViewerIcon name="previous" />
        </button>
        <button
          className="viewer-nav viewer-next"
          aria-label="下一张图片"
          disabled={index >= images.length - 1}
          onClick={() => goTo(1)}
        >
          <ViewerIcon name="next" />
        </button>
      </div>
      <div className="viewer-footer">
        <p className="viewer-caption">{item?.caption}</p>
        <p className="viewer-hint">
          {zoomed
            ? "拖动查看细节 · 还原后滑动切换"
            : "左右滑动切换 · 双指捏合或滚轮放大"}
        </p>
      </div>
    </dialog>
  );
}
