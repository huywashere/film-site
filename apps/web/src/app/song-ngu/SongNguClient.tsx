"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Search,
  RotateCcw,
  Film,
  X,
  ChevronDown,
} from "lucide-react";
import {
  FilmCard,
  FilmCardSkeleton,
  type FilmItem,
  resolveImageUrl,
} from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { vicdnApi, vodphimApi, movieApi } from "@/lib/api";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

// ── Định nghĩa các tùy chọn bộ lọc chuẩn phong cách Duyệt Tìm (/films) ──

const YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i);

const QUICK_FORMATS = [
  { label: "Tất cả", value: "all" },
  { label: "Phim Bộ", value: "series" },
  { label: "Phim Lẻ", value: "single" },
  { label: "Hoạt Hình", value: "hoat-hinh" },
  { label: "Viễn Tưởng", value: "vien-tuong" },
  { label: "Hành Động", value: "hanh-dong" },
  { label: "Chiếu Rạp", value: "chieu-rap" },
];

const BILINGUAL_GENRES = [
  { slug: "", label: "Thể Loại" },
  { slug: "hoat-hinh", label: "Hoạt Hình (Disney / Pixar)" },
  { slug: "vien-tuong", label: "Khoa Học & Viễn Tưởng" },
  { slug: "hanh-dong", label: "Hành Động & Phiêu Lưu" },
  { slug: "hai-huoc", label: "Hài Hước" },
  { slug: "tam-ly", label: "Tâm Lý & Chính Kịch" },
  { slug: "hinh-su", label: "Hình Sự & Tội Phạm" },
  { slug: "bi-an", label: "Bí Ẩn & Giật Gân" },
  { slug: "kinh-di", label: "Kinh Dị" },
  { slug: "tinh-cam", label: "Tình Cảm & Lãng Mạn" },
];

const QUALITIES = [
  { label: "Chất lượng", value: "all" },
  { label: "Full HD (1080p)", value: "fhd" },
  { label: "HD (720p)", value: "hd" },
];

const SORTS = [
  { label: "Mới cập nhật", value: "modified.time" },
  { label: "Năm phát hành", value: "year" },
  { label: "Đánh giá cao nhất", value: "rating" },
];

// ── Hàm tổng hợp dữ liệu phim song ngữ từ hệ thống (Hoàn toàn ẩn thông tin nguồn) ──

