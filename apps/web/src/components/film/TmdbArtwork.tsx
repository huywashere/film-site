"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FilmItem } from "@/components/film/FilmCard";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { useTmdbArtwork } from "@/hooks/useTmdbArtwork";
import { HERO_LOCAL_FALLBACK } from "@/lib/hero-image";
import { alternateMovieArtworkUrl } from "@/lib/movie-image-url";
import { cn } from "@/lib/utils";
import { Clapperboard } from "lucide-react";

interface TmdbArtworkProps {
  film: FilmItem;
  kind: "backdrop" | "poster";
  className?: string;
  alt?: string;
  priority?: boolean;
  enabled?: boolean;
}

export function TmdbArtwork({
  film,
  kind,
  className,
  alt,
  priority = false,
  enabled = true,
}: TmdbArtworkProps) {
  const { backdropUrl, posterUrl } = useTmdbArtwork(film, enabled);
  const tmdbUrl = kind === "backdrop" ? backdropUrl : posterUrl;
  const providerPrimary =
    kind === "backdrop"
      ? resolveImageUrl(film.thumb_url, film.poster_url)
      : resolveImageUrl(film.poster_url, film.thumb_url);

  const providerAlternate = providerPrimary
    ? alternateMovieArtworkUrl(providerPrimary)
    : null;

  const proxyFallback =
    providerPrimary && !providerPrimary.startsWith("/api/image-proxy")
      ? `/api/image-proxy?url=${encodeURIComponent(providerPrimary)}`
      : null;

  const candidates = useMemo(() => {
    const list: string[] = [];
    const add = (url?: string | null) => {
      if (url && !list.includes(url)) list.push(url);
    };

    if (tmdbUrl) add(tmdbUrl);
    if (providerPrimary) add(providerPrimary);
    if (providerAlternate) add(providerAlternate);
    if (proxyFallback) add(proxyFallback);
    if (kind === "backdrop") add(HERO_LOCAL_FALLBACK);

    return list;
  }, [tmdbUrl, providerPrimary, providerAlternate, proxyFallback, kind]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const src = candidates[candidateIndex];

  useEffect(() => {
    setCandidateIndex(0);
  }, [film.slug, kind]);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-[#101218]", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          key={src}
          src={src}
          alt={alt || film.name}
          width={kind === "backdrop" ? 1280 : 500}
          height={kind === "backdrop" ? 720 : 750}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setCandidateIndex((index) => index + 1);
          }}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300 motion-reduce:transition-none",
            loaded ? "opacity-100" : "opacity-0",
          )}
          data-artwork-source={src === tmdbUrl ? "tmdb" : "fallback"}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-neutral-800 via-neutral-900 to-black p-2 text-center">
          <Clapperboard className="mb-1 h-5 w-5 text-neutral-600" />
          <p className="line-clamp-2 text-[10px] font-bold text-neutral-300">
            {film.name || film.title}
          </p>
        </div>
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
