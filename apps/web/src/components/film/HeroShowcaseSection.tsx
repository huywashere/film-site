"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Info,
  Play,
  Star,
  Calendar,
  Film,
} from "lucide-react";
import { FilmItem } from "@/components/film/FilmCard";
import { TmdbArtwork } from "@/components/film/TmdbArtwork";
import { cardFont } from "@/lib/fonts";

interface HeroShowcaseSectionProps {
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
  if (sourceSlug && sourceSlug !== film.slug)
    query.set("sourceSlug", sourceSlug);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return `/${mode === "watch" ? "watch" : "film"}/${film.slug}${suffix}`;
}

export function HeroShowcaseSection({
  title,
  films,
  isLoading,
  href,
}: HeroShowcaseSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const shortlist = useMemo(() => films.slice(0, 12), [films]);
  const activeFilm = shortlist[activeIndex % Math.max(shortlist.length, 1)];

  useEffect(() => {
    if (reduceMotion || shortlist.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % shortlist.length);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [reduceMotion, shortlist.length]);

  if (isLoading) {
    return (
      <div className="mb-14 h-[520px] w-full animate-pulse rounded-[28px] border border-white/10 bg-white/[0.03]" />
    );
  }

  if (!activeFilm) return null;

  const categories = (activeFilm.category || [])
    .map((c) => c.name)
    .filter(Boolean)
    .slice(0, 3);
  const rating = Number(activeFilm.vote_average || activeFilm.rating || 0);

  return (
    <section
      data-cinematic-section="true"
      className={`${cardFont.className} relative mb-14 w-full select-none`}
    >
      {/* Section Header */}
      <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className={`${cardFont.className} bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-300 bg-clip-text text-xl font-extrabold tracking-[-0.025em] text-transparent sm:text-2xl`}>
            {title}
          </h2>
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-semibold text-neutral-300 transition-all hover:bg-white/[0.1] hover:text-white"
          >
            Xem tất cả <ArrowUpRight size={13} />
          </Link>
        )}
      </div>

      {/* Main Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-background sm:rounded-[24px]">
        {/* Hero Backdrop */}
        <div className="relative h-[260px] overflow-hidden sm:h-[340px] lg:h-[420px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilm.slug}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <TmdbArtwork
                film={activeFilm}
                kind="backdrop"
                alt={activeFilm.name}
                priority
                className="h-full w-full"
              />
              {/* Gradients */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/95 via-[#141414]/65 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/95 via-[#141414]/15 to-transparent" />
            </motion.div>
          </AnimatePresence>

          {/* Content Overlay */}
          <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-8 lg:p-10">
            {/* Top row: counter + nav */}
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[9px] font-semibold text-neutral-300 backdrop-blur-sm">
                {String(activeIndex + 1).padStart(2, "0")}&nbsp;/&nbsp;
                {String(shortlist.length).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((i) =>
                      i === 0 ? shortlist.length - 1 : i - 1,
                    )
                  }
                  aria-label="Trước"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-90 cursor-pointer"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((i) => (i + 1) % shortlist.length)
                  }
                  aria-label="Tiếp theo"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-90 cursor-pointer"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Bottom: Film Info */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeFilm.slug}-info`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="max-w-xl"
              >
                {/* Tags */}
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-neutral-200 backdrop-blur-sm"
                    >
                      {cat}
                    </span>
                  ))}
                  {rating > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      <Star size={9} fill="currentColor" />
                      {rating.toFixed(1)}
                    </span>
                  )}
                  {activeFilm.year && (
                    <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-400">
                      <Calendar size={9} />
                      {activeFilm.year}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className={`${cardFont.className} text-base font-extrabold tracking-tight text-white line-clamp-2 sm:text-2xl lg:text-3xl`}>
                  {activeFilm.name}
                </h3>

                {/* Origin name */}
                {activeFilm.origin_name && (
                  <p className="mt-0.5 text-xs text-neutral-400 sm:text-sm">
                    {activeFilm.origin_name}
                  </p>
                )}

                {/* Description */}
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-300 sm:text-sm">
                  {activeFilm.content ||
                    "Những series Âu Mỹ đáng xem, giàu kịch tính và nhân vật đặc sắc."}
                </p>

                {/* CTA Buttons */}
                <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-5">
                  <Link
                    href={filmHref(activeFilm, "watch")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black transition-all hover:bg-violet-100 active:scale-[0.97] sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    <Play size={14} fill="currentColor" /> Xem ngay
                  </Link>
                  <Link
                    href={filmHref(activeFilm, "detail")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-[0.97] sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    <Info size={14} /> Chi tiết
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Thumbnail Strip */}
        <div className="border-t border-white/[0.07] bg-background px-3 py-3 sm:px-5 sm:py-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Film size={11} className="text-violet-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Chọn Series
              </p>
            </div>
            <p className="text-[10px] text-neutral-600">{shortlist.length} phim</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5 xl:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {shortlist.map((film, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={`${film.slug}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`group relative w-[58px] shrink-0 overflow-hidden rounded-xl transition-all cursor-pointer sm:w-[70px] ${
                    isActive
                      ? "ring-2 ring-violet-400 ring-offset-1 ring-offset-[#141414] opacity-100 scale-105"
                      : "opacity-50 hover:opacity-90 hover:scale-[1.02]"
                  }`}
                  title={film.name}
                >
                  <TmdbArtwork
                    film={film}
                    kind="poster"
                    alt={film.name}
                    className="aspect-[2/3] w-full transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-violet-400" />
                  )}
                  {/* Film name tooltip overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 pt-4">
                    <p className="text-[8px] font-semibold text-white line-clamp-1 leading-tight sm:text-[9px]">
                      {film.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
