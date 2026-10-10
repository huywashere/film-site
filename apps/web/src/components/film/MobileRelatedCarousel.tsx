'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { A11y, EffectCoverflow } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperCore } from 'swiper';
import { ChevronLeft, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { movieApi, kkphimApi } from '@/lib/api';
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
  onActiveFilmChange?: (film: FilmItem, isOriginal: boolean) => void;
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
  if (typeof window === 'undefined') return 'netphim-seed';
  const storageKey = 'netphim-mobile-related-seed-v2';
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

async function getCatalogFilms(request: () => Promise<any>): Promise<FilmItem[]> {
  try {
    const response = await request();
    const payload = response?.data !== undefined ? response.data : response;
    const items = extractFilmItems(payload);
    return (items || []) as FilmItem[];
  } catch {
    return [] as FilmItem[];
  }
}

/**
 * Intelligent recommendation loader:
 * Guarantees films match the current film's genre, universe, country, and theme.
 * E.g., Chinese Donghua gets other Chinese Donghua/anime; K-dramas get K-dramas; horror gets horror.
 */
async function loadRelatedFilms(film: FilmItem, slug: string, sessionSeed: string): Promise<FilmItem[]> {
  const categories = (film.category || [])
    .map((c) => c.slug)
    .filter((slugItem): slugItem is string => Boolean(slugItem));
  const countries = (film.country || [])
    .map((c) => c.slug)
    .filter((slugItem): slugItem is string => Boolean(slugItem));

  const isAnimation =
    film.type === 'hoathinh' ||
    film.type === 'anime' ||
    categories.some((c) => c === 'hoat-hinh' || c === 'anime');
  const isChinese =
    countries.includes('trung-quoc') ||
    (film.country || []).some((c) => /trung quốc|china/i.test(c.name || ''));
  const isKorean =
    countries.includes('han-quoc') ||
    (film.country || []).some((c) => /hàn quốc|korea/i.test(c.name || ''));
  const isSeries =
    /series|tv|phim-bo/.test(String(film.type || '').toLowerCase()) ||
    /tập|episode/i.test(film.episode_current || '');

  const seed = hashSeed(`${sessionSeed}:${slug}`);
  const requests: Array<() => Promise<any>> = [];

  // 1. Core theme & category requests
  if (isAnimation) {
    // Animation / Donghua / Anime: Always query dedicated anime/donghua endpoints
    requests.push(() => movieApi.getAnime(1));
    if (isChinese) {
      requests.push(() => movieApi.getByCountry('trung-quoc', 1));
    } else {
      requests.push(() => kkphimApi.getAnime(1));
    }
  } else {
    // Live action: query matching genres & country
    if (categories.length > 0) {
      const topGenre = categories[seed % categories.length];
      requests.push(() => movieApi.getByGenre(topGenre, 1));
      if (categories.length > 1) {
        const secondGenre = categories[(seed + 1) % categories.length];
        requests.push(() => movieApi.getByGenre(secondGenre, 1));
      }
    }
    if (countries.length > 0) {
      requests.push(() => movieApi.getByCountry(countries[0], 1));
    } else if (isSeries) {
      requests.push(() => movieApi.getSeries(1));
    } else {
      requests.push(() => movieApi.getSingle(1));
    }
  }

  // Execute requests in parallel
  const settled = await Promise.allSettled(requests.map((r) => getCatalogFilms(r)));
  let candidatePool: FilmItem[] = [];
  for (const res of settled) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      candidatePool.push(...res.value);
    }
  }

  // Deduplicate and remove the currently viewed film
  candidatePool = deduplicateSectionRow(candidatePool).filter(
    (item) => item.slug && item.slug !== slug,
  );

  // If candidate pool is still low, fetch thematic backup pool
  if (candidatePool.length < 6) {
    const backupRequest = isAnimation
      ? () => movieApi.getAnime(1)
      : isChinese
        ? () => movieApi.getByCountry('trung-quoc', 1)
        : isKorean
          ? () => movieApi.getByCountry('han-quoc', 1)
          : isSeries
            ? () => movieApi.getSeries(1)
            : () => movieApi.getSingle(1);

    const backupFilms = await getCatalogFilms(backupRequest);
    candidatePool = deduplicateSectionRow([...candidatePool, ...backupFilms]).filter(
      (item) => item.slug && item.slug !== slug,
    );
  }

  // If still empty, fall back to general latest catalog
  if (candidatePool.length === 0) {
    const latestFilms = await getCatalogFilms(() => movieApi.getLatest(1));
    candidatePool = deduplicateSectionRow(latestFilms).filter(
      (item) => item.slug && item.slug !== slug,
    );
  }

  // Theme relevance scoring
  const scored = candidatePool.map((item) => {
    let score = 0;
    const itemIsAnim =
      item.type === 'hoathinh' ||
      item.type === 'anime' ||
      (item.category || []).some((c: any) => c.slug === 'hoat-hinh' || c.slug === 'anime');
    if (isAnimation) {
      if (itemIsAnim) score += 6;
      else score -= 4; // Penalize non-animated movies if current is animation
    } else if (itemIsAnim) {
      score -= 3;
    }

    const itemCountries = (item.country || []).map((c: any) => c.slug || '');
    if (isChinese && itemCountries.includes('trung-quoc')) score += 4;
    if (isKorean && itemCountries.includes('han-quoc')) score += 4;

    const itemCats = (item.category || []).map((c: any) => c.slug || '');
    for (const cat of categories) {
      if (itemCats.includes(cat)) score += 2;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Take the top matched films and gently shuffle top tier with seed
  const topTier = scored.slice(0, 14).map((s) => s.item);
  return shuffleWithSeed(topTier, seed).slice(0, 10);
}

export function MobileRelatedCarousel({
  slug,
  currentFilm,
  currentPosterUrl,
  onOpenCurrentPoster,
  enabled = true,
  onActiveFilmChange,
}: MobileRelatedCarouselProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(1);
  const [sessionSeed] = useState(getRecommendationSessionSeed);
  const swiperRef = useRef<SwiperCore | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setReduceMotion(media.matches);
    syncMotionPreference();
    media.addEventListener('change', syncMotionPreference);
    return () => media.removeEventListener('change', syncMotionPreference);
  }, []);

  const genreKey = (currentFilm.category || [])
    .map((category) => category.slug)
    .filter(Boolean)
    .join(',');

  const { data: relatedFilms = [] } = useQuery({
    queryKey: [
      'film-detail-mobile-related-v5',
      slug,
      genreKey,
      currentFilm.type || '',
      sessionSeed,
    ],
    queryFn: () => loadRelatedFilms(currentFilm, slug, sessionSeed),
    enabled: enabled && Boolean(slug),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
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

    // Put the current film between two relevant recommendations so both side cards
    // are immediately visible and tilted when the carousel first mounts.
    return [relatedFilms[0], currentCard, ...relatedFilms.slice(1)];
  }, [currentCard, relatedFilms]);

  const originalIndex = useMemo(() => {
    const idx = films.findIndex((f) => f.slug === slug);
    return idx >= 0 ? idx : films.length > 1 ? 1 : 0;
  }, [films, slug]);

  const onActiveFilmChangeRef = useRef(onActiveFilmChange);
  useEffect(() => {
    onActiveFilmChangeRef.current = onActiveFilmChange;
  }, [onActiveFilmChange]);

  const hasInitializedRef = useRef(false);

  // Reset when slug changes
  useEffect(() => {
    hasInitializedRef.current = false;
    setActiveSlideIndex(originalIndex);
    if (swiperRef.current && !swiperRef.current.destroyed) {
      swiperRef.current.slideTo(originalIndex, 0);
    }
    const initialActive = films[originalIndex] || currentCard;
    onActiveFilmChangeRef.current?.(initialActive, true);
  }, [slug, originalIndex, currentCard]);

  // When films load with multiple items, ensure initial slide is aligned
  useEffect(() => {
    if (!hasInitializedRef.current && films.length > 1) {
      hasInitializedRef.current = true;
      setActiveSlideIndex(originalIndex);
      if (swiperRef.current && !swiperRef.current.destroyed) {
        swiperRef.current.slideTo(originalIndex, 0);
      }
      const initialActive = films[originalIndex] || currentCard;
      onActiveFilmChangeRef.current?.(initialActive, true);
    }
  }, [films, originalIndex, currentCard]);

  const handleSlideChange = (swiper: SwiperCore) => {
    const newIdx = swiper.activeIndex;
    setActiveSlideIndex(newIdx);
    const active = films[newIdx] || currentCard;
    const isOriginal = active.slug === slug;
    onActiveFilmChangeRef.current?.(active, isOriginal);
  };

  if (!enabled) {
    return null;
  }

  const isCurrentActive = activeSlideIndex === originalIndex;

  return (
    <section
      className="w-screen max-w-none shrink-0 overflow-hidden py-2 sm:hidden select-none"
      aria-label="Poster phim và gợi ý cùng chủ đề"
    >
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        modules={[EffectCoverflow, A11y]}
        effect="coverflow"
        centeredSlides
        slidesPerView="auto"
        initialSlide={originalIndex}
        speed={reduceMotion ? 0 : 420}
        threshold={8}
        resistanceRatio={0.75}
        preventInteractionOnTransition={false}
        grabCursor
        watchSlidesProgress
        loop={false}
        autoplay={false}
        allowTouchMove={true}
        lazyPreloadPrevNext={2}
        onSlideChange={handleSlideChange}
        coverflowEffect={{
          rotate: 22, // Tilted 3D perspective angle (đổ nghiêng)
          stretch: -14, // Tight spacing so side tilted cards are visible
          depth: 130, // 3D depth perception
          modifier: 1,
          scale: 0.84, // Center card prominent
          slideShadows: false,
        }}
        className="mobile-related-swiper !overflow-visible px-1 [perspective:1200px]"
        aria-label="Vuốt để xem poster phim gợi ý cùng chủ đề"
      >
        {films.map((film, index) => {
          const title = film.name || film.title || 'Phim gợi ý';
          const rating = getRating(film);
          const isCurrentFilm = film.slug === slug;
          const isActive = index === activeSlideIndex;

          const poster = (
            <>
              <TmdbArtwork
                film={film}
                kind="poster"
                alt={title}
                priority={Math.abs(index - activeSlideIndex) <= 1}
                allowTitleLookup={false}
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="mobile-related-card-shade pointer-events-none absolute inset-0 bg-black/25" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/40 to-transparent" />

              {!isCurrentFilm && rating && (
                <span className="absolute left-0 top-0 rounded-br-lg bg-black/75 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white/90 border-r border-b border-white/15 shadow-sm">
                  ★ {rating}
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
              key={`${isCurrentFilm ? 'current' : 'related'}-${film.slug}-${index}`}
              className="mobile-related-slide !w-[58vw] !max-w-[228px] !min-w-[196px] transform-gpu transition-all duration-300 ease-out motion-reduce:transition-none [&:not(.swiper-slide-active)]:opacity-75"
            >
              <article>
                {isCurrentFilm ? (
                  <button
                    type="button"
                    onClick={onOpenCurrentPoster}
                    aria-label={`Mở poster phim ${title}`}
                    aria-current="true"
                    className={`relative block aspect-[2/3] w-full overflow-hidden rounded-[22px] border ${
                      isActive ? 'border-white/40 ring-1 ring-white/20' : 'border-white/15'
                    } bg-[#111318] shadow-[0_24px_70px_rgba(0,0,0,0.85)] outline-none transition-transform duration-300 active:scale-[0.985]`}
                  >
                    {poster}
                  </button>
                ) : (
                  <div
                    onClick={() => {
                      if (!isActive && swiperRef.current) {
                        swiperRef.current.slideTo(index);
                      }
                    }}
                    className={`relative block aspect-[2/3] overflow-hidden rounded-[22px] border ${
                      isActive ? 'border-white/40 ring-1 ring-white/20' : 'border-white/15'
                    } bg-[#111318] shadow-[0_20px_50px_rgba(0,0,0,0.75)] outline-none transition-all duration-300 active:scale-[0.985] cursor-pointer`}
                  >
                    {poster}
                  </div>
                )}
              </article>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {films.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-semibold tracking-wide">
          {isCurrentActive ? (
            <div className="flex items-center gap-1.5 text-white/55">
              <ChevronLeft size={14} aria-hidden="true" />
              <span>Vuốt để khám phá phim cùng chủ đề</span>
              <ChevronRight size={14} aria-hidden="true" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (swiperRef.current) {
                  swiperRef.current.slideTo(originalIndex);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-white/90 border border-white/15 transition-all text-[11px] font-semibold active:scale-95 cursor-pointer shadow-sm animate-in fade-in duration-150"
            >
              <RotateCcw size={12} />
              <span>Quay lại</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
