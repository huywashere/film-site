"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Film } from "lucide-react";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmCardSkeleton,
  type FilmItem,
} from "@/components/film/FilmCard";
import { deduplicateSectionRow } from "@/lib/recommendation-engine";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

// 7 Ngày trong tuần
const DAYS_OF_WEEK = [
  { id: "mon", dayIndex: 1, label: "Thứ Hai" },
  { id: "tue", dayIndex: 2, label: "Thứ Ba" },
  { id: "wed", dayIndex: 3, label: "Thứ Tư" },
  { id: "thu", dayIndex: 4, label: "Thứ Năm" },
  { id: "fri", dayIndex: 5, label: "Thứ Sáu" },
  { id: "sat", dayIndex: 6, label: "Thứ Bảy" },
  { id: "sun", dayIndex: 0, label: "Chủ Nhật" },
];

const CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "series", label: "Phim Bộ" },
  { id: "anime", label: "Anime" },
  { id: "tvshows", label: "TV Shows" },
];

// Phân bổ phim vào các ngày trong tuần một cách nhất quán
function getFilmAssignedDay(film: FilmItem): number {
  const lowerName = (film.name || "").toLowerCase();
  const lowerSlug = (film.slug || "").toLowerCase();

  // Một số phim/anime nổi tiếng gán vào ngày thực tế
  if (lowerSlug.includes("one-piece") || lowerName.includes("đảo hải tặc")) {
    return 0; // Chủ Nhật
  }
  if (lowerSlug.includes("conan") || lowerName.includes("thám tử lừng danh")) {
    return 6; // Thứ Bảy
  }
  if (lowerSlug.includes("sat-thu") || lowerName.includes("cửa hàng sát thủ")) {
    return 3; // Thứ Tư
  }
  if (lowerSlug.includes("solo-leveling") || lowerName.includes("tôi thăng cấp")) {
    return 6; // Thứ Bảy
  }
  if (lowerSlug.includes("jujutsu") || lowerName.includes("chú thuật")) {
    return 4; // Thứ Năm
  }

  const seed = (film.slug || film.name || "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return seed % 7;
}

export default function SchedulePage() {
  // Xác định thứ trong tuần hiện tại (0 = CN, 1 = T2, ..., 6 = T7)
  const currentDayIndex = useMemo(() => {
    return new Date().getDay();
  }, []);

  const currentDayConfig = useMemo(() => {
    return DAYS_OF_WEEK.find((d) => d.dayIndex === currentDayIndex) || DAYS_OF_WEEK[0];
  }, [currentDayIndex]);

  // Tab ngày đang chọn (mặc định là hôm nay)
  const [selectedDayId, setSelectedDayId] = useState<string>(currentDayConfig.id);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const activeDay = useMemo(() => {
    return DAYS_OF_WEEK.find((d) => d.id === selectedDayId) || currentDayConfig;
  }, [selectedDayId, currentDayConfig]);

  // 1. Phim mới cập nhật
  const { data: latestData, isLoading: isLatestLoading } = useQuery({
    queryKey: ["schedule-latest"],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // 2. Phim bộ trang 1 & trang 2
  const { data: seriesDataP1, isLoading: isSeriesLoadingP1 } = useQuery({
    queryKey: ["schedule-series-1"],
    queryFn: () => movieApi.getSeries(1).then((r) => r.data),
    staleTime: 1000 * 60 * 15,
  });

  const { data: seriesDataP2, isLoading: isSeriesLoadingP2 } = useQuery({
    queryKey: ["schedule-series-2"],
    queryFn: () => movieApi.getSeries(2).then((r) => r.data),
    staleTime: 1000 * 60 * 15,
  });

  // 3. Anime & Hoạt hình trang 1 & trang 2
  const { data: animeDataP1, isLoading: isAnimeLoadingP1 } = useQuery({
    queryKey: ["schedule-anime-1"],
    queryFn: () => movieApi.getAnime(1).then((r) => r.data),
    staleTime: 1000 * 60 * 15,
  });

  const { data: animeDataP2, isLoading: isAnimeLoadingP2 } = useQuery({
    queryKey: ["schedule-anime-2"],
    queryFn: () => movieApi.getAnime(2).then((r) => r.data),
    staleTime: 1000 * 60 * 15,
  });

  // 4. TV Shows
  const { data: tvShowsData, isLoading: isTvShowsLoading } = useQuery({
    queryKey: ["schedule-tvshows"],
    queryFn: () => movieApi.getTvShows(1).then((r) => r.data),
    staleTime: 1000 * 60 * 15,
  });

  // Gộp kho phim đang chiếu
  const rawPool = useMemo(() => {
    const rawLatest = latestData?.items || latestData?.data?.items || [];
    const rawSeries1 = seriesDataP1?.items || seriesDataP1?.data?.items || [];
    const rawSeries2 = seriesDataP2?.items || seriesDataP2?.data?.items || [];
    const rawAnime1 = animeDataP1?.items || animeDataP1?.data?.items || [];
    const rawAnime2 = animeDataP2?.items || animeDataP2?.data?.items || [];
    const rawTvShows = tvShowsData?.items || tvShowsData?.data?.items || [];

    const merged = [
      ...rawLatest,
      ...rawSeries1,
      ...rawSeries2,
      ...rawAnime1,
      ...rawAnime2,
      ...rawTvShows,
    ];
    return deduplicateSectionRow(merged);
  }, [
    latestData,
    seriesDataP1,
    seriesDataP2,
    animeDataP1,
    animeDataP2,
    tvShowsData,
  ]);

  // Lọc phim theo ngày và thể loại
  const dailyScheduledFilms = useMemo(() => {
    if (!rawPool.length) return [];

    let filtered = rawPool;

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

    const targetDayIndex = activeDay.dayIndex;
    return filtered.filter((film) => getFilmAssignedDay(film) === targetDayIndex);
  }, [rawPool, selectedCategory, activeDay]);

  const isLoading =
    isLatestLoading ||
    isSeriesLoadingP1 ||
    isSeriesLoadingP2 ||
    isAnimeLoadingP1 ||
    isAnimeLoadingP2 ||
    isTvShowsLoading;

  return (
    <main
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#0a0b10] text-white pb-24 sm:pb-28 pt-16 sm:pt-20 select-none",
      )}
    >
      {/* Nền studio tối giản đồng bộ Trang Chủ */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-white/[0.025] to-transparent blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-3.5 sm:px-8 lg:px-12 space-y-5 sm:space-y-6">
        {/* Tiêu đề trang đơn giản, thanh thoát */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-3 sm:pb-4 border-b border-white/[0.08] gap-1.5 sm:gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              Lịch Chiếu Phim
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
            Lịch phát sóng và cập nhật tập mới các ngày trong tuần
          </p>
        </div>

        {/* Hàng 1: Dải 7 ngày trong tuần */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDayId === day.id;
            const isToday = day.dayIndex === currentDayIndex;

            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDayId(day.id)}
                className={cn(
                  "px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0",
                  isSelected
                    ? "bg-white text-black shadow-sm"
                    : "bg-[#12141c] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]",
                )}
              >
                <span>{day.label}</span>
                {isToday && (
                  <span
                    className={cn(
                      "ml-1.5 text-[10px] font-semibold",
                      isSelected ? "text-neutral-500" : "text-purple-400",
                    )}
                  >
                    (Hôm nay)
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Hàng 2: Bộ lọc thể loại & số lượng phim */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0",
                    isActive
                      ? "bg-white text-black shadow-sm"
                      : "bg-[#12141c] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]",
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-neutral-400 shrink-0 font-medium">
            {dailyScheduledFilms.length} phim
          </div>
        </div>

        {/* Lưới phim chuẩn Desktop 7 cột (Đồng bộ Trang Chủ & Duyệt Phim) */}
        <section className="pt-1">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {Array.from({ length: 14 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : dailyScheduledFilms.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-12 sm:p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
                <Film size={22} />
              </div>
              <h3 className="text-base font-bold text-white">
                Chưa có phim phát sóng cho mục này vào {activeDay.label}
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Hệ thống liên tục cập nhật các tập phim mới. Bạn vui lòng chọn ngày khác hoặc chuyển thể loại.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 cv-grid-auto">
              {dailyScheduledFilms.map((film, idx) => (
                <FilmCard
                  key={`${film.slug || idx}-${idx}`}
                  film={film}
                  priority={idx < 7}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
