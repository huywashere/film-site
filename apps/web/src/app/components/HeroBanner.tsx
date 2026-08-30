"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import {
  Play,
  Star,
  Film,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bookmark,
} from "lucide-react";
import dynamic from "next/dynamic";
import { FilmItem } from "@/components/film/FilmCard";
import { useTranslation } from "@/store/langStore";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import {
  movieApi,
  siteConfigApi,
  watchlistApi,
  watchHistoryApi,
  type PublicSiteConfiguration,
} from "@/lib/api";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { heroSerifFont, cardFont } from "@/lib/fonts";
import { guestDataStorage } from "@/lib/user-data";
import {
  buildHeroCardImageCandidates,
  buildHeroImageCandidates,
} from "@/lib/hero-image";
import {
  tmdbApi,
  tmdbBackdrop,
  tmdbLogo,
  tmdbPoster,
  extractTmdbInfo,
  getYoutubeTrailer,
  type TmdbImage,
  type TmdbMovie,
} from "@/lib/tmdb";
import {
  CURATED_HERO_FRANCHISE_POOL,
  getRandomCuratedHeroSet,
} from "@/lib/curated-hero-pool";
import { buildArtworkCandidates } from "@/lib/image-cdn";

const TrailerModal = dynamic(
  () => import("@/components/film/TrailerModal").then((m) => m.TrailerModal),
  { ssr: false },
);

const fanCardReveal = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const FanCardButton = styled.button<{
  $x: number;
  $y: number;
  $scale: number;
  $brightness: number;
  $layer: number;
  $order: number;
  $featured: boolean;
}>`
  position: absolute;
  left: 0;
  top: 0;
  width: 158px;
  overflow: hidden;
  border-radius: 15px;
  border: 1px solid
    ${({ $featured }) =>
      $featured ? "rgba(242, 193, 78, 0.82)" : "rgba(255, 255, 255, 0.2)"};
  background: #0d1017;
  color: inherit;
  cursor: pointer;
  text-align: left;
  z-index: ${({ $layer }) => $layer};
  transform: translate3d(${({ $x }) => $x}px, ${({ $y }) => $y}px, 0)
    scale(${({ $scale }) => $scale});
  filter: brightness(${({ $brightness }) => $brightness});
  box-shadow:
    0 22px 54px rgba(2, 6, 16, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.09);
  backface-visibility: hidden;
  contain: layout paint style;
  will-change: transform;
  animation: ${fanCardReveal} 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: ${({ $order }) => $order * 70}ms;
  transition:
    transform 380ms cubic-bezier(0.16, 1, 0.3, 1),
    filter 280ms ease,
    border-color 280ms ease,
    box-shadow 380ms cubic-bezier(0.16, 1, 0.3, 1);

  &:hover,
  &:focus-visible {
    z-index: 50;
    transform: translate3d(${({ $x }) => $x}px, ${({ $y }) => $y - 12}px, 0)
      scale(${({ $scale }) => $scale * 1.045});
    filter: brightness(1.04);
    border-color: rgba(255, 255, 255, 0.66);
    box-shadow:
      0 30px 72px rgba(2, 6, 16, 0.78),
      0 0 0 1px rgba(255, 255, 255, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.14);
  }

  &:focus-visible {
    outline: 2px solid #f2c14e;
    outline-offset: 4px;
  }

  &:active {
    transform: translate3d(${({ $x }) => $x}px, ${({ $y }) => $y - 8}px, 0)
      scale(${({ $scale }) => $scale * 1.015});
  }

  &:hover .fan-card-image,
  &:focus-visible .fan-card-image {
    transform: scale(1.035);
  }

  &:hover .fan-card-action,
  &:focus-visible .fan-card-action {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
    will-change: auto;

    &:hover,
    &:focus-visible,
    &:active {
      transform: translate3d(${({ $x }) => $x}px, ${({ $y }) => $y}px, 0)
        scale(${({ $scale }) => $scale});
    }
  }
`;

interface HeroBannerProps {
  films?: FilmItem[];
  initialConfig?: PublicSiteConfiguration;
}

interface HeroFilm extends FilmItem {
  heroBackdrop?: string;
  titleLogo?: string;
  titleLogoResolved?: boolean;
  tmdbOnly?: boolean;
}

const HERO_SESSION_KEY = "netphim.tmdb-hero.v6";
const HERO_INDEX_SESSION_KEY = "netphim.tmdb-hero-index.v2";

// Trailer IDs are tiny and safe to retain for the current browser session.
// This avoids repeating the TMDB request when a hero slide cycles back.
const heroTrailerCache = new Map<string, string>();

const HERO_MARKETS = [
  { code: "US", region: "US", language: "en" },
  { code: "KR", region: "KR", language: "ko" },
] as const;

const HERO_MIN_RELEASE_YEAR = 2024;
const HERO_ROTATION_MS = 14_000;
const RETIRED_TMDB_HERO_IDS = new Set([
  155, 157336, 27205, 299534, 299536, 361743, 414906, 447365, 453395, 475557,
  49521, 533535, 634649, 693134, 76600, 791373, 872585,
]);
const RETIRED_TMDB_HERO_TITLES = [
  "joker",
  "the batman",
  "the dark knight",
  "avengers: endgame",
  "interstellar",
  "avatar: the way of water",
  "spider-man: no way home",
  "deadpool & wolverine",
];

function isFreshTmdbHero(movie: TmdbMovie): boolean {
  const year = Number(
    (movie.release_date || movie.first_air_date || "").slice(0, 4),
  );
  const title =
    `${movie.title || ""} ${movie.name || ""} ${movie.original_title || ""}`.toLowerCase();

  return (
    year >= HERO_MIN_RELEASE_YEAR &&
    !RETIRED_TMDB_HERO_IDS.has(movie.id) &&
    !RETIRED_TMDB_HERO_TITLES.some((retiredTitle) =>
      title.includes(retiredTitle),
    )
  );
}

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

