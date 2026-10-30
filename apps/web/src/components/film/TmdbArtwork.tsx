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
  isWsrvImageUrl,
  localImageProxyUrl,
  tmdbImageVariant,
  unwrapImageUrl,
  wsrvImageUrl,
} from '@/lib/image-cdn';
import { isImagePreloaded, markImagePreloaded } from '@/lib/image-preload-cache';

interface TmdbArtworkProps {
  film: FilmItem;
  kind: 'backdrop' | 'poster';
  className?: string;
  imageClassName?: string;
  objectPosition?: string;
  sizes?: string;
  alt?: string;
  priority?: boolean;
  loadImmediately?: boolean;
  enabled?: boolean;
  allowTitleLookup?: boolean;
  preferOriginal?: boolean;
  preferTmdb?: boolean;
}

// Shared IntersectionObserver Singleton: allows 100+ cards to share a single browser observer
// drastically reducing memory footprint and DOM observer overhead during fast scrolling
type ObserverCallback = () => void;
let sharedArtworkObserver: IntersectionObserver | null = null;
const artworkObserverCallbacks = new WeakMap<Element, ObserverCallback>();

// Global in-memory cache of resolved artwork URLs per film slug and kind.
// Retains loaded artwork across client route navigations so cards paint instantly
// without skeleton flicker on revisit.
const resolvedArtworkCache = new Map<string, string>();

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
      { rootMargin: '800px 600px', threshold: 0.01 },
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
  loadImmediately = false,
  enabled = true,
  allowTitleLookup = false,
  preferOriginal = false,
  preferTmdb = false,
}: TmdbArtworkProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [nearViewport, setNearViewport] = useState(priority || loadImmediately);
  const [autoRecovery, setAutoRecovery] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setNearViewport(false);
      return;
    }
    if (priority || loadImmediately) {
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
  }, [enabled, priority, loadImmediately, film.slug]);

  // Shelf pages can render dozens of cards. Only query TMDB if the film lacks
  // provider artwork or if title lookup is explicitly requested or auto-recovering.
  // This avoids choking the browser's HTTP network queue with 100+ concurrent TMDB requests.
  const rawProviderPrimary =
    kind === 'backdrop'
      ? resolveImageUrl(film.thumb_url, film.poster_url)
      : resolveImageUrl(film.poster_url, film.thumb_url);
  const providerPrimary = rawProviderPrimary
    ? rawProviderPrimary.startsWith('/api/image-proxy?')
      ? rawProviderPrimary
      : unwrapImageUrl(rawProviderPrimary) || rawProviderPrimary
    : null;
  const providerIsTmdb = isTmdbImageUrl(providerPrimary);
  const preferredProviderTmdbW1280 =
    preferOriginal && kind === 'backdrop' && providerPrimary && providerIsTmdb
      ? tmdbImageVariant(providerPrimary, 'w1280')
      : null;
  const preferredProviderTmdbOriginal =
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

  const effectivePreferTmdb = preferTmdb;

  const hasExplicitTmdbId = Boolean(film.artwork?.tmdbId || film.tmdbId || film.tmdb?.id);
  const needsTmdbArtwork =
    enabled &&
    nearViewport &&
    (hasExplicitTmdbId ||
      !providerPrimary ||
      allowTitleLookup ||
      autoRecovery ||
      (effectivePreferTmdb && !providerIsTmdb));

  const artworkQuery = useTmdbArtwork(
    film,
    needsTmdbArtwork,
    allowTitleLookup,
  );
  const { backdropUrl, posterUrl } = artworkQuery;
  const tmdbUrl = kind === 'backdrop' ? (backdropUrl || posterUrl) : (posterUrl || backdropUrl);

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
      // TMDB already exposes correctly-sized edge assets. Fetch it directly
      // first; a third-party resize hop can hang even while TMDB is healthy.
      const sizedTmdbUrl =
        kind === 'backdrop'
          ? (preferOriginal && artworkQuery.backdropOriginal) || artworkQuery.backdropW1280 || tmdbUrl
          : artworkQuery.posterW500 || tmdbUrl;
      // Direct TMDB Edge CDN is fastest globally (Fastly/Cloudflare edge)
      add(sizedTmdbUrl);
      add(tmdbUrl);
      if (kind === 'backdrop' && preferOriginal) add(artworkQuery.backdropOriginal);
      if (kind === 'backdrop' && artworkQuery.backdropW780) add(artworkQuery.backdropW780);

      // Local proxy with Cloudflare permanent edge cache as secondary fallback
      add(localImageProxyUrl(sizedTmdbUrl));
    };

    // High-visibility showcases can explicitly request TMDB first. Keep this
    // opt-in so ordinary shelves retain the faster provider-first path.
    if (preferTmdb) addTmdbCandidates();
    if (kind === 'backdrop' && !preferTmdb) addTmdbCandidates();

    // Direct provider artwork. Go keeps alternatives from every merged
    // provider, so a dead CDN can fail over without another metadata request.
    // Movie-provider CDNs are fastest when reachable. Keep the same-origin
    // relay immediately behind them so a blocked CDN cannot leave a shelf blank.
    if (providerPrimary && !isTmdbImageUrl(providerPrimary)) {
      add(providerPrimary);
      add(providerProxy);
    }
    if (providerPrimary && isTmdbImageUrl(providerPrimary)) {
      const sizedProvider =
        tmdbImageVariant(providerPrimary, kind === 'backdrop' ? 'w1280' : 'w500') ||
        providerPrimary;
      add(sizedProvider);
      add(providerPrimary);
      add(localImageProxyUrl(sizedProvider));
    }
    // Once the relay reports a real upstream failure, put the asynchronously
    // resolved TMDB image directly behind it. Otherwise a dead provider URL
    // and its generated variants can keep a card blank for close to a minute.
    if (autoRecovery && !preferTmdb) addTmdbCandidates();
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

    // Keep provider artwork first even after title lookup resolves. Appending
    // TMDB prevents the active candidate from being reordered mid-download.
    if (preferOriginal && kind === 'backdrop') {
      add(preferredProviderTmdbW1280);
      add(preferredProviderTmdbOriginal);
    }
    if (!preferTmdb) addTmdbCandidates();

    // Final fallback for preferTmdb if provider was skipped earlier
    if ((preferTmdb || kind === 'backdrop') && providerPrimary && !isTmdbImageUrl(providerPrimary)) {
      add(providerPrimary);
      add(providerProxy);
    }

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
      add(secondaryUrl);
      add(localImageProxyUrl(secondaryUrl));
    }

    const cacheKey = `${film.slug}:${kind}`;
    const cachedSrc = resolvedArtworkCache.get(cacheKey);
    if (cachedSrc) {
      add(cachedSrc);
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
    artworkQuery.backdropW780,
    artworkQuery.posterW500,
    artworkQuery.posterW780,
    artworkQuery.isFetched,
    preferredProviderTmdbW1280,
    preferredProviderTmdbOriginal,
    preferOriginal,
    preferTmdb,
    effectivePreferTmdb,
    autoRecovery,
  ]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(
    () => resolvedArtworkCache.get(`${film.slug}:${kind}`) || null,
  );
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Provider artwork is already present in the server payload. Render it for
  // every card and let native `loading="lazy"` decide when to fetch it. This
  // keeps catalog posters functional even before (or without) client
  // hydration; the observer is still used to bound TMDB lookups and recovery.
  const shouldAttemptArtwork =
    enabled && (priority || nearViewport || Boolean(providerPrimary));
  const effectiveCandidate =
    candidates[candidateIndex] ||
    candidates.find((c) => c && c !== failedSrc) ||
    providerPrimary ||
    candidates[0];
  const src = shouldAttemptArtwork ? effectiveCandidate : undefined;
  const isPreloaded = Boolean(src && isImagePreloaded(src));
  const loaded = Boolean(src && (loadedSrc === src || isPreloaded));
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
    // Remote provider URLs have already been normalized and sized upstream.
    // Sending an uncommon host through Next's optimizer produces a 400 when
    // that host is intentionally absent from remotePatterns, so deliver all
    // absolute artwork URLs directly and retain the same-origin relay as the
    // next candidate.
    const alreadySized = isPreOptimizedImageUrl(src) || /^https?:\/\//i.test(src);
    const nextImageProps = getImageProps({
      src,
      alt: alt || film.name,
      width: kind === 'backdrop' ? (preferOriginal ? 1920 : 1280) : 500,
      height: kind === 'backdrop' ? (preferOriginal ? 1080 : 720) : 750,
      sizes: responsiveSizes,
      quality: kind === 'backdrop' ? 90 : 85,
      loading: priority || nearViewport ? 'eager' : 'lazy',
      fetchPriority: priority ? 'high' : nearViewport ? 'auto' : 'low',
      unoptimized: alreadySized,
    }).props;
    const responsiveSources = kind === 'backdrop'
      ? [
          artworkQuery.backdropW780 && `${artworkQuery.backdropW780} 780w`,
          artworkQuery.backdropW1280 && `${artworkQuery.backdropW1280} 1280w`,
        ]
      : [
          artworkQuery.posterW185 && `${artworkQuery.posterW185} 185w`,
          artworkQuery.posterW342 && `${artworkQuery.posterW342} 342w`,
          artworkQuery.posterW500 && `${artworkQuery.posterW500} 500w`,
        ];
    const embeddedSrcSet = isTmdbImageUrl(src)
      ? responsiveSources.filter(Boolean).join(', ')
      : '';
    return embeddedSrcSet
      ? { ...nextImageProps, srcSet: embeddedSrcSet }
      : nextImageProps;
  }, [
    alt,
    artworkQuery.backdropW780,
    artworkQuery.backdropW1280,
    artworkQuery.posterW185,
    artworkQuery.posterW342,
    artworkQuery.posterW500,
    film.name,
    kind,
    nearViewport,
    priority,
    responsiveSizes,
    src,
    preferOriginal,
  ]);

  // Reset only when the card identity changes. Resetting when recovery finds a
  // TMDB URL would retry the already-failed provider relay before using it.
  useEffect(() => {
    const cached = resolvedArtworkCache.get(`${film.slug}:${kind}`);
    setCandidateIndex(0);
    setLoadedSrc(cached || null);
    setFailedSrc(null);
    setAutoRecovery(false);
  }, [film.slug, kind]);

  const prevTmdbUrlRef = useRef(tmdbUrl);
  useEffect(() => {
    if (tmdbUrl && tmdbUrl !== prevTmdbUrlRef.current) {
      prevTmdbUrlRef.current = tmdbUrl;
      // Do NOT replace an already loaded valid artwork with a new TMDB candidate
      // unless preferTmdb is explicitly requested! This prevents posters from
      // disappearing mid-scroll after they've already painted cleanly.
      if (!loadedSrc || preferTmdb) {
        setCandidateIndex(0);
        setFailedSrc(null);
      }
    }
  }, [tmdbUrl, loadedSrc, preferTmdb]);

  // Sync loaded state when src changes or when image is already cached/decoded in DOM
  useEffect(() => {
    if (!src) {
      return;
    }
    if (isImagePreloaded(src)) {
      setLoadedSrc(src);
      return;
    }
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      markImagePreloaded(src);
      setLoadedSrc(src);
    }
  }, [src]);

  useEffect(() => {
    if (!src || loaded || (!nearViewport && !priority)) return;
    const timer = window.setTimeout(() => {
      const image = imgRef.current;
      if (image?.complete && image.naturalWidth > 0) {
        if (src) markImagePreloaded(src);
        setLoadedSrc(src);
        return;
      }
      if (src && isImagePreloaded(src)) {
        setLoadedSrc(src);
        return;
      }
      if (providerPrimary && !isTmdbImageUrl(providerPrimary)) {
        setAutoRecovery(true);
      }
      if (candidates.length > candidateIndex + 1) {
        setCandidateIndex((index) => index + 1);
      } else if (!autoRecovery) {
        setAutoRecovery(true);
      }
    }, src.startsWith('/api/image-proxy?')
      ? 12_000
      : isWsrvImageUrl(src)
        ? 8_000
        : loadImmediately || priority
          ? 8_000
          : nearViewport
            ? 12_000
            : 15_000);
    return () => window.clearTimeout(timer);
  }, [
    autoRecovery,
    candidates.length,
    loadImmediately,
    loaded,
    nearViewport,
    priority,
    providerPrimary,
    src,
  ]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden bg-[#101218]', className)}>
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#101218_25%,#181b23_45%,#101218_65%)] bg-[length:220%_100%] [animation-iteration-count:3] motion-reduce:animate-none"
      />
      {src && deliveredImageProps && failedSrc !== src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          {...deliveredImageProps}
          alt={alt || film.name}
          referrerPolicy="no-referrer"
          draggable={false}
          style={objectPosition ? { objectPosition } : undefined}
          onLoad={() => {
            if (src) {
              markImagePreloaded(src);
              resolvedArtworkCache.set(`${film.slug}:${kind}`, src);
            }
            setFailedSrc(null);
            setLoadedSrc(src);
          }}
          onError={() => {
            setFailedSrc(src);
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
            // Do not hide an already decoded server-rendered image while
            // waiting for React's onLoad handler. On production navigations an
            // image can finish before hydration and the event is then missed,
            // leaving a valid poster permanently transparent.
            'relative z-[1] h-full w-full object-cover opacity-100',
            imageClassName,
          )}
          data-artwork-loaded={loaded ? 'true' : 'false'}
          data-artwork-source={
            src === tmdbUrl || /image\.tmdb\.org\/t\/p\//i.test(src) ? 'tmdb' : 'fallback'
          }
        />
      ) : terminalFailure || !src || (failedSrc === src && candidates.length <= 1) ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-neutral-800 via-neutral-900 to-[#101218] p-2 text-center select-none">
          <Clapperboard className="mb-1 h-5 w-5 text-neutral-600" />
          <p className="line-clamp-2 text-[10px] font-bold text-neutral-400">
            {film.name || film.title}
          </p>
        </div>
      ) : null}
    </div>
  );
}
