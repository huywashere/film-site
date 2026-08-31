"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
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
  LayoutGrid,
  List,
  ChevronRight,
  TrendingUp,
  Clapperboard,
  CheckCircle2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmCardSkeleton,
  type FilmItem,
} from "@/components/film/FilmCard";
import { deduplicateSectionRow } from "@/lib/recommendation-engine";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

// 7 Days of week configuration with index mapping & contextual subtext
const DAYS_OF_WEEK = [
  { id: "mon", dayIndex: 1, label: "Thứ Hai", short: "T2", subtext: "K-Drama & Phim Bộ Mới" },
  { id: "tue", dayIndex: 2, label: "Thứ Ba", short: "T3", subtext: "Hoa Ngữ & Cổ Trang" },
  { id: "wed", dayIndex: 3, label: "Thứ Tư", short: "T4", subtext: "Tâm Lý & Trinh Thám" },
  { id: "thu", dayIndex: 4, label: "Thứ Năm", short: "T5", subtext: "TV Shows & Gia Đình" },
  { id: "fri", dayIndex: 5, label: "Thứ Sáu", short: "T6", subtext: "Bom Tấn Cuối Tuần" },
  { id: "sat", dayIndex: 6, label: "Thứ Bảy", short: "T7", subtext: "Anime & Đại Tiệc Phim" },
  { id: "sun", dayIndex: 0, label: "Chủ Nhật", short: "CN", subtext: "One Piece & Shonen Jump" },
];

const CATEGORIES = [
  { id: "all", label: "Tất Cả Thể Loại", icon: Clapperboard },
  { id: "series", label: "Phim Bộ (K-Drama / C-Drama)", icon: Film },
  { id: "anime", label: "Anime & Hoạt Hình", icon: Sparkles },
  { id: "tvshows", label: "TV Shows & Truyền Hình", icon: Tv },
];

// Broadcast time slots for realistic schedule presentation
const TIME_SLOTS = ["18:30", "19:45", "20:30", "21:15", "22:00", "23:00"];

