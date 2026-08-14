"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
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

interface CuratedSpotlightSectionProps {
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

function sourceName(source?: string) {
  if (source === "nguonc") return "NguonC";
  if (source === "vsmov") return "VSMov";
  if (source === "ophim") return "OPhim";
  return "KKPhim";
}

export function CuratedSpotlightSection({
  title,
  films,
  isLoading,
  href,
}: CuratedSpotlightSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const spotlightList = useMemo(() => films.slice(0, 7), [films]);
  const activeFilm =
    spotlightList[activeIndex % Math.max(spotlightList.length, 1)];

  useEffect(() => {
    if (reduceMotion || spotlightList.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % spotlightList.length);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [reduceMotion, spotlightList.length]);

  if (isLoading) {
    return (
      <div className="mb-5 h-[560px] w-full animate-pulse rounded-[28px] border border-white/10 bg-white/[0.03] sm:mb-10 lg:mb-14" />
    );
  }

  if (!activeFilm) return null;

  const rating = Number(activeFilm.vote_average || activeFilm.rating || 0);
  const categories = (activeFilm.category || [])
    .map((c) => c.name)
    .filter(Boolean)
    .slice(0, 2);

  return (
    <section
      data-cinematic-section="true"
      className={`${cardFont.className} relative mb-5 w-full select-none sm:mb-10 lg:mb-14`}
    >
      {/* Section Header */}
      <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className={`${cardFont.className} bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 bg-clip-text text-xl font-extrabold tracking-[-0.025em] text-transparent sm:text-2xl`}>
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

      {/* Main Grid Card */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-background sm:rounded-[24px] lg:grid lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left: Hero Spotlight */}
        <div className="relative aspect-[4/3] min-h-[240px] overflow-hidden sm:aspect-[16/9] sm:min-h-0 lg:aspect-auto lg:min-h-[480px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilm.slug}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <TmdbArtwork
                film={activeFilm}
                kind="backdrop"
                alt={activeFilm.name}
                priority
                className="h-full w-full"
              />
              {/* Dark gradient scrim */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/95 via-[#141414]/65 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/95 via-transparent to-transparent" />
            </motion.div>
          </AnimatePresence>

          {/* Content overlay */}
          <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-8 lg:p-10">
            <div aria-hidden="true" />

            {/* Bottom info */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeFilm.slug}-content`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="max-w-lg"
              >
                {/* Meta row */}
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {activeFilm.quality && (
                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-black text-white backdrop-blur-sm">
                      {activeFilm.quality}
                    </span>
                  )}
                  {activeFilm.year && (
                    <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                      <Calendar size={9} />
                      {activeFilm.year}
                    </span>
                  )}
                  {activeFilm.episode_current && (
                    <span className="text-[10px] text-neutral-400">
                      · {activeFilm.episode_current}
                    </span>
                  )}
                  {rating > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      <Star size={9} fill="currentColor" />
                      {rating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className={`${cardFont.className} text-lg font-extrabold tracking-tight text-white line-clamp-2 sm:text-2xl lg:text-3xl`}>
                  {activeFilm.name}
                </h3>
                {activeFilm.origin_name && (
                  <p className="mt-0.5 text-xs text-neutral-400 sm:text-sm">
                    {activeFilm.origin_name}
                  </p>
                )}

                {/* Genre tags */}
                {categories.length > 0 && (
                  <div className="mt-2 flex gap-1.5">
                    {categories.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full border border-white/15 bg-white/[0.07] px-2 py-0.5 text-[10px] text-neutral-300 backdrop-blur-sm"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description */}
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-300 sm:text-sm">
                  {activeFilm.content ||
                    "Một câu chuyện khoa học viễn tưởng với thế giới đủ khác lạ để khiến bạn muốn khám phá đến phút cuối."}
                </p>

                {/* CTA */}
                <div className="mt-3 flex items-center gap-2.5 sm:mt-5">
                  <Link
                    href={filmHref(activeFilm, "watch")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black transition-all hover:bg-orange-100 active:scale-[0.97] sm:px-5 sm:py-2.5 sm:text-sm"
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

        {/* Right: Curated List */}
        <aside className="border-t border-white/[0.07] bg-background p-3 sm:p-4 lg:border-l lg:border-t-0">
          {/* Aside Header */}
          <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div>
              <p className="text-xs font-bold text-white">Danh sách tuyển chọn</p>
              <p className="mt-0.5 text-[10px] text-neutral-500">
                {spotlightList.length} phim · Chọn để đổi tiêu điểm
              </p>
            </div>
          </div>

          {/* Film list — scrollable on mobile, full list on desktop */}
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
            {spotlightList.map((film, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  type="button"
                  key={`${film.slug}-${index}`}
                  onClick={() => setActiveIndex(index)}
                  className={`group relative flex w-[72px] shrink-0 flex-col items-center gap-0 overflow-hidden rounded-xl border text-left transition-all cursor-pointer lg:w-full lg:flex-row lg:items-center lg:gap-3 lg:p-2.5 lg:rounded-xl ${
                    isActive
                      ? "border-orange-400/60 bg-orange-400/[0.08] lg:border-orange-400/60"
                      : "border-transparent lg:border-white/5 hover:border-white/15 hover:bg-white/[0.03]"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-lg bg-neutral-900 lg:aspect-[16/10] lg:w-[72px] lg:rounded-lg">
                    <TmdbArtwork
                      film={film}
                      kind="poster"
                      alt={film.name}
                      className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Active left bar — desktop only */}
                    {isActive && (
                      <div className="absolute left-0 inset-y-0 w-0.5 bg-orange-400 rounded-r hidden lg:block" />
                    )}
                  </div>

                  {/* Film label - mobile: under thumbnail */}
                  <div className="w-full px-1 pb-1 pt-0.5 lg:hidden">
                    <p
                      className={`text-[9px] font-semibold line-clamp-1 leading-tight ${isActive ? "text-orange-300" : "text-neutral-400"}`}
                    >
                      {film.name}
                    </p>
                  </div>

                  {/* Film info - desktop only */}
                  <div className="hidden lg:block min-w-0 flex-1">
                    <p className="text-[10px] text-neutral-500 font-medium">
                      {String(index + 1).padStart(2, "0")}&nbsp;·&nbsp;
                      {film.year || "Mới"}&nbsp;·&nbsp;{sourceName(film._source)}
                    </p>
                    <h4
                      className={`mt-0.5 text-xs font-bold line-clamp-1 ${isActive ? "text-orange-300" : "text-neutral-200 group-hover:text-white"}`}
                    >
                      {film.name}
                    </h4>
                    {film.origin_name && (
                      <p className="mt-0.5 text-[10px] text-neutral-600 line-clamp-1">
                        {film.origin_name}
                      </p>
                    )}
                  </div>

                  {/* Chevron - desktop only */}
                  <ChevronRight
                    size={13}
                    className={`hidden lg:block shrink-0 transition-colors ${isActive ? "text-orange-400" : "text-neutral-700 group-hover:text-neutral-400"}`}
                  />
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