function normalizeHeroTitle(value?: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function movieTmdbId(film: FilmItem): string {
  return String(film.tmdb?.id || (film as any).tmdb_id || "").trim();
}

async function attachPlayableSource(hero: HeroFilm): Promise<HeroFilm | null> {
  if (!hero.tmdbOnly) return hero;

  const query = hero.origin_name || hero.name;
  const response = await movieApi.search(query, 1, 30);
  const payload = response.data as any;
  const items: FilmItem[] = payload?.data?.items || payload?.items || [];
  const expectedTmdbId = movieTmdbId(hero);
  const expectedTitles = new Set(
    [hero.origin_name, hero.name].map(normalizeHeroTitle).filter(Boolean),
  );

  const match = items.find((candidate) => {
    const candidateTmdbId = movieTmdbId(candidate);
    if (expectedTmdbId && candidateTmdbId === expectedTmdbId) return true;

    const candidateTitles = [candidate.origin_name, candidate.name]
      .map(normalizeHeroTitle)
      .filter(Boolean);
    return Boolean(
      hero.year &&
      candidate.year === hero.year &&
      candidateTitles.some((title) => expectedTitles.has(title)),
    );
  });

  if (!match?.slug) return null;
  return {
    ...hero,
    ...match,
    // Retain the high-resolution TMDB presentation while routing playback via
    // the exact provider slug discovered above.
    heroBackdrop: hero.heroBackdrop,
    titleLogo: hero.titleLogo,
    titleLogoResolved: hero.titleLogoResolved,
    poster_url: hero.poster_url || match.poster_url,
    thumb_url: hero.thumb_url || match.thumb_url,
    tmdbOnly: false,
  };
}

async function retainPlayableHeroes(heroes: HeroFilm[]): Promise<HeroFilm[]> {
  const resolved = await Promise.allSettled(heroes.map(attachPlayableSource));
  return resolved.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
}

// Helper for direct CDN image URL
function resolveDirectImageUrl(url?: unknown): string | null {
  if (!url || typeof url !== "string") return null;
  let resolved = url.trim();
  if (!resolved) return null;

  if (resolved.startsWith("/api/")) return resolved;

  if (/^https?:\/\/image\.tmdb\.org\/t\/p\//i.test(resolved)) {
    return resolved;
  }

  if (resolved.startsWith("//")) {
    resolved = `https:${resolved}`;
  } else if (
    !resolved.startsWith("http://") &&
    !resolved.startsWith("https://")
  ) {
    const cleanPath = resolved.startsWith("/") ? resolved.slice(1) : resolved;
    resolved = `https://phimimg.com/${cleanPath}`;
  } else if (resolved.startsWith("http://")) {
    resolved = resolved.replace(/^http:\/\//i, "https://");
  }

  return resolved.replace("img.phimapi.com/", "phimimg.com/");
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
    // Movie providers do not agree on the ID shape. Some return a number or
    // an object even though the normalized type is a string, so never call
    // string methods on the upstream value directly.
    const safeId = String(film._id ?? film.slug ?? "120");
    const numericId = safeId.replace(/\D/g, "");
    const idNum = numericId ? Number.parseInt(numericId, 10) : 120;
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
    if (
      lower.includes("dragon") ||
      lower.includes("rồng") ||
      lower.includes("game")
    ) {
      genresStr = "Chính kịch • Hành động • Thần thoại";
    } else if (
      lower.includes("avengers") ||
      lower.includes("spider") ||
      lower.includes("marvel") ||
      lower.includes("dc")
    ) {
      genresStr = "Hành động • Viễn tưởng • Phiêu lưu";
    } else if (lower.includes("oppenheimer") || lower.includes("dark")) {
      genresStr = "Chính kịch • Lịch sử • Tiêu điểm";
    } else if (lower.includes("avatar")) {
      genresStr = "Viễn tưởng • Phiêu lưu • Bom tấn";
    }
  }

  let ageRating = "16+";
  const contentLower = (film.content || "").toLowerCase();
  if (
    contentLower.includes("18+") ||
    contentLower.includes("kinh dị") ||
    contentLower.includes("bạo lực")
  ) {
    ageRating = "18+";
  } else if (
    contentLower.includes("hoạt hình") ||
    contentLower.includes("gia đình")
  ) {
    ageRating = "P";
  }

  let qualityBadge = "4K";
  if (film.quality) {
    if (
      film.quality.toUpperCase() === "TMDB HD" ||
      film.quality.toUpperCase() === "HD"
    ) {
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
  if ((film as any).spotlightBadge) {
    const colors = [
      "from-red-600/90 to-amber-600/90 text-white border-red-500/40",
      "from-amber-600/90 to-yellow-500/90 text-white border-amber-400/40",
      "from-violet-600/90 to-purple-500/90 text-white border-purple-400/40",
      "from-blue-600/90 to-indigo-600/90 text-white border-blue-400/40",
      "from-emerald-600/90 to-teal-500/90 text-white border-emerald-400/40",
      "from-rose-600/90 to-pink-600/90 text-white border-rose-500/40",
    ];
    return {
      label: (film as any).spotlightBadge,
      color: colors[index % colors.length],
    };
  }
  const badges = [
    {
      label: "🔥 #1 THỊNH HÀNH HÔM NAY",
      color: "from-red-600/90 to-amber-600/90 text-white border-red-500/40",
    },
    {
      label: "🏆 SIÊU PHẨM HOLLYWOOD 4K",
      color:
        "from-amber-600/90 to-yellow-500/90 text-white border-amber-400/40",
    },
    {
      label: "✨ BOM TẤN CHIẾU RẠP",
      color:
        "from-violet-600/90 to-purple-500/90 text-white border-purple-400/40",
    },
    {
      label: "🍿 VŨ TRỤ ĐIỆN ẢNH ĐỈNH CAO",
      color: "from-rose-600/90 to-pink-600/90 text-white border-rose-500/40",
    },
    {
      label: "⚡ BẢN QUYỀN CHẤT LƯỢNG CAO",
      color:
        "from-emerald-600/90 to-teal-500/90 text-white border-emerald-400/40",
    },
    {
      label: "💎 TOP PHIM ĐƯỢC BÌNH CHỌN",
      color: "from-blue-600/90 to-indigo-600/90 text-white border-blue-400/40",
    },
  ];
  return badges[index % badges.length];
}

function getBestTitleLogo(logos: TmdbImage[]): TmdbImage | null {
  const languagePriority = (language?: string | null) => {
    if (language === "vi") return 4;
    if (language === "en") return 3;
    if (language === "zh" || language === "ko" || language === "ja") return 2;
    if (!language) return 1;
    return 0;
  };

  return (
    [...logos]
      .filter(
        (logo) => Boolean(logo.file_path) && logo.width > 0 && logo.height > 0,
      )
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
      if (film.titleLogoResolved && film.titleLogo) return film;

      let tmdbId = Number(
        (film as any).tmdbId ||
          film.tmdb?.id ||
          (film as any).tmdb_id ||
          film.slug.match(/^tmdb-(\d+)$/)?.[1],
      );
      let mediaType: "movie" | "tv" =
        film.tmdb?.type === "tv" ||
        film.type === "series" ||
        film.type === "tvshows"
          ? "tv"
          : "movie";

      // 1. If no TMDB id, look up movie detail
      if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
        try {
          const detailRes = await movieApi.getDetail(film.slug);
          const detailData =
            (detailRes.data as any)?.movie ||
            (detailRes.data as any)?.data?.item ||
            (detailRes.data as any)?.item;
          const foundId =
            detailData?.tmdb?.id ||
            detailData?.tmdb_id ||
            (detailRes.data as any)?.item?.tmdb?.id ||
            (detailRes.data as any)?.movie?.tmdb?.id;
          if (foundId) {
            tmdbId = Number(foundId);
            if (detailData?.tmdb?.type) mediaType = detailData.tmdb.type as any;
          }
        } catch {}
      }

      // 2. If still no TMDB id, search TMDB by English/Original/Vietnamese name
      if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
        try {
          const searchNames = [film.origin_name, film.name].filter(
            (n): n is string => Boolean(n),
          );
          for (const rawName of searchNames) {
            const query = rawName.replace(/\(\d{4}\)/g, "").trim();
            if (!query) continue;
            const searchResult = await tmdbApi.searchMulti(query);
            const match = searchResult?.results?.[0];
            if (match?.id) {
              tmdbId = match.id;
              mediaType = (match.media_type as any) === "tv" ? "tv" : "movie";
              break;
            }
          }
        } catch {}
      }

      if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
        return { ...film, titleLogoResolved: true };
      }

      try {
        const images = await tmdbApi.getImages(mediaType, tmdbId);
        if (!images) return { ...film, titleLogoResolved: true };

        const bestLogo = getBestTitleLogo(images.logos || []);
        const bestBackdrop = images.backdrops?.[0]?.file_path
          ? tmdbBackdrop(images.backdrops[0].file_path, "w1280")
          : undefined;

        return {
          ...film,
          tmdb: { ...film.tmdb, id: String(tmdbId), type: mediaType },
          titleLogo:
            tmdbLogo(bestLogo?.file_path, "w500") ||
            film.titleLogo ||
            undefined,
          // A curated/provider backdrop is already tied to this exact film.
          // Logo enrichment must not replace it with a loose TMDB search hit.
          heroBackdrop: film.heroBackdrop || bestBackdrop || undefined,
          titleLogoResolved: true,
        };
      } catch {
        return { ...film, titleLogoResolved: true };
      }
    }),
  );
}

