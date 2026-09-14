'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getImageProps } from 'next/image';
import type { FilmItem } from '@/components/film/FilmCard';
import { resolveImageUrl } from '@/components/film/FilmCard';
import { useTmdbArtwork } from '@/hooks/useTmdbArtwork';
import { alternateMovieArtworkUrl } from '@/lib/movie-image-url';
import { cn } from '@/lib/utils';
import { Clapperboard } from 'lucide-react';
import {
  buildArtworkCandidates,
  isPreOptimizedImageUrl,
  unwrapImageUrl,
  wsrvImageUrl,
} from '@/lib/image-cdn';

interface TmdbArtworkProps {
  film: FilmItem;
  kind: 'backdrop' | 'poster';
  className?: string;
  imageClassName?: string;
  objectPosition?: string;
  sizes?: string;
  alt?: string;
  priority?: boolean;
  enabled?: boolean;
  allowTitleLookup?: boolean;
  preferOriginal?: boolean;
}

// Shared IntersectionObserver Singleton: allows 100+ cards to share a single browser observer
// drastically reducing memory footprint and DOM observer overhead during fast scrolling
type ObserverCallback = () => void;
let sharedArtworkObserver: IntersectionObserver | null = null;
const artworkObserverCallbacks = new WeakMap<Element, ObserverCallback>();

function getSharedArtworkObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }
  if (!sharedArtworkObserver) {
    sharedArtworkObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = artworkObserverCallbacks.get(entry.target);
            if (cb) {
              cb();
              artworkObserverCallbacks.delete(entry.target);
            }
            sharedArtworkObserver?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '200px 0px', threshold: 0.01 },
    );
  }
  return sharedArtworkObserver;
}

