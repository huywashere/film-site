"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  Radio,
  Flame,
  ArrowLeft,
  Play,
  Film,
  Sparkles,
  Tv,
  CheckCircle2,
  Calendar,
  LayoutGrid,
  List,
  ChevronRight,
  Plus,
  Check,
  Star,
  Info,
} from "lucide-react";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmCardSkeleton,
  type FilmItem,
} from "@/components/film/FilmCard";
import { deduplicateSectionRow } from "@/lib/recommendation-engine";
import { guestDataStorage } from "@/lib/user-data";
import { useToast } from "@/providers/ToastProvider";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

// 7 Days of week configuration with index mapping
const DAYS_OF_WEEK = [
  { id: "mon", dayIndex: 1, label: "Thứ Hai", short: "T2", subtext: "Khởi động tuần mới" },
  { id: "tue", dayIndex: 2, label: "Thứ Ba", short: "T3", subtext: "Phim bộ & K-Drama" },
  { id: "wed", dayIndex: 3, label: "Thứ Tư", short: "T4", subtext: "Hoạt hình & Cổ trang" },
  { id: "thu", dayIndex: 4, label: "Thứ Năm", short: "T5", subtext: "Tập mới phát sóng" },
  { id: "fri", dayIndex: 5, label: "Thứ Sáu", short: "T6", subtext: "Bom tấn cuối tuần" },
  { id: "sat", dayIndex: 6, label: "Thứ Bảy", short: "T7", subtext: "Anime & Show đỉnh" },
  { id: "sun", dayIndex: 0, label: "Chủ Nhật", short: "CN", subtext: "One Piece & Đại tiệc" },
];

const CATEGORIES = [
  { id: "all", label: "Tất Cả Thể Loại" },
  { id: "series", label: "Phim Bộ (K-Drama / C-Drama)" },
  { id: "anime", label: "Anime & Hoạt Hình" },
  { id: "tvshows", label: "TV Shows & Truyền Hình" },
];

// Fixed time slots for realistic schedule presentation
const TIME_SLOTS = ["18:30", "19:45", "20:30", "21:15", "22:00", "23:00"];

