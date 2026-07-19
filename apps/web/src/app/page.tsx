'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import NextImage from 'next/image';
import { useState, useEffect, useRef } from 'react';
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
import { movieApi } from '@/lib/api';
import { FilmCard, FilmCardSkeleton, FilmItem, resolveImageUrl } from '@/components/film/FilmCard';
import { useTranslation } from '@/store/langStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import styled from '@emotion/styled';

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
  const { t } = useTranslation();
  const featured = films.slice(0, 5);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((c) => (c + 1) % featured.length), 8000);
    return () => clearInterval(timer);
  }, [featured.length]);

  const film = featured[current];
  if (!film) return null;

  const backdrop = resolveImageUrl(film.thumb_url) || resolveImageUrl(film.poster_url);

  return (
    <div className="relative h-[90vh] md:h-screen w-full overflow-hidden bg-[#060814]">
      {/* Background Poster Image */}
      {backdrop && (
        <AnimatePresence mode="wait">
          <motion.div
            key={film.slug}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full"
          >
            <NextImage
              src={backdrop}
              alt={film.name}
              fill
              priority
              quality={100}
              sizes="100vw"
              className="object-cover object-center brightness-[0.7]"
              unoptimized
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Cinematic Gradient Masks */}
      {/* Left Mask for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#060814] via-[#060814]/60 to-transparent w-full md:w-[65%] z-10" />
      {/* Bottom Mask for page integration */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#060814] via-[#060814]/80 to-transparent z-10" />
      {/* Overall Overlay */}
      <div className="absolute inset-0 bg-black/10 z-0" />

      {/* Content Container */}
      <div className="absolute inset-0 z-20 flex items-center">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="max-w-2xl flex flex-col space-y-4 md:space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="flex flex-col space-y-4 md:space-y-5"
              >
                {/* Badges */}
                <div className="flex items-center space-x-3">
                  <span className="bg-white text-black text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm shadow">
                    NEW
                  </span>
                  <span className="border border-white/40 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                    12
                  </span>
                  {film.year && (
                    <span className="text-white/60 text-xs font-semibold">
                      {film.year}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-7xl font-extrabold text-white tracking-wide leading-none drop-shadow-md uppercase font-sans">
                  {film.name}
                </h1>
                {film.origin_name && (
                  <p className="text-base md:text-xl text-white/70 font-semibold tracking-wide -mt-2">
                    {film.origin_name}
                  </p>
                )}

                {/* Tagline / Mini Description */}
                <p className="text-xs md:text-sm text-white/80 max-w-xl leading-relaxed line-clamp-3">
                  {t('home.heroDesc')}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3 pt-2">
                  <Link
                    href={`/watch/${film.slug}`}
                    className="flex items-center space-x-2 bg-[#232733] hover:bg-[#2d3242] text-white px-7 py-3 rounded-full text-xs font-black tracking-wider uppercase transition-colors shadow-md border border-white/5"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>Go to Movie</span>
                  </Link>
                  <Link
                    href={`/film/${film.slug}`}
                    className="flex items-center space-x-2 bg-white/10 hover:bg-white/25 text-white px-7 py-3 rounded-full text-xs font-black tracking-wider uppercase transition-colors backdrop-blur-sm border border-white/10"
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

      {/* Slide Indicators - Bottom Center */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-20 flex space-x-2.5">
        {featured.map((_, i) => (
          <button
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === current ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/60'}`}
            onClick={() => setCurrent(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
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


// ── Main Home Page ──────────────────────────────────────────
export default function HomePage() {
  const { t } = useTranslation();

  const {
    data: latestData,
    isLoading: latestLoading,
    error: latestError,
  } = useQuery({
    queryKey: ['latest', 1],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
  });

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ['series', 1],
    queryFn: () => movieApi.getSeries(1).then((r) => r.data),
  });

  const { data: singleData, isLoading: singleLoading } = useQuery({
    queryKey: ['single', 1],
    queryFn: () => movieApi.getSingle(1).then((r) => r.data),
  });

  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: ['anime', 1],
    queryFn: () => movieApi.getAnime(1).then((r) => r.data),
  });

  const latestFilms: FilmItem[] = latestData?.items || latestData?.data?.items || [];
  const seriesFilms: FilmItem[] = seriesData?.data?.items || seriesData?.items || [];
  const singleFilms: FilmItem[] = singleData?.data?.items || singleData?.items || [];
  const animeFilms: FilmItem[] = animeData?.data?.items || animeData?.items || [];

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
      {latestLoading ? (
        <div className="w-full h-[80vh] md:h-[88vh] bg-neutral-900 animate-pulse flex items-center justify-center">
          <Loader2 className="animate-spin text-netflixRed" size={32} />
        </div>
      ) : (
        <HeroBanner films={latestFilms} />
      )}

      {/* Main Row Content */}
      <div className="container mx-auto px-4 md:px-8 max-w-7xl relative pt-6 md:pt-10 z-30">
        {/* Removed Genre Quick Links as per request */}

        {/* Phim Mới Cập Nhật */}
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
    </div>
  );
}
