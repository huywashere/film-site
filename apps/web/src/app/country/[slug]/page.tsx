"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
} from "@/lib/curated-asian-hero";
import {
  getYoutubeTrailer,
  resolveTmdbHeroAssets,
  tmdbProfile,
} from "@/lib/tmdb";
import { cardFont } from "@/lib/fonts";
import { useTranslation } from "@/store/langStore";
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
}: {
  title: string;
  films: FilmItem[];
  isLoading: boolean;
  href?: string;
  variant?: "standard" | "landscape";
}) {
  const { t } = useTranslation();
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!isLoading && !films.length) return null;

  const cardWidth = variant === "landscape" ? 245 : 175;

  return (
    <div className="mb-8 group/row relative" aria-busy={isLoading}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg md:text-xl font-extrabold text-white">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="text-xs text-neutral-400 hover:text-white font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors"
          >
            <span>{t("home.viewAll", "Xem tất cả")}</span>
            <ChevronRight size={14} />
          </Link>
        )}
      </div>

      <div className="relative w-full overflow-hidden">
        {/* Left Overlay Arrow */}
        <button
          ref={prevRef}
          aria-label="Previous slide"
          className="absolute left-0 top-0 bottom-0 z-30 w-11 bg-black/75 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer disabled:hidden rounded-r-md"
        >
          <ChevronLeft size={30} strokeWidth={2.5} />
        </button>

        {/* Right Overlay Arrow */}
        <button
          ref={nextRef}
          aria-label="Next slide"
          className="absolute right-0 top-0 bottom-0 z-30 w-11 bg-black/75 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer disabled:hidden rounded-l-md"
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
          spaceBetween={14}
          slidesPerView="auto"
          freeMode={{ enabled: true, momentumRatio: 0.8 }}
          className="!py-2 !px-1 w-full"
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <SwiperSlide
                  key={`sk-${i}`}
                  style={{ width: `${cardWidth}px` }}
                >
                  <FilmCardSkeleton width={cardWidth} hideDetails={false} />
                </SwiperSlide>
              ))
            : films.map((film, idx) => (
                <SwiperSlide
                  key={`${film.slug || film._id || (film as any).id}-${idx}`}
                  style={{ width: `${cardWidth}px` }}
                >
                  <FilmCard
                    film={film}
                    width={cardWidth}
                    variant={variant}
                    hideDetails={false}
                  />
                </SwiperSlide>
              ))}
        </Swiper>
      </div>
    </div>
  );
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
  fallbackLocal,
}: {
  item: AsianHeroItem;
  fallbackLocal: string;
}) {
  const candidates = useMemo(() => {
    return [
      item.thumb_url,
      item.poster_url,
      fallbackLocal,
      "/images/wp3533664-avengers-infinity-war-4k-wallpapers.jpg",
    ].filter(Boolean) as string[];
  }, [item.poster_url, item.thumb_url, fallbackLocal]);

  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [item.slug]);

  const src = candidates[candidateIdx] || fallbackLocal;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`${item.slug}-${candidateIdx}`}
      src={src}
      alt={item.name}
      referrerPolicy="no-referrer"
      loading="eager"
      decoding="async"
      fetchPriority="high"
      onError={() => {
        if (candidateIdx < candidates.length - 1) {
          setCandidateIdx((i) => i + 1);
        }
      }}
      className="absolute inset-0 w-full h-full object-cover object-center md:object-right brightness-[0.95] transition-opacity duration-700 animate-in fade-in"
    />
  );
}

