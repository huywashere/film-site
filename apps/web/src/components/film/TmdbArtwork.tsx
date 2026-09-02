'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FilmItem } from '@/components/film/FilmCard';
import { resolveImageUrl } from '@/components/film/FilmCard';
import { useTmdbArtwork } from '@/hooks/useTmdbArtwork';
import { alternateMovieArtworkUrl } from '@/lib/movie-image-url';
import { cn } from '@/lib/utils';
import { Clapperboard } from 'lucide-react';
import { buildArtworkCandidates } from '@/lib/image-cdn';
import { extractTmdbInfo } from '@/lib/tmdb';

interface TmdbArtworkProps {
  film: FilmItem;
  kind: 'backdrop' | 'poster';
  className?: string;
  alt?: string;
  priority?: boolean;
  enabled?: boolean;
  allowTitleLookup?: boolean;
}

export function TmdbArtwork({
  film,
  kind,
  className,
  alt,
  priority = false,
  enabled = true,
  allowTitleLookup = false,
}: TmdbArtworkProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [nearViewport, setNearViewport] = useState(priority);
  const tmdbInfo = extractTmdbInfo(film);
  const hasExactTmdbIdentity = Boolean(tmdbInfo.tmdbId || tmdbInfo.imdbId);
  const providerIsTmdb = Boolean(
    /image\.tmdb\.org\/t\/p\//i.test(
      String(
        kind === 'backdrop'
          ? film.thumb_url || film.poster_url || ''
          : film.poster_url || film.thumb_url || '',
      ),
    ),
  );

  useEffect(() => {
    if (!enabled || priority || providerIsTmdb) {
      setNearViewport(enabled);
      return;
    }

    const element = containerRef.current;
    if (!element || !('IntersectionObserver' in window)) {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: '140px 0px', threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, priority, providerIsTmdb, film.slug]);

  // Shelf pages can render dozens of cards. Searching TMDB by title for every
  // card caused an API waterfall and occasionally selected another movie with
  // a similar translated title. Only enrich cards with an exact external ID;
  // the catalogue image remains the stable fallback for legacy records.
  const artworkQuery = useTmdbArtwork(
    film,
    enabled &&
      nearViewport &&
      !providerIsTmdb &&
      (hasExactTmdbIdentity || allowTitleLookup),
  );
  const { backdropUrl, posterUrl } = artworkQuery;
  const tmdbUrl = kind === 'backdrop' ? backdropUrl || posterUrl : posterUrl || backdropUrl;
  const providerPrimary =
    kind === 'backdrop'
      ? resolveImageUrl(film.thumb_url, film.poster_url)
      : resolveImageUrl(film.poster_url, film.thumb_url);

  const providerAlternate = providerPrimary ? alternateMovieArtworkUrl(providerPrimary) : null;

  const candidates = useMemo(() => {
    const tmdbReady = providerIsTmdb || Boolean(tmdbUrl);
    const lookupFinished =
      !enabled || providerIsTmdb || !hasExactTmdbIdentity || artworkQuery.isFetched;
    const sources = tmdbReady
      ? [tmdbUrl, providerIsTmdb ? providerPrimary : null]
      : lookupFinished
        ? [providerPrimary, providerAlternate]
        : [providerPrimary, providerAlternate];
    const list = buildArtworkCandidates(sources, kind === 'backdrop' ? 'backdrop' : 'poster');
    return list;
  }, [
    tmdbUrl,
    providerPrimary,
    providerAlternate,
    kind,
    providerIsTmdb,
    hasExactTmdbIdentity,
    artworkQuery.isFetched,
    enabled,
  ]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const src = candidates[candidateIndex];

  // Mobile image optimization: Serve lightweight w342 poster / w780 backdrop on mobile (saving ~75% data)
  const mobileSrc = useMemo(() => {
    if (!src) return undefined;
    if (/image\.tmdb\.org\/t\/p\//i.test(src)) {
      return kind === 'backdrop'
        ? src.replace(/\/t\/p\/(w1280|original)\//i, '/t/p/w780/')
        : src.replace(/\/t\/p\/(w500|w780|original|w1280)\//i, '/t/p/w342/');
    }
    return undefined;
  }, [src, kind]);

  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
  }, [film.slug, kind, candidates]);

  useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden bg-[#101218]', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          key={src}
          src={src}
          srcSet={mobileSrc && mobileSrc !== src ? `${mobileSrc} 640w, ${src} 1280w` : undefined}
          sizes={
            kind === 'backdrop'
              ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
              : '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw'
          }
          alt={alt || film.name}
          width={kind === 'backdrop' ? 1280 : 500}
          height={kind === 'backdrop' ? 720 : 750}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setCandidateIndex((index) => index + 1);
          }}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300 motion-reduce:transition-none',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          data-artwork-source={
            src === tmdbUrl || /image\.tmdb\.org\/t\/p\//i.test(src) ? 'tmdb' : 'fallback'
          }
        />
      ) : artworkQuery.isFetched || providerIsTmdb ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-neutral-800 via-neutral-900 to-black p-2 text-center">
          <Clapperboard className="mb-1 h-5 w-5 text-neutral-600" />
          <p className="line-clamp-2 text-[10px] font-bold text-neutral-300">
            {film.name || film.title}
          </p>
        </div>
      ) : (
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#101218_25%,#181b23_45%,#101218_65%)] bg-[length:220%_100%] motion-reduce:animate-none" />
      )}
      {!loaded && src && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#101218_25%,#181b23_45%,#101218_65%)] bg-[length:220%_100%] motion-reduce:animate-none"
        />
      )}
    </div>
  );
}
