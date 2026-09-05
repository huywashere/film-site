'use client';

import { useQuery } from '@tanstack/react-query';
import type { FilmItem } from '@/components/film/FilmCard';
import { extractTmdbInfo, tmdbApi, tmdbBackdrop, tmdbPoster, type TmdbMovie } from '@/lib/tmdb';

function normalizeTitle(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(?:season|part|phan)\s*\d+\b/gi, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

const ARTWORK_CACHE_PREFIX = 'netphim:tmdb-artwork:v3:';
const ARTWORK_CACHE_TTL = 1000 * 60 * 60 * 24 * 7;

function readArtworkCache(identity: string): TmdbMovie | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const key = `${ARTWORK_CACHE_PREFIX}${identity}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    const cached = JSON.parse(raw) as { expiresAt?: number; movie?: TmdbMovie };
    if (!cached.movie || !cached.expiresAt || cached.expiresAt <= Date.now()) {
      window.localStorage.removeItem(key);
      return undefined;
    }
    return cached.movie;
  } catch {
    return undefined;
  }
}

function writeArtworkCache(identity: string, movie: TmdbMovie | null): void {
  if (typeof window === 'undefined' || !movie) return;
  try {
    const compactMovie: TmdbMovie = {
      id: movie.id,
      title: movie.title,
      original_title: movie.original_title,
      name: movie.name,
      original_name: movie.original_name,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      release_date: movie.release_date,
      first_air_date: movie.first_air_date,
      media_type: movie.media_type,
      vote_average: movie.vote_average,
    };
    window.localStorage.setItem(
      `${ARTWORK_CACHE_PREFIX}${identity}`,
      JSON.stringify({ expiresAt: Date.now() + ARTWORK_CACHE_TTL, movie: compactMovie }),
    );
  } catch {
    // Private browsing can reject storage; React Query remains the fallback cache.
  }
}

function releaseYear(movie: TmdbMovie): number | null {
  const date = movie.release_date || movie.first_air_date;
  const year = date ? Number(date.slice(0, 4)) : NaN;
  return Number.isFinite(year) ? year : null;
}

function titleSimilarity(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    return Math.min(left.length, right.length) / Math.max(left.length, right.length);
  }

  const leftTokens = new Set(left.split(' ').filter((token) => token.length > 1));
  const rightTokens = new Set(right.split(' ').filter((token) => token.length > 1));
  if (!leftTokens.size || !rightTokens.size) return 0;

  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return shared / new Set([...leftTokens, ...rightTokens]).size;
}

function selectBestMatch(results: TmdbMovie[], film: FilmItem): TmdbMovie | null {
  if (!results.length) return null;

  const expectedTitles = [film.origin_name, film.name, film.title]
    .map(normalizeTitle)
    .filter(Boolean);

  const scored = results
    .map((movie) => {
      const candidateTitles = [movie.original_title, movie.title, movie.name]
        .map(normalizeTitle)
        .filter(Boolean);
      const similarity = Math.max(
        0,
        ...candidateTitles.flatMap((candidate) =>
          expectedTitles.map((expected) => titleSimilarity(candidate, expected)),
        ),
      );
      const candidateYear = releaseYear(movie);
      const yearDelta = film.year && candidateYear ? Math.abs(film.year - candidateYear) : null;
      const yearCompatible = yearDelta === null || yearDelta <= 1;

      // Never use a merely popular TMDB result as artwork for another movie.
      // Exact/near-exact titles tolerate a one-year release offset; weaker
      // localized-title matches must also agree on the year.
      const confident =
        similarity === 1 ||
        (similarity >= 0.92 && yearCompatible) ||
        (similarity >= 0.72 && yearDelta !== null && yearDelta <= 1);

      return {
        movie,
        confident,
        score:
          similarity * 100 +
          (yearDelta === 0 ? 24 : yearDelta === 1 ? 12 : 0) +
          Math.min(movie.vote_average || 0, 10),
      };
    })
    .filter((entry) => entry.confident)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.movie || null;
}

async function resolveArtwork(film: FilmItem): Promise<TmdbMovie | null> {
  const extracted = extractTmdbInfo(film);
  const tmdbId = extracted.tmdbId && Number.isFinite(extracted.tmdbId) ? extracted.tmdbId : null;

  if (tmdbId) {
    const detail = await tmdbApi.findByTmdbId(tmdbId, extracted.type);
    if (detail) return { ...detail, media_type: extracted.type };
  }

  if (extracted.imdbId) {
    const found = await tmdbApi.findByImdbId(extracted.imdbId);
    const exact = extracted.type === 'tv' ? found?.tv_results?.[0] : found?.movie_results?.[0];
    if (exact) return { ...exact, media_type: extracted.type };
  }

  const title = (film.origin_name || film.name || film.title || '')
    .replace(/\s*\([^)]*\)/g, ' ')
    .trim();
  if (!title) return null;

  const primaryResults =
    extracted.type === 'tv'
      ? (await tmdbApi.searchTv(title))?.results || []
      : (await tmdbApi.searchMovie(title))?.results || [];
  const primaryMatch = selectBestMatch(primaryResults, film);
  if (primaryMatch) {
    return { ...primaryMatch, media_type: extracted.type };
  }

  const multiResults = (await tmdbApi.searchMulti(title))?.results || [];
  return selectBestMatch(
    multiResults.filter((item) => item.media_type === 'movie' || item.media_type === 'tv'),
    film,
  );
}

export function useTmdbArtwork(film: FilmItem, enabled = true) {
  const extracted = extractTmdbInfo(film);
  const title = film.origin_name || film.name || film.title || '';
  const identity = [
    extracted.type,
    extracted.tmdbId || extracted.imdbId || normalizeTitle(title),
    film.year || '',
  ].join(':');

  const query = useQuery({
    queryKey: ['tmdb-artwork', identity],
    queryFn: async () => {
      const cached = readArtworkCache(identity);
      if (cached) return cached;
      const movie = await resolveArtwork(film);
      writeArtworkCache(identity, movie);
      return movie;
    },
    enabled: enabled && Boolean(extracted.tmdbId || extracted.imdbId || title),
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime: 1000 * 60 * 60 * 24 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    movie: query.data || null,
    backdropUrl: tmdbBackdrop(query.data?.backdrop_path, 'w1280'),
    posterUrl: tmdbPoster(query.data?.poster_path, 'w500'),
  };
}
