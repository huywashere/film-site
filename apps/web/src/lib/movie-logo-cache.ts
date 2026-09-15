import { CURATED_HERO_FRANCHISE_POOL } from "@/lib/curated-hero-pool";
import {
  isImagePreloaded,
  markImagePreloaded,
  preloadImage,
} from "@/lib/image-preload-cache";

// Global client-side in-memory cache for movie title logos across routes and transitions
const logoBySlug = new Map<string, string>();

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
  return isImagePreloaded(url);
}

export function markMovieLogoPreloaded(url?: string | null): void {
  markImagePreloaded(url);
}

export function preloadMovieLogo(url?: string | null): Promise<boolean> {
  return preloadImage(url);
}