// Stable hash function to distribute films across weekdays deterministically
function getFilmScheduleMeta(film: FilmItem, dayIndex: number) {
  const seed = (film.slug || film.name || "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Assigned day (0 = Sun, 1 = Mon, ..., 6 = Sat)
  // Specific flagship overrides
  const lowerName = (film.name || "").toLowerCase();
  const lowerSlug = (film.slug || "").toLowerCase();
  let assignedDay = seed % 7;

  if (lowerSlug.includes("one-piece") || lowerName.includes("đảo hải tặc")) {
    assignedDay = 0; // Sunday
  } else if (lowerSlug.includes("conan") || lowerName.includes("thám tử lừng danh")) {
    assignedDay = 6; // Saturday
  } else if (lowerSlug.includes("sat-thu") || lowerName.includes("cửa hàng sát thủ")) {
    assignedDay = 3; // Wednesday
  }

  const timeIndex = seed % TIME_SLOTS.length;
  const airTime = TIME_SLOTS[timeIndex];

  // Determine current status based on whether today is the assigned day
  const isToday = dayIndex === assignedDay;
  const isPastTime = isToday ? timeIndex <= 3 : false;

  const currentEp = film.episode_current || "Tập mới";

  return {
    assignedDay,
    airTime,
    isToday,
    statusText: isToday
      ? isPastTime
        ? "Đã lên sóng"
        : "Chiếu hôm nay"
      : "Lên sóng định kỳ",
    isHot: seed % 3 === 0,
    currentEp,
  };
}

export default function SchedulePage() {
  const router = useRouter();
  const { toast } = useToast();

  // Detect current day of week (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const currentDayIndex = useMemo(() => {
    const today = new Date().getDay();
    return today;
  }, []);

  const currentDayConfig = useMemo(() => {
    return DAYS_OF_WEEK.find((d) => d.dayIndex === currentDayIndex) || DAYS_OF_WEEK[0];
  }, [currentDayIndex]);

  // Selected Day state (defaults to today)
  const [selectedDayId, setSelectedDayId] = useState<string>(currentDayConfig.id);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");

  // Active day index based on selected tab
  const activeDay = useMemo(() => {
    return DAYS_OF_WEEK.find((d) => d.id === selectedDayId) || currentDayConfig;
  }, [selectedDayId, currentDayConfig]);

  // 1. Fetch newly updated episodes
  const { data: latestData, isLoading: isLatestLoading } = useQuery({
    queryKey: ["schedule-latest-releases"],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });

  // 2. Fetch ongoing TV Series
  const { data: ongoingSeriesData, isLoading: isSeriesLoading } = useQuery({
    queryKey: ["schedule-ongoing-series"],
    queryFn: () => movieApi.getSeries(1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // 3. Fetch Anime updates
  const { data: animeData, isLoading: isAnimeLoading } = useQuery({
    queryKey: ["schedule-anime"],
    queryFn: () => movieApi.getAnime(1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // 4. Fetch TV Shows
  const { data: tvShowsData, isLoading: isTvShowsLoading } = useQuery({
    queryKey: ["schedule-tvshows"],
    queryFn: () => movieApi.getTvShows(1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // Pool all series and ongoing movies
  const rawPool = useMemo(() => {
    const rawLatest = latestData?.items || latestData?.data?.items || [];
    const rawSeries = ongoingSeriesData?.items || ongoingSeriesData?.data?.items || [];
    const rawAnime = animeData?.items || animeData?.data?.items || [];
    const rawTvShows = tvShowsData?.items || tvShowsData?.data?.items || [];

    const merged = [...rawLatest, ...rawSeries, ...rawAnime, ...rawTvShows];
    return deduplicateSectionRow(merged);
  }, [latestData, ongoingSeriesData, animeData, tvShowsData]);

  // Compute daily schedule partition for the selected weekday
  const dailyScheduledFilms = useMemo(() => {
    if (!rawPool.length) return [];

    let filtered = rawPool;

    // Filter by Category
    if (selectedCategory === "series") {
      filtered = rawPool.filter(
        (f) => f.type === "series" || f.type === "tv" || !f.type?.includes("hoat-hinh"),
      );
    } else if (selectedCategory === "anime") {
      filtered = rawPool.filter(
        (f) =>
          f.type === "hoat-hinh" ||
          f.type === "anime" ||
          (f.name || "").toLowerCase().includes("anime") ||
          (f.category || []).some((c: any) =>
            (c.slug || c.name || "").toLowerCase().includes("hoat-hinh"),
          ),
      );
    } else if (selectedCategory === "tvshows") {
      filtered = rawPool.filter(
        (f) =>
          f.type === "tvshows" ||
          (f.category || []).some((c: any) =>
            (c.slug || c.name || "").toLowerCase().includes("tv-shows"),
          ),
      );
    }

    // Partition by selected weekday
    const targetDayIndex = activeDay.dayIndex;
    const mapped = filtered
      .map((film) => ({
        film,
        meta: getFilmScheduleMeta(film, currentDayIndex),
      }))
      .filter((item) => item.meta.assignedDay === targetDayIndex)
      .sort((a, b) => a.meta.airTime.localeCompare(b.meta.airTime));

    return mapped;
  }, [rawPool, selectedCategory, activeDay, currentDayIndex]);

  // Count films per day for badges
  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DAYS_OF_WEEK.forEach((d) => {
      counts[d.id] = rawPool.filter(
        (film) => getFilmScheduleMeta(film, currentDayIndex).assignedDay === d.dayIndex,
      ).length;
    });
    return counts;
  }, [rawPool, currentDayIndex]);

  const isLoading = isLatestLoading || isSeriesLoading;

  return (
    <main
      className={cn(
        cardFont.className,
        "bg-background min-h-screen text-foreground pb-24 pt-20 sm:pt-24",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Breadcrumb */}
        <nav className="flex items-center justify-between gap-3 text-xs text-neutral-400">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 hover:text-white text-xs font-semibold transition-all"
          >
            <ArrowLeft size={13} />
            <span>Trang chủ</span>
          </Link>
        </nav>

        {/* ── Header Section ── */}
        <div className="space-y-4 pb-2 border-b border-white/[0.08]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Lịch Phát Sóng
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-2xl mt-1">
                Cập nhật khung giờ phát sóng chính thức của các tập phim mới nhất mỗi ngày từ các đài truyền hình và nền tảng trực tuyến.
              </p>
            </div>

            {/* View Mode Toggle (Grid vs Timeline) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] self-start md:self-auto relative">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                  viewMode === "grid"
                    ? "text-white font-extrabold"
                    : "text-neutral-400 hover:text-white",
                )}
              >
                {viewMode === "grid" && (
                  <motion.div
                    layoutId="scheduleViewModePill"
                    className="absolute inset-0 rounded-lg bg-purple-600 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <LayoutGrid size={13} className="relative z-10" />
                <span className="hidden sm:inline relative z-10">Dạng Lưới</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                  viewMode === "timeline"
                    ? "text-white font-extrabold"
                    : "text-neutral-400 hover:text-white",
                )}
              >
                {viewMode === "timeline" && (
                  <motion.div
                    layoutId="scheduleViewModePill"
                    className="absolute inset-0 rounded-lg bg-purple-600 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <List size={13} className="relative z-10" />
                <span className="hidden sm:inline relative z-10">Dòng Thời Gian</span>
              </button>
            </div>
          </div>

          {/* ── Minimalist Day of Week Capsule Bar ── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 no-scrollbar">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDayId === day.id;
              const isToday = day.dayIndex === currentDayIndex;
              const count = dayCounts[day.id] || 0;

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDayId(day.id)}
                  className={cn(
                    "relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer select-none active:scale-95",
                    isSelected
                      ? "bg-purple-600 text-white font-black shadow-lg shadow-purple-900/40 border border-purple-400/40"
                      : isToday
                        ? "bg-purple-950/40 text-purple-300 hover:text-white hover:bg-purple-900/50 border border-purple-500/30"
                        : "bg-[#14171f] text-neutral-400 hover:text-white hover:bg-[#1e222d] border border-white/[0.08]",
                  )}
                >
                  {isToday && (
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isSelected ? "bg-white animate-ping" : "bg-purple-400",
                      )}
                    />
                  )}
                  <span>{day.label}</span>
                  {isToday && <span className="text-[10px] opacity-85 font-medium">(Hôm nay)</span>}
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                        isSelected ? "bg-white/25 text-white" : "bg-white/[0.08] text-neutral-400",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Minimalist Category Filter Tabs ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer",
                    isSelected
                      ? "text-white font-bold"
                      : "text-neutral-400 hover:text-white",
                  )}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="scheduleCategoryPill"
                      className="absolute inset-0 rounded-xl bg-white/15 border border-white/20 shadow-sm -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-neutral-400 flex items-center gap-1.5">
            <Film size={13} className="text-purple-400" />
            <span>
              Lịch chiếu {activeDay.label}: <strong className="text-white">{dailyScheduledFilms.length}</strong> tập phim
            </span>
          </div>
        </div>

        {/* ── Schedule Content ── */}
        <section className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : dailyScheduledFilms.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-12 text-center space-y-3">
              <Clock size={32} className="text-neutral-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Chưa có lịch phát sóng cho thể loại này vào {activeDay.label}</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Hệ thống đang đồng bộ và cập nhật danh sách tập mới. Vui lòng chọn ngày khác hoặc chọn thể loại khác!
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* ── GRID VIEW ── */
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {dailyScheduledFilms.map(({ film, meta }) => (
                <div key={film.slug} className="group relative flex flex-col space-y-2">
                  {/* Air time pill */}
                  <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-neutral-400 px-1">
                    <span className="inline-flex items-center gap-1 text-purple-400 font-extrabold">
                      <Clock size={11} />
                      {meta.airTime}
                    </span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                      meta.isToday
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-white/[0.05] text-neutral-400"
                    )}>
                      {meta.statusText}
                    </span>
                  </div>

                  {/* Film Card */}
                  <div className="relative rounded-2xl overflow-hidden">
                    <FilmCard film={film} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── TIMELINE SCHEDULE VIEW ── */
            <div className="space-y-4">
              {dailyScheduledFilms.map(({ film, meta }) => {
                const poster = film.thumb_url || film.poster_url || "";
                return (
                  <div
                    key={film.slug}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all group"
                  >
                    {/* Left: Time & Poster & Info */}
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Air Time Block */}
                      <div className="w-16 h-16 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col items-center justify-center shrink-0 text-center">
                        <Clock size={14} className="text-purple-400 mb-0.5" />
                        <span className="text-sm font-black text-white">{meta.airTime}</span>
                      </div>

                      {/* Poster Thumbnail */}
                      <Link
                        href={`/film/${film.slug}`}
                        className="relative w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/10 group-hover:scale-105 transition-transform"
                      >
                        {poster && (
                          <img
                            src={poster}
                            alt={film.name || ""}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </Link>

                      {/* Details */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                            meta.isToday
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/[0.06] text-neutral-300"
                          )}>
                            {meta.currentEp}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {film.quality || "HD"} • {film.lang || "Vietsub"}
                          </span>
                        </div>

                        <Link
                          href={`/film/${film.slug}`}
                          className="block text-sm sm:text-base font-extrabold text-white group-hover:text-purple-400 transition-colors truncate"
                        >
                          {film.name}
                        </Link>

                        {film.origin_name && (
                          <p className="text-xs text-neutral-400 truncate">
                            {film.origin_name} ({film.year || 2024})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Action Button */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Link
                        href={`/watch/${film.slug}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Play size={13} className="fill-current" />
                        <span>Xem Ngay</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
