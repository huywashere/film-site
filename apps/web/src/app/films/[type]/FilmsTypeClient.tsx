"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import NextImage from "next/image";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmItem,
  FilmCardSkeleton,
} from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { cardFont } from "@/lib/fonts";
import { DeferredSection } from "@/components/layout/DeferredSection";
import { useDeferredContent } from "@/hooks/useDeferredContent";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  CURATED_ANIME_HERO_POOL,
  CURATED_SONG_NGU_AI_HERO_POOL,
  AsianHeroItem,
  buildAsianHeroImageCandidates,
} from "@/lib/curated-asian-hero";
import { vicdnApi } from "@/lib/api";
import { useTranslation } from "@/store/langStore";
import { preloadMovieLogo } from "@/lib/movie-logo-cache";
import { useReliableNavigation } from "@/hooks/useReliableNavigation";
import {
  Play,
  Info,
  ChevronRight,
  ChevronLeft,
  Flame,
  Star,
  Film,
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

const TYPE_LABELS: Record<string, string> = {
  latest: "Phim Mới",
  "phim-moi": "Phim Mới",
  series: "Phim Bộ",
  "phim-bo": "Phim Bộ",
  single: "Phim Lẻ",
  "phim-le": "Phim Lẻ",
  shows: "Shows",
  tvshows: "Shows",
  "tv-shows": "Shows",
  anime: "Hoạt Hình & Anime",
  "hoat-hinh": "Hoạt Hình & Anime",
  vietsub: "Phim Vietsub",
  "phim-vietsub": "Phim Vietsub",
  "thuyet-minh": "Phim Thuyết Minh & Song Ngữ AI",
  thuyetminh: "Phim Thuyết Minh & Song Ngữ AI",
  "phim-thuyet-minh": "Phim Thuyết Minh & Song Ngữ AI",
  "thuyet-minh-ai": "Phim Thuyết Minh Song Ngữ AI",
  "thuyetminhai": "Phim Thuyết Minh Song Ngữ AI",
  "song-ngu-ai": "Phim Thuyết Minh Song Ngữ AI",
  "song-ngu": "Phim Song Ngữ",
  songngu: "Phim Song Ngữ",
  "phim-song-ngu": "Phim Song Ngữ",
  "long-tieng": "Phim Lồng Tiếng",
  longtieng: "Phim Lồng Tiếng",
  "phim-long-tieng": "Phim Lồng Tiếng",
  "dang-chieu": "Phim Bộ Đang Chiếu",
  ongoing: "Phim Bộ Đang Chiếu",
  "phim-bo-dang-chieu": "Phim Bộ Đang Chiếu",
  "hoan-thanh": "Phim Bộ Đã Hoàn Thành",
  completed: "Phim Bộ Đã Hoàn Thành",
  "phim-bo-hoan-thanh": "Phim Bộ Đã Hoàn Thành",
  subteam: "Subteam",
  "chieu-rap": "Phim Chiếu Rạp",
  chieurap: "Phim Chiếu Rạp",
  "phim-chieu-rap": "Phim Chiếu Rạp",
};

const TYPE_APIS: Record<string, (page: number) => Promise<any>> = {
  latest: (p) => movieApi.getLatest(p),
  "phim-moi": (p) => movieApi.getLatest(p),
  series: (p) => movieApi.getSeries(p),
  "phim-bo": (p) => movieApi.getSeries(p),
  single: (p) => movieApi.getSingle(p),
  "phim-le": (p) => movieApi.getSingle(p),
  shows: (p) => movieApi.getTvShows(p),
  tvshows: (p) => movieApi.getTvShows(p),
  "tv-shows": (p) => movieApi.getTvShows(p),
  anime: (p) => movieApi.getAnime(p),
  "hoat-hinh": (p) => movieApi.getAnime(p),
  vietsub: (p) => movieApi.getVietsub(p),
  "phim-vietsub": (p) => movieApi.getVietsub(p),
  "thuyet-minh": (p) => movieApi.getThuyetMinh(p),
  thuyetminh: (p) => movieApi.getThuyetMinh(p),
  "phim-thuyet-minh": (p) => movieApi.getThuyetMinh(p),
  "thuyet-minh-ai": (p) => movieApi.getThuyetMinh(p),
  "thuyetminhai": (p) => movieApi.getThuyetMinh(p),
  "song-ngu-ai": (p) => movieApi.getThuyetMinh(p),
  "song-ngu": (p) => movieApi.getThuyetMinh(p),
  songngu: (p) => movieApi.getThuyetMinh(p),
  "phim-song-ngu": (p) => movieApi.getThuyetMinh(p),
  "long-tieng": (p) => movieApi.getLongTieng(p),
  longtieng: (p) => movieApi.getLongTieng(p),
  "phim-long-tieng": (p) => movieApi.getLongTieng(p),
  "dang-chieu": (p) => movieApi.getDangChieu(p),
  ongoing: (p) => movieApi.getDangChieu(p),
  "phim-bo-dang-chieu": (p) => movieApi.getDangChieu(p),
  "hoan-thanh": (p) => movieApi.getHoanThanh(p),
  completed: (p) => movieApi.getHoanThanh(p),
  "phim-bo-hoan-thanh": (p) => movieApi.getHoanThanh(p),
  subteam: (p) => movieApi.getSubteam(p),
  "chieu-rap": (p) => movieApi.getChieuRap(p),
  chieurap: (p) => movieApi.getChieuRap(p),
  "phim-chieu-rap": (p) => movieApi.getChieuRap(p),
};

function getBaseTitle(name: string): string {
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

function shuffleArray<T>(array: T[], seed: number): T[] {
  if (!array || !array.length) return [];
  const arr = [...array];
  let m = arr.length;
  let t: T;
  let i: number;
  let s = seed * 10000;

  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  while (m) {
    i = Math.floor(random() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}

function dedupeFilmsList(films: FilmItem[]): FilmItem[] {
  const seen = new Set<string>();
  return films.filter((f) => {
    const key = (f.slug || f._id || (f as any).id || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ResilientAnimeHeroBackdrop({
  item,
  isActive = true,
}: {
  item: AsianHeroItem;
  isActive?: boolean;
}) {
  const mobileCandidates = useMemo(() => {
    const directList = [item.poster_url, item.thumb_url].filter(Boolean) as string[];
    const all: string[] = [];
    for (const url of directList) {
      for (const cand of buildAsianHeroImageCandidates(url)) {
        if (!all.includes(cand)) all.push(cand);
      }
    }
    return all;
  }, [item.poster_url, item.thumb_url]);

  const desktopCandidates = useMemo(() => {
    const directList = [item.thumb_url, item.poster_url].filter(Boolean) as string[];
    const all: string[] = [];
    for (const url of directList) {
      for (const cand of buildAsianHeroImageCandidates(url)) {
        if (!all.includes(cand)) all.push(cand);
      }
    }
    return all;
  }, [item.thumb_url, item.poster_url]);

  const [mobileIdx, setMobileIdx] = useState(0);
  const [desktopIdx, setDesktopIdx] = useState(0);

  useEffect(() => {
    setMobileIdx(0);
    setDesktopIdx(0);
  }, [item.slug, item.thumb_url, item.poster_url]);

  const mobileSrc = mobileCandidates[mobileIdx] || item.poster_url || item.thumb_url || "";
  const desktopSrc = desktopCandidates[desktopIdx] || item.thumb_url || item.poster_url || "";

  return (
    <div className="w-full h-full relative overflow-hidden">
      <picture>
        <source media="(max-width: 767px)" srcSet={mobileSrc} />
        <img
        key={`${item.slug}-desktop-${desktopIdx}`}
        src={desktopSrc}
        alt={item.name}
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
        fetchPriority={isActive ? "high" : "auto"}
        onError={() => {
          if (window.matchMedia("(max-width: 767px)").matches) {
            if (mobileIdx < mobileCandidates.length - 1) {
              setMobileIdx((prev) => prev + 1);
            }
          } else if (desktopIdx < desktopCandidates.length - 1) {
            setDesktopIdx((prev) => prev + 1);
          }
        }}
        className="block w-full h-full object-cover object-center lg:object-[center_25%] brightness-[0.88] contrast-[1.06]"
        />
      </picture>
    </div>
  );
}

function ResilientAnimeHeroLogo({
  item,
}: {
  item: AsianHeroItem;
}) {
  const logoCandidates = useMemo(() => {
    return buildAsianHeroImageCandidates(item.logoUrl);
  }, [item.logoUrl]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  useEffect(() => {
    setCandidateIdx(0);
    setHasFailedAll(false);
  }, [item.slug, item.logoUrl]);

  const currentLogoSrc = logoCandidates[candidateIdx];

  if (!currentLogoSrc || hasFailedAll) {
    return (
      <h1
        data-curated-hero-text={item.slug}
        className="text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-wide leading-tight drop-shadow-[0_8px_20px_rgba(0,0,0,0.95)]"
      >
        {item.calligraphyTitle || item.name}
      </h1>
    );
  }

  return (
    <div className="relative flex h-14 w-40 items-center sm:h-24 sm:w-72 md:h-32 md:w-80 lg:h-36 lg:w-[460px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-curated-hero-logo={item.slug}
        key={`${item.slug}-logo-${candidateIdx}`}
        src={currentLogoSrc}
        alt={item.name}
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (candidateIdx < logoCandidates.length - 1) {
            setCandidateIdx((prev) => prev + 1);
          } else {
            setHasFailedAll(true);
          }
        }}
        className="max-h-full max-w-full object-contain object-left drop-shadow-[0_12px_28px_rgba(0,0,0,0.95)]"
      />
    </div>
  );
}

function AnimeCuratedHeroBanner({
  pool,
  themeLabel = "Anime & Hoạt Hình",
}: {
  pool: AsianHeroItem[];
  themeLabel?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const curatedList = pool || [];

  // Warm just the current and next artwork via edge proxy
  useEffect(() => {
    if (typeof window !== "undefined" && pool?.length) {
      const nextIndex = (currentIndex + 1) % pool.length;
      pool.forEach((item) => {
        const logoCand = buildAsianHeroImageCandidates(item.logoUrl)[0];
        if (logoCand) void preloadMovieLogo(logoCand);
      });
      [pool[currentIndex], pool[nextIndex]].filter(Boolean).forEach((item) => {
        if (item.thumb_url) {
          const cands = buildAsianHeroImageCandidates(item.thumb_url);
          if (cands[0]) {
            const img = new Image();
            img.referrerPolicy = "no-referrer";
            img.src = cands[0];
          }
        }
      });
    }
  }, [currentIndex, pool]);

  // Smooth auto slide every 6.5 seconds
  useEffect(() => {
    if (curatedList.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % curatedList.length);
    }, 6500);

    return () => clearInterval(interval);
  }, [curatedList.length, isPaused]);

  const currentItem = curatedList[currentIndex] || curatedList[0];

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % curatedList.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex(
      (prev) => (prev - 1 + curatedList.length) % curatedList.length,
    );
  };

  const handleGoTo = (idx: number) => {
    if (idx === currentIndex) return;
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative h-[68svh] min-h-[500px] max-h-[620px] w-full select-none overflow-hidden bg-[#141414] sm:h-[96vh] sm:min-h-[760px] sm:max-h-[1080px] lg:h-[100vh] lg:min-h-[840px]"
    >
      {/* ── Layer 1: GPU-Accelerated Pre-rendered Backdrop Stack (Responsive Mobile Poster vs Desktop 4K Backdrop) ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {[currentItem].filter(Boolean).map((item) => {
          const isActive = true;

          return (
            <div
              key={item.slug || item._id || currentIndex}
              style={{
                willChange: "opacity, transform",
                transition: "opacity 900ms cubic-bezier(0.16, 1, 0.3, 1), transform 1200ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              className={cn(
                "absolute inset-0 w-full h-full pointer-events-none",
                isActive
                  ? "opacity-100 scale-100 z-10"
                  : "opacity-0 scale-[1.04] z-0",
              )}
            >
              <ResilientAnimeHeroBackdrop item={item} isActive={isActive} />
            </div>
          );
        })}
      </div>

      {/* ── Layer 2: Cinematic Multi-layer Gradient Overlays for Vignette & Bottom Blending ── */}
      {/* Desktop 3-direction cinematic vignette */}
      <div
        className="hidden sm:block absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, rgba(16,16,16,0.96) 0%, rgba(16,16,16,0.72) 36%, rgba(16,16,16,0.15) 68%, transparent 100%),
            linear-gradient(to top, #141414 0%, rgba(20,20,20,0.85) 28%, transparent 55%),
            linear-gradient(to bottom, rgba(16,16,16,0.65) 0%, transparent 25%)
          `,
        }}
      />
      {/* Mobile-optimized bottom vignette: maximizes artwork clarity while keeping text readable */}
      <div
        className="block sm:hidden absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to top, #141414 0%, rgba(20,20,20,0.92) 36%, rgba(20,20,20,0.4) 65%, transparent 100%),
            linear-gradient(to bottom, rgba(16,16,16,0.6) 0%, transparent 25%)
          `,
        }}
      />

      {/* ── Layer 3: Responsive Content Overlay (Bottom-aligned on mobile, Center-aligned on desktop) ── */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end px-4 pb-14 sm:justify-center sm:px-14 sm:pb-20 md:px-20 lg:px-24 lg:pb-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentItem.slug || currentItem._id || currentIndex}
            initial={{
              opacity: 0,
              y: direction > 0 ? 14 : -14,
              filter: "blur(2px)",
            }}
            animate={{
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
            }}
            exit={{
              opacity: 0,
              y: direction > 0 ? -12 : 12,
              filter: "blur(2px)",
              position: "absolute",
            }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="max-w-2xl space-y-2.5 sm:space-y-4 lg:space-y-5 pt-0 sm:pt-8"
          >
            {/* Official Studio Title Logo PNG with Multi-CDN Resilient Fallback */}
            <ResilientAnimeHeroLogo key={currentItem.slug} item={currentItem} />

            {/* Subtitle */}
            <p className="text-[11px] sm:text-sm text-neutral-300 font-semibold italic -mt-0.5 sm:-mt-2 drop-shadow">
              {currentItem.name} {currentItem.origin_name ? `(${currentItem.origin_name})` : ""}
            </p>

            {/* Metadata Row: Year | Anime & Hoạt Hình | Total Episodes */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-[10px] sm:text-xs font-semibold text-neutral-200">
              {currentItem.year && (
                <span className="text-white font-bold">{currentItem.year}</span>
              )}
              <span className="text-neutral-400">|</span>
              <span className="text-cyan-400 font-bold">{themeLabel}</span>
              {currentItem.totalEpisodesText && (
                <>
                  <span className="text-neutral-400">|</span>
                  <span className="text-neutral-300">{currentItem.totalEpisodesText}</span>
                </>
              )}
              {currentItem.vote_average && (
                <>
                  <span className="text-neutral-400">|</span>
                  <span className="text-amber-400 font-bold">★ {currentItem.vote_average}</span>
                </>
              )}
            </div>

            {/* Genre Tags */}
            {currentItem.genres && currentItem.genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5">
                {currentItem.genres.slice(0, 3).map((genre) => (
                  <span
                    key={genre}
                    className="px-2 sm:px-3 py-0.5 sm:py-1 rounded bg-neutral-800/90 text-neutral-200 text-[10px] sm:text-xs font-semibold border border-white/10"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Description (Visible on sm screens and above) */}
            <p className="hidden sm:block text-xs sm:text-sm text-neutral-300 font-normal line-clamp-2 sm:line-clamp-3 leading-relaxed drop-shadow max-w-lg pt-1">
              {currentItem.content}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
              <Link
                href={`/watch/${currentItem.slug}`}
                className="inline-flex items-center gap-1.5 sm:gap-2 bg-white hover:bg-neutral-200 text-black font-extrabold px-5 sm:px-8 py-2 sm:py-3 rounded-md text-xs sm:text-base transition-all hover:scale-105 active:scale-95 shadow-2xl cursor-pointer"
              >
                <Play size={15} fill="currentColor" className="ml-0.5" />
                <span>Xem Ngay</span>
              </Link>
              <Link
                href={`/film/${currentItem.slug}`}
                className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#6d6d6e]/80 hover:bg-[#6d6d6e] text-white font-bold px-4 sm:px-7 py-2 sm:py-3 rounded-md text-xs sm:text-base transition-all cursor-pointer active:scale-95 shadow-lg"
              >
                <Info size={15} />
                <span>Chi Tiết</span>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Left / Right Carousel Navigation Arrows (Desktop Only) ── */}
      {curatedList.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Slide trước"
            className="hidden sm:flex absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 text-white items-center justify-center transition-all hover:scale-110 cursor-pointer shadow-2xl"
          >
            <ChevronLeft size={22} />
          </button>

          <button
            onClick={handleNext}
            aria-label="Slide tiếp theo"
            className="hidden sm:flex absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 text-white items-center justify-center transition-all hover:scale-110 cursor-pointer shadow-2xl"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* ── Pagination Dots (Centered on mobile, Bottom-Right on Desktop) ── */}
      {curatedList.length > 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-8 lg:left-auto lg:right-14 lg:translate-x-0 lg:bottom-44 z-30 flex items-center gap-1.5 sm:gap-2">
          {curatedList.map((item, idx) => (
            <button
              key={item._id || item.slug || idx}
              onClick={() => handleGoTo(idx)}
              aria-label={`Chuyển đến phim ${item.name}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                idx === currentIndex
                  ? "w-5 sm:w-6 bg-white/90 shadow-sm"
                  : "w-1.5 bg-white/30 hover:bg-white/50",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AnimeCategoryRow({
  title,
  films,
  isLoading,
  variant = "standard",
  defer = false,
}: {
  title: string;
  films: FilmItem[];
  isLoading: boolean;
  variant?: "standard" | "landscape";
  defer?: boolean;
}) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!isLoading && (!films || films.length === 0)) return null;

  const content = (
    <div className="relative group/row mb-6">
      {/* Clean Category Title without Icon */}
      <div className="flex items-center space-x-2.5 mb-3 px-1">
        <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white tracking-tight">
          {title}
        </h2>
      </div>

      <div className="relative">
        <button
          ref={prevRef}
          aria-label={`Cuộn trái ${title}`}
          className="hidden sm:flex absolute left-0 top-0 bottom-0 z-20 w-10 sm:w-12 bg-black/60 hover:bg-black/85 text-white items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm"
        >
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>

        <button
          ref={nextRef}
          aria-label={`Cuộn phải ${title}`}
          className="hidden sm:flex absolute right-0 top-0 bottom-0 z-20 w-10 sm:w-12 bg-black/60 hover:bg-black/85 text-white items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm"
        >
          <ChevronRight size={28} strokeWidth={2.5} />
        </button>

        <Swiper
          modules={[Navigation, FreeMode]}
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
          slidesPerGroup={4}
          spaceBetween={8}
          slidesPerView={4}
          breakpoints={{
            0: {
              slidesPerView: 4,
              spaceBetween: 8,
            },
            480: {
              slidesPerView: 4.5,
              spaceBetween: 10,
            },
            640: {
              slidesPerView: 5.2,
              spaceBetween: 12,
            },
            768: {
              slidesPerView: 5.8,
              spaceBetween: 14,
            },
            1024: {
              slidesPerView: 6.8,
              spaceBetween: 16,
            },
            1280: {
              slidesPerView: 7.8,
              spaceBetween: 16,
            },
          }}
          freeMode={{ enabled: true, momentumRatio: 0.8 }}
          className="!py-2 !px-1 w-full"
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <SwiperSlide key={`sk-${i}`}>
                  <FilmCardSkeleton hideDetails={false} />
                </SwiperSlide>
              ))
            : films.map((film, idx) => (
                <SwiperSlide
                  key={`${film.slug || film._id || (film as any).id}-${idx}`}
                >
                  <FilmCard
                    film={film}
                    variant={variant}
                    hideDetails={false}
                  />
                </SwiperSlide>
              ))}
        </Swiper>
      </div>
    </div>
  );
  return defer ? <DeferredSection>{content}</DeferredSection> : content;
}

const CHINESE_DONGHUA_KEYWORDS = [
  "thôn phệ tinh không",
  "swallowed star",
  "tiên nghịch",
  "renegade immortal",
  "già thiên",
  "shrouding the heavens",
  "luyện khí",
  "qi refining",
  "vạn giới",
  "ten thousand worlds",
  "đấu la đại lục",
  "soul land",
  "đấu phá thương khung",
  "battle through the heavens",
  "thế giới hoàn mỹ",
  "perfect world",
  "võ thần chúa tể",
  "martial master",
  "bách luyện",
  "nghịch thiên",
  "tuyệt thế",
  "đan điền",
  "dantian",
  "sư huynh à sư huynh",
  "thần y cổ đại",
  "sơn hải kinh",
  "ỷ thiên đồ long ký",
  "hoạt hình 3d",
  "hoạt hình trung quốc",
  "trung quốc",
  "china",
  "chí tôn",
  "tu chân",
  "tiên hiệp",
  "huyền ảo",
  "trọng sinh tu tiên",
  "thái lan",
  "thailand",
  "hồng kông",
  "hong kong",
  "đài loan",
  "taiwan",
  "đại lục",
  "phù thủy ở mông cổ",
];

function isPureAnime(item: FilmItem): boolean {
  if (!item) return false;
  const name = (item.name || item.title || "").toLowerCase();
  const originName = (item.origin_name || "").toLowerCase();
  const slug = (item.slug || "").toLowerCase();
  const full = `${name} ${originName} ${slug}`;

  for (const kw of CHINESE_DONGHUA_KEYWORDS) {
    if (full.includes(kw)) return false;
  }

  const country = (item as any).country;
  if (country) {
    if (Array.isArray(country)) {
      for (const c of country) {
        const text = `${c?.name || ""} ${c?.slug || ""}`.toLowerCase();
        if (
          text.includes("trung quốc") ||
          text.includes("china") ||
          text.includes("thái lan") ||
          text.includes("thailand")
        ) {
          return false;
        }
      }
    } else if (typeof country === "string") {
      const text = country.toLowerCase();
      if (
        text.includes("trung quốc") ||
        text.includes("china") ||
        text.includes("thái lan") ||
        text.includes("thailand")
      ) {
        return false;
      }
    }
  }

  return true;
}

type FilmsTypeClientProps = {
  type: string;
  page: number;
  initialData?: any;
  initialDataUpdatedAt?: number;
};

function withCatalogTimeout<T>(promise: Promise<T>, timeoutMs = 5_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Danh sách phim phản hồi quá lâu")),
      timeoutMs,
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export default function FilmsTypeClient({
  type,
  page,
  initialData,
  initialDataUpdatedAt,
}: FilmsTypeClientProps) {
  const navigation = useReliableNavigation();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const isAnime = type === "anime" || type === "hoat-hinh";
  const isSongNguAI =
    type === "thuyet-minh-ai" ||
    type === "thuyetminhai" ||
    type === "song-ngu-ai";
  const label = TYPE_LABELS[type] || "Danh Sách Phim";
  const secondaryReady = useDeferredContent();
  const apiFn = useMemo(
    () =>
      isAnime
        ? (p: number) => movieApi.getByCountryFast("nhat-ban", p)
        : isSongNguAI
          ? (p: number) => vicdnApi.getLatest(p)
          : TYPE_APIS[type] || movieApi.getLatest,
    [isAnime, isSongNguAI, type],
  );

  // Main Page Query
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["films-type", type, page],
    queryFn: () => withCatalogTimeout(apiFn(page).then((r) => r.data)),
    initialData,
    initialDataUpdatedAt,
    staleTime: initialData ? 0 : 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: false,
    refetchOnMount: initialData ? "always" : true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  // Secondary Page Queries for Pure Japanese Anime Universe Hub
  const { data: japanPage2Data, isLoading: japanPage2Loading } = useQuery({
    queryKey: ["anime-japan-page-2"],
    queryFn: () => movieApi.getByCountryFast("nhat-ban", 2).then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isAnime && secondaryReady,
    placeholderData: (prev) => prev,
  });

  const { data: animeGeneralData, isLoading: animeGeneralLoading } = useQuery({
    queryKey: ["anime-general-pool"],
    queryFn: () => movieApi.getAnime(1).then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isAnime && secondaryReady,
    placeholderData: (prev) => prev,
  });

  // Song Ngữ AI — additional ViCDN pages for richer catalog
  const { data: vicdnPage2Data, isLoading: vicdnPage2Loading } = useQuery({
    queryKey: ["vicdn-page-2"],
    queryFn: () => vicdnApi.getLatest(2),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isSongNguAI && secondaryReady,
    placeholderData: (prev) => prev,
  });

  const { data: vicdnActionData, isLoading: vicdnActionLoading } = useQuery({
    queryKey: ["vicdn-action"],
    queryFn: () => vicdnApi.getByCategory("hanh-dong", 1),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isSongNguAI && secondaryReady,
    placeholderData: (prev) => prev,
  });

  const { data: vicdnScifiData, isLoading: vicdnScifiLoading } = useQuery({
    queryKey: ["vicdn-scifi"],
    queryFn: () => vicdnApi.getByCategory("vien-tuong", 1),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isSongNguAI && secondaryReady,
    placeholderData: (prev) => prev,
  });

  const rawFilms = useMemo<FilmItem[]>(
    () => data?.data?.items || data?.items || [],
    [data],
  );
  const rawPage2Films = useMemo<FilmItem[]>(
    () => japanPage2Data?.data?.items || japanPage2Data?.items || [],
    [japanPage2Data],
  );
  const rawGeneralFilms = useMemo<FilmItem[]>(
    () => animeGeneralData?.data?.items || animeGeneralData?.items || [],
    [animeGeneralData],
  );

  // ViCDN Song Ngữ AI film lists
  const rawVicdnPage2Films = useMemo<FilmItem[]>(
    () => vicdnPage2Data?.items || [],
    [vicdnPage2Data],
  );
  const rawVicdnActionFilms = useMemo<FilmItem[]>(
    () => vicdnActionData?.items || [],
    [vicdnActionData],
  );
  const rawVicdnScifiFilms = useMemo<FilmItem[]>(
    () => vicdnScifiData?.items || [],
    [vicdnScifiData],
  );

  // Filter 100% pure authentic Anime
  const films = useMemo(
    () => (isAnime ? rawFilms.filter(isPureAnime) : rawFilms),
    [rawFilms, isAnime],
  );
  const page2Films = useMemo(
    () => (isAnime ? rawPage2Films.filter(isPureAnime) : rawPage2Films),
    [rawPage2Films, isAnime],
  );
  const generalFilms = useMemo(
    () => (isAnime ? rawGeneralFilms.filter(isPureAnime) : rawGeneralFilms),
    [rawGeneralFilms, isAnime],
  );

  const combinedPool = useMemo(
    () =>
      dedupeFilmsList([
        ...CURATED_ANIME_HERO_POOL,
        ...films,
        ...page2Films,
        ...generalFilms,
      ]),
    [films, page2Films, generalFilms],
  );

  // Song Ngữ AI combined pool
  const vicdnCombinedPool = useMemo(
    () =>
      dedupeFilmsList([
        ...CURATED_SONG_NGU_AI_HERO_POOL,
        ...rawFilms,
        ...rawVicdnPage2Films,
        ...rawVicdnActionFilms,
        ...rawVicdnScifiFilms,
      ]),
    [rawFilms, rawVicdnPage2Films, rawVicdnActionFilms, rawVicdnScifiFilms],
  );

  // Song Ngữ AI rows with strict thematic filtering and zero duplication across rows
  const { vicdnRow1, vicdnRow2, vicdnRow3, vicdnRow4, vicdnRow5, vicdnRow6 } = useMemo(() => {
    const used = new Set<string>();

    const filterTheme = (
      primaryList: FilmItem[],
      keywords: string[],
      n = 12,
      fillRemaining = false,
    ): FilmItem[] => {
      const res: FilmItem[] = [];

      const tryAdd = (f: FilmItem) => {
        if (!f) return;
        const k = (f.slug || f._id || "").toLowerCase();
        const base = getBaseTitle(f.name || f.title || "");
        if (k && !used.has(k) && (!base || !used.has(base))) {
          used.add(k);
          if (base) used.add(base);
          res.push(f);
        }
      };

      // 1. Primary list
      for (const f of primaryList) {
        tryAdd(f);
        if (res.length >= n) break;
      }

      // 2. Fallback matching keywords from combined pool
      if (res.length < n && keywords.length > 0) {
        for (const f of vicdnCombinedPool) {
          const k = (f.slug || f._id || "").toLowerCase();
          const base = getBaseTitle(f.name || f.title || "");
          if (used.has(k) || (base && used.has(base))) continue;

          const text = `${f.name || ""} ${f.origin_name || ""} ${f.content || ""} ${(f.category || []).map((c: any) => c?.name || "").join(" ")}`.toLowerCase();
          if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
            tryAdd(f);
            if (res.length >= n) break;
          }
        }
      }

      // 3. Fallback from remaining combined pool
      if (fillRemaining && res.length < n) {
        for (const f of vicdnCombinedPool) {
          tryAdd(f);
          if (res.length >= n) break;
        }
      }

      return res;
    };

    const r1 = filterTheme(rawFilms, [], 12);
    const r2 = filterTheme(rawVicdnActionFilms, ["hành động", "action", "võ thuật", "chiến đấu", "bắn súng"], 12);
    const r3 = filterTheme(rawVicdnScifiFilms, ["viễn tưởng", "sci-fi", "vũ trụ", "không gian", "robot", "tương lai", "siêu nhiên"], 12);
    const r4 = filterTheme([], ["hình sự", "trinh thám", "tội phạm", "bí ẩn", "thriller", "điều tra"], 12);
    const r5 = filterTheme([], ["tình cảm", "lãng mạn", "gia đình", "chính kịch", "tâm lý"], 12);
    const r6 = filterTheme(rawVicdnPage2Films, [], 12, true);

    return {
      vicdnRow1: r1,
      vicdnRow2: r2,
      vicdnRow3: r3,
      vicdnRow4: r4,
      vicdnRow5: r5,
      vicdnRow6: r6,
    };
  }, [rawFilms, rawVicdnActionFilms, rawVicdnScifiFilms, rawVicdnPage2Films, vicdnCombinedPool]);

function filmMatchesAnimeKeywords(f: FilmItem, keywords: string[]): boolean {
  if (!f) return false;
  const name = (f.name || "").toLowerCase();
  const origin = (f.origin_name || "").toLowerCase();
  const slug = (f.slug || "").toLowerCase();
  const type = (f.type || "").toLowerCase();

  for (const kw of keywords) {
    const lk = kw.toLowerCase();
    if (name.includes(lk) || origin.includes(lk) || slug.includes(lk) || type.includes(lk)) {
      return true;
    }
  }

  if (Array.isArray(f.category)) {
    for (const c of f.category) {
      const cName = (c?.name || "").toLowerCase();
      const cSlug = (c?.slug || "").toLowerCase();
      for (const kw of keywords) {
        const lk = kw.toLowerCase();
        if (cName.includes(lk) || cSlug.includes(lk)) return true;
      }
    }
  }

  return false;
}

  const actionFilms: FilmItem[] = useMemo(() => {
    const specialSlugs = [
      "thanh-guom-diet-quy",
      "chu-thuat-hoi-chien",
      "toi-thang-cap-mot-minh",
      "dai-chien-titan",
      "tho-san-quy",
      "naruto-shippuden",
      "dragon-ball-super",
      "dao-hai-tac",
    ];
    return combinedPool.filter(
      (f) =>
        specialSlugs.includes(f.slug || "") ||
        filmMatchesAnimeKeywords(f, ["hành động", "shounen", "phiêu lưu", "action"]),
    );
  }, [combinedPool]);

  const supernaturalFilms: FilmItem[] = useMemo(() => {
    const specialSlugs = [
      "phap-su-tien-tang-frieren",
      "chu-thuat-hoi-chien",
      "tho-san-ti-hon",
      "khoa-chat-cua-nao-suzume",
    ];
    return combinedPool.filter(
      (f) =>
        specialSlugs.includes(f.slug || "") ||
        filmMatchesAnimeKeywords(f, ["viễn tưởng", "siêu nhiên", "phép thuật", "isekai"]),
    );
  }, [combinedPool]);

  const romanceFilms: FilmItem[] = useMemo(() => {
    const specialSlugs = [
      "ten-cau-la-gi",
      "gia-dinh-diep-vien",
      "khoa-chat-cua-nao-suzume",
    ];
    return combinedPool.filter(
      (f) =>
        specialSlugs.includes(f.slug || "") ||
        filmMatchesAnimeKeywords(f, ["tình cảm", "học đường", "lãng mạn", "hài hước"]),
    );
  }, [combinedPool]);

  const comedyAnimeFilms = useMemo(
    () =>
      combinedPool.filter((film) =>
        filmMatchesAnimeKeywords(film, ["hài hước", "gia đình", "đời thường", "comedy", "slice of life"]),
      ),
    [combinedPool],
  );

  const darkAnimeFilms = useMemo(
    () =>
      combinedPool.filter((film) =>
        filmMatchesAnimeKeywords(film, ["kinh dị", "bí ẩn", "trinh thám", "tâm lý", "horror", "mystery"]),
      ),
    [combinedPool],
  );

  // Strict Cross-Row Deduplication: ensures ZERO duplicate films across different rows
  const { row1Films, row2Films, row3Films, row4Films, row5Films, row6Films, row7Films } = useMemo(() => {
    const usedSlugs = new Set<string>();

    const filterUnique = (list: FilmItem[], targetCount = 12): FilmItem[] => {
      const result: FilmItem[] = [];
      for (const f of list) {
        if (!f || (isAnime && !isPureAnime(f))) continue;
        const key = (f.slug || f._id || (f as any).id || "").toLowerCase();
        const base = getBaseTitle(f.name || f.title || "");
        if (key && !usedSlugs.has(key) && (!base || !usedSlugs.has(base))) {
          usedSlugs.add(key);
          if (base) usedSlugs.add(base);
          result.push(f);
          if (result.length >= targetCount) break;
        }
      }
      return result;
    };

    // Row 1: Mới cập nhật & Đang phát sóng
    const r1 = filterUnique(films, 12);

    // Row 2: Bom tấn Shounen & Hành Động
    const r2Candidates = [
      ...CURATED_ANIME_HERO_POOL.filter((f) =>
        [
          "thanh-guom-diet-quy",
          "toi-thang-cap-mot-minh",
          "chu-thuat-hoi-chien",
          "dai-chien-titan",
          "dao-hai-tac",
          "tho-san-quy",
          "naruto-shippuden",
          "dam-phat-chet-luon-phan-1",
          "dragon-ball-super",
        ].includes(f.slug || ""),
      ),
      ...actionFilms,
    ];
    const r2 = filterUnique(r2Candidates, 12);

    // Row 3: Siêu Nhiên, Phép Thuật & Dị Giới
    const r3Candidates = [
      ...CURATED_ANIME_HERO_POOL.filter((f) =>
        [
          "phap-su-tien-tang-frieren",
          "tho-san-ti-hon",
        ].includes(f.slug || ""),
      ),
      ...supernaturalFilms,
    ];
    const r3 = filterUnique(r3Candidates, 12);

    // Row 4: Học Đường, Lãng Mạn & Gia Đình
    const r4Candidates = [
      ...CURATED_ANIME_HERO_POOL.filter((f) =>
        [
          "ten-cau-la-gi",
          "gia-dinh-diep-vien",
          "khoa-chat-cua-nao-suzume",
        ].includes(f.slug || ""),
      ),
      ...romanceFilms,
    ];
    const r4 = filterUnique(r4Candidates, 12);

    // Row 5: Hài hước, gia đình & đời thường
    const r5 = filterUnique(comedyAnimeFilms, 12);

    // Row 6: Bí ẩn, kinh dị & tâm lý
    const r6 = filterUnique(darkAnimeFilms, 12);

    // Row 7: Tuyển chọn đặc sắc
    const r7Candidates = [...page2Films, ...generalFilms, ...combinedPool];
    const r7 = filterUnique(r7Candidates, 12);

    return {
      row1Films: r1,
      row2Films: r2,
      row3Films: r3,
      row4Films: r4,
      row5Films: r5,
      row6Films: r6,
      row7Films: r7,
    };
  }, [
    films,
    actionFilms,
    supernaturalFilms,
    romanceFilms,
    comedyAnimeFilms,
    darkAnimeFilms,
    page2Films,
    generalFilms,
    combinedPool,
    isAnime,
  ]);

  const totalItems =
    Number(data?.data?.params?.pagination?.totalItems) ||
    Number(data?.params?.pagination?.totalItems) ||
    Number(data?.pagination?.totalItems) ||
    Number(data?.data?.paginate?.total_items) ||
    undefined;

  const rawTotal =
    Number(data?.data?.params?.pagination?.totalPages) ||
    Number(data?.params?.pagination?.totalPages) ||
    Number(data?.pagination?.totalPages) ||
    Number(data?.paginate?.total_page) ||
    Number(data?.data?.paginate?.total_page) ||
    (totalItems
      ? Math.ceil(
          totalItems /
            (Number(data?.data?.params?.pagination?.totalItemsPerPage) ||
              Number(data?.params?.pagination?.totalItemsPerPage) ||
              24),
        )
      : undefined);

  const totalPages = Math.max(1, rawTotal || (films.length > 0 ? 1 : 1));

  const handlePageChange = (newPage: number) => {
    navigation.push(`/films/${type}?page=${newPage}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prefetchPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages) return;
    void queryClient.prefetchQuery({
      queryKey: ["films-type", type, targetPage],
      queryFn: () => apiFn(targetPage).then((response) => response.data),
      staleTime: 30 * 60 * 1000,
    });
  };

  // Auto-prefetch next page in idle time for instant pagination
  useEffect(() => {
    if (page < totalPages) {
      const nextPage = page + 1;
      const timer = setTimeout(() => {
        void queryClient.prefetchQuery({
          queryKey: ["films-type", type, nextPage],
          queryFn: () => apiFn(nextPage).then((response) => response.data),
          staleTime: 30 * 60 * 1000,
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [page, totalPages, type, apiFn, queryClient]);

  return (
    <div
      data-eager-hydration="true"
      className={cn(
        cardFont.className,
        "min-h-screen w-full bg-background text-foreground",
        isAnime || isSongNguAI
          ? "-mt-20 sm:-mt-24 bg-[#0a0b10]"
          : "pb-20 pl-4 pr-4 pt-20 sm:pt-24 md:pr-10 lg:pl-24",
      )}
    >
      {/* ── CASE 3: SONG NGỮ AI UNIVERSE HUB ── */}
      {isSongNguAI ? (
        <>
          {/* Hero Banner — reuses the same cinematic banner with Song Ngữ AI pool */}
          <AnimeCuratedHeroBanner
            pool={CURATED_SONG_NGU_AI_HERO_POOL}
            themeLabel="Thuyết Minh Song Ngữ AI"
          />

          {/* Curated Rows */}
          <div className="relative z-20 pl-4 sm:pl-12 md:pl-20 lg:pl-24 pr-2 sm:pr-4 md:pr-6 pb-16 space-y-6 mt-3 sm:-mt-20 md:-mt-28 lg:-mt-36">
            {/* Row 1: Phim Mới Song Ngữ AI */}
            <AnimeCategoryRow
              title="Phim Song Ngữ AI Mới Cập Nhật"
              films={vicdnRow1}
              isLoading={isLoading}
              variant="standard"
            />

            {/* Row 2: Bom Tấn Hành Động */}
            <AnimeCategoryRow
              title="Bom Tấn Hành Động Song Ngữ AI"
              films={vicdnRow2}
              isLoading={isLoading || vicdnActionLoading}
              variant="standard"
              defer
            />

            {/* Row 3: Khoa Học Viễn Tưởng */}
            <AnimeCategoryRow
              title="Khoa Học Viễn Tưởng Song Ngữ AI"
              films={vicdnRow3}
              isLoading={isLoading || vicdnScifiLoading}
              variant="standard"
              defer
            />

            {/* Row 4: Hình sự & trinh thám */}
            <AnimeCategoryRow
              title="Hình Sự, Trinh Thám & Bí Ẩn Song Ngữ AI"
              films={vicdnRow4}
              isLoading={isLoading && !vicdnRow4.length}
              variant="standard"
              defer
            />

            {/* Row 5: Tình cảm & tâm lý */}
            <AnimeCategoryRow
              title="Tình Cảm, Gia Đình & Tâm Lý Song Ngữ AI"
              films={vicdnRow5}
              isLoading={isLoading && !vicdnRow5.length}
              variant="standard"
              defer
            />

            {/* Row 6: Tuyển Chọn Đặc Sắc */}
            <AnimeCategoryRow
              title="Tuyển Chọn Song Ngữ AI Đặc Sắc"
              films={vicdnRow6}
              isLoading={vicdnPage2Loading && !vicdnRow6.length}
              variant="standard"
              defer
            />

            {/* Full Catalog Header */}
            <div className="mt-14 mb-8 pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-2">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                  Tất Cả Phim Thuyết Minh Song Ngữ AI
                </h2>
                <p className="text-xs text-neutral-400 font-semibold mt-1">
                  Công nghệ AI thuyết minh song ngữ — nghe tiếng Anh gốc + tiếng Việt cùng lúc
                </p>
              </div>
              <div className="text-xs font-bold text-neutral-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 self-start md:self-auto">
                Trang <span className="text-white font-extrabold">{page}</span> /{" "}
                {totalPages}
              </div>
            </div>

            {/* Full Catalog Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7">
                {Array.from({ length: 14 }).map((_, i) => (
                  <FilmCardSkeleton key={i} />
                ))}
              </div>
            ) : rawFilms.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7">
                {dedupeFilmsList(rawFilms).map((f, idx) => (
                  <FilmCard
                    key={`${f.slug || f._id || idx}-${idx}`}
                    film={f}
                    priority={idx < 7}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-neutral-500 font-semibold text-sm">
                Đang tải phim song ngữ AI từ ViCDN...
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={handlePageChange}
              onPrefetchPage={prefetchPage}
            />
          </div>
        </>
      ) : isAnime ? (
        <>
          {/* Next-Gen Hero Banner */}
          <AnimeCuratedHeroBanner
            pool={CURATED_ANIME_HERO_POOL}
          />

          {/* Curated Multi-Genre Rows */}
          <div className="relative z-20 pl-4 sm:pl-12 md:pl-20 lg:pl-24 pr-2 sm:pr-4 md:pr-6 pb-16 space-y-6 mt-3 sm:-mt-20 md:-mt-28 lg:-mt-36">
            {/* Row 1: Anime Mới & Đang Thịnh Hành */}
            <AnimeCategoryRow
              title="Anime & Hoạt Hình Mới Thịnh Hành"
              films={row1Films}
              isLoading={isLoading}
              variant="standard"
            />

            {/* Row 2: Hành Động & Shounen */}
            <AnimeCategoryRow
              title="Anime Hành Động & Shounen Đỉnh Cao"
              films={row2Films}
              isLoading={isLoading || japanPage2Loading}
              variant="standard"
              defer
            />

            {/* Row 3: Siêu Nhiên & Kỳ Ảo */}
            <AnimeCategoryRow
              title="Anime Siêu Nhiên, Phép Thuật & Dị Giới"
              films={row3Films}
              isLoading={isLoading || japanPage2Loading}
              variant="standard"
              defer
            />

            {/* Row 4: Học Đường & Lãng Mạn */}
            <AnimeCategoryRow
              title="Anime Học Đường, Đời Thường & Lãng Mạn"
              films={row4Films}
              isLoading={isLoading || japanPage2Loading}
              variant="standard"
              defer
            />

            {/* Row 5: Hài hước & gia đình */}
            <AnimeCategoryRow
              title="Anime Hài Hước, Gia Đình & Đời Thường"
              films={row5Films}
              isLoading={isLoading && !row5Films.length}
              variant="standard"
              defer
            />

            {/* Row 6: Bí ẩn & kinh dị */}
            <AnimeCategoryRow
              title="Anime Bí Ẩn, Kinh Dị & Tâm Lý"
              films={row6Films}
              isLoading={isLoading && !row6Films.length}
              variant="standard"
              defer
            />

            {/* Row 7: Tuyển Chọn Đặc Sắc */}
            <AnimeCategoryRow
              title="Anime Tuyển Chọn Đặc Sắc"
              films={row7Films}
              isLoading={japanPage2Loading || isLoading}
              variant="standard"
              defer
            />

            {/* Full Catalog Header */}
            <div className="mt-14 mb-8 pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-2">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                  Tất Cả Anime & Hoạt Hình
                </h2>
                <p className="text-xs text-neutral-400 font-semibold mt-1">
                  Kho phim hoạt hình, anime Nhật Bản và 3D chiếu rạp cập nhật liên tục
                </p>
              </div>
              <div className="text-xs font-bold text-neutral-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 self-start md:self-auto">
                Trang <span className="text-white font-extrabold">{page}</span> /{" "}
                {totalPages}
              </div>
            </div>

            {/* Full Catalog Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7">
                {Array.from({ length: 14 }).map((_, i) => (
                  <FilmCardSkeleton key={i} />
                ))}
              </div>
            ) : films.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7">
                {dedupeFilmsList(films).map((f, idx) => (
                  <FilmCard
                    key={`${f.slug || f._id || idx}-${idx}`}
                    film={f}
                    priority={idx < 7}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-neutral-500 font-semibold text-sm">
                Không tìm thấy phim hoạt hình nào.
              </div>
            )}

            {/* Pagination Controls */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={handlePageChange}
              onPrefetchPage={prefetchPage}
            />
          </div>
        </>
      ) : (
        /* ── CASE 2: ALL OTHER TYPES (Standard Centered Catalog View) ── */
        <div className="w-full">
          {/* Page Header — Centered */}
          <div className="flex flex-col items-center justify-center text-center mb-10 pb-6 border-b border-white/10 gap-2.5 max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {label}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 font-medium">
              Khám phá kho phim chọn lọc cập nhật liên tục hàng ngày
            </p>
            <div className="mt-1 text-xs font-mono font-bold text-neutral-300 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 flex items-center justify-center gap-1">
              <span>Trang</span>
              <span className="text-white font-extrabold">{page}</span>
              <span>/</span>
              {isLoading && !data ? (
                <span className="inline-block w-7 h-3.5 rounded bg-white/10 animate-pulse" />
              ) : (
                <span>{totalPages}</span>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-6 sm:gap-y-8">
              {Array.from({ length: 21 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : isError && films.length === 0 ? (
            <div
              role="alert"
              className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-white/10 bg-white/[0.035] px-6 py-14 text-center"
            >
              <p className="text-base font-bold text-white">
                Chưa thể tải danh sách phim
              </p>
              <p className="mt-2 text-sm text-neutral-400">
                {error instanceof Error
                  ? error.message
                  : "Nguồn phim đang tạm thời gián đoạn."}
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-black transition hover:bg-neutral-200 disabled:cursor-wait disabled:opacity-60"
              >
                {isFetching ? "Đang thử lại..." : "Thử lại"}
              </button>
            </div>
          ) : films.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-6 sm:gap-y-8">
              {films.map((film, idx) => (
                <FilmCard
                  key={`${film.slug || film._id || (film as any).id}-${idx}`}
                  film={film}
                  priority={idx < 7}
                  preferHighQuality={idx < 7}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-neutral-500 font-semibold text-sm">
              Không tìm thấy bộ phim nào trong danh mục này.
            </div>
          )}

          {/* Pagination Controls */}
          {isLoading && !data ? (
            <div className="mt-12 flex items-center justify-center gap-2 animate-pulse">
              <div className="h-9 w-20 rounded-lg bg-white/5 border border-white/10" />
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-9 w-9 rounded-lg bg-white/5 border border-white/10"
                  />
                ))}
              </div>
              <div className="h-9 w-20 rounded-lg bg-white/5 border border-white/10" />
            </div>
          ) : (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={handlePageChange}
              onPrefetchPage={prefetchPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
