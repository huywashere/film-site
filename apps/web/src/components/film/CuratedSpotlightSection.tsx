"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { FilmItem, resolveImageUrl } from "@/components/film/FilmCard";

interface CuratedSpotlightSectionProps {
  title: string;
  badge?: string;
  films: FilmItem[];
  isLoading?: boolean;
  href?: string;
}

export function CuratedSpotlightSection({
  title,
  badge = "TUYỂN CHỌN BIÊN TẬP",
  films,
  isLoading,
  href,
}: CuratedSpotlightSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeFilm = useMemo(() => {
    if (!films || films.length === 0) return null;
    return films[activeIndex % films.length];
  }, [films, activeIndex]);

  const spotlightList = useMemo(() => {
    if (!films) return [];
    return films.slice(0, 6);
  }, [films]);

  if (isLoading) {
    return (
      <div className="mb-16 w-full h-[540px] bg-white/[0.03] rounded-[36px] animate-pulse border border-white/10" />
    );
  }

  if (!films || films.length === 0 || !activeFilm) return null;

  const backdropUrl =
    resolveImageUrl(activeFilm.thumb_url || activeFilm.poster_url) ||
    "/images/placeholder-backdrop.jpg";

  return (
    <section className="mb-16 relative w-full select-none transform-gpu contain-paint cv-section-auto">
      {/* Section Header (Matching Form 2) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 gap-3 px-1">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-neutral-400 uppercase">
            {badge}
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-0.5">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                setActiveIndex((prev) =>
                  prev === 0 ? spotlightList.length - 1 : prev - 1,
                )
              }
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white border border-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
              title="Phim trước"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() =>
                setActiveIndex((prev) => (prev + 1) % spotlightList.length)
              }
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white border border-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
              title="Phim tiếp"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              <span>Xem tất cả</span>
              <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Split 2-Column Grid Container (Matching Form 2) */}
      <div className="grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_430px] gap-6 items-stretch">
        {/* LEFT COLUMN: Main Feature Spotlight Box */}
        <div className="relative rounded-[32px] md:rounded-[40px] overflow-hidden border border-white/10 bg-[#0b0d14] shadow-[0_30px_90px_rgba(0,0,0,0.9)] min-h-[480px] lg:min-h-[530px] flex flex-col justify-between p-7 sm:p-10 md:p-12">
          {/* Dynamic Background Image */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilm.slug || activeIndex}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 z-0 pointer-events-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backdropUrl}
                alt={activeFilm.name}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#06070a] via-[#06070a]/90 to-[#06070a]/40 z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-[#06070a]/75 to-transparent z-10" />
            </motion.div>
          </AnimatePresence>

          {/* Spotlight Header Badge */}
          <div className="relative z-20 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-xs font-mono font-bold tracking-wider shadow-md">
              <Sparkles size={13} className="text-neutral-400" />
              <span>
                TIÊU ĐIỂM 0{activeIndex + 1} / 0{spotlightList.length}
              </span>
            </div>
          </div>

          {/* Spotlight Details */}
          <div className="relative z-20 pt-16 space-y-4 max-w-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilm.slug || activeIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="space-y-3.5"
              >
                {/* Meta info */}
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                  <span className="text-white">{activeFilm.quality || "4K ULTRA HD"}</span>
                  <span>•</span>
                  <span>{activeFilm.year || 2026}</span>
                  {activeFilm.episode_current && (
                    <>
                      <span>•</span>
                      <span className="text-neutral-300">
                        {activeFilm.episode_current}
                      </span>
                    </>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                    {activeFilm.name}
                  </h3>
                  {activeFilm.origin_name && (
                    <p className="text-xs sm:text-sm font-semibold text-neutral-400 mt-1 font-mono">
                      {activeFilm.origin_name}
                    </p>
                  )}
                </div>

                {/* Synopsis */}
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed line-clamp-3 md:line-clamp-4 font-sans">
                  {activeFilm.content ||
                    "Bom tấn điện ảnh siêu tưởng hoành tráng đem đến trải nghiệm choáng ngợp về không gian và công nghệ tương lai."}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-3">
                  <Link
                    href={`/watch/${activeFilm.slug}`}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-black font-extrabold text-xs sm:text-sm hover:bg-neutral-200 transition-all hover:scale-105 active:scale-95 shadow-2xl cursor-pointer"
                  >
                    <Play size={16} className="fill-black" />
                    <span>Xem ngay</span>
                  </Link>

                  <Link
                    href={`/film/${activeFilm.slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold text-xs sm:text-sm transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
                  >
                    <Info size={16} />
                    <span>Chi tiết</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT COLUMN: Vertical List Box (Matching Form 2) */}
        <div className="rounded-[32px] md:rounded-[40px] border border-white/10 bg-neutral-950 p-4 sm:p-5 flex flex-col justify-between shadow-2xl">
          <div className="flex items-center justify-between px-2 pb-3.5 border-b border-white/10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400">
              DANH SÁCH CHỌN LỌC
            </span>
            <span className="text-[10px] font-mono text-neutral-500 font-bold">
              {spotlightList.length} phim
            </span>
          </div>

          {/* 6 Vertical List Items */}
          <div className="space-y-2 py-2 flex-1 flex flex-col justify-center">
            {spotlightList.map((film, idx) => {
              const isActive = idx === activeIndex;
              const thumbUrl =
                resolveImageUrl(film.thumb_url || film.poster_url) ||
                "/images/placeholder.jpg";

              return (
                <button
                  key={`${film.slug}-${idx}`}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-full group flex items-center gap-3.5 p-3 rounded-2xl transition-all duration-200 cursor-pointer text-left ${
                    isActive
                      ? "bg-neutral-900 border border-white/30 text-white shadow-lg"
                      : "hover:bg-white/[0.05] border border-transparent text-neutral-400 hover:text-white"
                  }`}
                >
                  {/* Small Landscape Thumbnail */}
                  <div className="relative w-20 sm:w-24 aspect-[16/9] rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shrink-0 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbUrl}
                      alt={film.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>

                  {/* Title & Index Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-neutral-500 mb-0.5">
                      <span className={isActive ? "text-white font-bold" : ""}>
                        0{idx + 1}
                      </span>
                      <span>•</span>
                      <span>{film.year || 2026}</span>
                    </div>
                    <h4
                      className={`text-xs font-bold line-clamp-1 transition-colors ${
                        isActive
                          ? "text-white"
                          : "text-neutral-300 group-hover:text-white"
                      }`}
                    >
                      {film.name}
                    </h4>
                    {film.origin_name && (
                      <p className="text-[10px] text-neutral-500 font-mono line-clamp-1">
                        {film.origin_name}
                      </p>
                    )}
                  </div>

                  {/* Active Indicator Chevron */}
                  <ChevronRight
                    size={15}
                    className={`shrink-0 transition-all duration-200 ${
                      isActive
                        ? "text-white translate-x-0.5 opacity-100"
                        : "text-neutral-600 opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
