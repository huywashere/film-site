"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  RotateCcw,
  Film,
  X,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import {
  FilmCard,
  FilmCardSkeleton,
  FilmItem,
  resolveImageUrl,
} from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { GENRES_LIST, COUNTRIES_LIST } from "@/components/layout/Navbar";
import { movieApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { cardFont } from "@/lib/fonts";
import { BrowseFilmsSkeleton } from "@/components/loading/CatalogPageSkeletons";
import { useReliableNavigation } from "@/hooks/useReliableNavigation";
import { VerticalTabsHeroBanner } from "@/components/layout/VerticalTabsHeroBanner";

// ── Định nghĩa các tùy chọn bộ lọc ──────────────────────────────────────────

const YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i);

const QUICK_TYPES = [
  { label: "Tất cả", value: "all" },
  { label: "Phim Bộ", value: "series" },
  { label: "Phim Lẻ", value: "single" },
  { label: "Anime", value: "anime" },
  { label: "TV Shows", value: "tv-shows" },
  { label: "Thuyết Minh", value: "thuyet-minh" },
  { label: "Chiếu Rạp", value: "chieu-rap" },
];

const QUALITIES = [
  { label: "Chất lượng", value: "all" },
  { label: "Full HD (1080p)", value: "fhd" },
  { label: "HD (720p)", value: "hd" },
];

const AUDIOS = [
  { label: "Bản dịch", value: "all" },
  { label: "Vietsub", value: "vietsub" },
  { label: "Thuyết minh", value: "thuyet-minh" },
  { label: "Lồng tiếng", value: "long-tieng" },
];

const SORTS = [
  { label: "Mới cập nhật", value: "modified.time" },
  { label: "Năm phát hành", value: "year" },
  { label: "Đánh giá cao nhất", value: "rating" },
  { label: "Mức độ phổ biến", value: "view" },
];

type BrowseFilmsClientProps = {
  initialData?: any;
  initialDataUpdatedAt?: number;
};

