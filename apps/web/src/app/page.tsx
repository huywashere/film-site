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
  Wand2,
  Compass,
  Flame,
  Globe,
  BookOpen,
  Skull,
  ShieldAlert,
  Swords,
} from "lucide-react";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmCardSkeleton,
  FilmItem,
  resolveImageUrl,
} from "@/components/film/FilmCard";
import { useTranslation } from "@/store/langStore";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import styled from "@emotion/styled";
import { cn } from "@/lib/utils";
import { Top10RankedRow } from "@/components/film/Top10RankedRow";
import HeroBanner from "@/app/components/HeroBanner";

import "swiper/css";
import "swiper/css/navigation";

// Styled Swiper container with modern controls
const StyledSwiperContainer = styled.div`
  position: relative;
  .swiper {
    overflow: visible !important;
    padding: 10px 0 20px 0 !important;
  }
  .swiper-wrapper {
    align-items: stretch;
  }
  .swiper-slide {
    height: auto;
  }
  .swiper-button-prev,
  .swiper-button-next {
    color: #ffffff !important;
    background: rgba(18, 24, 34, 0.85);
    backdrop-filter: blur(12px);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    top: 50% !important;
    transform: translateY(-50%);
    z-index: 40;
    opacity: 0;

    &:hover {
      background: rgba(229, 9, 20, 0.95);
      border-color: rgba(229, 9, 20, 1);
      box-shadow: 0 0 20px rgba(229, 9, 20, 0.6);
      scale: 1.1;
    }

    &::after {
      font-size: 15px !important;
      font-weight: 800 !important;
    }
  }

  &:hover {
    .swiper-button-prev,
    .swiper-button-next {
      opacity: 1;
    }
  }

  .swiper-button-prev {
    left: -20px !important;
  }
  .swiper-button-next {
    right: -20px !important;
  }

  .swiper-button-disabled {
    opacity: 0 !important;
    cursor: default;
  }
`;

// Helper: loại bỏ phim trùng lặp theo ID/slug
function deduplicate(films: FilmItem[]): FilmItem[] {
  const seen = new Set<string>();
  return films.filter((f) => {
    const key = f._id || f.slug || f.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Extract base franchise name for deduplication
function getFranchiseBaseName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\s*(phần|season|ss|tập|part|chapter|movie)\s*\d+.*$/i, "")
    .replace(/\s*\d+.*$/, "")
    .trim();
}

// Deduplicate items within a single row
function deduplicateRow(items: FilmItem[]): FilmItem[] {
  const seenSlugs = new Set<string>();
  const seenFranchises = new Set<string>();

  return items.filter((f) => {
    if (!f || !f.name) return false;
    const slug = (f.slug || f.name).toLowerCase();
    if (seenSlugs.has(slug)) return false;

    const baseName = getFranchiseBaseName(f.name);
    if (baseName.length > 3 && seenFranchises.has(baseName)) return false;

    seenSlugs.add(slug);
    if (baseName.length > 3) seenFranchises.add(baseName);
    return true;
  });
}

// Filter out films already used in earlier rows
function excludeSlugs(items: FilmItem[], usedSlugs: Set<string>): FilmItem[] {
  return items.filter((f) => {
    if (!f || !f.name) return false;
    const slug = (f.slug || f.name).toLowerCase();
    if (usedSlugs.has(slug)) return false;

    const baseName = getFranchiseBaseName(f.name);
    if (baseName.length > 3 && usedSlugs.has(`franchise:${baseName}`)) {
      return false;
    }
    return true;
  });
}

// Standard Film Carousel Section Component
function FilmSection({
  title,
  icon: Icon,
  films,
  isLoading,
  href,
}: {
  title: string;
  icon?: any;
  films: FilmItem[];
  isLoading: boolean;
  href?: string;
}) {
  const prevRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <FilmCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!films || films.length === 0) return null;

  return (
    <div className="mb-10 group/section">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
          {Icon && <Icon size={20} className="text-red-500" />}
          <span>{title}</span>
        </h2>
        {href && (
          <Link
            href={href}
            className="text-xs text-neutral-400 hover:text-white font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors"
          >
            <span>Xem tất cả</span>
            <ChevronRight size={14} />
          </Link>
        )}
      </div>

      <StyledSwiperContainer>
        <div
          ref={prevRef}
          className="swiper-button-prev flex items-center justify-center"
        />
        <div
          ref={nextRef}
          className="swiper-button-next flex items-center justify-center"
        />

        <Swiper
          modules={[Navigation, FreeMode]}
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          onBeforeInit={(swiper: any) => {
            swiper.params.navigation.prevEl = prevRef.current;
            swiper.params.navigation.nextEl = nextRef.current;
          }}
          spaceBetween={14}
          slidesPerView={2.2}
          freeMode={true}
          breakpoints={{
            480: { slidesPerView: 3.2, spaceBetween: 14 },
            640: { slidesPerView: 3.8, spaceBetween: 16 },
            768: { slidesPerView: 4.5, spaceBetween: 16 },
            1024: { slidesPerView: 5.5, spaceBetween: 18 },
            1280: { slidesPerView: 6.2, spaceBetween: 18 },
          }}
          className="w-full"
        >
          {films.map((film, idx) => (
            <SwiperSlide key={film._id || film.slug || idx}>
              <FilmCard film={film} />
            </SwiperSlide>
          ))}
        </Swiper>
      </StyledSwiperContainer>
    </div>
  );
}

