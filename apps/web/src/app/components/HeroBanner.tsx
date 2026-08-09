"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Play, Star, Film, ChevronDown, Bookmark } from "lucide-react";
import { FilmItem } from "@/components/film/FilmCard";
import { TrailerModal } from "@/components/film/TrailerModal";
import { useTranslation } from "@/store/langStore";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import { watchlistApi, watchHistoryApi } from "@/lib/api";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { guestDataStorage } from "@/lib/user-data";
import { buildHeroImageCandidates } from "@/lib/hero-image";
import {
  tmdbApi,
  tmdbBackdrop,
  tmdbLogo,
  tmdbPoster,
  type TmdbImage,
  type TmdbMovie,
} from "@/lib/tmdb";

interface HeroBannerProps {
  films: FilmItem[];
}

interface HeroFilm extends FilmItem {
  heroBackdrop?: string;
  titleLogo?: string;
  titleLogoResolved?: boolean;
  tmdbOnly?: boolean;
}

const HERO_SESSION_KEY = "cineverse.tmdb-hero.v3";
const HERO_INDEX_SESSION_KEY = "cineverse.tmdb-hero-index.v1";

const HERO_TMDB_COLLECTIONS = [
  {
    label: "Marvel",
    ids: [634649, 299534, 533535, 299536, 447365, 453395],
  },
  {
    label: "DC",
    ids: [414906, 155, 475557, 49521, 297762, 791373],
  },
  {
    label: "Hollywood",
    ids: [157336, 27205, 693134, 76600, 872585, 361743],
  },
] as const;

const HERO_MARKETS = [
  { code: "US", region: "US", language: "en" },
  { code: "GB", region: "GB", language: "en" },
] as const;

function getWatchHref(film: HeroFilm): string {
  if (film.tmdbOnly) {
    return `/search?q=${encodeURIComponent(film.origin_name || film.name)}`;
  }

  const source = film._source;
  const sourceSlug = source ? film._sourceSlugs?.[source] : undefined;
  if (!source || !sourceSlug || sourceSlug === film.slug) {
    return `/watch/${film.slug}${source ? `?source=${source}` : ""}`;
  }

  const query = new URLSearchParams({ source, sourceSlug });
  return `/watch/${film.slug}?${query.toString()}`;
}

// Helper for direct CDN image URL
function resolveDirectImageUrl(url?: unknown): string | null {
  if (!url || typeof url !== "string") return null;
  let resolved = url.trim();
  if (!resolved) return null;

  if (resolved.startsWith("/api/")) return resolved;

  if (/^https:\/\/image\.tmdb\.org\/t\/p\//i.test(resolved)) {
    return resolved;
  }

  if (resolved.startsWith("//")) {
    resolved = `https:${resolved}`;
  } else if (
    !resolved.startsWith("http://") &&
    !resolved.startsWith("https://")
  ) {
    const cleanPath = resolved.startsWith("/") ? resolved.slice(1) : resolved;
    resolved = `https://img.phimapi.com/${cleanPath}`;
  }
  return `/api/image-proxy?url=${encodeURIComponent(resolved)}`;
}

function toHeroFilm(movie: TmdbMovie): HeroFilm | null {
  const name = movie.title || movie.name || movie.original_title;
  if (!name || !movie.poster_path || !movie.backdrop_path) return null;

  return {
    _id: `tmdb-${movie.id}`,
    slug: `tmdb-${movie.id}`,
    name,
    origin_name: movie.original_title || movie.title || movie.name,
    poster_url: tmdbPoster(movie.poster_path, "w500") || undefined,
    thumb_url: tmdbBackdrop(movie.backdrop_path, "w1280") || undefined,
    heroBackdrop: tmdbBackdrop(movie.backdrop_path, "original") || undefined,
    year:
      Number((movie.release_date || movie.first_air_date || "").slice(0, 4)) ||
      undefined,
    type: movie.media_type || "single",
    quality: "TMDB HD",
    vote_average: movie.vote_average,
    rating: movie.vote_average,
    content: movie.overview,
    tmdb: {
      id: String(movie.id),
      type: movie.media_type || "movie",
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
    },
    tmdbOnly: true,
  };
}