function BrowseFilmsContent({
  initialData,
  initialDataUpdatedAt,
}: BrowseFilmsClientProps) {
  const router = useReliableNavigation();
  const searchParams = useSearchParams();
  const initialSearch =
    searchParams.get("q") || searchParams.get("search") || "";
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedType, setSelectedType] = useState(
    searchParams.get("type") || "all",
  );
  const [selectedSubFranchise, setSelectedSubFranchise] = useState(
    searchParams.get("sub") || "all",
  );
  const [selectedGenre, setSelectedGenre] = useState(
    searchParams.get("genre") || searchParams.get("category") || "",
  );
  const [selectedCountry, setSelectedCountry] = useState(
    searchParams.get("country") || "",
  );
  const [selectedYear, setSelectedYear] = useState(
    searchParams.get("year") || "",
  );
  const [selectedQuality, setSelectedQuality] = useState("all");
  const [selectedAudio, setSelectedAudio] = useState("all");
  const [selectedSort, setSelectedSort] = useState(
    searchParams.get("sort") || "modified.time",
  );
  const [page, setPage] = useState(() => {
    const value = Number(searchParams.get("page") || 1);
    return Number.isInteger(value) && value > 0 ? value : 1;
  });

  // Reset stuck recovery counter once page mounts successfully
  useEffect(() => {
    try {
      sessionStorage.removeItem("flexphim_stuck_nav_" + window.location.pathname);
    } catch {}
  }, []);

  // Đồng bộ tiêu chí lọc từ URL query params
  useEffect(() => {
    const u = searchParams.get("universe");
    if (u === "marvel" || u === "dc") {
      router.replace(`/universe/${u}`);
      return;
    }
    const t = searchParams.get("type");
    if (t === "marvel" || t === "dc") {
      router.replace(`/universe/${t}`);
      return;
    }
    const sub = searchParams.get("sub");
    if (sub) setSelectedSubFranchise(sub);
    const y = searchParams.get("year");
    if (y !== null) setSelectedYear(y);
    if (t !== null) setSelectedType(t);
    const g = searchParams.get("genre") || searchParams.get("category");
    if (g !== null) setSelectedGenre(g);
    const c = searchParams.get("country");
    if (c !== null) setSelectedCountry(c);
    const q = searchParams.get("q") || searchParams.get("search");
    if (q !== null) {
      setSearch(q);
      setDebouncedSearch(q);
    }
    const s = searchParams.get("sort");
    if (s !== null) setSelectedSort(s);
    const p = searchParams.get("page");
    if (p !== null && !isNaN(Number(p))) setPage(Number(p));
  }, [searchParams, router]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Đếm số lượng bộ lọc đang kích hoạt
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedType !== "all") count++;
    if (selectedSubFranchise !== "all") count++;
    if (selectedGenre) count++;
    if (selectedCountry) count++;
    if (selectedYear) count++;
    if (selectedQuality !== "all") count++;
    if (selectedAudio !== "all") count++;
    if (debouncedSearch) count++;
    return count;
  }, [
    selectedType,
    selectedSubFranchise,
    selectedGenre,
    selectedCountry,
    selectedYear,
    selectedQuality,
    selectedAudio,
    debouncedSearch,
  ]);

  const isFiltered = activeFiltersCount > 0;

  const handleResetAll = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedType("all");
    setSelectedSubFranchise("all");
    setSelectedGenre("");
    setSelectedCountry("");
    setSelectedYear("");
    setSelectedQuality("all");
    setSelectedAudio("all");
    setSelectedSort("modified.time");
    setPage(1);
  }, []);

  // TanStack Query cache key
  const queryKey = useMemo(() => {
    return [
      "browse-films-v2",
      debouncedSearch,
      selectedType,
      selectedSubFranchise,
      selectedGenre,
      selectedCountry,
      selectedYear,
      selectedQuality,
      selectedAudio,
      selectedSort,
      page,
    ];
  }, [
    debouncedSearch,
    selectedType,
    selectedSubFranchise,
    selectedGenre,
    selectedCountry,
    selectedYear,
    selectedQuality,
    selectedAudio,
    selectedSort,
    page,
  ]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      // 0. Nếu đang chọn Vũ trụ Marvel hoặc DC: Nạp toàn bộ kho phim vũ trụ tương ứng
      if (selectedType === "marvel" || selectedType === "dc") {
        const { getUniverseFilms } = await import("@/lib/universe-catalog");
        const universeFilms = getUniverseFilms(selectedType as "marvel" | "dc", {
          subFranchise: selectedSubFranchise,
          year: selectedYear,
          quality: selectedQuality,
          audio: selectedAudio,
          search: debouncedSearch,
          sort: selectedSort,
        });
        const pageSize = 28;
        const start = (page - 1) * pageSize;
        const pagedItems = universeFilms.slice(start, start + pageSize);
        return {
          items: pagedItems,
          totalItems: universeFilms.length,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(universeFilms.length / pageSize),
            totalItems: universeFilms.length,
          },
        };
      }

      // 1. Tìm kiếm từ khóa nếu có (các tab khác)
      if (debouncedSearch.trim()) {
        const filters: any = {};
        if (selectedGenre) filters.genre = selectedGenre;
        if (selectedCountry) filters.country = selectedCountry;
        if (selectedYear) filters.year = Number(selectedYear);
        if (selectedType !== "all") filters.type = selectedType;
        const res = await movieApi.search(debouncedSearch.trim(), page, 28, filters);
        return res?.data?.data || res?.data || { items: [] };
      }

      // 2. Lọc kết hợp ở server để phân trang và tổng số kết quả chính xác.
      const filteredTypes: Record<string, string> = {
        series: "phim-bo",
        single: "phim-le",
        anime: "hoat-hinh",
        "tv-shows": "tv-shows",
      };
      if (
        selectedGenre ||
        selectedCountry ||
        selectedYear ||
        filteredTypes[selectedType]
      ) {
        const res = await movieApi.getFiltered({
          type: filteredTypes[selectedType],
          category: selectedGenre || undefined,
          country: selectedCountry || undefined,
          year: selectedYear ? Number(selectedYear) : undefined,
          page,
          limit: 28,
          sort_field: selectedSort,
          sort_type: "desc",
        });
        return res?.data?.data || res?.data || { items: [] };
      }

      // 3. Lọc theo Phân loại định dạng đặc biệt
      if (selectedType === "thuyet-minh") {
        const res = await movieApi.getThuyetMinh(page);
        return res?.data?.data || res?.data || { items: [] };
      }
      if (selectedType === "chieu-rap") {
        const res = await movieApi.getChieuRap(page);
        return res?.data?.data || res?.data || { items: [] };
      }

      // 4. Mặc định: Phim mới cập nhật
      const res = await movieApi.getLatest(page);
      return res?.data?.data || res?.data || { items: [] };
    },
    initialData,
    initialDataUpdatedAt,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    placeholderData: (previousData) => previousData,
  });

  const rawItems: any[] = useMemo(() => {
    return data?.items || data?.data?.items || [];
  }, [data]);

  const totalPages =
    data?.params?.pagination?.totalPages ||
    data?.pagination?.totalPages ||
    Math.ceil((data?.totalItems || 100) / 28);

  const totalItems =
    data?.totalItems || data?.data?.params?.pagination?.totalItems || undefined;

  // Client-side refining & sorting
  const films: FilmItem[] = useMemo(() => {
    if (selectedType === "marvel" || selectedType === "dc") {
      return rawItems.map((item): FilmItem => {
        const pUrl = String(item.poster_url || item.thumb_url || "");
        const tUrl = String(item.thumb_url || item.poster_url || "");
        return {
          _id: String(item._id || item.id || item.slug || ""),
          name: String(item.name || item.title || ""),
          origin_name: String(item.origin_name || item.original_title || ""),
          slug: String(item.slug || ""),
          poster_url: resolveImageUrl(pUrl, tUrl) || pUrl,
          thumb_url: resolveImageUrl(tUrl, pUrl) || tUrl,
          year: Number(item.year) || 2024,
          episode_current: String(item.episode_current || "HD"),
          quality: String(item.quality || "FHD"),
          lang: String(item.lang || "Vietsub"),
          category: Array.isArray(item.category) ? item.category : [],
          country: Array.isArray(item.country) ? item.country : [],
          vote_average: Number(item.vote_average || item.rating) || 8.2,
        };
      });
    }

    let list: FilmItem[] = rawItems.map((item): FilmItem => {
      const pUrl = String(item.poster_url || item.thumb_url || "");
      const tUrl = String(item.thumb_url || item.poster_url || "");
      return {
        _id: String(item._id || item.id || item.slug || ""),
        name: String(item.name || item.title || ""),
        origin_name: String(item.origin_name || item.original_title || ""),
        slug: String(item.slug || ""),
        poster_url: resolveImageUrl(pUrl, tUrl) || pUrl,
        thumb_url: resolveImageUrl(tUrl, pUrl) || tUrl,
        year: Number(item.year) || 2026,
        episode_current: String(item.episode_current || "HD"),
        quality: String(item.quality || "FHD"),
        lang: String(item.lang || "Vietsub"),
        category: Array.isArray(item.category) ? item.category : [],
        country: Array.isArray(item.country) ? item.country : [],
        vote_average: Number(item.vote_average || item.rating) || 8.5,
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

    if (selectedAudio !== "all") {
      if (selectedAudio === "thuyet-minh") {
        list = list.filter(
          (f) =>
            (f.lang || "").toLowerCase().includes("thuyết minh") ||
            (f.lang || "").toLowerCase().includes("lồng tiếng"),
        );
      } else if (selectedAudio === "vietsub") {
        list = list.filter((f) =>
          (f.lang || "").toLowerCase().includes("vietsub"),
        );
      } else if (selectedAudio === "long-tieng") {
        list = list.filter((f) =>
          (f.lang || "").toLowerCase().includes("lồng tiếng"),
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
  }, [rawItems, selectedType, selectedYear, selectedQuality, selectedAudio, selectedSort]);

  return (
    <main
      data-eager-hydration="true"
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#0a0b10] text-white pb-24 sm:pb-28 -mt-20 sm:-mt-24 select-none",
      )}
    >
      {/* ── Top Hero Banner (Avengers Endgame with Full Face Visibility & Integrated Typography) ── */}
      <VerticalTabsHeroBanner
        title="Duyệt Tìm & Khám Phá"
        description="Khám phá kho phim điện ảnh, phim bộ và hoạt hình chọn lọc với hệ thống lọc đa tầng chuyên sâu."
        imageSrc="/img-backtop/tab-films.webp"
        blurDataURL="data:image/webp;base64,UklGRrQAAABXRUJQVlA4IKgAAABQBQCdASogABIAPu1mqk8ppaOiKA1RMB2JYgDFCzQ/UFVIJRQ58x61lgqf+JvBB8ky6AAA/vnHcbtWCZysUiCcHuuqRxaZALlSrFJcJlbOboxbaaFElWC17tRH6OLesquLnOWfk80EOc9gCMDDtQrQqTflzmOnKLbLdMnRy0RqjeN4StLM5jRp2K9hypL8S2+jmZbuIeLdgeLm8uA/occO+FmgRst4AAA="
        objectPosition="center 10%"
        contentClassName="pb-14 sm:pb-18 md:pb-22 lg:pb-26"
      />

      {/* ── Ambient Studio Lighting (Đồng bộ trang chủ) ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-white/[0.025] to-transparent blur-[140px] rounded-full" />
      </div>

      <div className="relative z-20 w-full px-3.5 sm:px-6 md:pl-20 lg:pl-24 pr-3.5 sm:pr-6 md:pr-10 space-y-5 sm:space-y-6 -mt-6 sm:-mt-8 md:-mt-10 lg:-mt-12">

        {/* ── Hàng 1: Thanh Tìm Kiếm & Quick Format Pills ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Format Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
            {QUICK_TYPES.map((type) => {
              const isActive = selectedType === type.value;
              const pillStyle = isActive
                ? "bg-white text-black shadow-sm font-black border-white"
                : "bg-[#12141c] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]";

              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setSelectedType(type.value);
                    setSelectedSubFranchise("all");
                    setPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0",
                    pillStyle,
                  )}
                >
                  {type.label}
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tên phim, diễn viên..."
                  className="w-full bg-[#12141c] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-white rounded-full transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* ── Hàng 2: Bộ Lọc Tinh Gọn Dạng Select Pills (Không khung viền cồng kềnh) ── */}
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
                      "appearance-none bg-[#12141c] border rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold focus:outline-none focus:border-white/40 cursor-pointer transition-colors",
                      selectedGenre
                        ? "border-white/40 text-white bg-white/10"
                        : "border-white/10 text-neutral-300 hover:border-white/20",
                    )}
                  >
                    <option value="">Thể Loại</option>
                    {GENRES_LIST.map((g) => (
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

                {/* 2. Quốc Gia */}
                <div className="relative">
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setPage(1);
                    }}
                    className={cn(
                      "appearance-none bg-[#12141c] border rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold focus:outline-none focus:border-white/40 cursor-pointer transition-colors",
                      selectedCountry
                        ? "border-white/40 text-white bg-white/10"
                        : "border-white/10 text-neutral-300 hover:border-white/20",
                    )}
                  >
                    <option value="">Quốc Gia</option>
                    {COUNTRIES_LIST.map((c) => (
                      <option
                        key={c.slug}
                        value={c.slug}
                        className="bg-[#12141c] text-white"
                      >
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                  />
                </div>

                {/* 3. Năm Phát Hành */}
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setPage(1);
                    }}
                    className={cn(
                      "appearance-none bg-[#12141c] border rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold focus:outline-none focus:border-white/40 cursor-pointer transition-colors",
                      selectedYear
                        ? "border-white/40 text-white bg-white/10"
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

                {/* 4. Chất Lượng */}
                <div className="relative">
                  <select
                    value={selectedQuality}
                    onChange={(e) => {
                      setSelectedQuality(e.target.value);
                      setPage(1);
                    }}
                    className={cn(
                      "appearance-none bg-[#12141c] border rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold focus:outline-none focus:border-white/40 cursor-pointer transition-colors",
                      selectedQuality !== "all"
                        ? "border-white/40 text-white bg-white/10"
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

                {/* 5. Bản Dịch */}
                <div className="relative">
                  <select
                    value={selectedAudio}
                    onChange={(e) => {
                      setSelectedAudio(e.target.value);
                      setPage(1);
                    }}
                    className={cn(
                      "appearance-none bg-[#12141c] border rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold focus:outline-none focus:border-white/40 cursor-pointer transition-colors",
                      selectedAudio !== "all"
                        ? "border-white/40 text-white bg-white/10"
                        : "border-white/10 text-neutral-300 hover:border-white/20",
                    )}
                  >
                    {AUDIOS.map((a) => (
                      <option
                        key={a.value}
                        value={a.value}
                        className="bg-[#12141c] text-white"
                      >
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                  />
                </div>

                {/* 6. Sắp Xếp */}
                <div className="relative">
                  <select
                    value={selectedSort}
                    onChange={(e) => {
                      setSelectedSort(e.target.value);
                      setPage(1);
                    }}
                    className="appearance-none bg-[#12141c] border border-white/10 hover:border-white/20 rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold text-neutral-300 focus:outline-none focus:border-white/40 cursor-pointer transition-colors"
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

                {/* Nút Xóa Lọc */}
                {isFiltered && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    <span>Đặt lại</span>
                  </button>
                )}
              </div>

              {/* Số lượng phim */}
              <span className="text-[11px] sm:text-xs text-neutral-400 font-medium self-center">
                {films.length} phim{" "}
                {totalItems ? `• Tổng số ${totalItems}` : ""}
              </span>
            </div>

        {/* ── Lưới Thẻ Phim Chuẩn 7 Cột Phong Cách Trang Chủ (2xl:grid-cols-7) ── */}
        {isLoading ? (
          <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-1.5 sm:gap-3.5 lg:gap-4 gap-y-3.5 sm:gap-y-6 pt-2">
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
              Không tìm thấy bộ phim phù hợp
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
          <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-1.5 sm:gap-3.5 lg:gap-4 gap-y-3.5 sm:gap-y-6 pt-3 pb-3 -mt-3 cv-grid-auto">
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
              totalItems={totalItems}
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

export default function BrowseFilmsClient(props: BrowseFilmsClientProps) {
  return (
    <Suspense fallback={<BrowseFilmsSkeleton />}>
      <BrowseFilmsContent {...props} />
    </Suspense>
  );
}