// Component Wrapper for Intersection Observer Lazy Load
function LazySection({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="min-h-[260px]">
      {isVisible ? (
        children
      ) : (
        <div className="w-full h-48 animate-pulse bg-white/[0.02] rounded-2xl" />
      )}
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();

  // ── Initial 4 Sections Data ────────────────────────────
  // 1. Phim kỹ xảo (VFX & Fantasy)
  const { data: vfxData, isLoading: vfxLoading } = useQuery({
    queryKey: ["vfx-movies"],
    queryFn: () => movieApi.getByGenre("than-thoai", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // 2. Series Âu-Mỹ (Western TV Series)
  const { data: usUkSeriesData, isLoading: usUkSeriesLoading } = useQuery({
    queryKey: ["us-uk-series"],
    queryFn: () => movieApi.getByCountry("au-my", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // 3. Phim hành động (Action Movies)
  const { data: actionData, isLoading: actionLoading } = useQuery({
    queryKey: ["action-movies"],
    queryFn: () => movieApi.getByGenre("hanh-dong", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // 4. Phim khoa học viễn tưởng bom tấn (Sci-Fi Blockbusters)
  const { data: scifiData, isLoading: scifiLoading } = useQuery({
    queryKey: ["scifi-movies"],
    queryFn: () => movieApi.getByGenre("vien-tuong", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // ── Lazy Loaded 10 Sections Data (Loaded after clicking Xem Thêm) ──
  const [showMoreSections, setShowMoreSections] = useState(false);

  // 5. Xem gì tiếp theo (What to Watch Next)
  const { data: nextWatchData, isLoading: nextWatchLoading } = useQuery({
    queryKey: ["next-watch-movies"],
    queryFn: () => movieApi.getLatest(2).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 6. Series quốc tế (International Series)
  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ["series-v2", 1],
    queryFn: () => movieApi.getSeries(1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 7. Anime lồng tiếng (Dubbed Anime)
  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: ["anime-v2", 1],
    queryFn: () => movieApi.getAnime(1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 8. Phim phiêu lưu mạo hiểm (Adventure & Exploration)
  const { data: adventureData, isLoading: adventureLoading } = useQuery({
    queryKey: ["adventure-movies"],
    queryFn: () => movieApi.getByGenre("phieu-luu", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 9. Phim chất lượng 4K (4K Quality Movies)
  const { data: singleData, isLoading: singleLoading } = useQuery({
    queryKey: ["single-v2", 1],
    queryFn: () => movieApi.getSingle(1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 10. Phim chính kịch chuyển thể từ sách (Book Adaptation Dramas)
  const { data: dramaData, isLoading: dramaLoading } = useQuery({
    queryKey: ["drama-movies"],
    queryFn: () => movieApi.getByGenre("chinh-kich", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 11. Phim kịch tính về thảm họa chết chóc (Disaster & Thriller)
  const { data: disasterData, isLoading: disasterLoading } = useQuery({
    queryKey: ["disaster-movies"],
    queryFn: () => movieApi.getByGenre("kinh-di", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 12. Thể loại chiến tranh và gai góc (War & Gritty)
  const { data: warData, isLoading: warLoading } = useQuery({
    queryKey: ["war-movies"],
    queryFn: () => movieApi.getByGenre("chien-tranh", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 13. Phim hài (Comedy Movies)
  const { data: comedyData, isLoading: comedyLoading } = useQuery({
    queryKey: ["comedy-movies"],
    queryFn: () => movieApi.getByGenre("hai-huoc", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 14. Bộ phim giải trí hoàn hảo (Feel-Good Entertainment Movies)
  const { data: romanceData, isLoading: romanceLoading } = useQuery({
    queryKey: ["romance-movies"],
    queryFn: () => movieApi.getByGenre("tinh-cam", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // Latest films query for Hero Banner
  const { data: latestData } = useQuery({
    queryKey: ["latest-v2", 1],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
  });

  // US/UK data for Hero Banner
  const { data: usUkBannerData } = useQuery({
    queryKey: ["hero-us-uk-blockbusters-p1"],
    queryFn: () => movieApi.getByCountry("au-my", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  const { data: marvelHeroData } = useQuery({
    queryKey: ["hero-marvel-blockbusters"],
    queryFn: () => movieApi.search("Marvel", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // Process raw items into deduplicated film arrays
  const vfxFilms = useMemo(
    () => deduplicate(vfxData?.data?.items || vfxData?.items || []),
    [vfxData],
  );
  const usUkSeriesFilms = useMemo(
    () =>
      deduplicate(usUkSeriesData?.data?.items || usUkSeriesData?.items || []),
    [usUkSeriesData],
  );
  const actionFilms = useMemo(
    () => deduplicate(actionData?.data?.items || actionData?.items || []),
    [actionData],
  );
  const scifiFilms = useMemo(
    () => deduplicate(scifiData?.data?.items || scifiData?.items || []),
    [scifiData],
  );

  const nextWatchFilms = useMemo(
    () => deduplicate(nextWatchData?.items || nextWatchData?.data?.items || []),
    [nextWatchData],
  );
  const seriesFilms = useMemo(
    () => deduplicate(seriesData?.data?.items || seriesData?.items || []),
    [seriesData],
  );
  const animeFilms = useMemo(
    () => deduplicate(animeData?.data?.items || animeData?.items || []),
    [animeData],
  );
  const adventureFilms = useMemo(
    () => deduplicate(adventureData?.data?.items || adventureData?.items || []),
    [adventureData],
  );
  const singleFilms = useMemo(
    () => deduplicate(singleData?.data?.items || singleData?.items || []),
    [singleData],
  );
  const dramaFilms = useMemo(
    () => deduplicate(dramaData?.data?.items || dramaData?.items || []),
    [dramaData],
  );
  const disasterFilms = useMemo(
    () => deduplicate(disasterData?.data?.items || disasterData?.items || []),
    [disasterData],
  );
  const warFilms = useMemo(
    () => deduplicate(warData?.data?.items || warData?.items || []),
    [warData],
  );
  const comedyFilms = useMemo(
    () => deduplicate(comedyData?.data?.items || comedyData?.items || []),
    [comedyData],
  );
  const romanceFilms = useMemo(
    () => deduplicate(romanceData?.data?.items || romanceData?.items || []),
    [romanceData],
  );

  const latestFilms = useMemo(
    () => deduplicate(latestData?.items || latestData?.data?.items || []),
    [latestData],
  );

  // Hollywood Blockbuster Hero Banner Pool
  const combinedBannerPool = useMemo(() => {
    const list1 = usUkBannerData?.data?.items || usUkBannerData?.items || [];
    const list2 = marvelHeroData?.data?.items || marvelHeroData?.items || [];
    const raw = [...list1, ...list2];

    const seen = new Set<string>();
    return raw.filter((f) => {
      if (!f || !f.slug || !f.name) return false;
      const key = f.slug.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [usUkBannerData, marvelHeroData]);

  // Randomize 6 Hollywood blockbusters on page visit
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

  // Deduplication registry across all 14 rows
  const {
    top10List,
    vfxRowList,
    usUkSeriesRowList,
    actionRowList,
    scifiRowList,
    nextWatchRowList,
    seriesRowList,
    animeRowList,
    adventureRowList,
    singleRowList,
    dramaRowList,
    disasterRowList,
    warRowList,
    comedyRowList,
    romanceRowList,
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

    // Initial 4 Sections
    const vfxRowList = deduplicateRow(excludeSlugs(vfxFilms, usedSlugs)).slice(
      0,
      12,
    );
    trackUsed(vfxRowList);

    const usUkSeriesRowList = deduplicateRow(
      excludeSlugs(usUkSeriesFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(usUkSeriesRowList);

    const actionRowList = deduplicateRow(
      excludeSlugs(actionFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(actionRowList);

    const scifiRowList = deduplicateRow(
      excludeSlugs(scifiFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(scifiRowList);

    // Lazy 10 Sections
    const nextWatchRowList = deduplicateRow(
      excludeSlugs(nextWatchFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(nextWatchRowList);

    const seriesRowList = deduplicateRow(
      excludeSlugs(seriesFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(seriesRowList);

    const animeRowList = deduplicateRow(
      excludeSlugs(animeFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(animeRowList);

    const adventureRowList = deduplicateRow(
      excludeSlugs(adventureFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(adventureRowList);

    const singleRowList = deduplicateRow(
      excludeSlugs(singleFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(singleRowList);

    const dramaRowList = deduplicateRow(
      excludeSlugs(dramaFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(dramaRowList);

    const disasterRowList = deduplicateRow(
      excludeSlugs(disasterFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(disasterRowList);

    const warRowList = deduplicateRow(excludeSlugs(warFilms, usedSlugs)).slice(
      0,
      12,
    );
    trackUsed(warRowList);

    const comedyRowList = deduplicateRow(
      excludeSlugs(comedyFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(comedyRowList);

    const romanceRowList = deduplicateRow(
      excludeSlugs(romanceFilms, usedSlugs),
    ).slice(0, 12);
    trackUsed(romanceRowList);

    return {
      top10List,
      vfxRowList,
      usUkSeriesRowList,
      actionRowList,
      scifiRowList,
      nextWatchRowList,
      seriesRowList,
      animeRowList,
      adventureRowList,
      singleRowList,
      dramaRowList,
      disasterRowList,
      warRowList,
      comedyRowList,
      romanceRowList,
    };
  }, [
    latestFilms,
    vfxFilms,
    usUkSeriesFilms,
    actionFilms,
    scifiFilms,
    nextWatchFilms,
    seriesFilms,
    animeFilms,
    adventureFilms,
    singleFilms,
    dramaFilms,
    disasterFilms,
    warFilms,
    comedyFilms,
    romanceFilms,
  ]);

  return (
    <div className="bg-background min-h-screen text-foreground overflow-hidden pb-12">
      {/* Hero Banner slider */}
      {showBannerSkeleton ? (
        <div className="w-full h-screen bg-gradient-to-br from-neutral-950 via-[#10141a] to-neutral-900 animate-pulse" />
      ) : (
        <HeroBanner films={bannerFilms} />
      )}

      {/* Main Content Area */}
      <div className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 relative pt-6 md:pt-10 z-30">
        {/* ONLY TOP 10 RANKED MOVIES KEPT AT TOP */}
        <Top10RankedRow films={top10List} />

        {/* ── Initial 4 Movie Sections ── */}
        <LazySection>
          <FilmSection
            title="Phim Kỹ Xảo"
            icon={Wand2}
            films={vfxRowList}
            isLoading={vfxLoading}
            href="/genre/than-thoai"
          />
        </LazySection>

        <LazySection>
          <FilmSection
            title="Series Âu-Mỹ"
            icon={Tv}
            films={usUkSeriesRowList}
            isLoading={usUkSeriesLoading}
            href="/country/au-my"
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
            title="Phim Khoa Học Viễn Tưởng Bom Tấn"
            icon={Compass}
            films={scifiRowList}
            isLoading={scifiLoading}
            href="/genre/vien-tuong"
          />
        </LazySection>

        {/* ── Minimalist Show More Sections Button ── */}
        {!showMoreSections ? (
          <div className="w-full my-8 flex justify-center px-1">
            <button
              onClick={() => setShowMoreSections(true)}
              className="w-full max-w-md py-3.5 px-6 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 shadow-xl"
            >
              <span>Xem Thêm Danh Mục Phim</span>
              <ChevronDown size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── 10 Lazy Loaded Sections ── */}
            <LazySection>
              <FilmSection
                title="Xem Gì Tiếp Theo"
                icon={Flame}
                films={nextWatchRowList}
                isLoading={nextWatchLoading}
                href="/films"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Series Quốc Tế"
                icon={Globe}
                films={seriesRowList}
                isLoading={seriesLoading}
                href="/films/series"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Anime Lồng Tiếng"
                icon={Sparkles}
                films={animeRowList}
                isLoading={animeLoading}
                href="/films/anime"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Phim Phiêu Lưu Mạo Hiểm"
                icon={Compass}
                films={adventureRowList}
                isLoading={adventureLoading}
                href="/genre/phieu-luu"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Phim Chất Lượng 4K"
                icon={Clapperboard}
                films={singleRowList}
                isLoading={singleLoading}
                href="/films/single"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Phim Chính Kịch Chuyển Thể Từ Sách"
                icon={BookOpen}
                films={dramaRowList}
                isLoading={dramaLoading}
                href="/genre/chinh-kich"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Phim Kịch Tính Về Thảm Họa Chết Chóc"
                icon={Skull}
                films={disasterRowList}
                isLoading={disasterLoading}
                href="/genre/kinh-di"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Thể Loại Chiến Tranh Và Gai Góc"
                icon={ShieldAlert}
                films={warRowList}
                isLoading={warLoading}
                href="/genre/chien-tranh"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Phim Hài"
                icon={Laugh}
                films={comedyRowList}
                isLoading={comedyLoading}
                href="/genre/hai-huoc"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Bộ Phim Giải Trí Hoàn Hảo"
                icon={Heart}
                films={romanceRowList}
                isLoading={romanceLoading}
                href="/genre/tinh-cam"
              />
            </LazySection>
          </div>
        )}
      </div>
    </div>
  );
}
