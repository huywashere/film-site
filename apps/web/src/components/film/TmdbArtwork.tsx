'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getImageProps } from 'next/image';
import type { FilmItem } from '@/components/film/FilmCard';
import { resolveImageUrl } from '@/components/film/FilmCard';
import { useTmdbArtwork } from '@/hooks/useTmdbArtwork';
import { cn } from '@/lib/utils';
import { Clapperboard } from 'lucide-react';
import {
  buildArtworkCandidates,
  isPreOptimizedImageUrl,
  isTmdbImageUrl,
  localImageProxyUrl,
  tmdbImageVariant,
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

function imageHostname(value?: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

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
  useEffect(() => {
    if (!enabled) {
      setNearViewport(false);
      return;
    }
    if (priority) {
      setNearViewport(true);
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
  }, [enabled, priority, film.slug]);

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
  const providerIsTmdb = isTmdbImageUrl(providerPrimary);
  const preferredProviderTmdb =
    preferOriginal && kind === 'backdrop' && providerPrimary && providerIsTmdb
      ? tmdbImageVariant(providerPrimary, 'original')
      : null;

  const providerCandidates =
    kind === 'backdrop' ? film._thumbCandidates : film._posterCandidates;
  const providerFallback = useMemo(() => {
    const primaryHost = imageHostname(providerPrimary);
    for (const candidate of providerCandidates || []) {
      const resolved = resolveImageUrl(candidate);
      const clean = resolved ? unwrapImageUrl(resolved) || resolved : null;
      if (
        clean &&
        clean !== providerPrimary &&
        !isTmdbImageUrl(clean) &&
        imageHostname(clean) !== primaryHost
      ) return clean;
    }
    return null;
  }, [providerCandidates, providerPrimary]);
  const providerProxy = providerPrimary
    ? localImageProxyUrl(providerPrimary, { fallback: providerFallback })
    : null;

  const needsTmdbArtwork =
    enabled &&
    nearViewport &&
    ((preferOriginal && kind === 'backdrop' && (!providerIsTmdb || !film.thumb_url)) ||
      ((!providerIsTmdb || autoRecovery) &&
        (!providerPrimary || allowTitleLookup || autoRecovery)));

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
      // 1. wsrv edge proxy (Cloudflare Edge WebP - Blazing fast in VN, 20-50ms)
      const wsrv = wsrvImageUrl(tmdbUrl, preset);
      if (wsrv) add(wsrv);

      // 2. Direct TMDB CDN fallback
      if (kind === 'backdrop' && preferOriginal) add(artworkQuery.backdropOriginal);
      if (kind === 'backdrop' && !preferOriginal) add(artworkQuery.backdropW1280);
      if (kind === 'poster') add(artworkQuery.posterW500);
      add(tmdbUrl);

      // 3. Local proxy fallback
      add(`/api/image-proxy?url=${encodeURIComponent(tmdbUrl)}`);
    };

    // Full-width showcases opt into the largest matching TMDB asset. Keep the
    // provider image behind it so the existing frame stays painted while the
    // quality upgrade downloads.
    if (preferOriginal && kind === 'backdrop') {
      add(preferredProviderTmdb);
      addTmdbCandidates();
    }

    // Direct provider artwork. Go keeps alternatives from every merged
    // provider, so a dead CDN can fail over without another metadata request.
    // Movie-provider CDNs are unreliable on some client networks. Start with
    // our cached same-origin relay so a blocked CDN cannot leave an entire
    // shelf pending. TMDB remains direct because its regional CDN is stable.
    if (providerPrimary && !isTmdbImageUrl(providerPrimary)) add(providerProxy);
    if (providerPrimary && isTmdbImageUrl(providerPrimary)) {
      const wsrv = wsrvImageUrl(providerPrimary, preset);
      if (wsrv) add(wsrv);
      add(providerPrimary);
    }
    // Once the relay reports a real upstream failure, put the asynchronously
    // resolved TMDB image directly behind it. Otherwise a dead provider URL
    // and its generated variants can keep a card blank for close to a minute.
    if (autoRecovery) addTmdbCandidates();
    let providerRecoveryCount = 0;
    const recoveryHosts = new Set([imageHostname(providerPrimary)]);
    providerCandidates?.forEach((candidate) => {
      const resolved = resolveImageUrl(candidate);
      const clean = resolved ? unwrapImageUrl(resolved) || resolved : null;
      if (!clean || clean === providerPrimary || clean === providerFallback) return;
      if (isTmdbImageUrl(clean)) {
        add(clean);
        return;
      }
      if (providerRecoveryCount >= 2) return;
      const host = imageHostname(clean);
      if (recoveryHosts.has(host)) return;
      add(localImageProxyUrl(clean));
      recoveryHosts.add(host);
      providerRecoveryCount += 1;
    });

    // Never replace artwork that is already loading or painted just because a
    // title lookup finishes. TMDB is a recovery source, not a mid-paint
    // upgrade, so provider artwork remains stable and the card cannot flash.
    if (!autoRecovery && !preferOriginal) addTmdbCandidates();

    // Cross-fallback: if backdrop is needed and only poster was passed (or vice versa).
    const rawSecondaryUrl =
      kind === 'backdrop'
        ? resolveImageUrl(film.poster_url)
        : resolveImageUrl(film.thumb_url);
    const secondaryUrl = rawSecondaryUrl
      ? unwrapImageUrl(rawSecondaryUrl) || rawSecondaryUrl
      : null;
    if (
      secondaryUrl &&
      secondaryUrl !== providerPrimary &&
      secondaryUrl !== providerFallback
    ) {
      add(isTmdbImageUrl(secondaryUrl) ? secondaryUrl : localImageProxyUrl(secondaryUrl));
    }

    if (list.length > 0) return list;

    return buildArtworkCandidates(
      [tmdbUrl, providerPrimary, providerFallback],
      kind === 'backdrop' ? 'backdrop' : 'poster',
    );
  }, [
    providerPrimary,
    providerFallback,
    providerProxy,
    tmdbUrl,
    kind,
    film.poster_url,
    film.thumb_url,
    providerCandidates,
    artworkQuery.backdropW1280,
    artworkQuery.backdropOriginal,
    artworkQuery.posterW500,
    preferredProviderTmdb,
    preferOriginal,
    autoRecovery,
  ]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const shouldAttemptArtwork = enabled && (priority || nearViewport);
  const src = shouldAttemptArtwork ? candidates[candidateIndex] : undefined;
  const loaded = Boolean(src && loadedSrc === src);
  const exhaustedCandidates = candidateIndex >= candidates.length;
  const lookupSettledWithoutArtwork = artworkQuery.isFetched && !tmdbUrl;
  const terminalFailure =
    shouldAttemptArtwork &&
    exhaustedCandidates &&
    ((!autoRecovery && candidates.length > 0) ||
      (autoRecovery && lookupSettledWithoutArtwork) ||
      (candidates.length === 0 && lookupSettledWithoutArtwork));

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

  // Reset only when the card identity changes. Resetting when recovery finds a
  // TMDB URL would retry the already-failed provider relay before using it.
  useEffect(() => {
    setCandidateIndex(0);
    setLoadedSrc(null);
    setAutoRecovery(false);
  }, [film.slug, kind]);

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
      if (providerPrimary && !isTmdbImageUrl(providerPrimary)) {
        setAutoRecovery(true);
      }
      setCandidateIndex((index) => {
        const next = index + 1;
        if (next >= candidates.length && !autoRecovery) {
          setAutoRecovery(true);
        }
        return next;
      });
    }, src.startsWith('/api/image-proxy?') ? 6_000 : priority ? 3_500 : nearViewport ? 4_500 : 7_500);
    return () => window.clearTimeout(timer);
  }, [autoRecovery, candidates.length, loaded, nearViewport, priority, providerPrimary, src]);

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
            if (providerPrimary && !isTmdbImageUrl(providerPrimary)) {
              setAutoRecovery(true);
            }
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
      ) : terminalFailure ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-neutral-800 via-neutral-900 to-black p-2 text-center">
          <Clapperboard className="mb-1 h-5 w-5 text-neutral-600" />
          <p className="line-clamp-2 text-[10px] font-bold text-neutral-300">
            {film.name || film.title}
          </p>
        </div>
      ) : null}
    </div>
  );
}
