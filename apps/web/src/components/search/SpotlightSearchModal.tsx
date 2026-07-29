"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Clock,
  TrendingUp,
  Clapperboard,
  X,
  Play,
  Filter,
  Film,
  Sparkles,
  Check,
  Star,
  Zap,
} from "lucide-react";
import { movieApi } from "@/lib/api";
import { resolveImageUrl, FilmItem } from "@/components/film/FilmCard";
import { VoiceSearchButton } from "@/components/search/VoiceSearchButton";
import { cn } from "@/lib/utils";

// ── Local storage helpers ─────────────────────────────────────────
const HISTORY_KEY = "cineverse-search-history";
const MAX_HISTORY = 10;

function getHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(query: string) {
  if (!query.trim()) return;
  const prev = getHistory().filter(
    (q) => q.toLowerCase() !== query.toLowerCase(),
  );
  const next = [query.trim(), ...prev].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function removeFromHistory(query: string) {
  const next = getHistory().filter((q) => q !== query);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

// ── Vietnamese Accent Removal for Fuzzy Search ───────────────────
function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

// ── YouTube/Netflix Smart Relevance Scorer ───────────────────────
function scoreFilmRelevance(film: FilmItem, rawQuery: string): number {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return 0;

  const name = (film.name || "").toLowerCase();
  const origin = (film.origin_name || "").toLowerCase();
  const slug = (film.slug || "").toLowerCase();

  // 1. Exact Vietnamese title starts with query (Highest Priority: 1000+)
  if (name.startsWith(q)) return 1000 - name.length;

  // 2. Title contains exact query string (e.g., "Bố Già", "Bố Vợ") (High Priority: 800+)
  if (name.includes(q)) return 800 - name.indexOf(q);

  // 3. Origin name contains exact query (Priority: 600+)
  if (origin.includes(q)) return 600 - origin.indexOf(q);

  // 4. Unaccented search (Fallback Priority: 400+)
  const qClean = removeAccents(q);
  const nameClean = removeAccents(name);
  const originClean = removeAccents(origin);

  if (nameClean.startsWith(qClean)) return 400;
  if (nameClean.includes(qClean)) return 300;
  if (originClean.includes(qClean)) return 200;
  if (slug.includes(qClean)) return 100;

  return 1;
}

// ── Highlight matching text ──────────────────────────────────────
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  try {
    const regex = new RegExp(
      `(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="bg-transparent text-emerald-400 font-extrabold not-italic underline decoration-emerald-500/50"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    );
  } catch {
    return <span>{text}</span>;
  }
}

// ── Main SpotlightSearchModal ────────────────────────────────────
export function SpotlightSearchModal({
  isOpen,
  onClose,
  suggestions = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  suggestions?: FilmItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [activeTypeFilter, setActiveTypeFilter] = useState<
    "all" | "series" | "single" | "hoat-hinh"
  >("all");
  const [activeLangFilter, setActiveLangFilter] = useState<
    "all" | "vietsub" | "thuyet-minh"
  >("all");
  const [selectedGenreSlug, setSelectedGenreSlug] = useState<string>("all");

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load history on open & focus
  useEffect(() => {
    if (isOpen && mounted) {
      setHistory(getHistory());
      setQuery("");
      setDebouncedQuery("");
      setActiveTypeFilter("all");
      setActiveLangFilter("all");
      setSelectedGenreSlug("all");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, mounted]);

  // Ultra-fast Debounce (100ms for instant feel)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 100);
    return () => clearTimeout(t);
  }, [query]);

  // Search API (Fetch 40 movies for deep scrollable grid)
  const { data: searchData, isFetching } = useQuery({
    queryKey: ["spotlight-search-fast", debouncedQuery],
    queryFn: () => movieApi.search(debouncedQuery, 1, 40).then((r) => r.data),
    enabled: mounted && debouncedQuery.trim().length >= 1,
    staleTime: 1000 * 60 * 10,
    placeholderData: (prev) => prev,
  });

  // Genres for quick filter chips
  const { data: genresData } = useQuery({
    queryKey: ["spotlight-genres"],
    queryFn: () => movieApi.getGenres().then((r) => r.data),
    staleTime: 1000 * 60 * 30,
    enabled: mounted && isOpen,
  });

  const rawResults: FilmItem[] = useMemo(
    () => searchData?.data?.items || [],
    [searchData],
  );

  // ── YouTube/Netflix Smart Sorting & Dynamic Multi-Facet Filtering ──
  const sortedAndFilteredResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    // 1. Calculate relevance scores
    const scored = rawResults.map((film) => ({
      film,
      score: scoreFilmRelevance(film, debouncedQuery),
    }));

    // 2. Sort by relevance score descending
    scored.sort((a, b) => b.score - a.score);

    // 3. Filter dynamically
    return scored
      .filter(({ film }) => {
        // Type filter
        if (activeTypeFilter === "series" && film.type !== "series")
          return false;
        if (activeTypeFilter === "single" && film.type !== "single")
          return false;
        if (
          activeTypeFilter === "hoat-hinh" &&
          film.type !== "hoat-hinh" &&
          !film.slug?.includes("hoat-hinh")
        )
          return false;

        // Language / Audio filter
        if (activeLangFilter === "vietsub") {
          const l = (film.lang || "").toLowerCase();
          if (!l.includes("sub") && !l.includes("vietsub")) return false;
        }
        if (activeLangFilter === "thuyet-minh") {
          const l = (film.lang || "").toLowerCase();
          if (
            !l.includes("thuyết minh") &&
            !l.includes("lồng tiếng") &&
            !l.includes("tm")
          )
            return false;
        }

        // Genre filter chip
        if (selectedGenreSlug !== "all") {
          const filmCategory = (film as any).category || [];
          const matchesCategory = Array.isArray(filmCategory)
            ? filmCategory.some((c: any) => c.slug === selectedGenreSlug)
            : film.slug?.includes(selectedGenreSlug);
          if (!matchesCategory) return false;
        }

        return true;
      })
      .map(({ film }) => film);
  }, [
    rawResults,
    debouncedQuery,
    activeTypeFilter,
    activeLangFilter,
    selectedGenreSlug,
  ]);

  const isSearching = debouncedQuery.trim().length >= 1;

  // Type counts for badges
  const seriesCount = useMemo(
    () => rawResults.filter((f) => f.type === "series").length,
    [rawResults],
  );
  const singleCount = useMemo(
    () => rawResults.filter((f) => f.type === "single").length,
    [rawResults],
  );
  const animeCount = useMemo(
    () =>
      rawResults.filter(
        (f) => f.type === "hoat-hinh" || f.slug?.includes("hoat-hinh"),
      ).length,
    [rawResults],
  );

  // Genre quick tags
  const quickGenres: { label: string; slug: string }[] = useMemo(() => {
    const genres = (genresData as any)?.data || [];
    if (genres.length > 0) {
      return genres
        .slice(0, 10)
        .map((g: any) => ({ label: g.name, slug: g.slug }));
    }
    return [
      { label: "Hành Động", slug: "hanh-dong" },
      { label: "Kinh Dị", slug: "kinh-di" },
      { label: "Tình Cảm", slug: "tinh-cam" },
      { label: "Hài Hước", slug: "hai-huoc" },
      { label: "Viễn Tưởng", slug: "vien-tuong" },
      { label: "Hoạt Hình", slug: "hoat-hinh" },
      { label: "Cổ Trang", slug: "co-trang" },
      { label: "Tâm Lý", slug: "tam-ly" },
    ];
  }, [genresData]);

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const handleRemoveHistory = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    removeFromHistory(term);
    setHistory(getHistory());
  };

  const handleSelectMovie = (slug: string) => {
    if (query.trim()) saveHistory(query.trim());
    onClose();
    router.push(`/film/${slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      saveHistory(query.trim());
      if (sortedAndFilteredResults.length > 0) {
        onClose();
        router.push(`/film/${sortedAndFilteredResults[0].slug}`);
      } else {
        onClose();
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  // Global ESC handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!mounted || !isOpen) return null;

  return (
    <div
      suppressHydrationWarning
      className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[100] flex items-start justify-center pt-[4vh] sm:pt-[6vh] px-3 sm:px-6 md:px-8 animate-fade-in"
      onClick={onClose}
    >
      <motion.div
        suppressHydrationWarning
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#0b0e13]/98 border border-white/12 w-full max-w-6xl rounded-3xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.95)] flex flex-col backdrop-blur-3xl h-[86vh] max-h-[840px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Search Input Bar (Fixed Header) ── */}
        <div
          suppressHydrationWarning
          className="flex items-center px-6 py-4 md:py-5 gap-4 border-b border-white/10 bg-white/[0.02] shrink-0"
        >
          <Search size={22} className="text-emerald-400 shrink-0" />
          <input
            suppressHydrationWarning
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm phim, đạo diễn, diễn viên..."
            className="flex-1 bg-transparent border-none text-white text-base md:text-lg font-bold placeholder:text-neutral-500 focus:outline-none focus:ring-0 tracking-wide"
          />
          <div className="flex items-center gap-3 shrink-0">
            <VoiceSearchButton onResult={(text) => setQuery(text)} />
            {isFetching && (
              <Loader2 size={18} className="animate-spin text-emerald-400" />
            )}
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="text-neutral-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
              >
                <X size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-xs font-bold text-neutral-400 bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              Đóng (ESC)
            </button>
          </div>
        </div>

        {/* ── YouTube/Netflix Smart Filter Bar (Fixed Header) ── */}
        <div className="px-6 py-3 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-neutral-500 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
              <Filter size={12} className="text-emerald-400" />
              Lọc theo:
            </span>

            {[
              { id: "all", label: "Tất cả", count: rawResults.length },
              { id: "series", label: "Phim Bộ", count: seriesCount },
              { id: "single", label: "Phim Lẻ", count: singleCount },
              { id: "hoat-hinh", label: "Hoạt Hình", count: animeCount },
            ].map((tab) => {
              const active = activeTypeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTypeFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-full font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    active
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                      : "bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10"
                  }`}
                >
                  <span>{tab.label}</span>
                  {isSearching && tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        active
                          ? "bg-black/30 text-white"
                          : "bg-white/10 text-neutral-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Audio Language Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: "all", label: "Tất cả Audio" },
              { id: "vietsub", label: "Vietsub" },
              { id: "thuyet-minh", label: "Thuyết Minh" },
            ].map((lang) => {
              const active = activeLangFilter === lang.id;
              return (
                <button
                  key={lang.id}
                  onClick={() => setActiveLangFilter(lang.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-white/20 text-white border border-white/30"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main Scrollable View Area (Smooth Scrollable Container) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {/* ── SEARCH MODE ── */}
          {isSearching ? (
            <div className="space-y-4">
              {/* Result Stats & Genre Filter Chips */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 border-b border-white/5 pb-3">
                <span className="text-xs font-bold text-neutral-400">
                  Tìm thấy{" "}
                  <strong className="text-white font-extrabold text-sm">
                    {sortedAndFilteredResults.length}
                  </strong>{" "}
                  kết quả cho &ldquo;
                  <span className="text-emerald-400">{debouncedQuery}</span>
                  &rdquo;
                </span>

                {/* Genre Filter Pills in Search Mode */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setSelectedGenreSlug("all")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                      selectedGenreSlug === "all"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Tất cả thể loại
                  </button>
                  {quickGenres.map((g) => {
                    const active = selectedGenreSlug === g.slug;
                    return (
                      <button
                        key={g.slug}
                        onClick={() => setSelectedGenreSlug(g.slug)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                          active
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : "text-neutral-400 hover:text-white bg-white/5"
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Loading Skeleton */}
              {isFetching && rawResults.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[2/3] rounded-2xl bg-white/5 animate-pulse border border-white/10"
                    />
                  ))}
                </div>
              ) : sortedAndFilteredResults.length > 0 ? (
                /* Rich Scrollable Cards Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-4">
                  {sortedAndFilteredResults.map((film) => {
                    const poster =
                      resolveImageUrl(film.poster_url) ||
                      resolveImageUrl(film.thumb_url);

                    return (
                      <div
                        key={film.slug}
                        onClick={() => handleSelectMovie(film.slug)}
                        className="group relative rounded-2xl bg-[#12161f] border border-white/10 hover:border-emerald-500/60 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1"
                      >
                        {/* Poster Image */}
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                          {poster ? (
                            <img
                              src={poster}
                              alt={film.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/5">
                              <Clapperboard size={28} className="opacity-20" />
                            </div>
                          )}

                          {/* Episode / Quality Badges */}
                          <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10">
                            {film.episode_current && (
                              <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow">
                                {film.episode_current}
                              </span>
                            )}
                            {film.lang && (
                              <span className="bg-black/75 backdrop-blur-md text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/20">
                                {film.lang}
                              </span>
                            )}
                          </div>

                          {/* Hover Play Icon Overlay */}
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                              <Play
                                size={18}
                                fill="currentColor"
                                className="ml-0.5"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Title & Info */}
                        <div className="p-3 space-y-1">
                          <h3 className="text-xs font-extrabold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                            <HighlightMatch
                              text={film.name}
                              query={debouncedQuery}
                            />
                          </h3>
                          {film.origin_name && (
                            <p className="text-[10px] text-neutral-400 truncate">
                              {film.origin_name}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-1 text-[10px] text-neutral-500 font-semibold border-t border-white/5">
                            <span>{film.year || "Phim"}</span>
                            <span className="capitalize">
                              {film.type === "series" ? "Phim Bộ" : "Phim Lẻ"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Clapperboard size={24} className="text-neutral-500" />
                  </div>
                  <p className="text-sm text-neutral-300 font-bold">
                    Không tìm thấy phim phù hợp
                  </p>
                  <p className="text-xs text-neutral-500">
                    Thử tìm từ khóa khác hoặc bỏ lọc loại phim / thể loại
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ── IDLE MODE: History + Trending + Recommendations Grid ── */
            <div className="space-y-8">
              {/* Recent History Searches */}
              {history.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 text-xs text-neutral-400 font-bold uppercase tracking-wider">
                      <Clock size={14} className="text-emerald-400" />
                      Tìm kiếm gần đây
                    </span>
                    <button
                      onClick={() => {
                        localStorage.removeItem(HISTORY_KEY);
                        setHistory([]);
                      }}
                      className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {history.map((term) => (
                      <div
                        key={term}
                        onClick={() => handleHistoryClick(term)}
                        className="group flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-semibold text-neutral-200 hover:text-white cursor-pointer transition-all active:scale-95"
                      >
                        <Clock size={12} className="text-neutral-500" />
                        <span>{term}</span>
                        <button
                          onClick={(e) => handleRemoveHistory(e, term)}
                          className="opacity-40 group-hover:opacity-100 hover:text-red-400 transition-opacity ml-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Quick Genre Chips */}
              <div className="space-y-3">
                <span className="flex items-center gap-1.5 text-xs text-neutral-400 font-bold uppercase tracking-wider px-1">
                  <TrendingUp size={14} className="text-emerald-400" />
                  Chủ đề thịnh hành
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickGenres.map((g) => (
                    <button
                      key={g.slug}
                      onClick={() => {
                        setQuery(g.label);
                        inputRef.current?.focus();
                      }}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:text-white transition-all cursor-pointer active:scale-95"
                    >
                      #{g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Movie Suggestions Grid */}
              {suggestions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 text-xs text-neutral-400 font-bold uppercase tracking-wider">
                      <Sparkles size={14} className="text-emerald-400" />
                      Gợi ý phim hot hôm nay
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {suggestions.slice(0, 12).map((film) => {
                      const poster =
                        resolveImageUrl(film.poster_url) ||
                        resolveImageUrl(film.thumb_url);

                      return (
                        <div
                          key={film.slug}
                          onClick={() => handleSelectMovie(film.slug)}
                          className="group relative rounded-2xl bg-[#12161f] border border-white/10 hover:border-emerald-500/60 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1"
                        >
                          <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                            {poster && (
                              <img
                                src={poster}
                                alt={film.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                                <Play
                                  size={14}
                                  fill="currentColor"
                                  className="ml-0.5"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="p-2.5 space-y-0.5">
                            <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                              {film.name}
                            </h4>
                            <p className="text-[10px] text-neutral-400 truncate">
                              {film.year || "Phim Hot"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
