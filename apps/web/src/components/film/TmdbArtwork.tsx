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
      if (url && !list.includes(url)) list.push(url);
    };

    // Fast path: if provider already has high quality artwork (e.g. PhimImg 60KB WebP), use it directly!
    if (providerPrimary) add(providerPrimary);
    if (providerAlternate) add(providerAlternate);
    if (tmdbUrl) add(tmdbUrl);
    if (providerPrimary) {
      add(`/api/image-proxy?url=${encodeURIComponent(providerPrimary)}`);
    }

    return list.length > 0
      ? list
      : buildArtworkCandidates(
          [tmdbUrl, providerPrimary, providerAlternate],
          kind === 'backdrop' ? 'backdrop' : 'poster',
        );
  }, [
    providerPrimary,
    providerAlternate,
    tmdbUrl,
    kind,
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
          referrerPolicy="strict-origin-when-cross-origin"
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
