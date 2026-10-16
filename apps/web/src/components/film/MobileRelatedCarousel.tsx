'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { A11y, EffectCoverflow } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperCore } from 'swiper';
import { ChevronLeft, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { movieApi, kkphimApi } from '@/lib/api';
import { extractFilmItems } from '@/lib/movie-normalizer';
import { deduplicateSectionRow } from '@/lib/recommendation-engine';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import { resolveImageUrl, type FilmItem } from '@/components/film/FilmCard';
import { buildArtworkCandidates } from '@/lib/image-cdn';
import { getMovieLogo } from '@/lib/movie-logo-cache';
import { CURATED_HERO_FRANCHISE_POOL } from '@/lib/curated-hero-pool';
import {
  CURATED_ACTION_HERO_POOL,
  CURATED_SCIFI_HERO_POOL,
  CURATED_WAR_HERO_POOL,
  CURATED_VFX_HERO_POOL,
} from '@/lib/curated-genre-pools';
import {
  CURATED_CHINESE_HERO_POOL,
  CURATED_KOREAN_HERO_POOL,
  CURATED_ANIME_HERO_POOL,
} from '@/lib/curated-asian-hero';

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
      (film as any).rating ||
      (film as any).tmdb_rating ||
      0,
  );
  return Number.isFinite(value) && value > 0 ? value.toFixed(1) : null;
}

/**
 * Synchronous, zero-latency recommendation generator using local curated blockbuster pools.
 * Provides instant left & right side cards on Frame 0 before any network request completes.
 */
