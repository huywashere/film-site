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
  Filter,
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
  { label: "Phim Lẻ", value: "single" },
  { label: "Phim Bộ", value: "series" },
  { label: "Phim Chiếu Rạp", value: "chieu-rap" },
  { label: "Phim đang chiếu", value: "dang-chieu" },
  { label: "TV Shows", value: "tv-shows" },
  { label: "Hoạt Hình", value: "anime" },
  { label: "Thuyết Minh", value: "thuyet-minh" },
];

const POPULAR_COUNTRIES = [
  { label: "Toàn bộ khu vực", value: "" },
  { label: "Hàn Quốc", value: "han-quoc" },
  { label: "Trung Quốc", value: "trung-quoc" },
  { label: "Thái Lan", value: "thai-lan" },
  { label: "Nhật Bản", value: "nhat-ban" },
  { label: "Âu Mỹ", value: "au-my" },
  { label: "Việt Nam", value: "viet-nam" },
  { label: "Hồng Kông", value: "hong-kong" },
  { label: "Đài Loan", value: "dai-loan" },
  { label: "Ấn Độ", value: "an-do" },
  { label: "Anh", value: "anh" },
  { label: "Pháp", value: "phap" },
  { label: "Canada", value: "canada" },
  { label: "Đức", value: "duc" },
  { label: "Tây Ban Nha", value: "tay-ban-nha" },
  { label: "Ý", value: "y" },
  { label: "Nga", value: "nga" },
  { label: "Úc", value: "uc" },
  { label: "Brazil", value: "brazil" },
  { label: "Mexico", value: "mexico" },
  { label: "Thổ Nhĩ Kỳ", value: "tho-nhi-ky" },
  { label: "Quốc Gia Khác", value: "quoc-gia-khac" },
];

const POPULAR_GENRES = [
  { label: "Toàn bộ các loại", value: "" },
  { label: "Hành Động", value: "hanh-dong" },
  { label: "Cổ Trang", value: "co-trang" },
  { label: "Tình Cảm", value: "tinh-cam" },
  { label: "Hài Hước", value: "hai-huoc" },
  { label: "Kinh Dị", value: "kinh-di" },
  { label: "Viễn Tưởng", value: "vien-tuong" },
  { label: "Võ Thuật", value: "vo-thuat" },
  { label: "Chiến Tranh", value: "chien-tranh" },
  { label: "Tâm Lý", value: "tam-ly" },
  { label: "Hình Sự", value: "hinh-su" },
  { label: "Phiêu Lưu", value: "phieu-luu" },
  { label: "Gia Đình", value: "gia-dinh" },
  { label: "Thần Thoại", value: "than-thoai" },
  { label: "Chính Kịch", value: "chinh-kich" },
  { label: "Bí Ẩn", value: "bi-an" },
  { label: "Học Đường", value: "hoc-duong" },
  { label: "Tài Liệu", value: "tai-lieu" },
  { label: "Âm Nhạc", value: "am-nhac" },
  { label: "Thể Thao", value: "the-thao" },
  { label: "Trẻ Em", value: "tre-em" },
  { label: "Phim 18+", value: "phim-18" },
];

const QUALITIES = [
  { label: "Chất lượng", value: "all" },
  { label: "Full HD (1080p)", value: "fhd" },
  { label: "HD (720p)", value: "hd" },
];

const AUDIOS = [
  { label: "Toàn bộ ngôn ngữ", value: "all" },
  { label: "Phụ đề", value: "vietsub" },
  { label: "Thuyết Minh", value: "thuyet-minh" },
  { label: "Lồng Tiếng", value: "long-tieng" },
];

const AGE_RATINGS = [
  { label: "Tất cả độ tuổi", value: "" },
  { label: "P (Mọi lứa tuổi)", value: "p" },
  { label: "K (Dưới 13 có người lớn)", value: "k" },
  { label: "T13 (13+)", value: "t13" },
  { label: "T16 (16+)", value: "t16" },
  { label: "T18 (18+)", value: "t18" },
];

