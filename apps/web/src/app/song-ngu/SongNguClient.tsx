"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import {
  Languages,
  Sparkles,
  Search,
  BookOpen,
  Sliders,
  RotateCcw,
  Tv,
  Layers,
  X,
  GraduationCap,
  Volume2,
  Film,
  Zap,
} from "lucide-react";
import { vicdnApi, vodphimApi, movieApi } from "@/lib/api";
import { FilmCard, FilmCardSkeleton, type FilmItem } from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export type BilingualSource = "all" | "vicdn" | "vodphim";

interface SourceOption {
  id: BilingualSource;
  label: string;
  badge: string;
  desc: string;
  icon: typeof Languages;
  activeColor: string;
}

const SOURCE_OPTIONS: SourceOption[] = [
  {
    id: "all",
    label: "Tất Cả Nguồn",
    badge: "ViCDN + VodPhim",
    desc: "Tổng hợp toàn bộ phim song ngữ Anh - Việt từ 2 nguồn chất lượng cao",
    icon: Layers,
    activeColor: "from-cyan-500 to-violet-600 border-cyan-400 text-white shadow-cyan-500/25",
  },
  {
    id: "vicdn",
    label: "ViCDN Song Ngữ",
    badge: "Dual-Sub FHD",
    desc: "Phụ đề kép Anh - Việt chất lượng Full HD, tối ưu hóa luyện phát âm",
    icon: Languages,
    activeColor: "from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-cyan-500/25",
  },
  {
    id: "vodphim",
    label: "VodPhim Song Ngữ",
    badge: "Đa Dạng Thể Loại",
    desc: "Kho phim lẻ, phim bộ, hoạt hình tốc độ cao & hỗ trợ thuyết minh song ngữ",
    icon: Tv,
    activeColor: "from-violet-500 to-fuchsia-600 border-violet-400 text-white shadow-violet-500/25",
  },
];

const CATEGORIES_BY_SOURCE: Record<BilingualSource, Array<{ id: string; label: string }>> = {
  all: [
    { id: "all", label: "Tất Cả Thể Loại" },
    { id: "hoat-hinh", label: "Hoạt Hình (Disney / Pixar)" },
    { id: "series", label: "Phim Bộ Song Ngữ" },
    { id: "single", label: "Phim Lẻ Chiếu Rạp" },
    { id: "vien-tuong", label: "Viễn Tưởng & Sci-Fi" },
    { id: "hanh-dong", label: "Hành Động" },
  ],
  vicdn: [
    { id: "all", label: "Mới Cập Nhật" },
    { id: "hoat-hinh", label: "Hoạt Hình Disney / Pixar" },
    { id: "vien-tuong", label: "Khoa Học Viễn Tưởng" },
    { id: "hanh-dong", label: "Bom Tấn Hành Động" },
    { id: "hinh-su", label: "Hình Sự & Tội Phạm" },
    { id: "bi-an", label: "Bí Ẩn & Giật Gân" },
  ],
  vodphim: [
    { id: "all", label: "Mới Cập Nhật" },
    { id: "phim-bo", label: "Phim Bộ Song Ngữ" },
    { id: "phim-le", label: "Phim Lẻ Song Ngữ" },
    { id: "hoat-hinh", label: "Hoạt Hình / Anime" },
    { id: "phim-chieu-rap", label: "Phim Chiếu Rạp" },
    { id: "phim-dang-chieu", label: "Phim Đang Chiếu" },
  ],
};