// Deterministic schedule meta generator for films
function getFilmScheduleMeta(film: FilmItem, dayIndex: number) {
  const seed = (film.slug || film.name || "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

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

  // Determine current status based on current day and time index
  const isToday = dayIndex === assignedDay;
  const isPastTime = isToday ? timeIndex <= 2 : false;
  const isBroadcastingNow = isToday ? timeIndex === 3 : false;

  const currentEp = film.episode_current || "Tập mới";

  return {
    assignedDay,
    airTime,
    isToday,
    isBroadcastingNow,
    statusText: isToday
      ? isBroadcastingNow
        ? "Đang lên sóng"
        : isPastTime
          ? "Đã lên sóng"
          : "Sắp lên sóng"
      : "Lên sóng định kỳ",
    currentEp,
  };
}

export default function SchedulePage() {
  const router = useRouter();

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

  // Active day object based on selection
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

  // Group films by time slot for the timeline view
  const groupedByTime = useMemo(() => {
    const groups: Record<string, typeof dailyScheduledFilms> = {};
    dailyScheduledFilms.forEach((item) => {
      if (!groups[item.meta.airTime]) {
        groups[item.meta.airTime] = [];
      }
      groups[item.meta.airTime].push(item);
    });
    return groups;
  }, [dailyScheduledFilms]);

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

  const isLoading = isLatestLoading || isSeriesLoading || isAnimeLoading || isTvShowsLoading;

  return (
    <main
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#0c0d12] text-white pb-32 pt-20 sm:pt-24",
      )}
    >
      {/* ── Background Ambient Lighting ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-b from-purple-900/15 via-indigo-900/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-1/2 -left-60 w-[500px] h-[500px] bg-purple-900/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* ── TOP NAV BAR ── */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 hover:text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft size={14} className="text-purple-400" />
            <span>Trang chủ</span>
          </button>

          {/* Live Broadcast Pulse Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Đang phát sóng hôm nay: {dayCounts[currentDayConfig.id] || 16} tập mới</span>
          </div>
        </div>

        {/* ── BROADCAST HEADER SECTION ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-3 border-b border-white/[0.08]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-widest">
              <Radio size={14} className="animate-pulse" />
              <span>Khung Giờ Vàng Phát Sóng</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-purple-200">
              Lịch Phát Sóng
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-xl">
              Cập nhật khung giờ phát sóng chính thức các tập phim mới nhất mỗi ngày từ các đài truyền hình và nền tảng trực tuyến.
            </p>
          </div>

          {/* View Mode Switcher (Grid vs Timeline) */}
          <div className="flex items-center p-1 rounded-2xl bg-[#141622]/90 border border-white/[0.08] backdrop-blur-xl shadow-xl self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none",
                viewMode === "grid"
                  ? "text-white"
                  : "text-neutral-400 hover:text-neutral-200",
              )}
            >
              {viewMode === "grid" && (
                <motion.div
                  layoutId="scheduleViewModePill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-900/40 border border-purple-400/30"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <LayoutGrid size={14} className="relative z-10" />
              <span className="relative z-10">Dạng Lưới</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={cn(
                "relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none",
                viewMode === "timeline"
                  ? "text-white"
                  : "text-neutral-400 hover:text-neutral-200",
              )}
            >
              {viewMode === "timeline" && (
                <motion.div
                  layoutId="scheduleViewModePill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-900/40 border border-purple-400/30"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <List size={14} className="relative z-10" />
              <span className="relative z-10">Dòng Thời Gian</span>
            </button>
          </div>
        </div>

        {/* ── 7-DAY WEEK CALENDAR STRIP (TACTILE CARDS) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
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
                  "group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 text-left cursor-pointer select-none active:scale-98",
                  isSelected
                    ? "bg-gradient-to-b from-purple-600/30 via-[#181a28] to-[#121420] border-purple-400/50 shadow-[0_12px_30px_rgba(147,51,234,0.25)]"
                    : isToday
                      ? "bg-[#141624] hover:bg-[#1a1e30] border-purple-500/30 text-neutral-300"
                      : "bg-[#10121a]/80 hover:bg-[#161824] border-white/[0.06] text-neutral-400 hover:text-white",
                )}
              >
                {/* Active Indicator Glow */}
                {isSelected && (
                  <div className="absolute inset-x-3 -bottom-px h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_10px_#a855f7]" />
                )}

                {/* Top: Day Label & Live Dot */}
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className={cn(
                    "text-xs font-black tracking-tight",
                    isSelected ? "text-white text-sm" : isToday ? "text-purple-300" : "text-neutral-200"
                  )}>
                    {day.label}
                  </span>

                  {isToday && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black tracking-wide">
                      Hôm nay
                    </span>
                  )}
                </div>

                {/* Bottom: Count & Subtext */}
                <div className="mt-3 flex items-end justify-between gap-1 w-full">
                  <span className="text-[10px] text-neutral-400 line-clamp-1 leading-tight group-hover:text-neutral-300">
                    {day.subtext}
                  </span>

                  <span
                    className={cn(
                      "text-xs font-black px-2 py-0.5 rounded-full shrink-0 shadow-sm",
                      isSelected
                        ? "bg-purple-600 text-white border border-purple-400/40"
                        : "bg-white/[0.06] text-neutral-400 group-hover:text-white",
                    )}
                  >
                    {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── CATEGORY FILTER CHIPS ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-95",
                    isSelected
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/40 border border-purple-400/40 font-extrabold"
                      : "bg-[#141622] text-neutral-400 hover:text-white hover:bg-[#1c1f2e] border border-white/[0.06]",
                  )}
                >
                  <IconComponent size={13} className={isSelected ? "text-white" : "text-purple-400"} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <Film size={13} className="text-purple-400" />
            <span>
              Lịch chiếu {activeDay.label}: <strong className="text-white font-extrabold">{dailyScheduledFilms.length}</strong> tập phim
            </span>
          </div>
        </div>

        {/* ── SCHEDULE CONTENT SECTION ── */}
        <section className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : dailyScheduledFilms.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#12141e]/70 backdrop-blur-xl p-16 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
                <Clock size={30} />
              </div>
              <h3 className="text-lg font-extrabold text-white">
                Chưa có lịch phát sóng cho thể loại này vào {activeDay.label}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
                Hệ thống đang liên tục đồng bộ các tập phim mới. Vui lòng chọn ngày khác hoặc chuyển danh mục thể loại để khám phá!
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* ── CINEMA GRID VIEW WITH INTEGRATED BROADCAST BAR ── */
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {dailyScheduledFilms.map(({ film, meta }, idx) => (
                <div
                  key={`${film.slug || idx}-${idx}`}
                  className="group relative flex flex-col rounded-2xl overflow-hidden bg-[#12141e] border border-white/[0.08] hover:border-purple-500/40 hover:shadow-[0_16px_40px_rgba(0,0,0,0.8)] transition-all duration-300 transform-gpu"
                >
                  {/* Integrated Broadcast Glass Header */}
                  <div className="flex items-center justify-between gap-1.5 px-3 py-2 bg-[#171926] border-b border-white/[0.06] text-[11px] font-bold">
                    <div className="flex items-center gap-1.5 text-purple-400">
                      <Clock size={12} className="text-purple-400" />
                      <span>{meta.airTime}</span>
                    </div>

                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                        meta.isBroadcastingNow
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse"
                          : meta.isToday
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                            : "bg-white/[0.05] text-neutral-400 border border-white/[0.06]",
                      )}
                    >
                      {meta.statusText}
                    </span>
                  </div>

                  {/* Standard FilmCard Body */}
                  <div className="relative p-2">
                    <FilmCard film={film} priority={idx < 6} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── CHRONOLOGICAL TIMELINE VIEW ── */
            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-[2px] before:bg-gradient-to-b before:from-purple-500 before:via-indigo-500/40 before:to-transparent">
              {Object.entries(groupedByTime).map(([timeSlot, films]) => (
                <div key={timeSlot} className="relative space-y-3">
                  {/* Timeline Time Node */}
                  <div className="absolute -left-[27px] sm:-left-[35px] top-1.5 flex items-center justify-center w-6 h-6 rounded-full bg-[#12141f] border-2 border-purple-500 text-purple-400 shadow-[0_0_12px_#a855f7]">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                  </div>

                  {/* Time Slot Header */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm sm:text-base font-black text-white bg-purple-500/15 border border-purple-500/30 px-3 py-1 rounded-xl">
                      {timeSlot}
                    </span>
                    <span className="text-xs font-semibold text-neutral-400">
                      ({films.length} tập phát sóng)
                    </span>
                  </div>

                  {/* Films for this time slot */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {films.map(({ film, meta }) => {
                      const poster = film.thumb_url || film.poster_url || "";
                      const formattedPoster = poster.startsWith("http")
                        ? poster
                        : poster
                          ? `https://phimimg.com/${poster}`
                          : "https://image.tmdb.org/t/p/w300/3yEHM2HT2vrUtO93YzTJNgEfiZG.jpg";

                      return (
                        <div
                          key={film.slug}
                          className="group flex items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl bg-[#12141e]/90 hover:bg-[#181b2a] border border-white/[0.08] hover:border-purple-500/40 transition-all duration-300 shadow-md hover:shadow-xl"
                        >
                          {/* Left: Artwork Thumbnail & Metadata */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            <Link
                              href={`/film/${film.slug}`}
                              className="relative w-14 h-20 sm:w-16 sm:h-22 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/10 group-hover:scale-105 transition-transform duration-300 shadow-md"
                            >
                              <img
                                src={formattedPoster}
                                alt={film.name || ""}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </Link>

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                  meta.isBroadcastingNow
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse"
                                    : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                )}>
                                  {meta.currentEp}
                                </span>
                                <span className="text-[11px] text-neutral-400">
                                  {film.quality || "FHD"} • {film.lang || "Vietsub"}
                                </span>
                              </div>

                              <Link
                                href={`/film/${film.slug}`}
                                className="block text-sm sm:text-base font-extrabold text-white group-hover:text-purple-300 transition-colors truncate leading-tight"
                              >
                                {film.name}
                              </Link>

                              {film.origin_name && (
                                <p className="text-[11px] text-neutral-400 truncate">
                                  {film.origin_name} ({film.year || 2024})
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: Quick Action Button */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              href={`/watch/${film.slug}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-900/30 active:scale-95 cursor-pointer"
                            >
                              <Play size={12} className="fill-current" />
                              <span className="hidden sm:inline">Xem Ngay</span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
