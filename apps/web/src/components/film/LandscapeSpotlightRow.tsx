"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Star,
  Sparkles,
} from "lucide-react";
import { FilmItem } from "@/components/film/FilmCard";
import { TmdbArtwork } from "@/components/film/TmdbArtwork";
import { cardFont } from "@/lib/fonts";
import { useTranslation } from "@/store/langStore";
import { deduplicateSectionRow } from "@/lib/recommendation-engine";
import { cn } from "@/lib/utils";

interface LandscapeSpotlightRowProps {
  title: string;
  films: FilmItem[];
  isLoading?: boolean;
  href?: string;
}

function filmHref(film: FilmItem, mode: "watch" | "detail") {
  const source = film._source;
  const sourceSlug = source ? film._sourceSlugs?.[source] : undefined;
  const query = new URLSearchParams();
  if (source) query.set("source", source);
  if (sourceSlug && sourceSlug !== film.slug) query.set("sourceSlug", sourceSlug);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return `/${mode === "watch" ? "watch" : "film"}/${film.slug}${suffix}`;
}

export function LandscapeSpotlightRow({
  title,
  films,
  isLoading,
  href,
}: LandscapeSpotlightRowProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const cleanList = useMemo(
    () => deduplicateSectionRow(films).slice(0, 16),
    [films]
  );

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < maxScroll - 10);
    if (maxScroll > 0) {
      setScrollProgress((el.scrollLeft / maxScroll) * 100);
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <div className="mb-8 sm:mb-12 h-[280px] w-full animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
    );
  }

  if (cleanList.length === 0) return null;

  return (
    <section
      data-cinematic-section="true"
      className={`${cardFont.className} relative mb-8 sm:mb-12 w-full select-none`}
    >
      {/* ── Section Header ── */}
      <div className="mb-4 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-3">
          <h2
            className={`${cardFont.className} text-white text-xl font-extrabold tracking-[-0.025em] sm:text-2xl`}
          >
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Scroll Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!canScrollLeft}
              onClick={() => handleScroll("left")}
              aria-label="Previous"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-all hover:border-white/30 hover:bg-white/15 hover:text-white disabled:opacity-20 disabled:pointer-events-none active:scale-90"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={!canScrollRight}
              onClick={() => handleScroll("right")}
              aria-label="Next"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-all hover:border-white/30 hover:bg-white/15 hover:text-white disabled:opacity-20 disabled:pointer-events-none active:scale-90"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {href && (
            <Link
              href={href}
              className="group/link ml-2 hidden sm:inline-flex shrink-0 items-center gap-0.5 text-xs sm:text-sm font-semibold text-white/80 transition-colors hover:text-white"
            >
              <span>{t("home.viewAll", "Xem tất cả")}</span>
              <ChevronRight
                size={14}
                className="stroke-[2.2] text-white/60 transition-transform group-hover/link:translate-x-0.5 group-hover/link:text-white"
              />
            </Link>
          )}
        </div>
      </div>

      {/* ── Horizontal Scrollable Row (4 Cards Per View on Desktop) ── */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none scroll-smooth"
      >
        {cleanList.map((film, index) => {
          const rating = Number(film.vote_average || film.rating || 0);

          return (
            <div
              key={film.slug || index}
              className="group relative flex flex-col shrink-0 w-[270px] sm:w-[310px] lg:w-[340px] cursor-pointer select-none"
            >
              {/* 1. Main Landscape Backdrop (16:9) */}
              <Link
                href={filmHref(film, "watch")}
                className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-neutral-900 shadow-lg transition-all duration-300 group-hover:border-white/25 group-hover:shadow-[0_12px_30px_rgba(0,0,0,0.8)]"
              >
                <TmdbArtwork
                  film={film}
                  kind="backdrop"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  alt={film.name}
                />

                {/* Hover Play Button Overlay */}
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                  </div>
                </div>

                {/* Rating Badge top-right */}
                {rating > 0 && (
                  <div className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-0.5 rounded-md bg-black/75 border border-white/15 px-1.5 py-0.5 text-[9px] font-black text-white backdrop-blur-md">
                    <Star size={8} fill="currentColor" className="text-amber-400" />
                    {rating.toFixed(1)}
                  </div>
                )}
              </Link>

              {/* 2. Overlapping Mini Poster + Film Info */}
              <div className="flex items-start gap-3 -mt-6 sm:-mt-7 px-2 z-10">
                {/* Overlapping Mini Poster (Aspect 2/3) */}
                <Link
                  href={filmHref(film, "detail")}
                  className="relative w-13 sm:w-16 aspect-[2/3] shrink-0 rounded-lg sm:rounded-xl overflow-hidden border-2 border-[#12141a] bg-neutral-950 shadow-2xl transition-transform duration-300 group-hover:scale-105 group-hover:border-white/40"
                >
                  <TmdbArtwork
                    film={film}
                    kind="poster"
                    className="h-full w-full object-cover"
                    alt={film.name}
                  />
                </Link>

                {/* Title & Metadata (Right side of mini poster) */}
                <div className="flex flex-col justify-end pt-7 sm:pt-8 min-w-0 flex-1 space-y-0.5">
                  <Link
                    href={filmHref(film, "detail")}
                    className="block text-xs sm:text-sm font-extrabold text-white line-clamp-1 leading-snug group-hover:text-white/80 transition-colors drop-shadow"
                  >
                    {film.name}
                  </Link>

                  {film.origin_name && (
                    <p className="text-[11px] text-neutral-400 font-medium line-clamp-1">
                      {film.origin_name}
                    </p>
                  )}

                  {/* Metadata Badges */}
                  <div className="flex items-center gap-1.5 pt-1 text-[10px] font-bold">
                    {film.episode_current && (
                      <span className="rounded bg-white/10 border border-white/10 px-1.5 py-0.5 text-neutral-300">
                        {film.episode_current}
                      </span>
                    )}
                    {film.year && (
                      <span className="rounded bg-white/10 border border-white/10 px-1.5 py-0.5 text-neutral-400">
                        {film.year}
                      </span>
                    )}
                    {film.quality && (
                      <span className="rounded bg-white/10 border border-white/10 px-1.5 py-0.5 text-neutral-300 uppercase">
                        {film.quality}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Subtle Progress Bar Indicator ── */}
      <div className="mt-2 w-48 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
        <div
          className="h-full bg-white/40 rounded-full transition-all duration-150"
          style={{ width: `${Math.max(15, scrollProgress)}%` }}
        />
      </div>
    </section>
  );
}
