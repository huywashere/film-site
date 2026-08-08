"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Info,
  Orbit,
  Play,
} from "lucide-react";
import { FilmItem, resolveImageUrl } from "@/components/film/FilmCard";

interface CuratedSpotlightSectionProps {
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

function sourceName(source?: string) {
  if (source === "nguonc") return "NguonC";
  if (source === "vsmov") return "VSMov";
  if (source === "ophim") return "OPhim";
  return "KKPhim";
}

export function CuratedSpotlightSection({
  title,
  badge = "TUYỂN CHỌN BIÊN TẬP",
  films,
  isLoading,
  href,
}: CuratedSpotlightSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const spotlightList = useMemo(() => films.slice(0, 7), [films]);
  const activeFilm =
    spotlightList[activeIndex % Math.max(spotlightList.length, 1)];

  if (isLoading) {
    return (
      <div className="mb-16 h-[560px] w-full animate-pulse rounded-[28px] border border-white/10 bg-white/[0.03]" />
    );
  }

  if (!activeFilm) return null;

  const backdropUrl =
    resolveImageUrl(activeFilm.thumb_url || activeFilm.poster_url) ||
    "/images/placeholder-backdrop.jpg";

  return (
    <section
      data-cinematic-section="true"
      className="relative mb-16 w-full select-none"
    >
      <div className="mb-5 flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[0.16em] text-neutral-500">
            {badge}
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Không gian xa lạ, công nghệ mới và những ý tưởng vượt khỏi hiện tại.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveIndex((index) =>
                index === 0 ? spotlightList.length - 1 : index - 1,
              )
            }
            aria-label="Phim trước"
            className="rounded-full border border-white/10 bg-white/[0.05] p-2.5 text-white transition-colors hover:bg-white/[0.12] active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveIndex((index) => (index + 1) % spotlightList.length)
            }
            aria-label="Phim tiếp theo"
            className="rounded-full border border-white/10 bg-white/[0.05] p-2.5 text-white transition-colors hover:bg-white/[0.12] active:scale-95"
          >
            <ChevronRight size={16} />
          </button>
          {href && (
            <Link
              href={href}
              className="ml-1 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.13]"
            >
              Xem tất cả <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      </div>

      <div className="grid overflow-hidden rounded-2xl sm:rounded-[28px] border border-white/10 bg-[#090b10] shadow-[0_26px_80px_rgba(0,0,0,0.4)] lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="relative min-h-[260px] sm:min-h-[510px] overflow-hidden">
          <motion.div
            key={activeFilm.slug}
            initial={{ opacity: 0, scale: 1.025 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={backdropUrl}
              alt={activeFilm.name}
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#07090e_0%,rgba(7,9,14,.9)_40%,rgba(7,9,14,.4)_80%,rgba(7,9,14,.2)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,#07090e_0%,rgba(7,9,14,.75)_45%,transparent_80%)]" />
          </motion.div>

          <div className="relative z-10 flex min-h-[260px] sm:min-h-[510px] flex-col justify-between p-4 sm:p-10 lg:p-12">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-black/40 px-2.5 py-1 text-[9px] sm:text-[10px] font-semibold text-violet-100 backdrop-blur-md">
                <Orbit size={13} /> TIÊU ĐIỂM{" "}
                {String(activeIndex + 1).padStart(2, "0")}
              </span>
              <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[9px] sm:text-[10px] font-semibold text-neutral-300 backdrop-blur-md">
                {sourceName(activeFilm._source)}
              </span>
            </div>

            <motion.div
              key={`${activeFilm.slug}-content`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl pt-4"
            >
              <p className="text-[11px] sm:text-xs font-semibold text-neutral-300">
                {activeFilm.quality || "FHD"}{" "}
                <span className="px-2 text-neutral-600">•</span>{" "}
                {activeFilm.year || "Mới"}
                {activeFilm.episode_current ? (
                  <>
                    <span className="px-2 text-neutral-600">•</span>
                    {activeFilm.episode_current}
                  </>
                ) : null}
              </p>
              <h3 className="mt-1 sm:mt-2 max-w-3xl text-xl sm:text-4xl lg:text-6xl font-black tracking-tight text-white line-clamp-1 sm:line-clamp-2">
                {activeFilm.name}
              </h3>
              {activeFilm.origin_name && (
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-medium text-neutral-400 line-clamp-1">
                  {activeFilm.origin_name}
                </p>
              )}
              <p className="mt-2 sm:mt-3 max-w-xl text-xs sm:text-sm leading-relaxed text-neutral-300 line-clamp-2 sm:line-clamp-3">
                {activeFilm.content ||
                  "Một câu chuyện khoa học viễn tưởng với thế giới đủ khác lạ để khiến bạn muốn khám phá đến phút cuối."}
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

        <aside className="border-t border-white/10 bg-[#141414] p-3 sm:p-5 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between border-b border-white/10 px-1 pb-2.5">
            <div>
              <p className="text-xs font-semibold text-white">
                Danh sách tuyển chọn
              </p>
              <p className="mt-0.5 text-[10px] sm:text-[11px] text-neutral-500">
                Chọn phim để đổi tiêu điểm
              </p>
            </div>
            <span className="text-xs font-semibold text-neutral-500">
              {spotlightList.length} phim
            </span>
          </div>

          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:block lg:space-y-1 lg:overflow-visible">
            {spotlightList.map((film, index) => {
              const active = index === activeIndex;
              const thumb =
                resolveImageUrl(film.poster_url || film.thumb_url) ||
                "/images/placeholder.jpg";
              return (
                <button
                  type="button"
                  key={`${film.slug}-${index}`}
                  onClick={() => setActiveIndex(index)}
                  className={`group relative flex w-[72px] sm:w-[84px] lg:w-full shrink-0 flex-col lg:flex-row items-center gap-2 rounded-xl border p-1.5 lg:p-2.5 text-left transition-colors cursor-pointer ${active ? "border-white bg-white/[0.1] opacity-100 ring-1 ring-white" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  <div className="relative aspect-[2/3] lg:aspect-[16/10] w-full lg:w-24 shrink-0 overflow-hidden rounded-lg bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb}
                      alt={film.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1 w-full lg:w-auto">
                    <p className="hidden lg:block text-[10px] font-semibold text-neutral-500">
                      {String(index + 1).padStart(2, "0")} /{" "}
                      {film.year || "Mới"} / {sourceName(film._source)}
                    </p>
                    <h4
                      className={`text-[10px] lg:text-xs font-bold line-clamp-1 ${active ? "text-white" : "text-neutral-300"}`}
                    >
                      {film.name}
                    </h4>
                    <p className="hidden lg:block mt-0.5 text-[10px] text-neutral-600 line-clamp-1">
                      {film.origin_name || "Khoa học viễn tưởng"}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className={
                      active
                        ? "text-white hidden lg:block"
                        : "text-neutral-700 opacity-0 group-hover:opacity-100 hidden lg:block"
                    }
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
