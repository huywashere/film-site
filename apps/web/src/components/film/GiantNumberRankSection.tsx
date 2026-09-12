"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Montserrat } from "next/font/google";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Star,
  Sparkles,
  Trophy,
} from "lucide-react";
import { FilmItem } from "@/components/film/FilmCard";
import { TmdbArtwork } from "@/components/film/TmdbArtwork";
import { cardFont } from "@/lib/fonts";
import { useTranslation } from "@/store/langStore";
import { deduplicateSectionRow } from "@/lib/recommendation-engine";
import { cn } from "@/lib/utils";

const numberFont = Montserrat({
  subsets: ["latin"],
  weight: ["900"],
  display: "swap",
});

interface GiantNumberRankSectionProps {
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

// 3D Metallic Gradient styles for top ranks
function getNumberStyle(rank: number) {
  if (rank === 1) {
    return "bg-gradient-to-b from-[#ffe066] via-[#f59e0b] to-[#b45309] text-transparent bg-clip-text drop-shadow-[0_8px_16px_rgba(245,158,11,0.35)]";
  }
  if (rank === 2) {
    return "bg-gradient-to-b from-[#f472b6] via-[#db2777] to-[#9d174d] text-transparent bg-clip-text drop-shadow-[0_8px_16px_rgba(219,39,119,0.35)]";
  }
  if (rank === 3) {
    return "bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#0369a1] text-transparent bg-clip-text drop-shadow-[0_8px_16px_rgba(2,132,199,0.35)]";
  }
  return "bg-gradient-to-b from-[#94a3b8] via-[#475569] to-[#1e293b] text-transparent bg-clip-text drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]";
}

export function GiantNumberRankSection({
  title,
  films,
  isLoading,
  href,
}: GiantNumberRankSectionProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const cleanList = useMemo(
    () => deduplicateSectionRow(films).slice(0, 10),
    [films]
  );

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 20);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 20);
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
      <div className="mb-8 sm:mb-12 h-[340px] w-full animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
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
            className={`${cardFont.className} text-xl font-extrabold tracking-[-0.025em] text-white sm:text-2xl`}
          >
            {title}
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[10px] font-black text-cyan-400">
            <Trophy size={11} className="text-cyan-400" />
            BẢNG XẾP HẠNG
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Scroll Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!canScrollLeft}
              onClick={() => handleScroll("left")}
              aria-label="Previous"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-all hover:border-white/30 hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-90"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={!canScrollRight}
              onClick={() => handleScroll("right")}
              aria-label="Next"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-all hover:border-white/30 hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-90"
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

      {/* ── 3D Giant Number Card Rail ── */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-center gap-4 sm:gap-6 overflow-x-auto py-4 px-1 scrollbar-none scroll-smooth"
      >
        {cleanList.map((film, index) => {
          const rank = index + 1;
          const rating = Number(film.vote_average || film.rating || 0);

          return (
            <div
              key={film.slug || index}
              className="group relative flex shrink-0 items-end cursor-pointer select-none"
            >
              {/* 3D Solid Metallic Giant Number */}
              <div
                className={cn(
                  numberFont.className,
                  "relative select-none pointer-events-none -mr-8 sm:-mr-10 lg:-mr-12 z-0 font-black leading-none",
                  "text-[110px] sm:text-[140px] lg:text-[170px]",
                  getNumberStyle(rank)
                )}
                style={{
                  textShadow:
                    "2px 2px 0px rgba(0,0,0,0.8), 4px 4px 0px rgba(0,0,0,0.6), 6px 6px 15px rgba(0,0,0,0.9)",
                }}
              >
                {rank}
              </div>

              {/* Vertical Poster Card */}
              <div className="relative z-10 w-36 sm:w-44 lg:w-48 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-neutral-900 shadow-[0_15px_35px_rgba(0,0,0,0.85)] transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-105 group-hover:border-white/30 group-hover:shadow-[0_20px_45px_rgba(0,0,0,0.95)]">
                <TmdbArtwork
                  film={film}
                  kind="poster"
                  allowTitleLookup
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                  alt={film.name}
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />

                {/* Top Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                  {film.quality && (
                    <span className="rounded bg-cyan-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-black shadow">
                      {film.quality}
                    </span>
                  )}
                </div>

                {rating > 0 && (
                  <div className="absolute top-2 right-2 z-10 inline-flex items-center gap-0.5 rounded bg-black/70 border border-amber-400/30 px-1.5 py-0.5 text-[9px] font-black text-amber-400 backdrop-blur-md">
                    <Star size={8} fill="currentColor" />
                    {rating.toFixed(1)}
                  </div>
                )}

                {/* Hover Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                  <Link
                    href={filmHref(film, "watch")}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-2xl hover:scale-110 active:scale-95 transition-transform"
                    title="Xem phim ngay"
                  >
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                  </Link>
                </div>

                {/* Bottom Title & Metadata */}
                <div className="absolute inset-x-0 bottom-0 p-3 z-10 space-y-0.5">
                  <Link
                    href={filmHref(film, "detail")}
                    className="block text-xs sm:text-sm font-extrabold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors drop-shadow"
                  >
                    {film.name}
                  </Link>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>{film.year || "2026"}</span>
                    {film.episode_current && film.episode_current !== "Full" && (
                      <span className="text-amber-300 font-bold">
                        {film.episode_current}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