function getFilmDetailMeta(film: HeroFilm) {
  let durationStr = "2h 06m";
  if (film.time && film.time !== "Đang cập nhật") {
    durationStr = film.time;
  } else if (film.episode_current) {
    durationStr = film.episode_current.includes("Tập")
      ? film.episode_current
      : `Tập ${film.episode_current}`;
  } else if (film.type === "series" || film.type === "hoathinh") {
    durationStr = "Phim bộ";
  } else {
    const idNum = parseInt(film._id?.replace(/\D/g, "") || "120", 10);
    const mins = 105 + (idNum % 35);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    durationStr = `${h}h ${m < 10 ? `0${m}` : m}m`;
  }

  let genresStr = "Hành động • Phiêu lưu";
  if (film.category && film.category.length > 0) {
    const genreNames = film.category
      .map((c) => c.name)
      .filter((n): n is string => Boolean(n))
      .slice(0, 3);
    if (genreNames.length > 0) {
      genresStr = genreNames.join(" • ");
    }
  } else {
    const lower = (film.name + " " + (film.origin_name || "")).toLowerCase();
    if (lower.includes("dragon") || lower.includes("rồng") || lower.includes("game")) {
      genresStr = "Chính kịch • Hành động • Thần thoại";
    } else if (lower.includes("avengers") || lower.includes("spider") || lower.includes("marvel") || lower.includes("dc")) {
      genresStr = "Hành động • Viễn tưởng • Phiêu lưu";
    } else if (lower.includes("oppenheimer") || lower.includes("dark")) {
      genresStr = "Chính kịch • Lịch sử • Tiêu điểm";
    } else if (lower.includes("avatar")) {
      genresStr = "Viễn tưởng • Phiêu lưu • Bom tấn";
    }
  }

  let ageRating = "16+";
  const contentLower = (film.content || "").toLowerCase();
  if (contentLower.includes("18+") || contentLower.includes("kinh dị") || contentLower.includes("bạo lực")) {
    ageRating = "18+";
  } else if (contentLower.includes("hoạt hình") || contentLower.includes("gia đình")) {
    ageRating = "P";
  }

  let qualityBadge = "4K";
  if (film.quality) {
    if (film.quality.toUpperCase() === "TMDB HD" || film.quality.toUpperCase() === "HD") {
      qualityBadge = "4K";
    } else {
      qualityBadge = film.quality;
    }
  } else {
    qualityBadge = "4K";
  }

  let langBadge = "Vietsub";
  if (film.lang) {
    if (film.lang.toLowerCase().includes("thuyết minh")) {
      langBadge = "Thuyết minh";
    } else if (film.lang.toLowerCase().includes("lồng tiếng")) {
      langBadge = "Lồng tiếng";
    } else if (film.lang.toLowerCase().includes("song ngữ")) {
      langBadge = "Song ngữ";
    } else {
      langBadge = "Vietsub";
    }
  }

  return { durationStr, genresStr, ageRating, qualityBadge, langBadge };
}

function getSpotlightBadge(film: HeroFilm, index: number) {
  const badges = [
    { label: "🔥 #1 THỊNH HÀNH HÔM NAY", color: "from-red-600/90 to-amber-600/90 text-white border-red-500/40" },
    { label: "🏆 TOP 10 PHIM BỘ TUẦN NÀY", color: "from-amber-600/90 to-yellow-500/90 text-white border-amber-400/40" },
    { label: "✨ SIÊU PHẨM BẢN QUYỀN 4K", color: "from-violet-600/90 to-purple-500/90 text-white border-purple-400/40" },
    { label: "🍿 PHIM CHIẾU RẠP HOT", color: "from-rose-600/90 to-pink-600/90 text-white border-rose-500/40" },
    { label: "⚡ MỚI CẬP NHẬT TẬP MỚI", color: "from-emerald-600/90 to-teal-500/90 text-white border-emerald-400/40" },
    { label: "💎 TOP PHIM ĐƯỢC BÌNH CHỌN", color: "from-blue-600/90 to-indigo-600/90 text-white border-blue-400/40" },
  ];
  return badges[index % badges.length];
}

function getBestTitleLogo(logos: TmdbImage[]): TmdbImage | null {
  const languagePriority = (language?: string | null) => {
    if (language === "vi") return 3;
    if (language === "en") return 2;
    if (!language) return 1;
    return 0;
  };

  return (
    [...logos]
      .filter((logo) => Boolean(logo.file_path) && logo.width > 0 && logo.height > 0)
      .sort((a, b) => {
        const languageScore =
          languagePriority(b.iso_639_1) - languagePriority(a.iso_639_1);
        if (languageScore !== 0) return languageScore;
        if (b.vote_average !== a.vote_average) {
          return b.vote_average - a.vote_average;
        }
        return b.width - a.width;
      })[0] || null
  );
}

async function enrichHeroTitleLogos(playlist: HeroFilm[]): Promise<HeroFilm[]> {
  return Promise.all(
    playlist.map(async (film) => {
      if (film.titleLogoResolved) return film;

      const rawTmdbId = film.tmdb?.id || film.slug.match(/^tmdb-(\d+)$/)?.[1];
      const tmdbId = Number(rawTmdbId);
      if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
        return { ...film, titleLogoResolved: true };
      }

      const type =
        film.tmdb?.type === "tv" ||
        film.type === "series" ||
        film.type === "tvshows"
          ? "tv"
          : "movie";
      const images = await tmdbApi.getImages(type, tmdbId);
      if (!images) return film;

      const bestLogo = getBestTitleLogo(images.logos || []);
      return {
        ...film,
        titleLogo: tmdbLogo(bestLogo?.file_path, "w500") || undefined,
        titleLogoResolved: true,
      };
    }),
  );
}

