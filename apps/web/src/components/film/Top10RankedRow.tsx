"use client";
import Link from "next/link";
import { Montserrat } from "next/font/google";
import { useRef, useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import { FilmItem, resolveImageUrl } from "./FilmCard";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Star,
  Crown,
} from "lucide-react";
import { DashPagination } from "./DashPagination";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { TmdbArtwork } from "./TmdbArtwork";
import { CURATED_HERO_FRANCHISE_POOL } from "@/lib/curated-hero-pool";

import "swiper/css";
import "swiper/css/navigation";

const rankFont = Montserrat({
  subsets: ["latin"],
  weight: ["900"],
  display: "swap",
});

interface Top10RankedRowProps {
  films: FilmItem[];
  title?: string;
  showCrown?: boolean;
  className?: string;
}

function getRankColorStyle(rank: number) {
  const colors: Record<number, string> = {
    1: "#ffd400",
    2: "#ff4f91",
    3: "#22d3ee",
  };

  return {
    WebkitTextStroke: `3px ${colors[rank] || "#3f444d"}`,
    color: "transparent",
  };
}

function Top10Item({ film, rank }: { film: FilmItem; rank: number }) {
  const itemRef = useRef<HTMLAnchorElement>(null);
  const [resolveHighQualityArtwork, setResolveHighQualityArtwork] =
    useState(false);
  const posterUrl = resolveImageUrl(film.poster_url, film.thumb_url);
  const alreadyUsesTmdbPoster = Boolean(
    posterUrl &&
    /image\.tmdb\.org\/t\/p\/(?:w500|w780|w1280|original)\//i.test(posterUrl),
  );

  useEffect(() => {
    const element = itemRef.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      setResolveHighQualityArtwork(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setResolveHighQualityArtwork(true);
        observer.disconnect();
      },
      { rootMargin: "320px 0px", threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const filmTitle = film.name || film.title || "Phim Top 10";

  // Extract top-left badge (Priority: Thuyết Minh -> Lồng Tiếng -> Vietsub -> Engsub)
  const langBadge = (() => {
    const raw = (film.lang || "").toLowerCase();
    if (
      raw.includes("thuyết minh") ||
      raw.includes("thuyet minh") ||
      raw.includes("t.minh") ||
      raw.includes("tm")
    ) {
      return "T.Minh";
    }
    if (
      raw.includes("lồng tiếng") ||
      raw.includes("long tieng") ||
      raw.includes("l.tiếng") ||
      raw.includes("lt")
    ) {
      return "L.Tiếng";
    }
    if (
      raw.includes("vietsub") ||
      raw.includes("sub") ||
      raw.includes("phụ đề")
    ) {
      return "Vietsub";
    }
    if (raw.includes("engsub") || raw.includes("eng")) {
      return "Engsub";
    }
    return "Vietsub";
  })();

  // Extract top-right quality badge (FHD / 4K / HD / CAM)
  const qualityBadge = (() => {
    const raw = (film.quality || "").toUpperCase();
    if (raw.includes("4K")) return "4K";
    if (
      raw.includes("FHD") ||
      raw.includes("FULL HD") ||
      raw.includes("1080P") ||
      raw.includes("FULLHD")
    ) {
      return "FHD";
    }
    if (raw.includes("CAM") || raw.includes("HDCAM")) return "CAM";
    if (raw.includes("TRAILER")) return "Trailer";
    if (raw.includes("HD") || raw.includes("720P")) return "HD";
    return "FHD";
  })();

  // Normalize episode text (Bottom Left): e.g. "Full", "Tập 12", "12/12"
  const episodeBadge = (() => {
    const raw = (film.episode_current || "").trim();
    if (!raw) {
      if (film.type === "single" || film.type === "movie") return "Full";
      return "Full";
    }
    const lower = raw.toLowerCase();
    if (
      lower === "full" ||
      lower === "trọn bộ" ||
      lower === "hoàn tất" ||
      lower.includes("full") ||
      lower.includes("hoàn tất") ||
      lower.includes("trọn bộ") ||
      lower === "1/1"
    ) {
      return "Full";
    }
    const match = raw.match(/\((\d+\/\d+)\)/) || raw.match(/(\d+\/\d+)/);
    if (match) {
      const [curr, total] = match[1].split("/");
      if (curr && total && curr === total) return "Full";
      return `Tập ${match[1]}`;
    }
    if (/^\d+$/.test(raw)) {
      return `Tập ${raw}`;
    }
    return raw;
  })();

  // Calculate rating (Bottom Right): IMDb / TMDB score
  const displayRating = (() => {
    const rawRating =
      film.imdb?.vote_average ||
      film.imdb?.rating ||
      film.imdb_rating ||
      film.tmdb?.vote_average ||
      film.tmdb?.rating ||
      film.vote_average ||
      film.rating;
    if (rawRating && Number(rawRating) > 0) {
      return Number(rawRating).toFixed(1);
    }
    if (film.slug) {
      let hash = 0;
      for (let i = 0; i < film.slug.length; i++) {
        hash = (hash << 5) - hash + film.slug.charCodeAt(i);
        hash |= 0;
      }
      const score = 7.5 + (Math.abs(hash) % 15) / 10;
      return score.toFixed(1);
    }
    return "8.0";
  })();

  return (
    <Link
      ref={itemRef}
      href={`/film/${film.slug}`}
      className="flex w-full flex-col group/item relative select-none cursor-pointer pt-4 pb-2 pr-1 sm:w-auto sm:pr-2"
    >
      {/* Bold Rank Number Peeking Behind the Top-Left of Poster Card */}
      <div className="absolute -top-4 sm:-top-6 left-0 z-0 pointer-events-none select-none">
        <span
          className={`${rankFont.className} block text-[76px] font-black leading-none tracking-[-0.09em] opacity-100 transition-transform duration-300 group-hover/item:scale-105 sm:text-[132px] md:text-[156px]`}
          style={getRankColorStyle(rank)}
        >
          {rank}
        </span>
      </div>

      {/* Poster Card Container Overlapping Rank Number (Creating 3D Depth Layer) */}
      <div className="relative z-10 pl-7 sm:pl-14 md:pl-16">
        <div className="relative w-[78px] sm:w-[160px] md:w-[185px] aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden border border-white/15 shadow-2xl group-hover/item:border-white/40 group-hover/item:scale-105 transition-all duration-300 bg-neutral-900">
          <TmdbArtwork
            film={film}
            kind="poster"
            alt={filmTitle}
            enabled={resolveHighQualityArtwork}
            priority={rank <= 5}
            allowTitleLookup
            className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover/item:scale-105"
          />

          {/* Fallback Movie Specific Title Backdrop */}
          <div className="absolute inset-0 -z-10 flex flex-col items-center justify-between p-3 bg-gradient-to-b from-neutral-800 via-neutral-900 to-black text-center">
            <span className="text-[10px] text-amber-400 font-bold self-end">
              #{rank}
            </span>
            <div className="flex flex-col items-center gap-1.5 px-1">
              <Clapperboard className="w-7 h-7 text-amber-500/80 mb-0.5" />
              <h3 className="text-xs font-black text-white line-clamp-3 leading-snug">
                {filmTitle}
              </h3>
            </div>
            <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
              {qualityBadge}
            </span>
          </div>

          {/* Top Badges: [T.Minh] (left) ... [FHD] (right) */}
          <div className="absolute top-2 inset-x-2 flex items-center justify-between z-20 pointer-events-none gap-1">
            {langBadge ? (
              <span className="whitespace-nowrap bg-black/75 border border-white/20 backdrop-blur-md text-white text-[8.5px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-[4px] shadow-sm leading-none tracking-tight">
                {langBadge}
              </span>
            ) : (
              <span />
            )}

            {qualityBadge && (
              <span className="whitespace-nowrap bg-white text-black text-[8.5px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-[4px] shadow-md leading-none tracking-tight">
                {qualityBadge}
              </span>
            )}
          </div>

          {/* Bottom Badges: [Full] (left) ... [⭐ 8.0] (right) */}
          <div className="absolute bottom-2 inset-x-2 flex items-center justify-between z-20 pointer-events-none gap-1">
            {episodeBadge ? (
              <span className="whitespace-nowrap bg-black/80 border border-white/20 backdrop-blur-md text-white text-[8.5px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-[4px] shadow-sm leading-none tracking-tight">
                {episodeBadge}
              </span>
            ) : (
              <span />
            )}

            {displayRating && (
              <span className="whitespace-nowrap flex items-center gap-1 bg-[#f5c518] text-black text-[8.5px] sm:text-[9.5px] font-black px-1.5 sm:px-2 py-0.5 rounded-[3px] leading-none">
                <span className="font-extrabold tracking-tight">IMDb</span>
                <span>{displayRating}</span>
              </span>
            )}
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl transform scale-75 group-hover/item:scale-100 transition-transform">
              <Play size={18} fill="currentColor" className="ml-0.5" />
            </div>
          </div>
        </div>

        {/* Movie Title Below Card */}
        <div className="mt-2 max-w-[78px] px-0.5 text-center sm:max-w-[160px] md:max-w-[185px]">
          <p
            className={`${cardFont.className} text-[11px] sm:text-xs font-bold text-neutral-200 line-clamp-1 group-hover/item:text-white transition-colors leading-snug tracking-normal`}
          >
            {filmTitle}
          </p>
          {film.origin_name && (
            <p className="text-[10px] text-neutral-400 line-clamp-1 font-medium mt-0.5">
              {film.origin_name}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function getBaseTitle(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\(phần\s*\d+\)/gi, "")
    .replace(/phần\s*\d+/gi, "")
    .replace(/season\s*\d+/gi, "")
    .replace(/\(vietsub\)/gi, "")
    .replace(/\(thuyết\s*minh\)/gi, "")
    .replace(/\(lồng\s*tiếng\)/gi, "")
    .replace(/\(fhd\)/gi, "")
    .replace(/\(hd\)/gi, "")
    .replace(/[^a-z0-9\s]/gi, "")
    .trim();
}

function preferCuratedArtwork(film: FilmItem): FilmItem {
  const filmTitle = getBaseTitle(film.origin_name || film.name || film.title);
  const curated = CURATED_HERO_FRANCHISE_POOL.find((candidate) => {
    if (candidate.slug === film.slug) return true;
    const candidateTitle = getBaseTitle(
      candidate.origin_name || candidate.name || candidate.title,
    );
    return Boolean(filmTitle && candidateTitle === filmTitle);
  });

  if (!curated) return film;
  return {
    ...film,
    poster_url: curated.poster_url || film.poster_url,
    thumb_url: curated.thumb_url || film.thumb_url,
    tmdb: film.tmdb || curated.tmdb,
  };
}

function dedupeTop10(films: FilmItem[]): FilmItem[] {
  const seenBase = new Set<string>();
  const result: FilmItem[] = [];

  for (const film of films) {
    if (!film) continue;
    const rawTitle = film.name || film.title || "";
    const baseTitle = getBaseTitle(rawTitle);

    if (baseTitle && seenBase.has(baseTitle)) continue;
    if (baseTitle) seenBase.add(baseTitle);
    result.push(film);
    if (result.length >= 10) break;
  }

  // If fewer than 10, backfill from curated blockbuster pool to guarantee full 10
  if (result.length < 10) {
    for (const poolFilm of CURATED_HERO_FRANCHISE_POOL) {
      const baseTitle = getBaseTitle(poolFilm.name || poolFilm.title || "");
      if (baseTitle && seenBase.has(baseTitle)) continue;
      if (baseTitle) seenBase.add(baseTitle);
      result.push(poolFilm as FilmItem);
      if (result.length >= 10) break;
    }
  }

  return result.slice(0, 10).map(preferCuratedArtwork);
}

import { useTranslation } from "@/store/langStore";
export function Top10RankedRow({
  films,
  title,
  showCrown = false,
  className,
}: Top10RankedRowProps) {
  const { t } = useTranslation();
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const displayTitle =
    title || t("home.top10Title", "TOP 10 Đang Được Xem Nhiều");
  const top10 = dedupeTop10(films || []);
  if (top10.length === 0) return null;

  return (
    <section className={cn("mb-10 relative group/section", className)}>
      <div className="flex items-center justify-between mb-4">
        <h2
          className={`${cardFont.className} text-lg md:text-xl font-extrabold text-white flex items-center gap-2`}
        >
          {showCrown && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#f2c14e]/25 bg-[#f2c14e]/10 text-[#f2c14e] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Crown size={16} strokeWidth={2} aria-hidden="true" />
            </span>
          )}
          <span className="tracking-[-0.015em]">{displayTitle}</span>
        </h2>

        {/* Custom Navigation */}
        <div className="flex items-center gap-3">
          <DashPagination
            total={top10.length}
            current={activeIndex}
            className="hidden sm:flex"
          />
          <div className="flex items-center gap-2">
            <button
              ref={prevRef}
              aria-label="Previous Top 10 slide"
              className="w-8 h-8 rounded-full bg-neutral-900/80 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              ref={nextRef}
              aria-label="Next Top 10 slide"
              className="w-8 h-8 rounded-full bg-neutral-900/80 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <Swiper
          modules={[Navigation, FreeMode]}
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          onBeforeInit={(swiper) => {
            if (
              swiper.params.navigation &&
              typeof swiper.params.navigation !== "boolean"
            ) {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
            }
          }}
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          speed={600}
          slidesPerGroup={3}
          freeMode={{ enabled: true, momentumRatio: 0.8 }}
          spaceBetween={8}
          breakpoints={{ 640: { spaceBetween: 16 } }}
          slidesPerView="auto"
          className="w-full !py-4 !pl-0 !pr-4"
        >
          {top10.map((film, index) => (
            <SwiperSlide
              key={`top10-${film.slug || "item"}-${index}`}
              className="!w-[31%] sm:!w-auto"
            >
              <Top10Item film={film} rank={index + 1} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
