'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  ChevronRight,
  ChevronLeft,
  Info,
  TrendingUp,
  Clock,
  Tv,
  Clapperboard,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { movieApi, reviewsApi } from '@/lib/api';
import { FilmCard, FilmCardSkeleton, FilmItem, resolveImageUrl } from '@/components/film/FilmCard';
import { useTranslation } from '@/store/langStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import styled from '@emotion/styled';
import { cn } from '@/lib/utils';
import { SpotlightSearchModal } from '@/components/search/SpotlightSearchModal';
import { ContinueWatchingRow } from '@/components/film/ContinueWatchingRow';
import { SmartRecommendationSection } from '@/components/film/SmartRecommendationSection';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

// ── Emotion Styled Components ─────────────────────────────────────
const StyledSwiperContainer = styled.div`
  position: relative;
  
  .swiper {
    padding: 12px 54px 12px 4px;
  }
  
  .swiper-button-prev,
  .swiper-button-next {
    color: #9ca3af !important;
    background: #202430 !important;
    border: 1px solid #2e3444 !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7) !important;
    width: 42px !important;
    height: 100px !important;
    border-radius: 14px !important;
    margin-top: 0 !important;
    transition: all 0.2s ease !important;
    opacity: 0.85 !important;
    z-index: 30 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    right: 4px !important;
    left: auto !important;
  }

  /* Top button: Next (>) */
  .swiper-button-next { 
    top: calc(50% - 56px) !important; 
    transform: translateY(-50%) !important;
  }
  
  /* Bottom button: Prev (<) */
  .swiper-button-prev { 
    top: calc(50% + 56px) !important; 
    transform: translateY(-50%) !important;
  }

  .swiper-button-prev:hover,
  .swiper-button-next:hover {
    color: #ffffff !important;
    background: #2a3040 !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
    opacity: 1 !important;
    transform: translateY(-50%) scale(1.04) !important;
  }

  .swiper-button-disabled {
    opacity: 0.35 !important;
    cursor: not-allowed !important;
  }

  .swiper-button-prev::after,
  .swiper-button-next::after {
    font-size: 14px !important;
    font-weight: 800 !important;
    transition: transform 0.2s ease;
  }

  .swiper-button-prev:hover::after,
  .swiper-button-next:hover::after {
    transform: scale(1.15);
  }
`;

