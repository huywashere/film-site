'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { A11y, EffectCoverflow } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Play } from 'lucide-react';
import { recommendationApi } from '@/lib/api';
import { deduplicateSectionRow } from '@/lib/recommendation-engine';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import type { FilmItem } from '@/components/film/FilmCard';

import 'swiper/css';
import 'swiper/css/effect-coverflow';

interface MobileRelatedCarouselProps {
  slug: string;
  currentFilm: FilmItem;
  currentPosterUrl?: string | null;
  onOpenCurrentPoster?: () => void;
  enabled?: boolean;
}

function getRating(film: FilmItem) {
  const value = Number(
    film.imdb?.vote_average ||
      film.imdb?.rating ||
      film.imdb_rating ||
      film.tmdb?.vote_average ||
      film.vote_average ||
      0,
  );
  return Number.isFinite(value) && value > 0 ? value.toFixed(1) : null;
}

function RecommendationSkeleton({
  film,
  onOpen,
}: {
  film: FilmItem;
  onOpen?: () => void;
}) {
  return (
    <section className="-mx-4 overflow-hidden py-1 sm:hidden" aria-label="Đang tải phim gợi ý">
      <div className="flex items-center justify-center gap-3">
        <div className="h-56 w-24 -rotate-3 animate-pulse rounded-2xl bg-white/[0.04]" />
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Mở poster phim ${film.name || film.title || ''}`}
          className="relative h-[321px] w-[214px] shrink-0 overflow-hidden rounded-2xl border border-violet-300/45 bg-[#111318] shadow-[0_20px_58px_rgba(0,0,0,0.58)]"
        >
          <TmdbArtwork
            film={film}
            kind="poster"
            alt={film.name || film.title || ''}
            priority
            className="absolute inset-0 h-full w-full"
          />
        </button>
        <div className="h-56 w-24 rotate-3 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    </section>
  );
}

export function MobileRelatedCarousel({
  slug,
  currentFilm,
  currentPosterUrl,
  onOpenCurrentPoster,
  enabled = true,
}: MobileRelatedCarouselProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setReduceMotion(media.matches);
    syncMotionPreference();
    media.addEventListener('change', syncMotionPreference);
    return () => media.removeEventListener('change', syncMotionPreference);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['film-detail-mobile-related', slug],
    queryFn: () => recommendationApi.getSimilar(slug, 12),
    enabled: enabled && Boolean(slug),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const relatedFilms = useMemo(
    () =>
      deduplicateSectionRow((data?.items || []) as FilmItem[])
        .filter((film) => film.slug && film.slug !== slug)
        .slice(0, 12),
    [data?.items, slug],
  );

  const currentCard = useMemo(
    () => ({
      ...currentFilm,
      slug,
      poster_url: currentPosterUrl || currentFilm.poster_url,
    }),
    [currentFilm, currentPosterUrl, slug],
  );

  const films = useMemo(
    () =>
      relatedFilms.length >= 2
        ? [relatedFilms[0], currentCard, ...relatedFilms.slice(1)]
        : [currentCard],
    [currentCard, relatedFilms],
  );

  if (!enabled || isLoading) {
    return enabled ? (
      <RecommendationSkeleton film={currentCard} onOpen={onOpenCurrentPoster} />
    ) : null;
  }

  return (
    <section className="-mx-4 overflow-hidden py-1 sm:hidden" aria-label="Poster phim và gợi ý kế bên">
      <Swiper
        modules={[EffectCoverflow, A11y]}
        effect="coverflow"
        centeredSlides
        slidesPerView="auto"
        initialSlide={films.length > 1 ? 1 : 0}
        speed={reduceMotion ? 0 : 420}
        threshold={6}
        resistanceRatio={0.8}
        grabCursor
        watchSlidesProgress
        loop={false}
        lazyPreloadPrevNext={1}
        coverflowEffect={{
          rotate: 5,
          stretch: -6,
          depth: 105,
          modifier: 1,
          scale: 0.86,
          slideShadows: false,
        }}
        className="!overflow-visible"
        aria-label="Vuốt để xem poster phim gợi ý"
      >
        {films.map((film) => {
          const title = film.name || film.title || 'Phim đề xuất';
          const rating = getRating(film);
          const isCurrentFilm = film.slug === slug;
          const poster = (
            <>
              <TmdbArtwork
                film={film}
                kind="poster"
                alt={title}
                priority={isCurrentFilm}
                className="absolute inset-0 h-full w-full"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/45 to-transparent" />
              {!isCurrentFilm && rating && (
                <span className="absolute left-0 top-0 rounded-br-md bg-[#f5c518] px-2 py-1 text-[10px] font-black text-black shadow-md">
                  IMDb {rating}
                </span>
              )}
              {!isCurrentFilm && (
                <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-black/65 text-white shadow-lg backdrop-blur-md">
                  <Play size={14} className="ml-0.5 fill-current" aria-hidden="true" />
                </span>
              )}
            </>
          );

          return (
            <SwiperSlide
              key={`${isCurrentFilm ? 'current' : 'related'}-${film.slug}`}
              className="!w-[55vw] !max-w-[230px] !min-w-[196px] transform-gpu transition-[opacity,filter] duration-300 motion-reduce:transition-none [&:not(.swiper-slide-active)]:opacity-50 [&:not(.swiper-slide-active)]:brightness-75"
            >
              <article>
                {isCurrentFilm ? (
                  <button
                    type="button"
                    onClick={onOpenCurrentPoster}
                    aria-label={`Mở poster phim ${title}`}
                    aria-current="true"
                    className="relative block aspect-[2/3] w-full overflow-hidden rounded-2xl border border-violet-300/45 bg-[#111318] shadow-[0_20px_58px_rgba(0,0,0,0.58)] outline-none transition-transform duration-300 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-violet-400"
                  >
                    {poster}
                  </button>
                ) : (
                  <Link
                    href={`/film/${film.slug}`}
                    aria-label={`Xem thông tin phim ${title}`}
                    className="relative block aspect-[2/3] overflow-hidden rounded-2xl border border-white/15 bg-[#111318] shadow-[0_18px_48px_rgba(0,0,0,0.48)] outline-none transition-[border-color,transform] duration-300 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-violet-400"
                  >
                    {poster}
                  </Link>
                )}
              </article>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
