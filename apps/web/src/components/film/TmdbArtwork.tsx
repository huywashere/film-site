"use client";

import { useEffect, useMemo, useState } from "react";
import type { FilmItem } from "@/components/film/FilmCard";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { useTmdbArtwork } from "@/hooks/useTmdbArtwork";
import { HERO_LOCAL_FALLBACK } from "@/lib/hero-image";
import { cn } from "@/lib/utils";

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
  const providerFallback =
    kind === "backdrop"
      ? resolveImageUrl(film.thumb_url, film.poster_url)
      : resolveImageUrl(film.poster_url, film.thumb_url);
  const candidates = useMemo(
    () =>
      [providerFallback, tmdbUrl, HERO_LOCAL_FALLBACK].filter(
        (candidate, index, values): candidate is string =>
          Boolean(candidate) && values.indexOf(candidate) === index,
      ),
    [providerFallback, tmdbUrl],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
  }, [film.slug, kind, tmdbUrl]);

  const src = candidates[candidateIndex] || HERO_LOCAL_FALLBACK;
  return (
    <div className={cn("relative overflow-hidden bg-[#101218]", className)}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt || film.name}
          width={kind === "backdrop" ? 1280 : 500}
          height={kind === "backdrop" ? 720 : 750}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setCandidateIndex((index) =>
              Math.min(index + 1, candidates.length - 1),
            );
          }}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none",
            loaded ? "opacity-100" : "opacity-0",
          )}
          data-artwork-source={src === tmdbUrl ? "tmdb" : "fallback"}
        />
      )}
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#101218_25%,#181b23_45%,#101218_65%)] bg-[length:220%_100%] motion-reduce:animate-none"
        />
      )}
    </div>
  );
}
