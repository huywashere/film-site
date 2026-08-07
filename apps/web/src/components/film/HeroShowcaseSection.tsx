"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, ChevronLeft, ChevronRight, Star, Sparkles } from "lucide-react";
import { FilmItem, resolveImageUrl } from "@/components/film/FilmCard";

interface HeroShowcaseSectionProps {
  title: string;
  badge?: string;
  films: FilmItem[];
  isLoading?: boolean;
  href?: string;
}

export function HeroShowcaseSection({
  title,
  badge = "SERIES ÂU MỸ ĐẶC SẮC",
  films,
  isLoading,
  href,
}: HeroShowcaseSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeFilm = useMemo(() => {
    if (!films || films.length === 0) return null;
    return films[activeIndex % films.length];
  }, [films, activeIndex]);

  if (isLoading) {
    return (
      <div className="mb-14 w-full h-[520px] bg-white/[0.03] rounded-[32px] animate-pulse border border-white/10" />
    );
  }

  if (!films || films.length === 0 || !activeFilm) return null;

  const backdropUrl =
    resolveImageUrl(activeFilm.thumb_url || activeFilm.poster_url) ||
    "/images/placeholder-backdrop.jpg";

  const categories =
    activeFilm.category && activeFilm.category.length > 0
      ? activeFilm.category.slice(0, 3)
      : [
          { name: activeFilm.type === "series" ? "Phim Bộ" : "Âu Mỹ" },
          { name: "Hành Động" },
          { name: "Sci-Fi & Kịch Tính" },
        ];

  return (
    <section className="mb-16 relative w-full select-none cv-section-auto">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-[11px] font-mono font-bold tracking-wider uppercase shadow-sm">
            <Sparkles size={12} className="text-neutral-400" />
            <span>{badge}</span>
          </span>
          <h2 className="text-xl md:text-3xl font-black text-white tracking-tight">
            {title}
          </h2>
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.12] text-white/90 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <span>Xem tất cả</span>
            <ChevronRight size={13} strokeWidth={2.5} />
          </Link>
        )}
      </div>

      {/* Main 16:9 Showcase Card Container (Matching Form 1) */}
      <div className="relative w-full rounded-[32px] md:rounded-[40px] overflow-hidden border border-white/10 bg-[#07080c] shadow-[0_30px_90px_rgba(0,0,0,0.95)] min-h-[500px] md:min-h-[550px] flex flex-col justify-between p-6 sm:p-10 md:p-12">
        {/* Dynamic Background Image with Smooth Crossfade */}
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
            {/* Rich Layered Vignette Overlays for Maximum Cinematic Contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#06070a] via-[#06070a]/90 to-transparent z-10 w-full lg:w-[68%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-[#06070a]/70 to-transparent z-10" />
            <div className="absolute inset-0 bg-[#06070a]/20 z-10" />
          </motion.div>
        </AnimatePresence>

        {/* Top Content Details */}
        <div className="relative z-20 max-w-2xl pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilm.slug || activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Category Glass Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((cat, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-xs font-semibold tracking-wide shadow-sm"
                  >
                    {cat.name}
                  </span>
                ))}
                {activeFilm.vote_average ? (
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/15 backdrop-blur-md border border-amber-500/30 text-amber-400 text-xs font-mono font-bold shadow-sm">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {Number(activeFilm.vote_average).toFixed(1)}
                  </span>
                ) : null}
              </div>

              {/* Title & Origin Name */}
              <div>
                <h3 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.08] drop-shadow-lg">
                  {activeFilm.name}
                </h3>
                {activeFilm.origin_name && (
                  <p className="text-xs sm:text-sm font-semibold text-neutral-400 mt-1.5 font-mono">
                    {activeFilm.origin_name}{" "}
                    {activeFilm.year ? `(${activeFilm.year})` : ""}
                  </p>
                )}
              </div>

              {/* Synopsis Snippet */}
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed line-clamp-3 md:line-clamp-4 max-w-xl font-sans drop-shadow">
                {activeFilm.content ||
                  "Bộ phim series bom tấn đỉnh cao hứa hẹn những diễn biến bất ngờ và nghẹt thở qua từng tập phim."}
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
                  <span>Thông tin</span>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Track: Horizontal Poster Cards (Matching Form 1) */}
        <div className="relative z-20 pt-8 mt-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400">
              BỘ SƯU TẬP {films.length} PHIM SERIES HÀNG ĐẦU
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setActiveIndex((prev) =>
                    prev === 0 ? films.length - 1 : prev - 1,
                  )
                }
                className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/15 transition-all hover:scale-110 active:scale-90 cursor-pointer shadow-md"
                title="Phim trước"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() =>
                  setActiveIndex((prev) => (prev + 1) % films.length)
                }
                className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/15 transition-all hover:scale-110 active:scale-90 cursor-pointer shadow-md"
                title="Phim tiếp"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3.5 overflow-x-auto scrollbar-none py-2 px-1">
            {films.slice(0, 12).map((film, index) => {
              const isActive = index === activeIndex;
              const cardPoster =
                resolveImageUrl(film.poster_url || film.thumb_url) ||
                "/images/placeholder.jpg";

              return (
                <button
                  key={`${film.slug}-${index}`}
                  onClick={() => setActiveIndex(index)}
                  className={`group relative shrink-0 w-22 sm:w-28 md:w-32 aspect-[2/3] rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "ring-2 ring-white scale-105 shadow-[0_0_30px_rgba(255,255,255,0.4)] opacity-100 z-10"
                      : "opacity-60 hover:opacity-100 hover:scale-105 border border-white/10"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cardPoster}
                    alt={film.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-90" />
                  {isActive && (
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-white ring-2 ring-black" />
                  )}
                  <span className="absolute bottom-2 left-2.5 right-2.5 text-[11px] font-bold text-white line-clamp-1 text-left drop-shadow">
                    {film.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
