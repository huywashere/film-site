"use client";

import { useQuery } from "@tanstack/react-query";
import { extractTmdbInfo } from "@/lib/tmdb";

export interface OmdbData {
  imdbId: string | null;
  title: string | null;
  year: string | null;
  rated: string | null;
  runtime: string | null;
  imdbRating: string | null;
  imdbVotes: string | null;
  rottenTomatoes: string | null;
  rottenTomatoesAudience: string | null;
  tmdbRating: string | null;
  metacritic: string | null;
  awards: string | null;
  boxOffice: string | null;
  plot: string | null;
  language: string | null;
  country: string | null;
  type: string | null;
}

// In-memory instant client cache for 0ms tab switching
const omdbMemoryCache = new Map<string, OmdbData>();

function getCacheKey(imdbId: string | null | undefined, title: string, year?: string | number): string {
  if (imdbId) return `imdb:${imdbId.toLowerCase().trim()}`;
  return `title:${title.toLowerCase().trim()}:${year || ""}`;
}

function readClientCachedOmdb(key: string): OmdbData | null {
  if (omdbMemoryCache.has(key)) {
    return omdbMemoryCache.get(key)!;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`omdb_cache_v2_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        omdbMemoryCache.set(key, parsed);
        return parsed;
      }
    } catch {}
  }
  return null;
}

function writeClientCachedOmdb(key: string, data: OmdbData) {
  omdbMemoryCache.set(key, data);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`omdb_cache_v2_${key}`, JSON.stringify(data));
    } catch {}
  }
}

async function fetchOmdbData(film: any, cacheKey: string): Promise<OmdbData | null> {
  const cached = readClientCachedOmdb(cacheKey);
  if (cached) return cached;

  const { imdbId, tmdbId, type } = extractTmdbInfo(film);
  const title = film?.origin_name || film?.name || film?.title || "";
  const year = film?.year ? String(film.year) : undefined;
  const filmType = film?.type || type;

  const params = new URLSearchParams();
  if (imdbId) {
    params.set("imdbId", imdbId);
  }
  if (tmdbId) {
    params.set("tmdbId", String(tmdbId));
  }
  if (title) {
    params.set("title", title);
  }
  if (year) {
    params.set("year", year);
  }
  if (filmType) {
    params.set("type", filmType);
  }

  if (!imdbId && !tmdbId && !title) {
    return null;
  }

  try {
    const res = await fetch(`/api/omdb?${params.toString()}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json) {
      writeClientCachedOmdb(cacheKey, json);
    }
    return json;
  } catch {
    return null;
  }
}

/**
 * Hook để fetch dữ liệu OMDB cho một bộ phim với bộ nhớ đệm tức thì.
 * Sẽ tìm bằng IMDb ID (nếu có) hoặc tiêu đề gốc + năm.
 */
export function useOmdb(film: any, enabled = true) {
  const { imdbId, tmdbId } = extractTmdbInfo(film ?? {});
  const title = film?.origin_name || film?.name || film?.title || "";
  const cacheKey = getCacheKey(imdbId, title, film?.year);

  const initialCached = readClientCachedOmdb(cacheKey);

  const query = useQuery<OmdbData | null>({
    queryKey: ["omdb", cacheKey],
    queryFn: () => fetchOmdbData(film, cacheKey),
    initialData: initialCached || undefined,
    enabled: enabled && !!film && !!(imdbId || tmdbId || title),
    staleTime: 1000 * 60 * 60 * 24,    // 24h
    gcTime: 1000 * 60 * 60 * 24 * 7,   // 7 days
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    omdb: query.data ?? initialCached ?? null,
  };
}
