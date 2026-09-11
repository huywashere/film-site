'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { A11y, EffectCoverflow } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { movieApi } from '@/lib/api';
import { extractFilmItems } from '@/lib/movie-normalizer';
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

const MOBILE_DISCOVERY_FALLBACKS: FilmItem[] = [
  {
    slug: 'oppenheimer',
    name: 'Oppenheimer',
    origin_name: 'Oppenheimer',
    type: 'single',
    year: 2023,
    poster_url: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    vote_average: 8.9,
  },
  {
    slug: 'nguoi-ve-tu-coi-chet',
    name: 'Người Về Từ Cõi Chết',
    origin_name: 'The Revenant',
    type: 'single',
    year: 2015,
    poster_url: 'https://image.tmdb.org/t/p/w500/ji3ecJphATlVgWNY0B0RVXZizdf.jpg',
    vote_average: 8,
  },
  {
    slug: 'soi-gia-pho-wall',
    name: 'Sói Già Phố Wall',
    origin_name: 'The Wolf of Wall Street',
    type: 'single',
    year: 2013,
    poster_url: 'https://image.tmdb.org/t/p/w500/kW9LmvYHAaS9iA0tHmZVq8hQYoq.jpg',
    vote_average: 8.2,
  },
  {
    slug: 'chuyen-ngay-xua-o-hollywood',
    name: 'Chuyện Ngày Xưa Ở Hollywood',
    origin_name: 'Once Upon a Time in Hollywood',
    type: 'single',
    year: 2019,
    poster_url: 'https://image.tmdb.org/t/p/w500/8j58iEBw9pOXFD2L0nt0ZXeHviB.jpg',
    vote_average: 7.6,
  },
];

