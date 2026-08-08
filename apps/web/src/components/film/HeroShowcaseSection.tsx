"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Info,
  Play,
  Sparkles,
  Star,
} from "lucide-react";
import { FilmItem, resolveImageUrl } from "@/components/film/FilmCard";

interface HeroShowcaseSectionProps {
  title: string;
  badge?: string;
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
  badge = "SERIES ÂU MỸ ĐẶC SẮC",
  films,
  isLoading,
  href,
}: HeroShowcaseSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const shortlist = useMemo(() => films.slice(0, 12), [films]);
  const activeFilm = shortlist[activeIndex % Math.max(shortlist.length, 1)];

  if (isLoading) {
    return (
      <div className="mb-14 h-[500px] w-full animate-pulse rounded-[28px] border border-white/10 bg-white/[0.03]" />
    );
  }

  if (!activeFilm) return null;

  const backdropUrl =
    resolveImageUrl(activeFilm.thumb_url || activeFilm.poster_url) ||
    "/images/placeholder-backdrop.jpg";
  const categories = (activeFilm.category || [])
    .map((category) => category.name)
    .filter(Boolean)
    .slice(0, 2);

  return (
    <section
      data-cinematic-section="true"
      className="relative mb-16 w-full select-none"
    >
      <div className="mb-4 flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.08] px-3 py-1 text-[10px] font-bold tracking-[0.14em] text-violet-100">
            <Sparkles size={12} />
            {badge}
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Những series Âu Mỹ đáng xem, được làm mới từ nhiều nguồn phim.
          </p>
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.11]"
          >
            Xem tất cả <ArrowUpRight size={14} />
          </Link>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl sm:rounded-[28px] border border-white/10 bg-[#090b10] shadow-[0_26px_80px_rgba(0,0,0,0.42)]">
        <div className="relative min-h-[260px] sm:min-h-[500px] overflow-hidden">
          <motion.div
            key={activeFilm.slug}
            initial={{ opacity: 0, scale: 1.025 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={backdropUrl}
              alt={activeFilm.name}
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#080a0f_0%,rgba(8,10,15,.92)_40%,rgba(8,10,15,.4)_80%,rgba(8,10,15,.2)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,#080a0f_0%,rgba(8,10,15,.75)_45%,transparent_80%)]" />
          </motion.div>

          <div className="relative z-10 flex min-h-[260px] sm:min-h-[500px] flex-col justify-between p-4 sm:p-10 lg:p-12">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[9px] sm:text-[10px] font-semibold text-neutral-200 backdrop-blur-md">
                {String(activeIndex + 1).padStart(2, "0")} /{" "}
                {String(shortlist.length).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((index) =>
                      index === 0 ? shortlist.length - 1 : index - 1,
                    )
                  }
                  aria-label="Series trước"
                  className="rounded-full border border-white/15 bg-black/40 p-2 sm:p-2.5 text-white backdrop-blur-md transition-colors hover:bg-white/15 active:scale-95 cursor-pointer"
                >
                  <ChevronLeft size={14} className="sm:w-[16px] sm:h-[16px]" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((index) => (index + 1) % shortlist.length)
                  }
                  aria-label="Series tiếp theo"
                  className="rounded-full border border-white/15 bg-black/40 p-2 sm:p-2.5 text-white backdrop-blur-md transition-colors hover:bg-white/15 active:scale-95 cursor-pointer"
                >
                  <ChevronRight size={14} className="sm:w-[16px] sm:h-[16px]" />
                </button>
              </div>
            </div>

            <motion.div
              key={`${activeFilm.slug}-copy`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl pt-4"
            >
              <div className="mb-2 sm:mb-3 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-neutral-300">
                {categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-0.5 sm:px-3 sm:py-1 backdrop-blur-md text-[10px] sm:text-xs"
                  >
                    {category}
                  </span>
                ))}
                <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.1] px-2.5 py-0.5 sm:px-3 sm:py-1 text-amber-200 text-[10px] sm:text-xs font-bold">
                  <Star size={10} className="mr-1 inline fill-current sm:w-[11px] sm:h-[11px]" />
                  {Number(
                    activeFilm.vote_average || activeFilm.rating || 0,
                  ).toFixed(1)}
                </span>
              </div>

              <h3 className="max-w-3xl text-xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white line-clamp-1 sm:line-clamp-2">
                {activeFilm.name}
              </h3>
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm font-medium text-neutral-400">
                {activeFilm.origin_name || "Series Âu Mỹ"}{" "}
                {activeFilm.year ? `• ${activeFilm.year}` : ""}
              </p>
              <p className="mt-2 sm:mt-4 max-w-xl text-xs sm:text-sm leading-relaxed text-neutral-300 line-clamp-2 sm:line-clamp-3">
                {activeFilm.content ||
                  "Một series giàu nhịp điệu, nhân vật và những câu chuyện đủ sức kéo bạn xem tiếp tập sau."}
              </p>

              <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3">
                <Link
                  href={filmHref(activeFilm, "watch")}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-bold text-black transition-colors hover:bg-violet-100 active:scale-[0.98]"
                >
                  <Play size={15} fill="currentColor" /> Xem ngay
                </Link>
                <Link
                  href={filmHref(activeFilm, "detail")}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/[0.15] active:scale-[0.98]"
                >
                  <Info size={15} /> Chi tiết
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#0c0f14]/90 px-3 py-3 sm:px-6 sm:py-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              CHỌN SERIES
            </p>
            <p className="text-[11px] sm:text-xs text-neutral-500">
              {new Set(shortlist.map((film) => film._source || "kkphim")).size}{" "}
              nguồn phim
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {shortlist.map((film, index) => {
              const poster =
                resolveImageUrl(film.poster_url || film.thumb_url) ||
                "/images/placeholder.jpg";
              const active = index === activeIndex;
              return (
                <button
                  type="button"
                  key={`${film.slug}-${index}`}
                  onClick={() => setActiveIndex(index)}
                  className={`group relative w-[72px] sm:w-[96px] shrink-0 overflow-hidden rounded-xl text-left transition-all cursor-pointer ${active ? "ring-2 ring-white shadow-[0_0_20px_rgba(255,255,255,0.3)] opacity-100 scale-105 z-10" : "opacity-60 hover:opacity-100"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={poster}
                    alt={film.name}
                    className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-1.5 pt-4 text-left">
                    <p className="text-[9px] sm:text-[10px] font-bold text-white leading-tight line-clamp-1">
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