// ── Netflix Hero Banner ───────────────────────────────────────────
function HeroBanner({ films }: { films: FilmItem[] }) {
  const [current, setCurrent] = useState(0);
  const { t } = useTranslation();
  const featured = films.slice(0, 6);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((c) => (c + 1) % featured.length), 8000);
    return () => clearInterval(timer);
  }, [featured.length]);

  const film = featured[current];
  if (!film) return null;

  const backdrop = resolveImageUrl(film.thumb_url) || resolveImageUrl(film.poster_url);

  // Dynamically scale down font sizes and add clean line-height for extremely long film names
  const nameLen = film.name.length;
  const titleFontSizeClass =
    nameLen > 60
      ? 'text-2xl md:text-4xl lg:text-5xl'
      : nameLen > 40
        ? 'text-3xl md:text-5xl lg:text-6xl'
        : 'text-4xl md:text-7xl';

  return (
    <div className="relative h-[calc(100vh+100px)] min-h-[700px] w-full overflow-hidden bg-background">
      {/* Background Poster Image (Smooth GPU accelerated transition, zero layout jitter) */}
      {backdrop && (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={film.slug || current}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full will-change-transform"
          >
            <NextImage
              src={backdrop}
              alt={film.name}
              fill
              priority
              quality={90}
              sizes="100vw"
              className="object-cover object-center brightness-[0.7] dark:brightness-[0.7]"
              unoptimized
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Cinematic Gradient Masks */}
      {/* Left Mask for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent w-full md:w-[65%] z-10 pointer-events-none" />
      {/* Bottom Mask for 100% seamless page integration (no bottom gap seam) */}
      <div className="absolute -bottom-2 inset-x-0 h-64 md:h-80 bg-gradient-to-t from-background via-background/95 via-background/60 to-transparent z-20 pointer-events-none" />
      {/* Overall Overlay */}
      <div className="absolute inset-0 bg-black/5 dark:bg-black/10 z-0 pointer-events-none" />

      {/* Content Container */}
      <div className="absolute inset-0 z-20 flex items-center">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="max-w-2xl">
            <div className="grid grid-cols-1 grid-rows-1">
              <AnimatePresence>
                <motion.div
                  key={current}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="col-start-1 row-start-1 flex flex-col space-y-4 md:space-y-5"
                >
                {/* Badges */}
                <div className="flex items-center space-x-3">
                  <span className="bg-neutral-800 text-white dark:bg-white dark:text-black text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm shadow">
                    NEW
                  </span>
                  <span className="border border-foreground/40 text-foreground text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                    12
                  </span>
                  {film.year && (
                    <span className="text-foreground/60 text-xs font-semibold">
                      {film.year}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1
                  className={cn(
                    'font-extrabold text-foreground tracking-wide leading-tight drop-shadow-sm uppercase font-sans',
                    titleFontSizeClass,
                  )}
                >
                  {film.name}
                </h1>
                {film.origin_name && (
                  <p className="text-base md:text-xl text-foreground/75 font-semibold tracking-wide -mt-2">
                    {film.origin_name}
                  </p>
                )}

                {/* Tagline / Mini Description */}
                <p className="text-xs md:text-sm text-foreground/80 max-w-xl leading-relaxed line-clamp-3">
                  {t('home.heroDesc')}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3 pt-2">
                  <Link
                    href={`/watch/${film.slug}`}
                    className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-900 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black px-7 py-3 rounded-full text-xs font-black tracking-wider uppercase transition-colors shadow-md border border-neutral-700 dark:border-white/5"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>Go to Movie</span>
                  </Link>
                  <Link
                    href={`/film/${film.slug}`}
                    className="flex items-center space-x-2 bg-black/5 hover:bg-black/10 text-neutral-800 border border-black/10 dark:bg-white/10 dark:hover:bg-white/25 dark:text-white px-7 py-3 rounded-full text-xs font-black tracking-wider uppercase transition-colors backdrop-blur-sm dark:border dark:border-white/10"
                  >
                    <Info size={14} />
                    <span>{t('home.details')}</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        </div>
      </div>

      {/* Running Thumbnail Indicators (Right Aligned, 6 Items, Sleek Thin Border & Sharp HD Images) */}
      <div className="absolute right-4 sm:right-8 md:right-12 bottom-6 sm:bottom-8 z-30 flex items-center gap-1.5 sm:gap-2">
        {featured.map((item, i) => {
          const thumbImg = resolveImageUrl(item.thumb_url) || resolveImageUrl(item.poster_url) || '';
          const isActive = i === current;
          return (
            <button
              key={item.slug || i}
              onClick={() => setCurrent(i)}
              aria-label={`Switch to ${item.name}`}
              className={cn(
                'relative w-14 sm:w-16 md:w-20 lg:w-22 aspect-[16/9] rounded-md sm:rounded-lg overflow-hidden cursor-pointer transition-all duration-300 flex-shrink-0 group',
                isActive
                  ? 'border-2 border-white scale-105 shadow-xl shadow-black/90 z-10'
                  : 'border border-white/20 opacity-50 hover:opacity-100 hover:border-white/60 scale-95 hover:scale-100'
              )}
            >
              {thumbImg ? (
                <NextImage
                  src={thumbImg}
                  alt={item.name}
                  fill
                  quality={95}
                  sizes="200px"
                  className="object-cover object-center"
                  unoptimized
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

      {/* Scroll Down Indicator with Medium Soft Mouse Cursor Icon - Center Bottom */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-5 z-20 flex flex-col items-center gap-1.5 cursor-pointer group opacity-65 hover:opacity-100 transition-all duration-300"
        onClick={() => window.scrollTo({ top: window.innerHeight * 0.85, behavior: 'smooth' })}
        title="Cuộn xuống để xem phim"
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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative mb-10 md:mb-14"
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center space-x-2 font-sans tracking-wide">
          <Icon size={18} className="text-netflixRed" />
          <span>{title}</span>
        </h2>
        <Link href={href} className="text-xs text-neutral-400 hover:text-foreground font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors">
          <span>{t('home.viewAll')}</span>
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
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <SwiperSlide key={`skeleton-${i}`} style={{ width: '200px' }}>
                  <FilmCardSkeleton width={200} hideDetails={false} />
                </SwiperSlide>
              ))
            : films.slice(0, 12).map((film) => (
                <SwiperSlide key={film.slug} style={{ width: '200px' }}>
                  <FilmCard film={film} width={200} variant="standard" hideDetails={false} />
                </SwiperSlide>
              ))}
        </Swiper>
      </StyledSwiperContainer>
    </motion.section>
  );
}


// ── Keyboard Search Banner Component ──────────────────────
function KeyboardSearchBanner({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="fixed bottom-6 left-6 z-50 hidden sm:flex items-center space-x-2 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-neutral-300 text-[11px] select-none shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
    >
      <span className="font-semibold text-neutral-200">Press</span>
      <kbd className="bg-white/15 border border-white/25 px-2 py-0.5 rounded-md text-[11px] text-white font-mono font-black flex items-center justify-center gap-1 shadow-inner">
        <span className="text-[12px] font-sans leading-none">⌘</span>K
      </kbd>
      <span className="font-semibold text-neutral-200">to search</span>
    </div>
  );
}

// Helper to deduplicate films by slug
const deduplicate = (films: FilmItem[]) => {
  const seen = new Set();
  return (films || []).filter(film => {
    if (!film || !film.slug) return false;
    const isDuplicate = seen.has(film.slug);
    seen.add(film.slug);
    return !isDuplicate;
  });
};

// ── Main Home Page ──────────────────────────────────────────
export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Listen globally for Ctrl K / Cmd K shortcut to toggle homepage search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const {
    data: latestData,
    isLoading: latestLoading,
    error: latestError,
  } = useQuery({
    queryKey: ['latest-v2', 1],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
  });

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ['series-v2', 1],
    queryFn: () => movieApi.getSeries(1).then((r) => r.data),
  });

  const { data: singleData, isLoading: singleLoading } = useQuery({
    queryKey: ['single-v2', 1],
    queryFn: () => movieApi.getSingle(1).then((r) => r.data),
  });

  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: ['anime-v2', 1],
    queryFn: () => movieApi.getAnime(1).then((r) => r.data),
  });

  // Query Marvel, DC, and US-UK films specifically for the HeroBanner
  const { data: marvelSearchData, isLoading: marvelSearchLoading } = useQuery({
    queryKey: ['hero-marvel'],
    queryFn: () => movieApi.search('marvel', 1).then((r) => r.data),
  });

  const { data: dcSearchData, isLoading: dcSearchLoading } = useQuery({
    queryKey: ['hero-dc'],
    queryFn: () => movieApi.search('dc', 1).then((r) => r.data),
  });

  const { data: usukData, isLoading: usukLoading } = useQuery({
    queryKey: ['hero-usuk'],
    queryFn: () => movieApi.getByCountry('au-my', 1).then((r) => r.data),
  });

  const latestFilms = useMemo(() => deduplicate(latestData?.items || latestData?.data?.items || []), [latestData]);
  const seriesFilms = useMemo(() => deduplicate(seriesData?.data?.items || seriesData?.items || []), [seriesData]);
  const singleFilms = useMemo(() => deduplicate(singleData?.data?.items || singleData?.items || []), [singleData]);
  const animeFilms = useMemo(() => deduplicate(animeData?.data?.items || animeData?.items || []), [animeData]);

  const marvelFilms = useMemo(() => deduplicate(marvelSearchData?.data?.items || []), [marvelSearchData]);
  const dcFilms = useMemo(() => deduplicate(dcSearchData?.data?.items || []), [dcSearchData]);
  const usukFilms = useMemo(() => deduplicate(usukData?.data?.items || usukData?.items || []), [usukData]);
  
  // Combine Marvel, DC, and US/UK movies for a random-themed immersive banner (up to 15)
  const combinedBannerPool = useMemo(() => {
    const combined = [...marvelFilms, ...dcFilms, ...usukFilms].filter(
      (f) => f && (f.thumb_url || f.poster_url)
    );
    return combined.length > 0 ? combined : latestFilms;
  }, [marvelFilms, dcFilms, usukFilms, latestFilms]);

  const [shuffledFilms, setShuffledFilms] = useState<FilmItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (combinedBannerPool.length > 0) {
      const arr = [...combinedBannerPool];
      // Fisher-Yates Shuffle for true randomness
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setShuffledFilms(arr);
    }
  }, [combinedBannerPool]);

  const isBannerLoading = latestLoading || marvelSearchLoading || dcSearchLoading || usukLoading;
  const showBannerSkeleton = isBannerLoading || !isMounted || shuffledFilms.length === 0;

  if (latestError) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-xl">
        <div className="flex flex-col items-center justify-center space-y-4">
          <AlertTriangle size={48} className="text-netflixRed" />
          <h2 className="text-2xl font-bold text-white">
            {t('home.latestError', 'Không thể tải dữ liệu phim')}
          </h2>
          <p className="text-neutral-400 text-sm">
            {t('home.networkError', 'Vui lòng thử lại sau hoặc kiểm tra kết nối mạng.')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-netflixRed text-white font-bold px-6 py-2.5 rounded hover:bg-[#C11119] transition-colors"
          >
            {t('common.retry')}
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
        <HeroBanner films={shuffledFilms} />
      )}

      {/* Main Row Content — stretched out to fit wider layouts next to widgets */}
      <div className="w-full max-w-[1680px] mx-auto px-4 md:px-12 relative pt-6 md:pt-10 z-30">
        {/* Continue Watching Row */}
        <ContinueWatchingRow />

        {/* AI Smart Recommendation Engine */}
        <SmartRecommendationSection />

        {/* Topic Banners Section */}
        <TopicBannersSection />        {/* Phim Mới Cập Nhật */}
        <FilmSection
          title={t('home.latest')}
          icon={Clock}
          films={latestFilms}
          isLoading={latestLoading}
          href="/films"
        />

        {/* Phim Bộ */}
        <FilmSection
          title={t('home.series')}
          icon={Tv}
          films={seriesFilms}
          isLoading={seriesLoading}
          href="/films/series"
        />

        {/* Phim Lẻ */}
        <FilmSection
          title={t('home.single')}
          icon={Clapperboard}
          films={singleFilms}
          isLoading={singleLoading}
          href="/films/single"
        />

        {/* Hoạt Hinh */}
        <FilmSection
          title={t('home.anime')}
          icon={TrendingUp}
          films={animeFilms}
          isLoading={animeLoading}
          href="/films/anime"
        />

      </div>

      {/* Float components */}
      <KeyboardSearchBanner onClick={() => setIsSearchOpen(true)} />

      {/* Instant Spotlight Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <SpotlightSearchModal 
            isOpen={isSearchOpen} 
            onClose={() => setIsSearchOpen(false)} 
            suggestions={latestFilms}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Topic Banners Section ──────────────────────────
function TopicBannersSection() {
  const topics = [
    {
      title: 'DC',
      href: '/search?q=dc',
      image: '/images/zack-snyders-justice-league-dc-superheroes-dc-comics-2021-3840x2160-4980.jpg',
      description: 'Khám phá thế giới siêu anh hùng DC nổi tiếng.',
    },
    {
      title: 'Marvel',
      href: '/search?q=marvel',
      image: '/images/wp3533664-avengers-infinity-war-4k-wallpapers.jpg',
      description: 'Khám phá bộ phim Marvel nổi bật.',
    },
    {
      title: 'One Piece',
      href: '/films/anime',
      image: '/images/one-piece-season-15-3840x2160-22064.jpg',
      description: 'Khám phá One Piece và những hành trình hải tặc kỳ ảo.',
    },
    {
      title: 'Phim đang hot',
      href: '/search?q=hot',
      image: '/images/MV5BN2MyYjk2MWMtODMyZS00MDUyLW-8113-3732-1766460989.webp',
      description: 'Xem những bộ phim đang gây sốt ngay lúc này.',
    },
    {
      title: 'Cổ Trang',
      href: '/genre/co-trang',
      image: '/images/phim_co_trang_trung_quoc_50_573c11fea1.jpg',
      description: 'Khám phá những siêu phẩm cổ trang Trung Quốc đầy kịch tính.',
    },
    {
      title: 'Cày Phim Cuối Tuần',
      href: '/search?q=weekend',
      image: '/images/cinema-hall-with-red-seat-wide-white-screen.jpg',
      description: 'Lên lịch xem phim cuối tuần với những suất chiếu đáng chú ý.',
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
              topic.image ? 'bg-slate-900 shadow-slate-950/30 border border-white/10' : 'bg-gradient-to-br from-slate-900 to-indigo-950 border border-white/10'
            }`}
            style={topic.image ? { backgroundImage: `url('${topic.image}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
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
                {topic.description || 'Khám phá bộ phim nổi bật.'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
