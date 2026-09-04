"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Play,
  Star,
  Sparkles,
  Clapperboard,
  Film,
  Tv,
  Mic,
  Flame,
} from "lucide-react";
import { FilmItem } from "@/components/film/FilmCard";
import { TmdbArtwork } from "@/components/film/TmdbArtwork";
import { cardFont } from "@/lib/fonts";
import { useTranslation } from "@/store/langStore";
import { deduplicateSectionRow } from "@/lib/recommendation-engine";
import { cn } from "@/lib/utils";

interface TabbedShowcaseSectionProps {
  title: string;
  films: FilmItem[];
  isLoading?: boolean;
  href?: string;
}

type TabKey = "all" | "series" | "single" | "dubbed" | "animation";

const TAB_CONFIG: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: "all", label: "Tất Cả Mới", icon: Sparkles },
  { key: "series", label: "Phim Bộ", icon: Tv },
  { key: "single", label: "Phim Lẻ", icon: Film },
  { key: "dubbed", label: "Thuyết Minh", icon: Mic },
  { key: "animation", label: "Hoạt Hình", icon: Clapperboard },
];

function filmHref(film: FilmItem, mode: "watch" | "detail") {
  const source = film._source;
  const sourceSlug = source ? film._sourceSlugs?.[source] : undefined;
  const query = new URLSearchParams();
  if (source) query.set("source", source);
  if (sourceSlug && sourceSlug !== film.slug) query.set("sourceSlug", sourceSlug);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return `/${mode === "watch" ? "watch" : "film"}/${film.slug}${suffix}`;
}

export function TabbedShowcaseSection({
  title,
  films,
  isLoading,
  href,
}: TabbedShowcaseSectionProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const cleanList = useMemo(() => deduplicateSectionRow(films), [films]);

  // Filter films based on selected tab
  const filteredFilms = useMemo(() => {
    if (activeTab === "all") return cleanList.slice(0, 12);
    if (activeTab === "series")
      return cleanList.filter((f) => f.type === "series" || f.type === "tv").slice(0, 12);
    if (activeTab === "single")
      return cleanList.filter((f) => f.type === "single" || f.type === "movie").slice(0, 12);
    if (activeTab === "dubbed")
      return cleanList
        .filter(
          (f) =>
            f.lang?.toLowerCase().includes("thuyết minh") ||
            f.lang?.toLowerCase().includes("lồng tiếng")
        )
        .slice(0, 12);
    if (activeTab === "animation")
      return cleanList
        .filter(
          (f) =>
            f.type === "hoat-hinh" ||
            f.category?.some((c) => c.slug === "hoat-hinh" || c.name?.toLowerCase().includes("hoạt hình"))
        )
        .slice(0, 12);
    return cleanList.slice(0, 12);
  }, [cleanList, activeTab]);

  // Fallback if filtered list is too small
  const displayFilms = filteredFilms.length > 0 ? filteredFilms : cleanList.slice(0, 12);
  const spotlightFilm = displayFilms.find((f) => f.slug === hoveredSlug) || displayFilms[0];

  if (isLoading) {
    return (
      <div className="mb-8 sm:mb-12 h-[420px] w-full animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
    );
  }

  if (!spotlightFilm || displayFilms.length === 0) return null;

  return (
    <section
      data-cinematic-section="true"
      className={`${cardFont.className} relative mb-8 sm:mb-12 w-full select-none`}
    >
      {/* ── Section Header & Category Tabs ── */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <h2
            className={`${cardFont.className} bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-300 bg-clip-text text-xl font-extrabold tracking-[-0.025em] text-transparent sm:text-2xl`}
          >
            {title}
          </h2>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer select-none",
                  isActive
                    ? "bg-cyan-500 text-black shadow-[0_2px_12px_rgba(6,182,212,0.4)]"
                    : "bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
                )}
              >
                <Icon size={12} className={isActive ? "text-black" : "text-neutral-400"} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          {href && (
            <Link
              href={href}
              className="group/link ml-2 hidden sm:inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-white/70 transition-colors hover:text-white"
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

      {/* ── Main Showcase Stage ── */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0c0e14]/90 overflow-hidden shadow-2xl p-4 sm:p-6">
        {/* Dynamic Subtle Ambient Backdrop Glow */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-25">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={spotlightFilm.slug}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 h-full w-full"
            >
              <TmdbArtwork
                film={spotlightFilm}
                kind="backdrop"
                className="h-full w-full object-cover blur-2xl scale-110"
                alt=""
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e14] via-[#0c0e14]/80 to-transparent" />
        </div>

        {/* Horizontal Card Rail (6 Cards per view on Desktop) */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {displayFilms.slice(0, 6).map((film, idx) => {
            const isHovered = hoveredSlug === film.slug;
            const rating = Number(film.vote_average || film.rating || 0);

            return (
              <div
                key={film.slug || idx}
                onMouseEnter={() => setHoveredSlug(film.slug)}
                className="group relative flex flex-col space-y-2 cursor-pointer select-none [contain:paint_layout]"
              >
                {/* Poster Box */}
                <div className="relative aspect-[2/3] w-full rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 bg-neutral-900 shadow-lg transition-all duration-300 group-hover:scale-[1.04] group-hover:border-cyan-400/60 group-hover:shadow-[0_10px_25px_rgba(6,182,212,0.25)]">
                  <TmdbArtwork
                    film={film}
                    kind="poster"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    alt={film.name}
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

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

                  {/* Hover Quick Action Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <Link
                      href={filmHref(film, "watch")}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-xl hover:scale-110 active:scale-95 transition-transform"
                      title="Xem phim"
                    >
                      <Play size={16} fill="currentColor" className="ml-0.5" />
                    </Link>
                  </div>

                  {/* Bottom info on hover */}
                  {film.episode_current && film.episode_current !== "Full" && (
                    <div className="absolute bottom-2 left-2 z-10">
                      <span className="rounded bg-black/80 border border-white/20 px-1.5 py-0.5 text-[9px] font-bold text-neutral-300 backdrop-blur-md">
                        {film.episode_current}
                      </span>
                    </div>
                  )}
                </div>

                {/* Title and Metadata below card */}
                <div className="space-y-0.5 px-0.5">
                  <Link
                    href={filmHref(film, "detail")}
                    className="block text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors"
                  >
                    {film.name}
                  </Link>
                  <p className="text-[11px] text-neutral-400 line-clamp-1">
                    {film.origin_name || film.year || "Phim mới"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
