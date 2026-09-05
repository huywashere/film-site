"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ChevronRight,
  Info,
  Play,
  Star,
  Sparkles,
  TrendingUp,
  Flame,
  Clapperboard,
  Tv,
} from "lucide-react";
import { FilmItem } from "@/components/film/FilmCard";
import { TmdbArtwork } from "@/components/film/TmdbArtwork";
import { cardFont } from "@/lib/fonts";
import { useTranslation } from "@/store/langStore";
import { deduplicateSectionRow } from "@/lib/recommendation-engine";
import { cn } from "@/lib/utils";

interface BentoGridShowcaseSectionProps {
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

export function BentoGridShowcaseSection({
  title,
  films,
  isLoading,
  href,
}: BentoGridShowcaseSectionProps) {
  const { t } = useTranslation();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  const items = useMemo(() => deduplicateSectionRow(films).slice(0, 5), [films]);
  const heroFilm = items[selectedIdx % Math.max(items.length, 1)];

  // Auto-rotate hero every 8 seconds when idle
  useEffect(() => {
    if (reduceMotion || isHovered || items.length < 2) return;
    const timer = window.setInterval(() => {
      setSelectedIdx((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [reduceMotion, isHovered, items.length]);

  if (isLoading) {
    return (
      <div className="mb-8 sm:mb-12 h-[520px] w-full animate-pulse rounded-[32px] border border-white/10 bg-white/[0.02]" />
    );
  }

  if (!heroFilm || items.length === 0) return null;

  const categories = (heroFilm.category || []).map((c) => c.name).filter(Boolean).slice(0, 3);
  const heroRating = Number(heroFilm.vote_average || heroFilm.rating || 0);

  // Sub-items for the Bento Grid (cards 1, 2, 3, 4)
  const subCards = items.slice(1, 5);

  return (
    <section
      data-cinematic-section="true"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`${cardFont.className} relative mb-8 sm:mb-12 w-full select-none`}
    >
      {/* Section Header */}
      <div className="mb-4 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-3">
          <h2
            className={`${cardFont.className} text-xl font-extrabold tracking-[-0.025em] text-white sm:text-2xl`}
          >
            {title}
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-400">
            <Flame size={11} className="text-emerald-400 fill-emerald-400 animate-pulse" />
            BENTO SPOTLIGHT
          </span>
        </div>

        {href && (
          <Link
            href={href}
            className="group/link inline-flex shrink-0 items-center gap-0.5 text-xs sm:text-sm font-semibold text-white/80 transition-colors hover:text-white"
          >
            <span>{t("home.viewAll", "Xem tất cả")}</span>
            <ChevronRight
              size={14}
              className="stroke-[2.2] text-white/60 transition-transform group-hover/link:translate-x-0.5 group-hover/link:text-white"
            />
          </Link>
        )}
      </div>

      {/* ── Asymmetric Bento Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4.5">
        {/* 🎬 1. Giant Hero Bento Card (Left 7 Cols) */}
        <div className="lg:col-span-7 relative min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] rounded-[28px] sm:rounded-[32px] overflow-hidden border border-white/10 bg-[#0c0e14] shadow-[0_20px_50px_rgba(0,0,0,0.85)] group/hero">
          {/* Animated Backdrop */}
          <AnimatePresence mode="wait">
            <motion.div
              key={heroFilm.slug}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 h-full w-full"
            >
              <TmdbArtwork
                film={heroFilm}
                kind="backdrop"
                className="h-full w-full object-cover object-center scale-105 group-hover/hero:scale-110 transition-transform duration-1000"
                alt={heroFilm.name}
              />
            </motion.div>
          </AnimatePresence>

          {/* Multilayered Darkness Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090b10] via-[#090b10]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090b10] via-[#090b10]/80 to-transparent w-full sm:w-[75%]" />

          {/* Top Badge */}
          <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-10 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-[11px] font-black text-emerald-300 backdrop-blur-md shadow-lg">
              <Sparkles size={12} className="text-emerald-300" />
              TIÊU ĐIỂM HÔM NAY
            </span>
          </div>

          {/* Bottom Info Content */}
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 lg:p-8 z-10 space-y-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={heroFilm.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-2.5"
              >
                {/* Meta Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {heroFilm.quality && (
                    <span className="rounded-md bg-emerald-400 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                      {heroFilm.quality}
                    </span>
                  )}
                  {heroFilm.year && (
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                      {heroFilm.year}
                    </span>
                  )}
                  {heroFilm.episode_current && heroFilm.episode_current !== "Full" && (
                    <span className="rounded-md bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      {heroFilm.episode_current}
                    </span>
                  )}
                  {heroRating > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black text-amber-400">
                      <Star size={10} fill="currentColor" />
                      {heroRating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">
                  {heroFilm.name}
                </h3>

                {/* Synopsis */}
                {heroFilm.content && (
                  <p className="text-xs sm:text-sm text-neutral-300/85 line-clamp-2 leading-relaxed max-w-xl">
                    {heroFilm.content.replace(/<[^>]*>/g, "")}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Link
                    href={filmHref(heroFilm, "watch")}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-2.5 text-xs sm:text-sm font-extrabold text-black transition-all hover:bg-emerald-300 hover:scale-105 active:scale-95 shadow-[0_4px_25px_rgba(52,211,153,0.3)]"
                  >
                    <Play size={15} fill="currentColor" />
                    <span>{t("watch.watchNow", "Xem ngay")}</span>
                  </Link>

                  <Link
                    href={filmHref(heroFilm, "detail")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all hover:bg-white/20 active:scale-95 backdrop-blur-md"
                  >
                    <Info size={14} />
                    <span>{t("film.detail", "Chi tiết")}</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* 🍱 2. Right Bento Grid (Right 5 Cols - 2x2 Grid) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3.5 sm:gap-4.5">
          {subCards.map((film, index) => {
            const actualIndex = index + 1;
            const isSelected = selectedIdx === actualIndex;
            const cardRating = Number(film.vote_average || film.rating || 0);

            return (
              <div
                key={film.slug || index}
                onClick={() => setSelectedIdx(actualIndex)}
                className={cn(
                  "group relative aspect-[3/4] sm:aspect-[4/5] lg:aspect-auto lg:h-[240px] rounded-[22px] sm:rounded-[26px] overflow-hidden border transition-all duration-300 cursor-pointer select-none",
                  isSelected
                    ? "border-emerald-400 ring-2 ring-emerald-400/80 shadow-[0_10px_30px_rgba(52,211,153,0.3)] scale-[1.02]"
                    : "border-white/10 bg-[#0e1017] hover:border-white/25 hover:scale-[1.02] shadow-lg"
                )}
              >
                {/* Poster Artwork */}
                <TmdbArtwork
                  film={film}
                  kind="poster"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-108"
                  alt={film.name}
                />

                {/* Gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />

                {/* Top Badge */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                  <span className="rounded-md bg-black/60 border border-white/15 px-1.5 py-0.5 text-[9px] font-black text-white backdrop-blur-md">
                    #{actualIndex + 1}
                  </span>

                  {cardRating > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-black text-amber-400 backdrop-blur-md">
                      <Star size={8} fill="currentColor" />
                      {cardRating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Bottom Content */}
                <div className="absolute inset-x-0 bottom-0 p-3 z-10 space-y-1">
                  <p className="text-xs sm:text-sm font-extrabold text-white line-clamp-1 leading-snug drop-shadow group-hover:text-emerald-300 transition-colors">
                    {film.name}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>{film.year || "2026"}</span>
                    <span className="text-emerald-400 font-bold group-hover:underline">
                      Chọn xem ›
                    </span>
                  </div>
                </div>

                {/* Active Indicator Pulse */}
                {isSelected && (
                  <div className="absolute inset-0 border-2 border-emerald-400 rounded-[22px] sm:rounded-[26px] pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
