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

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

// ── Emotion Styled Components ─────────────────────────────────────
const StyledSwiperContainer = styled.div`
  position: relative;
  
  .swiper {
    padding: 12px 4px;
  }
  
  .swiper-button-prev,
  .swiper-button-next {
    color: white !important;
    width: 5vw !important;
    max-width: 60px;
    height: 100% !important;
    top: 0 !important;
    margin-top: 0 !important;
    transition: all 0.3s ease;
    opacity: 0;
  }

  /* Left gradient fade */
  .swiper-button-prev { 
    left: 0 !important; 
    background: linear-gradient(to right, rgba(6,8,20,0.95) 0%, rgba(6,8,20,0.5) 60%, transparent 100%);
  }
  
  /* Right gradient fade */
  .swiper-button-next { 
    right: 0 !important; 
    background: linear-gradient(to left, rgba(6,8,20,0.95) 0%, rgba(6,8,20,0.5) 60%, transparent 100%);
  }

  &:hover .swiper-button-prev,
  &:hover .swiper-button-next {
    opacity: 1;
  }

  .swiper-button-prev:hover,
  .swiper-button-next:hover {
    color: #E50914 !important;
  }

  .swiper-button-prev::after,
  .swiper-button-next::after {
    font-size: 28px !important;
    font-weight: 900 !important;
    transition: transform 0.2s ease;
    text-shadow: 0 2px 10px rgba(0,0,0,0.8);
  }

  .swiper-button-prev:hover::after,
  .swiper-button-next:hover::after {
    transform: scale(1.3);
  }
`;