const preloadedHeroLogos = new Set<string>();

function HeroMovieTitle({
  film,
  onReady,
}: {
  film: HeroFilm;
  onReady: () => void;
}) {
  const candidateLogos = useMemo(() => {
    if (!film.titleLogo) return [];
    return buildArtworkCandidates([film.titleLogo], "titleLogo");
  }, [film.titleLogo]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const currentLogoSrc = candidateLogos[candidateIdx];
  // Keep known title artwork visible in the server HTML. Waiting for React to
  // hydrate before removing opacity delayed LCP by roughly two seconds.
  const [logoLoaded, setLogoLoaded] = useState(Boolean(currentLogoSrc));
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCandidateIdx(0);
    const firstSrc = candidateLogos[0];
    if (firstSrc) {
      setLogoLoaded(true);
      if (preloadedHeroLogos.has(firstSrc)) onReady();
    } else {
      setLogoLoaded(false);
    }
  }, [film.slug, film.titleLogo, candidateLogos, onReady]);

  // Check if browser already has image in cache
  useEffect(() => {
    if (
      imgRef.current?.complete &&
      imgRef.current.naturalWidth > 0 &&
      currentLogoSrc
    ) {
      preloadedHeroLogos.add(currentLogoSrc);
      setLogoLoaded(true);
      onReady();
    }
  }, [currentLogoSrc, onReady]);

  const title = film.origin_name || film.name;
  const hasLogoCandidate = Boolean(currentLogoSrc);

  useEffect(() => {
    if (!hasLogoCandidate) onReady();
  }, [hasLogoCandidate, onReady]);

  return (
    <div className="relative flex min-h-16 w-full items-center justify-center sm:min-h-24 md:min-h-28">
      {/* Cinematic Text Title - Rendered immediately so user never sees a blank gap */}
      <h1
        className={cn(
          "max-w-2xl line-clamp-2 text-xl font-black uppercase leading-tight tracking-wide text-white drop-shadow-[0_10px_35px_rgba(0,0,0,0.95)] sm:text-4xl md:text-5xl transition-opacity duration-300",
          logoLoaded
            ? "opacity-0 absolute pointer-events-none"
            : "opacity-100 relative",
        )}
        style={{ fontFamily: "'Be Vietnam Pro', 'Inter', sans-serif" }}
      >
        {title}
      </h1>

      {hasLogoCandidate && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={imgRef}
          key={`${film.slug}-${candidateIdx}`}
          src={currentLogoSrc}
          alt={title}
          referrerPolicy="no-referrer"
          decoding="async"
          loading="eager"
          fetchPriority="high"
          onLoad={() => {
            if (currentLogoSrc) preloadedHeroLogos.add(currentLogoSrc);
            setLogoLoaded(true);
            onReady();
          }}
          onError={() => {
            if (candidateIdx < candidateLogos.length - 1) {
              setCandidateIdx((i) => i + 1);
            } else {
              setLogoLoaded(false);
              onReady();
            }
          }}
          className={cn(
            "max-h-16 w-auto max-w-[82vw] object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.85)] transition-opacity duration-300 sm:max-h-24 sm:max-w-[34rem] md:max-h-28",
            logoLoaded
              ? "opacity-100 relative"
              : "opacity-0 absolute pointer-events-none",
          )}
        />
      )}
    </div>
  );
}

