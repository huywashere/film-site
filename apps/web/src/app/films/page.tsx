"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Film,
  Sparkles,
  ChevronDown,
  Loader2,
  Clapperboard,
} from "lucide-react";
import { FilmCard, FilmItem } from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { GENRES_LIST, COUNTRIES_LIST } from "@/components/layout/Navbar";
import { movieApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const YEARS = Array.from({ length: 25 }, (_, i) => 2026 - i);

const TYPES = [
  { label: "Tất cả định dạng", value: "all" },
  { label: "Phim Bộ", value: "series" },
  { label: "Phim Lẻ", value: "single" },
  { label: "Hoạt Hình", value: "anime" },
  { label: "TV Shows", value: "tv-shows" },
];

const SORTS = [
  { label: "Thời gian cập nhật", value: "modified.time" },
  { label: "Năm phát hành", value: "year" },
  { label: "Mức độ phổ biến", value: "view" },
];

export default function BrowseFilmsPage() {
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSort, setSelectedSort] = useState("modified.time");
  const [page, setPage] = useState(1);

  const isFiltered =
    !!search ||
    !!selectedGenre ||
    !!selectedCountry ||
    !!selectedYear ||
    selectedType !== "all";

  const handleReset = () => {
    setSearch("");
    setSelectedGenre("");
    setSelectedCountry("");
    setSelectedYear("");
    setSelectedType("all");
    setSelectedSort("modified.time");
    setPage(1);
  };

  // Query film list based on search vs filters
  const { data, isLoading } = useQuery({
    queryKey: [
      "browse-films",
      search,
      selectedGenre,
      selectedCountry,
      selectedYear,
      selectedType,
      selectedSort,
      page,
    ],
    queryFn: async () => {
      if (search.trim()) {
        const res = await movieApi.search(search.trim(), page, 24);
        return res.data;
      }

      if (selectedGenre) {
        const res = await movieApi.getByGenre(selectedGenre, page);
        return res.data;
      }

      if (selectedCountry) {
        const res = await movieApi.getByCountry(selectedCountry, page);
        return res.data;
      }

      if (selectedType === "series") {
        const res = await movieApi.getSeries(page);
        return res.data;
      }

      if (selectedType === "single") {
        const res = await movieApi.getSingle(page);
        return res.data;
      }

      if (selectedType === "anime") {
        const res = await movieApi.getAnime(page);
        return res.data;
      }

      if (selectedType === "tv-shows") {
        const res = await movieApi.getTvShows(page);
        return res.data;
      }

      const res = await movieApi.getLatest(page);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawItems: Array<Record<string, unknown>> = (data?.items ||
    data?.data?.items ||
    []) as Array<Record<string, unknown>>;
  const totalPages =
    data?.params?.pagination?.totalPages ||
    data?.pagination?.totalPages ||
    Math.ceil((data?.totalItems || 100) / 24);

  const films: FilmItem[] = useMemo(() => {
    let list: FilmItem[] = rawItems.map((item): FilmItem => ({
      _id: String(item._id || item.id || item.slug || ""),
      name: String(item.name || item.title || ""),
      origin_name: String(item.origin_name || item.original_title || ""),
      slug: String(item.slug || ""),
      poster_url: String(item.poster_url || item.thumb_url || ""),
      thumb_url: String(item.thumb_url || item.poster_url || ""),
      year: Number(item.year) || 2026,
      episode_current: String(item.episode_current || "HD"),
      quality: String(item.quality || "FHD"),
      lang: String(item.lang || "Vietsub"),
      category: Array.isArray(item.category) ? item.category : [],
      country: Array.isArray(item.country) ? item.country : [],
      vote_average: Number(item.vote_average || item.rating) || 8.5,
    }));

    if (selectedYear) {
      list = list.filter((f) => String(f.year) === String(selectedYear));
    }

    return list;
  }, [rawItems, selectedYear]);

  return (
    <div className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 pt-20 sm:pt-24 pb-20 bg-background min-h-screen text-foreground select-none font-sans">
      {/* ── Page Title Header (Centered & Ultra-Minimalist) ── */}
      <div className="flex flex-col items-center justify-center text-center gap-3 mb-10 pb-6 border-b border-white/5 max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400">
            <Clapperboard size={18} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Bộ Lọc Điện Ảnh
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Duyệt Tìm Kho Phim
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400">
          Khám phá hàng ngàn bộ phim bom tấn, phim bộ, hoạt hình mới nhất
        </p>

        {/* Quick Search */}
        <div className="relative w-full max-w-md mt-2">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm tên phim, đạo diễn..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30 transition-colors shadow-inner"
          />
        </div>
      </div>

      {/* ── Filter Controls Matrix (Ultra-Minimalist Dark) ── */}
      <div className="bg-neutral-950/80 border border-white/10 rounded-3xl p-5 mb-8 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-neutral-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Bộ Lọc Tìm Kiếm
            </span>
          </div>

          {isFiltered && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white transition-colors px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
            >
              <RotateCcw size={12} />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {/* Genre Select */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Thể Loại
            </label>
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setPage(1);
              }}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
            >
              <option value="">Tất cả thể loại</option>
              {GENRES_LIST.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Country Select */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Quốc Gia
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setPage(1);
              }}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
            >
              <option value="">Tất cả quốc gia</option>
              {COUNTRIES_LIST.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Select */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Năm Phát Hành
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setPage(1);
              }}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
            >
              <option value="">Tất cả các năm</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Type Select */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Định Dạng
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Select */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Sắp Xếp
            </label>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Movie Results Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-2xl bg-white/5 animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : films.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
          <Film size={48} className="mx-auto text-neutral-600 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">
            Không tìm thấy phim phù hợp
          </h3>
          <p className="text-xs text-neutral-400 mb-6">
            Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bớt bộ lọc
          </p>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-white text-black font-extrabold text-xs rounded-xl hover:bg-neutral-200 transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            Bỏ chọn bộ lọc
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {films.map((film, idx) => (
              <FilmCard key={film._id || idx} film={film} />
            ))}
          </div>

          {/* ── Pagination ── */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </>
      )}
    </div>
  );
}
