import {
  CURATED_HERO_FRANCHISE_POOL,
  CURATED_HERO_SLUG_ALIASES,
} from "@/lib/curated-hero-pool";
import {
  CURATED_SCIFI_HERO_POOL,
  CURATED_WAR_HERO_POOL,
  CURATED_ACTION_HERO_POOL,
  CURATED_VFX_HERO_POOL,
} from "@/lib/curated-genre-pools";
import {
  CURATED_CHINESE_HERO_POOL,
  CURATED_KOREAN_HERO_POOL,
  CURATED_ANIME_HERO_POOL,
  CURATED_SONG_NGU_AI_HERO_POOL,
} from "@/lib/curated-asian-hero";
import {
  MARVEL_SPOTLIGHTS,
  DC_SPOTLIGHTS,
} from "@/lib/universe-catalog";
import { DORAEMON_SPOTLIGHTS } from "@/lib/doraemon-catalog";
import {
  isImagePreloaded,
  markImagePreloaded,
  preloadImage,
} from "@/lib/image-preload-cache";

// Global client-side in-memory cache for movie title logos across routes and transitions
const logoBySlug = new Map<string, string>();
const STORAGE_KEY = "flexphim_movie_logos_v1";

function seedPool(pool: unknown[]): void {
  if (!Array.isArray(pool)) return;
  for (const item of pool) {
    if (item && typeof item === "object") {
      const record = item as { slug?: string; id?: string; titleLogo?: string; logoUrl?: string };
      const slug = record.slug || record.id;
      const logo = record.titleLogo || record.logoUrl;
      if (slug && logo) {
        logoBySlug.set(slug, logo);
      }
    }
  }
}

// Pre-seed all curated pools for instant 0ms logo hits
seedPool(CURATED_HERO_FRANCHISE_POOL);
seedPool(CURATED_SCIFI_HERO_POOL);
seedPool(CURATED_WAR_HERO_POOL);
seedPool(CURATED_ACTION_HERO_POOL);
seedPool(CURATED_VFX_HERO_POOL);
seedPool(CURATED_CHINESE_HERO_POOL);
seedPool(CURATED_KOREAN_HERO_POOL);
seedPool(CURATED_ANIME_HERO_POOL);
seedPool(CURATED_SONG_NGU_AI_HERO_POOL);
seedPool(MARVEL_SPOTLIGHTS);
seedPool(DC_SPOTLIGHTS);
seedPool(DORAEMON_SPOTLIGHTS);

// Hydrate dynamically fetched logos saved from past sessions
if (typeof window !== "undefined") {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        for (const [slug, url] of Object.entries(parsed)) {
          if (typeof url === "string" && !logoBySlug.has(slug)) {
            logoBySlug.set(slug, url);
          }
        }
      }
    }
  } catch {
    // Ignore storage read failures
  }
}

function persistStoredLogo(slug: string, url: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[slug] = url;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage write quota errors
  }
}

export function getMovieLogo(slug?: string | null): string | null {
  if (!slug) return null;
  const direct = logoBySlug.get(slug);
  if (direct) return direct;

  // Check alias table (e.g., "interstellar" <-> "ho-den-tu-than")
  const aliased = CURATED_HERO_SLUG_ALIASES[slug];
  if (aliased) {
    const aliasedLogo = logoBySlug.get(aliased);
    if (aliasedLogo) return aliasedLogo;
  }

  for (const [k, v] of Object.entries(CURATED_HERO_SLUG_ALIASES)) {
    if (v === slug) {
      const rev = logoBySlug.get(k);
      if (rev) return rev;
    }
  }

  return null;
}

export function setMovieLogo(slug: string, logoUrlOrPath?: string | null): void {
  if (!slug || !logoUrlOrPath) return;
  const clean = logoUrlOrPath.trim();
  if (!clean) return;
  logoBySlug.set(slug, clean);
  persistStoredLogo(slug, clean);
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