function HeroFanCardImage({
  film,
  className,
}: {
  film: HeroFilm;
  className?: string;
}) {
  const candidateUrls = useMemo(() => {
    return buildHeroCardImageCandidates(
      {
        heroBackdrop: resolveDirectImageUrl(film.heroBackdrop) || undefined,
        posterUrl: resolveDirectImageUrl(film.poster_url) || undefined,
        thumbUrl: resolveDirectImageUrl(film.thumb_url) || undefined,
      },
      "poster",
    );
  }, [film.heroBackdrop, film.poster_url, film.thumb_url]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCandidateIdx(0);
    setHasError(false);
  }, [film.slug, candidateUrls]);

  const src = candidateUrls[candidateIdx];

  if (!src || hasError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex flex-col items-center justify-center p-3 text-center">
        <Film className="w-8 h-8 text-neutral-600 mb-1" />
        <span className="text-[10px] font-bold text-neutral-300 line-clamp-2">
          {film.name}
        </span>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      key={`${film.slug}-${candidateIdx}`}
      src={src}
      alt={film.name}
      referrerPolicy="no-referrer"
      loading="lazy"
      fetchPriority="low"
      decoding="async"
      onError={() => {
        if (candidateIdx < candidateUrls.length - 1) {
          setCandidateIdx((i) => i + 1);
        } else {
          setHasError(true);
        }
      }}
      className={className}
    />
  );
}

function HeroThumbnailImage({
  film,
  isActive,
  className,
}: {
  film: HeroFilm;
  isActive: boolean;
  className?: string;
}) {
  const candidateUrls = useMemo(() => {
    return buildHeroCardImageCandidates(
      {
        heroBackdrop: resolveDirectImageUrl(film.heroBackdrop) || undefined,
        posterUrl: resolveDirectImageUrl(film.poster_url) || undefined,
        thumbUrl: resolveDirectImageUrl(film.thumb_url) || undefined,
      },
      "thumbnail",
    );
  }, [film.heroBackdrop, film.poster_url, film.thumb_url]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCandidateIdx(0);
    setHasError(false);
  }, [film.slug, candidateUrls]);

  const src = candidateUrls[candidateIdx];

  if (!src || hasError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex flex-col items-center justify-center text-[9px] text-neutral-300 font-bold px-1 text-center truncate">
        <Film className="w-4 h-4 text-neutral-500 mb-0.5" />
        <span className="truncate max-w-full">{film.name}</span>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      key={`${film.slug}-${candidateIdx}`}
      src={src}
      alt={film.name}
      referrerPolicy="no-referrer"
      loading={isActive ? "eager" : "lazy"}
      fetchPriority={isActive ? "high" : "low"}
      decoding="async"
      onError={() => {
        if (candidateIdx < candidateUrls.length - 1) {
          setCandidateIdx((i) => i + 1);
        } else {
          setHasError(true);
        }
      }}
      className={className}
    />
  );
}

const preloadedHeroBackdrops = new Set<string>();

function getMobileHeroBackdrop(src: string) {
  return src.includes("image.tmdb.org/t/p/")
    ? src.replace(
        /\/t\/p\/(?:original|w300|w342|w500|w780|w1280)\//i,
        "/t/p/w780/",
      )
    : src;
}

function HeroBackdropImage({
  film,
  isActive,
  revealed,
  onReady,
}: {
  film: HeroFilm;
  isActive: boolean;
  revealed: boolean;
  onReady: () => void;
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
  const mobileCandidates = useMemo(
    () =>
      buildHeroCardImageCandidates(
        {
          heroBackdrop: film.heroBackdrop,
          thumbUrl: film.thumb_url,
          posterUrl: film.poster_url,
        },
        "poster",
      ).map(getMobileHeroBackdrop),
    [film.heroBackdrop, film.poster_url, film.thumb_url],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [mobileCandidateIndex, setMobileCandidateIndex] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);

  const src = candidates[candidateIndex] || candidates[0];
  const mobileSrc =
    mobileCandidates[mobileCandidateIndex] || getMobileHeroBackdrop(src);

  useEffect(() => {
    onReady();
  }, [onReady]);

  const tryNextCandidate = () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches &&
      mobileCandidateIndex < mobileCandidates.length - 1
    ) {
      setMobileCandidateIndex((index) => index + 1);
      return;
    }
    if (candidateIndex < candidates.length - 1) {
      setCandidateIndex((index) => index + 1);
    }
  };

  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(50,58,72,0.3),transparent_44%),linear-gradient(135deg,#0b0e13_0%,#151a22_52%,#0b0d12_100%)]" />
      {src && (
        <picture className="block h-full w-full">
          <source media="(max-width: 767px)" srcSet={mobileSrc} />
          <img
            ref={imageRef}
            src={src}
            alt={film.name}
            referrerPolicy="no-referrer"
            loading={isActive ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={isActive ? "high" : "low"}
            onLoad={() => {
              preloadedHeroBackdrops.add(src);
              onReady();
            }}
            onError={tryNextCandidate}
            className="h-full w-full object-cover object-[center_22%] brightness-[0.72] transition-transform duration-1000 ease-out md:object-center"
          />
        </picture>
      )}
    </>
  );
}

