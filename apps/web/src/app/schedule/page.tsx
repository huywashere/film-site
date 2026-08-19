"use client";

import { useState, useMemo } from "react";
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
  CheckCircle2,
  Calendar,
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

const DAYS_OF_WEEK = [
  { id: "today", label: "Hôm Nay", short: "Hôm nay" },
  { id: "mon", label: "Thứ Hai", short: "T2" },
  { id: "tue", label: "Thứ Ba", short: "T3" },
  { id: "wed", label: "Thứ Tư", short: "T4" },
  { id: "thu", label: "Thứ Năm", short: "T5" },
  { id: "fri", label: "Thứ Sáu", short: "T6" },
  { id: "sat", label: "Thứ Bảy", short: "T7" },
  { id: "sun", label: "Chủ Nhật", short: "CN" },
];

const CATEGORIES = [
  { id: "all", label: "Tất Cả Phim" },
  { id: "series", label: "Phim Bộ Đang Chiếu" },
  { id: "anime", label: "Anime & Hoạt Hình" },
  { id: "tvshows", label: "TV Shows" },
];

export default function SchedulePage() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState("today");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // 1. Fetch newly updated episodes (Today's release schedule)
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

  const allReleases: FilmItem[] = useMemo(() => {
    const rawLatest = latestData?.items || latestData?.data?.items || [];
    const rawSeries = ongoingSeriesData?.items || ongoingSeriesData?.data?.items || [];
    const rawAnime = animeData?.items || animeData?.data?.items || [];
    const rawTvShows = tvShowsData?.items || tvShowsData?.data?.items || [];

    if (selectedCategory === "series") return deduplicateSectionRow(rawSeries);
    if (selectedCategory === "anime") return deduplicateSectionRow(rawAnime);
    if (selectedCategory === "tvshows") return deduplicateSectionRow(rawTvShows);

    return deduplicateSectionRow([...rawLatest, ...rawSeries, ...rawAnime, ...rawTvShows]);
  }, [latestData, ongoingSeriesData, animeData, tvShowsData, selectedCategory]);

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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/90 hover:text-white text-xs font-semibold transition-all shadow-sm"
          >
            <ArrowLeft size={13} />
            <span>Trang chủ</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-300 text-xs font-bold shadow-sm">
            <Radio size={13} className="text-pink-400 animate-pulse" />
            <span>Cập nhật liên tục 24/7</span>
          </span>
        </nav>

        {/* ── Header Banner ── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#161c28] via-[#0e1118] to-[#0a0c10] p-6 sm:p-8 md:p-10 shadow-2xl">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-[100px]" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-600/15 blur-[100px]" />

          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-bold text-violet-300 shadow-sm">
              <CalendarDays size={13} className="text-violet-400" />
              <span>Lịch Phát Sóng & Cập Nhật Tập Mới</span>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              Lịch Chiếu Phim
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-2xl">
              Theo dõi lịch phát sóng các tập phim mới nhất trong tuần của phim bộ, anime và các chương trình truyền hình thực tế hot nhất.
            </p>
          </div>

          {/* ── Days of Week Bar ── */}
          <div className="relative z-10 mt-8 flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-6">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDay === day.id;
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDay(day.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer shadow-sm active:scale-95",
                    isSelected
                      ? "bg-white text-black shadow-[0_0_16px_rgba(255,255,255,0.3)]"
                      : "bg-white/[0.05] hover:bg-white/[0.12] text-neutral-300 border border-white/[0.08]",
                  )}
                >
                  <Calendar size={13} className={isSelected ? "text-black" : "text-neutral-400"} />
                  <span>{day.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Category Filter Tabs ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    isSelected
                      ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                      : "bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]",
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-neutral-400 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" />
            <span>Hiển thị <strong>{allReleases.length}</strong> phim cập nhật</span>
          </div>
        </div>

        {/* ── Movie Schedule Grid ── */}
        <section className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : allReleases.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#0e1017]/60 p-12 text-center space-y-3">
              <Clock size={32} className="text-neutral-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Chưa có tập phim mới vào khung giờ này</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Hệ thống đang đồng bộ và cập nhật tập phim mới nhất từ các nhà đài. Vui lòng quay lại sau!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {allReleases.map((film) => (
                <div key={film.slug} className="relative">
                  <FilmCard film={film} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
