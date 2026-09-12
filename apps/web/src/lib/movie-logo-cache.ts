import { CURATED_HERO_FRANCHISE_POOL } from "@/lib/curated-hero-pool";

// Global client-side in-memory cache for movie title logos across routes and transitions
const logoBySlug = new Map<string, string>();
const preloadedUrls = new Set<string>();

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

export function preloadMovieLogo(url?: string | null): void {
  if (typeof window === "undefined" || !url) return;
  const clean = url.trim();
  if (!clean || preloadedUrls.has(clean)) return;

  const img = new window.Image();
  img.decoding = "sync";
  img.src = clean;
  img.onload = () => {
    preloadedUrls.add(clean);
  };
}
