'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { FilmItem } from '@/components/film/FilmCard';
import { getMovieLogo, setMovieLogo, preloadMovieLogo, isMovieLogoPreloaded, markMovieLogoPreloaded } from '@/lib/movie-logo-cache';
import { useTmdb } from '@/hooks/useTmdb';
import { tmdbLogo } from '@/lib/tmdb';
import { cn } from '@/lib/utils';
import { cardFont } from '@/lib/fonts';
import { buildArtworkCandidates } from '@/lib/image-cdn';

interface ShowcaseTitleLogoProps {
  film: FilmItem;
  prefetchFilm?: FilmItem;
  className?: string;
  imageClassName?: string;
  fallbackTextClassName?: string;
  showSubtitle?: boolean;
  subtitleClassName?: string;
  priority?: boolean;
}

function normalizeLogoUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim();
  if (!clean) return null;
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('/api/')) {
    return clean;
  }
  return tmdbLogo(clean, 'w500');
}

function buildCandidates(url: string): string[] {
  return buildArtworkCandidates([url], 'titleLogo', {
    includeWsrvForTmdb: url.includes('image.tmdb.org'),
    strictProxy: true,
  });
}

export function ShowcaseTitleLogo({
  film,
  prefetchFilm,
  className,
  imageClassName,
  fallbackTextClassName,
  showSubtitle = true,
  subtitleClassName,
  priority = true,
}: ShowcaseTitleLogoProps) {
  // 1. Initial cached or direct logo lookup
  const initialLogo = useMemo(() => {
    return normalizeLogoUrl(film.titleLogo || getMovieLogo(film.slug));
  }, [film.slug, film.titleLogo]);

  // The visual mode is locked for this keyed slide. A late TMDB response is
  // cached for the next visit instead of replacing visible text mid-slide.
  const [displayLogo] = useState(() => initialLogo);

  // 2. Dynamic TMDB logo resolution if not pre-seeded
  const shouldQueryTmdb = !initialLogo && Boolean(film?.slug);
  const { bestLogo } = useTmdb({
    film: shouldQueryTmdb ? film : null,
    enabled: shouldQueryTmdb,
    fetchImages: true,
    fetchDetails: false,
    fetchSeason: false,
    fetchCredits: false,
    fetchVideos: false,
  });

  const prefetchedDirectLogo = useMemo(
    () => normalizeLogoUrl(prefetchFilm?.titleLogo || getMovieLogo(prefetchFilm?.slug)),
    [prefetchFilm?.slug, prefetchFilm?.titleLogo],
  );
  const shouldQueryPrefetch = Boolean(
    prefetchFilm?.slug &&
      prefetchFilm.slug !== film.slug &&
      !prefetchedDirectLogo,
  );
  const { bestLogo: prefetchedBestLogo } = useTmdb({
    film: shouldQueryPrefetch ? prefetchFilm : null,
    enabled: shouldQueryPrefetch,
    fetchImages: true,
    fetchDetails: false,
    fetchSeason: false,
    fetchCredits: false,
    fetchVideos: false,
  });

  useEffect(() => {
    if (!initialLogo) return;
    const primary = buildCandidates(initialLogo)[0] || initialLogo;
    void preloadMovieLogo(primary).then((ready) => {
      if (ready && film.slug) setMovieLogo(film.slug, initialLogo);
    });
  }, [film.slug, initialLogo]);

  useEffect(() => {
    if (initialLogo) return;
    if (bestLogo?.file_path) {
      const url = normalizeLogoUrl(bestLogo.file_path);
      if (url) {
        const primary = buildCandidates(url)[0] || url;
        void preloadMovieLogo(primary).then((ready) => {
          if (ready && film.slug) setMovieLogo(film.slug, url);
        });
      }
    }
  }, [bestLogo, film.slug, initialLogo]);

  useEffect(() => {
    if (!prefetchFilm?.slug || prefetchFilm.slug === film.slug) return;
    const resolved =
      prefetchedDirectLogo || normalizeLogoUrl(prefetchedBestLogo?.file_path);
    if (!resolved) return;
    const primary = buildCandidates(resolved)[0] || resolved;
    void preloadMovieLogo(primary).then((ready) => {
      if (ready) setMovieLogo(prefetchFilm.slug, resolved);
    });
  }, [prefetchFilm?.slug, film.slug, prefetchedBestLogo?.file_path, prefetchedDirectLogo]);

  // 3. Fallback candidates & error handling
  const candidates = useMemo(() => {
    if (!displayLogo) return [];
    return buildCandidates(displayLogo);
  }, [displayLogo]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [hasError, setHasError] = useState(false);
  const currentSrc = candidates[candidateIdx];
  const isPreloaded = Boolean(currentSrc && (isMovieLogoPreloaded(currentSrc)));
  const [isLoaded, setIsLoaded] = useState(isPreloaded);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCandidateIdx(0);
    setHasError(false);
  }, [film.slug, displayLogo]);

  useEffect(() => {
    setIsLoaded(Boolean(currentSrc && isMovieLogoPreloaded(currentSrc)));
  }, [currentSrc]);

  // Check if image is already cached in browser memory
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0 && currentSrc) {
      markMovieLogoPreloaded(currentSrc);
      setIsLoaded(true);
    }
  }, [currentSrc]);

  useEffect(() => {
    if (!currentSrc || isLoaded || hasError) return;
    const timer = window.setTimeout(() => {
      if (candidateIdx < candidates.length - 1) {
        setCandidateIdx((index) => index + 1);
      } else {
        setHasError(true);
      }
    }, 4_500);
    return () => window.clearTimeout(timer);
  }, [candidateIdx, candidates.length, currentSrc, hasError, isLoaded]);

  const hasLogoCandidate = Boolean(currentSrc) && !hasError;

  return (
    <div className={cn('relative select-none', className)}>
      <div className="grid min-h-[36px] items-center justify-items-start sm:min-h-[44px] md:min-h-[52px] lg:min-h-[58px]">
        <h3
          data-showcase-title-text={film.slug}
          className={cn(
            cardFont.className,
            'col-start-1 row-start-1 z-10 line-clamp-2 text-base font-extrabold tracking-tight text-white transition-opacity duration-150 sm:text-2xl lg:text-3xl',
            hasLogoCandidate ? 'pointer-events-none opacity-0' : 'opacity-100',
            fallbackTextClassName,
          )}
        >
          {film.name}
        </h3>

        {hasLogoCandidate && currentSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            data-showcase-title-logo={film.slug}
            ref={imgRef}
            key={`${film.slug}-${currentSrc}-${candidateIdx}`}
            src={currentSrc}
            alt=""
            aria-hidden="true"
            decoding="async"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            referrerPolicy="no-referrer"
            onLoad={() => {
              markMovieLogoPreloaded(currentSrc);
              setIsLoaded(true);
            }}
            onError={() => {
              setIsLoaded(false);
              if (candidateIdx < candidates.length - 1) {
                setCandidateIdx((prev) => prev + 1);
              } else {
                setHasError(true);
              }
            }}
            className={cn(
              'col-start-1 row-start-1 h-auto w-auto max-w-[240px] object-contain object-left filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)] transition-opacity duration-150 sm:max-w-[320px] md:max-w-[380px] lg:max-w-[420px]',
              isLoaded ? 'opacity-100' : 'opacity-0',
              imageClassName || 'max-h-10 sm:max-h-13 md:max-h-16 lg:max-h-18',
            )}
          />
        )}
      </div>

      {showSubtitle && film.name && film.origin_name && film.name.toLowerCase() !== film.origin_name.toLowerCase() && (
        <p
          className={cn(
            'mt-1 line-clamp-1 text-xs font-medium text-neutral-300/90 drop-shadow-sm sm:text-sm',
            subtitleClassName,
          )}
        >
          {isLoaded ? film.name : film.origin_name}
        </p>
      )}
    </div>
  );
}
