"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { TmdbArtwork } from "@/components/film/TmdbArtwork";
import type { FilmItem } from "@/components/film/FilmCard";
import {
  Play,
  Clock,
  Calendar,
  Sparkles,
  ChevronRight,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Film,
  Star,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TimelineFilmItem,
  getUniverseTimeline,
  MARVEL_TIMELINE_PHASES,
  DC_TIMELINE_PHASES,
} from "@/lib/universe-timeline-data";

interface UniverseTimelineSectionProps {
  universe: "marvel" | "dc";
}

export function UniverseTimelineSection({ universe }: UniverseTimelineSectionProps) {
  const isMarvel = universe === "marvel";

  // Mode: "chronological" (thứ tự sự kiện cốt truyện) | "release" (thứ tự ra rạp)
  const [mode, setMode] = useState<"chronological" | "release">("chronological");
  const [selectedPhase, setSelectedPhase] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const phases = isMarvel ? MARVEL_TIMELINE_PHASES : DC_TIMELINE_PHASES;

  // Filtered and sorted films
  const timelineFilms = useMemo(() => {
    return getUniverseTimeline(universe, {
      mode,
      phase: selectedPhase,
      search: searchQuery,
    });
  }, [universe, mode, selectedPhase, searchQuery]);

  return (
    <section id="universe-timeline" className="relative pt-10 sm:pt-14 pb-12 sm:pb-16 select-none scroll-mt-20">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div
          className={cn(
            "absolute -top-32 left-1/4 w-[600px] h-[350px] blur-[150px] rounded-full transition-colors duration-700",
            isMarvel ? "bg-red-600/[0.06]" : "bg-sky-600/[0.06]"
          )}
        />
      </div>

      <div className="relative z-10 max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-14 space-y-6 sm:space-y-8">
        {/* ── 1. SECTION HEADER ────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 sm:gap-6 border-b border-white/[0.08] pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-semibold text-neutral-300">
              <Clock
                size={13}
                className={cn(isMarvel ? "text-red-400" : "text-sky-400")}
              />
              <span>Niên Đại Vũ Trụ Điện Ảnh</span>
              <span className="text-white/30">•</span>
              <span className={cn("font-bold", isMarvel ? "text-red-400" : "text-sky-400")}>
                {timelineFilms.length} tác phẩm
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{isMarvel ? "Dòng Thời Gian Marvel MCU" : "Dòng Thời Gian DC Universe"}</span>
            </h2>

            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
              {mode === "chronological"
                ? `Khám phá vũ trụ ${
                    isMarvel ? "Marvel" : "DC"
                  } theo đúng trật tự dòng thời gian diễn ra sự kiện cốt truyện — từ quá khứ lịch sử đến kỷ nguyên hiện đại.`
                : `Thưởng thức các siêu phẩm theo đúng thứ tự công chiếu ngoài rạp, cảm nhận trọn vẹn sự phát triển kỹ xảo và quy mô điện ảnh.`}
            </p>
          </div>

          {/* Mode Switcher: Chronological vs Release Order */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#11131a] border border-white/10 shadow-lg self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setMode("chronological")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer",
                mode === "chronological"
                  ? isMarvel
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.06]"
              )}
            >
              <Clock size={14} />
              <span>Theo Cốt Truyện</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("release")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer",
                mode === "release"
                  ? isMarvel
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.06]"
              )}
            >
              <Film size={14} />
              <span>Theo Năm Ra Rạp</span>
            </button>
          </div>
        </div>

        {/* ── 2. FILTER TOOLBAR (PHASE PILLS & SEARCH) ─────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Phase Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {phases.map((phase) => {
              const isActive = selectedPhase === phase.id;
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setSelectedPhase(phase.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 select-none",
                    isActive
                      ? isMarvel
                        ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                      : "bg-[#12141d] text-neutral-400 hover:text-white hover:bg-[#1a1d29] border border-white/10"
                  )}
                >
                  {phase.label}
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64 md:w-72 shrink-0">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm phim trong timeline..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#12141d] border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── 3. TIMELINE ROADMAP TRACK ─────────────────────────────────── */}
        {timelineFilms.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 space-y-2 bg-[#0d0f17] rounded-2xl border border-white/10">
            <Clock size={32} className="mx-auto text-neutral-600" />
            <p className="text-sm font-semibold text-neutral-300">Không tìm thấy phim phù hợp với từ khóa</p>
            <button
              type="button"
              onClick={() => {
                setSelectedPhase("all");
                setSearchQuery("");
              }}
              className="text-xs text-sky-400 hover:underline cursor-pointer font-medium"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-10 md:pl-12 space-y-4 sm:space-y-6">
            {/* Glowing Vertical Timeline Track Connector */}
            <div
              className={cn(
                "absolute top-6 bottom-6 left-2.5 sm:left-4 md:left-5 w-[2px] rounded-full",
                isMarvel
                  ? "bg-gradient-to-b from-red-600 via-red-500/70 to-red-900/30 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                  : "bg-gradient-to-b from-sky-500 via-sky-400/70 to-sky-900/30 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
              )}
            />

            {timelineFilms.map((film, index) => {
              const orderNum = mode === "chronological" ? film.chronoOrder : film.releaseOrder;
              const formattedOrder = String(orderNum).padStart(2, "0");

              return (
                <div key={film.id} className="relative group">
                  {/* Milestone Node on the Track */}
                  <div
                    className={cn(
                      "absolute -left-6 sm:-left-10 md:-left-12 top-4 -translate-x-1/2 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0d0f17] border-2 transition-transform duration-300 group-hover:scale-110 shadow-lg z-10",
                      isMarvel
                        ? "border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                        : "border-sky-400 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.4)]"
                    )}
                  >
                    <span className="text-[10px] sm:text-xs font-black tracking-tighter">
                      {formattedOrder}
                    </span>
                  </div>

                  {/* Timeline Film Card */}
                  <div className="relative overflow-hidden rounded-2xl bg-[#11141d] border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)] group-hover:translate-x-1">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-5 p-3.5 sm:p-4 lg:p-5">
                      {/* Left: Thumbnail with Play Hover Overlay */}
                      <Link
                        href={`/watch/${film.slug}`}
                        className="relative w-full md:w-48 lg:w-56 aspect-[16/9] md:aspect-[16/10] rounded-xl overflow-hidden shrink-0 border border-white/10 group/thumb block bg-neutral-950"
                      >
                        <TmdbArtwork
                          film={film as unknown as FilmItem}
                          kind="backdrop"
                          alt={film.name}
                          allowTitleLookup={true}
                          className="absolute inset-0 h-full w-full"
                          imageClassName="object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover/thumb:opacity-40 transition-opacity pointer-events-none" />

                        {/* Center Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md shadow-xl transition-all duration-300 transform group-hover/thumb:scale-110",
                              isMarvel
                                ? "bg-red-600/90 text-white shadow-red-600/40"
                                : "bg-sky-600/90 text-white shadow-sky-600/40"
                            )}
                          >
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          </div>
                        </div>

                        {/* Top Badge: Quality & Year */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none z-10">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/75 text-amber-300 border border-amber-400/30">
                            {film.quality}
                          </span>
                        </div>
                      </Link>

                      {/* Middle: Movie Info & Context */}
                      <div className="flex-1 min-w-0 space-y-2 sm:space-y-2.5">
                        {/* Timeline Era & Phase Pills */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {/* Timeline Era Badge */}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-[11px] sm:text-xs",
                              isMarvel
                                ? "bg-red-500/15 border border-red-500/30 text-red-300"
                                : "bg-sky-500/15 border border-sky-500/30 text-sky-300"
                            )}
                          >
                            <Clock size={12} />
                            <span>
                              {mode === "chronological"
                                ? `Thời điểm: ${film.timelineYear}`
                                : `Năm công chiếu: ${film.releaseYear}`}
                            </span>
                          </span>

                          {/* Phase Badge */}
                          <span className="px-2.5 py-0.5 rounded-md bg-[#181b24] border border-white/10 text-neutral-300 font-semibold text-[11px]">
                            {film.phaseLabel}
                          </span>

                          {/* TMDB Rating */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px]">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            <span>{film.vote_average.toFixed(1)}</span>
                          </span>
                        </div>

                        {/* Movie Titles */}
                        <div>
                          <Link
                            href={`/watch/${film.slug}`}
                            className="text-base sm:text-lg lg:text-xl font-bold text-white hover:text-neutral-200 transition-colors line-clamp-1 group-hover:underline"
                          >
                            {film.name}
                          </Link>
                          <p className="text-xs sm:text-sm text-neutral-400 font-medium">
                            {film.origin_name} • {film.releaseYear}
                          </p>
                        </div>

                        {/* Universe Timeline Context Callout */}
                        <div className="p-2.5 sm:p-3 rounded-xl bg-[#0c0e15] border border-white/[0.08] text-xs text-neutral-300/95 leading-relaxed">
                          <span className={cn("font-bold mr-1.5", isMarvel ? "text-red-400" : "text-sky-400")}>
                            ✦ Ngữ cảnh cốt truyện:
                          </span>
                          <span>{film.contextNote}</span>
                        </div>
                      </div>

                      {/* Right: Quick Action Buttons */}
                      <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.06]">
                        <Link
                          href={`/watch/${film.slug}`}
                          className={cn(
                            "flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-md active:scale-95 cursor-pointer",
                            isMarvel
                              ? "bg-red-600 hover:bg-red-700 shadow-red-600/30"
                              : "bg-sky-600 hover:bg-sky-700 shadow-sky-600/30"
                          )}
                        >
                          <Play size={14} fill="currentColor" />
                          <span>Xem Phim</span>
                        </Link>

                        <Link
                          href={`/film/${film.slug}`}
                          className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-[#181b24] hover:bg-[#232836] border border-white/10 transition-colors active:scale-95 cursor-pointer"
                        >
                          <Info size={13} />
                          <span>Chi Tiết</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
