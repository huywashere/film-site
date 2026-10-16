"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmItem,
  FilmCardSkeleton,
  resolveImageUrl,
} from "@/components/film/FilmCard";
import { Top10RankedRow } from "@/components/film/Top10RankedRow";
import { ContinueWatchingRow } from "@/components/film/ContinueWatchingRow";
import { Pagination } from "@/components/film/Pagination";
import { useTmdb } from "@/hooks/useTmdb";
import { TrailerModal } from "@/components/film/TrailerModal";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  CURATED_KOREAN_HERO_POOL,
  CURATED_CHINESE_HERO_POOL,
  AsianHeroItem,
  buildAsianHeroImageCandidates,
} from "@/lib/curated-asian-hero";
import {
  getYoutubeTrailer,
  resolveTmdbHeroAssets,
  tmdbProfile,
} from "@/lib/tmdb";
import { cardFont } from "@/lib/fonts";
import { preloadMovieLogo } from "@/lib/movie-logo-cache";
import { DeferredSection } from "@/components/layout/DeferredSection";
import { useTranslation } from "@/store/langStore";
import { useReliableNavigation } from "@/hooks/useReliableNavigation";
import { useDeferredContent } from "@/hooks/useDeferredContent";
import { useAuthStore } from "@/store/authStore";
import {
  Play,
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Flame,
  Heart,
  Zap,
  Crown,
  Tv,
  UserCheck,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

const COUNTRY_NAMES: Record<string, string> = {
  "han-quoc": "Hàn Quốc",
  "trung-quoc": "Trung Quốc",
  "nhut-ban": "Nhật Bản",
  "nhat-ban": "Nhật Bản",
  "au-my": "Âu Mỹ",
  "thiet-nam": "Việt Nam",
  "viet-nam": "Việt Nam",
  "thai-lan": "Thái Lan",
  "hong-kong": "Hồng Kông",
  "dai-loan": "Đài Loan",
  anh: "Anh",
  phap: "Pháp",
  duc: "Đức",
  "an-do": "Ấn Độ",
};

const GENRE_OPTIONS = [
  { slug: "", label: "Tất cả thể loại" },
  { slug: "tinh-cam", label: "Tình Cảm & Lãng Mạn" },
  { slug: "hanh-dong", label: "Hành Động & Kịch Tính" },
  { slug: "co-trang", label: "Cổ Trang & Thần Thoại" },
  { slug: "hinh-su", label: "Hình Sự & Trinh Thám" },
  { slug: "hoat-hinh", label: "Hoạt Hình & Anime" },
  { slug: "vien-tuong", label: "Viễn Tưởng & Tương Lai" },
];

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

function dedupeFilmsList(
  films: FilmItem[],
  globalSlugs?: Set<string>,
): FilmItem[] {
  const seenBase = new Set<string>();
  const result: FilmItem[] = [];

  for (const film of films) {
    if (!film) continue;
    const slug = film.slug || film._id || (film as any).id;
    const rawTitle = film.name || film.title || "";
    const baseTitle = getBaseTitle(rawTitle);

    if (globalSlugs && slug && globalSlugs.has(slug)) continue;
    if (baseTitle && seenBase.has(baseTitle)) continue;

    if (baseTitle) seenBase.add(baseTitle);
    if (globalSlugs && slug) globalSlugs.add(slug);
    result.push(film);
  }

  return result;
}

// Reusable Category Row with Netflix Overlay Navigation Arrows
function CountryCategoryRow({
  title,
  films,
  isLoading,
  href,
  variant = "standard",
  defer = false,
}: {
  title: string;
  films: FilmItem[];
  isLoading: boolean;
  href?: string;
  variant?: "standard" | "landscape";
  defer?: boolean;
}) {
  const { t } = useTranslation();
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!isLoading && !films.length) return null;

  const content = (
    <div className="mb-8 group/row relative cv-section-auto" aria-busy={isLoading}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="group/link inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs sm:text-sm font-semibold text-white/80 hover:text-white transition-colors select-none ml-1.5"
          >
            <span>{t("home.viewAll", "Xem tất cả")}</span>
            <ChevronRight size={14} className="stroke-[2.2] text-white/60 group-hover/link:text-white transition-transform group-hover/link:translate-x-0.5" />
          </Link>
        )}
      </div>

      <div className="relative w-full overflow-hidden">
        {/* Left Overlay Arrow */}
        <button
          ref={prevRef}
          aria-label="Previous slide"
          className="hidden sm:flex absolute left-0 top-0 bottom-0 z-30 w-11 bg-black/75 hover:bg-black/90 text-white items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer disabled:hidden rounded-r-md"
        >
          <ChevronLeft size={30} strokeWidth={2.5} />
        </button>

        {/* Right Overlay Arrow */}
        <button
          ref={nextRef}
          aria-label="Next slide"
          className="hidden sm:flex absolute right-0 top-0 bottom-0 z-30 w-11 bg-black/75 hover:bg-black/90 text-white items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer disabled:hidden rounded-l-md"
        >
          <ChevronRight size={30} strokeWidth={2.5} />
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
          className="catalog-row-swiper !py-2 !px-1 w-full"
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <SwiperSlide
                  key={`sk-${i}`}
                  className="w-1/4 sm:w-1/5 lg:w-[14.2857%] xl:w-[12.5%]"
                >
                  <FilmCardSkeleton hideDetails={false} />
                </SwiperSlide>
              ))
            : films.map((film, idx) => (
                <SwiperSlide
                  key={`${film.slug || film._id || (film as any).id}-${idx}`}
                  className="w-1/4 sm:w-1/5 lg:w-[14.2857%] xl:w-[12.5%]"
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

// Featured Actors Row
function FeaturedActorsRow({ film }: { film?: FilmItem }) {
  const { cast, creditsLoading } = useTmdb({
    film,
    enabled: !!film,
    fetchImages: false,
    fetchVideos: false,
  });

  if (!film || (!creditsLoading && cast.length === 0)) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center space-x-2 mb-4 px-1">
        <UserCheck size={18} className="text-white/70" />
        <h2 className="text-lg md:text-xl font-extrabold text-white">
          Diễn viên nổi bật
        </h2>
      </div>

      <div className="flex items-center gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40 px-1 touch-pan-x select-none">
        {creditsLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col items-center flex-shrink-0 animate-pulse"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/[0.08]" />
                <div className="mt-3 h-3 w-20 rounded bg-white/[0.08]" />
              </div>
            ))
          : cast.slice(0, 8).map((actor) => (
              <Link
                key={actor.id}
                href={`/actors/${actor.id}`}
                className="flex flex-col items-center flex-shrink-0 group cursor-pointer"
              >
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-white/50 group-hover:scale-[1.03] transition-all duration-200">
                  {tmdbProfile(actor.profile_path, "w185") ? (
                    <NextImage
                      src={tmdbProfile(actor.profile_path, "w185") || ""}
                      alt={actor.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex w-full h-full items-center justify-center bg-white/[0.08] text-2xl font-bold text-white/50">
                      {actor.name.slice(0, 1)}
                    </span>
                  )}
                </div>
                <span className="mt-2.5 text-xs font-bold text-white group-hover:text-white/70 transition-colors text-center max-w-[110px] truncate">
                  {actor.name}
                </span>
              </Link>
            ))}
      </div>
    </div>
  );
}

