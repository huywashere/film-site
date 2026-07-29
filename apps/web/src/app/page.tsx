"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  Info,
  TrendingUp,
  Clock,
  Tv,
  Clapperboard,
  AlertTriangle,
  Loader2,
  Sparkles,
  Zap,
  Ghost,
  Heart,
  Laugh,
} from "lucide-react";
import { movieApi, reviewsApi } from "@/lib/api";
import { useTmdb } from "@/hooks/useTmdb";
import { tmdbBackdrop } from "@/lib/tmdb";
import {
  FilmCard,
  FilmCardSkeleton,
  FilmItem,
  resolveImageUrl,
} from "@/components/film/FilmCard";
import { useTranslation } from "@/store/langStore";
import { motion, AnimatePresence } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import styled from "@emotion/styled";
import { cn } from "@/lib/utils";
import { ContinueWatchingRow } from "@/components/film/ContinueWatchingRow";
import { SmartRecommendationSection } from "@/components/film/SmartRecommendationSection";
import { Top10RankedRow } from "@/components/film/Top10RankedRow";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/free-mode";

// ── Emotion Styled Components ─────────────────────────────────────
const StyledSwiperContainer = styled.div`
  position: relative;

  .swiper {
    padding: 12px 12px 12px 4px;
  }

  .swiper-button-prev,
  .swiper-button-next {
    color: #ffffff !important;
    background: rgba(15, 18, 22, 0.8) !important;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8) !important;
    width: 44px !important;
    height: 90px !important;
    margin-top: 0 !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
    opacity: 0 !important;
    z-index: 30 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  &:hover .swiper-button-prev,
  &:hover .swiper-button-next {
    opacity: 1 !important;
  }

  .swiper-button-prev {
    left: 0 !important;
    right: auto !important;
    border-radius: 0 16px 16px 0 !important;
  }

  .swiper-button-next {
    right: 0 !important;
    left: auto !important;
    border-radius: 16px 0 0 16px !important;
  }

  .swiper-button-prev:hover,
  .swiper-button-next:hover {
    color: #ffffff !important;
    background: #e50914 !important;
    border-color: #e50914 !important;
    transform: translateY(-50%) scale(1.06) !important;
  }

  .swiper-button-disabled {
    opacity: 0 !important;
    pointer-events: none !important;
  }

  .swiper-button-prev::after,
  .swiper-button-next::after {
    font-size: 16px !important;
    font-weight: 900 !important;
  }
`;

