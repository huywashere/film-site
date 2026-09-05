"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Play,
  Star,
  Sparkles,
  Clapperboard,
} from "lucide-react";
import { FilmItem } from "@/components/film/FilmCard";
import { TmdbArtwork } from "@/components/film/TmdbArtwork";
import { cardFont } from "@/lib/fonts";
import { useTranslation } from "@/store/langStore";
import { deduplicateSectionRow } from "@/lib/recommendation-engine";
import { cn } from "@/lib/utils";

interface AppleDepthShowcaseSectionProps {
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

export function AppleDepthShowcaseSection({
  title,
  films,
  isLoading,
  href,
}: AppleDepthShowcaseSectionProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  // Deduplicate and take top 8 films for the showcase
  const items = useMemo(() => deduplicateSectionRow(films).slice(0, 8), [films]);
  const activeFilm = items[activeIndex % Math.max(items.length, 1)];

  // Auto slide every 7s when not hovered
  useEffect(() => {
    if (reduceMotion || isHovered || items.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [reduceMotion, isHovered, items.length]);

  if (isLoading) {
    return (
      <div className="mb-8 sm:mb-12 h-[480px] sm:h-[540px] w-full animate-pulse rounded-[32px] border border-white/10 bg-white/[0.02]" />
    );
  }

  if (!activeFilm || items.length === 0) return null;

  const categories = (activeFilm.category || []).map((c) => c.name).filter(Boolean).slice(0, 3);
  const rating = Number(activeFilm.vote_average || activeFilm.rating || 0);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

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
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[10px] font-black text-cyan-400">
            <Sparkles size={11} className="animate-pulse" />
            SPOTLIGHT
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicator count */}
          <span className="text-xs font-bold text-neutral-400 tabular-nums">
            <span className="text-white font-extrabold">{String(activeIndex + 1).padStart(2, "0")}</span>
            <span className="mx-1 text-neutral-600">/</span>
            <span>{String(items.length).padStart(2, "0")}</span>
          </span>

          {/* Prev/Next Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous film"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-all hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-90"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next film"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-all hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-90"
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

      {/* Main Apple TV+ Depth Card Stage */}
      <div className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] border border-white/10 bg-[#0a0c10] shadow-[0_25px_70px_rgba(0,0,0,0.85)]">
        {/* ── Background Layer: Cinematic Ambient Glow Backdrop ── */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilm.slug}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 h-full w-full"
            >
              <TmdbArtwork
                film={activeFilm}
                kind="backdrop"
                className="h-full w-full object-cover object-center opacity-40 blur-[2px] scale-105"
                alt=""
              />
            </motion.div>
          </AnimatePresence>

          {/* Multilayered Gradients for Perfect Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c10] via-[#0a0c10]/85 to-transparent w-full md:w-[65%]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(35,173,229,0.15),transparent_60%)]" />
        </div>

        {/* ── Stage Content Layout ── */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 lg:p-10 items-center min-h-[460px] sm:min-h-[500px]">
          {/* Left Column: Active Movie Info */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilm.slug}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-3.5"
              >
                {/* Meta badges row */}
                <div className="flex flex-wrap items-center gap-2">
                  {activeFilm.quality && (
                    <span className="rounded-md bg-cyan-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-sm">
                      {activeFilm.quality}
                    </span>
                  )}
                  {activeFilm.year && (
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-black text-white/90 backdrop-blur-md">
                      {activeFilm.year}
                    </span>
                  )}
                  {activeFilm.episode_current && activeFilm.episode_current !== "Full" && (
                    <span className="rounded-md bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      {activeFilm.episode_current}
                    </span>
                  )}
                  {rating > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black text-amber-400">
                      <Star size={10} fill="currentColor" />
                      {rating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Main Title */}
                <div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.2] line-clamp-2 drop-shadow-md">
                    {activeFilm.name}
                  </h3>
                  {activeFilm.origin_name && activeFilm.origin_name !== activeFilm.name && (
                    <p className="mt-1 text-xs sm:text-sm italic text-neutral-400 line-clamp-1 font-medium">
                      {activeFilm.origin_name}
                    </p>
                  )}
                </div>

                {/* Category Pills */}
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {categories.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-300 backdrop-blur-md"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Synopsis */}
                {activeFilm.content && (
                  <p className="text-xs sm:text-sm text-neutral-300/85 line-clamp-2 leading-relaxed font-normal">
                    {activeFilm.content.replace(/<[^>]*>/g, "")}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Link
                    href={filmHref(activeFilm, "watch")}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs sm:text-sm font-extrabold text-black transition-all hover:bg-neutral-200 hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(255,255,255,0.2)]"
                  >
                    <Play size={15} fill="currentColor" />
                    <span>{t("watch.watchNow", "Xem ngay")}</span>
                  </Link>

                  <Link
                    href={filmHref(activeFilm, "detail")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all hover:bg-white/20 hover:border-white/30 active:scale-95 backdrop-blur-md"
                  >
                    <Info size={14} />
                    <span>{t("film.detail", "Chi tiết")}</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column: 3D Depth Card Carousel */}
          <div className="lg:col-span-7 flex items-center overflow-x-auto py-4 px-1 scrollbar-none gap-3.5 sm:gap-4.5">
            {items.map((film, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div
                  key={film.slug || idx}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    "relative shrink-0 cursor-pointer transition-all duration-500 rounded-2xl overflow-hidden select-none",
                    isActive
                      ? "w-40 sm:w-48 aspect-[2/3] scale-105 z-20 ring-2 ring-cyan-400 shadow-[0_12px_35px_rgba(35,173,229,0.4)]"
                      : "w-28 sm:w-36 aspect-[2/3] scale-95 opacity-60 hover:opacity-90 hover:scale-100 z-10 border border-white/10 bg-neutral-900"
                  )}
                >
                  <TmdbArtwork
                    film={film}
                    kind="poster"
                    className="h-full w-full object-cover"
                    alt={film.name}
                  />

                  {/* Gradient Overlay for Card */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />

                  {/* Bottom title & index on active card */}
                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    {isActive ? (
                      <div className="space-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <p className="text-[11px] font-black text-white line-clamp-1 leading-tight drop-shadow">
                          {film.name}
                        </p>
                        <p className="text-[9px] font-bold text-cyan-300">
                          Đang phát
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-neutral-300 line-clamp-1">
                        {film.name}
                      </p>
                    )}
                  </div>

                  {/* Active playing indicator badge */}
                  {isActive && (
                    <div className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500 text-black shadow-lg">
                      <Play size={10} fill="currentColor" className="ml-0.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Carousel Progress Bars */}
        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 z-20 pointer-events-none">
          {items.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                idx === activeIndex
                  ? "w-6 bg-cyan-400 shadow-[0_0_8px_rgba(35,173,229,0.8)]"
                  : "w-1.5 bg-white/20"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