function ResilientAsianHeroBackdrop({
  item,
}: {
  item: AsianHeroItem;
}) {
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

  const [desktopIdx, setDesktopIdx] = useState(0);
  const [mobileIdx, setMobileIdx] = useState(0);

  useEffect(() => {
    setDesktopIdx(0);
    setMobileIdx(0);
  }, [item.slug, item.thumb_url, item.poster_url]);

  const desktopSrc = desktopCandidates[desktopIdx] || item.thumb_url || item.poster_url || "";
  const mobilePosterSrc = mobileCandidates[mobileIdx] || item.poster_url || item.thumb_url || "";

  return (
    <picture className="absolute inset-0 w-full h-full block">
      {/* Mobile portrait poster (vertical artwork) */}
      <source
        media="(max-width: 767px)"
        srcSet={mobilePosterSrc}
      />
      {/* Desktop widescreen backdrop (horizontal 16:9 artwork) */}
      <source
        media="(min-width: 768px)"
        srcSet={desktopSrc}
      />
      <img
        key={`${item.slug}-backdrop-${desktopIdx}-${mobileIdx}`}
        src={desktopSrc}
        alt={item.name}
        referrerPolicy="strict-origin-when-cross-origin"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onError={() => {
          if (desktopIdx < desktopCandidates.length - 1) {
            setDesktopIdx((prev) => prev + 1);
          }
          if (mobileIdx < mobileCandidates.length - 1) {
            setMobileIdx((prev) => prev + 1);
          }
        }}
        className="w-full h-full object-cover object-center sm:object-[center_20%] md:object-[center_22%] brightness-[0.98] contrast-[1.02] transition-opacity duration-700 animate-in fade-in"
      />
    </picture>
  );
}

