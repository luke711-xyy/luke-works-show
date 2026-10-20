const requests = new Map<
  string,
  { image: HTMLImageElement; loaded: Promise<void> }
>();

export function preloadImage(
  src: string,
  priority: "high" | "low" = "low",
): Promise<void> {
  if (!src || typeof Image === "undefined") return Promise.resolve();

  const existing = requests.get(src);
  if (existing) {
    if (priority === "high") existing.image.fetchPriority = "high";
    return existing.loaded;
  }

  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = priority;

  const loaded = new Promise<void>((resolve) => {
    image.onload = () => {
      image.onload = null;
      image.onerror = null;
      resolve();
    };
    image.onerror = () => {
      requests.delete(src);
      image.onload = null;
      image.onerror = null;
      resolve();
    };
  });

  // Keep only a small warm working set; the browser HTTP cache owns persistence.
  if (requests.size >= 12) requests.delete(requests.keys().next().value!);
  requests.set(src, { image, loaded });
  image.src = src;
  return loaded;
}

/** Speculative work is cancellable and serial, never a gallery-wide burst. */
export function warmImages(sources: readonly string[]): () => void {
  let cancelled = false,
    index = 0;
  let cancelScheduled = () => {};
  const schedule = () => {
    if (cancelled || index >= sources.length) return;
    const run = () => {
      if (cancelled) return;
      void preloadImage(sources[index++], "low").then(schedule);
    };
    if (typeof requestIdleCallback === "function") {
      const handle = requestIdleCallback(run, { timeout: 1500 });
      cancelScheduled = () => cancelIdleCallback(handle);
    } else {
      const handle = setTimeout(run, 150);
      cancelScheduled = () => clearTimeout(handle);
    }
  };
  schedule();
  return () => {
    cancelled = true;
    cancelScheduled();
  };
}
