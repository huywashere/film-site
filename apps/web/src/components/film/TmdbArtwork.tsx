'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FilmItem } from '@/components/film/FilmCard';
import { resolveImageUrl } from '@/components/film/FilmCard';
import { useTmdbArtwork } from '@/hooks/useTmdbArtwork';
import { alternateMovieArtworkUrl } from '@/lib/movie-image-url';
import { cn } from '@/lib/utils';
import { Clapperboard } from 'lucide-react';
import { buildArtworkCandidates, wsrvImageUrl } from '@/lib/image-cdn';
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

    // 1. Direct provider artwork
    if (providerPrimary) add(providerPrimary);
    if (providerAlternate) add(providerAlternate);

    // 2. TMDB edge proxy (works in VN, bypasses TMDB block) & local proxy
    if (tmdbUrl) {
      const wsrv = wsrvImageUrl(tmdbUrl, preset);
      if (wsrv) add(wsrv);
      add(`/api/image-proxy?url=${encodeURIComponent(tmdbUrl)}`);
      add(tmdbUrl);
    }

    // 3. Provider local proxy (server reliably fetches phimimg)
    if (providerPrimary) {
      add(`/api/image-proxy?url=${encodeURIComponent(providerPrimary)}`);
      const wsrv = wsrvImageUrl(providerPrimary, preset);
      if (wsrv) add(wsrv);
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

  const candidatesKey = candidates.join('|');
  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
  }, [film.slug, kind, candidatesKey]);

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
          fetchPriority={priority ? 'high' : 'low'}
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
      {!loaded && src && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#101218_25%,#181b23_45%,#101218_65%)] bg-[length:220%_100%] motion-reduce:animate-none"
        />
      )}
    </div>
  );
}
