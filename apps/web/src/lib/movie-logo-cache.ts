import { CURATED_HERO_FRANCHISE_POOL } from "@/lib/curated-hero-pool";

// Global client-side in-memory cache for movie title logos across routes and transitions
const logoBySlug = new Map<string, string>();
const preloadedUrls = new Set<string>();
const preloadPromises = new Map<string, Promise<boolean>>();

// Pre-seed from curated hero franchise pool for instant 0ms hits
if (Array.isArray(CURATED_HERO_FRANCHISE_POOL)) {
  for (const item of CURATED_HERO_FRANCHISE_POOL) {
    if (item.slug && item.titleLogo) {
      logoBySlug.set(item.slug, item.titleLogo);
    }
  }
}

export function getMovieLogo(slug?: string | null): string | null {
  if (!slug) return null;
  return logoBySlug.get(slug) || null;
}

export function setMovieLogo(slug: string, logoUrlOrPath?: string | null): void {
  if (!slug || !logoUrlOrPath) return;
  const clean = logoUrlOrPath.trim();
  if (!clean) return;
  logoBySlug.set(slug, clean);
}

export function isMovieLogoPreloaded(url?: string | null): boolean {
  if (!url) return false;
  return preloadedUrls.has(url);
}

export function markMovieLogoPreloaded(url?: string | null): void {
  if (!url) return;
  preloadedUrls.add(url);
}

export function preloadMovieLogo(url?: string | null): Promise<boolean> {
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
          // A loaded SVG or cached bitmap can reject decode while still being paintable.
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
