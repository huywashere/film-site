"use client";

import { useState, useEffect, useRef, useMemo, startTransition } from "react";
import Link from "next/link";
import NextImage from "next/image";
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
  Sparkles,
  User,
  Maximize2,
  Minimize2,
  Film,
  ArrowRight,
} from "lucide-react";
import { movieApi } from "@/lib/api";
import { tmdbProfile } from "@/lib/tmdb";
import { resolveImageUrl, FilmItem } from "@/components/film/FilmCard";
import { TmdbArtwork } from "@/components/film/TmdbArtwork";
import { VoiceSearchButton } from "@/components/search/VoiceSearchButton";
import { cardFont } from "@/lib/fonts";
import { searchLocalFilms } from "@/lib/smart-search";
import { parseSearchIntent } from "@/lib/search-query-parser";
import { isIMEQuery, normalizeForSearch } from "@/lib/text-utils";
import { useReliableNavigation } from "@/hooks/useReliableNavigation";

// ── Local storage helpers ─────────────────────────────────────────
const HISTORY_KEY = "netphim-search-history";
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

function filmIdentity(film: FilmItem): string {
  if (film._canonicalKey) return film._canonicalKey;
  if (film.tmdb?.id)
    return `tmdb:${film.tmdb.type || film.type}:${film.tmdb.id}`;
  const origin = normalizeForSearch(film.origin_name || "");
  const name = normalizeForSearch(film.name || "");
  const slug = normalizeForSearch(film.slug || "");
  const title = origin || name || slug;
  return `${title}:${film.year || ""}`;
}

function filmSlugIdentity(film: FilmItem): string {
  return normalizeForSearch(film.slug || "");
}

function SearchCardImage({ film }: { film: FilmItem }) {
  return (
    <TmdbArtwork
      film={film}
      kind="poster"
      priority={true}
      className="absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-105"
      alt={film.name || film.title || "Poster"}
    />
  );
}

// ── Highlight matching text ───────────────────────────────────────
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
      <mark className="bg-amber-400/20 text-amber-300 font-extrabold not-italic rounded px-0.5">
        {match}
      </mark>
      {after}
    </span>
  );
}

function SmartIntentChips({
  intent,
  visible,
}: {
  intent: ReturnType<typeof parseSearchIntent>;
  visible: boolean;
}) {
  if (!visible || !intent.hasStructuredIntent) return null;
  const hasItems = Boolean(
    intent.extractedYear ||
      intent.extractedSeason !== undefined ||
      intent.extractedAudio ||
      intent.extractedType ||
      (intent.baseQuery && intent.baseQuery !== intent.cleanQuery),
  );
  if (!hasItems) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500/10 via-white/[0.03] to-transparent border-b border-white/[0.06]">
      <span className="text-[10px] font-semibold text-neutral-400 flex items-center gap-1 shrink-0">
        <Sparkles size={11} className="text-amber-400 animate-pulse" />
        Ý định:
      </span>
      {intent.extractedYear && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
          Năm {intent.extractedYear}
        </span>
      )}
      {intent.extractedSeason !== undefined && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-400/15 text-sky-300 border border-sky-400/30">
          Phần {intent.extractedSeason}
        </span>
      )}
      {intent.extractedAudio && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
          {intent.extractedAudio === "thuyet-minh"
            ? "Thuyết Minh"
            : intent.extractedAudio === "long-tieng"
              ? "Lồng Tiếng"
              : "Vietsub"}
        </span>
      )}
      {intent.extractedType && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-400/15 text-purple-300 border border-purple-400/30">
          {intent.extractedType === "series"
            ? "Phim Bộ"
            : intent.extractedType === "single"
              ? "Phim Lẻ"
              : "Hoạt Hình"}
        </span>
      )}
      {intent.baseQuery && intent.baseQuery !== intent.cleanQuery && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.06] text-neutral-300 border border-white/[0.1]">
          Từ khóa: {intent.baseQuery}
        </span>
      )}
    </div>
  );
}

