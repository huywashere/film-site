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
  ChevronDown,
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
  Film,
  X,
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
    padding: 12px 56px 12px 4px;
  }

  .swiper-button-prev,
  .swiper-button-next {
    color: #9ca3af !important;
    background: #202430 !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7) !important;
    width: 42px !important;
    height: 72px !important;
    border-radius: 14px !important;
    margin-top: 0 !important;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
    opacity: 0.9 !important;
    z-index: 30 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    right: 4px !important;
    left: auto !important;
  }

  /* Top button: Next (>) */
  .swiper-button-next {
    top: calc(50% - 40px) !important;
    transform: translateY(-50%) !important;
  }

  /* Bottom button: Prev (<) */
  .swiper-button-prev {
    top: calc(50% + 40px) !important;
    transform: translateY(-50%) !important;
  }

  .swiper-button-prev:hover,
  .swiper-button-next:hover {
    color: #ffffff !important;
    background: #2e3648 !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
    opacity: 1 !important;
    transform: translateY(-50%) scale(1.05) !important;
  }

  .swiper-button-disabled {
    opacity: 0.3 !important;
    cursor: not-allowed !important;
  }

  .swiper-button-prev::after,
  .swiper-button-next::after {
    font-size: 15px !important;
    font-weight: 800 !important;
  }
