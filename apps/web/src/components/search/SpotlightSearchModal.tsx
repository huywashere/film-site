"use client";

import { useState, useEffect, useRef, useMemo, startTransition } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { movieApi } from "@/lib/api";
import { tmdbProfile } from "@/lib/tmdb";
import { resolveImageUrl, FilmItem } from "@/components/film/FilmCard";
import { useTmdbArtwork } from "@/hooks/useTmdbArtwork";
import { VoiceSearchButton } from "@/components/search/VoiceSearchButton";
import { cardFont } from "@/lib/fonts";

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

function filmIdentity(film: FilmItem): string {
  if (film._canonicalKey) return film._canonicalKey;
  if (film.tmdb?.id) return `tmdb:${film.tmdb.type || film.type}:${film.tmdb.id}`;
  const title = removeAccents(film.origin_name || film.name || film.slug);
  return `${title}:${film.year || ""}`;
}

function SearchCardImage({ film }: { film: FilmItem }) {
  const initialPoster =
    resolveImageUrl(film.poster_url, film.thumb_url) ||
    resolveImageUrl(film.thumb_url);

  const [imgSrc, setImgSrc] = useState<string | null>(initialPoster);

  const { posterUrl: tmdbPosterUrl, backdropUrl: tmdbBackdropUrl } = useTmdbArtwork(
    film,
    !imgSrc || imgSrc.startsWith("/api/image-proxy"),
  );

  const preferredTmdb = tmdbPosterUrl || tmdbBackdropUrl;

  useEffect(() => {
    if (initialPoster) {
      setImgSrc(initialPoster);
    } else if (preferredTmdb) {
      setImgSrc(preferredTmdb);
    }
  }, [initialPoster, preferredTmdb]);

  useEffect(() => {
    if (preferredTmdb && (!imgSrc || imgSrc.startsWith("/api/image-proxy"))) {
      setImgSrc(preferredTmdb);
    }
  }, [preferredTmdb, imgSrc]);

  if (!imgSrc) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-b from-neutral-800 to-black">
        <Clapperboard size={28} className="text-amber-500/80 mb-1" />
        <span className="text-[10px] font-bold text-white line-clamp-2 leading-tight">
          {film.name || film.title}
        </span>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={imgSrc}
      alt={film.name || film.title || "Poster"}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      onError={() => {
        if (preferredTmdb && imgSrc !== preferredTmdb) {
          setImgSrc(preferredTmdb);
        } else if (imgSrc && !imgSrc.startsWith("/api/image-proxy")) {
          setImgSrc(`/api/image-proxy?url=${encodeURIComponent(imgSrc)}`);
        } else {
          setImgSrc(null);
        }
      }}
    />
  );
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
      <mark className="bg-white/10 font-extrabold not-italic text-white">
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

  // A short debounce prevents one request per keystroke without feeling delayed.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(t);
  }, [query]);

  // The API already performs canonical multi-source dedupe and relevance ranking.
  const { data: searchData, isFetching } = useQuery({
    queryKey: ["spotlight-search-fast", debouncedQuery],
    queryFn: () => movieApi.search(debouncedQuery, 1, 24).then((r) => r.data),
    enabled: mounted && debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: false,
    refetchOnWindowFocus: false,
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
    enabled:
      mounted &&
      activeTypeFilter === "actor" &&
      debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 10,
    retry: false,
    refetchOnWindowFocus: false,
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

  // Preserve the server ranking, then apply only the selected facets locally.
  const sortedAndFilteredResults = useMemo(() => {
    if (debouncedQuery.trim().length < 2 || activeTypeFilter === "actor") {
      return [];
    }

    return rawResults.filter((film) => {
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
      });
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
      const identity = filmIdentity(film);
      if (seen.has(identity)) return false;
      seen.add(identity);
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

  const isSearching = debouncedQuery.trim().length >= 2;
  const isQueryTooShort = query.trim().length === 1;

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

  const handleGoToSearchPage = (searchQuery?: string) => {
    const targetQuery = (searchQuery !== undefined ? searchQuery : query).trim();
    if (!targetQuery) return;
    saveHistory(targetQuery);
    onClose();
    router.push(`/search?q=${encodeURIComponent(targetQuery)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      // The spotlight input must never bubble an Enter press into any auth
      // form mounted elsewhere in the app shell.
      e.preventDefault();
      e.stopPropagation();
      handleGoToSearchPage();
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
      className={`${cardFont.className} fixed inset-0 z-[100] flex items-start justify-center bg-[#08090b]/80 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:items-center sm:p-5 animate-fade-in overscroll-contain`}
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
    >
      <motion.div
        suppressHydrationWarning
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-auto flex h-auto max-h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111317] shadow-[0_28px_80px_rgba(0,0,0,0.45)] transform-gpu sm:h-[min(82dvh,760px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Search Input Bar (Fixed Header) ── */}
        <div
          suppressHydrationWarning
          className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#111317] px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3.5"
        >
          <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300">
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
            className="min-w-0 flex-1 border-none bg-transparent text-xs font-medium text-white placeholder:text-neutral-500 focus:outline-none focus:ring-0 sm:text-base"
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
            {query.trim() && (
              <button
                onClick={() => handleGoToSearchPage()}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-white text-black px-3 text-[11px] font-extrabold shadow-sm transition-all hover:bg-neutral-200 active:scale-[0.98] sm:px-3.5 sm:text-xs cursor-pointer shrink-0"
              >
                <Filter size={13} />
                <span>Bộ Lọc</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] px-3 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-white/[0.16] active:scale-[0.98] sm:px-3.5 sm:text-xs cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* ── YouTube/Netflix Smart Filter Bar (Fixed Header) ── */}
        <div className="flex shrink-0 flex-col justify-between gap-1.5 overflow-x-auto border-b border-white/10 bg-[#0d0f12] px-3 py-2 text-xs scrollbar-hide sm:flex-row sm:items-center sm:gap-2.5 sm:px-5 sm:py-3">
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
                  onClick={() =>
                    startTransition(() => setActiveTypeFilter(tab.id as any))
                  }
                  className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 text-[11px] sm:text-xs ${
                    active
                      ? "border border-white bg-white text-[#111317]"
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

        {/* ── Main Scrollable View Area (Smooth Touch & Mouse Scrollable Container) ── */}
        <div
          onWheel={(e) => e.stopPropagation()}
          className="pointer-events-auto min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain bg-[#0d0f12] p-2.5 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/30 transform-gpu sm:p-5"
        >
          {/* ── SEARCH MODE ── */}
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
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 border-b border-white/5 pb-3">
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
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#15181d] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-white/30"
                      >
                        {/* Poster Image */}
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                          <SearchCardImage film={film} />

                          {/* Episode / Quality Badges */}
                          <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10">
                            {film.episode_current && (
                              <span className="rounded-md border border-white/15 bg-[#111317]/90 px-2 py-0.5 text-[9px] font-bold text-white">
                                {film.episode_current}
                              </span>
                            )}
                            {film.lang && (
                              <span className="rounded border border-white/20 bg-[#111317]/90 px-1.5 py-0.5 text-[9px] font-bold text-white/90">
                                {film.lang}
                              </span>
                            )}
                          </div>

                          {/* Hover Play Icon Overlay */}
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="flex h-10 w-10 scale-75 items-center justify-center rounded-full bg-white text-[#111317] transition-transform group-hover:scale-100">
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
                      className="text-[11px] text-white/35 transition-colors hover:text-white"
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
                          className="ml-0.5 opacity-40 transition-opacity hover:text-white group-hover:opacity-100"
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
                          className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#15181d] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-white/30"
                        >
                          <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                            {poster && (
                              <NextImage
                                src={poster}
                                alt={film.name}
                                fill
                                sizes="(max-width: 640px) 40vw, 180px"
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                unoptimized
                              />
                            )}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#111317]">
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
