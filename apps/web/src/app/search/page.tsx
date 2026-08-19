"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import {
  Search,
  X,
  Loader2,
  RotateCcw,
  Filter,
  ChevronDown,
  Check,
} from "lucide-react";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmItem,
  FilmCardSkeleton,
} from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { VoiceSearchButton } from "@/components/search/VoiceSearchButton";
import {
  SearchHistory,
  searchHistoryStorage,
} from "@/components/search/SearchHistory";
import { cardFont } from "@/lib/fonts";
import { FilmNotFound } from "@/components/film/FilmNotFound";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/store/langStore";

// ── Shared Lists ──────────────────────────────────────────────────
const GENRES_LIST = [
  { label: "Bí Ẩn", slug: "bi-an" },
  { label: "Chiến Tranh", slug: "chien-tranh" },
  { label: "Chính Kịch", slug: "chinh-kich" },
  { label: "Cổ Trang", slug: "co-trang" },
  { label: "Gia Đình", slug: "gia-dinh" },
  { label: "Hài Hước", slug: "hai-huoc" },
  { label: "Hành Động", slug: "hanh-dong" },
  { label: "Hình Sự", slug: "hinh-su" },
  { label: "Học Đường", slug: "hoc-duong" },
  { label: "Khoa Học", slug: "khoa-hoc" },
  { label: "Kinh Dị", slug: "kinh-di" },
  { label: "Kinh Điển", slug: "kinh-dien" },
  { label: "Lịch Sử", slug: "lich-su" },
  { label: "Miền Tây", slug: "mien-tay" },
  { label: "Phim 18+", slug: "phim-18" },
  { label: "Phim Ngắn", slug: "phim-ngan" },
  { label: "Phiêu Lưu", slug: "phieu-luu" },
  { label: "Thần Thoại", slug: "than-thoai" },
  { label: "Thể Thao", slug: "the-thao" },
  { label: "Trẻ Em", slug: "tre-em" },
  { label: "Tài Liệu", slug: "tai-lieu" },
  { label: "Tâm Lý", slug: "tam-ly" },
  { label: "Tình Cảm", slug: "tinh-cam" },
  { label: "Viễn Tưởng", slug: "vien-tuong" },
  { label: "Võ Thuật", slug: "vo-thuat" },
  { label: "Âm Nhạc", slug: "am-nhac" },
];

const COUNTRIES_LIST = [
  { label: "Anh", slug: "anh" },
  { label: "Ba Lan", slug: "ba-lan" },
  { label: "Brazil", slug: "brazil" },
  { label: "Bồ Đào Nha", slug: "bo-dao-nha" },
  { label: "Canada", slug: "canada" },
  { label: "Châu Phi", slug: "chau-phi" },
  { label: "Hà Lan", slug: "ha-lan" },
  { label: "Hàn Quốc", slug: "han-quoc" },
  { label: "Hồng Kông", slug: "hong-kong" },
  { label: "Indonesia", slug: "indonesia" },
  { label: "Malaysia", slug: "malaysia" },
  { label: "Mexico", slug: "mexico" },
  { label: "Na Uy", slug: "na-uy" },
  { label: "Nam Phi", slug: "nam-phi" },
  { label: "Nga", slug: "nga" },
  { label: "Nhật Bản", slug: "nhat-ban" },
  { label: "Philippines", slug: "philippines" },
  { label: "Pháp", slug: "phap" },
  { label: "Quốc Gia Khác", slug: "quoc-gia-khac" },
  { label: "Thái Lan", slug: "thai-lan" },
  { label: "Thổ Nhĩ Kỳ", slug: "tho-nhi-ky" },
  { label: "Thụy Sĩ", slug: "thuy-si" },
  { label: "Thụy Điển", slug: "thuy-dien" },
  { label: "Trung Quốc", slug: "trung-quoc" },
  { label: "Tây Ban Nha", slug: "tay-ban-nha" },
  { label: "UAE", slug: "uae" },
  { label: "Ukraina", slug: "ukraina" },
  { label: "Việt Nam", slug: "viet-nam" },
  { label: "Âu Mỹ", slug: "au-my" },
];

interface SelectOption {
  value: string;
  label: string;
}

