'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { FilmItem } from '@/components/film/FilmCard';
import { getMovieLogo, setMovieLogo, preloadMovieLogo, isMovieLogoPreloaded, markMovieLogoPreloaded } from '@/lib/movie-logo-cache';
import { useTmdb } from '@/hooks/useTmdb';
import { tmdbLogo } from '@/lib/tmdb';
import { cn } from '@/lib/utils';
import { cardFont } from '@/lib/fonts';

interface ShowcaseTitleLogoProps {
  film: FilmItem;
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
  const list: string[] = [url];
  if (url.includes('image.tmdb.org')) {
    list.push(`/api/image-proxy?url=${encodeURIComponent(url)}&strict=1`);
  } else if (!url.startsWith('/api/image-proxy') && !url.startsWith('/')) {
    list.push(`/api/image-proxy?url=${encodeURIComponent(url)}&strict=1`);
  }
  return list;
}

export function ShowcaseTitleLogo({
  film,
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

  const [resolvedLogo, setResolvedLogo] = useState<{
    slug: string;
    url: string;
  } | null>(initialLogo ? { slug: film.slug, url: initialLogo } : null);

  // 2. Dynamic TMDB logo resolution if not pre-seeded
  const shouldQueryTmdb = !initialLogo && Boolean(film?.slug);
  const { bestLogo } = useTmdb({
    film: shouldQueryTmdb ? film : null,
    enabled: shouldQueryTmdb,
    fetchImages: true,
    fetchSeason: false,
    fetchCredits: false,
    fetchVideos: false,
  });

  useEffect(() => {
    const current = normalizeLogoUrl(film.titleLogo || getMovieLogo(film.slug));
    if (current) {
      setResolvedLogo({ slug: film.slug, url: current });
      return;
    }
    setResolvedLogo(null);
  }, [film.slug, film.titleLogo]);

  useEffect(() => {
    if (initialLogo) return;
    if (bestLogo?.file_path) {
      const url = normalizeLogoUrl(bestLogo.file_path);
      if (url) {
        setResolvedLogo({ slug: film.slug, url });
        if (film.slug) {
          setMovieLogo(film.slug, url);
          preloadMovieLogo(url);
        }
      }
    }
  }, [bestLogo, film.slug, initialLogo]);

  // 3. Fallback candidates & error handling
  const activeLogo =
    initialLogo || (resolvedLogo?.slug === film.slug ? resolvedLogo.url : null);
  const candidates = useMemo(() => {
    if (!activeLogo) return [];
    return buildCandidates(activeLogo);
  }, [activeLogo]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [hasError, setHasError] = useState(false);
  const currentSrc = candidates[candidateIdx];
  const isPreloaded = Boolean(currentSrc && (isMovieLogoPreloaded(currentSrc)));
  const [isLoaded, setIsLoaded] = useState(isPreloaded);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCandidateIdx(0);
    setHasError(false);
  }, [film.slug, activeLogo]);

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
      {hasLogoCandidate ? (
        <div className="relative flex flex-col items-start justify-center">
          <h3
            className={cn(
              cardFont.className,
              isLoaded
                ? 'sr-only'
                : 'absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 line-clamp-2 text-base font-extrabold tracking-tight text-white sm:text-2xl lg:text-3xl',
              fallbackTextClassName,
            )}
          >
            {film.name}
          </h3>

          {/* Stylized transparent title logo */}
          <div className="relative flex items-center min-h-[36px] sm:min-h-[44px] md:min-h-[52px] lg:min-h-[58px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
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
                if (currentSrc) markMovieLogoPreloaded(currentSrc);
                setIsLoaded(true);
              }}
              onError={() => {
                setIsLoaded(false);
                if (candidateIdx < candidates.length - 1) {
                  setCandidateIdx((prev) => prev + 1);
                } else {
                  setHasError(true);
                  setIsLoaded(false);
                }
              }}
              className={cn(
                'h-auto w-auto max-w-[240px] sm:max-w-[320px] md:max-w-[380px] lg:max-w-[420px] object-contain object-left filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)] transition-opacity duration-300',
                isLoaded ? 'opacity-100' : 'opacity-0',
                imageClassName || 'max-h-10 sm:max-h-13 md:max-h-16 lg:max-h-18',
              )}
            />
          </div>

          {/* Subtitle: Display Vietnamese translation title if different from original name */}
          {showSubtitle && film.name && film.origin_name && film.name.toLowerCase() !== film.origin_name.toLowerCase() && (
            <p
              className={cn(
                'mt-1 text-xs text-neutral-300/90 font-medium sm:text-sm drop-shadow-sm line-clamp-1',
                subtitleClassName,
              )}
            >
              {isLoaded ? film.name : film.origin_name}
            </p>
          )}
        </div>
      ) : (
        /* Fallback text heading when no logo is available */
        <div>
          <h3
            className={cn(
              cardFont.className,
              'text-base font-extrabold tracking-tight text-white line-clamp-2 sm:text-2xl lg:text-3xl',
              fallbackTextClassName,
            )}
          >
            {film.name}
          </h3>
          {showSubtitle && film.origin_name && (
            <p className={cn('mt-0.5 text-xs text-neutral-400 sm:text-sm', subtitleClassName)}>
              {film.origin_name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
