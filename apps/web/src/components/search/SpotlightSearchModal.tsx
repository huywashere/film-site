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
  User,
} from "lucide-react";
import { movieApi } from "@/lib/api";
import { tmdbProfile } from "@/lib/tmdb";
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

  const actor = Array.isArray(film.actor)
    ? film.actor.join(" ").toLowerCase()
    : String(film.actor || "").toLowerCase();
  const director = Array.isArray(film.director)
    ? film.director.join(" ").toLowerCase()
    : String(film.director || "").toLowerCase();

  // 1. Exact Vietnamese title starts with query (Highest Priority: 1000+)
  if (name.startsWith(q)) return 1000 - name.length;

  // 2. Title contains exact query string (e.g., "Bố Già", "Bố Vợ") (High Priority: 800+)
  if (name.includes(q)) return 800 - name.indexOf(q);

  // 3. Origin name contains exact query (Priority: 600+)
  if (origin.includes(q)) return 600 - origin.indexOf(q);

  // 4. Actor or Director match (Priority: 750 / 700)
  if (actor.includes(q)) return 750;
  if (director.includes(q)) return 700;

  // 5. Unaccented search (Fallback Priority: 400+)
  const qClean = removeAccents(q);
  const nameClean = removeAccents(name);
  const originClean = removeAccents(origin);
  const actorClean = removeAccents(actor);
  const directorClean = removeAccents(director);

  if (nameClean.startsWith(qClean)) return 400;
  if (nameClean.includes(qClean)) return 300;
  if (actorClean.includes(qClean)) return 350;
  if (directorClean.includes(qClean)) return 320;
  if (originClean.includes(qClean)) return 200;
  if (slug.includes(qClean)) return 100;

  return 1;
}