function CustomSelect({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-[#141414] border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs text-neutral-200 flex items-center justify-between cursor-pointer focus:outline-none transition-colors select-none"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={13}
          className={`ml-1 text-neutral-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#181818] border border-white/15 rounded-xl py-1 shadow-2xl max-h-60 overflow-y-auto scrollbar-none">
          <div
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={`px-3 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between ${
              !value
                ? "bg-white/15 text-white font-bold"
                : "text-neutral-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span>{placeholder}</span>
            {!value && <Check size={12} className="text-white shrink-0 ml-1" />}
          </div>
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`px-3 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-white/15 text-white font-bold"
                    : "text-neutral-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check size={12} className="text-white shrink-0 ml-1" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => 2024 - i).map(
  (y) => ({
    value: String(y),
    label: `Năm ${y}`,
  }),
);

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, lang } = useTranslation();

  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");

  const query = searchParams.get("q") || "";
  const page = Number(searchParams.get("page") || 1);
  const type = searchParams.get("type") || "";
  const year = searchParams.get("year") || "";
  const genre = searchParams.get("genre") || "";
  const country = searchParams.get("country") || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "modified.time desc";

  useEffect(() => {
    setMounted(true);
    setInput(query);
  }, [query]);

  const isFilterOnly =
    !query &&
    Boolean(
      type ||
        year ||
        genre ||
        country ||
        status ||
        sort !== "modified.time desc",
    );

  const { data, isLoading } = useQuery({
    queryKey: [
      "search-v3",
      query.trim(),
      type,
      year,
      genre,
      country,
      status,
      sort,
      page,
    ],
    queryFn: async () => {
      try {
        if (isFilterOnly) {
          const res: any = await movieApi.getFiltered({
            type: type || undefined,
            year: year ? Number(year) : undefined,
            category: genre || undefined,
            country: country || undefined,
            status: status || undefined,
            sort_field: sort.includes("year") ? "year" : "modified.time",
            sort_type: sort.endsWith("asc") ? "asc" : "desc",
            page,
            limit: 24,
          });
          return res?.data || res;
        }
        const res: any = await movieApi.search(query, page, 24);
        return res?.data || res;
      } catch (err) {
        console.warn("Search query error fallback:", err);
        return { items: [], params: { pagination: { totalPages: 1 } } };
      }
    },
    enabled: Boolean(query.trim()) || isFilterOnly,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  const rawFilms: FilmItem[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.data?.items && Array.isArray(data.data.items))
      return data.data.items;
    return [];
  }, [data]);

  const paginationInfo = (data as any)?.params?.pagination || {};
  const totalPages =
    paginationInfo.totalPages ||
    Math.ceil(
      (paginationInfo.totalItems || rawFilms.length) /
        (paginationInfo.totalItemsPerPage || 24),
    ) ||
    1;

  // Filter client-side if additional fields were not handled by backend
  const films = useMemo(() => {
    let result = rawFilms;
    if (year) {
      result = result.filter(
        (f) => String(f.year) === String(year),
      );
    }
    return result;
  }, [rawFilms, year]);

  const handleSearchSubmit = (searchVal: string) => {
    const trimmed = searchVal.trim();
    if (!trimmed) return;
    searchHistoryStorage.add(trimmed);
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", trimmed);
    params.set("page", "1");
    router.push(`/search?${params.toString()}`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchSubmit(input);
  };

  const handleVoiceResult = (transcript: string) => {
    setInput(transcript);
    handleSearchSubmit(transcript);
  };

  const handleResetFilters = () => {
    setInput("");
    router.push("/search");
  };

  const localizedTypeOptions = [
    { value: "single", label: lang === "en" ? "Movies" : "Phim Lẻ" },
    { value: "series", label: lang === "en" ? "TV Series" : "Phim Bộ" },
    { value: "anime", label: lang === "en" ? "Anime & Animation" : "Hoạt Hình" },
    { value: "tvshows", label: lang === "en" ? "TV Shows" : "TV Shows" },
  ];

  return (
    <div className={cn(cardFont.className, "min-h-screen w-full bg-[#141414] text-white pt-20 sm:pt-24 pb-20 px-4 sm:px-8 max-w-7xl mx-auto select-none")}>
      {/* Search Header & Form Container */}
      <div className="max-w-3xl mx-auto mb-8 md:mb-12">
        <h1 className="text-2xl md:text-4xl font-extrabold text-white text-center mb-2 tracking-tight">
          {t("search.discoverMovies", "Khám phá Phim")}
        </h1>
        <p className="text-center text-neutral-400 max-w-xl mx-auto mb-6 text-xs sm:text-sm">
          {t("search.searchSubtitle", "Tìm phim theo tên, diễn viên hoặc bộ lọc nâng cao")}
        </p>

        {/* Compact Search Bar */}
        <form
          onSubmit={handleFormSubmit}
          className="relative mb-5 max-w-2xl mx-auto"
        >
          <div className="relative flex items-center rounded-2xl border border-white/10 bg-[#161618] p-1.5 transition-all hover:border-white/20 focus-within:border-white/30 focus-within:bg-[#181818] shadow-xl">
            <Search size={18} className="ml-3 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("search.placeholder", "Tìm phim, diễn viên...")}
              className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none"
            />
            <div className="flex items-center space-x-1.5 pr-1 shrink-0">
              <VoiceSearchButton onResult={handleVoiceResult} />
              {input && (
                <button
                  type="button"
                  onClick={() => setInput("")}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
              <button
                type="submit"
                aria-label={t("search.searchBtn", "Tìm kiếm")}
                className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 text-xs font-bold text-white transition-all px-4 active:scale-95 shadow-sm"
              >
                <Search size={14} />
                <span className="hidden sm:inline">{t("search.searchBtn", "Tìm kiếm")}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Filter Bar */}
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#161618] p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-neutral-300">
              <Filter size={13} className="text-neutral-400" />
              <span>{t("search.filterTitle", "Bộ lọc tìm kiếm")}</span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-neutral-400 hover:text-white transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw size={11} />
              <span>{t("search.clearFilter", "Xóa bộ lọc")}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Loại Phim */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">
                {t("search.movieType", "Loại Phim")}
              </label>
              <CustomSelect
                value={type}
                placeholder={t("search.allTypes", "Tất cả loại phim")}
                options={localizedTypeOptions}
                onChange={(newVal) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (newVal) params.set("type", newVal);
                  else params.delete("type");
                  router.push(`/search?${params.toString()}`);
                }}
              />
            </div>

            {/* Thể Loại */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">
                {t("search.genre", "Thể Loại")}
              </label>
              <CustomSelect
                value={genre}
                placeholder={t("search.allGenres", "Tất cả thể loại")}
                options={GENRES_LIST.map((g) => ({
                  value: g.slug,
                  label: t(`genres_list.${g.slug}`, g.label),
                }))}
                onChange={(newVal) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (newVal) params.set("genre", newVal);
                  else params.delete("genre");
                  router.push(`/search?${params.toString()}`);
                }}
              />
            </div>

            {/* Quốc Gia */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">
                {t("search.country", "Quốc Gia")}
              </label>
              <CustomSelect
                value={country}
                placeholder={t("search.allCountries", "Tất cả quốc gia")}
                options={COUNTRIES_LIST.map((c) => ({
                  value: c.slug,
                  label: t(`countries_list.${c.slug}`, c.label),
                }))}
                onChange={(newVal) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (newVal) params.set("country", newVal);
                  else params.delete("country");
                  router.push(`/search?${params.toString()}`);
                }}
              />
            </div>

            {/* Năm Phát Hành */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">
                {t("search.releaseYear", "Năm Phát Hành")}
              </label>
              <CustomSelect
                value={year}
                placeholder={t("search.allYears", "Tất cả các năm")}
                options={YEAR_OPTIONS}
                onChange={(newVal) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (newVal) params.set("year", newVal);
                  else params.delete("year");
                  router.push(`/search?${params.toString()}`);
                }}
              />
            </div>
          </div>
        </div>

        {/* Search History */}
        {!query && !isFilterOnly && mounted && (
          <div className="mt-4">
            <SearchHistory onSelectQuery={handleSearchSubmit} />
          </div>
        )}
      </div>

      {/* Results Section */}
      {(query || isFilterOnly) && (
        <div className="flex flex-col space-y-6">
          {isLoading || !mounted ? (
            <>
              <div className="border-b border-white/10 pb-3">
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                  <Loader2 size={12} className="animate-spin text-neutral-400" />
                  <span>{t("search.loading", "Đang tải kết quả tìm kiếm...")}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-y-6 sm:gap-y-8">
                {Array.from({ length: 14 }).map((_, i) => (
                  <FilmCardSkeleton key={i} />
                ))}
              </div>
            </>
          ) : films.length === 0 ? (
            <FilmNotFound querySlug={query} title={t("search.noResults", "Không tìm thấy kết quả nào phù hợp")} />
          ) : (
            <>
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
                  {query
                    ? (lang === "en" ? `Search results for "${query}" (${films.length} films)` : `Kết quả tìm kiếm cho "${query}" (${films.length} phim)`)
                    : (lang === "en" ? `Filtered results (${films.length} films)` : `Kết quả lọc phim (${films.length} phim)`)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-y-6 sm:gap-y-8">
                {films.map((film, idx) => (
                  <FilmCard key={`${film.slug || film._id || (film as any).id}-${idx}`} film={film} />
                ))}
              </div>

              {/* Full Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("page", p.toString());
                    router.push(`/search?${params.toString()}`);
                  }}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 md:px-8 max-w-7xl pt-24 pb-16 flex flex-col space-y-6">
          <div className="h-6 bg-white/5 rounded w-48 animate-pulse" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-y-6 sm:gap-y-8">
            {Array.from({ length: 14 }).map((_, i) => (
              <FilmCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
