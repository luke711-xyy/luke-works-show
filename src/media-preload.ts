const requests = new Map<string, Promise<void>>();

export function preloadImage(
  src: string,
  priority: "high" | "low" = "low",
): Promise<void> {
  if (!src || typeof Image === "undefined") return Promise.resolve();

  const existing = requests.get(src);
  if (existing) return existing;

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

  requests.set(src, loaded);
  image.src = src;
  return loaded;
}
