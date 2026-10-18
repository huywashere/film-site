import { cache } from "react";
import {
  TmdbImage,
  TmdbImages,
  tmdbBackdrop,
  tmdbPoster,
  tmdbLogo,
  extractTmdbInfo,
  sortTmdbImages,
  sortTmdbLogos,
  isNonChineseTmdbImage,
} from "@/lib/tmdb";

export interface ServerTmdbResult {
  tmdbId: number | null;
  mediaType: "movie" | "tv";
  bestBackdrop: TmdbImage | null;
  bestPoster: TmdbImage | null;
  bestLogo: TmdbImage | null;
  tmdbBackdropUrl: string | null;
  tmdbPosterUrl: string | null;
  tmdbLogoUrl: string | null;
  images: TmdbImages | null;
}

const tmdbServerMemoryCache = new Map<string, { data: ServerTmdbResult; expiry: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const FETCH_TIMEOUT_MS = 3500; // Generous budget for initial DNS handshake, cached in memory after

function normalizeTitle(val?: unknown): string {
  return String(val || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Pre-fetches high-resolution TMDB artwork directly on the server.
 * Uses reachable api.tmdb.org edge to bypass regional DNS blocking.
 */
export const getMovieTmdbServer = cache(async (movie: any): Promise<ServerTmdbResult | null> => {
  if (!movie) return null;

  const tmdbToken = process.env.TMDB_ACCESS_TOKEN?.trim() || "";
  const tmdbApiKey = process.env.TMDB_API_KEY?.trim() || "";
  if (!tmdbToken && !tmdbApiKey) return null;

  const { tmdbId: detectedId, type: detectedType, imdbId } = extractTmdbInfo(movie);
  const cacheKey = `v3_${detectedId || ""}_${detectedType || ""}_${movie?.slug || movie?.name || ""}`;

  const cached = tmdbServerMemoryCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const isValidToken =
    Boolean(tmdbToken) &&
    tmdbToken !== "your-read-access-token-here" &&
    tmdbToken.startsWith("eyJ");

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (isValidToken) {
    headers.Authorization = `Bearer ${tmdbToken}`;
  }

  const appendAuth = (url: string) => {
    if (!isValidToken && tmdbApiKey) {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}api_key=${encodeURIComponent(tmdbApiKey)}`;
    }
    return url;
  };

  const TMDB_HOST = "https://api.tmdb.org/3";

  try {
    let resolvedId: number | null = detectedId ? Number(detectedId) : null;
    let resolvedType: "movie" | "tv" = detectedType || "movie";

    // 1. If no tmdbId but has imdbId, resolve via find
    if (!resolvedId && imdbId) {
      try {
        const findUrl = appendAuth(`${TMDB_HOST}/find/${encodeURIComponent(imdbId)}?external_source=imdb_id`);
        const res = await fetch(findUrl, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (res.ok) {
          const findData = await res.json();
          if (findData.movie_results?.[0]?.id) {
            resolvedId = Number(findData.movie_results[0].id);
            resolvedType = "movie";
          } else if (findData.tv_results?.[0]?.id) {
            resolvedId = Number(findData.tv_results[0].id);
            resolvedType = "tv";
          }
        }
      } catch {
        // Continue to search
      }
    }

    // 2. If still no ID, search by title
    if (!resolvedId) {
      const searchTitle = movie?.origin_name || movie?.title || movie?.name;
      if (searchTitle) {
        const cleanTitle = searchTitle.replace(/\s*\([^)]*\)/g, "").trim();
        const expectedYear = Number(movie?.year) || 0;
        const searchPath = (movie?.type === "series" || movie?.type === "tv") ? "search/tv" : "search/movie";
        const searchUrl = appendAuth(
          `${TMDB_HOST}/${searchPath}?query=${encodeURIComponent(cleanTitle)}&include_adult=false${
            expectedYear ? `&year=${expectedYear}` : ""
          }`,
        );
        const res = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (res.ok) {
          const searchData = await res.json();
          const results: any[] = searchData?.results || [];
          if (results.length > 0) {
            // Find best matching title
            const targetNorm = normalizeTitle(cleanTitle);
            const best = results.find((r) => {
              const nameNorm = normalizeTitle(r.title || r.name || r.original_title || r.original_name);
              return nameNorm === targetNorm || nameNorm.includes(targetNorm);
            }) || results[0];

            resolvedId = Number(best.id);
            resolvedType = (movie?.type === "series" || movie?.type === "tv" || best.media_type === "tv") ? "tv" : "movie";
          }
        }
      }
    }

    if (!resolvedId) return null;

    // 3. Fetch images for the resolved ID (excluding Chinese languages)
    let imagesUrl = appendAuth(
      `${TMDB_HOST}/${resolvedType}/${resolvedId}/images?include_image_language=vi,en,null,ja,ko`,
    );
    let res = await fetch(imagesUrl, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok && res.status === 404) {
      // Flip type and retry once (e.g. anime movie vs anime series)
      const altType = resolvedType === "tv" ? "movie" : "tv";
      imagesUrl = appendAuth(
        `${TMDB_HOST}/${altType}/${resolvedId}/images?include_image_language=vi,en,null,ja,ko`,
      );
      const altRes = await fetch(imagesUrl, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (altRes.ok) {
        res = altRes;
        resolvedType = altType;
      }
    }
    if (!res.ok) return null;

    const imagesData: TmdbImages = await res.json();
    const cleanPosters = sortTmdbImages(imagesData.posters || []);
    const cleanBackdrops = sortTmdbImages(imagesData.backdrops || []);
    const cleanLogos = sortTmdbLogos(imagesData.logos || []);

    const bestBackdrop = cleanBackdrops[0] || null;
    const bestPoster = cleanPosters[0] || null;
    const bestLogo = cleanLogos[0] || null;

    const filteredImages: TmdbImages = {
      backdrops: cleanBackdrops,
      posters: cleanPosters,
      logos: cleanLogos,
    };

    const result: ServerTmdbResult = {
      tmdbId: resolvedId,
      mediaType: resolvedType,
      bestBackdrop,
      bestPoster,
      bestLogo,
      tmdbBackdropUrl: bestBackdrop?.file_path ? tmdbBackdrop(bestBackdrop.file_path, "w1280") : null,
      tmdbPosterUrl: bestPoster?.file_path ? tmdbPoster(bestPoster.file_path, "w500") : null,
      tmdbLogoUrl: bestLogo?.file_path ? tmdbLogo(bestLogo.file_path, "w500") : null,
      images: filteredImages,
    };

    tmdbServerMemoryCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
    if (tmdbServerMemoryCache.size > 1000) {
      const now = Date.now();
      tmdbServerMemoryCache.forEach((v, k) => {
        if (v.expiry <= now) tmdbServerMemoryCache.delete(k);
      });
    }

    return result;
  } catch (err) {
    // Fail silently so server rendering is never broken
    return null;
  }
});
