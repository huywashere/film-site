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
import { TrailerModal } from "@/components/film/TrailerModal";
import {
  getFranchiseBaseName,
  deduplicateSectionRow,
  excludePreviousSectionSlugs,
} from "@/lib/recommendation-engine";
import HeroBanner from "@/app/components/HeroBanner";

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
      { rootMargin: "800px 0px" }, // pre-load 800px in advance so components are ready with 0ms scroll hitch
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
            slidesPerView={4}
            spaceBetween={10}
            breakpoints={{
              640: {
                slidesPerView: 5,
                spaceBetween: 14,
              },
              1024: {
                slidesPerView: 6,
                spaceBetween: 16,
              },
              1280: {
                slidesPerView: 7,
                spaceBetween: 18,
              },
            }}
            freeMode={{ enabled: true, momentumRatio: 0.8 }}
            className="!py-2 !px-1"
          >
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <SwiperSlide key={`skeleton-${i}`}>
                    <FilmCardSkeleton hideDetails={false} />
                  </SwiperSlide>
                ))
              : films.slice(0, 16).map((film) => (
                  <SwiperSlide key={film.slug}>
                    <FilmCard
                      film={film}
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

const deduplicateRow = (films: FilmItem[]) => deduplicateSectionRow(films);
const deduplicate = (films: FilmItem[]) => deduplicateSectionRow(films);
const excludeSlugs = (films: FilmItem[], usedSlugs: Set<string>) =>
  excludePreviousSectionSlugs(films, usedSlugs);

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

  const [showMoreSections, setShowMoreSections] = useState(false);

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ["series-v2", 1],
    queryFn: () => movieApi.getSeries(1).then((r) => r.data),
  });

  const { data: singleData, isLoading: singleLoading } = useQuery({
    queryKey: ["single-v2", 1],
    queryFn: () => movieApi.getSingle(1).then((r) => r.data),
    enabled: showMoreSections,
  });

  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: ["anime-v2", 1],
    queryFn: () => movieApi.getAnime(1).then((r) => r.data),
    enabled: showMoreSections,
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
    enabled: showMoreSections,
  });

  // Phim Tình Cảm Lãng Mạn
  const { data: romanceData, isLoading: romanceLoading } = useQuery({
    queryKey: ["romance-movies"],
    queryFn: () => movieApi.getByGenre("tinh-cam", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // Phim Hài Hước Vui Nhộn
  const { data: comedyData, isLoading: comedyLoading } = useQuery({
    queryKey: ["comedy-movies"],
    queryFn: () => movieApi.getByGenre("hai-huoc", 1).then((r) => r.data),
    enabled: showMoreSections,
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
    queryKey: ["hero-us-uk-blockbusters-p1"],
    queryFn: () => movieApi.getByCountry("au-my", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  const { data: usUkData2 } = useQuery({
    queryKey: ["hero-us-uk-blockbusters-p2"],
    queryFn: () => movieApi.getByCountry("au-my", 2).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  const { data: marvelHeroData } = useQuery({
    queryKey: ["hero-marvel-blockbusters"],
    queryFn: () => movieApi.search("Marvel", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  const { data: dcHeroData } = useQuery({
    queryKey: ["hero-dc-blockbusters"],
    queryFn: () => movieApi.search("DC", 1).then((r) => r.data),
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

  // US/UK Hollywood Blockbuster Hero Banner Pool (strictly zero duplicate films / thumbnails)
  const combinedBannerPool = useMemo(() => {
    const list1 = usUkData?.data?.items || usUkData?.items || [];
    const list2 = usUkData2?.data?.items || usUkData2?.items || [];
    const list3 = marvelHeroData?.data?.items || marvelHeroData?.items || [];
    const list4 = dcHeroData?.data?.items || dcHeroData?.items || [];

    const raw = [...list1, ...list2, ...list3, ...list4];
    const seenSlugs = new Set<string>();
    const seenNames = new Set<string>();

    const filtered = raw.filter((f) => {
      if (!f || !f.slug || !f.name) return false;
      const cleanSlug = f.slug.toLowerCase();
      const cleanName = f.name.toLowerCase();
      if (seenSlugs.has(cleanSlug) || seenNames.has(cleanName)) return false;
      if (
        cleanSlug.includes("trung-quoc") ||
        cleanSlug.includes("han-quoc") ||
        cleanSlug.includes("co-trang") ||
        cleanSlug.includes("nhat-ban")
      ) {
        return false;
      }
      seenSlugs.add(cleanSlug);
      seenNames.add(cleanName);
      return true;
    });

    return filtered;
  }, [usUkData, usUkData2, marvelHeroData, dcHeroData]);

  // Randomize 6 DISTINCT Hollywood blockbusters freshly on EVERY page visit
  const [shuffledBannerFilms, setShuffledBannerFilms] = useState<FilmItem[]>(
    [],
  );

  useEffect(() => {
    if (combinedBannerPool.length > 0) {
      const arr = [...combinedBannerPool];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setShuffledBannerFilms(arr.slice(0, 6));
    }
  }, [combinedBannerPool]);

  const bannerFilms =
    shuffledBannerFilms.length > 0
      ? shuffledBannerFilms
      : combinedBannerPool.length > 0
        ? combinedBannerPool.slice(0, 6)
        : latestFilms.slice(0, 6);

  const showBannerSkeleton = bannerFilms.length === 0;

  // Cross-section deduplication registry
  const {
    top10List,
    hotList,
    latestRowList,
    actionRowList,
    seriesRowList,
    singleRowList,
    animeRowList,
    horrorRowList,
    romanceRowList,
    comedyRowList,
  } = useMemo(() => {
    const usedSlugs = new Set<string>();

    const trackUsed = (list: FilmItem[]) => {
      list.forEach((f) => {
        if (f.slug) usedSlugs.add(f.slug.toLowerCase());
        const baseName = getFranchiseBaseName(f.name);
        if (baseName.length > 3) usedSlugs.add(`franchise:${baseName}`);
      });
    };

    const top10List = deduplicateRow(latestFilms).slice(0, 10);
    trackUsed(top10List);

    const hotList = deduplicateRow(excludeSlugs(hotFilms, usedSlugs)).slice(
      0,
      12,
    );
    trackUsed(hotList);

    const latestRowList = deduplicateRow(
      excludeSlugs(latestFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(latestRowList);

    const actionRowList = deduplicateRow(
      excludeSlugs(actionFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(actionRowList);

    const seriesRowList = deduplicateRow(
      excludeSlugs(seriesFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(seriesRowList);

    const horrorRowList = deduplicateRow(
      excludeSlugs(horrorFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(horrorRowList);

    const romanceRowList = deduplicateRow(
      excludeSlugs(romanceFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(romanceRowList);

    const comedyRowList = deduplicateRow(
      excludeSlugs(comedyFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(comedyRowList);

    const singleRowList = deduplicateRow(
      excludeSlugs(singleFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(singleRowList);

    const animeRowList = deduplicateRow(
      excludeSlugs(animeFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(animeRowList);

    return {
      top10List,
      hotList,
      latestRowList,
      actionRowList,
      seriesRowList,
      singleRowList,
      animeRowList,
      horrorRowList,
      romanceRowList,
      comedyRowList,
    };
  }, [
    latestFilms,
    hotFilms,
    actionFilms,
    seriesFilms,
    singleFilms,
    animeFilms,
    horrorFilms,
    romanceFilms,
    comedyFilms,
  ]);

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
    <div className="bg-background min-h-screen text-foreground overflow-hidden pb-12">
      {/* Hero Banner with slider */}
      {showBannerSkeleton ? (
        <div className="w-full h-screen bg-gradient-to-br from-neutral-950 via-[#10141a] to-neutral-900 animate-pulse" />
      ) : (
        <HeroBanner films={bannerFilms} />
      )}

      {/* Main Row Content — full layout with safe left padding for vertical sidebar */}
      <div className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 relative pt-6 md:pt-10 z-30">
        {/* TOP 10 RANKED MOVIES (Metallic Numbers Netflix Style) */}
        <Top10RankedRow films={top10List} />
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
              title={t("home.latest", "Phim Mới Cập Nhật")}
              icon={Clock}
              films={latestRowList}
              isLoading={latestLoading}
              href="/films"
            />
          </LazySection>

          <LazySection>
            <FilmSection
              title="Phim Hành Động"
              icon={Zap}
              films={actionRowList}
              isLoading={actionLoading}
              href="/genre/hanh-dong"
            />
          </LazySection>

          <LazySection>
            <FilmSection
              title={t("home.series")}
              icon={Tv}
              films={seriesRowList}
              isLoading={seriesLoading}
              href="/films/series"
            />
          </LazySection>

          {/* Minimalist Show More Sections Button */}
          {!showMoreSections ? (
            <div className="w-full my-4 flex justify-center px-1">
              <button
                onClick={() => setShowMoreSections(true)}
                className="w-full max-w-md py-3 px-6 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <span>
                  {t("home.showMoreSections", "Xem Thêm Danh Mục Phim")}
                </span>
                <ChevronDown size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <LazySection>
                <FilmSection
                  title="Phim Kinh Dị"
                  icon={Ghost}
                  films={horrorRowList}
                  isLoading={horrorLoading}
                  href="/genre/kinh-di"
                />
              </LazySection>

              <LazySection>
                <FilmSection
                  title={t("home.single")}
                  icon={Clapperboard}
                  films={singleRowList}
                  isLoading={singleLoading}
                  href="/films/single"
                />
              </LazySection>

              <LazySection>
                <FilmSection
                  title="Phim Tình Cảm"
                  icon={Heart}
                  films={romanceRowList}
                  isLoading={romanceLoading}
                  href="/genre/tinh-cam"
                />
              </LazySection>

              <LazySection>
                <FilmSection
                  title="Phim Hài Hước"
                  icon={Laugh}
                  films={comedyRowList}
                  isLoading={comedyLoading}
                  href="/genre/hai-huoc"
                />
              </LazySection>

              <LazySection>
                <FilmSection
                  title={t("home.anime")}
                  icon={Sparkles}
                  films={animeRowList}
                  isLoading={animeLoading}
                  href="/films/anime"
                />
              </LazySection>
            </div>
          )}
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