function AsianCuratedHeroBanner({
  pool,
  countryLabel,
  fallbackLocal,
}: {
  pool: AsianHeroItem[];
  countryLabel: string;
  fallbackLocal: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const curatedList = pool;

  // Auto slide every 7 seconds with forward glide
  useEffect(() => {
    if (curatedList.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % curatedList.length);
      setLogoFailed(false);
    }, 7000);
    return () => clearInterval(interval);
  }, [curatedList.length, isPaused]);

  const currentItem = curatedList[currentIndex] || curatedList[0];

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % curatedList.length);
    setLogoFailed(false);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex(
      (prev) => (prev - 1 + curatedList.length) % curatedList.length,
    );
    setLogoFailed(false);
  };

  const handleGoTo = (idx: number) => {
    setDirection(idx >= currentIndex ? 1 : -1);
    setCurrentIndex(idx);
    setLogoFailed(false);
  };

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full min-h-[680px] sm:min-h-[760px] lg:min-h-[840px] h-[92vh] sm:h-[96vh] lg:h-[100vh] max-h-[1080px] overflow-hidden bg-[#141414] select-none"
    >
      {/* ── High Resolution Dynamic Backdrop with Right-to-Left Gliding Motion ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentItem.slug || currentItem._id || currentIndex}
            custom={direction}
            initial={{
              x: direction > 0 ? "5%" : "-5%",
              opacity: 0,
              scale: 1.04,
            }}
            animate={{
              x: "0%",
              opacity: 1,
              scale: 1,
            }}
            exit={{
              x: direction > 0 ? "-5%" : "5%",
              opacity: 0,
              scale: 0.98,
            }}
            transition={{
              duration: 0.9,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute inset-0 w-full h-full"
          >
            <ResilientAsianHeroBackdrop
              item={currentItem}
              fallbackLocal={fallbackLocal}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Cinematic Multi-layer Gradient Overlays for Vignette & Bottom Blending ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, rgba(16,16,16,0.94) 0%, rgba(16,16,16,0.65) 38%, rgba(16,16,16,0.1) 68%, transparent 100%),
            linear-gradient(to top, #141414 0%, rgba(20,20,20,0.7) 18%, transparent 45%),
            linear-gradient(to bottom, rgba(16,16,16,0.6) 0%, transparent 22%)
          `,
        }}
      />

      {/* ── Left Content Overlay with Counter-Parallax (Moves in Opposite Direction: Left-to-Right) ── */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 sm:px-14 md:px-20 lg:px-24">
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
            className="max-w-2xl space-y-4 sm:space-y-5 pt-8"
          >
            {/* Official Title Logo PNG or Calligraphy Title */}
            {currentItem.logoUrl && !logoFailed ? (
              <div className="relative w-64 sm:w-80 md:w-[440px] h-20 sm:h-28">
                <NextImage
                  src={currentItem.logoUrl}
                  alt={currentItem.name}
                  fill
                  className="object-contain object-left drop-shadow-[0_10px_25px_rgba(0,0,0,0.95)]"
                  unoptimized
                  onError={() => setLogoFailed(true)}
                />
              </div>
            ) : (
              <h1
                className="text-4xl sm:text-6xl md:text-7xl font-bold text-white tracking-wide leading-tight drop-shadow-[0_8px_20px_rgba(0,0,0,0.95)]"
                style={{
                  fontFamily: "'Playfair Display', 'Dancing Script', Georgia, serif",
                  fontStyle: "italic",
                }}
              >
                {currentItem.calligraphyTitle || currentItem.name}
              </h1>
            )}

            {/* Subtitle / Vietnamese or English name */}
            <p className="text-xs sm:text-sm text-neutral-300 font-semibold italic -mt-2 drop-shadow">
              {currentItem.name} {currentItem.origin_name ? `(${currentItem.origin_name})` : ""}
            </p>

            {/* Metadata Row: TOP 10 | Year | Country | Total Episodes */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-neutral-200">
              {currentItem.topBadge && (
                <span className="bg-gradient-to-r from-red-600 to-amber-600 text-white font-extrabold text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded font-mono shadow-md uppercase tracking-wider">
                  {currentItem.topBadge}
                </span>
              )}
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
              {currentItem.quality && (
                <>
                  <span className="text-neutral-400">|</span>
                  <span className="text-amber-400 font-bold">{currentItem.quality}</span>
                </>
              )}
            </div>

            {/* Genre Tags */}
            {currentItem.genres && currentItem.genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {currentItem.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 rounded bg-neutral-800/90 text-neutral-200 text-[11px] sm:text-xs font-semibold border border-white/10"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* 2-line Description */}
            <p className="text-xs sm:text-sm text-neutral-300 font-normal line-clamp-3 leading-relaxed drop-shadow max-w-lg pt-1">
              {currentItem.content}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                href={`/watch/${currentItem.slug}`}
                className="inline-flex items-center gap-2.5 bg-white hover:bg-neutral-200 text-black font-extrabold px-8 py-3 rounded-md text-sm sm:text-base transition-all hover:scale-105 active:scale-95 shadow-2xl cursor-pointer"
              >
                <Play size={18} fill="currentColor" className="ml-0.5" />
                <span>Xem Ngay</span>
              </Link>
              <Link
                href={`/film/${currentItem.slug}`}
                className="inline-flex items-center gap-2 bg-[#6d6d6e]/80 hover:bg-[#6d6d6e] text-white font-bold px-7 py-3 rounded-md text-sm sm:text-base transition-all cursor-pointer active:scale-95 shadow-lg"
              >
                <Info size={18} />
                <span>Chi Tiết</span>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Left / Right Carousel Navigation Arrows ── */}
      {curatedList.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Slide trước"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer shadow-2xl"
          >
            <ChevronLeft size={22} />
          </button>

          <button
            onClick={handleNext}
            aria-label="Slide tiếp theo"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer shadow-2xl"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* ── Bottom Right Pagination Dots ── */}
      {curatedList.length > 1 && (
        <div className="absolute right-6 sm:right-14 bottom-32 sm:bottom-44 z-30 flex items-center gap-2">
          {curatedList.map((item, idx) => (
            <button
              key={item._id || item.slug || idx}
              onClick={() => handleGoTo(idx)}
              aria-label={`Chuyển đến phim ${item.name}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                idx === currentIndex
                  ? "w-7 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                  : "w-1.5 bg-white/30 hover:bg-white/60",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}



export default function CountryPage() {
  const params = useParams();
  const router = useRouter();
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

  const [heroSeed, setHeroSeed] = useState(() => Math.random());

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
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    placeholderData: undefined,
  });

  const { data: mergedData } = useQuery({
    queryKey: ["country", slug, page, selectedGenre],
    queryFn: () => movieApi.getByCountry(slug, page).then((r) => r.data),
    enabled: !selectedGenre && !!fastData,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    placeholderData: undefined,
  });

  const mainData = mergedData || fastData;
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
    enabled: isCustomHeroPage,
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
          limit: 18,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage,
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
          limit: 18,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage,
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
          limit: 18,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage,
    placeholderData: (prev) => prev,
  });

  const { data: crimeData, isLoading: crimeLoading } = useQuery({
    queryKey: ["country-hinhsu", slug],
    queryFn: () =>
      movieApi
        .getFiltered({ country: slug, category: "hinh-su", page: 1, limit: 18 })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage,
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
          limit: 20,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage,
    placeholderData: (prev) => prev,
  });

  const { data: dramaData, isLoading: dramaLoading } = useQuery({
    queryKey: ["country-drama", slug],
    queryFn: () =>
      movieApi
        .getFiltered({ country: slug, category: "tam-ly", page: 1, limit: 20 })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isCustomHeroPage,
    placeholderData: (prev) => prev,
  });

  const page2Films: FilmItem[] = useMemo(
    () => page2Data?.data?.items || page2Data?.items || [],
    [page2Data],
  );

  // Instant in-memory genre partition fallback so rows display immediately
  const combinedPool = useMemo(() => [...films, ...page2Films], [films, page2Films]);

  const romanceFilms: FilmItem[] = useMemo(() => {
    const fromApi = romanceData?.data?.items || romanceData?.items;
    if (fromApi?.length) return fromApi;
    return combinedPool.filter((f) =>
      JSON.stringify(f).toLowerCase().includes("tình cảm") ||
      JSON.stringify(f).toLowerCase().includes("lãng mạn")
    );
  }, [romanceData, combinedPool]);

  const actionFilms: FilmItem[] = useMemo(() => {
    const fromApi = actionData?.data?.items || actionData?.items;
    if (fromApi?.length) return fromApi;
    return combinedPool.filter((f) =>
      JSON.stringify(f).toLowerCase().includes("hành động") ||
      JSON.stringify(f).toLowerCase().includes("võ thuật")
    );
  }, [actionData, combinedPool]);

  const coTrangFilms: FilmItem[] = useMemo(() => {
    const fromApi = coTrangData?.data?.items || coTrangData?.items;
    if (fromApi?.length) return fromApi;
    return combinedPool.filter((f) =>
      JSON.stringify(f).toLowerCase().includes("cổ trang") ||
      JSON.stringify(f).toLowerCase().includes("thần thoại") ||
      JSON.stringify(f).toLowerCase().includes("tiên hiệp")
    );
  }, [coTrangData, combinedPool]);

  const crimeFilms: FilmItem[] = useMemo(() => {
    const fromApi = crimeData?.data?.items || crimeData?.items;
    if (fromApi?.length) return fromApi;
    return combinedPool.filter((f) =>
      JSON.stringify(f).toLowerCase().includes("hình sự") ||
      JSON.stringify(f).toLowerCase().includes("trinh thám") ||
      JSON.stringify(f).toLowerCase().includes("bí ẩn")
    );
  }, [crimeData, combinedPool]);

  const comedyFilms: FilmItem[] = useMemo(() => {
    const fromApi = comedyData?.data?.items || comedyData?.items;
    if (fromApi?.length) return fromApi;
    return combinedPool.filter((f) =>
      JSON.stringify(f).toLowerCase().includes("hài hước") ||
      JSON.stringify(f).toLowerCase().includes("gia đình")
    );
  }, [comedyData, combinedPool]);

  const dramaFilms: FilmItem[] = useMemo(() => {
    const fromApi = dramaData?.data?.items || dramaData?.items;
    if (fromApi?.length) return fromApi;
    return combinedPool.filter((f) =>
      JSON.stringify(f).toLowerCase().includes("tâm lý") ||
      JSON.stringify(f).toLowerCase().includes("chính kịch")
    );
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

  // Prepare 100% Unique non-repeating dynamic lists for each Netflix row
  const globalSeenSlugs = new Set<string>();
  const row1Films = dedupeFilmsList(
    shuffleArray(films, heroSeed),
    globalSeenSlugs,
  ).slice(0, 14);
  const row2Films = dedupeFilmsList(
    shuffleArray(romanceFilms, heroSeed + 1),
    globalSeenSlugs,
  ).slice(0, 14);
  const row3Films = dedupeFilmsList(
    shuffleArray(page2Films.length ? page2Films : films.slice(6), heroSeed + 2),
    globalSeenSlugs,
  ).slice(0, 14);
  const row4Films = dedupeFilmsList(
    shuffleArray(actionFilms, heroSeed + 3),
    globalSeenSlugs,
  ).slice(0, 14);
  const row5Films = dedupeFilmsList(
    shuffleArray(coTrangFilms, heroSeed + 4),
    globalSeenSlugs,
  ).slice(0, 14);
  const row6Films = dedupeFilmsList(
    shuffleArray(comedyFilms, heroSeed + 5),
    globalSeenSlugs,
  ).slice(0, 14);
  const row7Films = dedupeFilmsList(
    shuffleArray(crimeFilms, heroSeed + 6),
    globalSeenSlugs,
  ).slice(0, 14);
  const row8Films = dedupeFilmsList(
    shuffleArray(dramaFilms, heroSeed + 7),
    globalSeenSlugs,
  ).slice(0, 14);

  return (
    <div
      className={cn(
        cardFont.className,
        "min-h-screen w-full bg-background text-foreground",
        isCustomHeroPage
          ? "-mt-20 sm:-mt-24 bg-[#141414]"
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
              fallbackLocal="/images/wp4300709-avengers-4k-wallpapers.jpg"
            />
          ) : (
            <AsianCuratedHeroBanner
              pool={CURATED_CHINESE_HERO_POOL}
              countryLabel="Trung Quốc"
              fallbackLocal="/images/phim_co_trang_trung_quoc_50_573c11fea1.jpg"
            />
          )}

          {/* Curated Multi-Genre Rows */}
          <div className="relative z-20 pl-4 sm:pl-12 md:pl-20 lg:pl-24 pr-2 sm:pr-4 md:pr-6 pb-16 space-y-6 -mt-24 sm:-mt-36 lg:-mt-48">
            {/* Row 1: Phim Thịnh Hành */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? t("country_sections.koreanTrending", "Phim Hàn Quốc Đang Thịnh Hành")
                  : "Phim Trung Quốc Đang Thịnh Hành"
              }
              films={row1Films}
              isLoading={mainLoading}
              variant="landscape"
            />

            {/* Row 2: Tình Cảm & Lãng Mạn */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? t("country_sections.koreanRomance", "Tuyệt phẩm K-Drama lãng mạn khiến trái tim tan chảy")
                  : "Ngôn Tình & Lãng Mạn Hoa Ngữ Ngọt Ngào"
              }
              films={row2Films}
              isLoading={romanceLoading}
            />

            {/* Row 3: Tuyển chọn đặc sắc */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? "Khám Phá K-Drama Đặc Sắc Tuyển Chọn"
                  : "Khám Phá Phim Hoa Ngữ Tuyển Chọn"
              }
              films={row3Films}
              isLoading={page2Loading || mainLoading}
              variant="landscape"
            />

            {/* Row 4: Hành Động & Kịch Tính */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? t("country_sections.koreanThriller", "Series Phim Hàn kịch tính & giật gân đáng xem liên tục")
                  : "Phim Hành Động & Quyền Mưu Gay Cấn"
              }
              films={row4Films}
              isLoading={actionLoading}
              variant="landscape"
            />

            {/* Row 5: Cổ Trang & Thần Thoại */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? t("country_sections.koreanHistorical", "Phim Hàn Cổ Trang & Thần Thoại Kỳ Ảo Đỉnh Cao")
                  : "Cổ Trang Tiên Hiệp & Kiếm Hiệp Đỉnh Cao"
              }
              films={row5Films}
              isLoading={coTrangLoading}
            />

            {/* Row 6: Hài Hước & Giải Trí */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? t("country_sections.koreanComedy", "Phim Hàn Hài Hước & Giải Trí Sảng Khoái")
                  : "Phim Hài Hước & Gia Đình Trung Quốc"
              }
              films={row6Films}
              isLoading={comedyLoading}
              variant="landscape"
            />

            {/* Row 7: Hình Sự & Trinh Thám */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? t("country_sections.koreanCrime", "Phim Hàn Hình Sự, Trinh Thám & Phá Án Hồi Hộp")
                  : "Phim Hình Sự, Trinh Thám & Phá Án Hoa Ngữ"
              }
              films={row7Films}
              isLoading={crimeLoading}
            />

            {/* Row 8: Tâm Lý & Đời Thường */}
            <CountryCategoryRow
              title={
                isKoreanPage
                  ? t("country_sections.koreanDrama", "Top Phim Tâm Lý & Đời Thường Chạm Đến Cảm Xúc")
                  : "Phim Tâm Lý & Đời Thường Trung Quốc"
              }
              films={row8Films}
              isLoading={dramaLoading}
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7">
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 18 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : films.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {dedupeFilmsList(films).map((f, idx) => (
                <FilmCard
                  key={`${f.slug || f._id || idx}-${idx}`}
                  film={f}
                  priority={idx < 6}
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
