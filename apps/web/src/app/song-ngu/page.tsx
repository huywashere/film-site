"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Languages,
  Sparkles,
  Search,
  BookOpen,
  Volume2,
  Sliders,
  CheckCircle2,
  Flame,
  Film,
  RotateCcw,
} from "lucide-react";
import { movieApi } from "@/lib/api";
import { FilmCard, FilmCardSkeleton, type FilmItem } from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const BILINGUAL_CATEGORIES = [
  { id: "all", label: "Tất Cả Phim Song Ngữ", query: "song ngu" },
  { id: "animation", label: "🎬 Hoạt Hình Disney / Pixar (Dễ Nghe A1-B1)", query: "hoat hinh" },
  { id: "sitcom", label: "🍿 Sitcom & Giao Tiếp Đời Thường (B1-B2)", query: "tam ly" },
  { id: "hollywood", label: "💥 Bom Tấn US-UK / Hollywood", query: "hanh dong" },
];

export default function BilingualFilmsPage() {
  const queryClient = useQueryClient();
  const [selectedCat, setSelectedCat] = useState("all");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const activeCategory = useMemo(
    () => BILINGUAL_CATEGORIES.find((c) => c.id === selectedCat) || BILINGUAL_CATEGORIES[0],
    [selectedCat],
  );

  const queryTerm = searchQuery.trim() || activeCategory.query;

  const { data, isLoading } = useQuery({
    queryKey: ["bilingual-films", queryTerm, page],
    queryFn: async () => {
      try {
        const res = await movieApi.search(queryTerm, page, 24);
        return (res as any)?.data?.data || (res as any)?.data || { items: [] };
      } catch {
        return { items: [] };
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const rawItems: FilmItem[] = (data as any)?.items || [];
  const paginationData = (data as any)?.params?.pagination;
  const totalPages = Math.min(
    paginationData?.totalPages ||
    (data as any)?.totalPages ||
    Math.ceil(((data as any)?.total || (data as any)?.totalItems || 24) / 24) ||
    1,
    20,
  );

  const prefetchPage = useCallback(
    (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages) return;
      void queryClient.prefetchQuery({
        queryKey: ["bilingual-films", queryTerm, targetPage],
        queryFn: async () => {
          try {
            const res = await movieApi.search(queryTerm, targetPage, 24);
            return (res as any)?.data?.data || (res as any)?.data || { items: [] };
          } catch {
            return { items: [] };
          }
        },
        staleTime: 30 * 60 * 1000,
      });
    },
    [queryClient, queryTerm, totalPages],
  );

  // Auto-prefetch next page on idle
  useEffect(() => {
    if (page < totalPages) {
      const nextPage = page + 1;
      const timer = setTimeout(() => {
        prefetchPage(nextPage);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [page, totalPages, prefetchPage]);

  return (
    <main className={cn("min-h-screen bg-[#101012] text-white pt-20 pb-28", cardFont.className)}>
      {/* ── HERO BANNER SECTION ── */}
      <div className="relative overflow-hidden border-b border-cyan-500/20 bg-gradient-to-b from-cyan-950/40 via-violet-950/20 to-[#101012] py-12 px-4 sm:px-8">
        {/* Background Glowing Ambient Orbs */}
        <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-cyan-500/15 blur-[100px] pointer-events-none" />
        <div className="absolute -top-20 right-1/4 h-80 w-80 rounded-full bg-violet-600/15 blur-[100px] pointer-events-none" />

        <div className="mx-auto max-w-[1300px] relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-cyan-400 to-violet-500 text-black shadow-lg shadow-cyan-500/20 uppercase tracking-wider">
              <Sparkles size={13} />
              Dual Subtitles 4K
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-cyan-300">
              Phụ Đề Song Ngữ Anh - Việt
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white max-w-3xl leading-tight">
            Xem Phim Song Ngữ Chuẩn 4K & Luyện Tiếng Anh Tự Nhiên
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
            Học ngoại ngữ qua những bộ phim bạn yêu thích với công nghệ phụ đề kép Anh - Việt song song, hỗ trợ tùy chỉnh cỡ chữ, nghe chậm và tra từ vựng trực tiếp trên trình phát.
          </p>

          {/* Quick Feature Badges */}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-200">
              <Languages size={14} className="text-cyan-400" />
              <span>Phụ đề song song 2 ngôn ngữ</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-200">
              <RotateCcw size={14} className="text-violet-400" />
              <span>Tua lại câu thoại 5s</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-200">
              <Sliders size={14} className="text-emerald-400" />
              <span>Tùy chỉnh tốc độ 0.75x - 1.25x</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER TABS & SEARCH BAR ── */}
      <div className="mx-auto max-w-[1300px] px-4 sm:px-8 mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {BILINGUAL_CATEGORIES.map((cat) => {
              const isSelected = selectedCat === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCat(cat.id);
                    setSearchQuery("");
                    setPage(1);
                  }}
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
          <div className="relative w-full md:w-72 shrink-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm phim song ngữ..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-4 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-cyan-400/50 focus:bg-white/[0.08] transition-all"
            />
          </div>
        </div>

        {/* ── FILM GRID ── */}
        <div className="mt-8">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-3.5 gap-y-6">
              {Array.from({ length: 14 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : rawItems.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
              <Languages size={36} className="mx-auto text-neutral-600 mb-3" />
              <h3 className="text-base font-bold text-white">Chưa tìm thấy phim song ngữ phù hợp</h3>
              <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
                Hãy thử chọn danh mục khác hoặc nhập từ khóa phim bạn muốn xem.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-3.5 gap-y-6">
              {rawItems.map((film, idx) => (
                <div key={film.slug || film._id} className="relative group/card">
                  <FilmCard film={film} priority={idx < 7} />
                </div>
              ))}
            </div>
          )}

          {/* ── PAGINATION ── */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 300, behavior: "smooth" });
                }}
                onPrefetchPage={prefetchPage}
              />
            </div>
          )}
        </div>

        {/* ── LEARNING TIPS BOX ── */}
        <div className="mt-16 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 via-violet-950/20 to-black p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={14} />
                Phương Pháp Hiệu Quả
              </span>
              <h3 className="text-lg font-bold text-white">Cách học tiếng Anh qua phim trên FlexPhim</h3>
              <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
                1. <strong>Lần 1:</strong> Xem với phụ đề song ngữ Anh - Việt để nắm trọn cốt truyện.<br />
                2. <strong>Lần 2:</strong> Chuyển sang chỉ bật phụ đề tiếng Anh, bấm tua lại 5s các câu giao tiếp hay để nhại theo giọng điệu diễn viên (Shadowing).
              </p>
            </div>
            <Link
              href="/films/anime"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-400 text-black hover:bg-cyan-300 transition-all cursor-pointer shrink-0 shadow-lg shadow-cyan-400/20 active:scale-95"
            >
              <span>Khám phá thêm Anime</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