// ── Netflix Hero Banner ───────────────────────────────────────────
function HeroBanner({ films }: { films: FilmItem[] }) {
  const [current, setCurrent] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const { t } = useTranslation();
  const featured = films.slice(0, 15);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((c) => (c + 1) % featured.length), 8000);
    return () => clearInterval(timer);
  }, [featured.length]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      {/* Background Poster Image */}
      {backdrop && (
        <AnimatePresence>
          <motion.div
            key={film.slug}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              transform: `translateY(${scrollY * 0.3}px) scale(${1 + scrollY * 0.00015})`,
              opacity: Math.max(0, 1 - scrollY / 800),
            }}
            className="absolute inset-0 w-full h-full"
          >
            <NextImage
              src={backdrop}
              alt={film.name}
              fill
              priority
              quality={100}
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
      <div 
        style={{
          transform: `translateY(${scrollY * 0.2}px)`,
          opacity: Math.max(0, 1 - scrollY / 600),
        }}
        className="absolute inset-0 z-20 flex items-center"
      >
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



      {/* Slide Indicators - Bottom Center Left/Right aligned */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-20 flex space-x-2">
        {featured.map((_, i) => (
          <button
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === current
                ? 'w-8 bg-white'
                : 'w-3 bg-white/20 hover:bg-white/40'
            }`}
            onClick={() => setCurrent(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Scroll Down Indicator - Center Bottom */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-14 z-20 flex flex-col items-center animate-bounce cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
        onClick={() => window.scrollTo({ top: window.innerHeight * 0.85, behavior: 'smooth' })}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
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
                  <FilmCardSkeleton width={200} hideDetails={true} />
                </SwiperSlide>
              ))
            : films.slice(0, 12).map((film) => (
                <SwiperSlide key={film.slug} style={{ width: '200px' }}>
                  <FilmCard film={film} width={200} variant="standard" hideDetails={true} />
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


// ── Scroll To Top Button Component ──────────────────────────
function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-2xl bg-card/90 text-primary border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-card hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-95 flex items-center justify-center"
      aria-label="Cuộn lên đầu trang"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      >
        <path d="M12 19V5" />
        <path d="M6 11l6-6 6 6" />
      </svg>
    </button>
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

        {/* Bottom Metadata Widgets Group (Top Reviews + Grid Widgets) */}
        <div className="mt-14 border-t border-white/5 pt-10">
          <TopReviewsSection />
          <HomepageWidgetsGrid latestFilms={latestFilms} />
        </div>
      </div>

      {/* Float components */}
      <KeyboardSearchBanner onClick={() => setIsSearchOpen(true)} />
      <ScrollToTopButton />

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

// ── Top Reviews Carousel Section (Glassmorphism design) ──────────
function TopReviewsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: dbReviews } = useQuery({
    queryKey: ['recent-reviews-homepage'],
    queryFn: () => reviewsApi.getRecent(1).then((r) => r.data).catch(() => []),
  });

  const mockReviews = [
    {
      id: 'mock-1',
      content: 'Phim đỉnh quá mọi người ơi, kỹ xảo hoành tráng xem không rời mắt luôn! 🍿⭐⭐⭐⭐⭐',
      likeCount: 14,
      user: {
        username: 'Guizio',
        displayName: 'Guizio',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      },
      movie: {
        name: 'Đội Chống Xã Hội Đen',
        posterUrl: 'https://img.phimimg.com/uploads/movies/doi-chong-xa-hoi-den-thumb.jpg',
      }
    },
    {
      id: 'mock-2',
      content: 'Ôi xem xong mà cảm xúc đọng lại mãi vcl, nhạc phim hay da diết thực sự... 😭💖',
      likeCount: 19,
      user: {
        username: 'baongoc',
        displayName: 'baongoc',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      },
      movie: {
        name: 'Biệt Đội Siêu Đẳng',
        posterUrl: 'https://img.phimimg.com/uploads/movies/biet-doi-sieu-dang-thumb.jpg',
      }
    },
    {
      id: 'mock-3',
      content: 'Tr ơiii đã quá ik như nàng công chúa và chàng hoàng tử v đẹp quá 😆😍',
      likeCount: 8,
      user: {
        username: 'Yul',
        displayName: 'Yul',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      },
      movie: {
        name: 'Tiếng Yêu Này Anh Dịch Được Không?',
        posterUrl: 'https://img.phimimg.com/uploads/movies/tieng-yeu-nay-anh-dich-duoc-khong-thumb.jpg',
      }
    },
    {
      id: 'mock-4',
      content: 'Xem phim không quảng cáo tại rophimz.live nhé mn. Admin nhiệt tình quá!',
      likeCount: 22,
      user: {
        username: 'Công An Đây',
        displayName: 'Công An Đây',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
      },
      movie: {
        name: 'Vượt Qua Bóng Tối',
        posterUrl: 'https://img.phimimg.com/uploads/movies/vuot-qua-bong-toi-thumb.jpg',
      }
    },
    {
      id: 'mock-5',
      content: 'trời ơi hay quá quáaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      likeCount: 31,
      user: {
        username: 'NQT',
        displayName: 'Admin NQT',
        avatarUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100',
      },
      movie: {
        name: 'Chó Săn Công Lý',
        posterUrl: 'https://img.phimimg.com/uploads/movies/cho-san-cong-ly-thumb.jpg',
      }
    }
  ];

  // Merge database reviews and gorgeous design mock reviews
  const reviewsToShow = [...(dbReviews || []), ...mockReviews].slice(0, 10);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth * 0.5 
        : scrollLeft + clientWidth * 0.5;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-10 relative group">
      {/* Title */}
      <div className="flex items-center space-x-2 mb-4 px-1">
        <span className="text-yellow-500 text-base">🏅</span>
        <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          Top bình luận
        </h3>
      </div>

      {/* Carousel Wrapper */}
      <div className="relative px-1">
        {/* Navigation Arrows */}
        <button
          onClick={() => scroll('left')}
          className="absolute -left-2 md:-left-4 top-1/2 -translate-y-1/2 z-40 bg-card/90 border border-border hover:border-foreground/20 dark:bg-[#0c0f16]/90 dark:border-white/5 dark:hover:border-white/20 text-foreground dark:text-white w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 shadow-lg backdrop-blur-md"
          aria-label="Previous Slide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute -right-2 md:-right-4 top-1/2 -translate-y-1/2 z-40 bg-card/90 border border-border hover:border-foreground/20 dark:bg-[#0c0f16]/90 dark:border-white/5 dark:hover:border-white/20 text-foreground dark:text-white w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 shadow-lg backdrop-blur-md"
          aria-label="Next Slide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>

        {/* Scrollable Area */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-none scroll-smooth pb-2"
        >
          {reviewsToShow.map((item) => {
            const avatar = item.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${item.user?.username || 'User'}`;
            const moviePoster = item.movie?.posterUrl || item.movie?.thumbUrl || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=200';
            const username = item.user?.displayName || item.user?.username || 'Thành viên';
            const isAdmin = username.toLowerCase().includes('admin');
            
            return (
              <div
                key={item.id}
                className="w-[280px] md:w-[325px] shrink-0 bg-card/75 dark:bg-[#0e121d]/50 border border-border dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-card dark:hover:bg-[#141a2a]/65 hover:border-neutral-300 dark:hover:border-white/10 transition-all duration-300 shadow-md hover:shadow-xl backdrop-blur-md group/card"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={avatar}
                      alt={username}
                      className="w-9 h-9 rounded-full object-cover border border-border dark:border-white/10 group-hover/card:border-neutral-300 dark:group-hover/card:border-white/20 transition-all"
                    />
                    <div className="min-w-0 flex flex-col">
                      <span className="font-bold text-[11px] text-foreground dark:text-neutral-200 line-clamp-1 group-hover/card:text-yellow-600 dark:group-hover/card:text-yellow-400 transition-colors">
                        {username}
                      </span>
                      {isAdmin ? (
                        <span className="text-[7px] text-red-600 dark:text-red-500 font-extrabold uppercase tracking-widest bg-red-500/10 dark:bg-red-950/40 border border-red-500/20 px-1.5 py-0.5 rounded shrink-0 w-fit mt-0.5">
                          Admin
                        </span>
                      ) : (
                        <span className="text-[7px] text-yellow-600 dark:text-yellow-500 font-extrabold uppercase tracking-widest bg-yellow-500/10 dark:bg-yellow-950/40 border border-yellow-500/20 px-1.5 py-0.5 rounded shrink-0 w-fit mt-0.5">
                          PRO oo
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Movie Poster */}
                  <div className="w-9 h-12 rounded bg-neutral-100 dark:bg-white/5 border border-border dark:border-white/10 overflow-hidden shrink-0 shadow-sm relative group-hover/card:scale-105 transition-transform duration-300">
                    <img
                      src={moviePoster}
                      alt={item.movie?.name || 'Phim'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Content */}
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-3 mb-4 min-h-[48px] break-words italic">
                  "{item.content}"
                </p>

                {/* Footer Metrics */}
                <div className="flex items-center gap-4 text-neutral-500 text-[10px] border-t border-border/50 dark:border-white/5 pt-3">
                  <button className="flex items-center gap-1.5 hover:text-foreground dark:hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-neutral-500"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    <span>{item.likeCount || 0}</span>
                  </button>
                  <button className="flex items-center gap-1.5 hover:text-foreground dark:hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-neutral-500 rotate-180"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    <span>0</span>
                  </button>
                  <div className="flex items-center gap-1.5 ml-auto text-neutral-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span>0</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Homepage Widgets Grid (Sôi Nổi Nhất, Yêu Thích Nhất, Thể Khoa Hot, Bình Luận Mới) ──────────
function HomepageWidgetsGrid({ latestFilms }: { latestFilms: FilmItem[] }) {
  const { t } = useTranslation();
  const { data: dbReviews } = useQuery({
    queryKey: ['recent-reviews-widgets'],
    queryFn: () => reviewsApi.getRecent(1).then((r) => r.data).catch(() => []),
  });

  const mockComments = [
    {
      id: 'w-mock-1',
      content: 'Xem phim không quảng cáo tại rophimz.live nhé mn.',
      user: {
        username: 'Công An Đây',
        displayName: 'Công An Đây',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      },
      movie: {
        name: 'Đội Chống Xã Hội Đen - QCTB',
        slug: 'doi-chong-xa-hoi-den'
      }
    },
    {
      id: 'w-mock-2',
      content: 'Xem phim không quảng cáo tại rophimz.live nhé mn.',
      user: {
        username: 'Công An Đây',
        displayName: 'Công An Đây',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      },
      movie: {
        name: 'Biệt Đội Siêu Đẳng',
        slug: 'biet-doi-sieu-dang'
      }
    },
    {
      id: 'w-mock-3',
      content: 'Xem phim không quảng cáo tại rophimz.live nhé mn.',
      user: {
        username: 'Công An Đây',
        displayName: 'Công An Đây',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      },
      movie: {
        name: 'Tiếng yêu này anh dịch được không?',
        slug: 'tieng-yeu-nay-anh-dich-duoc-khong'
      }
    },
    {
      id: 'w-mock-4',
      content: 'cảm lỗi à ad sao bấm vô ra phim thái lan thế kia',
      user: {
        username: 'sa',
        displayName: 'sa',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      },
      movie: {
        name: 'Vượt Qua Bóng Tối',
        slug: 'vuot-qua-bong-toi'
      }
    }
  ];

  const commentsToShow = [...(dbReviews || []).map((r: any) => ({
    id: r.id,
    content: r.content,
    user: r.user,
    movie: { name: r.movie?.title || r.movie?.name || 'Phim', slug: r.movie?.id || r.movie?.slug }
  })), ...mockComments].slice(0, 4);

  // Sôi nổi nhất (Movies with most activity)
  const activeMovies = latestFilms.slice(0, 5);

  // Yêu thích nhất (Highly rated/Favorite movies)
  const favoriteMovies = latestFilms.slice(5, 10);

  // Thể loại hot with their color schemes (high contrast in both dark/light modes)
  const hotGenres = [
    { name: 'Chính kịch', slug: 'chinh-kich', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20' },
    { name: 'Hành động', slug: 'hanh-dong', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20' },
    { name: 'Phiêu lưu', slug: 'phieu-luu', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20' },
    { name: 'Hài Hước', slug: 'hai-huoc', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/20' },
    { name: 'Tình Cảm', slug: 'tinh-cam', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-10 border-t border-border dark:border-white/5 pt-8">
      {/* Column 1: Sôi Nổi Nhất */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-2 mb-5">
          <span className="text-yellow-500 text-sm">🎬</span>
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Sôi nổi nhất
          </h3>
        </div>
        <div className="flex flex-col gap-3.5">
          {activeMovies.map((film, index) => {
            const poster = resolveImageUrl(film.poster_url) || resolveImageUrl(film.thumb_url);
            return (
              <div key={film.slug} className="flex items-center gap-3.5 group/item">
                <span className="text-neutral-500 text-xs font-bold w-4">{index + 1}.</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-yellow-500/80"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
                <div className="w-8 h-10 rounded bg-neutral-100 dark:bg-white/5 overflow-hidden shrink-0 border border-border dark:border-white/10 relative group-hover/item:scale-105 transition-transform duration-300">
                  {poster && <img src={poster} alt={film.name} className="w-full h-full object-cover" />}
                </div>
                <Link
                  href={`/film/${film.slug}`}
                  className="text-[11px] font-bold text-neutral-700 hover:text-primary dark:text-neutral-300 dark:hover:text-yellow-500 transition-colors line-clamp-1 truncate min-w-0"
                >
                  {film.name}
                </Link>
              </div>
            );
          })}
        </div>
        <Link href="/films" className="text-[10px] text-neutral-500 hover:text-neutral-800 dark:hover:text-white mt-5 transition-colors font-medium">
          Xem thêm
        </Link>
      </div>

      {/* Column 2: Yêu Thích Nhất */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-2 mb-5">
          <span className="text-yellow-500 text-sm">💛</span>
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Yêu thích nhất
          </h3>
        </div>
        <div className="flex flex-col gap-3.5">
          {favoriteMovies.map((film, index) => {
            const poster = resolveImageUrl(film.poster_url) || resolveImageUrl(film.thumb_url);
            return (
              <div key={film.slug} className="flex items-center gap-3.5 group/item">
                <span className="text-neutral-500 text-xs font-bold w-4">{index + 1}.</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-yellow-500/80"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
                <div className="w-8 h-10 rounded bg-neutral-100 dark:bg-white/5 overflow-hidden shrink-0 border border-border dark:border-white/10 relative group-hover/item:scale-105 transition-transform duration-300">
                  {poster && <img src={poster} alt={film.name} className="w-full h-full object-cover" />}
                </div>
                <Link
                  href={`/film/${film.slug}`}
                  className="text-[11px] font-bold text-neutral-700 hover:text-primary dark:text-neutral-300 dark:hover:text-yellow-500 transition-colors line-clamp-1 truncate min-w-0"
                >
                  {film.name}
                </Link>
              </div>
            );
          })}
        </div>
        <Link href="/films" className="text-[10px] text-neutral-500 hover:text-neutral-800 dark:hover:text-white mt-5 transition-colors font-medium">
          Xem thêm
        </Link>
      </div>

      {/* Column 3: Thể Loại Hot */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-2 mb-5">
          <span className="text-yellow-500 text-sm">📂</span>
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Thể loại hot
          </h3>
        </div>
        <div className="flex flex-col gap-3.5">
          {hotGenres.map((genre, index) => (
            <div key={genre.slug} className="flex items-center gap-3.5 group/item">
              <span className="text-neutral-500 text-xs font-bold w-4">{index + 1}.</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-yellow-500/80"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
              <Link
                href={`/genre/${genre.slug}`}
                className={`text-[9px] font-black uppercase tracking-wider py-1 px-3.5 rounded-full border transition-all duration-300 ${genre.color}`}
              >
                {genre.name}
              </Link>
            </div>
          ))}
        </div>
        <Link href="/genre/chinh-kich" className="text-[10px] text-neutral-500 hover:text-neutral-800 dark:hover:text-white mt-5 transition-colors font-medium">
          Xem thêm
        </Link>
      </div>

      {/* Column 4: Bình Luận Mới */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-2 mb-5">
          <span className="text-yellow-500 text-sm">⚡</span>
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Bình luận mới
          </h3>
        </div>
        <div className="flex flex-col gap-3">
          {commentsToShow.map((item: any) => {
            const avatar = item.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${item.user?.username || 'User'}`;
            return (
              <div key={item.id} className="flex gap-3 bg-card/60 dark:bg-[#0d111b]/20 border border-border dark:border-white/5 rounded-xl p-3 hover:bg-card dark:hover:bg-[#141b2b]/40 hover:border-neutral-300 dark:hover:border-white/10 transition-all duration-300 shadow-sm">
                <img
                  src={avatar}
                  alt={item.user?.displayName || 'User'}
                  className="w-7 h-7 rounded-full object-cover border border-border dark:border-white/10 mt-0.5"
                />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[10px] text-foreground">
                      {item.user?.displayName || item.user?.username || 'User'}
                    </span>
                    <span className="text-[7px] text-yellow-600 dark:text-yellow-500 font-extrabold uppercase tracking-widest bg-yellow-500/10 dark:bg-yellow-950/40 border border-yellow-500/20 px-1 py-0.2 rounded shrink-0">
                      oo
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-600 dark:text-neutral-400 line-clamp-1 leading-normal mt-0.5 italic font-medium">
                    {item.content}
                  </p>
                  <Link
                    href={`/film/${item.movie.slug}`}
                    className="text-[9px] text-primary hover:text-primary/80 dark:text-yellow-500/80 dark:hover:text-yellow-400 font-bold flex items-center gap-1 mt-1 truncate"
                  >
                    <span>▶</span>
                    <span className="truncate">{item.movie.name}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