// ── Main SpotlightSearchModal with Dual View Mode (Compact Popover & Full Modal) ──
export function SpotlightSearchModal({
  isOpen,
  onClose,
  suggestions = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  suggestions?: FilmItem[];
}) {
  const navigation = useReliableNavigation();
  const [viewMode, setViewMode] = useState<"compact" | "expanded">("compact");
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
      setViewMode("compact"); // Default to compact mode on open
      setActiveTypeFilter("all");
      setActiveLangFilter("all");
      setSelectedGenreSlug("all");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, mounted]);

  // Session cache để phục hồi kết quả 0ms khi backspace hoặc gõ lại từ khóa
  const searchCacheRef = useRef<Map<string, FilmItem[]>>(new Map());
  const parsedIntent = useMemo(() => parseSearchIntent(query), [query]);

  // IME-aware debounce: 50ms cho Latin, 110ms cho tiếng Việt/CJK
  // Tối ưu tốc độ phản hồi cực nhanh, không gây lag gõ Telex
  useEffect(() => {
    const debounceDelay = isIMEQuery(query) ? 110 : 50;
    const t = setTimeout(() => setDebouncedQuery(query), debounceDelay);
    return () => clearTimeout(t);
  }, [query]);

  // 0ms Instant Local Pre-Search (Immediate response while remote fetch is running)
  const instantLocalResults = useMemo(() => {
    if (query.trim().length < 1) return [];
    return searchLocalFilms(query, suggestions);
  }, [query, suggestions]);

  // Movie Search API (Remote fetch)
  const { data: searchData, isFetching: isSearchingMovies } = useQuery({
    queryKey: ["spotlight-search-fast", debouncedQuery],
    queryFn: () => movieApi.search(debouncedQuery, 1, 24).then((r) => r.data),
    enabled: mounted && debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Actor Search API (Search people via TMDB API for both compact and expanded modes)
  const { data: actorSearchData, isFetching: isSearchingActors } = useQuery({
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
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isFetching =
    (isSearchingMovies || isSearchingActors) &&
    instantLocalResults.length === 0;

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

  const remoteResults: FilmItem[] = useMemo(
    () => searchData?.data?.items || [],
    [searchData],
  );

  // Lưu cache phiên tìm kiếm
  useEffect(() => {
    const key = debouncedQuery.trim().toLowerCase();
    if (key && remoteResults.length > 0) {
      searchCacheRef.current.set(key, remoteResults);
    }
  }, [debouncedQuery, remoteResults]);

  // Seamless merge of remote, session cache and instant local results with intelligent deduplication
  const rawResults: FilmItem[] = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    const seenIdentities = new Set<string>();
    const seenSlugs = new Set<string>();
    const merged: FilmItem[] = [];

    const appendUnique = (item: FilmItem) => {
      if (!item?.slug) return;
      const identity = filmIdentity(item);
      const slugIdentity = filmSlugIdentity(item);
      if (
        seenIdentities.has(identity) ||
        (slugIdentity && seenSlugs.has(slugIdentity))
      ) {
        return;
      }
      seenIdentities.add(identity);
      if (slugIdentity) seenSlugs.add(slugIdentity);
      merged.push(item);
    };

    // 1. Ưu tiên kết quả từ Remote API của debounced query hiện tại
    for (const item of remoteResults) {
      appendUnique(item);
    }

    // 2. Tra cứu cache phiên tức thì nếu có (0ms phản hồi)
    const cached =
      searchCacheRef.current.get(trimmed) ||
      (parsedIntent.baseQuery
        ? searchCacheRef.current.get(parsedIntent.baseQuery.toLowerCase())
        : undefined);
    if (cached) {
      for (const item of cached) {
        appendUnique(item);
      }
    }

    // 3. Hợp nhất kho kết quả tức thì (0ms)
    for (const item of instantLocalResults) {
      appendUnique(item);
    }

    return merged;
  }, [remoteResults, instantLocalResults, query, parsedIntent.baseQuery]);

  // Apply filters in expanded mode
  const sortedAndFilteredResults = useMemo(() => {
    if (!query.trim() || activeTypeFilter === "actor") {
      return [];
    }

    return rawResults.filter((film) => {
      // Type filter
      if (activeTypeFilter === "series" && film.type !== "series") return false;
      if (activeTypeFilter === "single" && film.type !== "single") return false;
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
    });
  }, [
    rawResults,
    query,
    activeTypeFilter,
    activeLangFilter,
    selectedGenreSlug,
  ]);

  const uniqueSearchResults = useMemo(() => {
    const seenIdentities = new Set<string>();
    const seenSlugs = new Set<string>();
    return sortedAndFilteredResults.filter((film) => {
      if (!film || !film.slug) return false;
      const identity = filmIdentity(film);
      const slugIdentity = filmSlugIdentity(film);
      if (
        seenIdentities.has(identity) ||
        (slugIdentity && seenSlugs.has(slugIdentity))
      ) {
        return false;
      }
      seenIdentities.add(identity);
      if (slugIdentity) seenSlugs.add(slugIdentity);
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

  const activeQuery = query.trim();
  const isSearching = activeQuery.length > 0;
  const isQueryTooShort =
    activeQuery.length === 1 && uniqueSearchResults.length === 0 && !isFetching;

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
    navigation.push(`/film/${slug}`);
  };

  const handleGoToSearchPage = (searchQuery?: string) => {
    const targetQuery = (
      searchQuery !== undefined ? searchQuery : query
    ).trim();
    if (!targetQuery) return;
    saveHistory(targetQuery);
    onClose();
    navigation.push(`/search?q=${encodeURIComponent(targetQuery)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      e.stopPropagation();
      handleGoToSearchPage();
    }
  };

  // Global ESC handler & Body Scroll Lock when expanded
  useEffect(() => {
    if (!isOpen) return;

    if (viewMode === "expanded") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [isOpen, viewMode, onClose]);

  if (!mounted || !isOpen) return null;

  /* ════════════════════════════════════════════════════════════
      MODE 1: COMPACT VIEW (FORM NHỎ - NO BACKGROUND BLUR/DIM)
  ════════════════════════════════════════════════════════════ */
  if (viewMode === "compact") {
    return (
      <div
        suppressHydrationWarning
        className={`${cardFont.className} fixed inset-0 z-[100] pointer-events-none overscroll-contain`}
      >
        {/* Invisible backdrop for click-outside to close - NO blur, NO opacity */}
        <div
          className="absolute inset-0 pointer-events-auto bg-transparent"
          onClick={onClose}
        />

        {/* Floating Compact Search Popover anchored at top right under Navbar search */}
        <motion.div
          suppressHydrationWarning
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.12 }}
          className="pointer-events-auto absolute top-14 right-3 sm:right-6 lg:right-10 w-[calc(100vw-24px)] max-w-[420px] max-h-[82vh] flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Search Input Header */}
          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#141414] px-3.5 py-3">
            <Search size={16} className="text-neutral-400 shrink-0" />
            <input
              suppressHydrationWarning
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm kiếm phim, diễn viên..."
              className="min-w-0 flex-1 border-none bg-transparent text-xs sm:text-sm font-medium text-white placeholder:text-neutral-500 focus:outline-none focus:ring-0"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <VoiceSearchButton onResult={(text) => setQuery(text)} />
              {isFetching && (
                <Loader2 size={14} className="animate-spin text-white/50" />
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}

              {/* Expand to full modal button */}
              <button
                type="button"
                onClick={() => setViewMode("expanded")}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-neutral-300 hover:bg-white/[0.1] hover:text-white transition-all cursor-pointer"
                title="Mở rộng giao diện tìm kiếm"
              >
                <Maximize2 size={13} />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.06] px-2 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/[0.12] hover:text-white cursor-pointer"
                aria-label="Đóng"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Smart Intent Chips */}
          <SmartIntentChips intent={parsedIntent} visible={isSearching} />

          {/* Compact Results Scroll Area */}
          <div
            onWheel={(e) => e.stopPropagation()}
            className="pointer-events-auto min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain bg-[#141414] p-2.5 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20"
          >
            {isQueryTooShort ? (
              <div className="flex min-h-24 flex-col items-center justify-center gap-1 text-center text-neutral-400 p-3">
                <Search size={16} className="text-neutral-500 mb-0.5" />
                <p className="text-xs font-medium">
                  Nhập thêm một ký tự để tìm kiếm...
                </p>
              </div>
            ) : isSearching ? (
              <div className="space-y-3">
                {/* ── Section: PHIM ── */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      Phim{" "}
                      {uniqueSearchResults.length > 0 &&
                        `(${uniqueSearchResults.length})`}
                    </span>
                  </div>

                  {uniqueSearchResults.length === 0 && !isFetching ? (
                    <p className="text-xs text-neutral-500 px-2 py-2">
                      Không tìm thấy phim phù hợp.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {uniqueSearchResults.slice(0, 6).map((film) => (
                        <div
                          key={filmIdentity(film)}
                          onClick={() => handleSelectMovie(film.slug)}
                          className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.06] cursor-pointer"
                        >
                          <div className="relative w-11 h-16 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-neutral-900">
                            <SearchCardImage film={film} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-xs sm:text-sm font-bold text-neutral-200 group-hover:text-white transition-colors">
                              <HighlightMatch
                                text={film.name || film.title || ""}
                                query={debouncedQuery}
                              />
                            </h4>
                            <p className="truncate text-[11px] text-neutral-400 mt-0.5">
                              {film.origin_name || film.name}
                            </p>
                            <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                              {film.year || 2026} •{" "}
                              {film.episode_current ||
                                (film.type === "series" ? "Phim Bộ" : "Full")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Section: DIỄN VIÊN ── */}
                {searchedActors.length > 0 && (
                  <div className="space-y-1 pt-2.5 border-t border-white/[0.08]">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        Diễn Viên ({searchedActors.length})
                      </span>
                    </div>

                    <div className="space-y-1">
                      {searchedActors.slice(0, 3).map((person: any) => {
                        const profile = tmdbProfile(
                          person.profile_path,
                          "w185",
                        );
                        return (
                          <Link
                            key={person.id}
                            href={`/actors/${person.id}`}
                            onClick={onClose}
                            className="group flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-white/[0.06] cursor-pointer"
                          >
                            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/[0.08] bg-neutral-900">
                              {profile ? (
                                <NextImage
                                  src={profile}
                                  alt={person.name}
                                  fill
                                  sizes="36px"
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white/40">
                                  {person.name[0]}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="truncate text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                <HighlightMatch
                                  text={person.name}
                                  query={debouncedQuery}
                                />
                              </h5>
                              <p className="truncate text-[10px] text-neutral-400 mt-0.5">
                                {person.known_for_department || "Diễn viên"}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Compact Bottom Expand Action ── */}
                {uniqueSearchResults.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setViewMode("expanded")}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs font-bold text-neutral-300 hover:text-white transition-all cursor-pointer"
                    >
                      <Maximize2 size={12} />
                      <span>
                        Xem toàn bộ kết quả ({uniqueSearchResults.length})
                      </span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Compact Idle Mode (History & Quick Topics) ── */
              <div className="space-y-3.5 p-1">
                {history.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
                        <Clock size={11} />
                        Tìm kiếm gần đây
                      </span>
                      <button
                        onClick={() => {
                          localStorage.removeItem(HISTORY_KEY);
                          setHistory([]);
                        }}
                        className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                      >
                        Xóa tất cả
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {history.slice(0, 6).map((term) => (
                        <div
                          key={term}
                          onClick={() => handleHistoryClick(term)}
                          className="group flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white cursor-pointer transition-all"
                        >
                          <Clock size={10} className="text-neutral-500" />
                          <span>{term}</span>
                          <button
                            onClick={(e) => handleRemoveHistory(e, term)}
                            className="text-neutral-500 hover:text-white transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
                    <TrendingUp size={11} />
                    Chủ đề hot
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickGenres.slice(0, 6).map((g) => (
                      <button
                        key={g.slug}
                        onClick={() => {
                          setQuery(g.label);
                          inputRef.current?.focus();
                        }}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white transition-all cursor-pointer"
                      >
                        #{g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setViewMode("expanded")}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-xs font-semibold text-neutral-400 hover:text-white transition-all cursor-pointer"
                  >
                    <Maximize2 size={12} />
                    <span>Mở rộng tìm kiếm nâng cao</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
      MODE 2: EXPANDED VIEW (FORM TO - FULL GRID MODAL)
  ════════════════════════════════════════════════════════════ */
  return (
    <div
      suppressHydrationWarning
      className={`${cardFont.className} fixed inset-0 z-[100] flex items-start justify-center p-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:items-center sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overscroll-contain`}
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
    >
      <motion.div
        suppressHydrationWarning
        initial={{ opacity: 0, scale: 0.98, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -8 }}
        transition={{ duration: 0.16 }}
        className="pointer-events-auto flex h-auto max-h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141414] shadow-[0_28px_80px_rgba(0,0,0,0.9)] transform-gpu sm:h-[min(82dvh,760px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <div
          suppressHydrationWarning
          className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#141414] px-3.5 py-3 sm:px-5 sm:py-3.5"
        >
          <Search size={17} className="text-neutral-400 shrink-0" />
          <input
            suppressHydrationWarning
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm phim, đạo diễn, diễn viên..."
            className="min-w-0 flex-1 border-none bg-transparent text-xs sm:text-base font-medium text-white placeholder:text-neutral-500 focus:outline-none focus:ring-0"
          />
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <VoiceSearchButton onResult={(text) => setQuery(text)} />
            {isFetching && (
              <Loader2 size={15} className="animate-spin text-white/50" />
            )}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}

            {/* Minimize button back to compact view */}
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-neutral-300 hover:bg-white/[0.1] hover:text-white transition-all cursor-pointer"
              title="Thu nhỏ giao diện tìm kiếm"
            >
              <Minimize2 size={14} />
            </button>

            {query.trim() && (
              <button
                type="button"
                onClick={() => handleGoToSearchPage()}
                className="flex h-8 sm:h-9 items-center gap-1.5 rounded-xl bg-white text-black px-3 text-[11px] sm:text-xs font-extrabold shadow-sm transition-all hover:bg-neutral-200 active:scale-[0.98] cursor-pointer shrink-0"
              >
                <Filter size={12} />
                <span>Bộ Lọc</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 sm:h-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] px-3 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/[0.12] hover:text-white active:scale-[0.98] cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Smart Intent Chips */}
        <SmartIntentChips intent={parsedIntent} visible={isSearching} />

        {/* Filter Bar */}
        <div className="flex shrink-0 flex-col justify-between gap-1.5 overflow-x-auto border-b border-white/[0.08] bg-[#141414] px-3 py-2 text-xs scrollbar-hide sm:flex-row sm:items-center sm:gap-2.5 sm:px-5 sm:py-3">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-0.5 shrink-0">
            <span className="text-neutral-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0 mr-0.5">
              <Filter size={10} className="text-neutral-500" />
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
                  onClick={() =>
                    startTransition(() => setActiveTypeFilter(tab.id as any))
                  }
                  className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 text-[11px] sm:text-xs ${
                    active
                      ? "border border-white bg-white text-black"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.08]"
                  }`}
                >
                  <span>{tab.label}</span>
                  {isSearching && tab.count > 0 && (
                    <span
                      className={`text-[9px] sm:text-[10px] px-1 py-0.1 rounded-full ${
                        active
                          ? "bg-black/20 text-black font-extrabold"
                          : "bg-white/10 text-white/70"
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
                      ? "bg-white/12 text-white border border-white/25"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Scrollable View Area */}
        <div
          onWheel={(e) => e.stopPropagation()}
          className="pointer-events-auto relative z-0 min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain bg-[#141414] p-3 sm:p-5 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20"
        >
          {isQueryTooShort ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-6 text-center">
              <Search size={22} className="text-neutral-500" />
              <p className="text-sm font-semibold text-neutral-200">
                Nhập thêm một ký tự để tìm chính xác hơn
              </p>
              <p className="text-xs text-neutral-500">
                Tìm kiếm bắt đầu từ hai ký tự để giảm truy vấn không cần thiết.
              </p>
            </div>
          ) : isSearching ? (
            <div className="space-y-4">
              {/* Result Stats & Genre Filter Chips */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 border-b border-white/[0.08] pb-3">
                <span className="text-xs font-bold text-neutral-400">
                  Tìm thấy{" "}
                  <strong className="text-white font-extrabold text-sm">
                    {sortedAndFilteredResults.length}
                  </strong>{" "}
                  kết quả cho &ldquo;
                  <span className="font-extrabold text-white">
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
                        ? "bg-white/12 text-white border border-white/25"
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
                            ? "bg-white/12 text-white border border-white/25"
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
                  <div className="space-y-2 mb-4 bg-white/[0.02] border border-white/[0.08] p-3.5 rounded-xl">
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
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all group"
                          >
                            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-neutral-900 border border-white/10 group-hover:border-white/30">
                              {profile ? (
                                <NextImage
                                  src={profile}
                                  alt={person.name}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                  unoptimized
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
                              <p className="text-[10px] text-neutral-400 truncate">
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
                      className="aspect-[2/3] rounded-2xl bg-white/5 animate-pulse border border-white/[0.08]"
                    />
                  ))}
                </div>
              ) : uniqueSearchResults.length > 0 ? (
                /* Rich Scrollable Cards Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-4">
                  {uniqueSearchResults.map((film) => (
                    <div
                      key={filmIdentity(film)}
                      onClick={() => handleSelectMovie(film.slug)}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.04]"
                    >
                      {/* Strictly bound Poster Image Container */}
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-xl bg-neutral-900">
                        <SearchCardImage film={film} />

                        {/* Episode / Quality Badges */}
                        <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10">
                          {film.episode_current && (
                            <span className="rounded-md border border-white/15 bg-[#141414]/90 px-2 py-0.5 text-[9px] font-bold text-white">
                              {film.episode_current}
                            </span>
                          )}
                          {film.lang && (
                            <span className="rounded border border-white/20 bg-[#141414]/90 px-1.5 py-0.5 text-[9px] font-bold text-white/90">
                              {film.lang}
                            </span>
                          )}
                        </div>

                        {/* Hover Play Icon Overlay */}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="flex h-10 w-10 scale-75 items-center justify-center rounded-full bg-white text-black transition-transform group-hover:scale-100">
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
                        <h3 className="line-clamp-1 text-xs font-bold text-white">
                          <HighlightMatch
                            text={film.name || film.title || ""}
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
                  ))}
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/[0.08] flex items-center justify-center">
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
                      className="text-[11px] text-white/35 transition-colors hover:text-white cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {history.map((term) => (
                      <div
                        key={term}
                        onClick={() => handleHistoryClick(term)}
                        className="group flex items-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] px-3 py-1 rounded-lg text-xs font-medium text-neutral-300 hover:text-white cursor-pointer transition-all active:scale-95"
                      >
                        <Clock size={11} className="text-white/30" />
                        <span>{term}</span>
                        <button
                          onClick={(e) => handleRemoveHistory(e, term)}
                          className="ml-0.5 opacity-40 transition-opacity hover:text-white group-hover:opacity-100 cursor-pointer"
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
                      className="bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95"
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
                      return (
                        <div
                          key={`${film.slug}-${idx}`}
                          onClick={() => handleSelectMovie(film.slug)}
                          className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.04]"
                        >
                          <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                            <SearchCardImage film={film} />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black">
                                <Play
                                  size={14}
                                  fill="currentColor"
                                  className="ml-0.5"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="p-2.5 space-y-0.5">
                            <h4 className="line-clamp-1 text-xs font-bold text-white">
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