function getInstantMatchingRecommendations(
  film: FilmItem,
  slug: string,
  sessionSeed: string,
): FilmItem[] {
  const categories = (film.category || [])
    .map((c) => (c.slug || c.name || '').toLowerCase())
    .filter(Boolean);
  const countries = (film.country || [])
    .map((c) => (c.slug || c.name || '').toLowerCase())
    .filter(Boolean);

  const isAnimation =
    film.type === 'hoathinh' ||
    film.type === 'anime' ||
    categories.some((c) => /hoat-hinh|anime|donghua|animation/i.test(c));

  const isChinese =
    countries.some((c) => /trung-quoc|china/i.test(c)) ||
    (film.country || []).some((c) => /trung quốc|china/i.test(c.name || ''));

  const isKorean =
    countries.some((c) => /han-quoc|korea/i.test(c)) ||
    (film.country || []).some((c) => /hàn quốc|korea/i.test(c.name || ''));

  const isSciFi = categories.some((c) => /vien-tuong|sci-fi|khoa-hoc/i.test(c));
  const isWar = categories.some((c) => /chien-tranh|lich-su|war/i.test(c));
  const isAction = categories.some((c) => /hanh-dong|action|vo-thuat|kiem-hiep/i.test(c));

  let matchedPool: FilmItem[] = [];

  if (isAnimation) {
    matchedPool = [...CURATED_ANIME_HERO_POOL];
  } else if (isChinese) {
    matchedPool = [...CURATED_CHINESE_HERO_POOL];
  } else if (isKorean) {
    matchedPool = [...CURATED_KOREAN_HERO_POOL];
  } else if (isSciFi) {
    matchedPool = [...CURATED_SCIFI_HERO_POOL, ...CURATED_VFX_HERO_POOL];
  } else if (isWar) {
    matchedPool = [...CURATED_WAR_HERO_POOL];
  } else if (isAction) {
    matchedPool = [...CURATED_ACTION_HERO_POOL];
  }

  // Combine with curated franchise pool for rich variety
  const combined = [
    ...matchedPool,
    ...CURATED_HERO_FRANCHISE_POOL,
  ].filter((item) => item.slug && item.slug !== slug);

  const deduplicated = deduplicateSectionRow(combined);
  const seed = hashSeed(`${sessionSeed}:${slug}:instant`);
  return shuffleWithSeed(deduplicated.slice(0, 16), seed).slice(0, 10);
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

  // If candidate pool is still low, instantly backfill from curated pools without slow waterfall fetches
  if (candidatePool.length < 6) {
    const instantFallback = getInstantMatchingRecommendations(film, slug, sessionSeed);
    candidatePool = deduplicateSectionRow([...candidatePool, ...instantFallback]).filter(
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
  const [sessionSeed] = useState(getRecommendationSessionSeed);
  const swiperRef = useRef<SwiperCore | null>(null);
  const userInteractedRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setReduceMotion(media.matches);
    syncMotionPreference();
    media.addEventListener('change', syncMotionPreference);
    return () => media.removeEventListener('change', syncMotionPreference);
  }, []);

  // Compute instant matching recommendations synchronously (0ms) so left and right cards
  // are already populated on Frame 0 when the component mounts.
  const instantRelated = useMemo(
    () => getInstantMatchingRecommendations(currentFilm, slug, sessionSeed),
    [currentFilm, slug, sessionSeed],
  );

  const genreKey = (currentFilm.category || [])
    .map((category) => category.slug)
    .filter(Boolean)
    .join(',');

  const { data: relatedFilms = instantRelated } = useQuery({
    queryKey: [
      'film-detail-mobile-related-v5',
      slug,
      genreKey,
      currentFilm.type || '',
      sessionSeed,
    ],
    queryFn: () => loadRelatedFilms(currentFilm, slug, sessionSeed),
    initialData: instantRelated,
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

  const effectiveRelated = useMemo(() => {
    // If user has already interacted/swiped, preserve current slides to prevent layout shifting
    if (userInteractedRef.current && instantRelated.length > 0) {
      return instantRelated;
    }
    return relatedFilms.length > 0 ? relatedFilms : instantRelated;
  }, [relatedFilms, instantRelated]);

  const films = useMemo(() => {
    if (effectiveRelated.length === 0) return [currentCard];

    // Put the current film between two relevant recommendations so both side cards
    // are immediately visible and tilted when the carousel first mounts.
    return [effectiveRelated[0], currentCard, ...effectiveRelated.slice(1)];
  }, [currentCard, effectiveRelated]);

  const originalIndex = useMemo(() => {
    const idx = films.findIndex((f) => f.slug === slug);
    return idx >= 0 ? idx : films.length > 1 ? 1 : 0;
  }, [films, slug]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(originalIndex);

  const onActiveFilmChangeRef = useRef(onActiveFilmChange);
  useEffect(() => {
    onActiveFilmChangeRef.current = onActiveFilmChange;
  }, [onActiveFilmChange]);

  const hasInitializedRef = useRef(false);

  // Reset when slug changes
  useEffect(() => {
    hasInitializedRef.current = false;
    userInteractedRef.current = false;
    setActiveSlideIndex(originalIndex);
    if (swiperRef.current && !swiperRef.current.destroyed) {
      swiperRef.current.slideTo(originalIndex, 0);
    }
    const initialActive = films[originalIndex] || currentCard;
    onActiveFilmChangeRef.current?.(initialActive, true);
  }, [slug, originalIndex, currentCard, films]);

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

  // Preload poster, backdrop banner & logo for adjacent films (next/prev) for instant 0ms rendering
  useEffect(() => {
    if (typeof window === 'undefined' || films.length === 0) return;

    const indicesToPreload = [
      activeSlideIndex - 1,
      activeSlideIndex,
      activeSlideIndex + 1,
      activeSlideIndex + 2,
    ].filter((idx) => idx >= 0 && idx < films.length);

    indicesToPreload.forEach((idx) => {
      const target = films[idx];
      if (!target) return;

      // 1. Preload POSTER image (Critical for side carousel cards)
      const rawPoster =
        (target as any).artwork?.poster?.w500 ||
        ((target as any).tmdb?.poster_path
          ? `https://image.tmdb.org/t/p/w500${(target as any).tmdb.poster_path}`
          : null) ||
        resolveImageUrl(target.poster_url, target.thumb_url);

      if (rawPoster) {
        const posterCandidates = buildArtworkCandidates(
          [rawPoster, resolveImageUrl(target.thumb_url, target.poster_url)],
          'poster',
          { includeWsrvForTmdb: true, includeAlternatePhimimgPath: true },
        );
        if (posterCandidates[0]) {
          const posterImg = new Image();
          posterImg.decoding = 'async';
          posterImg.src = posterCandidates[0];
        }
      }

      // 2. Preload backdrop banner
      const backdropCandidates = buildArtworkCandidates(
        [
          (target as any).artwork?.backdrop?.w1280,
          resolveImageUrl(target.thumb_url, target.poster_url),
          resolveImageUrl(target.poster_url, target.thumb_url),
        ],
        'backdrop',
        { includeWsrvForTmdb: true, includeAlternatePhimimgPath: true },
      );

      if (backdropCandidates[0]) {
        const img = new Image();
        img.decoding = 'async';
        img.src = backdropCandidates[0];
      }

      // 3. Preload logo nếu có trong cache hoặc artwork
      const logoPath =
        (target as any).artwork?.logo?.w500 ||
        (target as any).titleLogo ||
        (target as any).logo_path ||
        getMovieLogo(target.slug);

      if (logoPath) {
        const logoCandidates = buildArtworkCandidates([logoPath], 'titleLogo', {
          includeWsrvForTmdb: true,
          strictProxy: true,
        });
        if (logoCandidates[0]) {
          const logoImg = new Image();
          logoImg.decoding = 'async';
          logoImg.src = logoCandidates[0];
        }
      }
    });
  }, [films, activeSlideIndex]);

  const syncActiveFilmTimerRef = useRef<number | null>(null);

  const emitActiveFilmChange = useCallback(
    (filmItem: FilmItem, isOriginal: boolean, immediate = false) => {
      if (syncActiveFilmTimerRef.current) {
        window.clearTimeout(syncActiveFilmTimerRef.current);
        syncActiveFilmTimerRef.current = null;
      }

      if (immediate) {
        onActiveFilmChangeRef.current?.(filmItem, isOriginal);
        return;
      }

      syncActiveFilmTimerRef.current = window.setTimeout(() => {
        onActiveFilmChangeRef.current?.(filmItem, isOriginal);
        syncActiveFilmTimerRef.current = null;
      }, 120);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (syncActiveFilmTimerRef.current) {
        window.clearTimeout(syncActiveFilmTimerRef.current);
      }
    };
  }, []);

  const handleSlideChange = (swiper: SwiperCore) => {
    userInteractedRef.current = true;
    const newIdx = swiper.activeIndex;
    setActiveSlideIndex(newIdx);
    const active = films[newIdx] || currentCard;
    const isOriginal = active.slug === slug;
    emitActiveFilmChange(active, isOriginal, false);
  };

  const handleSlideTransitionEnd = (swiper: SwiperCore) => {
    const newIdx = swiper.activeIndex;
    const active = films[newIdx] || currentCard;
    const isOriginal = active.slug === slug;
    emitActiveFilmChange(active, isOriginal, true);
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
        speed={reduceMotion ? 0 : 360}
        threshold={5}
        touchRatio={1.1}
        touchAngle={45}
        resistanceRatio={0.85}
        preventInteractionOnTransition={false}
        grabCursor
        watchSlidesProgress
        loop={false}
        autoplay={false}
        allowTouchMove={true}
        lazyPreloadPrevNext={3}
        onSlideChange={handleSlideChange}
        onSlideChangeTransitionEnd={handleSlideTransitionEnd}
        coverflowEffect={{
          rotate: 18, // Refined 3D tilt perspective: clear artwork readability and elegant depth
          stretch: -14, // Tight spacing keeps both side cards visible within portrait viewport
          depth: 110, // 3D depth perception without clipping
          modifier: 1,
          scale: 0.86, // Balanced focal scale for center card vs tilted side cards
          slideShadows: false, // Omit DOM shadow elements to preserve 60/120fps GPU performance
        }}
        className="mobile-related-swiper !overflow-visible px-1 [perspective:1200px] gpu-accelerated"
        aria-label="Vuốt để xem poster phim gợi ý cùng chủ đề"
      >
        {films.map((film, index) => {
          const title = film.name || film.title || 'Phim gợi ý';
          const rating = getRating(film);
          const isCurrentFilm = film.slug === slug;
          const isActive = index === activeSlideIndex;
          const isAdjacent = Math.abs(index - activeSlideIndex) <= 1;

          const poster = (
            <>
              <TmdbArtwork
                film={film}
                kind="poster"
                alt={title}
                sizes="(max-width: 639px) 58vw, 228px"
                priority={isAdjacent}
                loadImmediately={isAdjacent}
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
              className="mobile-related-slide !w-[58vw] !max-w-[228px] !min-w-[196px] transform-gpu will-change-transform contain-paint transition-opacity duration-300 ease-out motion-reduce:transition-none [&:not(.swiper-slide-active)]:opacity-75"
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
                    } bg-[#111318] shadow-[0_24px_70px_rgba(0,0,0,0.85)] outline-none transition-colors duration-200 active:scale-[0.985]`}
                  >
                    {poster}
                  </button>
                ) : (
                  <div
                    onClick={() => {
                      if (!isActive && swiperRef.current) {
                        userInteractedRef.current = true;
                        emitActiveFilmChange(film, film.slug === slug, true);
                        swiperRef.current.slideTo(index);
                      }
                    }}
                    className={`relative block aspect-[2/3] overflow-hidden rounded-[22px] border ${
                      isActive ? 'border-white/40 ring-1 ring-white/20' : 'border-white/15'
                    } bg-[#111318] shadow-[0_20px_50px_rgba(0,0,0,0.75)] outline-none transition-colors duration-200 active:scale-[0.985] cursor-pointer`}
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
                  const targetFilm = films[originalIndex] || currentCard;
                  emitActiveFilmChange(targetFilm, true, true);
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