`;

// ── Netflix Hero Banner ───────────────────────────────────────────
function HeroBanner({ films }: { films: FilmItem[] }) {
  const { t } = useTranslation();
  const featured = useMemo(() => {
    return deduplicate(films).slice(0, 6);
  }, [films]);

  const [current, setCurrent] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Parallax scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (featured.length < 2) return;
    const rotationTimer = setInterval(() => {
      setCurrent((index) => (index + 1) % featured.length);
    }, 8000);
    return () => clearInterval(rotationTimer);
  }, [featured.length]);

  const film = featured[current];

  // Fetch detail data with high staleTime so slide switching has 0ms delay
  const { data: detailData } = useQuery({
    queryKey: ["hero-film-detail", film?.slug],
    queryFn: () =>
      movieApi.getDetail(film!.slug).then((response) => response.data),
    enabled: !!film?.slug,
    staleTime: 10 * 60 * 1000,
  });

  const filmDetail = detailData?.movie || detailData;
  const { bestBackdrop, tmdbData } = useTmdb({
    film: filmDetail,
    enabled: !!filmDetail,
    fetchCredits: false,
    fetchVideos: true,
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

  const backdrop =
    tmdbBackdropUrl ||
    resolveImageUrl(film.thumb_url) ||
    resolveImageUrl(film.poster_url);

  // Calculate parallax opacity and scale based on scroll position
  const heroOpacity = Math.max(0, 1 - scrollY / 600);
  const heroScale = 1 + scrollY * 0.0003;

  // Search trailer key from TMDB or YouTube query
  const trailerVideo = tmdbData?.videos?.results?.find(
    (v: any) =>
      v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
  );
  const youtubeTrailerUrl = trailerVideo?.key
    ? `https://www.youtube.com/embed/${trailerVideo.key}?autoplay=1&mute=0`
    : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(film.name + " trailer vietsub")}&autoplay=1`;

  const nameLen = film.name.length;
  const titleFontSizeClass =
    nameLen > 55
      ? "text-2xl md:text-3xl lg:text-4xl"
      : nameLen > 32
        ? "text-3xl md:text-4xl lg:text-5xl"
        : "text-3xl md:text-5xl lg:text-6xl";

  return (
    <div className="relative h-[calc(100vh+100px)] min-h-[700px] w-full overflow-hidden bg-background">
      {/* Background Poster Image with Parallax & Smooth Framer Motion Crossfade */}
      <div
        className="absolute inset-0 w-full h-full transition-transform duration-100 ease-out"
        style={{
          transform: `scale(${heroScale})`,
          opacity: heroOpacity,
        }}
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={film.slug}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 w-full h-full"
          >
            {backdrop && (
              <NextImage
                src={backdrop}
                alt={film.name}
                fill
                priority={current === 0}
                quality={90}
                sizes="100vw"
                className="object-cover object-center brightness-[0.75]"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Cinematic Gradient Masks - Deep Dark Vignette */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, var(--background) 0%, rgba(var(--background-rgb), 0.8) 40%, transparent 70%),
            linear-gradient(to top, var(--background) 0%, rgba(var(--background-rgb), 0.95) 20%, transparent 100%)
          `,
        }}
      />

      {/* Content Container with Zero Layout Shift */}
      <div
        className="absolute inset-0 z-20 flex items-end sm:items-center pb-36 sm:pb-0 transition-opacity duration-300"
        style={{ opacity: heroOpacity }}
      >
        <div className="w-full px-4 sm:pl-16 sm:pr-8 md:pl-24 md:pr-12">
          <div className="max-w-3xl min-h-[380px] flex flex-col justify-end">
            <AnimatePresence mode="wait">
              <motion.div
                key={film.slug}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col space-y-4 md:space-y-5"
              >
                {/* Release Metadata */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-white/75 md:text-sm min-h-[28px]">
                  <span className="rounded-md bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white border border-white/20 backdrop-blur-md">
                    NỔI BẬT
                  </span>
                  {film.year && (
                    <span className="text-white/80">{film.year}</span>
                  )}
                  {country && (
                    <>
                      <span className="text-white/30">|</span>
                      <span className="text-white/80">{country}</span>
                    </>
                  )}
                  {episode && (
                    <>
                      <span className="text-white/30">|</span>
                      <span className="text-white/80">{episode}</span>
                    </>
                  )}
                </div>

                {/* Title Container - Reserved Height Eliminates Jumping */}
                <div className="min-h-[3.5rem] sm:min-h-[4.5rem] flex flex-col justify-center">
                  <h1
                    className={cn(
                      "max-w-3xl font-be-vietnam font-extrabold leading-[1.12] tracking-[-0.025em] text-white drop-shadow-2xl",
                      titleFontSizeClass,
                    )}
                  >
                    {film.name}
                  </h1>
                  {film.origin_name && (
                    <p className="mt-1 text-sm font-semibold tracking-wide text-white/60 md:text-lg">
                      {film.origin_name}
                    </p>
                  )}
                </div>

                {/* Genre Pills Container */}
                <div className="min-h-[28px] flex flex-wrap gap-2 items-center">
                  {genres.map((genre: any) => (
                    <Link
                      key={genre.slug || genre.name}
                      href={genre.slug ? `/genre/${genre.slug}` : "#"}
                      className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white/15 hover:text-white"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>

                {/* Synopsis Container with Line Clamp */}
                <div className="min-h-[4.2rem] max-w-2xl">
                  <p className="text-sm font-medium leading-7 text-neutral-300 line-clamp-3 md:text-base">
                    {description ||
                      "Khám phá nội dung và bắt đầu xem bộ phim ngay hôm nay."}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={`/watch/${film.slug}`}
                    className="flex items-center gap-2 rounded-full bg-white hover:bg-neutral-200 text-black font-black px-7 py-3.5 text-xs uppercase tracking-wider shadow-2xl transition-all hover:scale-[1.03] active:scale-95 cursor-pointer"
                  >
                    <Play size={16} fill="currentColor" />
                    <span>XEM NGAY</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setShowTrailer(true)}
                    className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3.5 text-xs uppercase tracking-wider backdrop-blur-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <Film size={16} className="text-white/80" />
                    <span>XEM TRAILER</span>
                  </button>

                  <Link
                    href={`/film/${film.slug}`}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 hover:bg-white/10 text-white/90 font-bold px-6 py-3.5 text-xs uppercase tracking-wider backdrop-blur-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <Info size={16} className="text-white/70" />
                    <span>{t("home.details", "Chi tiết")}</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Running Thumbnail Indicators */}
      <div className="absolute right-4 sm:right-8 md:right-12 bottom-8 z-30 hidden sm:flex items-center gap-2">
        {featured.map((item, i) => {
          const thumbImg =
            resolveImageUrl(item.thumb_url) ||
            resolveImageUrl(item.poster_url) ||
            "";
          const isActive = i === current;
          return (
            <button
              key={item.slug || i}
              onClick={() => setCurrent(i)}
              aria-label={`Switch to ${item.name}`}
              className={cn(
                "relative w-16 sm:w-20 md:w-24 aspect-[16/9] rounded-lg overflow-hidden cursor-pointer flex-shrink-0 group",
                "transition-all duration-300 will-change-transform",
                isActive
                  ? "border-2 border-white scale-105 shadow-2xl z-10"
                  : "border border-white/20 opacity-50 hover:opacity-100 hover:border-white/60 scale-95 hover:scale-100",
              )}
            >
              {thumbImg ? (
                <NextImage
                  src={thumbImg}
                  alt={item.name}
                  fill
                  quality={65}
                  sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
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

      {/* Mobile dot indicators */}
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
                ? "w-6 h-1.5 bg-white shadow-sm"
                : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70",
            )}
          />
        ))}
      </div>

      {/* Scroll Down Indicator - Minimalist Dark Outline */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-5 z-20 hidden sm:flex flex-col items-center gap-1.5 cursor-pointer group transition-all duration-300 opacity-60 hover:opacity-100"
        onClick={() =>
          window.scrollTo({
            top: window.innerHeight * 0.88,
            behavior: "smooth",
          })
        }
        title="Cuộn xuống để xem phim"
      >
        <div className="w-[22px] h-[34px] rounded-full border-2 border-white/40 flex justify-center pt-1.5 backdrop-blur-md bg-black/40 group-hover:border-white/80 group-hover:bg-black/60 transition-all">
          <div className="w-1 h-2 bg-white/70 group-hover:bg-white rounded-full animate-bounce" />
        </div>
        <ChevronDown
          size={16}
          className="text-white/60 group-hover:text-white transform group-hover:translate-y-0.5 transition-all"
        />
      </div>

      {/* Trailer Video Modal Popup */}
      {showTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-8 animate-fade-in">
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-lg"
            >
              <X size={20} />
            </button>
            <iframe
              src={youtubeTrailerUrl}
              title={`Trailer ${film.name}`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lazy-render wrapper — only mounts children when visible in viewport ──
function LazySection({
  children,
  height = 320,
}: {
  children: React.ReactNode;
  height?: number;
}) {
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
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

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

      {/* Main Row: Swiper on left, Stacked Navigation Buttons Column OUTSIDE on right */}
      <div className="flex items-stretch gap-3.5">
        <div className="flex-1 min-w-0 overflow-hidden">
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
            slidesPerGroup={3}
            spaceBetween={16}
            slidesPerView="auto"
            freeMode={{ enabled: true, momentumRatio: 0.8 }}
            className="!py-2 !px-1"
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
        </div>

        {/* Minimalist Navigation Buttons Column (Không màu, không bo viền) */}
        <div className="hidden sm:flex flex-col justify-center gap-3 shrink-0 px-1">
          <button
            ref={nextRef}
            aria-label="Next slide"
            className="p-2 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronRight size={28} strokeWidth={2.5} />
          </button>
          <button
            ref={prevRef}
            aria-label="Previous slide"
            className="p-2 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
        </div>
      </div>
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

  const { data: usUkData } = useQuery({
    queryKey: ["hero-us-uk-blockbusters"],
    queryFn: () => movieApi.getByCountry("au-my", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  const { data: marvelHeroData } = useQuery({
    queryKey: ["hero-marvel-blockbusters"],
    queryFn: () => movieApi.search("Marvel", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

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

  // US/UK Blockbuster Hero Banner Pool (prioritizing Âu Mỹ & High-Res posters, strictly zero duplicates)
  const combinedBannerPool = useMemo(() => {
    const usUkList = deduplicate(
      usUkData?.data?.items || usUkData?.items || [],
    );
    const marvelList = deduplicate(
      marvelHeroData?.data?.items || marvelHeroData?.items || [],
    );
    const singleList = deduplicate(
      singleData?.data?.items || singleData?.items || [],
    );

    const rawPool = [
      ...usUkList,
      ...marvelList,
      ...singleList.filter(
        (f) =>
          f &&
          !f.slug?.includes("trung-quoc") &&
          !f.slug?.includes("han-quoc") &&
          !f.slug?.includes("co-trang"),
      ),
    ];

    const validBlockbusters = deduplicate(
      rawPool.filter(
        (f) =>
          f &&
          (f.poster_url || f.thumb_url) &&
          !f.slug?.includes("trung-quoc") &&
          !f.slug?.includes("han-quoc") &&
          !f.slug?.includes("co-trang"),
      ),
    );

    return validBlockbusters.length > 0
      ? validBlockbusters.slice(0, 6)
      : latestFilms.slice(0, 6);
  }, [usUkData, marvelHeroData, singleData, latestFilms]);

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

      {/* Main Row Content — full layout with safe left padding for vertical sidebar */}
      <div className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 relative pt-6 md:pt-10 z-30">
        {/* TOP 10 RANKED MOVIES (Metallic Numbers Netflix Style) */}
        <Top10RankedRow films={latestFilms} />
        {/* Continue Watching / Watch History Row (positioned right below Top Movies) */}
        <ContinueWatchingRow />
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
  // Query topic 1: DC
  const { data: dcData } = useQuery({
    queryKey: ["topic-dc-v2"],
    queryFn: () => movieApi.search("DC", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // Query topic 2: Marvel
  const { data: marvelData } = useQuery({
    queryKey: ["topic-marvel-v2"],
    queryFn: () => movieApi.search("Marvel", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // Query topic 3: One Piece
  const { data: animeData } = useQuery({
    queryKey: ["topic-onepiece-v2"],
    queryFn: () => movieApi.search("One Piece", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // Query topic 4: Hot
  const { data: hotData } = useQuery({
    queryKey: ["topic-hot-v2"],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // Query topic 5: Cổ Trang
  const { data: coTrangData } = useQuery({
    queryKey: ["topic-cotrang-v2"],
    queryFn: () => movieApi.getByGenre("co-trang", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // Query topic 6: Weekend / Series
  const { data: seriesData } = useQuery({
    queryKey: ["topic-series-v2"],
    queryFn: () => movieApi.getSeries(1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // Pick a random image from fetched items for each topic (randomized per page visit)
  const topicImages = useMemo(() => {
    const getRandomImage = (
      items: FilmItem[] | undefined,
      defaultFallback: string,
    ) => {
      const valid = (items || []).filter(
        (f) => f && (f.poster_url || f.thumb_url),
      );
      if (!valid.length) return defaultFallback;
      const randIdx = Math.floor(Math.random() * valid.length);
      const chosen = valid[randIdx];
      return (
        resolveImageUrl(chosen.poster_url || chosen.thumb_url) ||
        defaultFallback
      );
    };

    return {
      dc: getRandomImage(
        dcData?.items || dcData?.data?.items,
        "/images/zack-snyders-justice-league-dc-superheroes-dc-comics-2021-3840x2160-4980.jpg",
      ),
      marvel: getRandomImage(
        marvelData?.items || marvelData?.data?.items,
        "/images/wp3533664-avengers-infinity-war-4k-wallpapers.jpg",
      ),
      onepiece: getRandomImage(
        animeData?.items || animeData?.data?.items,
        "/images/one-piece-season-15-3840x2160-22064.jpg",
      ),
      hot: getRandomImage(
        hotData?.items || hotData?.data?.items,
        "/images/MV5BN2MyYjk2MWMtODMyZS00MDUyLW-8113-3732-1766460989.webp",
      ),
      cotrang: getRandomImage(
        coTrangData?.items || coTrangData?.data?.items,
        "/images/phim_co_trang_trung_quoc_50_573c11fea1.jpg",
      ),
      weekend: getRandomImage(
        seriesData?.items || seriesData?.data?.items,
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
      ),
    };
  }, [dcData, marvelData, animeData, hotData, coTrangData, seriesData]);

  const topics = [
    {
      title: "DC",
      href: "/search?q=dc",
      image: topicImages.dc,
      description: "Khám phá thế giới siêu anh hùng DC nổi tiếng.",
    },
    {
      title: "Marvel",
      href: "/search?q=marvel",
      image: topicImages.marvel,
      description: "Khám phá bộ phim Marvel nổi bật.",
    },
    {
      title: "One Piece",
      href: "/films/anime",
      image: topicImages.onepiece,
      description: "Khám phá One Piece và những hành trình hải tặc kỳ ảo.",
    },
    {
      title: "Phim đang hot",
      href: "/search?q=hot",
      image: topicImages.hot,
      description: "Xem những bộ phim đang gây sốt ngay lúc này.",
    },
    {
      title: "Cổ Trang",
      href: "/genre/co-trang",
      image: topicImages.cotrang,
      description:
        "Khám phá những siêu phẩm cổ trang Trung Quốc đầy kịch tính.",
    },
    {
      title: "Cày Phim Cuối Tuần",
      href: "/search?q=weekend",
      image: topicImages.weekend,
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
            className="relative overflow-hidden rounded-[28px] p-4 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-3xl group cursor-pointer min-h-[220px] md:min-h-[260px] bg-slate-900 shadow-slate-950/30 border border-white/10"
            style={{
              backgroundImage: `url('${topic.image}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent group-hover:from-slate-950/85 group-hover:via-slate-950/30 transition-colors duration-300" />
            <div className="absolute inset-x-4 top-4 h-16 rounded-3xl bg-white/10 blur-sm" />
            <div className="relative z-10">
              <h4 className="text-base md:text-xl font-extrabold text-white leading-tight drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)] select-none break-words">
                {topic.title}
              </h4>
            </div>
            <div className="relative z-10 flex flex-col gap-2 text-[10px] uppercase tracking-[0.28em] transition-colors duration-300 md:text-[11px]">
              <span className="inline-flex items-center gap-2 font-semibold text-white/90 group-hover:text-white">
                <span className="inline-block w-2 h-2 rounded-full bg-netflixRed" />
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