function HeroMovieTitle({ film }: { film: HeroFilm }) {
  const [failedLogoSlug, setFailedLogoSlug] = useState<string | null>(null);
  const title = film.origin_name || film.name;
  const showLogo = Boolean(
    film.titleLogo && failedLogoSlug !== film.slug,
  );

  return (
    <div className="flex min-h-16 w-full items-center justify-center sm:min-h-24 md:min-h-28">
      <h1
        className={cn(
          showLogo && "sr-only",
          !showLogo &&
            "max-w-2xl line-clamp-2 text-xl font-extrabold uppercase leading-tight tracking-wide text-white drop-shadow-[0_10px_35px_rgba(0,0,0,0.95)] sm:text-4xl md:text-5xl",
        )}
        style={
          showLogo
            ? undefined
            : { fontFamily: "'Be Vietnam Pro', 'Inter', sans-serif" }
        }
      >
        {title}
      </h1>

      {showLogo && (
        // TMDB title artwork has variable transparent bounds, so intrinsic
        // object containment is more reliable here than a cropped Image fill.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={film.titleLogo}
          alt=""
          aria-hidden="true"
          decoding="async"
          loading="eager"
          onError={() => setFailedLogoSlug(film.slug)}
          className="max-h-16 w-auto max-w-[82vw] object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.85)] sm:max-h-24 sm:max-w-[34rem] md:max-h-28"
        />
      )}
    </div>
  );
}

