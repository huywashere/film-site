/**
 * useTmdb — hook tổng hợp để lấy dữ liệu TMDB cho một bộ phim
 * Tự động detect tmdbId từ film data, fetch images + credits + videos + season episode stills song song
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  tmdbApi,
  extractTmdbInfo,
  type TmdbImages,
  type TmdbCredits,
  type TmdbVideo,
  type TmdbImage,
  getYoutubeTrailer,
  sortTmdbImages,
  sortTmdbLogos,
  isNonChineseTmdbImage,
} from "@/lib/tmdb";
import { getMovieLogo, setMovieLogo } from "@/lib/movie-logo-cache";

interface UseTmdbOptions {
  film: any; // film data từ KKPhim/OPhim/NguonC
  seasonNumber?: number;
  enabled?: boolean;
  fetchImages?: boolean;
  fetchDetails?: boolean;
  fetchCredits?: boolean;
  fetchVideos?: boolean;
  fetchSeason?: boolean;
  initialTmdb?: {
    tmdbId?: number | null;
    mediaType?: "movie" | "tv";
    bestBackdrop?: TmdbImage | null;
    bestPoster?: TmdbImage | null;
    bestLogo?: TmdbImage | null;
    images?: TmdbImages | null;
    overview?: string | null;
  } | null;
}

function normalizeTmdbTitle(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function pickBestTmdbResult(results: any[], film: any) {
  if (!results?.length) return null;
  const names = [film?.origin_name, film?.title, film?.name]
    .map(normalizeTmdbTitle)
    .filter(Boolean);
  const expectedYear = Number(film?.year) || 0;

  return [...results].sort((a, b) => {
    const score = (item: any) => {
      const candidateNames = [
        item?.title,
        item?.name,
        item?.original_title,
        item?.original_name,
      ]
        .map(normalizeTmdbTitle)
        .filter(Boolean);
      let value = candidateNames.some((name) => names.includes(name)) ? 100 : 0;
      if (
        candidateNames.some((name) =>
          names.some(
            (expected) => name.includes(expected) || expected.includes(name),
          ),
        )
      ) {
        value += 35;
      }
      const candidateYear = Number(
        String(item?.release_date || item?.first_air_date || "").slice(0, 4),
      );
      if (expectedYear && candidateYear) {
        const yearGap = Math.abs(expectedYear - candidateYear);
        value += yearGap === 0 ? 30 : yearGap === 1 ? 12 : -yearGap;
      }
      value += Math.min(Number(item?.popularity || 0) / 100, 10);
      return value;
    };
    return score(b) - score(a);
  })[0];
}

export function useTmdb({
  film,
  seasonNumber = 1,
  enabled = true,
  fetchImages = true,
  fetchDetails = true,
  fetchCredits = true,
  fetchVideos = true,
  fetchSeason = true,
  initialTmdb,
}: UseTmdbOptions) {
  const { tmdbId, type, imdbId } = extractTmdbInfo(film);
  const searchTitle = film?.origin_name || film?.title || film?.name || "";
  const isEnabled = enabled && !!film;

  // 1. Resolve TMDB ID từ IMDB ID nếu chưa có tmdbId
  const { data: findData, isLoading: findLoading } = useQuery({
    queryKey: ["tmdb-find", imdbId],
    queryFn: () => tmdbApi.findByImdbId(imdbId!),
    enabled: isEnabled && !tmdbId && !initialTmdb?.tmdbId && !!imdbId,
    staleTime: 1000 * 60 * 60 * 24, // 24h
  });

  // 2. Nếu chưa có tmdbId và imdbId, tìm kiếm theo tên phim (origin_name / title / name)
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["tmdb-search-title", searchTitle, type],
    queryFn: async () => {
      if (!searchTitle) return null;
      const cleanTitle = searchTitle.replace(/\s*\([^)]*\)/g, "").trim();
      if (type === "tv") {
        const tvRes = await tmdbApi.searchTv(cleanTitle);
        if (tvRes?.results?.length) return tvRes;
      }
      const movieRes = await tmdbApi.searchMovie(cleanTitle);
      if (movieRes?.results?.length) return movieRes;

      // Thử tìm theo film.name nếu origin_name không trả về kết quả
      if (film?.name && film.name !== searchTitle) {
        const multiRes = await tmdbApi.searchMulti(film.name);
        if (multiRes?.results?.length) return multiRes;
      }
      return null;
    },
    enabled: isEnabled && !tmdbId && !initialTmdb?.tmdbId && !imdbId && !!searchTitle,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const searchResult = pickBestTmdbResult(searchData?.results || [], film);

  const resolvedId =
    initialTmdb?.tmdbId ||
    tmdbId ||
    findData?.movie_results?.[0]?.id ||
    findData?.tv_results?.[0]?.id ||
    searchResult?.id ||
    null;

  const resolvedType: "movie" | "tv" =
    initialTmdb?.mediaType ||
    type ||
    (findData?.tv_results?.length || searchResult?.media_type === "tv"
      ? "tv"
      : "movie");

  // Images
  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ["tmdb-images", resolvedId, resolvedType],
    queryFn: () =>
      resolvedType === "tv"
        ? tmdbApi.getTvImages(resolvedId!)
        : tmdbApi.getMovieImages(resolvedId!),
    initialData: initialTmdb?.images || undefined,
    enabled: isEnabled && fetchImages && !!resolvedId,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // TV Season & Episode Details (chứa exact still_path cho từng tập)
  const { data: seasonData } = useQuery({
    queryKey: ["tmdb-season-details", resolvedId, seasonNumber || 1],
    queryFn: () => tmdbApi.getTvSeasonDetail(resolvedId!, seasonNumber || 1),
    enabled:
      isEnabled &&
      fetchSeason &&
      resolvedType === "tv" &&
      !!resolvedId,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const seasonEpisodes = useMemo(
    () => seasonData?.episodes || [],
    [seasonData?.episodes],
  );
  const episodeStillsMap: Record<number, string> = useMemo(() => {
    const map: Record<number, string> = {};
    seasonEpisodes.forEach((ep) => {
      if (ep.episode_number && ep.still_path) {
        map[ep.episode_number] = ep.still_path;
      }
    });
    return map;
  }, [seasonEpisodes]);

  // Credits
  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ["tmdb-credits", resolvedId, resolvedType],
    queryFn: () =>
      resolvedType === "tv"
        ? tmdbApi.getTvCredits(resolvedId!)
        : tmdbApi.getMovieCredits(resolvedId!),
    enabled: isEnabled && fetchCredits && !!resolvedId,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // Movie / TV Details (full Vietnamese overview, tagline, runtime)
  const { data: detailData } = useQuery({
    queryKey: ["tmdb-detail", resolvedId, resolvedType],
    queryFn: () =>
      resolvedType === "tv"
        ? tmdbApi.getTvDetail(resolvedId!)
        : tmdbApi.getMovieDetail(resolvedId!),
    enabled: isEnabled && fetchDetails && !!resolvedId,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // Videos / Trailers
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ["tmdb-videos", resolvedId, resolvedType],
    queryFn: () =>
      resolvedType === "tv"
        ? tmdbApi.getTvVideos(resolvedId!)
        : tmdbApi.getMovieVideos(resolvedId!),
    enabled: isEnabled && fetchVideos && !!resolvedId,
    staleTime: 1000 * 60 * 60,
  });

  const videos: TmdbVideo[] = videosData?.results || [];
  const trailer = getYoutubeTrailer(videos);

  // Top cast (tối đa 15 người)
  const cast = (credits?.cast || []).slice(0, 15);

  // Director / Creator
  const directors = (credits?.crew || []).filter(
    (c) => c.job === "Director" || c.job === "Series Director",
  );

  // Best backdrop & poster (Loại bỏ tiếng Trung và ưu tiên tiếng Việt / tiếng Anh / textless)
  const backdrops = sortTmdbImages(images?.backdrops || []);
  const posters = sortTmdbImages(images?.posters || []);
  const logos = sortTmdbLogos(images?.logos || []);

  const bestBackdrop =
    backdrops[0] ||
    (initialTmdb?.bestBackdrop && isNonChineseTmdbImage(initialTmdb.bestBackdrop)
      ? initialTmdb.bestBackdrop
      : null) ||
    (searchResult?.backdrop_path
      ? {
          file_path: searchResult.backdrop_path,
          width: 1920,
          height: 1080,
          vote_average: 10,
          aspect_ratio: 1.77,
        }
      : null);

  const bestPoster =
    posters[0] ||
    (initialTmdb?.bestPoster && isNonChineseTmdbImage(initialTmdb.bestPoster)
      ? initialTmdb.bestPoster
      : null) ||
    (searchResult?.poster_path
      ? {
          file_path: searchResult.poster_path,
          width: 1000,
          height: 1500,
          vote_average: 10,
          aspect_ratio: 0.66,
        }
      : null);

  const cachedLogoPath = getMovieLogo(film?.slug);
  const bestLogo =
    logos[0] ||
    (initialTmdb?.bestLogo && isNonChineseTmdbImage(initialTmdb.bestLogo)
      ? initialTmdb.bestLogo
      : null) ||
    (initialTmdb?.images?.logos
      ? sortTmdbLogos(initialTmdb.images.logos)[0]
      : null) ||
    (cachedLogoPath
      ? {
          file_path: cachedLogoPath,
          width: 500,
          height: 200,
          vote_average: 10,
          aspect_ratio: 2.5,
        }
      : null);

  if (film?.slug && bestLogo?.file_path) {
    setMovieLogo(film.slug, bestLogo.file_path);
  }

  return {
    tmdbId: resolvedId,
    type: resolvedType,
    // Details & Overview
    detail: detailData,
    overview:
      detailData?.overview ||
      searchResult?.overview ||
      initialTmdb?.overview ||
      null,
    tagline: detailData?.tagline || null,
    // Images
    images,
    backdrops,
    posters,
    logos,
    bestBackdrop,
    bestPoster,
    bestLogo,
    imagesLoading,
    // Season & Episode stills
    seasonData,
    seasonEpisodes,
    episodeStillsMap,
    // Credits
    credits,
    cast,
    directors,
    creditsLoading,
    // Videos
    videos,
    trailer,
    videosLoading,
    isResolving: findLoading || searchLoading,
    // Overall
    isLoading:
      findLoading ||
      searchLoading ||
      imagesLoading ||
      creditsLoading ||
      videosLoading,
    hasData: !!resolvedId,
  };
}

// ── Hook riêng cho trang diễn viên ───────────────────────────────

export function useTmdbPerson(personId: number | null) {
  const enabled = !!personId;

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["tmdb-person", personId],
    queryFn: () => tmdbApi.getPersonDetail(personId!),
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ["tmdb-person-credits", personId],
    queryFn: () => tmdbApi.getPersonCredits(personId!),
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const { data: imagesData, isLoading: imagesLoading } = useQuery({
    queryKey: ["tmdb-person-images", personId],
    queryFn: () => tmdbApi.getPersonImages(personId!),
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const rawCast = credits?.cast || [];
  const seenIds = new Set<number>();
  const allFilms = rawCast
    .filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return Boolean(item.title || item.name);
    })
    .sort((a, b) => {
      const dateA = a.release_date || a.first_air_date || "";
      const dateB = b.release_date || b.first_air_date || "";
      if (dateA && dateB) return dateB.localeCompare(dateA);
      return ((b as any).popularity || b.vote_average || 0) - ((a as any).popularity || a.vote_average || 0);
    });

  return {
    detail,
    credits,
    knownFor: allFilms,
    allFilms,
    images: imagesData?.profiles || [],
    isLoading: detailLoading || creditsLoading || imagesLoading,
  };
}