async function fetchBilingualFilms({
  format,
  genre,
  search,
  page,
}: {
  format: string;
  genre: string;
  search: string;
  page: number;
}): Promise<{ items: FilmItem[]; totalPages: number; totalItems?: number }> {
  const trimmed = search.trim();

  // 1. Chế độ tìm kiếm từ khóa
  if (trimmed) {
    const [vodphimRes, movieRes] = await Promise.allSettled([
      vodphimApi.search(trimmed, page, 28),
      movieApi.search(trimmed, page, 28),
    ]);

    const items: FilmItem[] = [];
    const seen = new Set<string>();

    if (vodphimRes.status === "fulfilled" && vodphimRes.value) {
      const val: any = vodphimRes.value;
      const raw = Array.isArray(val?.data?.items)
        ? val.data.items
        : Array.isArray(val?.items)
          ? val.items
          : [];
      for (const item of raw) {
        if (item.slug && !seen.has(item.slug)) {
          seen.add(item.slug);
          items.push({
            ...item,
            _sourceName: undefined,
            lang: "Song Ngữ",
            quality: item.quality || "FHD",
          });
        }
      }
    }

    if (movieRes.status === "fulfilled" && movieRes.value) {
      const val: any = movieRes.value;
      const raw = Array.isArray(val?.data?.data?.items)
        ? val.data.data.items
        : Array.isArray(val?.data?.items)
          ? val.data.items
          : Array.isArray(val?.items)
            ? val.items
            : [];
      for (const item of raw) {
        if (item.slug && !seen.has(item.slug)) {
          seen.add(item.slug);
          items.push({
            ...item,
            _sourceName: undefined,
            lang: "Song Ngữ",
            quality: item.quality || "FHD",
          });
        }
      }
    }

    return {
      items,
      totalPages: Math.min(items.length > 0 ? 10 : 1, 25),
      totalItems: items.length,
    };
  }

  // 2. Chế độ duyệt danh mục & định dạng tổng hợp
  try {
    const targetCat = genre || (format !== "all" && format !== "series" && format !== "single" ? format : "");

    const [vicdnRes, vodphimRes] = await Promise.allSettled([
      targetCat
        ? vicdnApi.getByCategory(targetCat, page)
        : vicdnApi.getLatest(page),
      format === "series"
        ? vodphimApi.getSeries(page, 24)
        : format === "single"
          ? vodphimApi.getSingle(page, 24)
          : targetCat
            ? vodphimApi.getByGenre(targetCat, page, 24)
            : vodphimApi.getLatest(page, 24),
    ]);

    let vicdnItems: FilmItem[] = [];
    if (vicdnRes.status === "fulfilled" && vicdnRes.value) {
      const val: any = vicdnRes.value;
      const raw = Array.isArray(val?.items)
        ? val.items
        : Array.isArray(val?.data)
          ? val.data
          : [];
      vicdnItems = raw.map((item: any) => ({
        ...item,
        _sourceName: undefined,
        lang: "Song Ngữ",
        quality: item.quality || "FHD",
      }));
    }

    let vodphimItems: FilmItem[] = [];
    if (vodphimRes.status === "fulfilled" && vodphimRes.value) {
      const val: any = vodphimRes.value;
      const raw = Array.isArray(val?.data?.items)
        ? val.data.items
        : Array.isArray(val?.items)
          ? val.items
          : [];
      vodphimItems = raw.map((item: any) => ({
        ...item,
        _sourceName: undefined,
        lang: "Song Ngữ",
        quality: item.quality || "FHD",
      }));
    }

    // Đan xen mượt mà và loại bỏ trùng lặp slug
    const merged: FilmItem[] = [];
    const seen = new Set<string>();
    const maxLen = Math.max(vicdnItems.length, vodphimItems.length);

    for (let i = 0; i < maxLen; i++) {
      if (i < vicdnItems.length) {
        const it = vicdnItems[i];
        if (it.slug && !seen.has(it.slug)) {
          seen.add(it.slug);
          merged.push(it);
        }
      }
      if (i < vodphimItems.length) {
        const it = vodphimItems[i];
        if (it.slug && !seen.has(it.slug)) {
          seen.add(it.slug);
          merged.push(it);
        }
      }
    }

    return {
      items: merged,
      totalPages: 25,
      totalItems: merged.length * 25,
    };
  } catch {
    return { items: [], totalPages: 1 };
  }
}

// ── Component Chính: Giao diện Chuẩn Dark Cinema Đồng Bộ Trang Home & Duyệt Tìm ──

