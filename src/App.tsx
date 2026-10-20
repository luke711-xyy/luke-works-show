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
  commitNavigation,
  navigationUrl,
  parseLocation,
  writeHistorySafely,
  type NavigationState,
} from "./navigation";
import type { PondScene, SceneFrame } from "./scene/PondScene";
import { galleryWheelOffset } from "./scroll";
import { preloadImage, warmImages } from "./media-preload";
import { isTapGesture, shouldTrackPondPointer } from "./scene/input";
import ImageViewer from "./ImageViewer";
import { imageSequence } from "./image-viewer-gestures";
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
const imageSource = (item: Media) =>
  innerWidth < 640 && item.mobile ? item.mobile.src : (item.clear ?? "");
const saveData = () =>
  Boolean(
    (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection?.saveData ||
    /(^|-)2g$/.test(
      (navigator as Navigator & { connection?: { effectiveType?: string } })
        .connection?.effectiveType ?? "",
    ),
  );
function preloadProjectCover(id: ProjectId) {
  const cover = mediaFor(id)[0];
  if (cover)
    void preloadImage(
      cover.kind === "video" ? cover.poster! : imageSource(cover),
      "high",
    );
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
          <picture>
            {item.mobile && (
              <source media="(max-width: 639px)" srcSet={item.mobile.src} />
            )}
            <img
              src={item.clear}
              alt={item.caption}
              loading={position === 1 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={position === 1 ? "high" : "auto"}
              width={item.width}
              height={item.height}
              onError={() => setFailed(true)}
            />
          </picture>
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
  const [viewer, setViewer] = useState<number | null>(null);
  const media = mediaFor(project.id);
  const images = imageSequence(media);
  const imagePosition = (item: Media) =>
    images.findIndex((image) => image.id === item.id) + 1;
  const openImage = (item: Media) => {
    const index = images.findIndex((image) => image.id === item.id);
    if (index >= 0) setViewer(index);
  };
  useEffect(() => {
    // The first image is already warm from the leaf. Only look one image
    // ahead; native lazy loading handles the rest as the visitor scrolls.
    if (saveData()) return;
    const next = mediaFor(project.id).filter(
      (item) => item.kind === "image",
    )[1];
    return next ? warmImages([imageSource(next)]) : undefined;
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
        {
          duration: innerWidth < 640 ? 260 : 450,
          easing: "cubic-bezier(.16,1,.3,1)",
        },
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
              position={imagePosition(media[0])}
              total={images.length}
              open={openImage}
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
                    position={imagePosition(media[1])}
                    total={images.length}
                    open={openImage}
                  />
                )}
              </div>
            ))}
          </section>
          {media.slice(2).map((item) => (
            <MediaFigure
              key={item.id}
              item={item}
              project={project}
              position={imagePosition(item)}
              total={images.length}
              open={openImage}
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
      {viewer !== null && (
        <ImageViewer
          images={images}
          initialIndex={viewer}
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
    inscription = useRef<HTMLParagraphElement>(null),
    scene = useRef<PondScene | null>(null);
  const fishButtons = useRef(new Map<ProjectId, HTMLButtonElement>()),
    projectButtons = useRef(new Map<ProjectId, HTMLButtonElement>()),
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
    projectPointer = useRef<{
      id: ProjectId;
      pointerId: number;
      released: boolean;
    } | null>(null),
    cancelledProjectTap = useRef(false),
    touchPondPointer = useRef(false),
    lastWidth = useRef(innerWidth);
  const callbacks = useRef({ pick: (_id: ProjectId) => {} });
  const travelling = useRef(false),
    renderedScroll = useRef(-1),
    initialGallerySync = useRef(true);
  navRef.current = nav;
  const navigate = useCallback((next: NavigationState, replace = false) => {
    return commitNavigation(
      history,
      next,
      scrollMemory.current,
      replace,
      () => {
        navRef.current = next;
        setNav(next);
      },
    );
  }, []);
  const enter = useCallback(
    (id: ProjectId) => {
      preloadProjectCover(id);
      const x = indexOf(id) * galleryStride(innerWidth);
      scrollMemory.current = x;
      navigate({ page: "works", selected: id, detail: null });
    },
    [navigate],
  );
  callbacks.current.pick = enter;
  useEffect(() => {
    const onFrame = (frame: SceneFrame) => {
      const homePan = Math.min(frame.cameraX, frame.galleryOrigin);
      const panelX = Math.max(0, frame.galleryOrigin - frame.cameraX);
      const setStage = (key: string, value: string) => {
        if (root.current && root.current.style.getPropertyValue(key) !== value)
          root.current.style.setProperty(key, value);
      };
      setStage("--home-x", `${-homePan}px`);
      setStage("--gallery-x", `${panelX}px`);
      // The paper tiles every 512px. A bounded compositor translation has
      // identical phase without repainting the whole viewport every frame.
      setStage("--paper-x", `${-(frame.cameraX % 512)}px`);
      if (root.current)
        root.current.dataset.travelling = String(frame.travelling);
      if (inscription.current) {
        const pose = frame.inscription;
        // Like the fish labels, compensate for the home panel's own pan.
        inscription.current.style.left = `${pose.x + homePan}px`;
        inscription.current.style.top = `${pose.y}px`;
        inscription.current.style.setProperty(
          "--inscription-size",
          `${clamp(pose.radius * 0.15, 14, 32)}px`,
        );
        inscription.current.style.setProperty(
          "--inscription-angle",
          `${pose.angle}rad`,
        );
        inscription.current.style.visibility = pose.visible
          ? "visible"
          : "hidden";
      }
      const syncScroll =
        initialGallerySync.current ||
        travelling.current ||
        frame.travelling ||
        frame.progress < 1;
      travelling.current = frame.travelling;
      renderedScroll.current = frame.scroll;
      if (
        gallery.current &&
        syncScroll &&
        Math.abs(gallery.current.scrollLeft - frame.scroll) > 0.5
      )
        gallery.current.scrollLeft = frame.scroll;
      initialGallerySync.current = false;
      // Sticky viewport children do not take the compositor's independent
      // native-scroll transform. Leaf, label and hit shape share this GPU frame.
      const visibleProjects = new Set(
        frame.projects.map((project) => project.id),
      );
      for (const [id, button] of projectButtons.current) {
        const visibility = visibleProjects.has(id) ? "visible" : "hidden";
        if (button.style.visibility !== visibility)
          button.style.visibility = visibility;
      }
      for (const project of frame.projects) {
        const button = projectButtons.current.get(project.id);
        if (!button) continue;
        const b = project.bounds;
        button.dataset.sceneBound = "true";
        const values = {
          "--leaf-x": `${b.x - panelX}px`,
          "--leaf-y": `${b.y}px`,
          "--leaf-w": `${b.width}px`,
          "--leaf-h": `${b.height}px`,
          "--leaf-clip": `polygon(${project.polygon.map((p) => `${(((p.x - b.x) / b.width) * 100).toFixed(3)}% ${(((p.y - b.y) / b.height) * 100).toFixed(3)}%`).join(",")})`,
          "--title-x": `${project.title.x - b.x}px`,
          "--title-y": `${project.title.y - b.y}px`,
          "--title-width": `${project.radius * 1.6}px`,
          "--title-scale": String(project.scale),
        };
        for (const [key, value] of Object.entries(values))
          if (button.style.getPropertyValue(key) !== value)
            button.style.setProperty(key, value);
      }
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
          b.style.left = "0px";
          b.style.top = "0px";
          b.style.transform = `translate3d(${f.x + homePan}px,${f.y}px,0) translate(-50%,-50%)`;
          b.dataset.revealed = String(frame.hovered === f.id);
        }
      }
    };
    let disposed = false;
    // The lightweight DOM and navigation paint before downloading/constructing
    // WebGL. Deep-linked case studies remain usable while the pond warms up.
    void import("./scene/PondScene")
      .then(({ PondScene }) => {
        if (disposed) return;
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
      })
      .catch(() => {
        if (!disposed) {
          setFallback(true);
          setReady(true);
        }
      });
    const resize = () => {
      const w = innerWidth,
        h = innerHeight,
        stop = scrollMemory.current / galleryStride(lastWidth.current);
      lastWidth.current = w;
      setSize({ w, h });
      scene.current?.resize(w, h);
      initialGallerySync.current = true;
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
      disposed = true;
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
      for (const button of projectButtons.current.values())
        button.style.visibility = "visible";
    }
    document.title = nav.detail
      ? `${getProject(nav.detail).title} · Luke`
      : "Luke · 一池作品";
    if (fallback) {
      root.current?.style.setProperty(
        "--home-x",
        nav.page === "works" ? "-100vw" : "0px",
      );
      root.current?.style.setProperty(
        "--gallery-x",
        nav.page === "works" ? "0px" : "100vw",
      );
    }
  }, [nav, fallback]);
  useEffect(() => {
    if (
      !ready ||
      nav.page !== "works" ||
      nav.detail ||
      travelling.current ||
      saveData()
    )
      return;
    const cover = mediaFor(projects[current].id)[0];
    if (!cover) return;
    return warmImages([
      cover.kind === "video" ? cover.poster! : imageSource(cover),
    ]);
  }, [ready, nav.page, nav.detail, current]);
  useEffect(() => {
    if (!history.state?.folio)
      writeHistorySafely(
        history,
        {
          folio: true,
          scroll: scrollMemory.current,
          selected: navRef.current.selected,
        },
        "",
        true,
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
    velocityTimer.current = setTimeout(() => {
      scene.current?.setScroll(scrollMemory.current, 0);
      if (navRef.current.page === "works" && !navRef.current.detail)
        writeHistorySafely(
          history,
          { ...history.state, scroll: scrollMemory.current },
          "",
          true,
        );
    }, 150);
    setCurrent(clamp(Math.round(x / galleryStride(innerWidth)), 0, 7));
  };
  const detailClick = (id: ProjectId) => {
    if (navRef.current.detail === id) return;
    preloadProjectCover(id);
    setOutline(scene.current?.getProjectOutline(id) ?? "circle(0% at 50% 50%)");
    const next: NavigationState = {
      ...navRef.current,
      page: "works",
      detail: id,
    };
    // Persist once after a gesture, not on every scroll event. A WebKit history
    // rate limit must not leave a paused canvas behind an unopened detail.
    writeHistorySafely(
      history,
      { ...history.state, scroll: scrollMemory.current },
      "",
      true,
    );
    navigate(next);
  };
  const closeDetail = () => {
    if (
      history.state?.detailEntry &&
      location.pathname === navigationUrl(navRef.current)
    )
      history.back();
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
          projectPointer.current &&
          !isTapGesture(pointerStart.current, { x: e.clientX, y: e.clientY })
        ) {
          projectPointer.current = null;
          cancelledProjectTap.current = true;
        }
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
        projectPointer.current = null;
        cancelledProjectTap.current = false;
        if (
          navRef.current.page === "works" &&
          !navRef.current.detail &&
          !travelling.current &&
          e.button === 0
        ) {
          const owner = target
            .closest("[data-project]")
            ?.getAttribute("data-project");
          const id = isProjectId(owner)
            ? owner
            : target.closest("button,a")
              ? null
              : scene.current?.projectAt(e.clientX, e.clientY);
          if (id)
            projectPointer.current = {
              id,
              pointerId: e.pointerId,
              released: false,
            };
        }
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
        if (projectPointer.current?.pointerId === e.pointerId) {
          if (isTap) projectPointer.current.released = true;
          else {
            projectPointer.current = null;
            cancelledProjectTap.current = true;
          }
        }
      }}
      onClick={(e) => {
        const tap = projectPointer.current;
        projectPointer.current = null;
        if (
          navRef.current.page !== "works" ||
          navRef.current.detail ||
          travelling.current
        )
          return;
        const target = e.target as Element;
        const owner = target
          .closest("[data-project]")
          ?.getAttribute("data-project");
        // Native buttons also deliver keyboard/assistive activation here.
        if (e.detail === 0 && isProjectId(owner)) {
          detailClick(owner);
          return;
        }
        if (!tap?.released || cancelledProjectTap.current) return;
        const hit = isProjectId(owner)
          ? owner
          : target.closest("button,a")
            ? null
            : scene.current?.projectAt(e.clientX, e.clientY);
        // Keep the hit tree unchanged through pointerup. Opening a modal there
        // lets WebKit's following compatibility click hit its new screenshot.
        if (
          (!target.closest("button,a") || isProjectId(owner)) &&
          (!hit || hit === tap.id)
        )
          detailClick(tap.id);
      }}
      onPointerCancel={(e) => {
        projectPointer.current = null;
        cancelledProjectTap.current = true;
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
        <p className="pond-inscription" ref={inscription}>
          徐弋洋·作品集
        </p>
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
                      transform: "none",
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
          <span className="works-title">Luke's Collection</span>
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
            <div className="gallery-viewport">
              {projects.map((p, i) => {
                const c = galleryCenter(i, size.w, size.h),
                  r = radius * (i % 3 === 1 ? 0.92 : 1);
                return (
                  <button
                    className={`project-leaf ${[1, 3, 4, 5, 7].includes(i) ? "is-light" : ""}`}
                    key={p.id}
                    ref={(el) => {
                      if (el) projectButtons.current.set(p.id, el);
                      else projectButtons.current.delete(p.id);
                    }}
                    data-project={p.id}
                    style={
                      {
                        "--base-x": `${c.x}px`,
                        "--base-y": `${c.y}px`,
                        "--base-w": `${r * 2}px`,
                        "--base-h": `${r * 1.58}px`,
                        "--base-clip": leafHitShape(88 + i),
                      } as CSSProperties
                    }
                    onPointerDown={() => preloadProjectCover(p.id)}
                    onPointerEnter={(e) => {
                      if (e.pointerType !== "touch")
                        scene.current?.setHoveredProject(p.id);
                      preloadProjectCover(p.id);
                    }}
                    onPointerLeave={() =>
                      scene.current?.setHoveredProject(null)
                    }
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