function HeroBackdropImage({
  film,
  isActive,
}: {
  film: HeroFilm;
  isActive: boolean;
}) {
  const candidates = useMemo(
    () =>
      buildHeroImageCandidates({
        heroBackdrop: film.heroBackdrop,
        thumbUrl: film.thumb_url,
        posterUrl: film.poster_url,
      }),
    [film.heroBackdrop, film.poster_url, film.thumb_url],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
  }, [film.slug, candidates]);

  const tryNextCandidate = () => {
    setLoaded(false);
    setCandidateIndex((index) =>
      Math.min(index + 1, Math.max(candidates.length - 1, 0)),
    );
  };

  const src = candidates[candidateIndex];
  if (!src) return null;

  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(50,58,72,0.3),transparent_44%),linear-gradient(135deg,#0b0e13_0%,#151a22_52%,#0b0d12_100%)]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${film.slug}-${candidateIndex}`}
        src={src}
        alt={film.name}
        loading={isActive ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={isActive ? "high" : "low"}
        onLoad={(event) => {
          // The legacy proxy placeholder is exactly 300x450. Treat stale
          // cached copies as failures as well, then advance to a real source.
          if (
            event.currentTarget.naturalWidth === 300 &&
            event.currentTarget.naturalHeight === 450 &&
            candidateIndex < candidates.length - 1
          ) {
            tryNextCandidate();
            return;
          }
          setLoaded(true);
        }}
        onError={tryNextCandidate}
        className={cn(
          "h-full w-full object-cover object-center brightness-[0.72] transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
}

function selectRandomFilms(groups: TmdbMovie[][]): HeroFilm[] {
  const used = new Set<number>();
  const take = (pool: TmdbMovie[]): HeroFilm | null => {
    const choices = pool
      .filter(
        (movie) =>
          !used.has(movie.id) &&
          Boolean(movie.poster_path) &&
          Boolean(movie.backdrop_path) &&
          Boolean(movie.title || movie.name || movie.original_title),
      )
      .sort(() => Math.random() - 0.5);
    const movie = choices[0];
    if (!movie) return null;
    const heroFilm = toHeroFilm(movie);
    if (!heroFilm) return null;
    used.add(movie.id);
    return heroFilm;
  };

  const selected = groups
    .map((group) => take(group))
    .filter((movie): movie is HeroFilm => Boolean(movie));
  const allMovies = groups.flat();

  while (selected.length < 6) {
    const next = take(allMovies);
    if (!next) break;
    selected.push(next);
  }

  return selected.slice(0, 6);
}

function isStoredHeroPlaylist(value: unknown): value is HeroFilm[] {
  return (
    Array.isArray(value) &&
    value.length === 6 &&
    value.every(
      (film) =>
        typeof film === "object" &&
        film !== null &&
        typeof (film as HeroFilm).slug === "string" &&
        typeof (film as HeroFilm).heroBackdrop === "string",
    )
  );
}

// Keep the hero continuous across client-side navigation. Session storage covers
// reloads while this small in-memory cache avoids even a single fallback frame
// when the user navigates away from and back to the home page.
let cachedHeroPlaylist: HeroFilm[] | null = null;
let cachedHeroIndex = 0;

function readStoredHeroPlaylist(): HeroFilm[] | null {
  if (typeof window === "undefined") return null;

  try {
    const parsed: unknown = JSON.parse(
      window.sessionStorage.getItem(HERO_SESSION_KEY) || "null",
    );
    return isStoredHeroPlaylist(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readStoredHeroIndex(playlistLength: number): number {
  if (typeof window === "undefined" || playlistLength <= 0) return 0;

  const parsed = Number(
    window.sessionStorage.getItem(HERO_INDEX_SESSION_KEY) || "0",
  );
  return Number.isInteger(parsed) && parsed >= 0 && parsed < playlistLength
    ? parsed
    : 0;
}

function storeHeroPlaylist(playlist: HeroFilm[]) {
  cachedHeroPlaylist = playlist;
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(HERO_SESSION_KEY, JSON.stringify(playlist));
  } catch {
    // Storage can be disabled in private/restricted browsing. The memory cache
    // still keeps navigation within the current tab stable.
  }
}

function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

async function loadCuratedTmdbPlaylist(): Promise<HeroFilm[]> {
  const collectionMovies = await Promise.all(
    HERO_TMDB_COLLECTIONS.map(async (col) => {
      const items = await Promise.all(
        col.ids.map(async (id) => {
          const detail = await tmdbApi.getMovieDetail(id);
          return detail ? toHeroFilm(detail as any) : null;
        }),
      );
      return items.filter((item): item is HeroFilm => Boolean(item));
    }),
  );

  const balanced = collectionMovies
    .flat()
    .filter((film): film is HeroFilm => Boolean(film));

  return enrichHeroTitleLogos(shuffled(balanced).slice(0, 6));
}

export default function HeroBanner({ films }: HeroBannerProps) {
  const [current, setCurrent] = useState(cachedHeroIndex);
  const [tmdbFeatured, setTmdbFeatured] = useState<HeroFilm[] | null>(
    cachedHeroPlaylist,
  );
  const [playlistResolved, setPlaylistResolved] = useState(
    Boolean(cachedHeroPlaylist),
  );
  const [trailerModalFilm, setTrailerModalFilm] = useState<FilmItem | null>(null);
  const reduceMotion = useReducedMotion();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { t } = useTranslation();

  const fallbackFeatured = useMemo(() => {
    if (films && films.length > 0) {
      return films.slice(0, 6);
    }
    return [];
  }, [films]);

  const featured = useMemo(
    () =>
      tmdbFeatured && tmdbFeatured.length === 6
        ? tmdbFeatured
        : playlistResolved
          ? fallbackFeatured
          : [],
    [fallbackFeatured, playlistResolved, tmdbFeatured],
  );

  useEffect(() => {
    let active = true;
    const loadPlaylist = async () => {
      const existingPlaylist = cachedHeroPlaylist || readStoredHeroPlaylist();
      if (existingPlaylist) {
        const playlistWithLogos = await enrichHeroTitleLogos(existingPlaylist);
        if (!active) return;
        const existingIndex = cachedHeroPlaylist
          ? cachedHeroIndex
          : readStoredHeroIndex(playlistWithLogos.length);
        storeHeroPlaylist(playlistWithLogos);
        cachedHeroIndex = existingIndex;
        setTmdbFeatured(playlistWithLogos);
        setCurrent(existingIndex);
        setPlaylistResolved(true);
        return;
      }

      let playlist: HeroFilm[] = [];
      try {
        playlist = await loadCuratedTmdbPlaylist();

        if (playlist.length !== 6) {
          const groups = await Promise.all(
            HERO_MARKETS.map(async (market) => {
              const response = await tmdbApi.discoverMovies({
                page: 1 + Math.floor(Math.random() * 5),
                region: market.region,
                with_origin_country: market.code,
                with_original_language: market.language,
                "vote_count.gte": 500,
              });
              return response?.results || [];
            }),
          );
          playlist = await enrichHeroTitleLogos(selectRandomFilms(groups));
        }
      } catch {
        playlist = [];
      }

      if (!active) return;
      if (playlist.length === 6) {
        storeHeroPlaylist(playlist);
        cachedHeroIndex = 0;
        setTmdbFeatured(playlist);
        setCurrent(0);
      }
      setPlaylistResolved(true);
    };

    void loadPlaylist();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setCurrent((index) => (index >= featured.length ? 0 : index));
  }, [featured.length]);

  useEffect(() => {
    if (featured.length === 0) return;
    cachedHeroIndex = current;
    try {
      window.sessionStorage.setItem(HERO_INDEX_SESSION_KEY, String(current));
    } catch {
      // See storeHeroPlaylist: session storage is an optional optimization.
    }
  }, [current, featured.length]);

  useEffect(() => {
    if (featured.length <= 1 || reduceMotion) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % featured.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [featured.length, reduceMotion]);

  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  const fanCards = useMemo(() => {
    if (featured.length === 0) return [];
    return [
      featured[current],
      featured[(current + 1) % featured.length],
      featured[(current + 2) % featured.length],
    ].filter(Boolean);
  }, [featured, current]);

  // Fetch watch history to show "Xem tiếp mm:ss" CTA with progress bar
  const { data: serverHistoryData } = useQuery({
    queryKey: ["hero-watch-history", user?.id],
    queryFn: () =>
      watchHistoryApi
        .getHistory(1, 40)
        .then((r) => r.data)
        .catch(() => null),
    enabled: !!user,
  });

  const watchHistoryMap = useMemo(() => {
    const map = new Map<
      string,
      { progress: number; duration: number; ep?: string }
    >();

    if (typeof window !== "undefined") {
      try {
        const local = guestDataStorage.getHistory();
        local.forEach((item: any) => {
          const currentTime = item.currentTime || item.progress || 0;
          if (item.slug && currentTime) {
            map.set(item.slug, {
              progress: currentTime,
              duration: item.duration || 0,
              ep: item.epSlug || item.episode,
            });
          }
        });
      } catch (_e) {}
    }

    const items = serverHistoryData?.items || [];
    items.forEach((item: any) => {
      const slug = item.movieId || item.movieSlug || item.slug;
      if (slug && item.progress) {
        map.set(slug, {
          progress: item.progress,
          duration: item.duration || 0,
          ep: item.episode,
        });
      }
    });

    return map;
  }, [serverHistoryData]);

  const film = featured[current];
  if (!film) {
    return (
      <section
        data-hero-banner="true"
        aria-busy="true"
        aria-label="Đang tải banner nổi bật"
        className="relative min-h-[100dvh] w-full overflow-hidden bg-[#141414]"
      >
        <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_70%_35%,rgba(50,58,72,0.32),transparent_42%),linear-gradient(135deg,#101318_0%,#171b22_52%,#101216_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#14181c] via-[#14181c]/70 to-transparent" />
        <div className="absolute bottom-[16%] right-[6%] hidden w-[min(42rem,48vw)] space-y-4 md:block">
          <div className="h-4 w-36 rounded-full bg-white/8" />
          <div className="h-12 w-4/5 rounded-xl bg-white/8" />
          <div className="h-5 w-2/3 rounded-lg bg-white/6" />
          <div className="flex gap-3 pt-3">
            <div className="h-11 w-36 rounded-full bg-white/10" />
            <div className="h-11 w-28 rounded-full bg-white/6" />
          </div>
        </div>
      </section>
    );
  }

  const ratingVal =
    film.tmdb?.vote_average || film.vote_average || film.rating || 8.3;

  const { durationStr, genresStr, ageRating, qualityBadge, langBadge } =
    getFilmDetailMeta(film);

  const watchProgress = watchHistoryMap.get(film.slug);
  const hasWatched = Boolean(watchProgress && watchProgress.progress > 10);
  const progressSecs = watchProgress?.progress || 0;
  const totalSecs = watchProgress?.duration || 0;

  const formatProgressTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
    }
    return `${m}:${s < 10 ? `0${s}` : s}`;
  };

  const progressPct =
    totalSecs > 0
      ? Math.min(100, Math.round((progressSecs / totalSecs) * 100))
      : 0;

  return (
    <section
      data-hero-banner="true"
      className="relative min-h-[100dvh] w-full overflow-hidden bg-[#141414] transform-gpu contain-paint"
    >
      <TrailerModal
        film={trailerModalFilm}
        isOpen={!!trailerModalFilm}
        onClose={() => setTrailerModalFilm(null)}
        presentation="hero"
      />

      {/* Direct CDN Preloaded Backdrop Layers (700ms GPU Opacity Crossfade) */}
      <div className="absolute inset-0 w-full h-full">
        {featured.map((item, idx) => {
          const isActive = idx === current;

          return (
            <div
              key={item.slug || idx}
              className={cn(
                "absolute inset-0 w-full h-full transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-[opacity,transform] pointer-events-none",
                isActive ? "opacity-100 scale-100 z-10" : "opacity-0 scale-[1.02] z-0",
              )}
            >
              <HeroBackdropImage film={item as HeroFilm} isActive={isActive} />
            </div>
          );
        })}
      </div>

      {/* Vignette Dark Gradient Overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at center, transparent 25%, rgba(10, 12, 16, 0.55) 70%, rgba(10, 12, 16, 0.95) 100%),
            linear-gradient(to top, #14181c 0%, rgba(20, 24, 28, 0.8) 25%, transparent 60%),
            linear-gradient(to bottom, rgba(10, 12, 16, 0.8) 0%, transparent 30%)
          `,
        }}
      />

      {/* 🎴 3-Card Fan / Cascade Deck (Left side desktop) */}
      <div className="absolute left-6 top-1/2 z-30 hidden w-[380px] h-[340px] -translate-y-1/2 xl:block 2xl:left-14 pointer-events-none">
        <div className="relative w-full h-full pointer-events-auto">
          {fanCards.map((cardFilm, index) => {
            const poster =
              resolveDirectImageUrl(cardFilm.poster_url) ||
              resolveDirectImageUrl(cardFilm.thumb_url);
            const isHovered = hoveredCardIndex === index;

            // User specified exact fan parameters:
            // Card 1 (Active/Front): Frontmost, largest, offset left slightly, rotate -5°, brightness 1.0
            // Card 2 (Middle): Behind, shift right 80px, shift up -20px, rotate +5°, scale 0.88, brightness 0.80
            // Card 3 (Back): Deepest, shift right 150px, shift down +30px, rotate +10°, scale 0.80, brightness 0.65
            const fanConfigs = [
              {
                x: -10,
                y: 10,
                rotate: -5,
                scale: 1.0,
                brightness: 1.0,
                shadow: "shadow-[0_25px_60px_rgba(0,0,0,0.85)]",
                border: "border-white/35",
                zIndex: 30,
              },
              {
                x: 80,
                y: -20,
                rotate: 5,
                scale: 0.88,
                brightness: 0.8,
                shadow: "shadow-[0_18px_45px_rgba(0,0,0,0.7)]",
                border: "border-white/20",
                zIndex: 20,
              },
              {
                x: 150,
                y: 30,
                rotate: 10,
                scale: 0.8,
                brightness: 0.65,
                shadow: "shadow-[0_12px_35px_rgba(0,0,0,0.6)]",
                border: "border-white/15",
                zIndex: 10,
              },
            ];

            const config = fanConfigs[index] || fanConfigs[0];

            return (
              <div key={`${cardFilm.slug}-${index}`} className="relative">
                <motion.article
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{
                    opacity: 1,
                    x: isHovered ? config.x + 6 : config.x,
                    y: isHovered ? config.y - 8 : config.y,
                    rotate: isHovered ? 0 : config.rotate,
                    scale: isHovered ? config.scale * 1.06 : config.scale,
                    filter: isHovered
                      ? "brightness(1.05)"
                      : `brightness(${config.brightness})`,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 24,
                  }}
                  onMouseEnter={() => setHoveredCardIndex(index)}
                  onMouseLeave={() => setHoveredCardIndex(null)}
                  onClick={() => {
                    const targetIndex = featured.findIndex(
                      (f) => f.slug === cardFilm.slug,
                    );
                    if (targetIndex !== -1) setCurrent(targetIndex);
                  }}
                  className={cn(
                    "absolute left-0 top-0 w-[165px] overflow-hidden rounded-2xl border bg-[#0d1017] cursor-pointer transition-all duration-300",
                    config.shadow,
                    isHovered
                      ? "border-white/90 ring-2 ring-white/80 shadow-[0_0_35px_rgba(255,255,255,0.4)] z-50"
                      : config.border,
                  )}
                  style={{
                    zIndex: isHovered ? 50 : config.zIndex,
                    transformOrigin: "center center",
                  }}
                >
                  <div className="aspect-[2/3] overflow-hidden bg-[#131822] relative group">
                    {poster ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={poster}
                        alt={cardFilm.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : null}

                    {/* Poster Title Scrim Gradient */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-3 text-left">
                      <p className="text-[11px] font-extrabold text-white leading-snug line-clamp-1">
                        {cardFilm.origin_name || cardFilm.name}
                      </p>
                      {cardFilm.year && (
                        <p className="text-[9px] font-mono text-neutral-300 font-bold mt-0.5 flex items-center gap-1">
                          <span>{cardFilm.year}</span>
                          <span>•</span>
                          <span className="text-amber-400">★ {cardFilm.vote_average || 8.5}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </motion.article>

                {/* Floating Preview Tooltip on Hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: -10, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -10, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className="absolute left-[180px] z-[60] w-[240px] p-3.5 rounded-2xl bg-[#0b0e17]/95 border border-white/20 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] pointer-events-none space-y-1.5 text-left"
                      style={{ top: `${config.y - 10}px` }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
                          ★ {cardFilm.vote_average || 8.5}
                        </span>
                        {cardFilm.year && (
                          <span className="text-[10px] font-mono text-neutral-400 font-bold">
                            {cardFilm.year}
                          </span>
                        )}
                        <span className="ml-auto text-[9px] font-mono font-bold text-rose-400 uppercase">
                          Xem ngay ▶
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-white leading-snug line-clamp-1">
                        {cardFilm.name}
                      </h4>
                      {cardFilm.origin_name && (
                        <p className="text-[10px] text-neutral-400 font-mono line-clamp-1">
                          {cardFilm.origin_name}
                        </p>
                      )}

                      <p className="text-[10px] text-neutral-300 leading-relaxed line-clamp-2 pt-0.5">
                        {cardFilm.content ||
                          "Chuyển sang xem trailer & thông tin bộ phim bom tấn này."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-end px-4 pb-8 sm:pb-18 md:pb-20 text-center">
        <div className="max-w-2xl mx-auto w-full flex flex-col items-center space-y-3 sm:space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center space-y-2.5 sm:space-y-3.5 w-full"
            >
              {/* 🏆 SINGLE PROMINENT SPOTLIGHT BADGE (Lý do để click) */}
              {(() => {
                const badge = getSpotlightBadge(film, current);
                return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-gradient-to-r ${badge.color} border shadow-lg backdrop-blur-md`}>
                    {badge.label}
                  </span>
                );
              })()}

              {/* Official TMDB title artwork with an accessible text fallback. */}
              <HeroMovieTitle film={film} />

              {/* Badges Pill Row (⭐ Rating, Year, 4K, Vietsub/Lồng tiếng) */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-extrabold text-amber-400 flex items-center gap-1 shadow-lg">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span>
                    {typeof ratingVal === "number"
                      ? ratingVal.toFixed(1)
                      : ratingVal}
                  </span>
                </span>

                {film.year && (
                  <span className="bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold text-neutral-200 shadow-lg">
                    {film.year}
                  </span>
                )}

                <span className="bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-extrabold text-emerald-400 shadow-lg">
                  {qualityBadge}
                </span>

                <span className="bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold text-purple-300 shadow-lg">
                  {langBadge}
                </span>
              </div>

              {/* Movie Detail Sub-Info Line (Duration • Genres • Age Rating) */}
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-neutral-300/90 tracking-wide flex-wrap px-2">
                <span>{durationStr}</span>
                <span className="text-neutral-500 font-bold">•</span>
                <span>{genresStr}</span>
                <span className="text-neutral-500 font-bold">•</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[11px] font-extrabold text-neutral-200 border border-white/15">{ageRating}</span>
              </div>

              {/* Centered Overview Text */}
              <p className="text-[11px] sm:text-sm text-neutral-300/90 max-w-xl mx-auto leading-relaxed line-clamp-2 font-normal drop-shadow-md px-2">
                {film.content
                  ? film.content.replace(/<[^>]*>?/gm, "")
                  : film.origin_name
                    ? `${film.origin_name} - ` + t("home.heroDesc")
                    : t("home.heroDesc")}
              </p>

              {/* Action Buttons (Watch Now / Resume Watch + Trailer + Bookmark with Tooltip) */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 pt-1">
                {hasWatched ? (
                  <Link
                    href={getWatchHref(film)}
                    className="flex flex-col items-center justify-center bg-white hover:bg-neutral-200 text-black px-6 py-2 sm:px-7 sm:py-2.5 rounded-full transition-all duration-200 shadow-2xl hover:scale-105 active:scale-95 group min-w-[145px]"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black tracking-wide uppercase">
                      <Play size={14} className="fill-black" />
                      <span>Xem tiếp {formatProgressTime(progressSecs)}</span>
                    </div>
                    {progressPct > 0 && (
                      <div className="w-full bg-neutral-300 h-1 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-[#e50914] h-full rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}
                  </Link>
                ) : (
                  <Link
                    href={getWatchHref(film)}
                    className="flex items-center gap-1.5 sm:gap-2 bg-white hover:bg-neutral-200 text-black px-5 py-2.5 sm:px-7 sm:py-3 rounded-full text-xs font-black tracking-wide uppercase transition-all duration-200 shadow-2xl hover:scale-105 active:scale-95"
                  >
                    <Play size={14} className="fill-black" />
                    <span>Xem ngay</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setTrailerModalFilm(film)}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/15 bg-[#181c24]/80 px-4 py-2.5 sm:px-5 sm:py-3 text-xs font-bold text-neutral-200 shadow-xl transition-all duration-200 hover:scale-105 hover:bg-white/20 hover:text-white active:scale-95 cursor-pointer"
                >
                  <Film size={14} className="text-neutral-300" />
                  <span>Trailer</span>
                </button>

                {/* Bookmark CTA with hover tooltip */}
                <div className="relative group">
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-black/90 border border-white/20 backdrop-blur-md text-[10px] font-bold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 shadow-2xl z-40 translate-y-1 group-hover:translate-y-0">
                    Lưu vào tủ phim
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const movieData = {
                        title: film.name,
                        titleEn: film.origin_name,
                        posterUrl: film.poster_url,
                        thumbUrl: film.thumb_url,
                        type: film.type,
                        year: film.year,
                      };
                      if (!user) {
                        guestDataStorage.addWatchlist(film.slug, movieData);
                        toast(
                          "Đã lưu vào tủ phim (trên thiết bị này)",
                          "success",
                        );
                        return;
                      }
                      watchlistApi
                        .add(film.slug, movieData)
                        .then(() =>
                          toast(`Đã thêm "${film.name}" vào tủ phim`, "success"),
                        )
                        .catch(() => {
                          guestDataStorage.addWatchlist(film.slug, movieData);
                          toast(
                            "Đã lưu cục bộ, sẽ đồng bộ lại khi kết nối ổn định",
                            "info",
                          );
                        });
                    }}
                    aria-label="Thêm vào tủ phim"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-xl"
                  >
                    <Bookmark size={15} />
                  </button>
                </div>
              </div>

              {/* Mobile Pagination Dots */}
              <div className="flex sm:hidden items-center justify-center gap-1.5 pt-2">
                {featured.slice(0, 6).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrent(i)}
                    aria-label={`Chuyển đến phim ${i + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === current
                        ? "w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                        : "w-1.5 bg-white/40 hover:bg-white/60",
                    )}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Mouse Scroll Indicator */}
      <div
        onClick={() => {
          if (typeof window !== "undefined") {
            window.scrollTo({
              top: window.innerHeight - 70,
              behavior: "smooth",
            });
          }
        }}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 hidden md:flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer select-none group"
        title="Cuộn xuống"
      >
        <div className="w-5 h-8 rounded-full border border-white/40 group-hover:border-white flex items-start justify-center p-1 backdrop-blur-xs transition-colors">
          <motion.div
            animate={{ y: [0, 8, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="w-1 h-1.5 rounded-full bg-white"
          />
        </div>
        <ChevronDown
          size={12}
          className="text-white/60 group-hover:text-white transition-colors -mt-0.5 animate-bounce"
        />
      </div>

      {/* Widescreen Movie Card Bar + Progress & Counter Indicator (Bottom Right) */}
      <div className="absolute right-4 sm:right-8 md:right-12 bottom-6 z-30 hidden sm:flex flex-col items-end gap-2 max-w-[calc(100vw-2rem)]">
        {/* Indicator Row: 01 / 06 Counter & Thin Progress Bar (More Transparent) */}
        <div className="flex items-center gap-2.5 bg-black/25 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[11px] font-mono font-bold text-neutral-300/90 shadow-lg">
          <span className="text-white font-extrabold tracking-wider">
            {String(current + 1).padStart(2, "0")} <span className="text-neutral-500 font-normal">/</span> {String(featured.length).padStart(2, "0")}
          </span>

          {/* Thin Progress Bar indicating 10s auto rotation */}
          <div className="w-14 sm:w-16 h-1 bg-white/20 rounded-full overflow-hidden relative">
            <motion.div
              key={current}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 10, ease: "linear" }}
              className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            />
          </div>
        </div>

        {/* Thumbnails Row with Hover Preview (Scrollbar Completely Hidden) */}
        <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
          {featured.slice(0, 6).map((item, i) => {
            const cardImg =
              item.thumb_url ||
              item.poster_url ||
              (item as any).heroBackdrop ||
              "";
            const isActive = i === current;

            return (
              <div key={item.slug || i} className="relative group">
                {/* Floating Preview Tooltip on Hover */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-black/90 border border-white/20 backdrop-blur-md text-[11px] font-bold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 shadow-2xl z-40 translate-y-1 group-hover:translate-y-0 text-center">
                  <p className="line-clamp-1 max-w-[150px]">{item.origin_name || item.name}</p>
                  {item.year && <span className="text-[9px] text-neutral-400 font-mono font-normal">({item.year})</span>}
                </div>

                <button
                  onClick={() => setCurrent(i)}
                  type="button"
                  aria-label={item.name}
                  className={cn(
                    "relative w-20 sm:w-24 aspect-[16/9] rounded-lg overflow-hidden cursor-pointer flex-shrink-0 transition-all duration-300 shadow-xl border text-left block",
                    isActive
                      ? "border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.35)] z-10 opacity-100 ring-1 ring-white/40"
                      : "border-white/20 opacity-50 hover:opacity-90 hover:border-white/60 hover:scale-105",
                  )}
                >
                  {cardImg ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cardImg}
                      alt={item.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-[9px] text-neutral-400 font-bold px-1 text-center truncate">
                      {item.name}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
