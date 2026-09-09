'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { A11y, EffectCoverflow, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { ChevronRight, Play } from 'lucide-react';
import { recommendationApi } from '@/lib/api';
import { deduplicateSectionRow } from '@/lib/recommendation-engine';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import type { FilmItem } from '@/components/film/FilmCard';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

interface MobileRelatedCarouselProps {
  slug: string;
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

function RecommendationSkeleton() {
  return (
    <section className="overflow-hidden py-1 md:hidden" aria-label="Đang tải phim gợi ý">
      <div className="mb-4 h-6 w-44 animate-pulse rounded-md bg-white/10" />
      <div className="flex items-center justify-center gap-3">
        <div className="h-56 w-24 -rotate-3 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="h-72 w-48 animate-pulse rounded-2xl bg-white/[0.08]" />
        <div className="h-56 w-24 rotate-3 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    </section>
  );
}

export function MobileRelatedCarousel({ slug, enabled = true }: MobileRelatedCarouselProps) {
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

  const films = useMemo(
    () =>
      deduplicateSectionRow((data?.items || []) as FilmItem[])
        .filter((film) => film.slug && film.slug !== slug)
        .slice(0, 12),
    [data?.items, slug],
  );

  if (!enabled || isLoading) return enabled ? <RecommendationSkeleton /> : null;
  if (films.length < 2) return null;

  return (
    <section className="overflow-hidden py-1 md:hidden" aria-labelledby="mobile-related-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="mobile-related-title" className="text-lg font-black tracking-tight text-white">
            Có thể bạn sẽ thích
          </h2>
          <p className="mt-0.5 text-[11px] font-medium text-neutral-500">
            Vuốt ngang để khám phá phim cùng gu
          </p>
        </div>
        <ChevronRight size={18} className="mb-1 shrink-0 text-neutral-500" aria-hidden="true" />
      </div>

      <Swiper
        modules={[EffectCoverflow, Pagination, A11y]}
        effect="coverflow"
        centeredSlides
        slidesPerView="auto"
        initialSlide={Math.min(1, films.length - 1)}
        speed={reduceMotion ? 0 : 420}
        threshold={6}
        resistanceRatio={0.8}
        grabCursor
        watchSlidesProgress
        loop={films.length >= 5}
        loopAdditionalSlides={2}
        lazyPreloadPrevNext={1}
        coverflowEffect={{
          rotate: 5,
          stretch: -6,
          depth: 105,
          modifier: 1,
          scale: 0.86,
          slideShadows: false,
        }}
        pagination={{ clickable: true, dynamicBullets: true }}
        className="!overflow-visible !pb-9 [&_.swiper-pagination-bullet]:!h-1.5 [&_.swiper-pagination-bullet]:!w-1.5 [&_.swiper-pagination-bullet]:!bg-white/40 [&_.swiper-pagination-bullet-active]:!w-5 [&_.swiper-pagination-bullet-active]:!rounded-full [&_.swiper-pagination-bullet-active]:!bg-violet-400"
        aria-label="Danh sách phim gợi ý"
      >
        {films.map((film) => {
          const title = film.name || film.title || 'Phim đề xuất';
          const rating = getRating(film);
          return (
            <SwiperSlide
              key={film.slug}
              className="!w-[58vw] !max-w-[224px] !min-w-[188px] transform-gpu transition-[opacity,filter] duration-300 motion-reduce:transition-none [&:not(.swiper-slide-active)]:opacity-50 [&:not(.swiper-slide-active)]:brightness-75"
            >
              <article className="group">
                <Link
                  href={`/film/${film.slug}`}
                  aria-label={`Xem thông tin phim ${title}`}
                  className="relative block aspect-[2/3] overflow-hidden rounded-2xl border border-white/15 bg-[#111318] shadow-[0_18px_48px_rgba(0,0,0,0.48)] outline-none transition-[border-color,transform] duration-300 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  <TmdbArtwork
                    film={film}
                    kind="poster"
                    alt={title}
                    className="absolute inset-0 h-full w-full"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/45 to-transparent" />
                  {rating && (
                    <span className="absolute left-0 top-0 rounded-br-md bg-[#f5c518] px-2 py-1 text-[10px] font-black text-black shadow-md">
                      IMDb {rating}
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-black/65 text-white shadow-lg backdrop-blur-md">
                    <Play size={14} className="ml-0.5 fill-current" aria-hidden="true" />
                  </span>
                </Link>

                <div className="px-1 pt-3 text-center">
                  <Link
                    href={`/film/${film.slug}`}
                    className="line-clamp-1 text-[15px] font-extrabold leading-tight text-white"
                  >
                    {title}
                  </Link>
                  <p className="mt-1 line-clamp-1 text-[11px] font-medium text-neutral-500">
                    {film.origin_name || [film.year, film.type === 'series' ? 'Phim bộ' : 'Phim lẻ'].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </article>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