export function TmdbArtwork({
  film,
  kind,
  className,
  imageClassName,
  objectPosition,
  sizes,
  alt,
  priority = false,
  enabled = true,
  allowTitleLookup = false,
  preferOriginal = false,
}: TmdbArtworkProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [nearViewport, setNearViewport] = useState(priority);
  const [autoRecovery, setAutoRecovery] = useState(false);
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
    if (!element) return;

    const observer = getSharedArtworkObserver();
    if (!observer) {
      setNearViewport(true);
      return;
    }

    artworkObserverCallbacks.set(element, () => setNearViewport(true));
    observer.observe(element);
    return () => {
      artworkObserverCallbacks.delete(element);
      observer.unobserve(element);
    };
  }, [enabled, priority, providerIsTmdb, film.slug]);

  // Shelf pages can render dozens of cards. Only query TMDB if the film lacks
  // provider artwork or if title lookup is explicitly requested or auto-recovering.
  // This avoids choking the browser's HTTP network queue with 100+ concurrent TMDB requests.
  const rawProviderPrimary =
    kind === 'backdrop'
      ? resolveImageUrl(film.thumb_url, film.poster_url)
      : resolveImageUrl(film.poster_url, film.thumb_url);
  const providerPrimary = rawProviderPrimary
    ? unwrapImageUrl(rawProviderPrimary) || rawProviderPrimary
    : null;

  const providerAlternate = providerPrimary ? alternateMovieArtworkUrl(providerPrimary) : null;

  const needsTmdbArtwork =
    enabled &&
    nearViewport &&
    (!providerIsTmdb || autoRecovery) &&
    (!providerPrimary || allowTitleLookup || autoRecovery);

  const artworkQuery = useTmdbArtwork(
    film,
    needsTmdbArtwork,
  );
  const { backdropUrl, posterUrl } = artworkQuery;
  const tmdbUrl = kind === 'backdrop' ? backdropUrl || posterUrl : posterUrl || backdropUrl;

  const candidates = useMemo(() => {
    const list: string[] = [];
    const add = (url?: string | null) => {
      if (!url) return;
      const clean = url.trim();
      if (clean && !list.includes(clean)) list.push(clean);
    };

    const preset = kind === 'backdrop' ? 'backdrop' : 'poster';

    const addTmdbCandidates = () => {
      if (!tmdbUrl) return;
      // Use a viewport-sized CDN image first. Loading TMDB "original" for
      // every shelf banner delayed paint and left large black cards onscreen.
      if (kind === 'backdrop' && !preferOriginal) add(artworkQuery.backdropW1280);
      if (kind === 'poster') add(artworkQuery.posterW500);
      add(tmdbUrl);
      if (kind === 'backdrop') add(artworkQuery.backdropW1280);
      if (kind === 'poster') add(artworkQuery.posterW500);
      // 2. wsrv edge proxy fallback
      const wsrv = wsrvImageUrl(tmdbUrl, preset);
      if (wsrv) add(wsrv);
      // 3. Local proxy fallback
      add(`/api/image-proxy?url=${encodeURIComponent(tmdbUrl)}`);
    };

    // Direct provider artwork. Go keeps alternatives from every merged
    // provider, so a dead CDN can fail over without another metadata request.
    if (providerPrimary) add(providerPrimary);
    if (providerAlternate) add(providerAlternate);
    const providerCandidates =
      kind === 'backdrop' ? film._thumbCandidates : film._posterCandidates;
    providerCandidates?.forEach((candidate) => {
      const resolved = resolveImageUrl(candidate);
      add(resolved);
      add(alternateMovieArtworkUrl(resolved));
    });

    // Never replace artwork that is already loading or painted just because a
    // title lookup finishes. TMDB is a recovery source, not a mid-paint
    // upgrade, so provider artwork remains stable and the card cannot flash.
    addTmdbCandidates();

    // 3. Provider local proxy (server reliably fetches phimimg). wsrv blocks
    // these provider domains, so retrying it only delays the real fallback.
    if (providerPrimary) {
      add(`/api/image-proxy?url=${encodeURIComponent(providerPrimary)}`);
    }

    // 4. Cross-fallback: if backdrop is needed and only poster was passed (or vice versa)
    const secondaryUrl =
      kind === 'backdrop'
        ? resolveImageUrl(film.poster_url)
        : resolveImageUrl(film.thumb_url);
    if (secondaryUrl && secondaryUrl !== providerPrimary) {
      add(secondaryUrl);
      const altSec = alternateMovieArtworkUrl(secondaryUrl);
      if (altSec) add(altSec);
      add(`/api/image-proxy?url=${encodeURIComponent(secondaryUrl)}`);
    }

    if (list.length > 0) return list;

    return buildArtworkCandidates(
      [tmdbUrl, providerPrimary, providerAlternate],
      kind === 'backdrop' ? 'backdrop' : 'poster',
    );
  }, [
    providerPrimary,
    providerAlternate,
    tmdbUrl,
    kind,
    film.poster_url,
    film.thumb_url,
    film._posterCandidates,
    film._thumbCandidates,
    artworkQuery.backdropW1280,
    artworkQuery.posterW500,
    preferOriginal,
  ]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const src = candidates[candidateIndex];
  const loaded = Boolean(src && loadedSrc === src);

  const responsiveSizes =
    sizes ||
    (kind === 'backdrop'
      ? (preferOriginal
          ? '100vw'
          : '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1920px')
      : '(max-width: 640px) 30vw, (max-width: 1024px) 22vw, 16vw');
  const deliveredImageProps = useMemo(() => {
    if (!src) return null;
    const alreadySized = isPreOptimizedImageUrl(src);
    return getImageProps({
      src,
      alt: alt || film.name,
      width: kind === 'backdrop' ? (preferOriginal ? 1920 : 1280) : 780,
      height: kind === 'backdrop' ? (preferOriginal ? 1080 : 720) : 1170,
      sizes: responsiveSizes,
      quality: kind === 'backdrop' ? 90 : 85,
      loading: priority ? 'eager' : 'lazy',
      fetchPriority: priority ? 'high' : nearViewport ? 'auto' : 'low',
      unoptimized: alreadySized,
    }).props;
  }, [alt, film.name, kind, nearViewport, priority, responsiveSizes, src, preferOriginal]);

  // Reset candidate index and loaded state when movie identity, kind, or tmdbUrl updates
  useEffect(() => {
    setCandidateIndex(0);
    setLoadedSrc(null);
  }, [film.slug, kind, tmdbUrl]);

  // Sync loaded state when src changes or when image is already cached/decoded in DOM
  useEffect(() => {
    if (!src) {
      return;
    }
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setLoadedSrc(src);
    }
  }, [src]);

  useEffect(() => {
    if (!src || loaded || (!nearViewport && !priority)) return;
    const timer = window.setTimeout(() => {
      const image = imgRef.current;
      if (image?.complete && image.naturalWidth > 0) {
        setLoadedSrc(src);
        return;
      }
      setCandidateIndex((index) => {
        const next = index + 1;
        if (next >= candidates.length && !autoRecovery) {
          setAutoRecovery(true);
        }
        return next;
      });
    }, priority ? 3_500 : nearViewport ? 4_500 : 7_500);
    return () => window.clearTimeout(timer);
  }, [autoRecovery, candidates.length, loaded, nearViewport, priority, src]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden bg-[#101218]', className)}>
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#101218_25%,#181b23_45%,#101218_65%)] bg-[length:220%_100%] [animation-iteration-count:3] motion-reduce:animate-none"
      />
      {src && deliveredImageProps ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          {...deliveredImageProps}
          alt={alt || film.name}
          referrerPolicy="no-referrer"
          draggable={false}
          style={objectPosition ? { objectPosition } : undefined}
          onLoad={() => setLoadedSrc(src)}
          onError={() => {
            setCandidateIndex((index) => {
              const next = index + 1;
              if (next >= candidates.length && !autoRecovery) {
                setAutoRecovery(true);
              }
              return next;
            });
          }}
          className={cn(
            'relative z-[1] h-full w-full object-cover',
            imageClassName,
          )}
          data-artwork-source={
            src === tmdbUrl || /image\.tmdb\.org\/t\/p\//i.test(src) ? 'tmdb' : 'fallback'
          }
        />
      ) : (!src || candidateIndex >= candidates.length) && (!autoRecovery || (artworkQuery.isFetched && !tmdbUrl)) ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-neutral-800 via-neutral-900 to-black p-2 text-center">
          <Clapperboard className="mb-1 h-5 w-5 text-neutral-600" />
          <p className="line-clamp-2 text-[10px] font-bold text-neutral-300">
            {film.name || film.title}
          </p>
        </div>
      ) : (
        <div className="absolute inset-0 animate-pulse [animation-iteration-count:3] bg-[linear-gradient(110deg,#101218_25%,#181b23_45%,#101218_65%)] bg-[length:220%_100%] motion-reduce:animate-none" />
      )}
    </div>
  );
}
