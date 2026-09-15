const preloadedUrls = new Set<string>();
const preloadPromises = new Map<string, Promise<boolean>>();

export function isImagePreloaded(url?: string | null): boolean {
  if (!url) return false;
  return preloadedUrls.has(url);
}

export function markImagePreloaded(url?: string | null): void {
  if (!url) return;
  preloadedUrls.add(url);
}

export function preloadImage(url?: string | null): Promise<boolean> {
  if (typeof window === "undefined" || !url) return Promise.resolve(false);
  const clean = url.trim();
  if (!clean) return Promise.resolve(false);
  if (preloadedUrls.has(clean)) return Promise.resolve(true);

  const pending = preloadPromises.get(clean);
  if (pending) return pending;

  const promise = new Promise<boolean>((resolve) => {
    const img = new window.Image();
    let settled = false;
    const settle = (ready: boolean) => {
      if (ready) preloadedUrls.add(clean);
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      preloadPromises.delete(clean);
      resolve(ready);
    };
    const timeout = window.setTimeout(() => settle(false), 1_800);
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      const finish = async () => {
        try {
          await img.decode();
        } catch {
          // Loaded SVGs and cached bitmaps may reject decode but still paint.
        }
        settle(img.naturalWidth > 0);
      };
      void finish();
    };
    img.onerror = () => settle(false);
    img.src = clean;
  });

  preloadPromises.set(clean, promise);
  return promise;
}