const POPULAR_YEARS = [
  2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015,
  2014, 2013, 2012,
];

const SORTS = [
  { label: "Mặc định", value: "modified.time" },
  { label: "Mới nhất", value: "_id" },
  { label: "Điểm TMDB", value: "rating" },
  { label: "Năm (Mới-Cũ)", value: "year" },
  { label: "Năm (Cũ-Mới)", value: "year_asc" },
  { label: "Xem nhiều", value: "view" },
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
  const [selectedAge, setSelectedAge] = useState(
    searchParams.get("age") || "",
  );
  const [selectedSort, setSelectedSort] = useState(
    searchParams.get("sort") || "modified.time",
  );
  const [page, setPage] = useState(() => {
    const value = Number(searchParams.get("page") || 1);
    return Number.isInteger(value) && value > 0 ? value : 1;
  });
  const [isExpanded, setIsExpanded] = useState(() => {
    return Boolean(
      searchParams.get("genre") ||
      searchParams.get("category") ||
      searchParams.get("country") ||
      searchParams.get("year")
    );
  });
  const [customYearInput, setCustomYearInput] = useState("");

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
    const a = searchParams.get("age");
    if (a !== null) setSelectedAge(a);
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
    if (selectedAge) count++;
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
    selectedAge,
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
    setCustomYearInput("");
    setSelectedQuality("all");
    setSelectedAudio("all");
    setSelectedAge("");
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
      selectedAge,
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
        "dang-chieu": "phim-bo-dang-chieu",
      };
      if (
        selectedGenre ||
        selectedCountry ||
        selectedYear ||
        filteredTypes[selectedType]
      ) {
        const isAsc = selectedSort === "year_asc";
        const sortField =
          selectedSort === "year_asc"
            ? "year"
            : selectedSort === "rating"
              ? "vote_average"
              : selectedSort === "view"
                ? "view"
                : selectedSort === "_id"
                  ? "_id"
                  : "modified.time";
        const res = await movieApi.getFiltered({
          type: filteredTypes[selectedType],
          category: selectedGenre || undefined,
          country: selectedCountry || undefined,
          year: selectedYear ? Number(selectedYear) : undefined,
          page,
          limit: 28,
          sort_field: sortField,
          sort_type: isAsc ? "asc" : "desc",
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
      if (selectedType === "dang-chieu") {
        const res = await movieApi.getDangChieu(page);
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

    if (selectedAge) {
      if (selectedAge === "t18") {
        list = list.filter((f) => {
          const catSlugs = (f.category || []).map((c: any) => c.slug || c.name || "").join(" ").toLowerCase();
          return catSlugs.includes("18") || (f.name || "").includes("18+");
        });
      } else if (selectedAge === "p" || selectedAge === "k") {
        list = list.filter((f) => {
          const catSlugs = (f.category || []).map((c: any) => c.slug || c.name || "").join(" ").toLowerCase();
          return catSlugs.includes("hoat-hinh") || catSlugs.includes("tre-em") || catSlugs.includes("gia-dinh");
        });
      }
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
    } else if (selectedSort === "year_asc") {
      list = [...list].sort((a, b) => (a.year || 0) - (b.year || 0));
    } else if (selectedSort === "view") {
      list = [...list].sort((a, b) => ((b as any).view || 0) - ((a as any).view || 0));
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

        {/* ── Hệ thống Bộ Lọc Tinh Gọn (Phong cách Film4k / RoPhim, Nút Tím FlexPhim) ── */}
        <div className="space-y-3 sm:space-y-4">
          {/* 1. Hàng Tabs Định Dạng Chính (Image 1) */}
          <div className="flex items-center gap-5 sm:gap-7 md:gap-8 overflow-x-auto no-scrollbar border-b border-white/[0.08] pb-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
            {QUICK_TYPES.map((type) => {
              const isActive = selectedType === type.value;
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
                    "relative pb-2.5 text-xs sm:text-sm md:text-base whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0 font-bold",
                    isActive
                      ? "text-violet-400 font-extrabold"
                      : "text-neutral-400 hover:text-white font-semibold",
                  )}
                >
                  <span>{type.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.9)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 2. Thanh Điều Khiển: Nút Mở rộng / Thu gọn bộ lọc + Tìm kiếm nhanh (Image 1 & 2) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-300 hover:text-violet-400 transition-colors cursor-pointer select-none py-1 group w-fit"
            >
              <Filter
                size={14}
                className={cn(
                  "transition-colors",
                  isExpanded ? "text-violet-400 fill-violet-400/20" : "text-neutral-400 group-hover:text-violet-400",
                )}
              />
              <span>{isExpanded ? "Thu gọn bộ lọc" : "Mở rộng bộ lọc"}</span>
              {activeFiltersCount > 0 && !isExpanded && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-violet-600 text-white shadow-sm">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
              {/* Ô tìm kiếm nhanh */}
              <div className="relative flex-1 sm:w-64 sm:flex-initial">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm phim, diễn viên..."
                  className="w-full bg-[#12141c] border border-white/10 hover:border-white/20 focus:border-violet-500 rounded-full pl-8 pr-7 py-1 text-xs text-white placeholder:text-neutral-500 focus:outline-none transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Nút Xóa Lọc */}
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcw size={11} />
                  <span>Đặt lại</span>
                </button>
              )}

              {/* Số lượng phim */}
              <span className="text-[11px] sm:text-xs text-neutral-400 font-medium shrink-0 hidden md:inline">
                {films.length} phim {totalItems ? `• ${totalItems} kết quả` : ""}
              </span>
            </div>
          </div>

          {/* 3. Khung Chi Tiết Bộ Lọc Mở Rộng Dạng Hàng Đơn Giản - Nút Màu Tím (Image 3) */}
          {isExpanded && (
            <div className="pt-2 pb-3 space-y-3 sm:space-y-3.5 border-t border-white/[0.08] text-xs sm:text-[13px] animate-in fade-in-50 duration-200">
              {/* Row 1: Khu vực */}
              <div className="flex items-start gap-2 sm:gap-3 py-0.5">
                <span className="text-neutral-400 font-semibold text-xs sm:text-[13px] w-16 sm:w-20 shrink-0 pt-1 select-none">
                  Khu vực
                </span>
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 flex-1">
                  {POPULAR_COUNTRIES.map((c) => {
                    const isActive = selectedCountry === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c.value);
                          setPage(1);
                        }}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs transition-all duration-150 cursor-pointer select-none",
                          isActive
                            ? "bg-violet-600 text-white font-bold shadow-md shadow-violet-950/40"
                            : "text-neutral-400 hover:text-white hover:bg-white/[0.05]",
                        )}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Loại hình (Thể loại) */}
              <div className="flex items-start gap-2 sm:gap-3 py-0.5">
                <span className="text-neutral-400 font-semibold text-xs sm:text-[13px] w-16 sm:w-20 shrink-0 pt-1 select-none">
                  Loại hình
                </span>
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 flex-1">
                  {POPULAR_GENRES.map((g) => {
                    const isActive = selectedGenre === g.value;
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => {
                          setSelectedGenre(g.value);
                          setPage(1);
                        }}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs transition-all duration-150 cursor-pointer select-none",
                          isActive
                            ? "bg-violet-600 text-white font-bold shadow-md shadow-violet-950/40"
                            : "text-neutral-400 hover:text-white hover:bg-white/[0.05]",
                        )}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Ngôn ngữ */}
              <div className="flex items-start gap-2 sm:gap-3 py-0.5">
                <span className="text-neutral-400 font-semibold text-xs sm:text-[13px] w-16 sm:w-20 shrink-0 pt-1 select-none">
                  Ngôn ngữ
                </span>
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 flex-1">
                  {AUDIOS.map((a) => {
                    const isActive = selectedAudio === a.value;
                    return (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => {
                          setSelectedAudio(a.value);
                          setPage(1);
                        }}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs transition-all duration-150 cursor-pointer select-none",
                          isActive
                            ? "bg-violet-600 text-white font-bold shadow-md shadow-violet-950/40"
                            : "text-neutral-400 hover:text-white hover:bg-white/[0.05]",
                        )}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row: Độ tuổi */}
              <div className="flex items-start gap-2 sm:gap-3 py-0.5">
                <span className="text-neutral-400 font-semibold text-xs sm:text-[13px] w-16 sm:w-20 shrink-0 pt-1 select-none">
                  Độ tuổi
                </span>
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 flex-1">
                  {AGE_RATINGS.map((a) => {
                    const isActive = selectedAge === a.value;
                    return (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => {
                          setSelectedAge(a.value);
                          setPage(1);
                        }}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs transition-all duration-150 cursor-pointer select-none",
                          isActive
                            ? "bg-violet-600 text-white font-bold shadow-md shadow-violet-950/40"
                            : "text-neutral-400 hover:text-white hover:bg-white/[0.05]",
                        )}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Thập niên / Năm */}
              <div className="flex items-start gap-2 sm:gap-3 py-0.5">
                <span className="text-neutral-400 font-semibold text-xs sm:text-[13px] w-16 sm:w-20 shrink-0 pt-1 select-none">
                  Thập niên
                </span>
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYear("");
                      setCustomYearInput("");
                      setPage(1);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs transition-all duration-150 cursor-pointer select-none",
                      !selectedYear
                        ? "bg-violet-600 text-white font-bold shadow-md shadow-violet-950/40"
                        : "text-neutral-400 hover:text-white hover:bg-white/[0.05]",
                    )}
                  >
                    Toàn bộ các thập niên
                  </button>

                  {POPULAR_YEARS.map((y) => {
                    const isActive = String(selectedYear) === String(y);
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          setSelectedYear(String(y));
                          setCustomYearInput("");
                          setPage(1);
                        }}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs transition-all duration-150 cursor-pointer select-none",
                          isActive
                            ? "bg-violet-600 text-white font-bold shadow-md shadow-violet-950/40"
                            : "text-neutral-400 hover:text-white hover:bg-white/[0.05]",
                        )}
                      >
                        {y}
                      </button>
                    );
                  })}

                  {/* Input Nhập năm... */}
                  <div className="inline-flex items-center ml-0.5">
                    <input
                      type="number"
                      min="1970"
                      max="2030"
                      value={customYearInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomYearInput(val);
                        if (val.length === 4) {
                          setSelectedYear(val);
                          setPage(1);
                        } else if (!val) {
                          setSelectedYear("");
                          setPage(1);
                        }
                      }}
                      placeholder="Nhập năm..."
                      className="w-24 bg-[#12141c] border border-white/10 hover:border-white/20 focus:border-violet-500 rounded-full px-2.5 py-0.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Sắp xếp */}
              <div className="flex items-start gap-2 sm:gap-3 py-0.5">
                <span className="text-neutral-400 font-semibold text-xs sm:text-[13px] w-16 sm:w-20 shrink-0 pt-1 select-none">
                  Sắp xếp
                </span>
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 flex-1">
                  {SORTS.map((s) => {
                    const isActive = selectedSort === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => {
                          setSelectedSort(s.value);
                          setPage(1);
                        }}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs transition-all duration-150 cursor-pointer select-none",
                          isActive
                            ? "bg-violet-600 text-white font-bold shadow-md shadow-violet-950/40"
                            : "text-neutral-400 hover:text-white hover:bg-white/[0.05]",
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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