function discoveryFallbacks(slug: string) {
  return MOBILE_DISCOVERY_FALLBACKS.filter((film) => film.slug !== slug);
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffleWithSeed<T>(items: T[], seed: number) {
  const result = [...items];
  let state = seed || 1;
  const random = () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function getRecommendationSessionSeed() {
  const storageKey = 'netphim-mobile-related-seed-v1';
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) return stored;
    const created = window.crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    return String(Date.now());
  }
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

function isSeries(film: FilmItem) {
  const type = String(film.type || '').toLowerCase();
  return (
    /series|tv|phim-bo|hoathinh|anime/.test(type) || /tập|episode/i.test(film.episode_current || '')
  );
}

function belongsToGenre(film: FilmItem, genreSlug: string) {
  return film.category?.some((category) => category.slug === genreSlug) ?? false;
}

async function getCatalogFilms(request: () => Promise<{ data: unknown }>) {
  try {
    const response = await request();
    return extractFilmItems(response.data) as FilmItem[];
  } catch {
    return [] as FilmItem[];
  }
}

async function loadRelatedFilms(film: FilmItem, slug: string, sessionSeed: string) {
  const genreSlugs = (film.category || [])
    .map((category) => category.slug)
    .filter((genreSlug): genreSlug is string => Boolean(genreSlug));
  const seed = hashSeed(`${sessionSeed}:${slug}`);
  const genreSlug = genreSlugs.length ? genreSlugs[seed % genreSlugs.length] : '';
  const firstPage = 1 + ((seed >>> 5) % 3);
  let candidates = genreSlug
    ? await getCatalogFilms(() => movieApi.getByGenre(genreSlug, firstPage))
    : [];

  candidates = deduplicateSectionRow(candidates).filter(
    (item) => item.slug !== slug && belongsToGenre(item, genreSlug),
  );

  if (genreSlug && candidates.length < 8) {
    const nextPage = firstPage === 3 ? 1 : firstPage + 1;
    const moreInGenre = await getCatalogFilms(() => movieApi.getByGenre(genreSlug, nextPage));
    candidates = deduplicateSectionRow([...candidates, ...moreInGenre]).filter(
      (item) => item.slug !== slug && belongsToGenre(item, genreSlug),
    );
  }

  if (!genreSlug) {
    const sameType = await getCatalogFilms(() =>
      isSeries(film) ? movieApi.getSeries(1) : movieApi.getSingle(1),
    );
    candidates = deduplicateSectionRow([...candidates, ...sameType]).filter(
      (item) => item.slug !== slug,
    );
  }

  if (candidates.length === 0 && !genreSlug) return discoveryFallbacks(slug);
  return shuffleWithSeed(candidates, seed).slice(0, 12);
}

function RecommendationSkeleton({ film, onOpen }: { film: FilmItem; onOpen?: () => void }) {
  return (
    <section
      className="w-screen max-w-none shrink-0 overflow-hidden py-2 sm:hidden"
      aria-label="Đang tải phim gợi ý"
    >
      <div className="flex items-center justify-center gap-2 px-2">
        <div className="h-60 w-[26vw] max-w-28 -rotate-6 animate-pulse rounded-[20px] border border-white/10 bg-white/[0.05]" />
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Mở poster phim ${film.name || film.title || ''}`}
          className="relative aspect-[2/3] w-[58vw] min-w-[196px] max-w-[228px] shrink-0 overflow-hidden rounded-[22px] border border-violet-300/55 bg-[#111318] shadow-[0_24px_70px_rgba(0,0,0,0.68)]"
        >
          <TmdbArtwork
            film={film}
            kind="poster"
            alt={film.name || film.title || ''}
            priority
            allowTitleLookup
            className="absolute inset-0 h-full w-full"
          />

        </button>
        <div className="h-60 w-[26vw] max-w-28 rotate-6 animate-pulse rounded-[20px] border border-white/10 bg-white/[0.05]" />
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
  const [activeSlideIndex, setActiveSlideIndex] = useState(1);
  const [sessionSeed] = useState(getRecommendationSessionSeed);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setReduceMotion(media.matches);
    syncMotionPreference();
    media.addEventListener('change', syncMotionPreference);
    return () => media.removeEventListener('change', syncMotionPreference);
  }, []);

  useEffect(() => {
    setActiveSlideIndex(1);
  }, [slug]);

  const genreKey = (currentFilm.category || [])
    .map((category) => category.slug)
    .filter(Boolean)
    .join(',');
  const { data: relatedFilms = [], isLoading } = useQuery({
    queryKey: [
      'film-detail-mobile-related-v3',
      slug,
      genreKey,
      currentFilm.type || '',
      sessionSeed,
    ],
    queryFn: () => loadRelatedFilms(currentFilm, slug, sessionSeed),
    enabled: enabled && Boolean(slug),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const currentCard = useMemo(
    () => ({
      ...currentFilm,
      slug,
      poster_url: currentPosterUrl || currentFilm.poster_url,
    }),
    [currentFilm, currentPosterUrl, slug],
  );

  const films = useMemo(() => {
    if (relatedFilms.length === 0) return [currentCard];

    // Put the current film between two real recommendations so both side cards
    // are already visible when the carousel first appears.
    return [relatedFilms[0], currentCard, ...relatedFilms.slice(1)];
  }, [currentCard, relatedFilms]);

  if (!enabled || isLoading) {
    return enabled ? (
      <RecommendationSkeleton film={currentCard} onOpen={onOpenCurrentPoster} />
    ) : null;
  }

  return (
    <section
      className="w-screen max-w-none shrink-0 overflow-hidden py-2 sm:hidden"
      aria-label="Poster phim và gợi ý kế bên"
    >
      <Swiper
        modules={[EffectCoverflow, A11y]}
        effect="coverflow"
        centeredSlides
        slidesPerView="auto"
        initialSlide={films.length > 1 ? 1 : 0}
        speed={reduceMotion ? 0 : 520}
        threshold={6}
        resistanceRatio={0.72}
        longSwipesRatio={0.18}
        longSwipesMs={180}
        preventInteractionOnTransition
        grabCursor
        watchSlidesProgress
        loop={false}
        lazyPreloadPrevNext={2}
        onSlideChange={(swiper) => setActiveSlideIndex(swiper.activeIndex)}
        coverflowEffect={{
          rotate: 7,
          stretch: -18,
          depth: 90,
          modifier: 1,
          scale: 0.82,
          slideShadows: false,
        }}
        className="mobile-related-swiper !overflow-visible px-1"
        aria-label="Vuốt để xem poster phim gợi ý"
      >
        {films.map((film, index) => {
          const title = film.name || film.title || 'Phim đề xuất';
          const rating = getRating(film);
          const isCurrentFilm = film.slug === slug;
          const isNearCenter = Math.abs(index - activeSlideIndex) <= 1;
          const poster = (
            <>
              <TmdbArtwork
                film={film}
                kind="poster"
                alt={title}
                priority={Math.abs(index - activeSlideIndex) <= 2}
                allowTitleLookup={isNearCenter}
                className="absolute inset-0 h-full w-full"
              />

              <div className="mobile-related-card-shade pointer-events-none absolute inset-0 bg-black/25" />
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
              className="mobile-related-slide !w-[58vw] !max-w-[228px] !min-w-[196px] transform-gpu transition-opacity duration-500 ease-out motion-reduce:transition-none [&:not(.swiper-slide-active)]:opacity-80"
            >
              <article>
                {isCurrentFilm ? (
                  <button
                    type="button"
                    onClick={onOpenCurrentPoster}
                    aria-label={`Mở poster phim ${title}`}
                    aria-current="true"
                    className="relative block aspect-[2/3] w-full overflow-hidden rounded-[22px] border border-violet-300/55 bg-[#111318] shadow-[0_24px_70px_rgba(0,0,0,0.68)] outline-none transition-transform duration-300 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-violet-400"
                  >
                    {poster}
                  </button>
                ) : (
                  <Link
                    href={`/film/${film.slug}`}
                    aria-label={`Xem thông tin phim ${title}`}
                    className="relative block aspect-[2/3] overflow-hidden rounded-[22px] border border-white/25 bg-[#111318] shadow-[0_18px_48px_rgba(0,0,0,0.58)] outline-none transition-[border-color,transform] duration-300 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-violet-400"
                  >
                    {poster}
                  </Link>
                )}
              </article>
            </SwiperSlide>
          );
        })}
      </Swiper>
      {films.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-semibold tracking-wide text-white/55">
          <ChevronLeft size={14} aria-hidden="true" />
          <span>Vuốt để khám phá phim khác</span>
          <ChevronRight size={14} aria-hidden="true" />
        </div>
      )}
    </section>
  );
}