async function fetchBilingualFilms({
  source,
  category,
  search,
  page,
}: {
  source: BilingualSource;
  category: string;
  search: string;
  page: number;
}): Promise<{ items: FilmItem[]; totalPages: number }> {
  const trimmed = search.trim();

  // 1. Search Query Mode
  if (trimmed) {
    const [vodphimRes, movieRes] = await Promise.allSettled([
      vodphimApi.search(trimmed, page, 24),
      movieApi.search(trimmed, page, 24),
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
            _source: "xink",
            _sourceName: "VodPhim",
            lang: item.lang || "Song Ngữ",
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
          items.push(item);
        }
      }
    }

    return {
      items,
      totalPages: Math.min(items.length > 0 ? 10 : 1, 20),
    };
  }

  // 2. ViCDN Source
  if (source === "vicdn") {
    try {
      const res: any =
        category === "all"
          ? await vicdnApi.getLatest(page)
          : await vicdnApi.getByCategory(category, page);

      const rawItems = Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.data)
          ? res.data
          : [];

      const items: FilmItem[] = rawItems.map((item: any) => ({
        ...item,
        _source: "vicdn",
        _sourceName: "ViCDN",
        lang: "Song Ngữ",
        quality: item.quality || "FHD",
      }));

      const totalPages = Math.min(
        res?.pagination?.pageRanges ||
          Math.ceil((res?.pagination?.totalItems || 100) / (res?.pagination?.totalItemsPerPage || 10)) ||
          10,
        50,
      );

      return {
        items,
        totalPages: Math.max(1, totalPages),
      };
    } catch {
      return { items: [], totalPages: 1 };
    }
  }

  // 3. VodPhim Source
  if (source === "vodphim") {
    try {
      let res: any;
      if (category === "all") {
        res = await vodphimApi.getLatest(page, 24);
      } else if (category === "phim-bo") {
        res = await vodphimApi.getSeries(page, 24);
      } else if (category === "phim-le") {
        res = await vodphimApi.getSingle(page, 24);
      } else if (category === "phim-chieu-rap") {
        res = await vodphimApi.getChieuRap(page, 24);
      } else if (category === "phim-dang-chieu") {
        res = await vodphimApi.getDangChieu(page, 24);
      } else {
        res = await vodphimApi.getByGenre(category, page, 24);
      }

      const rawItems = Array.isArray(res?.data?.items)
        ? res.data.items
        : Array.isArray(res?.items)
          ? res.items
          : [];

      const items: FilmItem[] = rawItems.map((item: any) => ({
        ...item,
        _source: "xink",
        _sourceName: "VodPhim",
        lang: item.lang || "Song Ngữ",
      }));

      const pagination = res?.data?.params?.pagination || res?.pagination;
      const totalPages = Math.min(
        pagination?.totalPages ||
          Math.ceil((pagination?.totalItems || 240) / 24) ||
          15,
        50,
      );

      return {
        items,
        totalPages: Math.max(1, totalPages),
      };
    } catch {
      return { items: [], totalPages: 1 };
    }
  }

  // 4. Combined All (ViCDN + VodPhim)
  try {
    const [vicdnRes, vodphimRes] = await Promise.allSettled([
      category === "hoat-hinh"
        ? vicdnApi.getByCategory("hoat-hinh", page)
        : category === "vien-tuong"
          ? vicdnApi.getByCategory("vien-tuong", page)
          : category === "hanh-dong"
            ? vicdnApi.getByCategory("hanh-dong", page)
            : vicdnApi.getLatest(page),
      category === "hoat-hinh"
        ? vodphimApi.getByGenre("hoat-hinh", page, 24)
        : category === "series"
          ? vodphimApi.getSeries(page, 24)
          : category === "single"
            ? vodphimApi.getSingle(page, 24)
            : vodphimApi.getLatest(page, 24),
    ]);

    let vicdnItems: FilmItem[] = [];
    if (vicdnRes.status === "fulfilled" && vicdnRes.value) {
      const val: any = vicdnRes.value;
      const raw = Array.isArray(val?.items) ? val.items : Array.isArray(val?.data) ? val.data : [];
      vicdnItems = raw.map((item: any) => ({
        ...item,
        _source: "vicdn",
        _sourceName: "ViCDN",
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
        _source: "xink",
        _sourceName: "VodPhim",
        lang: item.lang || "Song Ngữ",
      }));
    }

    // Interleave & Deduplicate
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
    };
  } catch {
    return { items: [], totalPages: 1 };
  }
}