// ── Highlight matching text (Ultra-Fast 60fps String Slicing) ───
function HighlightMatch({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed || !text) return <span>{text}</span>;

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return <span>{text}</span>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + trimmed.length);
  const after = text.slice(index + trimmed.length);

  return (
    <span>
      {before}
      <mark className="bg-transparent text-emerald-300 font-extrabold not-italic underline decoration-emerald-400/50">
        {match}
      </mark>
      {after}
    </span>
  );
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
    "all" | "series" | "single" | "hoat-hinh" | "actor"
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

  // Actor Search API (Search people via TMDB API)
  const { data: actorSearchData } = useQuery({
    queryKey: ["spotlight-actor-search", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/tmdb/search/person?query=${encodeURIComponent(debouncedQuery)}&language=vi-VN`,
      );
      if (!res.ok) return { results: [] };
      return res.json();
    },
    enabled: mounted && debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 10,
  });

  const searchedActors = useMemo(
    () => actorSearchData?.results || [],
    [actorSearchData],
  );

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

  const uniqueSearchResults = useMemo(() => {
    const seen = new Set<string>();
    return sortedAndFilteredResults.filter((film) => {
      if (!film || !film.slug) return false;
      if (seen.has(film.slug)) return false;
      seen.add(film.slug);
      return true;
    });
  }, [sortedAndFilteredResults]);

  const uniqueSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return (suggestions || []).filter((film) => {
      if (!film || !film.slug) return false;
      if (seen.has(film.slug)) return false;
      seen.add(film.slug);
      return true;
    });
  }, [suggestions]);

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
      // The spotlight input must never bubble an Enter press into any auth
      // form mounted elsewhere in the app shell.
      e.preventDefault();
      e.stopPropagation();
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

  // Global ESC handler & Body Scroll Lock when modal is active
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handler);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return (
    <div
      suppressHydrationWarning
      className="fixed inset-0 z-[100] flex items-start justify-center bg-[#030508]/78 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl sm:items-center sm:p-5 animate-fade-in overscroll-contain"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
    >
      <motion.div
        suppressHydrationWarning
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-auto max-h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] sm:rounded-[22px] border border-white/10 bg-[#0b1016]/95 shadow-[0_28px_100px_rgba(0,0,0,0.65)] pointer-events-auto transform-gpu sm:h-[min(82dvh,760px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Search Input Bar (Fixed Header) ── */}
        <div
          suppressHydrationWarning
          className="flex items-center gap-2 sm:gap-3 border-b border-white/[0.08] bg-[#101720]/80 px-3 py-2.5 shrink-0 sm:px-5 sm:py-3.5"
        >
          <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.04] text-emerald-300">
            <Search size={15} strokeWidth={2} className="sm:hidden" />
            <Search size={17} strokeWidth={2} className="hidden sm:block" />
          </span>
          <input
            suppressHydrationWarning
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm phim, đạo diễn, diễn viên..."
            className="min-w-0 flex-1 border-none bg-transparent text-xs font-semibold tracking-wide text-white placeholder:text-white/35 focus:outline-none focus:ring-0 sm:text-base"
          />
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <VoiceSearchButton onResult={(text) => setQuery(text)} />
            {isFetching && (
              <Loader2 size={15} className="animate-spin text-white/50" />
            )}
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition-all hover:scale-[1.02] hover:bg-white/[0.16] active:scale-[0.98] sm:px-3.5 sm:py-1.5 sm:text-xs"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* ── YouTube/Netflix Smart Filter Bar (Fixed Header) ── */}
        <div className="flex shrink-0 flex-col justify-between gap-1.5 overflow-x-auto border-b border-white/[0.06] bg-[#080c11] px-3 py-2 text-xs scrollbar-hide sm:flex-row sm:items-center sm:gap-2.5 sm:px-5 sm:py-3">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-0.5 shrink-0">
            <span className="text-white/40 font-bold text-[9px] sm:text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0 mr-0.5">
              <Filter size={10} className="text-white/50" />
              Lọc:
            </span>

            {[
              { id: "all", label: "Tất cả", count: rawResults.length },
              { id: "series", label: "Phim Bộ", count: seriesCount },
              { id: "single", label: "Phim Lẻ", count: singleCount },
              { id: "hoat-hinh", label: "Hoạt Hình", count: animeCount },
              { id: "actor", label: "Diễn Viên", count: searchedActors.length },
            ].map((tab) => {
              const active = activeTypeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTypeFilter(tab.id as any)}
                  className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 text-[11px] sm:text-xs ${
                    active
                      ? "bg-emerald-400 text-[#06110c] shadow-md shadow-emerald-500/20"
                      : "bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white border border-white/10"
                  }`}
                >
                  <span>{tab.label}</span>
                  {isSearching && tab.count > 0 && (
                    <span
                      className={`text-[9px] sm:text-[10px] px-1 py-0.1 rounded-full ${
                        active
                          ? "bg-[#06110c]/20 text-[#06110c]"
                          : "bg-white/10 text-white/60"
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
          <div className="flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-hide">
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
                  className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                    active
                      ? "bg-white/15 text-emerald-200 border border-emerald-300/30 shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main Scrollable View Area (Smooth Touch & Mouse Scrollable Container) ── */}
        <div
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y bg-[#0b1016] p-2.5 sm:p-5 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-white/5 pointer-events-auto transform-gpu"
        >
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
                  <span className="text-emerald-300 font-extrabold">
                    {debouncedQuery}
                  </span>
                  &rdquo;
                </span>

                {/* Genre Filter Pills in Search Mode */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setSelectedGenreSlug("all")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                      selectedGenreSlug === "all"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
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
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "text-neutral-400 hover:text-white bg-white/5"
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actor Results Section */}
              {searchedActors.length > 0 &&
                activeTypeFilter !== "series" &&
                activeTypeFilter !== "single" &&
                activeTypeFilter !== "hoat-hinh" && (
                  <div className="space-y-2 mb-4 bg-white/[0.02] border border-white/[0.07] p-3.5 rounded-xl">
                    <div className="flex items-center justify-between px-1">
                      <span className="flex items-center gap-1.5 text-xs text-white/80 font-bold uppercase tracking-wider">
                        <User size={14} className="text-white/60" />
                        Diễn viên tìm thấy ({searchedActors.length})
                      </span>
                      <Link
                        href={`/actors?q=${encodeURIComponent(debouncedQuery)}`}
                        onClick={onClose}
                        className="text-[11px] font-medium text-white/40 hover:text-white transition-colors"
                      >
                        Xem tất cả diễn viên →
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {searchedActors.slice(0, 4).map((person: any) => {
                        const profile = tmdbProfile(
                          person.profile_path,
                          "w185",
                        );
                        return (
                          <Link
                            key={person.id}
                            href={`/actors/${person.id}`}
                            onClick={onClose}
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all group"
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-neutral-900 border border-white/10 group-hover:border-white/30">
                              {profile ? (
                                <img
                                  src={profile}
                                  alt={person.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">
                                  {person.name[0]}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-white group-hover:text-white truncate">
                                {person.name}
                              </h4>
                              <p className="text-[10px] text-white/40 truncate">
                                {person.known_for_department || "Diễn viên"}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

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
              ) : uniqueSearchResults.length > 0 ? (
                /* Rich Scrollable Cards Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-4">
                  {uniqueSearchResults.map((film, idx) => {
                    const poster =
                      resolveImageUrl(film.poster_url) ||
                      resolveImageUrl(film.thumb_url);

                    return (
                      <div
                        key={`${film.slug}-${idx}`}
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 text-[11px] text-white/40 font-bold uppercase tracking-wider">
                      <Clock size={13} className="text-white/40" />
                      Tìm kiếm gần đây
                    </span>
                    <button
                      onClick={() => {
                        localStorage.removeItem(HISTORY_KEY);
                        setHistory([]);
                      }}
                      className="text-[11px] text-white/35 hover:text-red-400 transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {history.map((term) => (
                      <div
                        key={term}
                        onClick={() => handleHistoryClick(term)}
                        className="group flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] px-3 py-1 rounded-lg text-xs font-medium text-white/70 hover:text-white cursor-pointer transition-all active:scale-95"
                      >
                        <Clock size={11} className="text-white/30" />
                        <span>{term}</span>
                        <button
                          onClick={(e) => handleRemoveHistory(e, term)}
                          className="opacity-40 group-hover:opacity-100 hover:text-red-400 transition-opacity ml-0.5"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Quick Genre Chips */}
              <div className="space-y-2">
                <span className="flex items-center gap-1.5 text-[11px] text-white/40 font-bold uppercase tracking-wider px-1">
                  <TrendingUp size={13} className="text-white/40" />
                  Chủ đề thịnh hành
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickGenres.map((g) => (
                    <button
                      key={g.slug}
                      onClick={() => {
                        setQuery(g.label);
                        inputRef.current?.focus();
                      }}
                      className="bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.07] px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white transition-all cursor-pointer active:scale-95"
                    >
                      #{g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Movie Suggestions Grid */}
              {uniqueSuggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 text-[11px] text-white/40 font-bold uppercase tracking-wider">
                      <Sparkles size={13} className="text-white/40" />
                      Gợi ý phim hot hôm nay
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {uniqueSuggestions.slice(0, 12).map((film, idx) => {
                      const poster =
                        resolveImageUrl(film.poster_url) ||
                        resolveImageUrl(film.thumb_url);

                      return (
                        <div
                          key={`${film.slug}-${idx}`}
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