function HeroTrailerLayer({
  film,
  enabled,
}: {
  film: HeroFilm;
  enabled: boolean;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [canStream, setCanStream] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [frameReady, setFrameReady] = useState(false);

  useEffect(() => {
    const node = layerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;

    const updateEligibility = () => {
      const constrainedConnection =
        connection?.saveData === true ||
        connection?.effectiveType === "slow-2g" ||
        connection?.effectiveType === "2g";
      setCanStream(
        desktopQuery.matches &&
          !motionQuery.matches &&
          !constrainedConnection &&
          document.visibilityState === "visible",
      );
    };

    updateEligibility();
    desktopQuery.addEventListener("change", updateEligibility);
    motionQuery.addEventListener("change", updateEligibility);
    document.addEventListener("visibilitychange", updateEligibility);
    return () => {
      desktopQuery.removeEventListener("change", updateEligibility);
      motionQuery.removeEventListener("change", updateEligibility);
      document.removeEventListener("visibilitychange", updateEligibility);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTrailerKey(null);
    setFrameReady(false);

    if (!enabled || !isInView || !canStream) return;

    const { tmdbId, type } = extractTmdbInfo(film);
    if (!tmdbId) return;

    const cacheKey = `${type}:${tmdbId}`;
    const loadTrailer = async () => {
      const cachedKey = heroTrailerCache.get(cacheKey);
      if (cachedKey) {
        if (!cancelled) setTrailerKey(cachedKey);
        return;
      }

      try {
        const response =
          type === "tv"
            ? await tmdbApi.getTvVideos(tmdbId)
            : await tmdbApi.getMovieVideos(tmdbId);
        const trailer = getYoutubeTrailer(response?.results || []);
        if (!trailer?.key || cancelled) return;
        heroTrailerCache.set(cacheKey, trailer.key);
        setTrailerKey(trailer.key);
      } catch {
        // The TMDB image remains visible when a trailer is missing or blocked.
      }
    };

    // Let the high-priority backdrop settle first. The third-party player is
    // deliberately deferred so it never competes with the initial hero paint.
    const timer = window.setTimeout(() => void loadTrailer(), 1400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canStream, enabled, film, isInView]);

  const embedUrl = trailerKey
    ? `https://www.youtube.com/embed/${encodeURIComponent(trailerKey)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${encodeURIComponent(trailerKey)}&playsinline=1&rel=0&disablekb=1&fs=0`
    : null;

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 hidden overflow-hidden lg:block"
    >
      {embedUrl && canStream && isInView && (
        <iframe
          key={`${film.slug}-${trailerKey}`}
          src={embedUrl}
          title={`Trailer nền ${film.name}`}
          tabIndex={-1}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setFrameReady(true)}
          className={cn(
            "absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[100vw] min-w-[177.78vh] -translate-x-1/2 -translate-y-1/2 border-0 object-cover transition-opacity duration-1000 ease-out",
            frameReady ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
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
    value.length > 0 &&
    value.every(
      (film) =>
        typeof film === "object" &&
        film !== null &&
        typeof (film as HeroFilm).slug === "string" &&
        typeof (film as HeroFilm).heroBackdrop === "string" &&
        !(film as HeroFilm).heroBackdrop?.includes("phimimg.com/upload/vod/"),
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

async function loadFreshTmdbPlaylist(): Promise<HeroFilm[]> {
  const [trending, ...marketGroups] = await Promise.all([
    tmdbApi.getTrending("movie", "week"),
    ...HERO_MARKETS.map((market) =>
      tmdbApi.discoverMovies({
        page: 1,
        region: market.region,
        with_origin_country: market.code,
        with_original_language: market.language,
        "vote_count.gte": 120,
      }),
    ),
  ]);

  const groups = [
    (trending?.results || []).filter(isFreshTmdbHero),
    ...marketGroups.map((group) =>
      (group?.results || []).filter(isFreshTmdbHero),
    ),
  ];

  const withLogos = await enrichHeroTitleLogos(selectRandomFilms(groups));
  return retainPlayableHeroes(withLogos);
}

export default function HeroBanner({ films, initialConfig }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [showDesktopFanCards, setShowDesktopFanCards] = useState(false);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(false);
  const attemptedTitleLogos = useRef(new Set<string>());
  // Keep SSR and the first client paint neutral. Rendering a curated playlist
  // here used to flash unrelated films before the authoritative admin/session
  // playlist arrived.
  const [featured, setFeatured] = useState<HeroFilm[]>(() => {
    if (films && films.length > 0) return films.slice(0, 6) as HeroFilm[];
    return [];
  });
  const [trailerModalFilm, setTrailerModalFilm] = useState<FilmItem | null>(
    null,
  );
  const [visualReadiness, setVisualReadiness] = useState<
    Record<string, { backdrop: boolean; title: boolean }>
  >({});
  const markVisualReady = useCallback(
    (slug: string, part: "backdrop" | "title") => {
      setVisualReadiness((currentReadiness) => {
        if (currentReadiness[slug]?.[part]) return currentReadiness;
        return {
          ...currentReadiness,
          [slug]: {
            backdrop: currentReadiness[slug]?.backdrop ?? false,
            title: currentReadiness[slug]?.title ?? false,
            [part]: true,
          },
        };
      });
    },
    [],
  );
  const reduceMotion = useReducedMotion();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const update = () => setShowDesktopFanCards(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const enable = () => setAutoRotateEnabled(true);
    const options: AddEventListenerOptions = { passive: true, once: true };
    window.addEventListener("pointerdown", enable, options);
    window.addEventListener("keydown", enable, { once: true });
    return () => {
      window.removeEventListener("pointerdown", enable);
      window.removeEventListener("keydown", enable);
    };
  }, []);

  // Resolve one authoritative playlist before painting any film artwork.
  // Priority: explicit props -> admin-pinned slugs -> stored session -> curated.
  // Keeping this in one effect removes the former race between site config and
  // session restoration that swapped banners shortly after every reload.
  useEffect(() => {
    let active = true;
    const initialize = async () => {
      let playlist: HeroFilm[] = [];
      let restoredIndex = 0;

      if (films && films.length > 0) {
        playlist = films.slice(0, 6) as HeroFilm[];
      } else {
        const stored = readStoredHeroPlaylist();
        try {
          const config =
            initialConfig || (await siteConfigApi.getPublic()).data;
          if (!active) return;
          const requestedSlugs = (config.heroMovieSlugs || [])
            .map((slug) => slug.trim())
            .filter(Boolean)
            .slice(0, 6);

          const storedMatchesPinned = Boolean(
            stored &&
            stored.length === requestedSlugs.length &&
            requestedSlugs.every((slug, index) => stored[index]?.slug === slug),
          );

          if (requestedSlugs.length && storedMatchesPinned && stored) {
            playlist = stored;
            restoredIndex = readStoredHeroIndex(stored.length);
          } else if (requestedSlugs.length) {
            playlist = (
              await Promise.all(
                requestedSlugs.map(async (slug) => {
                  const curated = CURATED_HERO_FRANCHISE_POOL.find(
                    (film) => film.slug === slug,
                  );
                  if (curated) return curated as HeroFilm;
                  try {
                    const detail = (await movieApi.getDetail(slug)).data as any;
                    const movie =
                      detail?.movie ||
                      detail?.data?.movie ||
                      detail?.data?.item ||
                      detail?.item;
                    return movie?.name
                      ? ({ ...movie, slug: movie.slug || slug } as HeroFilm)
                      : null;
                  } catch {
                    return null;
                  }
                }),
              )
            ).filter((film): film is HeroFilm => Boolean(film));
          } else if (stored?.length) {
            playlist = stored;
            restoredIndex = readStoredHeroIndex(stored.length);
          } else {
            playlist = getRandomCuratedHeroSet(6) as HeroFilm[];
          }
        } catch {
          if (stored?.length) {
            playlist = stored;
            restoredIndex = readStoredHeroIndex(stored.length);
          }
        }

        if (!playlist.length) {
          playlist = getRandomCuratedHeroSet(6) as HeroFilm[];
        }
      }

      if (!active) return;
      setFeatured(playlist);
      setCurrent(
        restoredIndex >= 0 && restoredIndex < playlist.length
          ? restoredIndex
          : 0,
      );
      storeHeroPlaylist(playlist);

      const selectedFilm = playlist[restoredIndex] || playlist[0];
      const withLogos = selectedFilm?.titleLogo
        ? [selectedFilm]
        : selectedFilm
          ? await enrichHeroTitleLogos([selectedFilm])
          : [];
      if (!active) return;
      const enrichedBySlug = new Map(
        withLogos.map((film) => [film.slug, film] as const),
      );
      setFeatured((currentPlaylist) =>
        currentPlaylist.map((film) => enrichedBySlug.get(film.slug) || film),
      );
    };

    void initialize();

    return () => {
      active = false;
    };
  }, [films, initialConfig]);

  // Resolve title artwork on demand. Fetching logo metadata for all six slides
  // during startup generated five invisible TMDB requests in the LCP window.
  useEffect(() => {
    const selected = featured[current];
    if (
      !selected ||
      selected.titleLogo ||
      attemptedTitleLogos.current.has(selected.slug)
    )
      return;
    attemptedTitleLogos.current.add(selected.slug);
    let active = true;
    void enrichHeroTitleLogos([selected]).then(([enriched]) => {
      if (!active || !enriched) return;
      setFeatured((playlist) =>
        playlist.map((item) => (item.slug === enriched.slug ? enriched : item)),
      );
    });
    return () => {
      active = false;
    };
  }, [current, featured]);

  // Warm only the visible and next slide. Preloading every w1280 backdrop at
  // once starved the small, above-the-fold card artwork on cold production loads.
  useEffect(() => {
    if (typeof window === "undefined" || !featured.length) return;
    const preloadItems = [featured[current]].filter(Boolean);
    preloadItems.forEach((item) => {
      if (item.titleLogo) {
        const img = new window.Image();
        img.src = item.titleLogo;
        img.onload = () => {
          preloadedHeroLogos.add(item.titleLogo!);
        };
      }
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const candidates = isMobile
        ? buildHeroCardImageCandidates(
            {
              heroBackdrop: item.heroBackdrop,
              thumbUrl: item.thumb_url,
              posterUrl: item.poster_url,
            },
            "poster",
          )
        : buildHeroImageCandidates({
            heroBackdrop: item.heroBackdrop,
            thumbUrl: item.thumb_url,
            posterUrl: item.poster_url,
          });
      candidates.slice(0, 1).forEach((url) => {
        const img = new window.Image();
        img.src = isMobile ? getMobileHeroBackdrop(url) : url;
        img.onload = () => {
          preloadedHeroBackdrops.add(url);
        };
      });
    });
  }, [current, featured]);

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
    if (featured.length <= 1 || reduceMotion || !autoRotateEnabled) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % featured.length);
    }, HERO_ROTATION_MS);
    return () => clearInterval(timer);
  }, [autoRotateEnabled, featured.length, reduceMotion]);

  const [fanCardSlugs, setFanCardSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (!featured.length) return;
    setFanCardSlugs((existing) => {
      const stillValid =
        existing.length === Math.min(3, featured.length) &&
        existing.every((slug) => featured.some((film) => film.slug === slug));
      if (stillValid) return existing;
      return shuffled(featured)
        .slice(0, 3)
        .map((film) => film.slug);
    });
  }, [featured]);

  const fanCards = useMemo(
    () =>
      fanCardSlugs
        .map((slug) => featured.find((film) => film.slug === slug))
        .filter((film): film is HeroFilm => Boolean(film)),
    [fanCardSlugs, featured],
  );

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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_34%,rgba(57,64,77,0.3),transparent_44%),linear-gradient(135deg,#101318_0%,#171b22_52%,#101216_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_24%,rgba(10,12,16,0.54)_70%,rgba(10,12,16,0.94)_100%),linear-gradient(to_top,#14181c_0%,rgba(20,24,28,0.78)_28%,transparent_62%),linear-gradient(to_bottom,rgba(10,12,16,0.76)_0%,transparent_30%)]" />

        <div
          aria-hidden="true"
          className="absolute left-6 top-1/2 hidden h-[300px] w-[420px] -translate-y-1/2 xl:block 2xl:left-14"
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="absolute left-0 top-0 aspect-[2/3] w-[172px] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.055] shadow-2xl motion-safe:animate-pulse motion-reduce:animate-none"
              style={{
                transform: `translate(${index * 105}px, ${index * 18}px) scale(${1 - index * 0.06})`,
                zIndex: 30 - index * 10,
                opacity: 1 - index * 0.16,
              }}
            >
              <div className="absolute inset-x-3 bottom-4 space-y-2">
                <div className="h-3 w-4/5 rounded-full bg-white/[0.11]" />
                <div className="h-2.5 w-2/5 rounded-full bg-white/[0.07]" />
              </div>
            </div>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-end px-4 pb-8 text-center sm:pb-18 md:pb-20"
        >
          <div className="flex w-full max-w-2xl flex-col items-center gap-3 motion-safe:animate-pulse motion-reduce:animate-none sm:gap-4">
            <div className="h-6 w-36 rounded-full bg-white/[0.09] sm:w-44" />
            <div className="h-16 w-[min(82vw,30rem)] rounded-2xl bg-white/[0.08] sm:h-24 sm:w-[min(64vw,36rem)]" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-14 rounded-full bg-white/[0.1]" />
              <div className="h-6 w-16 rounded-full bg-white/[0.075]" />
              <div className="h-6 w-24 rounded-full bg-white/[0.075]" />
            </div>
            <div className="h-3.5 w-[min(78vw,25rem)] rounded-full bg-white/[0.075]" />
            <div className="hidden h-3 w-[min(72vw,31rem)] rounded-full bg-white/[0.055] sm:block" />
            <div className="flex items-center gap-2 pt-1 sm:gap-3">
              <div className="h-10 w-28 rounded-full bg-white/[0.13] sm:h-11 sm:w-36" />
              <div className="h-10 w-24 rounded-full bg-white/[0.075] sm:h-11 sm:w-28" />
              <div className="h-10 w-10 rounded-full bg-white/[0.075] sm:h-11 sm:w-11" />
            </div>
            <div className="mt-1 flex items-center gap-2 sm:hidden">
              <div className="h-8 w-8 rounded-full bg-white/[0.065]" />
              <div className="h-8 w-28 rounded-full bg-white/[0.065]" />
              <div className="h-8 w-8 rounded-full bg-white/[0.065]" />
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-6 right-4 hidden flex-col items-end gap-2 motion-safe:animate-pulse motion-reduce:animate-none sm:right-8 sm:flex md:right-12"
        >
          <div className="h-7 w-28 rounded-full bg-white/[0.065]" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="aspect-video w-20 rounded-lg border border-white/[0.06] bg-white/[0.055] sm:w-24"
              />
            ))}
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
      className="font-cinema relative min-h-[100dvh] w-full overflow-hidden bg-[#141414] transform-gpu contain-paint"
    >
      <TrailerModal
        film={trailerModalFilm}
        isOpen={!!trailerModalFilm}
        onClose={() => setTrailerModalFilm(null)}
        presentation="hero"
      />

      {/* Direct CDN Preloaded Backdrop Layers (700ms GPU Opacity Crossfade) */}
      <div className="absolute inset-0 z-0 w-full h-full">
        {featured.map((item, idx) => {
          const isActive = idx === current;
          const visualReady = Boolean(visualReadiness[item.slug]?.backdrop);
          const shouldLoadBackdrop = isActive;

          return (
            <div
              key={`backdrop-${item.slug || idx}-${idx}`}
              className={cn(
                "absolute inset-0 w-full h-full transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-[opacity,transform] pointer-events-none",
                isActive
                  ? "opacity-100 scale-100 z-10"
                  : "opacity-0 scale-[1.02] z-0",
              )}
            >
              {shouldLoadBackdrop && (
                <HeroBackdropImage
                  film={item as HeroFilm}
                  isActive={isActive}
                  revealed={visualReady}
                  onReady={() => markVisualReady(item.slug, "backdrop")}
                />
              )}
            </div>
          );
        })}
        <HeroTrailerLayer
          film={film}
          enabled={Boolean(
            visualReadiness[film.slug]?.backdrop &&
            visualReadiness[film.slug]?.title &&
            !reduceMotion,
          )}
        />
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

      {/* 🎴 3-Card Cascading Cinema Deck (Left side desktop) */}
      <div
        className={`${cardFont.className} absolute left-6 top-1/2 z-30 hidden w-[420px] h-[300px] -translate-y-1/2 xl:block 2xl:left-14 pointer-events-none`}
      >
        <div className="relative w-full h-full pointer-events-auto">
          {showDesktopFanCards &&
            fanCards.map((cardFilm, index) => {
              const fanConfigs = [
                {
                  x: 0,
                  y: 0,
                  scale: 1.0,
                  brightness: 1.0,
                  zIndex: 30,
                },
                {
                  x: 105,
                  y: 18,
                  scale: 0.94,
                  brightness: 0.88,
                  zIndex: 20,
                },
                {
                  x: 210,
                  y: 36,
                  scale: 0.88,
                  brightness: 0.76,
                  zIndex: 10,
                },
              ];

              const config = fanConfigs[index] || fanConfigs[0];

              return (
                <FanCardButton
                  key={`${cardFilm.slug}-${index}`}
                  type="button"
                  aria-label={`Chuyển banner sang phim ${cardFilm.name}`}
                  $x={config.x}
                  $y={config.y}
                  $scale={config.scale}
                  $brightness={config.brightness}
                  $layer={config.zIndex}
                  $order={index}
                  $featured={index === 0}
                  onClick={() => {
                    const targetIndex = featured.findIndex(
                      (f) => f.slug === cardFilm.slug,
                    );
                    if (targetIndex !== -1) setCurrent(targetIndex);
                  }}
                >
                  <div className="aspect-[2/3] overflow-hidden bg-[#131822] relative group">
                    <HeroFanCardImage
                      film={cardFilm}
                      className="fan-card-image h-full w-full object-cover transition-transform duration-500 ease-out"
                    />

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080a0f] via-[#080a0f]/82 to-transparent px-3 pb-3 pt-10 text-left">
                      <p className="text-[11px] font-extrabold text-white leading-snug line-clamp-1">
                        {cardFilm.origin_name || cardFilm.name}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-neutral-300">
                        <span className="flex items-center gap-1 text-[#f2c14e]">
                          <Star
                            size={10}
                            fill="currentColor"
                            aria-hidden="true"
                          />
                          {cardFilm.vote_average || 8.5}
                        </span>
                        {cardFilm.year ? (
                          <span className="text-neutral-400">
                            {cardFilm.year}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <span className="fan-card-action absolute right-2.5 top-2.5 flex h-7 w-7 translate-y-1 items-center justify-center rounded-full bg-white text-[#0b0e14] opacity-0 shadow-lg transition-[opacity,transform] duration-300">
                      <Play
                        size={12}
                        fill="currentColor"
                        className="ml-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </FanCardButton>
              );
            })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-end px-4 pb-8 sm:pb-18 md:pb-20 text-center">
        <div className="max-w-2xl mx-auto w-full flex flex-col items-center space-y-3 sm:space-y-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className={`${heroSerifFont.className} flex w-full flex-col items-center space-y-2.5 sm:space-y-3.5`}
            >
              {/* 🏆 SINGLE PROMINENT SPOTLIGHT BADGE (Lý do để click) */}
              {(() => {
                const badge = getSpotlightBadge(film, current);
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-gradient-to-r ${badge.color} border shadow-lg backdrop-blur-md`}
                  >
                    {badge.label}
                  </span>
                );
              })()}

              {/* Official TMDB title artwork with an accessible text fallback. */}
              <HeroMovieTitle
                film={film}
                onReady={() => markVisualReady(film.slug, "title")}
              />

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
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[11px] font-extrabold text-neutral-200 border border-white/15">
                  {ageRating}
                </span>
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
              <div
                className={`${cardFont.className} flex items-center justify-center gap-2 sm:gap-3 pt-1`}
              >
                {hasWatched ? (
                  <Link
                    href={getWatchHref(film)}
                    className={`${cardFont.className} flex flex-col items-center justify-center bg-white hover:bg-neutral-200 text-black px-6 py-2 sm:px-7 sm:py-2.5 rounded-full transition-all duration-200 shadow-2xl hover:scale-105 active:scale-95 group min-w-[145px]`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black tracking-wide uppercase">
                      <Play size={14} className="fill-black" />
                      <span>
                        {t("home.resumeWatch", "Xem tiếp")}{" "}
                        {formatProgressTime(progressSecs)}
                      </span>
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
                    className={`${cardFont.className} flex items-center gap-1.5 sm:gap-2 bg-white hover:bg-neutral-200 text-black px-5 py-2.5 sm:px-7 sm:py-3 rounded-full text-xs font-black tracking-wide uppercase transition-all duration-200 shadow-2xl hover:scale-105 active:scale-95`}
                  >
                    <Play size={14} className="fill-black" />
                    <span>{t("home.watchNow", "Xem ngay")}</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setTrailerModalFilm(film)}
                  className={`${cardFont.className} flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/15 bg-[#181c24]/80 px-4 py-2.5 sm:px-5 sm:py-3 text-xs font-bold text-neutral-200 shadow-xl transition-all duration-200 hover:scale-105 hover:bg-white/20 hover:text-white active:scale-95 cursor-pointer`}
                >
                  <Film size={14} className="text-neutral-300" />
                  <span>{t("home.trailer", "Trailer")}</span>
                </button>

                {/* Bookmark CTA with hover tooltip */}
                <div className="relative group">
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-black/90 border border-white/20 backdrop-blur-md text-[10px] font-bold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 shadow-2xl z-40 translate-y-1 group-hover:translate-y-0">
                    {t("home.saveWatchlist", "Lưu vào tủ phim")}
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
                          t(
                            "home.savedWatchlistLocal",
                            "Đã lưu vào tủ phim (trên thiết bị này)",
                          ),
                          "success",
                        );
                        return;
                      }
                      watchlistApi
                        .add(film.slug, movieData)
                        .then(() =>
                          toast(
                            `${t("home.savedWatchlist", "Đã lưu vào tủ phim")}: ${film.name}`,
                            "success",
                          ),
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

              {/* Mobile previous / pagination / next controls */}
              {featured.length > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2 sm:hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrent(
                        (index) =>
                          (index - 1 + featured.length) % featured.length,
                      )
                    }
                    aria-label="Banner trước"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/80 backdrop-blur-md transition-colors hover:bg-white/15 hover:text-white active:scale-95"
                  >
                    <ChevronLeft size={17} aria-hidden="true" />
                  </button>

                  <div className="flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 backdrop-blur-md">
                    {featured.slice(0, 6).map((_, i) => (
                      <button
                        key={`mobile-dot-${i}`}
                        type="button"
                        onClick={() => setCurrent(i)}
                        aria-label={`Chuyển đến phim ${i + 1}`}
                        aria-current={i === current ? "true" : undefined}
                        className={cn(
                          "h-1.5 rounded-full transition-[width,background-color] duration-300",
                          i === current
                            ? "w-7 bg-white"
                            : "w-1.5 bg-white/40 hover:bg-white/70",
                        )}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrent((index) => (index + 1) % featured.length)
                    }
                    aria-label="Banner tiếp theo"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/80 backdrop-blur-md transition-colors hover:bg-white/15 hover:text-white active:scale-95"
                  >
                    <ChevronRight size={17} aria-hidden="true" />
                  </button>
                </div>
              )}
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
            {String(current + 1).padStart(2, "0")}{" "}
            <span className="text-neutral-500 font-normal">/</span>{" "}
            {String(featured.length).padStart(2, "0")}
          </span>

          {/* Thin Progress Bar indicating 10s auto rotation */}
          <div className="w-14 sm:w-16 h-1 bg-white/20 rounded-full overflow-hidden relative">
            <motion.div
              key={current}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: HERO_ROTATION_MS / 1000, ease: "linear" }}
              className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            />
          </div>
        </div>

        {/* Thumbnails Row with Hover Preview (Scrollbar Completely Hidden) */}
        {showDesktopFanCards && (
          <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
            {featured.slice(0, 6).map((item, i) => {
              const cardImg =
                item.thumb_url ||
                item.poster_url ||
                (item as any).heroBackdrop ||
                "";
              const isActive = i === current;

              return (
                <div
                  key={`hero-thumb-${item.slug || i}-${i}`}
                  className="relative group"
                >
                  {/* Floating Preview Tooltip on Hover */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-black/90 border border-white/20 backdrop-blur-md text-[11px] font-bold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 shadow-2xl z-40 translate-y-1 group-hover:translate-y-0 text-center">
                    <p className="line-clamp-1 max-w-[150px]">
                      {item.origin_name || item.name}
                    </p>
                    {item.year && (
                      <span className="text-[9px] text-neutral-400 font-mono font-normal">
                        ({item.year})
                      </span>
                    )}
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
                    <HeroThumbnailImage
                      film={item as HeroFilm}
                      isActive={isActive}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Official Trailer Modal */}
      {trailerModalFilm && (
        <TrailerModal
          isOpen={Boolean(trailerModalFilm)}
          film={trailerModalFilm}
          onClose={() => setTrailerModalFilm(null)}
        />
      )}
    </section>
  );
}