function ResilientAsianHeroLogo({
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
        className="text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-wide leading-tight drop-shadow-[0_8px_20px_rgba(0,0,0,0.95)]"
        style={{
          fontFamily: "'Playfair Display', 'Dancing Script', Georgia, serif",
          fontStyle: "italic",
        }}
      >
        {item.calligraphyTitle || item.name}
      </h1>
    );
  }

  return (
    <div className="relative flex h-12 w-36 items-center sm:h-24 sm:w-72 md:h-28 md:w-80 lg:w-[440px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-curated-hero-logo={item.slug}
        key={`${item.slug}-logo-${candidateIdx}`}
        src={currentLogoSrc}
        alt={item.name}
        loading="eager"
        decoding="async"
        referrerPolicy="strict-origin-when-cross-origin"
        onError={() => {
          if (candidateIdx < logoCandidates.length - 1) {
            setCandidateIdx((prev) => prev + 1);
          } else {
            setHasFailedAll(true);
          }
        }}
        className="max-h-full max-w-full object-contain object-left drop-shadow-[0_10px_25px_rgba(0,0,0,0.95)]"
      />
    </div>
  );
}

function AsianCuratedHeroBanner({
  pool,
  countryLabel,
}: {
  pool: AsianHeroItem[];
  countryLabel: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const curatedList = pool || [];

  // Warm only the visible and next slide with resilient CDN candidates.
  useEffect(() => {
    if (typeof window !== "undefined" && pool?.length) {
      const nextIndex = (currentIndex + 1) % pool.length;
      pool.forEach((item) => {
        const logoCand = buildAsianHeroImageCandidates(item.logoUrl)[0];
        if (logoCand) void preloadMovieLogo(logoCand);
      });
      [pool[currentIndex], pool[nextIndex]].filter(Boolean).forEach((item) => {
        const thumbCand = buildAsianHeroImageCandidates(item.thumb_url)[0];
        if (thumbCand) {
          const img = new Image();
          img.referrerPolicy = "strict-origin-when-cross-origin";
          img.src = thumbCand;
        }
      });
    }
  }, [currentIndex, pool]);

  // Auto slide every 7 seconds with forward glide
  useEffect(() => {
    if (curatedList.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % curatedList.length);
    }, 7000);
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
    setDirection(idx >= currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  return (
    <section
      data-hero-banner="true"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full select-none overflow-hidden bg-[#07080c] h-[62svh] min-h-[460px] sm:h-[76vh] sm:min-h-[580px] lg:h-[82vh] lg:min-h-[660px] lg:max-h-[860px]"
    >
      {/* ── High Resolution Dynamic Backdrop with Right-to-Left Gliding Motion ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentItem.slug || currentItem._id || currentIndex}
            custom={direction}
            initial={{
              x: direction > 0 ? "2.5%" : "-2.5%",
              opacity: 0,
              scale: 1.015,
            }}
            animate={{
              x: "0%",
              opacity: 1,
              scale: 1,
            }}
            exit={{
              x: direction > 0 ? "-2.5%" : "2.5%",
              opacity: 0,
              scale: 0.99,
            }}
            transition={{
              duration: 0.85,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute inset-0 w-full h-full"
          >
            <ResilientAsianHeroBackdrop
              item={currentItem}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Cinematic High-Clarity Gradient Overlays (Tapers cleanly so full artwork is visible) ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, rgba(7,8,12,0.88) 0%, rgba(7,8,12,0.50) 28%, rgba(7,8,12,0.10) 52%, transparent 72%),
            linear-gradient(to top, #07080c 0%, rgba(7,8,12,0.70) 10%, transparent 25%),
            linear-gradient(to bottom, rgba(7,8,12,0.40) 0%, transparent 16%)
          `,
        }}
      />

      {/* ── Left Content Overlay (Responsive positioning: bottom-aligned on mobile, center-aligned on desktop) ── */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end px-4 pb-14 sm:justify-center sm:px-14 sm:pb-20 md:px-20 lg:px-24 lg:pb-0">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentItem.slug || currentItem._id || currentIndex}
            custom={direction}
            initial={{
              x: direction > 0 ? -50 : 50,
              opacity: 0,
              filter: "blur(4px)",
            }}
            animate={{
              x: 0,
              opacity: 1,
              filter: "blur(0px)",
            }}
            exit={{
              x: direction > 0 ? 40 : -40,
              opacity: 0,
              filter: "blur(4px)",
            }}
            transition={{
              duration: 0.65,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="max-w-2xl space-y-2.5 sm:space-y-4 lg:space-y-5 pt-0 sm:pt-8"
          >
            {/* Official Title Logo PNG with Multi-CDN Resilient Fallback */}
            <ResilientAsianHeroLogo key={currentItem.slug} item={currentItem} />

            {/* Subtitle / Vietnamese or English name */}
            <p className="text-[11px] sm:text-sm text-neutral-300 font-semibold italic -mt-0.5 sm:-mt-2 drop-shadow">
              {currentItem.name} {currentItem.origin_name ? `(${currentItem.origin_name})` : ""}
            </p>

            {/* Metadata Row: Year | Country | Total Episodes */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-[10px] sm:text-xs font-semibold text-neutral-200">
              {currentItem.year && (
                <span className="text-white font-bold">{currentItem.year}</span>
              )}
              <span className="text-neutral-400">|</span>
              <span className="text-neutral-300">{countryLabel}</span>
              {currentItem.totalEpisodesText && (
                <>
                  <span className="text-neutral-400">|</span>
                  <span className="text-neutral-300">{currentItem.totalEpisodesText}</span>
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
        <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 sm:bottom-6 sm:gap-2 lg:right-14 lg:left-auto lg:bottom-8 lg:translate-x-0">
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



type CountryPageClientProps = {
  initialFastData?: any;
  initialDataUpdatedAt?: number;
};

export default function CountryPageClient({
  initialFastData,
  initialDataUpdatedAt,
}: CountryPageClientProps) {
  const params = useParams();
  const router = useReliableNavigation();
  const searchParams = useSearchParams();
  const { t, lang } = useTranslation();
  const slug = params.slug as string;
  const page = Number(searchParams.get("page") || 1);
  const selectedGenre = searchParams.get("category") || "";
  const label = COUNTRY_NAMES[slug] || slug;
  const isKoreanPage = slug === "han-quoc";
  const isChinesePage = slug === "trung-quoc";
  const isCustomHeroPage = isKoreanPage || isChinesePage;
  const user = useAuthStore((s) => s.user);
  const secondaryReady = useDeferredContent();

  // Deterministic SSR value avoids a production hydration mismatch. A fresh
  // seed is selected after navigation on the client.
  const [heroSeed, setHeroSeed] = useState(0.5);

  // First healthy provider paints the hero immediately. The complete merged
  // catalogue replaces it from cache without blocking the initial navigation.
  const { data: fastData, isLoading: fastLoading } = useQuery({
    queryKey: ["country-fast", slug, page, selectedGenre],
    queryFn: () =>
      selectedGenre
        ? movieApi
            .getFiltered({ country: slug, category: selectedGenre, page })
            .then((r) => r.data)
        : movieApi.getByCountryFast(slug, page).then((r) => r.data),
    initialData: initialFastData,
    initialDataUpdatedAt,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    placeholderData: undefined,
  });

  const { data: mergedData } = useQuery({
    queryKey: ["country", slug, page, selectedGenre],
    queryFn: () => movieApi.getByCountry(slug, page).then((r) => r.data),
    enabled: !selectedGenre && !!fastData && secondaryReady,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    placeholderData: undefined,
  });

  const mainData = useMemo(() => {
    const score = (payload: any) => {
      const items = payload?.data?.items || payload?.items || [];
      if (!Array.isArray(items)) return 0;
      const categorized = items.filter(
        (item: any) => Array.isArray(item?.category) && item.category.length > 0,
      ).length;
      return items.length + categorized * 2;
    };
    if (!mergedData) return fastData;
    if (!fastData) return mergedData;
    return score(mergedData) >= score(fastData) ? mergedData : fastData;
  }, [fastData, mergedData]);
  const mainLoading = fastLoading && !mainData;

  const films: FilmItem[] = useMemo(
    () => mainData?.data?.items || mainData?.items || [],
    [mainData],
  );

  // Instantly reset scroll to top (0px) on country slug switch
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as any });
    setHeroSeed(Math.random());
  }, [slug]);

  // Specific genre queries filtered by country with Instant Cache (Parallelized for Korea & China)
  const { data: page2Data, isLoading: page2Loading } = useQuery({
    queryKey: ["country-p2", slug],
    queryFn: () => movieApi.getByCountry(slug, 2).then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage && secondaryReady,
    placeholderData: (prev) => prev,
  });

  const { data: romanceData, isLoading: romanceLoading } = useQuery({
    queryKey: ["country-romance", slug],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: slug,
          category: "tinh-cam",
          page: 1,
          limit: 36,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage && secondaryReady,
    placeholderData: (prev) => prev,
  });

  const { data: actionData, isLoading: actionLoading } = useQuery({
    queryKey: ["country-action", slug],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: slug,
          category: "hanh-dong",
          page: 1,
          limit: 36,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage && secondaryReady,
    placeholderData: (prev) => prev,
  });

  const { data: coTrangData, isLoading: coTrangLoading } = useQuery({
    queryKey: ["country-cotrang", slug],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: slug,
          category: "co-trang",
          page: 1,
          limit: 36,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage && secondaryReady,
    placeholderData: (prev) => prev,
  });

  const { data: crimeData, isLoading: crimeLoading } = useQuery({
    queryKey: ["country-hinhsu", slug],
    queryFn: () =>
      movieApi
        .getFiltered({ country: slug, category: "hinh-su", page: 1, limit: 36 })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage && secondaryReady,
    placeholderData: (prev) => prev,
  });

  const { data: comedyData, isLoading: comedyLoading } = useQuery({
    queryKey: ["country-comedy", slug],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: slug,
          category: "hai-huoc",
          page: 1,
          limit: 36,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage && secondaryReady,
    placeholderData: (prev) => prev,
  });

  const { data: dramaData, isLoading: dramaLoading } = useQuery({
    queryKey: ["country-drama", slug],
    queryFn: () =>
      movieApi
        .getFiltered({ country: slug, category: "tam-ly", page: 1, limit: 36 })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage && secondaryReady,
    placeholderData: (prev) => prev,
  });

  const page2Films: FilmItem[] = useMemo(
    () => page2Data?.data?.items || page2Data?.items || [],
    [page2Data],
  );

  // Combined country catalogue pool for reliable fallback and full row population
  const combinedPool = useMemo(() => [...films, ...page2Films], [films, page2Films]);

function filmMatchesKeywords(f: FilmItem, keywords: string[]): boolean {
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

  const romanceFilms: FilmItem[] = useMemo(() => {
    const fromApi = romanceData?.data?.items || romanceData?.items;
    if (fromApi?.length) return fromApi;
    return combinedPool.filter((f) => filmMatchesKeywords(f, ["tình cảm", "lãng mạn"]));
  }, [romanceData, combinedPool]);

  const actionFilms: FilmItem[] = useMemo(() => {
    const fromApi = actionData?.data?.items || actionData?.items;
    if (fromApi?.length) return fromApi;
    return combinedPool.filter((f) => filmMatchesKeywords(f, ["hành động", "võ thuật"]));
  }, [actionData, combinedPool]);

  const coTrangFilms: FilmItem[] = useMemo(() => {
    const fromApi = coTrangData?.data?.items || coTrangData?.items;
    if (fromApi?.length) return fromApi;
    return combinedPool.filter((f) => filmMatchesKeywords(f, ["cổ trang", "thần thoại", "tiên hiệp"]));
  }, [coTrangData, combinedPool]);

  const crimeFilms: FilmItem[] = useMemo(() => {
    const fromApi = crimeData?.data?.items || crimeData?.items;
    if (fromApi?.length) return fromApi;
    return combinedPool.filter((f) => filmMatchesKeywords(f, ["hình sự", "trinh thám", "bí ẩn"]));
  }, [crimeData, combinedPool]);

  const comedyFilms: FilmItem[] = useMemo(() => {
    const fromApi = comedyData?.data?.items || comedyData?.items;
    if (fromApi?.length) return fromApi;
    return combinedPool.filter((f) => filmMatchesKeywords(f, ["hài hước", "gia đình"]));
  }, [comedyData, combinedPool]);

  const dramaFilms: FilmItem[] = useMemo(() => {
    const fromApi = dramaData?.data?.items || dramaData?.items;
    if (fromApi?.length) return fromApi;
    return combinedPool.filter((f) => filmMatchesKeywords(f, ["tâm lý", "chính kịch"]));
  }, [dramaData, combinedPool]);

  const totalItems =
    Number(mainData?.data?.params?.pagination?.totalItems) ||
    Number(mainData?.params?.pagination?.totalItems) ||
    Number(mainData?.pagination?.totalItems) ||
    Number(mainData?.data?.paginate?.total_items) ||
    undefined;

  const rawTotal =
    Number(mainData?.data?.params?.pagination?.totalPages) ||
    Number(mainData?.params?.pagination?.totalPages) ||
    Number(mainData?.pagination?.totalPages) ||
    Number(mainData?.paginate?.total_page) ||
    Number(mainData?.data?.paginate?.total_page) ||
    (totalItems
      ? Math.ceil(
          totalItems /
            (Number(mainData?.data?.params?.pagination?.totalItemsPerPage) ||
              Number(mainData?.params?.pagination?.totalItemsPerPage) ||
              24),
        )
      : undefined);

  const totalPages = Math.max(1, rawTotal || (films.length > 0 ? 1 : 1));

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/country/${slug}?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectGenre = (genreSlug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (genreSlug) {
      params.set("category", genreSlug);
    } else {
      params.delete("category");
    }
    params.set("page", "1");
    router.push(`/country/${slug}?${params.toString()}`);
  };

  const activeGenreLabel =
    GENRE_OPTIONS.find((g) => g.slug === selectedGenre)?.label || "Thể loại";

  // Independent row memoization prevents full-page Swiper thrashing on incremental query arrivals
  const row1Films = useMemo(
    () => dedupeFilmsList([...films, ...page2Films]).slice(0, 16),
    [films, page2Films],
  );

  const row2Films = useMemo(
    () => dedupeFilmsList(romanceFilms).slice(0, 16),
    [romanceFilms],
  );

  const row3Films = useMemo(
    () => dedupeFilmsList(coTrangFilms).slice(0, 16),
    [coTrangFilms],
  );

  const row4Films = useMemo(
    () => dedupeFilmsList(actionFilms).slice(0, 16),
    [actionFilms],
  );

  const row5Films = useMemo(
    () => dedupeFilmsList(crimeFilms).slice(0, 16),
    [crimeFilms],
  );

  const row6Films = useMemo(
    () => dedupeFilmsList(comedyFilms).slice(0, 16),
    [comedyFilms],
  );

  const row7Films = useMemo(
    () => dedupeFilmsList(dramaFilms).slice(0, 16),
    [dramaFilms],
  );

  const row8Films = useMemo(
    () => dedupeFilmsList([...page2Films, ...combinedPool]).slice(0, 16),
    [page2Films, combinedPool],
  );

  return (
    <div
      data-eager-hydration="true"
      className={cn(
        cardFont.className,
        "min-h-screen w-full bg-background text-foreground",
        isCustomHeroPage
          ? "-mt-20 sm:-mt-24 bg-[#07080c]"
          : "pb-20 pl-4 pr-4 pt-20 sm:pt-24 md:pr-10 lg:pl-24",
      )}
    >
      {/* ── CASE 1: KOREA & CHINA ONLY (Showcase with Curated Hero Banner & 8 Multi-Genre Rows) ── */}
      {isCustomHeroPage ? (
        <>
          {/* Curated Hero Banner */}
          {isKoreanPage ? (
            <AsianCuratedHeroBanner
              pool={CURATED_KOREAN_HERO_POOL}
              countryLabel="Hàn Quốc"
            />
          ) : (
            <AsianCuratedHeroBanner
              pool={CURATED_CHINESE_HERO_POOL}
              countryLabel="Trung Quốc"
            />
          )}

          {/* Curated Multi-Genre Rows (Tất cả Card dạng dọc chuẩn Poster 2:3, Đầy đủ 100%) */}
          <div className="relative z-20 pl-4 sm:pl-12 md:pl-20 lg:pl-24 pr-2 sm:pr-4 md:pr-6 pb-16 space-y-6 mt-3 sm:-mt-10 md:-mt-14 lg:-mt-16">
            {/* Row 1: Phim Mới & Đang Thịnh Hành */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? "Phim Hàn Quốc Mới & Đang Thịnh Hành"
                  : "Phim Trung Quốc Mới & Đang Thịnh Hành"
              }
              films={row1Films}
              isLoading={mainLoading}
              variant="standard"
            />

            {/* Row 2: Tình Cảm & Lãng Mạn */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? "Phim Tình Cảm & Lãng Mạn Hàn Quốc"
                  : "Ngôn Tình Hiện Đại & Lãng Mạn Hoa Ngữ"
              }
              films={row2Films}
              isLoading={mainLoading && !row2Films.length}
              variant="standard"
              defer
            />

            {/* Row 3: Cổ Trang & Thần Thoại */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? "Phim Cổ Trang & Vương Triều Hàn Quốc"
                  : "Cổ Trang Tiên Hiệp & Kiếm Hiệp Đỉnh Cao"
              }
              films={row3Films}
              isLoading={mainLoading && !row3Films.length}
              variant="standard"
              defer
            />

            {/* Row 4: Hành Động & Kịch Tính */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? "Phim Hành Động & Kịch Tính Hàn Quốc"
                  : "Phim Hành Động & Võ Thuật Trung Quốc"
              }
              films={row4Films}
              isLoading={mainLoading && !row4Films.length}
              variant="standard"
              defer
            />

            {/* Row 5: Hình Sự & Trinh Thám */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? "Phim Hình Sự, Trinh Thám & Phá Án"
                  : "Phim Hình Sự & Trinh Thám Hoa Ngữ"
              }
              films={row5Films}
              isLoading={mainLoading && !row5Films.length}
              variant="standard"
              defer
            />

            {/* Row 6: Hài Hước & Gia Đình */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? "Phim Hài Hước & Gia Đình Hàn Quốc"
                  : "Phim Hài Hước & Gia Đình Trung Quốc"
              }
              films={row6Films}
              isLoading={mainLoading && !row6Films.length}
              variant="standard"
              defer
            />

            {/* Row 7: Tâm Lý & Đời Thường */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? "Phim Tâm Lý & Đời Thường Hàn Quốc"
                  : "Phim Tâm Lý & Xã Hội Trung Quốc"
              }
              films={row7Films}
              isLoading={mainLoading && !row7Films.length}
              variant="standard"
              defer
            />

            {/* Row 8: Tuyển Chọn Đặc Sắc */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? "Phim Hàn Quốc Tuyển Chọn Đặc Sắc"
                  : "Phim Hoa Ngữ Tuyển Chọn Đặc Sắc"
              }
              films={row8Films}
              isLoading={mainLoading && !row8Films.length}
              variant="standard"
              defer
            />

            {/* Full Catalog Header */}
            <div className="mt-14 mb-8 pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-2">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                  {t("country_sections.allMoviesOf", "Tất Cả Phim")} {t(`countries_list.${slug}`, label)} {selectedGenre ? `• ${activeGenreLabel}` : ""}
                </h2>
                <p className="text-xs text-neutral-400 font-semibold mt-1">
                  {t("country_sections.curatedDescription", "Kho phim điện ảnh và series truyền hình chọn lọc sản xuất tại")}{" "}
                  {t(`countries_list.${slug}`, label)}
                </p>
              </div>
              <div className="text-xs font-bold text-neutral-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 self-start md:self-auto">
                {t("common.page", "Trang")} <span className="text-white font-extrabold">{page}</span> /{" "}
                {totalPages}
              </div>
            </div>

            {/* Full Catalog Grid */}
            {mainLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7">
                {Array.from({ length: 14 }).map((_, i) => (
                  <FilmCardSkeleton key={i} />
                ))}
              </div>
            ) : films.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7 cv-grid-auto">
                {dedupeFilmsList(films).map((f, idx) => (
                  <FilmCard key={`${f.slug || f._id || idx}-${idx}`} film={f} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-neutral-500 font-semibold text-sm">
                {t("search.noResults", "Chưa tìm thấy bộ phim nào phù hợp.")}
              </div>
            )}

            {/* Pagination Controls */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      ) : (
        /* ── CASE 2: ALL OTHER COUNTRIES (Clean Centered Catalog Header) ── */
        <div className="w-full">
          {/* Page Header — Centered */}
          <div className="flex flex-col items-center justify-center text-center mb-10 pb-6 border-b border-white/10 gap-2.5 max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Phim {t(`countries_list.${slug}`, label)}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 font-medium">
              Khám phá kho phim chọn lọc cập nhật liên tục hàng ngày
            </p>
            <div className="mt-1 text-xs font-mono font-bold text-neutral-300 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
              {t("common.page", "Trang")}{" "}
              <span className="text-white font-extrabold">{page}</span> /{" "}
              {totalPages}
            </div>
          </div>

          {/* Movie Grid */}
          {mainLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {Array.from({ length: 21 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : films.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 cv-grid-auto">
              {dedupeFilmsList(films).map((f, idx) => (
                <FilmCard
                  key={`${f.slug || f._id || idx}-${idx}`}
                  film={f}
                  priority={idx < 7}
                />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center rounded-2xl bg-[#161822] border border-white/[0.08] space-y-3">
              <p className="text-sm font-semibold text-neutral-400">
                {t("search.noResults", "Chưa tìm thấy bộ phim nào phù hợp.")}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={24}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