export function SongNguClient({
  initialPage = 1,
}: {
  initialSource?: any;
  initialPage?: number;
}) {
  const [format, setFormat] = useState("all");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedQuality, setSelectedQuality] = useState("all");
  const [selectedSort, setSelectedSort] = useState("modified.time");
  const [page, setPage] = useState(initialPage);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryKey = useMemo(
    () => ["bilingual-films-catalog", format, selectedGenre, searchQuery, page],
    [format, selectedGenre, searchQuery, page],
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      fetchBilingualFilms({
        format,
        genre: selectedGenre,
        search: searchQuery,
        page,
      }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const rawItems = data?.items || [];
  const totalPages = data?.totalPages || 1;

  // Lọc và sắp xếp phía Client
  const films: FilmItem[] = useMemo(() => {
    let list: FilmItem[] = rawItems.map((item): FilmItem => {
      const anyItem = item as any;
      const pUrl = String(item.poster_url || item.thumb_url || "");
      const tUrl = String(item.thumb_url || item.poster_url || "");
      const rawTmdbId = item.tmdbId || anyItem.tmdb_id || anyItem.tmdb?.id;
      const tmdbId = rawTmdbId && Number.isFinite(Number(rawTmdbId)) ? Number(rawTmdbId) : undefined;
      const filmType = item.type || (anyItem.type === "tv" ? "series" : "single");
      return {
        _id: String(item._id || anyItem.id || item.slug || ""),
        name: String(item.name || anyItem.title || ""),
        origin_name: String(item.origin_name || anyItem.original_title || ""),
        slug: String(item.slug || ""),
        poster_url: resolveImageUrl(pUrl, tUrl) || pUrl,
        thumb_url: resolveImageUrl(tUrl, pUrl) || tUrl,
        year: Number(item.year) || 2026,
        type: filmType,
        tmdbId,
        tmdb: item.tmdb || (tmdbId ? { id: tmdbId, type: filmType === "series" ? "tv" : "movie" } : undefined),
        episode_current: String(item.episode_current || "FHD"),
        quality: String(item.quality || "FHD"),
        lang: "Song Ngữ",
        category: Array.isArray(item.category) ? item.category : [],
        country: Array.isArray(item.country) ? item.country : [],
        vote_average: Number(item.vote_average || anyItem.rating) || 8.5,
      };
    });

    if (selectedYear) {
      list = list.filter((f) => String(f.year) === String(selectedYear));
    }

    if (selectedQuality !== "all") {
      if (selectedQuality === "fhd") {
        list = list.filter(
          (f) =>
            (f.quality || "").toLowerCase().includes("1080") ||
            (f.quality || "").toLowerCase().includes("fhd"),
        );
      } else if (selectedQuality === "hd") {
        list = list.filter(
          (f) =>
            (f.quality || "").toLowerCase().includes("720") ||
            (f.quality || "").toLowerCase().includes("hd"),
        );
      }
    }

    if (selectedSort === "rating") {
      list = [...list].sort(
        (a, b) => (b.vote_average || 0) - (a.vote_average || 0),
      );
    } else if (selectedSort === "year") {
      list = [...list].sort((a, b) => (b.year || 0) - (a.year || 0));
    }

    return list;
  }, [rawItems, selectedYear, selectedQuality, selectedSort]);

  const isFiltered =
    format !== "all" ||
    Boolean(selectedGenre) ||
    Boolean(selectedYear) ||
    selectedQuality !== "all" ||
    selectedSort !== "modified.time" ||
    Boolean(searchQuery);

  const handleResetAll = useCallback(() => {
    setFormat("all");
    setSelectedGenre("");
    setSelectedYear("");
    setSelectedQuality("all");
    setSelectedSort("modified.time");
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  }, []);

  return (
    <main
      data-eager-hydration="true"
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#0a0b10] text-white pb-24 sm:pb-28 pt-16 sm:pt-20 select-none",
      )}
    >
      {/* ── Ambient Studio Lighting (Đồng bộ chuẩn 100% với Trang Chủ và Duyệt Tìm) ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-white/[0.025] to-transparent blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-3.5 sm:px-6 md:pl-20 md:pr-6 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-12 space-y-5 sm:space-y-6">
        {/* ── Header Tiêu Đề Tối Giản & Sang Trọng ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-3 sm:pb-4 border-b border-white/[0.08] gap-1.5 sm:gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              Phim Song Ngữ
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
            Kho phim điện ảnh và phim bộ với phụ đề kép Anh - Việt chọn lọc
          </p>
        </div>

        {/* ── Hàng 1: Quick Format Pills & Ô Tìm Kiếm Nhanh ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Format Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
            {QUICK_FORMATS.map((item) => {
              const isActive = format === item.value;
              const pillStyle = isActive
                ? "bg-white text-black shadow-sm font-black border-white"
                : "bg-[#12141c] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]";

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setFormat(item.value);
                    setPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0",
                    pillStyle,
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Ô tìm kiếm nhanh nhỏ gọn */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm phim song ngữ..."
              className="w-full bg-[#12141c] border border-white/10 hover:border-white/20 focus:border-cyan-400/60 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-white rounded-full transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Hàng 2: Bộ Lọc Tinh Gọn Dạng Select Pills ── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Thể Loại */}
            <div className="relative">
              <select
                value={selectedGenre}
                onChange={(e) => {
                  setSelectedGenre(e.target.value);
                  setPage(1);
                }}
                className={cn(
                  "appearance-none bg-[#12141c] border rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-400/60 cursor-pointer transition-colors",
                  selectedGenre
                    ? "border-cyan-400/60 text-cyan-300"
                    : "border-white/10 text-neutral-300 hover:border-white/20",
                )}
              >
                {BILINGUAL_GENRES.map((g) => (
                  <option
                    key={g.slug}
                    value={g.slug}
                    className="bg-[#12141c] text-white"
                  >
                    {g.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
            </div>

            {/* 2. Năm Phát Hành */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setPage(1);
                }}
                className={cn(
                  "appearance-none bg-[#12141c] border rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-400/60 cursor-pointer transition-colors",
                  selectedYear
                    ? "border-cyan-400/60 text-cyan-300"
                    : "border-white/10 text-neutral-300 hover:border-white/20",
                )}
              >
                <option value="">Năm</option>
                {YEARS.map((y) => (
                  <option
                    key={y}
                    value={y}
                    className="bg-[#12141c] text-white"
                  >
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
            </div>

            {/* 3. Chất Lượng */}
            <div className="relative">
              <select
                value={selectedQuality}
                onChange={(e) => {
                  setSelectedQuality(e.target.value);
                  setPage(1);
                }}
                className={cn(
                  "appearance-none bg-[#12141c] border rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-400/60 cursor-pointer transition-colors",
                  selectedQuality !== "all"
                    ? "border-cyan-400/60 text-cyan-300"
                    : "border-white/10 text-neutral-300 hover:border-white/20",
                )}
              >
                {QUALITIES.map((q) => (
                  <option
                    key={q.value}
                    value={q.value}
                    className="bg-[#12141c] text-white"
                  >
                    {q.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
            </div>

            {/* 4. Sắp Xếp */}
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => {
                  setSelectedSort(e.target.value);
                  setPage(1);
                }}
                className="appearance-none bg-[#12141c] border border-white/10 hover:border-white/20 rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold text-neutral-300 focus:outline-none focus:border-cyan-400/60 cursor-pointer transition-colors"
              >
                {SORTS.map((s) => (
                  <option
                    key={s.value}
                    value={s.value}
                    className="bg-[#12141c] text-white"
                  >
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
            </div>

            {/* Nút Xóa Bộ Lọc Nhanh */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-400/90 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          {/* Số lượng phim */}
          <span className="text-[11px] sm:text-xs text-neutral-400 font-medium self-center">
            {films.length} phim
          </span>
        </div>

        {/* ── Lưới Thẻ Phim Chuẩn 7 Cột Phong Cách Trang Chủ (2xl:grid-cols-7) ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3.5 lg:gap-4 pt-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <FilmCardSkeleton key={i} />
            ))}
          </div>
        ) : films.length === 0 ? (
          <div className="text-center py-20 bg-[#12141c]/50 border border-white/[0.08] rounded-2xl p-8 max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-neutral-500">
              <Film size={24} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Không tìm thấy bộ phim song ngữ phù hợp
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Hãy thử nới lỏng các tiêu chí lọc hoặc tìm bằng từ khóa khác.
            </p>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetAll}
                className="px-4 py-2 bg-white text-black font-extrabold text-xs rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Bỏ chọn bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3.5 lg:gap-4 pt-2 cv-grid-auto">
            {films.map((film, idx) => (
              <FilmCard
                key={`${film.slug || film._id || idx}-${idx}`}
                film={film}
                priority={idx < 7}
              />
            ))}
          </div>
        )}

        {/* ── Phân Trang ── */}
        {totalPages > 1 && (
          <div className="pt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => {
                setPage(newPage);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