export function SongNguClient({
  initialSource = "all",
  initialPage = 1,
}: {
  initialSource?: BilingualSource;
  initialPage?: number;
}) {
  const queryClient = useQueryClient();
  const [activeSource, setActiveSource] = useState<BilingualSource>(initialSource);
  const [selectedCat, setSelectedCat] = useState("all");
  const [page, setPage] = useState(initialPage);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const categories = useMemo(() => {
    return CATEGORIES_BY_SOURCE[activeSource] || CATEGORIES_BY_SOURCE.all;
  }, [activeSource]);

  const queryKey = useMemo(
    () => ["bilingual-films", activeSource, selectedCat, searchQuery, page],
    [activeSource, selectedCat, searchQuery, page],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchBilingualFilms({
        source: activeSource,
        category: selectedCat,
        search: searchQuery,
        page,
      }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const rawItems = data?.items || [];
  const totalPages = data?.totalPages || 1;

  // Prefetch next page
  const prefetchPage = useCallback(
    (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages) return;
      void queryClient.prefetchQuery({
        queryKey: ["bilingual-films", activeSource, selectedCat, searchQuery, targetPage],
        queryFn: () =>
          fetchBilingualFilms({
            source: activeSource,
            category: selectedCat,
            search: searchQuery,
            page: targetPage,
          }),
        staleTime: 10 * 60 * 1000,
      });
    },
    [queryClient, activeSource, selectedCat, searchQuery, totalPages],
  );

  useEffect(() => {
    if (page < totalPages) {
      const nextPage = page + 1;
      const timer = setTimeout(() => {
        prefetchPage(nextPage);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [page, totalPages, prefetchPage]);

  const handleSourceChange = (newSource: BilingualSource) => {
    if (newSource === activeSource) return;
    setActiveSource(newSource);
    setSelectedCat("all");
    setPage(1);
  };

  const handleCategoryChange = (newCat: string) => {
    if (newCat === selectedCat && !searchQuery) return;
    setSelectedCat(newCat);
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  return (
    <main className={cn("min-h-screen bg-[#0c0d12] text-white pt-20 pb-28", cardFont.className)}>
      {/* ── HERO BANNER SECTION ── */}
      <section className="relative overflow-hidden border-b border-cyan-500/20 bg-gradient-to-b from-cyan-950/40 via-violet-950/20 to-[#0c0d12] py-12 px-4 sm:px-8">
        {/* Background Glowing Ambient Orbs */}
        <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-cyan-500/15 blur-[100px] pointer-events-none" />
        <div className="absolute -top-20 right-1/4 h-80 w-80 rounded-full bg-violet-600/15 blur-[100px] pointer-events-none" />

        <div className="mx-auto max-w-[1400px] relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 text-black shadow-lg shadow-cyan-500/20 uppercase tracking-wider">
              <Sparkles size={13} />
              Dual Subtitles FHD
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-cyan-300">
              Nguồn ViCDN & VodPhim
            </span>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              Học Tiếng Anh Qua Phim
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white max-w-3xl leading-tight">
            Kho Phim Song Ngữ Chuẩn Full HD & Luyện Ngoại Ngữ Tự Nhiên
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
            Xem phim với phụ đề kép Anh - Việt song song từ nguồn <strong>ViCDN</strong> và <strong>VodPhim</strong>. Hỗ trợ hiển thị 2 dòng phụ đề đồng thời, tua lại câu thoại 5s và tra cứu từ vựng trực tiếp trên trình phát.
          </p>

          {/* Quick Feature Badges */}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-200">
              <Languages size={14} className="text-cyan-400" />
              <span>Phụ đề kép Anh - Việt song song</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-200">
              <RotateCcw size={14} className="text-violet-400" />
              <span>Tua lại câu thoại 5s (phím J)</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-200">
              <Sliders size={14} className="text-emerald-400" />
              <span>Tốc độ phát linh hoạt 0.75x - 1.25x</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-200">
              <Zap size={14} className="text-amber-400" />
              <span>Tải nhanh & không quảng cáo phiền nhiễu</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 mt-8">
        {/* ── 1. SOURCE SELECTOR TABS (ViCDN / VodPhim / All) ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                Nguồn Dữ Liệu Song Ngữ
              </span>
              <span className="text-[11px] text-neutral-500">
                (Chọn kho dữ liệu để khám phá)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SOURCE_OPTIONS.map((opt) => {
              const isSelected = activeSource === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSourceChange(opt.id)}
                  className={cn(
                    "relative flex items-start gap-3.5 p-3.5 rounded-2xl border text-left transition-all cursor-pointer select-none",
                    isSelected
                      ? "bg-gradient-to-r from-white/[0.08] to-white/[0.03] border-cyan-400/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50"
                      : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20 text-neutral-400",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-transform",
                      isSelected
                        ? "bg-gradient-to-br from-cyan-500 to-violet-600 text-white shadow-md shadow-cyan-500/30 scale-105"
                        : "bg-white/[0.05] text-neutral-400",
                    )}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-bold truncate", isSelected ? "text-white" : "text-neutral-300")}>
                        {opt.label}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0",
                          isSelected
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                            : "bg-white/[0.04] text-neutral-500 border border-white/[0.06]",
                        )}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-400 line-clamp-1">
                      {opt.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. FILTER TABS & SEARCH BAR ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => {
              const isSelected = selectedCat === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border select-none shrink-0",
                    isSelected
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]"
                      : "bg-white/[0.03] text-neutral-400 border-white/[0.08] hover:bg-white/[0.08] hover:text-white",
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative w-full lg:w-80 shrink-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm phim song ngữ (Anh, Việt)..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-9 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-cyan-400/50 focus:bg-white/[0.08] transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── FILM GRID (Standard 7-Cols Desktop) ── */}
        <div className="mt-8">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-3.5 gap-y-6">
              {Array.from({ length: 14 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : rawItems.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
              <Languages size={40} className="mx-auto text-neutral-600 mb-3" />
              <h3 className="text-base font-bold text-white">Chưa tìm thấy phim song ngữ phù hợp</h3>
              <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
                Hãy thử chọn nguồn phim khác (ViCDN hoặc VodPhim) hoặc xóa từ khóa tìm kiếm để khám phá danh sách đầy đủ.
              </p>
              {(selectedCat !== "all" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCat("all");
                    setSearchInput("");
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-cyan-300 border border-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Xem tất cả phim song ngữ</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-3.5 gap-y-6">
              {rawItems.map((film, idx) => (
                <div key={film.slug || film._id || idx} className="relative group/card">
                  <FilmCard film={film} priority={idx < 7} />
                </div>
              ))}
            </div>
          )}

          {/* ── PAGINATION ── */}
          {totalPages > 1 && !isLoading && (
            <div className="mt-12 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 380, behavior: "smooth" });
                }}
                onPrefetchPage={prefetchPage}
              />
            </div>
          )}
        </div>

        {/* ── LEARNING GUIDE & SHADOWING TIPS ── */}
        <section className="mt-16 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 via-violet-950/20 to-black p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-400 uppercase tracking-wider">
                <GraduationCap size={15} />
                Phương Pháp Học Ngoại Ngữ Qua Phim (Dual-Sub Method)
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Bí quyết cải thiện khả năng nghe nói tiếng Anh cùng FlexPhim
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-neutral-300">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="font-bold text-cyan-300 block mb-1">1. Xem Lần Đầu</span>
                  Bật phụ đề song ngữ Anh - Việt để nắm trọn ngữ cảnh và câu chuyện mà không bị áp lực từ mới.
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="font-bold text-violet-300 block mb-1">2. Tua Lại & Phân Tích</span>
                  Gặp câu giao tiếp hay, nhấn phím <strong>J</strong> để tua lại 5s, nghe kỹ ngữ điệu và nối âm của diễn viên.
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="font-bold text-emerald-300 block mb-1">3. Luyện Nói Nhại (Shadowing)</span>
                  Lặp lại ngay sau câu thoại của nhân vật để luyện phản xạ phát âm tự nhiên và ngữ điệu bản xứ.
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
              <Link
                href="/films/anime"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-400 text-black hover:bg-cyan-300 transition-all cursor-pointer shadow-lg shadow-cyan-400/20 active:scale-95"
              >
                <span>Khám phá Hoạt Hình Disney</span>
              </Link>
              <Link
                href="/films/series"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 transition-all cursor-pointer active:scale-95"
              >
                <span>Khám phá Phim Bộ Âu Mỹ</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
