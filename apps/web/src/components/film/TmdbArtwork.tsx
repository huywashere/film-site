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
  wsrvImageUrl,
} from '@/lib/image-cdn';

interface TmdbArtworkProps {
  film: FilmItem;
  kind: 'backdrop' | 'poster';
  className?: string;
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
  alt,
  priority = false,
  enabled = true,
  allowTitleLookup = false,
  preferOriginal = false,
}: TmdbArtworkProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [nearViewport, setNearViewport] = useState(priority);
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
  // provider artwork or if title lookup is explicitly requested.
  // This avoids choking the browser's HTTP network queue with 100+ concurrent TMDB requests.
  const providerPrimary =
    kind === 'backdrop'
      ? resolveImageUrl(film.thumb_url, film.poster_url)
      : resolveImageUrl(film.poster_url, film.thumb_url);

  const providerAlternate = providerPrimary ? alternateMovieArtworkUrl(providerPrimary) : null;

  const needsTmdbArtwork =
    enabled &&
    nearViewport &&
    !providerIsTmdb &&
    (!providerPrimary || allowTitleLookup);

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
      // 1. Direct TMDB Cloudflare edge CDN (độ sắc nét gốc cao nhất, không nén trung gian)
      add(tmdbUrl);
      if (artworkQuery.backdropW1280 && artworkQuery.backdropW1280 !== tmdbUrl) {
        add(artworkQuery.backdropW1280);
      }
      if (artworkQuery.posterW500 && artworkQuery.posterW500 !== tmdbUrl) {
        add(artworkQuery.posterW500);
      }
      // 2. wsrv edge proxy fallback
      const wsrv = wsrvImageUrl(tmdbUrl, preset);
      if (wsrv) add(wsrv);
      // 3. Local proxy fallback
      add(`/api/image-proxy?url=${encodeURIComponent(tmdbUrl)}`);
    };

    // Curated/high-priority cards use a confident TMDB match first. Other
    // cards keep the provider first so title lookup never floods a full shelf.
    if (allowTitleLookup) addTmdbCandidates();

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

    if (!allowTitleLookup) addTmdbCandidates();

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
    allowTitleLookup,
    artworkQuery.backdropW1280,
    artworkQuery.posterW500,
  ]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const src = candidates[candidateIndex];

  const responsiveSizes =
    kind === 'backdrop'
      ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
      : '(max-width: 640px) 30vw, (max-width: 1024px) 22vw, 16vw';
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
      fetchPriority: priority ? 'high' : 'low',
      unoptimized: alreadySized,
    }).props;
  }, [alt, film.name, kind, priority, responsiveSizes, src, preferOriginal]);

  // Reset candidate index and loaded state when movie identity, kind, or tmdbUrl updates
  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
  }, [film.slug, kind, tmdbUrl]);

  // Sync loaded state when src changes or when image is already cached/decoded in DOM
  useEffect(() => {
    if (!src) {
      setLoaded(false);
      return;
    }
    const img = imgRef.current;
    if (img && (img.naturalWidth > 0 || img.complete)) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden bg-[#101218]', className)}>
      {src && deliveredImageProps ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={(node) => {
            imgRef.current = node;
            if (node && (node.naturalWidth > 0 || node.complete) && !loaded) {
              setLoaded(true);
            }
          }}
          {...deliveredImageProps}
          alt={alt || film.name}
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setCandidateIndex((index) => index + 1);
          }}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-200 motion-reduce:transition-none',
            loaded || priority ? 'opacity-100' : 'opacity-0',
          )}
          data-artwork-source={
            src === tmdbUrl || /image\.tmdb\.org\/t\/p\//i.test(src) ? 'tmdb' : 'fallback'
          }
        />
      ) : (!src || candidateIndex >= candidates.length || artworkQuery.isFetched || providerIsTmdb) ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-neutral-800 via-neutral-900 to-black p-2 text-center">
          <Clapperboard className="mb-1 h-5 w-5 text-neutral-600" />
          <p className="line-clamp-2 text-[10px] font-bold text-neutral-300">
            {film.name || film.title}
          </p>
        </div>
      ) : (
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#101218_25%,#181b23_45%,#101218_65%)] bg-[length:220%_100%] motion-reduce:animate-none" />
      )}
      {!loaded && !priority && src && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#101218_25%,#181b23_45%,#101218_65%)] bg-[length:220%_100%] motion-reduce:animate-none"
        />
      )}
    </div>
  );
}
