import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  getProject,
  mediaFor,
  projects,
  type Media,
  type Project,
  type ProjectId,
} from "./data/projects";
import {
  isProjectId,
  navigationUrl,
  parseLocation,
  type NavigationState,
} from "./navigation";
import { PondScene, type SceneFrame } from "./scene/PondScene";
import { galleryWheelOffset } from "./scroll";
import { preloadImage } from "./media-preload";
import { isTapGesture, shouldTrackPondPointer } from "./scene/input";
import {
  clamp,
  galleryCenter,
  galleryRadius,
  galleryStride,
  leafEdge,
} from "./scene/motion";

const initial = () => {
  const state = parseLocation(location.pathname, location.search);
  if (history.state?.folio && isProjectId(history.state.selected))
    state.selected = history.state.selected;
  return state;
};
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const indexOf = (id: ProjectId) => projects.findIndex((p) => p.id === id);
function preloadProjectCover(id: ProjectId) {
  const cover = mediaFor(id).find((item) => item.kind === "image");
  if (cover) void preloadImage(cover.dither, "high");
}
function Icon({ name }: { name: "back" | "close" | "arrow" }) {
  const paths = {
    back: "M19 12H5m6-6-6 6 6 6",
    close: "m6 6 12 12M18 6 6 18",
    arrow: "M5 12h14m-6-6 6 6-6 6",
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
export function MediaFigure({
  item,
  project,
  position,
  total,
  open,
}: {
  item: Media;
  project: Project;
  position: number;
  total: number;
  open: (item: Media) => void;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className={`case-media ${item.kind === "video" ? "is-film" : ""}`}>
      {failed ? (
        <div className="media-failure">
          <p>这张画面暂时未能载入。</p>
          <button onClick={() => setFailed(false)}>重新载入</button>
        </div>
      ) : item.kind === "video" ? (
        <video
          controls
          playsInline
          preload="none"
          poster={item.poster}
          width={item.width}
          height={item.height}
          onError={() => setFailed(true)}
        >
          <source src={item.dither} type="video/mp4" />
          <p>浏览器不支持视频播放。</p>
        </video>
      ) : (
        <button
          className="image-open"
          onClick={() => open(item)}
          aria-label={`放大查看${project.title}：${item.caption}`}
        >
          <img
            src={item.dither}
            alt={item.caption}
            loading={position === 1 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={position === 1 ? "high" : "auto"}
            width={item.width}
            height={item.height}
            onError={() => setFailed(true)}
          />
        </button>
      )}
      <figcaption>
        <span className="media-caption">{item.caption}</span>
        {item.kind === "image" && (
          <span
            className="media-number"
            aria-label={`图片 ${position}，共 ${total} 张`}
          >
            {String(position).padStart(2, "0")} /{" "}
            {String(total).padStart(2, "0")}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
function ImageViewer({
  item,
  title,
  close,
}: {
  item: Media;
  title: string;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [clear, setClear] = useState(false),
    [zoom, setZoom] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="image-viewer"
      aria-label={`${title}截图查看器`}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        close();
      }}
    >
      <div className="viewer-toolbar">
        <span>{title}</span>
        <div className="viewer-actions">
          <button aria-pressed={clear} onClick={() => setClear((v) => !v)}>
            {clear ? "返回抖色" : "清晰原图"}
          </button>
          <button aria-pressed={zoom} onClick={() => setZoom((v) => !v)}>
            {zoom ? "适应窗口" : "原尺寸"}
          </button>
          <button
            className="icon-button"
            aria-label="关闭图片"
            onClick={close}
            autoFocus
          >
            <Icon name="close" />
          </button>
        </div>
      </div>
      <div
        className={`viewer-surface ${zoom ? "is-zoomed" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <img
          src={clear ? item.clear : item.dither}
          alt={`${item.caption}（${clear ? "清晰原图" : "抖色版本"}）`}
          width={item.width}
          height={item.height}
        />
      </div>
    </dialog>
  );
}
function ProjectDetail({
  project,
  close,
  outline,
}: {
  project: Project;
  close: () => void;
  outline: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [viewer, setViewer] = useState<Media | null>(null);
  const media = mediaFor(project.id);
  useEffect(() => {
    const remainingImages = mediaFor(project.id)
      .filter((item) => item.kind === "image")
      .slice(1);
    if (!remainingImages.length) return;

    let cancelled = false;
    const warmRemainingImages = () => {
      if (cancelled) return;
      for (const item of remainingImages) void preloadImage(item.dither, "low");
    };
    const idleWindow = window as typeof window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(warmRemainingImages, {
        timeout: 500,
      });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(handle);
      };
    }

    const handle = window.setTimeout(warmRemainingImages, 100);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [project.id]);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    if (!reduced())
      dialog.animate(
        [
          { clipPath: outline, opacity: 0.5 },
          { clipPath: "polygon(0% 0%,100% 0%,100% 100%,0% 100%)", opacity: 1 },
        ],
        { duration: 650, easing: "cubic-bezier(.16,1,.3,1)" },
      );
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="project-detail"
      aria-labelledby="case-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      style={{ "--case-accent": project.accent } as CSSProperties}
    >
      <div className="case-toolbar">
        <span>{project.chinese}</span>
        <button
          className="quiet-button"
          aria-label="合上这一叶"
          onClick={close}
          autoFocus
        >
          <span>合上这一叶</span>
          <Icon name="close" />
        </button>
      </div>
      <div className="case-scroll">
        <article className="case-content">
          <header className="case-heading">
            <h1 id="case-title">{project.title}</h1>
            <p className="case-subtitle">{project.chinese}</p>
            <p className="case-summary">{project.summary}</p>
            <div className="case-links">
              <a href={project.repo} target="_blank" rel="noopener noreferrer">
                查看源码
                <Icon name="arrow" />
              </a>
              {project.demo && (
                <a
                  href={project.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  打开作品
                  <Icon name="arrow" />
                </a>
              )}
            </div>
            <p className="case-medium">{project.medium}</p>
          </header>
          {media[0] && (
            <MediaFigure
              item={media[0]}
              project={project}
              position={1}
              total={media.length}
              open={setViewer}
            />
          )}
          <div className="case-introduction">
            <h2>关于这个作品</h2>
            <div>
              {project.introduction.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
          <section className="case-decisions" aria-label="关键设计与实现选择">
            {project.decisions.map((d, i) => (
              <div className="decision" key={d.title}>
                <h3>{d.title}</h3>
                <p>{d.text}</p>
                {i === 1 && media[1] && (
                  <MediaFigure
                    item={media[1]}
                    project={project}
                    position={2}
                    total={media.length}
                    open={setViewer}
                  />
                )}
              </div>
            ))}
          </section>
          {media.slice(2).map((item, i) => (
            <MediaFigure
              key={item.id}
              item={item}
              project={project}
              position={i + 3}
              total={media.length}
              open={setViewer}
            />
          ))}
          <footer className="case-footer">
            <p>下一片荷叶，另一个想法。</p>
            <button className="text-button" onClick={close}>
              回到作品长卷
              <Icon name="arrow" />
            </button>
          </footer>
        </article>
      </div>
      {viewer && (
        <ImageViewer
          item={viewer}
          title={project.title}
          close={() => setViewer(null)}
        />
      )}
    </dialog>
  );
}
function leafHitShape(seed: number) {
  return `polygon(${Array.from({ length: 88 }, (_, i) => {
    const a = (i / 88) * Math.PI * 2,
      r = leafEdge(a, seed);
    return `${50 + Math.cos(a) * r * 47}% ${50 + Math.sin(a) * r * 47}%`;
  }).join(",")})`;
}
export default function App() {
  const [nav, setNav] = useState<NavigationState>(initial),
    [size, setSize] = useState({ w: innerWidth, h: innerHeight });
  const [ready, setReady] = useState(false),
    [fallback, setFallback] = useState(false),
    [hovered, setHovered] = useState<ProjectId | null>(null);
  const [current, setCurrent] = useState(indexOf(nav.selected)),
    [outline, setOutline] = useState("circle(0% at 50% 50%)");
  const root = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    gallery = useRef<HTMLDivElement>(null),
    scene = useRef<PondScene | null>(null);
  const fishButtons = useRef(new Map<ProjectId, HTMLButtonElement>()),
    navRef = useRef(nav),
    hoveredRef = useRef<ProjectId | null>(null),
    readyRef = useRef(false);
  const scrollMemory = useRef(
      history.state?.folio && Number.isFinite(history.state.scroll)
        ? history.state.scroll
        : indexOf(nav.selected) * galleryStride(innerWidth),
    ),
    lastScroll = useRef({ x: scrollMemory.current, time: performance.now() });
  const velocityTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    ),
    pointerStart = useRef({ x: 0, y: 0 }),
    touchPondPointer = useRef(false),
    lastWidth = useRef(innerWidth);
  const callbacks = useRef({ pick: (_id: ProjectId) => {} });
  const travelling = useRef(false),
    renderedScroll = useRef(-1);
  navRef.current = nav;
  const navigate = useCallback((next: NavigationState, replace = false) => {
    history[replace ? "replaceState" : "pushState"](
      { folio: true, scroll: scrollMemory.current, selected: next.selected },
      "",
      navigationUrl(next),
    );
    setNav(next);
  }, []);
  const enter = useCallback(
    (id: ProjectId) => {
      const x = indexOf(id) * galleryStride(innerWidth);
      scrollMemory.current = x;
      navigate({ page: "works", selected: id, detail: null });
    },
    [navigate],
  );
  callbacks.current.pick = enter;
  useEffect(() => {
    const onFrame = (frame: SceneFrame) => {
      root.current?.style.setProperty("--journey", `${frame.progress}`);
      root.current?.style.setProperty("--camera-x", `${frame.cameraX}`);
      if (root.current)
        root.current.dataset.travelling = String(frame.travelling);
      travelling.current = frame.travelling;
      renderedScroll.current = frame.scroll;
      if (
        gallery.current &&
        Math.abs(gallery.current.scrollLeft - frame.scroll) > 0.5
      )
        gallery.current.scrollLeft = frame.scroll;
      if (navRef.current.page === "works") {
        setCurrent(
          clamp(Math.round(frame.scroll / galleryStride(innerWidth)), 0, 7),
        );
        if (!frame.travelling) scrollMemory.current = frame.scroll;
      }
      if (frame.travelling)
        lastScroll.current = { x: frame.scroll, time: performance.now() };
      if (!readyRef.current) {
        readyRef.current = true;
        setReady(true);
      }
      if (hoveredRef.current !== frame.hovered) {
        hoveredRef.current = frame.hovered;
        setHovered(frame.hovered);
      }
      for (const f of frame.fish) {
        const b = fishButtons.current.get(f.id);
        if (b) {
          // Fish coordinates are in the viewport; the home DOM panel already
          // translates by progress * width, so do not translate labels twice.
          b.style.left = `${f.x + frame.progress * innerWidth}px`;
          b.style.top = `${f.y}px`;
          b.dataset.revealed = String(frame.hovered === f.id);
        }
      }
    };
    try {
      const instance = new PondScene(canvas.current!, {
        frame: onFrame,
        pick: (id) => callbacks.current.pick(id),
        error: () => {
          setFallback(true);
          setReady(true);
        },
      });
      scene.current = instance;
      instance.setNavigation(navRef.current, scrollMemory.current, true);
      if (import.meta.env.DEV)
        (window as unknown as { __pond: PondScene }).__pond = instance;
    } catch {
      setFallback(true);
      setReady(true);
    }
    const resize = () => {
      const w = innerWidth,
        h = innerHeight,
        stop = scrollMemory.current / galleryStride(lastWidth.current);
      lastWidth.current = w;
      setSize({ w, h });
      scene.current?.resize(w, h);
      requestAnimationFrame(() => {
        if (gallery.current && !scene.current) {
          gallery.current.scrollLeft = stop * galleryStride(w);
          scrollMemory.current = gallery.current.scrollLeft;
        }
      });
    };
    const contextLost = (e: Event) => {
      e.preventDefault();
      const lost = scene.current;
      scene.current = null;
      lost?.dispose();
      setFallback(true);
      setReady(true);
    };
    canvas.current?.addEventListener("webglcontextlost", contextLost);
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      canvas.current?.removeEventListener("webglcontextlost", contextLost);
      scene.current?.dispose();
      clearTimeout(velocityTimer.current);
    };
  }, []);
  useEffect(() => {
    clearTimeout(velocityTimer.current);
    scene.current?.setNavigation(nav, scrollMemory.current);
    if (fallback && nav.page === "works" && gallery.current) {
      gallery.current.scrollLeft = scrollMemory.current;
    }
    document.title = nav.detail
      ? `${getProject(nav.detail).title} · Luke`
      : "Luke · 一池作品";
    if (fallback)
      root.current?.style.setProperty(
        "--journey",
        nav.page === "works" ? "1" : "0",
      );
  }, [nav, fallback]);
  useEffect(() => {
    if (!history.state?.folio)
      history.replaceState(
        {
          folio: true,
          scroll: scrollMemory.current,
          selected: navRef.current.selected,
        },
        "",
      );
    const pop = () => {
      const next = initial();
      if (history.state?.selected) next.selected = history.state.selected;
      scrollMemory.current =
        history.state?.scroll ??
        indexOf(next.selected) * galleryStride(innerWidth);
      setNav(next);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    const el = gallery.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      if (navRef.current.page !== "works" || navRef.current.detail) return;
      const offset = galleryWheelOffset(event, innerWidth);
      if (offset === null) return;
      event.preventDefault();
      if (travelling.current) return;
      el.scrollLeft += offset;
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const onScroll = () => {
    const x = gallery.current?.scrollLeft ?? 0;
    // RAF synchronizes the DOM to the camera while flying. Its resulting
    // native scroll events must not become new navigation destinations.
    if (
      navRef.current.page !== "works" ||
      navRef.current.detail ||
      travelling.current ||
      Math.abs(x - renderedScroll.current) < 1
    )
      return;
    const now = performance.now(),
      dt = Math.max(16, now - lastScroll.current.time),
      v = clamp(((x - lastScroll.current.x) / dt) * 1000, -4000, 4000);
    lastScroll.current = { x, time: now };
    scrollMemory.current = x;
    scene.current?.setScroll(x, v);
    clearTimeout(velocityTimer.current);
    velocityTimer.current = setTimeout(
      () => scene.current?.setScroll(scrollMemory.current, 0),
      150,
    );
    setCurrent(clamp(Math.round(x / galleryStride(innerWidth)), 0, 7));
    if (navRef.current.page === "works" && !navRef.current.detail)
      history.replaceState({ ...history.state, scroll: x }, "");
  };
  const detailClick = (id: ProjectId) => {
    preloadProjectCover(id);
    setOutline(scene.current?.getProjectOutline(id) ?? "circle(0% at 50% 50%)");
    navigate({ ...navRef.current, page: "works", detail: id });
    history.replaceState({ ...history.state, detailEntry: true }, "");
  };
  const closeDetail = () => {
    if (history.state?.detailEntry) history.back();
    else navigate({ ...navRef.current, detail: null }, true);
  };
  const shiftGallery = (index: number) => {
    if (travelling.current) return;
    gallery.current?.scrollTo({
      left: clamp(index, 0, 7) * galleryStride(size.w),
      behavior: reduced() ? "instant" : "smooth",
    });
  };
  const radius = galleryRadius(size.w, size.h);
  return (
    <div
      className={`folio ${nav.page === "works" ? "in-works" : "in-pond"} ${nav.detail ? "has-detail" : ""} ${fallback ? "is-fallback" : ""}`}
      ref={root}
      onPointerMove={(e) => {
        if (
          navRef.current.page === "pond" &&
          shouldTrackPondPointer(e.pointerType, touchPondPointer.current)
        )
          scene.current?.setPointer(e.clientX, e.clientY, true);
      }}
      onPointerLeave={() => {
        if (!touchPondPointer.current)
          scene.current?.setPointer(-1000, -1000, false);
      }}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        const target = e.target as Element;
        touchPondPointer.current =
          e.pointerType === "touch" &&
          navRef.current.page === "pond" &&
          !target.closest("button,a");
        if (touchPondPointer.current)
          scene.current?.setPointer(e.clientX, e.clientY, true);
      }}
      onPointerUp={(e) => {
        const target = e.target as Element,
          interactive = target.closest("button,a"),
          isTap = isTapGesture(pointerStart.current, {
            x: e.clientX,
            y: e.clientY,
          });
        const wasPondTouch =
          e.pointerType === "touch" && touchPondPointer.current;
        if (e.pointerType === "touch") {
          touchPondPointer.current = false;
          if (wasPondTouch) scene.current?.setPointer(-1000, -1000, false);
        }
        if (navRef.current.page === "pond" && !interactive && isTap) {
          const disturbedLeaf =
            e.pointerType === "touch" &&
            wasPondTouch &&
            Boolean(scene.current?.disturbLeafAt(e.clientX, e.clientY));
          if (!disturbedLeaf) scene.current?.selectAt(e.clientX, e.clientY);
        }
      }}
      onPointerCancel={(e) => {
        if (e.pointerType === "touch") {
          const wasPondTouch = touchPondPointer.current;
          touchPondPointer.current = false;
          if (wasPondTouch) scene.current?.setPointer(-1000, -1000, false);
        }
      }}
    >
      <canvas className="pond-canvas" ref={canvas} aria-hidden="true" />
      {fallback && <div className="fallback-pond" aria-hidden="true" />}
      <div
        className="pond-page"
        aria-hidden={nav.page !== "pond"}
        inert={nav.page !== "pond"}
      >
        <div className="fish-entries" aria-label="选择一条锦鲤，进入对应作品">
          {projects.map((p, i) => (
            <button
              key={p.id}
              className="fish-entry"
              ref={(el) => {
                if (el) fishButtons.current.set(p.id, el);
                else fishButtons.current.delete(p.id);
              }}
              aria-label={`跟随锦鲤，查看${p.title}`}
              onFocus={() => scene.current?.focusKoi(p.id)}
              onBlur={() => scene.current?.focusKoi(null)}
              onClick={() => enter(p.id)}
              style={
                fallback
                  ? {
                      left: "auto",
                      top: "auto",
                    }
                  : undefined
              }
            >
              {fallback && <span className="fallback-fish" />}
              <span className="fish-name">{p.title}</span>
            </button>
          ))}
        </div>
        <p className="pond-hint">
          {fallback ? "选择作品，进入长卷" : "拨开荷叶，随锦鲤入卷"}
          <span>{fallback ? "静态游览模式" : "点击锦鲤探索项目"}</span>
        </p>
      </div>
      <div
        className="works-page"
        aria-hidden={nav.page !== "works"}
        inert={nav.page !== "works"}
      >
        <header className="works-toolbar">
          <button
            className="quiet-button"
            onClick={() =>
              navigate({ page: "pond", selected: nav.selected, detail: null })
            }
          >
            <Icon name="back" />
            <span>回到荷塘</span>
          </button>
          <span className="works-title">一池作品</span>
          <a
            className="github-link"
            href="https://github.com/luke711-xyy"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Luke 的 GitHub"
          >
            GitHub
            <Icon name="arrow" />
          </a>
        </header>
        <div
          className="gallery-scroll"
          ref={gallery}
          onScroll={onScroll}
          aria-label="作品长卷，横向滚动"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              shiftGallery(current + (e.key === "ArrowRight" ? 1 : -1));
            }
          }}
        >
          <div
            className="gallery-track"
            style={{ width: `${size.w + galleryStride(size.w) * 7}px` }}
          >
            {projects.map((p, i) => {
              const c = galleryCenter(i, size.w, size.h),
                r = radius * (i % 3 === 1 ? 0.92 : 1);
              return (
                <button
                  className={`project-leaf ${[1, 3, 4, 5, 7].includes(i) ? "is-light" : ""}`}
                  key={p.id}
                  style={{
                    left: c.x,
                    top: c.y,
                    width: r * 2,
                    height: r * 1.58,
                    clipPath: leafHitShape(88 + i),
                  }}
                  onClick={() => detailClick(p.id)}
                  onPointerEnter={() => {
                    scene.current?.setHoveredProject(p.id);
                    preloadProjectCover(p.id);
                  }}
                  onPointerLeave={() => scene.current?.setHoveredProject(null)}
                  onFocus={(e) => {
                    scene.current?.setHoveredProject(p.id);
                    preloadProjectCover(p.id);
                    if (e.currentTarget.matches(":focus-visible"))
                      shiftGallery(i);
                  }}
                  onBlur={() => scene.current?.setHoveredProject(null)}
                  aria-label={`展开${p.title}：${p.chinese}`}
                >
                  {fallback && (
                    <span className="fallback-emblem">
                      {p.title.slice(0, 1)}
                    </span>
                  )}
                  <span className="project-leaf-title">
                    {p.title}
                    <span>{p.chinese}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <footer className="works-footer">
          <p>
            横向游览<span>点击荷叶，展开作品</span>
          </p>
          <nav className="gallery-progress" aria-label="作品位置">
            {projects.map((p, i) => (
              <button
                key={p.id}
                className={current === i ? "is-current" : ""}
                aria-label={`移至${p.title}`}
                aria-current={current === i ? "true" : undefined}
                onClick={() => shiftGallery(i)}
              >
                <span />
              </button>
            ))}
          </nav>
          <div className="gallery-arrows">
            <button
              className="icon-button"
              aria-label="上一个作品"
              disabled={current === 0}
              onClick={() => shiftGallery(current - 1)}
            >
              <Icon name="back" />
            </button>
            <button
              className="icon-button"
              aria-label="下一个作品"
              disabled={current === 7}
              onClick={() => shiftGallery(current + 1)}
            >
              <Icon name="arrow" />
            </button>
          </div>
        </footer>
      </div>
      {!ready && (
        <div className="loading-state" role="status">
          <span className="loading-leaf" />
          正在铺开这一池作品
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {hovered ? `发现${getProject(hovered).title}，点击锦鲤进入` : ""}
      </span>
      {nav.detail && (
        <ProjectDetail
          key={nav.detail}
          project={getProject(nav.detail)}
          close={closeDetail}
          outline={outline}
        />
      )}
    </div>
  );
}