// ── Netflix Hero Banner ───────────────────────────────────────────
function HeroBanner({ films }: { films: FilmItem[] }) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { t } = useTranslation();
  const featured = useMemo(() => films.slice(0, 6), [films]);

  useEffect(() => {
    if (featured.length < 2) return;

    let transitionTimer: ReturnType<typeof setTimeout> | undefined;
    const rotationTimer = setInterval(() => {
      setIsTransitioning(true);
      transitionTimer = setTimeout(() => {
        setCurrent((index) => (index + 1) % featured.length);
        setIsTransitioning(false);
      }, 300);
    }, 8000);

    return () => {
      clearInterval(rotationTimer);
      if (transitionTimer) clearTimeout(transitionTimer);
    };
  }, [featured.length]);

  const film = featured[current];
  const prevFilm = featured[current === 0 ? featured.length - 1 : current - 1];

  const { data: detailData } = useQuery({
    queryKey: ["hero-film-detail", film?.slug],
    queryFn: () => movieApi.getDetail(film!.slug).then((response) => response.data),
    enabled: !!film?.slug,
    staleTime: 10 * 60 * 1000,
  });

  // TMDB backdrop 1280px cho hero
  const filmDetail = detailData?.movie || detailData;
  const { bestBackdrop } = useTmdb({
    film: filmDetail,
    enabled: !!filmDetail,
    fetchCredits: false,
    fetchVideos: false,
  });
  const tmdbBackdropUrl = bestBackdrop
    ? tmdbBackdrop(bestBackdrop.file_path, "w1280")
    : null;

  if (!film) return null;

  const detail = detailData?.movie || detailData || {};
  const genres = Array.isArray(detail.category)
    ? detail.category.slice(0, 3)
    : [];
  const country = Array.isArray(detail.country)
    ? detail.country[0]?.name
    : undefined;
  const episode = detail.episode_current || film.episode_current;
  const description = String(detail.content || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  // Ưu tiên TMDB backdrop 1280px, fallback về KKPhim thumb
  const backdrop =
    tmdbBackdropUrl ||
    resolveImageUrl(film.thumb_url) ||
    resolveImageUrl(film.poster_url);
  const prevBackdrop = prevFilm
    ? resolveImageUrl(prevFilm.thumb_url) ||
      resolveImageUrl(prevFilm.poster_url)
    : null;

  // Keep Vietnamese titles readable instead of forcing a condensed display face.
  const nameLen = film.name.length;
  const titleFontSizeClass =
    nameLen > 55
      ? "text-2xl md:text-3xl lg:text-4xl"
      : nameLen > 32
        ? "text-3xl md:text-4xl lg:text-5xl"
        : "text-3xl md:text-5xl lg:text-6xl";

  return (
    <div className="relative h-[calc(100vh+100px)] min-h-[700px] w-full overflow-hidden bg-background">
      {/* Background Poster Image (Optimized CSS transitions, no JS animation library) */}
      <div className="absolute inset-0 w-full h-full">
        {/* Previous image layer for smooth crossfade */}
        {prevBackdrop && (
          <div
            className="absolute inset-0 w-full h-full will-change-opacity transition-opacity duration-700 ease-in-out"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transform: "translate3d(0, 0, 0)", // Force GPU acceleration
            }}
          >
            <NextImage
              src={prevBackdrop}
              alt={prevFilm?.name || ""}
              fill
              quality={90}
              sizes="100vw"
              className="object-cover object-center brightness-[0.7] dark:brightness-[0.7]"
              loading="lazy"
            />
          </div>
        )}

        {/* Current image layer */}
        {backdrop && (
          <div
            className="absolute inset-0 w-full h-full will-change-opacity transition-opacity duration-700 ease-in-out"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transform: "translate3d(0, 0, 0)", // Force GPU acceleration
            }}
          >
            <NextImage
              src={backdrop}
              alt={film.name}
              fill
              priority={current === 0}
              fetchPriority={current === 0 ? "high" : "auto"}
              quality={95}
              sizes="100vw"
              className="object-cover object-center brightness-[0.7] dark:brightness-[0.7]"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iOSIgdmlld0JveD0iMCAwIDE2IDkiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjkiIGZpbGw9IiMxMDE0MWEiLz48L3N2Zz4="
            />
          </div>
        )}
      </div>

      {/* Cinematic Gradient Masks - Combined into single layer for better performance */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, var(--background) 0%, rgba(var(--background-rgb), 0.7) 35%, transparent 65%),
            linear-gradient(to top, var(--background) 0%, rgba(var(--background-rgb), 0.95) 15%, rgba(var(--background-rgb), 0.6) 40%, transparent 100%),
            rgba(0, 0, 0, 0.05)
          `,
          willChange: "transform",
          transform: "translate3d(0, 0, 0)",
        }}
      />

      {/* Content Container */}
      <div className="absolute inset-0 z-20 flex items-end sm:items-center pb-36 sm:pb-0">
        <div className="w-full px-4 sm:pl-16 sm:pr-8 md:pl-24 md:pr-12">
          <div className="max-w-3xl">
            {/* Use CSS transitions instead of Framer Motion for text content */}
            <div
              key={current}
              className="flex flex-col space-y-4 md:space-y-5 animate-fade-in-up motion-reduce:animate-none"
              style={{
                animationDuration: "450ms",
                animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Clear release metadata */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-white/75 md:text-sm">
                <span className="rounded-md bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-black shadow-lg shadow-emerald-500/20">
                  Nổi bật
                </span>
                {film.year && <span>{film.year}</span>}
                {country && (
                  <>
                    <span className="text-white/30">|</span>
                    <span>{country}</span>
                  </>
                )}
                {episode && (
                  <>
                    <span className="text-white/30">|</span>
                    <span>{episode}</span>
                  </>
                )}
              </div>

              {/* Vietnamese-friendly title treatment */}
              <h1
                className={cn(
                  "max-w-3xl font-be-vietnam font-extrabold leading-[1.12] tracking-[-0.025em] text-white drop-shadow-2xl",
                  titleFontSizeClass,
                )}
              >
                {film.name}
              </h1>
              {film.origin_name && (
                <p className="-mt-2 text-sm font-semibold tracking-wide text-white/55 md:text-lg">
                  {film.origin_name}
                </p>
              )}

              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre: any) => (
                    <Link
                      key={genre.slug || genre.name}
                      href={genre.slug ? `/genre/${genre.slug}` : "#"}
                      className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-white/90 backdrop-blur-md transition-colors hover:bg-white/20"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Use the selected film's real synopsis when available. */}
              <p className="max-w-2xl text-sm font-medium leading-7 text-white/75 line-clamp-3 md:text-base">
                {description ||
                  t(
                    "home.heroDesc",
                    "Khám phá nội dung và bắt đầu xem bộ phim ngay hôm nay.",
                  )}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={`/watch/${film.slug}`}
                  className="flex items-center gap-2 rounded-full bg-blue-600 px-7 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:scale-[1.02]"
                >
                  <Play size={15} fill="currentColor" />
                  <span>Xem ngay</span>
                </Link>
                <Link
                  href={`/film/${film.slug}`}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white backdrop-blur-md transition-colors hover:bg-white/20"
                >
                  <Info size={15} />
                  <span>{t("home.details", "Chi tiết")}</span>
                </Link>
                <button
                  type="button"
                  aria-label="Tắt âm thanh"
                  title="Tắt âm thanh"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/20 text-white/80 backdrop-blur-md transition-colors hover:bg-white/15 hover:text-white"
                >
                  <VolumeX size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Running Thumbnail Indicators (Right Aligned, 6 Items, Sleek Thin Border & Sharp HD Images) */}
      <div className="absolute right-4 sm:right-8 md:right-12 bottom-6 sm:bottom-8 z-30 hidden sm:flex items-center gap-1.5 sm:gap-2">
        {featured.map((item, i) => {
          const thumbImg =
            resolveImageUrl(item.thumb_url) ||
            resolveImageUrl(item.poster_url) ||
            "";
          const isActive = i === current;
          return (
            <button
              key={item.slug || i}
              onClick={() => {
                setIsTransitioning(true);
                setCurrent(i);
                setTimeout(() => setIsTransitioning(false), 800);
              }}
              aria-label={`Switch to ${item.name}`}
              className={cn(
                "relative w-14 sm:w-16 md:w-20 lg:w-22 aspect-[16/9] rounded-md sm:rounded-lg overflow-hidden cursor-pointer flex-shrink-0 group",
                "transition-all duration-300 will-change-transform",
                isActive
                  ? "border-2 border-white scale-105 shadow-xl shadow-black/90 z-10"
                  : "border border-white/20 opacity-50 hover:opacity-100 hover:border-white/60 scale-95 hover:scale-100",
              )}
              style={{
                transform: isActive
                  ? "translate3d(0, 0, 0) scale(1.05)"
                  : "translate3d(0, 0, 0) scale(0.95)",
              }}
            >
              {thumbImg ? (
                <NextImage
                  src={thumbImg}
                  alt={item.name}
                  fill
                  quality={55}
                  sizes="(max-width: 640px) 56px, (max-width: 768px) 64px, 88px"
                  className="object-cover object-center"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-400 font-bold px-1 text-center truncate">
                  {item.name}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile dot indicators — shown only on small screens */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex sm:hidden items-center gap-1.5">
        {featured.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setIsTransitioning(true);
              setCurrent(i);
              setTimeout(() => setIsTransitioning(false), 800);
            }}
            aria-label={`Slide ${i + 1}`}
            className={cn(
              "rounded-full transition-all duration-300",
              i === current
                ? "w-5 h-1.5 bg-white"
                : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70",
            )}
          />
        ))}
      </div>

      {/* Scroll Down Indicator with Medium Soft Mouse Cursor Icon - Center Bottom */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-5 z-20 hidden sm:flex flex-col items-center gap-1.5 cursor-pointer group opacity-65 hover:opacity-100 transition-all duration-300"
        onClick={() =>
          window.scrollTo({
            top: window.innerHeight * 0.85,
            behavior: "smooth",
          })
        }
        title="Cuộn xuống để xem phim"
        style={{ willChange: "opacity" }}
      >
        {/* Animated Mouse Icon (Perfect mouse proportions: 22px x 34px) */}
        <div className="w-[22px] h-[34px] rounded-full border-2 border-white/60 flex justify-center pt-1.5 backdrop-blur-md bg-black/40 group-hover:border-white/90 group-hover:bg-black/60 transition-all">
          <div className="w-1 h-2 bg-white/80 group-hover:bg-white rounded-full animate-bounce" />
        </div>

        {/* Scroll Chevron Arrow */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/70 group-hover:text-white transform group-hover:translate-y-0.5 transition-all"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

// ── Lazy-render wrapper — only mounts children when visible in viewport ──
function LazySection({ children, height = 320 }: { children: React.ReactNode; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" }, // pre-load 200px before visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? children : <div style={{ minHeight: height }} />}
    </div>
  );
}

// ── Netflix Film Row ────────────────────────────────────────
function FilmSection({
  title,
  icon: Icon,
  films,
  isLoading,
  href,
}: {
  title: string;
  icon: React.ElementType;
  films: FilmItem[];
  isLoading: boolean;
  href: string;
}) {
  const { t } = useTranslation();

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative mb-10 md:mb-14"
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <h2
          className="text-xl md:text-2xl font-bold text-foreground flex items-center space-x-2 tracking-wide"
          style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
        >
          <Icon size={18} className="text-netflixRed" />
          <span>{title}</span>
        </h2>
        <Link
          href={href}
          className="text-xs text-neutral-400 hover:text-foreground font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors"
        >
          <span>{t("home.viewAll")}</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* Netflix Horizontal Row Slider using Swiper & Emotion */}
      <StyledSwiperContainer>
        <Swiper
          modules={[Navigation, FreeMode]}
          spaceBetween={16}
          slidesPerView="auto"
          navigation
          freeMode={true}
          className="mySwiper"
          lazy={{ loadPrevNext: true }}
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <SwiperSlide key={`skeleton-${i}`} style={{ width: "200px" }}>
                  <FilmCardSkeleton width={200} hideDetails={false} />
                </SwiperSlide>
              ))
            : films.slice(0, 12).map((film) => (
                <SwiperSlide key={film.slug} style={{ width: "200px" }}>
                  <FilmCard
                    film={film}
                    width={200}
                    variant="standard"
                    hideDetails={false}
                  />
                </SwiperSlide>
              ))}
        </Swiper>
      </StyledSwiperContainer>
    </motion.section>
  );
}

// Helper to deduplicate films by slug
const deduplicate = (films: FilmItem[]) => {
  const seen = new Set();
  return (films || []).filter((film) => {
    if (!film || !film.slug) return false;
    const isDuplicate = seen.has(film.slug);
    seen.add(film.slug);
    return !isDuplicate;
  });
};

// Helper to filter out slugs used in previous sections (cross-section dedup)
const excludeSlugs = (
  films: FilmItem[],
  usedSlugs: Set<string>,
): FilmItem[] => {
  return films.filter((f) => !usedSlugs.has(f.slug));
};

// Stable shuffle using a seed (changes each page load but stable within)
const shuffleArray = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ── Main Home Page ──────────────────────────────────────────
export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();

  const {
    data: latestData,
    isLoading: latestLoading,
    error: latestError,
  } = useQuery({
    queryKey: ["latest-v2", 1],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
  });

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ["series-v2", 1],
    queryFn: () => movieApi.getSeries(1).then((r) => r.data),
  });

  const { data: singleData, isLoading: singleLoading } = useQuery({
    queryKey: ["single-v2", 1],
    queryFn: () => movieApi.getSingle(1).then((r) => r.data),
  });

  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: ["anime-v2", 1],
    queryFn: () => movieApi.getAnime(1).then((r) => r.data),
  });

  // Phim Chiếu Rạp / Hot - uses search for 'vietsub' with latest filter
  const { data: hotData, isLoading: hotLoading } = useQuery({
    queryKey: ["hot-movies"],
    queryFn: () => movieApi.getLatest(2).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });

  // Phim Hành Động Kịch Tính
  const { data: actionData, isLoading: actionLoading } = useQuery({
    queryKey: ["action-movies"],
    queryFn: () => movieApi.getByGenre("hanh-dong", 1).then((r) => r.data),
  });

  // Phim Kinh Dị Rùng Rợn
  const { data: horrorData, isLoading: horrorLoading } = useQuery({
    queryKey: ["horror-movies"],
    queryFn: () => movieApi.getByGenre("kinh-di", 1).then((r) => r.data),
  });

  // Phim Tình Cảm Lãng Mạn
  const { data: romanceData, isLoading: romanceLoading } = useQuery({
    queryKey: ["romance-movies"],
    queryFn: () => movieApi.getByGenre("tinh-cam", 1).then((r) => r.data),
  });

  // Phim Hài Hước Vui Nhộn
  const { data: comedyData, isLoading: comedyLoading } = useQuery({
    queryKey: ["comedy-movies"],
    queryFn: () => movieApi.getByGenre("hai-huoc", 1).then((r) => r.data),
  });

  // Query random genres for diverse HeroBanner instead of just Marvel/DC
  const randomGenres = useMemo(() => {
    const genres = [
      "hanh-dong",
      "vien-tuong",
      "phieu-luu",
      "kinh-di",
      "hai-huoc",
      "tinh-cam",
    ];
    // Shuffle and pick 3 random genres
    const shuffled = [...genres].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  const { data: genre1Data, isLoading: genre1Loading } = useQuery({
    queryKey: ["hero-genre-1", randomGenres[0]],
    queryFn: () => movieApi.getByGenre(randomGenres[0], 1).then((r) => r.data),
    enabled: !!randomGenres[0],
  });

  const { data: genre2Data, isLoading: genre2Loading } = useQuery({
    queryKey: ["hero-genre-2", randomGenres[1]],
    queryFn: () => movieApi.getByGenre(randomGenres[1], 1).then((r) => r.data),
    enabled: !!randomGenres[1],
  });

  const { data: genre3Data, isLoading: genre3Loading } = useQuery({
    queryKey: ["hero-genre-3", randomGenres[2]],
    queryFn: () => movieApi.getByGenre(randomGenres[2], 1).then((r) => r.data),
    enabled: !!randomGenres[2],
  });

  const latestFilms = useMemo(
    () => deduplicate(latestData?.items || latestData?.data?.items || []),
    [latestData],
  );
  const seriesFilms = useMemo(
    () => deduplicate(seriesData?.data?.items || seriesData?.items || []),
    [seriesData],
  );
  const singleFilms = useMemo(
    () => deduplicate(singleData?.data?.items || singleData?.items || []),
    [singleData],
  );
  const animeFilms = useMemo(
    () => deduplicate(animeData?.data?.items || animeData?.items || []),
    [animeData],
  );

  const hotFilms = useMemo(
    () => deduplicate(hotData?.items || hotData?.data?.items || []),
    [hotData],
  );

  const actionFilms = useMemo(
    () => deduplicate(actionData?.data?.items || actionData?.items || []),
    [actionData],
  );

  const horrorFilms = useMemo(
    () => deduplicate(horrorData?.data?.items || horrorData?.items || []),
    [horrorData],
  );

  const romanceFilms = useMemo(
    () => deduplicate(romanceData?.data?.items || romanceData?.items || []),
    [romanceData],
  );

  const comedyFilms = useMemo(
    () => deduplicate(comedyData?.data?.items || comedyData?.items || []),
    [comedyData],
  );

  const genre1Films = useMemo(
    () => deduplicate(genre1Data?.data?.items || genre1Data?.items || []),
    [genre1Data],
  );
  const genre2Films = useMemo(
    () => deduplicate(genre2Data?.data?.items || genre2Data?.items || []),
    [genre2Data],
  );
  const genre3Films = useMemo(
    () => deduplicate(genre3Data?.data?.items || genre3Data?.items || []),
    [genre3Data],
  );

  // Combine random genre movies for a diverse banner pool
  const combinedBannerPool = useMemo(() => {
    const combined = [...genre1Films, ...genre2Films, ...genre3Films].filter(
      (f) => f && (f.thumb_url || f.poster_url),
    );
    return combined.length > 0 ? combined : latestFilms;
  }, [genre1Films, genre2Films, genre3Films, latestFilms]);

  // Show the hero as soon as the first usable response arrives instead of
  // waiting for every genre request and an additional client-side shuffle.
  const bannerFilms = combinedBannerPool;
  const showBannerSkeleton = bannerFilms.length === 0;

  if (latestError) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-xl">
        <div className="flex flex-col items-center justify-center space-y-4">
          <AlertTriangle size={48} className="text-netflixRed" />
          <h2 className="text-2xl font-bold text-white">
            {t("home.latestError", "Không thể tải dữ liệu phim")}
          </h2>
          <p className="text-neutral-400 text-sm">
            {t(
              "home.networkError",
              "Vui lòng thử lại sau hoặc kiểm tra kết nối mạng.",
            )}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-netflixRed text-white font-bold px-6 py-2.5 rounded hover:bg-[#C11119] transition-colors"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen text-foreground overflow-hidden pb-12 -mt-[100px]">
      {/* Hero Banner with slider */}
      {showBannerSkeleton ? (
        <div className="w-full h-[calc(100vh+100px)] min-h-[700px] bg-gradient-to-br from-neutral-950 via-[#10141a] to-neutral-900 animate-pulse" />
      ) : (
        <HeroBanner films={bannerFilms} />
      )}

      {/* Main Row Content — full layout spanning across available screen space */}
      <div className="w-full px-4 md:px-8 relative pt-6 md:pt-10 z-30">
        {/* Continue Watching Row */}
        <ContinueWatchingRow />
        {/* TOP 10 RANKED MOVIES (Metallic Numbers Netflix Style) */}
        <Top10RankedRow films={latestFilms} />
        {/* AI Smart Recommendation Engine */}
        <SmartRecommendationSection />
        {/* Topic Banners Section */}
        <TopicBannersSection />

        {/* Film sections — mỗi section dùng đúng nguồn data của nó */}
        <>
          <LazySection>
            <FilmSection
              title="Phim Mới Cập Nhật"
              icon={Clock}
              films={hotFilms.slice(0, 12)}
              isLoading={hotLoading}
              href="/films"
            />
          </LazySection>

          <LazySection>
            <FilmSection
              title={t("home.latest")}
              icon={TrendingUp}
              films={latestFilms.slice(0, 12)}
              isLoading={latestLoading}
              href="/films"
            />
          </LazySection>

          <LazySection>
            <FilmSection
              title="Phim Hành Động"
              icon={Zap}
              films={actionFilms.slice(0, 12)}
              isLoading={actionLoading}
              href="/genre/hanh-dong"
            />
          </LazySection>

          <LazySection>
            <FilmSection
              title={t("home.series")}
              icon={Tv}
              films={seriesFilms.slice(0, 12)}
              isLoading={seriesLoading}
              href="/films/series"
            />
          </LazySection>

          <LazySection>
            <FilmSection
              title="Phim Kinh Dị"
              icon={Ghost}
              films={horrorFilms.slice(0, 12)}
              isLoading={horrorLoading}
              href="/genre/kinh-di"
            />
          </LazySection>

          <LazySection>
            <FilmSection
              title={t("home.single")}
              icon={Clapperboard}
              films={singleFilms.slice(0, 12)}
              isLoading={singleLoading}
              href="/films/single"
            />
          </LazySection>

          <LazySection>
            <FilmSection
              title="Phim Tình Cảm"
              icon={Heart}
              films={romanceFilms.slice(0, 12)}
              isLoading={romanceLoading}
              href="/genre/tinh-cam"
            />
          </LazySection>

          <LazySection>
            <FilmSection
              title="Phim Hài Hước"
              icon={Laugh}
              films={comedyFilms.slice(0, 12)}
              isLoading={comedyLoading}
              href="/genre/hai-huoc"
            />
          </LazySection>

          <LazySection>
            <FilmSection
              title={t("home.anime")}
              icon={Sparkles}
              films={animeFilms.slice(0, 12)}
              isLoading={animeLoading}
              href="/films/anime"
            />
          </LazySection>
        </>
      </div>
    </div>
  );
}

// ── Topic Banners Section ──────────────────────────
function TopicBannersSection() {
  const topics = [
    {
      title: "DC",
      href: "/search?q=dc",
      image:
        "/images/zack-snyders-justice-league-dc-superheroes-dc-comics-2021-3840x2160-4980.jpg",
      description: "Khám phá thế giới siêu anh hùng DC nổi tiếng.",
    },
    {
      title: "Marvel",
      href: "/search?q=marvel",
      image: "/images/wp3533664-avengers-infinity-war-4k-wallpapers.jpg",
      description: "Khám phá bộ phim Marvel nổi bật.",
    },
    {
      title: "One Piece",
      href: "/films/anime",
      image: "/images/one-piece-season-15-3840x2160-22064.jpg",
      description: "Khám phá One Piece và những hành trình hải tặc kỳ ảo.",
    },
    {
      title: "Phim đang hot",
      href: "/search?q=hot",
      image: "/images/MV5BN2MyYjk2MWMtODMyZS00MDUyLW-8113-3732-1766460989.webp",
      description: "Xem những bộ phim đang gây sốt ngay lúc này.",
    },
    {
      title: "Cổ Trang",
      href: "/genre/co-trang",
      image: "/images/phim_co_trang_trung_quoc_50_573c11fea1.jpg",
      description:
        "Khám phá những siêu phẩm cổ trang Trung Quốc đầy kịch tính.",
    },
    {
      title: "Cày Phim Cuối Tuần",
      href: "/search?q=weekend",
      image: "/images/cinema-hall-with-red-seat-wide-white-screen.jpg",
      description:
        "Lên lịch xem phim cuối tuần với những suất chiếu đáng chú ý.",
    },
  ];

  return (
    <div className="mb-10">
      <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-4 px-1 select-none">
        Bạn đang quan tâm gì?
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 px-1">
        {topics.map((topic, i) => (
          <Link
            key={i}
            href={topic.href}
            className={`relative overflow-hidden rounded-[28px] p-4 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-3xl group cursor-pointer min-h-[220px] md:min-h-[260px] ${
              topic.image
                ? "bg-slate-900 shadow-slate-950/30 border border-white/10"
                : "bg-gradient-to-br from-slate-900 to-indigo-950 border border-white/10"
            }`}
            style={
              topic.image
                ? {
                    backgroundImage: `url('${topic.image}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {topic.image && (
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent group-hover:from-slate-950/80 group-hover:via-slate-950/25 transition-colors duration-300" />
            )}
            <div className="absolute inset-x-4 top-4 h-16 rounded-3xl bg-white/10 blur-sm" />
            <div className="relative z-10">
              <h4 className="text-base md:text-xl font-extrabold text-white leading-tight drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)] select-none break-words">
                {topic.title}
              </h4>
            </div>
            <div className="relative z-10 flex flex-col gap-2 text-[10px] uppercase tracking-[0.28em] transition-colors duration-300 md:text-[11px]">
              <span className="inline-flex items-center gap-2 font-semibold text-white/90 group-hover:text-white">
                <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                Xem chủ đề
              </span>
              <span className="text-xs text-white/70 max-w-[80%] leading-snug">
                {topic.description || "Khám phá bộ phim nổi bật."}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
