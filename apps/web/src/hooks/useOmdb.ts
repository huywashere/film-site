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
  metacritic: string | null;
  awards: string | null;
  boxOffice: string | null;
  plot: string | null;
  language: string | null;
  country: string | null;
  type: string | null;
}

async function fetchOmdbData(film: any): Promise<OmdbData | null> {
  const { imdbId } = extractTmdbInfo(film);
  const title = film?.origin_name || film?.name || film?.title || "";
  const year = film?.year ? String(film.year) : undefined;
  const type = film?.type;

  const params = new URLSearchParams();
  if (imdbId) {
    params.set("imdbId", imdbId);
  } else if (title) {
    params.set("title", title);
    if (year) params.set("year", year);
    if (type) params.set("type", type);
  } else {
    return null;
  }

  const res = await fetch(`/api/omdb?${params.toString()}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json;
}

/**
 * Hook để fetch dữ liệu OMDB cho một bộ phim.
 * Sẽ tìm bằng IMDb ID (nếu có) hoặc tiêu đề gốc + năm.
 */
export function useOmdb(film: any, enabled = true) {
  const { imdbId } = extractTmdbInfo(film ?? {});
  const title = film?.origin_name || film?.name || film?.title || "";

  const query = useQuery<OmdbData | null>({
    queryKey: ["omdb", imdbId || title, film?.year],
    queryFn: () => fetchOmdbData(film),
    enabled: enabled && !!film && !!(imdbId || title),
    staleTime: 1000 * 60 * 60 * 24,    // 24h
    gcTime: 1000 * 60 * 60 * 24 * 7,   // 7 days
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    omdb: query.data ?? null,
  };
}
