"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Dices,
  Shuffle,
  Play,
  Info,
  Bookmark,
  Check,
  Share2,
  RotateCcw,
  Compass,
  Heart,
  Flame,
  Zap,
  Smile,
  Ghost,
  Sword,
  Brain,
  SlidersHorizontal,
  History,
  Tv,
  Film,
  Star,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { movieApi } from "@/lib/api";
import { FilmItem } from "@/components/film/FilmCard";
import {
  buildUserTasteVector,
  calculateFilmMatchScore,
  rankFilmsByUserTaste,
  UserTasteVector,
} from "@/lib/user-taste-algorithm";
import {
  getAllGuestWatchHistoryEntries,
  guestDataStorage,
} from "@/lib/user-data";
import { cleanMovieDescription } from "@/lib/string-utils";
import { resolveImageUrl } from "@/lib/movie-image-url";
import { useToast } from "@/providers/ToastProvider";
import { useAuthStore } from "@/store/authStore";

// ── Vibe / Mood Options ──────────────────────────────────────────────
interface MoodOption {
  id: string;
  label: string;
  sub: string;
  icon: any;
  color: string;
  bgGlow: string;
  genres: string[];
}

const MOOD_OPTIONS: MoodOption[] = [
  {
    id: "action",
    label: "Hồi Hộp & Gay Cấn",
    sub: "Hành động, Giật gân, Phiêu lưu",
    icon: Zap,
    color: "from-amber-500 to-rose-600",
    bgGlow: "rgba(245, 158, 11, 0.15)",
    genres: ["hanh-dong", "giat-gan", "phieu-luu", "hinh-su"],
  },
  {
    id: "romance",
    label: "Lãng Mạn & Chữa Lành",
    sub: "Tình cảm, Tâm lý, Gia đình",
    icon: Heart,
    color: "from-rose-500 to-pink-500",
    bgGlow: "rgba(244, 63, 94, 0.15)",
    genres: ["tinh-cam", "tam-ly", "gia-dinh"],
  },
  {
    id: "anime",
    label: "Anime & Thế Giới Ảo",
    sub: "Hoạt hình Nhật Bản, Siêu nhiên",
    icon: Sparkles,
    color: "from-purple-500 to-indigo-500",
    bgGlow: "rgba(168, 85, 247, 0.15)",
    genres: ["hoat-hinh", "anime", "than-thoai"],
  },
  {
    id: "comedy",
    label: "Cười Xả Xì-Trét",
    sub: "Hài hước, Học đường, Giải trí nhẹ",
    icon: Smile,
    color: "from-yellow-400 to-orange-500",
    bgGlow: "rgba(234, 179, 8, 0.15)",
    genres: ["hai-huoc", "hoc-duong"],
  },
  {
    id: "mystery",
    label: "Cân Não & Kỳ Bí",
    sub: "Bí ẩn, Trinh thám, Viễn tưởng",
    icon: Brain,
    color: "from-cyan-500 to-blue-600",
    bgGlow: "rgba(6, 182, 212, 0.15)",
    genres: ["bi-an", "khoa-hoc-vien-tuong", "hinh-su"],
  },
  {
    id: "horror",
    label: "Kinh Dị & Ám Ảnh",
    sub: "Rùng rợn, Ma quái, Tâm linh",
    icon: Ghost,
    color: "from-red-600 to-neutral-900",
    bgGlow: "rgba(220, 38, 38, 0.15)",
    genres: ["kinh-di"],
  },
  {
    id: "historical",
    label: "Cổ Trang & Võ Thuật",
    sub: "Kiếm hiệp, Dã sử, Cung đấu",
    icon: Sword,
    color: "from-emerald-500 to-teal-700",
    bgGlow: "rgba(16, 185, 129, 0.15)",
    genres: ["co-trang", "vo-thuat", "lich-su"],
  },
  {
    id: "all",
    label: "Vũ Trụ Bất Ngờ",
    sub: "Không giới hạn - Bất kỳ siêu phẩm nào",
    icon: Dices,
    color: "from-sky-500 via-indigo-500 to-pink-500",
    bgGlow: "rgba(56, 189, 248, 0.15)",
    genres: [],
  },
];

const FORMAT_OPTIONS = [
  { id: "all", label: "Tất cả định dạng" },
  { id: "single", label: "Phim Lẻ (Movie)" },
  { id: "series", label: "Phim Bộ (Series)" },
  { id: "chieu-rap", label: "Chiếu Rạp" },
  { id: "anime", label: "Anime" },
];

const COUNTRY_OPTIONS = [
  { id: "all", label: "Tất cả quốc gia" },
  { id: "han-quoc", label: "Hàn Quốc 🇰🇷" },
  { id: "au-my", label: "Âu Mỹ 🇺🇸" },
  { id: "trung-quoc", label: "Trung Quốc 🇨🇳" },
  { id: "nhat-ban", label: "Nhật Bản 🇯🇵" },
  { id: "viet-nam", label: "Việt Nam 🇻🇳" },
];

const RECENT_ROLLS_STORAGE_KEY = "netphim_random_recent_rolls_v1";

export default function RandomMoviePage() {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();

  // Filters & Options State
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [prioritizeUserTaste, setPrioritizeUserTaste] = useState<boolean>(true);
  const [excludeWatched, setExcludeWatched] = useState<boolean>(true);

  // User Taste Profile Data
  const [tasteVector, setTasteVector] = useState<UserTasteVector | null>(null);
  const [userTopTags, setUserTopTags] = useState<{ tag: string; count: number }[]>([]);
  const [totalWatchedCount, setTotalWatchedCount] = useState<number>(0);

  // Rolling State & Candidates Pool
  const [candidatesPool, setCandidatesPool] = useState<FilmItem[]>([]);
  const [isLoadingPool, setIsLoadingPool] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [rollingCandidate, setRollingCandidate] = useState<FilmItem | null>(null);
  const [selectedFilm, setSelectedFilm] = useState<FilmItem | null>(null);
  const [matchScore, setMatchScore] = useState<number>(95);
  const [showFullDesc, setShowFullDesc] = useState<boolean>(false);

  // Recent Rolls State
  const [recentRolls, setRecentRolls] = useState<FilmItem[]>([]);
  const [isWatchlisted, setIsWatchlisted] = useState<boolean>(false);

  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── 1. Analyze User Taste on Mount ─────────────────────────────────
  useEffect(() => {
    try {
      const vector = buildUserTasteVector();
      setTasteVector(vector);

      const historyEntries = getAllGuestWatchHistoryEntries();
      const watchlist = guestDataStorage.getWatchlist();
      const totalCount = historyEntries.length + watchlist.length;
      setTotalWatchedCount(totalCount);

      // Extract top taste tags
      const genreScores = vector.genreScores;
      const sortedGenres = Object.entries(genreScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([genre, score]) => {
          const labels: Record<string, string> = {
            "hanh-dong": "Hành Động",
            "vien-tuong": "Viễn Tưởng",
            "khoa-hoc-vien-tuong": "Viễn Tưởng",
            "hoat-hinh": "Anime / Hoạt Hình",
            "hai-huoc": "Hài Hước",
            "tinh-cam": "Tình Cảm",
            "kinh-di": "Kinh Dị",
            "tam-ly": "Tâm Lý",
            "co-trang": "Cổ Trang",
            "bi-an": "Bí Ẩn",
          };
          return { tag: labels[genre] || genre, count: score };
        });

      setUserTopTags(sortedGenres);

      // Load recent rolls from sessionStorage
      const savedRolls = sessionStorage.getItem(RECENT_ROLLS_STORAGE_KEY);
      if (savedRolls) {
        try {
          setRecentRolls(JSON.parse(savedRolls));
        } catch {}
      }
    } catch (err) {
      console.error("Taste analysis failed:", err);
    }
  }, [user]);

  // ── 2. Fetch Candidates Pool Based on Filters ──────────────────────
  const fetchCandidates = useCallback(async () => {
    setIsLoadingPool(true);
    try {
      const promises: Promise<any>[] = [];

      // Determine genre requests from mood
      const currentMood = MOOD_OPTIONS.find((m) => m.id === selectedMood);
      const moodGenres = currentMood && currentMood.genres.length > 0 ? currentMood.genres : [];

      if (selectedFormat === "single") {
        promises.push(movieApi.getSingle(1).catch(() => ({ data: { items: [] } })));
        promises.push(movieApi.getSingle(2).catch(() => ({ data: { items: [] } })));
      } else if (selectedFormat === "series") {
        promises.push(movieApi.getSeries(1).catch(() => ({ data: { items: [] } })));
        promises.push(movieApi.getSeries(2).catch(() => ({ data: { items: [] } })));
      } else if (selectedFormat === "anime") {
        promises.push(movieApi.getAnime(1).catch(() => ({ data: { items: [] } })));
        promises.push(movieApi.getAnime(2).catch(() => ({ data: { items: [] } })));
      } else if (selectedFormat === "chieu-rap") {
        promises.push(movieApi.getChieuRap(1).catch(() => ({ data: { items: [] } })));
      } else if (moodGenres.length > 0) {
        // Fetch by mood genres
        moodGenres.slice(0, 2).forEach((g) => {
          promises.push(movieApi.getByGenre(g, 1).catch(() => ({ data: { items: [] } })));
        });
      } else {
        // Broad mix
        promises.push(movieApi.getLatest(1).catch(() => ({ data: { items: [] } })));
        promises.push(movieApi.getSingle(1).catch(() => ({ data: { items: [] } })));
        promises.push(movieApi.getSeries(1).catch(() => ({ data: { items: [] } })));
      }

      // If specific country is chosen
      if (selectedCountry !== "all") {
        promises.push(
          movieApi.getByCountry(selectedCountry, 1).catch(() => ({ data: { items: [] } })),
        );
      }

      const results = await Promise.all(promises);
      const collected: FilmItem[] = [];

      results.forEach((res) => {
        const items =
          res?.data?.items ||
          res?.data?.data?.items ||
          res?.data ||
          [];
        if (Array.isArray(items)) {
          collected.push(...items);
        }
      });

      // Filter by country if country filter selected
      let filtered = collected;
      if (selectedCountry !== "all") {
        filtered = filtered.filter((item) => {
          const countries = Array.isArray(item.country) ? item.country : [];
          return countries.some(
            (c: any) =>
              (c.slug || c.name || "")
                .toLowerCase()
                .includes(selectedCountry.toLowerCase()),
          );
        });
        // If filtered down too much, fallback to collected
        if (filtered.length < 3) {
          filtered = collected;
        }
      }

      // Deduplicate by slug
      const seen = new Set<string>();
      const deduped: FilmItem[] = [];
      for (const item of filtered) {
        if (!item || !item.slug) continue;
        const s = item.slug.toLowerCase();
        if (!seen.has(s)) {
          seen.add(s);
          deduped.push(item);
        }
      }

      setCandidatesPool(deduped);
      return deduped;
    } catch (err) {
      console.error("Failed fetching random candidates:", err);
      return [];
    } finally {
      setIsLoadingPool(false);
    }
  }, [selectedMood, selectedFormat, selectedCountry]);

  // Initial candidate pool fetch on filter changes
  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // ── 3. Check Watchlist State on Selected Film ───────────────────────
  useEffect(() => {
    if (selectedFilm?.slug) {
      setIsWatchlisted(guestDataStorage.isWatchlisted(selectedFilm.slug));
    }
  }, [selectedFilm]);

  // ── 4. The Roll Engine ─────────────────────────────────────────────
  const handleRoll = useCallback(async () => {
    if (isRolling) return;

    let pool = candidatesPool;
    if (pool.length < 5) {
      pool = await fetchCandidates();
    }

    if (!pool.length) {
      toast("Đang tải thêm danh sách phim... Vui lòng bấm lại sau giây lát!", "info");
      return;
    }

    // Filter out watched if excludeWatched is active
    let eligible = pool;
    if (excludeWatched && tasteVector?.watchedSlugs) {
      const unwatched = pool.filter(
        (f) => !tasteVector.watchedSlugs.has(f.slug?.toLowerCase() || ""),
      );
      if (unwatched.length >= 3) {
        eligible = unwatched;
      }
    }

    // Weight candidate pool by user taste if active
    let targetFilm: FilmItem;
    let computedMatch = 92;

    if (prioritizeUserTaste && tasteVector) {
      const ranked = rankFilmsByUserTaste(eligible, tasteVector, false);
      // Pick randomly among top 50% best matches to maintain surprise while respecting taste
      const topHalf = ranked.slice(0, Math.max(3, Math.floor(ranked.length * 0.6)));
      const pick = topHalf[Math.floor(Math.random() * topHalf.length)] || ranked[0];
      targetFilm = pick.film;
      computedMatch = pick.matchPercent || 95;
    } else {
      targetFilm = eligible[Math.floor(Math.random() * eligible.length)];
      if (tasteVector) {
        computedMatch = calculateFilmMatchScore(targetFilm, tasteVector);
      }
    }

    // Start cinematic rolling animation
    setIsRolling(true);
    setShowFullDesc(false);

    let speed = 70;
    let step = 0;
    const totalSteps = 18;

    const tick = () => {
      step++;
      const randomItem = eligible[Math.floor(Math.random() * eligible.length)];
      setRollingCandidate(randomItem);

      if (step < totalSteps) {
        speed += 12; // Slow down effect like a casino wheel
        rollIntervalRef.current = setTimeout(tick, speed);
      } else {
        // Roll finished! Reveal winning film
        setIsRolling(false);
        setSelectedFilm(targetFilm);
        setMatchScore(computedMatch);

        // Update recent rolls
        setRecentRolls((prev) => {
          const next = [targetFilm, ...prev.filter((f) => f.slug !== targetFilm.slug)].slice(0, 10);
          try {
            sessionStorage.setItem(RECENT_ROLLS_STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });

        toast(
          `🎯 Đã tìm thấy: "${targetFilm.name || targetFilm.title}" (Độ phù hợp ${computedMatch}%)!`,
          "success",
        );
      }
    };

    tick();
  }, [
    isRolling,
    candidatesPool,
    fetchCandidates,
    excludeWatched,
    tasteVector,
    prioritizeUserTaste,
    toast,
  ]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) clearTimeout(rollIntervalRef.current);
    };
  }, []);

  // ── Watchlist Toggle ───────────────────────────────────────────────
  const handleToggleWatchlist = () => {
    if (!selectedFilm) return;
    const slug = selectedFilm.slug;
    const movieData = {
      title: selectedFilm.name || selectedFilm.title || "",
      titleEn: selectedFilm.origin_name,
      posterUrl: selectedFilm.poster_url || selectedFilm.thumb_url,
      thumbUrl: selectedFilm.thumb_url || selectedFilm.poster_url,
      type: selectedFilm.type,
      year: selectedFilm.year,
    };

    const isFav = guestDataStorage.toggleFavorite(slug, movieData);
    setIsWatchlisted(isFav);

    toast(
      isFav
        ? `Đã lưu "${selectedFilm.name || selectedFilm.title}" vào tủ phim!`
        : `Đã gỡ "${selectedFilm.name || selectedFilm.title}" khỏi tủ phim`,
      isFav ? "success" : "info",
    );
  };

  // ── Share Action ───────────────────────────────────────────────────
  const handleShare = () => {
    if (!selectedFilm) return;
    const url = `${window.location.origin}/film/${selectedFilm.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast("Đã sao chép liên kết phim vào bộ nhớ tạm!", "success");
    }
  };

  const displayFilm = isRolling ? rollingCandidate : selectedFilm;
  const activeMoodObj = MOOD_OPTIONS.find((m) => m.id === selectedMood);

  return (
    <div
      className={cn(
        "min-h-screen bg-[#0a0b10] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8",
        cardFont.className,
      )}
    >
      <div className="max-w-6xl mx-auto space-y-10">
        {/* ── 1. Page Header ── */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/10">
            <Dices size={15} className="animate-spin-slow" />
            <span>Cỗ Máy Bốc Phim Thông Minh</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Bốc Phim Ngẫu Nhiên{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Theo Sở Thích
            </span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
            Phân vân không biết hôm nay xem gì? Hãy để thuật toán AI phân tích gu phim của bạn hoặc chọn mood cảm xúc hôm nay để bốc ngay một tác phẩm tuyệt vời!
          </p>
        </div>

        {/* ── 2. User Taste AI Radar / Personal Profile ── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl">
          <div className="absolute -right-20 -top-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                    Gu Thưởng Thức Của {user?.displayName || "Bạn"}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 font-extrabold uppercase">
                      AI Taste Vector
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {totalWatchedCount > 0
                      ? `Phân tích từ ${totalWatchedCount} bộ phim bạn đã xem & lưu vào danh sách`
                      : "Dựa trên các thể loại thịnh hành nhất được người xem yêu thích"}
                  </p>
                </div>
              </div>

              {/* Taste Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs font-semibold text-neutral-400">
                  Thể loại chuộng nhất:
                </span>
                {userTopTags.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-neutral-200 hover:border-cyan-500/40 transition-colors"
                  >
                    <TrendingUp size={12} className="text-cyan-400" />
                    {item.tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Preference Toggles */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => setPrioritizeUserTaste(!prioritizeUserTaste)}
                className={cn(
                  "flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all",
                  prioritizeUserTaste
                    ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-lg shadow-cyan-500/10"
                    : "bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-neutral-200",
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center transition-colors",
                      prioritizeUserTaste
                        ? "bg-cyan-500 border-cyan-400 text-black"
                        : "border-neutral-600 bg-transparent",
                    )}
                  >
                    {prioritizeUserTaste && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span>Ưu tiên theo gu của tôi</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExcludeWatched(!excludeWatched)}
                className={cn(
                  "flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all",
                  excludeWatched
                    ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-300"
                    : "bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-neutral-200",
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center transition-colors",
                      excludeWatched
                        ? "bg-indigo-500 border-indigo-400 text-white"
                        : "border-neutral-600 bg-transparent",
                    )}
                  >
                    {excludeWatched && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span>Bỏ qua phim đã xem</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. Mood & Vibe Selector ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Compass size={18} className="text-cyan-400" />
              Chọn Mood / Tâm Trạng Của Bạn
            </h2>
            <span className="text-xs text-neutral-400">
              Chọn 1 vibe để AI điều chỉnh độ ngẫu nhiên
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MOOD_OPTIONS.map((mood) => {
              const Icon = mood.icon;
              const isSelected = selectedMood === mood.id;
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => setSelectedMood(mood.id)}
                  className={cn(
                    "relative p-4 rounded-2xl border text-left transition-all duration-300 group overflow-hidden flex flex-col justify-between h-28",
                    isSelected
                      ? "border-cyan-500/60 bg-white/[0.06] shadow-xl shadow-cyan-500/10 scale-[1.02]"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15]",
                  )}
                  style={
                    isSelected
                      ? {
                          boxShadow: `0 0 25px ${mood.bgGlow}`,
                        }
                      : {}
                  }
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                        isSelected
                          ? `bg-gradient-to-br ${mood.color} text-white shadow-md`
                          : "bg-white/[0.05] text-neutral-300",
                      )}
                    >
                      <Icon size={18} />
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </div>

                  <div>
                    <h4
                      className={cn(
                        "font-bold text-xs sm:text-sm line-clamp-1 transition-colors",
                        isSelected ? "text-cyan-300" : "text-neutral-200",
                      )}
                    >
                      {mood.label}
                    </h4>
                    <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                      {mood.sub}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 4. Secondary Filter Chips (Format & Country) ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.015]">
          {/* Format Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-semibold text-neutral-400 whitespace-nowrap flex items-center gap-1.5 mr-1">
              <Film size={14} className="text-cyan-400" />
              Định dạng:
            </span>
            {FORMAT_OPTIONS.map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setSelectedFormat(fmt.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors",
                  selectedFormat === fmt.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-white/[0.03] text-neutral-400 hover:text-white border border-transparent",
                )}
              >
                {fmt.label}
              </button>
            ))}
          </div>

          {/* Country Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-semibold text-neutral-400 whitespace-nowrap flex items-center gap-1.5 mr-1">
              <Layers size={14} className="text-indigo-400" />
              Quốc gia:
            </span>
            {COUNTRY_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCountry(c.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors",
                  selectedCountry === c.id
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "bg-white/[0.03] text-neutral-400 hover:text-white border border-transparent",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 5. Main Big Rolling Action Button ── */}
        <div className="flex flex-col items-center justify-center pt-2">
          <button
            type="button"
            disabled={isRolling}
            onClick={handleRoll}
            className={cn(
              "group relative inline-flex items-center justify-center gap-3 px-8 sm:px-12 py-4 rounded-full font-black text-base sm:text-lg transition-all duration-300 overflow-hidden shadow-2xl",
              isRolling
                ? "bg-neutral-800 text-neutral-400 cursor-not-allowed scale-95"
                : "bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 text-white hover:scale-105 active:scale-95 shadow-cyan-500/25 hover:shadow-cyan-500/40",
            )}
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />

            <Dices
              size={24}
              className={cn(
                "transition-transform duration-500",
                isRolling ? "animate-spin" : "group-hover:rotate-180",
              )}
            />
            <span>
              {isRolling ? "Đang Quay Số Ngẫu Nhiên..." : "BỐC PHIM NGAY"}
            </span>
            <Sparkles size={20} className="animate-pulse text-amber-300" />
          </button>

          <p className="text-xs text-neutral-400 mt-3 text-center">
            {isRolling
              ? "Thuật toán AI đang lọc các kết quả tương thích nhất..."
              : `Kho phim sẵn sàng: ${candidatesPool.length} phim trong danh mục đã chọn`}
          </p>
        </div>

        {/* ── 6. Spotlight Result Reveal Card ── */}
        {displayFilm ? (
          <div
            className={cn(
              "relative rounded-3xl border overflow-hidden backdrop-blur-2xl transition-all duration-500",
              isRolling
                ? "border-cyan-500/40 bg-white/[0.03] scale-[0.98] blur-[1px]"
                : "border-white/[0.12] bg-[#12141e]/90 shadow-2xl shadow-cyan-950/40",
            )}
          >
            {/* Ambient Background Glow from Movie Poster */}
            {displayFilm.thumb_url && (
              <div
                className="absolute inset-0 opacity-20 filter blur-3xl pointer-events-none bg-cover bg-center transition-all duration-700"
                style={{
                  backgroundImage: `url(${resolveImageUrl(displayFilm.thumb_url, displayFilm.poster_url)})`,
                }}
              />
            )}

            <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-center lg:items-start gap-8">
              {/* Left Column: Movie Poster */}
              <div className="w-48 sm:w-56 lg:w-64 flex-shrink-0 group">
                <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-neutral-900">
                  <Image
                    src={
                      resolveImageUrl(
                        displayFilm.poster_url || displayFilm.thumb_url,
                      ) || "/placeholder.jpg"
                    }
                    alt={displayFilm.name || displayFilm.title || "Film Poster"}
                    fill
                    sizes="(max-width: 640px) 192px, (max-width: 1024px) 224px, 256px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                  {/* Quality & Ep Badge */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/90 text-black text-[10px] font-black uppercase tracking-wider shadow">
                      {displayFilm.quality || "HD"}
                    </span>
                    {displayFilm.lang && (
                      <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold">
                        {displayFilm.lang}
                      </span>
                    )}
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 text-amber-400 text-xs font-black">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span>
                      {displayFilm.imdb_rating ||
                        displayFilm.vote_average ||
                        displayFilm.rating ||
                        "8.5"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Information & Actions */}
              <div className="flex-1 space-y-4 text-center lg:text-left">
                {/* Match Score & Badges */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-black shadow-sm">
                    <Sparkles size={13} />
                    <span>🎯 {matchScore}% Phù Hợp Gu Của Bạn</span>
                  </div>

                  {displayFilm.year && (
                    <span className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-bold text-neutral-300">
                      Năm {displayFilm.year}
                    </span>
                  )}

                  {displayFilm.episode_current && (
                    <span className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-bold text-neutral-300">
                      {displayFilm.episode_current}
                    </span>
                  )}

                  {activeMoodObj && (
                    <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-medium">
                      Mood: {activeMoodObj.label}
                    </span>
                  )}
                </div>

                {/* Movie Titles */}
                <div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                    {displayFilm.name || displayFilm.title}
                  </h2>
                  {displayFilm.origin_name && (
                    <p className="text-sm sm:text-base text-neutral-400 font-medium mt-1">
                      {displayFilm.origin_name}
                    </p>
                  )}
                </div>

                {/* Genres & Countries Tags */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 pt-1">
                  {Array.isArray(displayFilm.category) &&
                    displayFilm.category.map((cat: any, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-neutral-300"
                      >
                        {cat.name || cat}
                      </span>
                    ))}
                  {Array.isArray(displayFilm.country) &&
                    displayFilm.country.map((c: any, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-neutral-300"
                      >
                        {c.name || c}
                      </span>
                    ))}
                </div>

                {/* Synopsis */}
                <div className="text-neutral-300 text-xs sm:text-sm leading-relaxed max-w-3xl pt-2">
                  <p
                    className={cn(
                      "transition-all duration-300",
                      showFullDesc ? "" : "line-clamp-3 sm:line-clamp-4",
                    )}
                  >
                    {cleanMovieDescription(displayFilm.content) ||
                      "Một bộ phim đặc sắc với cốt truyện hấp dẫn và những cảnh quay ấn tượng đang chờ bạn khám phá ngay bây giờ."}
                  </p>
                  {displayFilm.content && displayFilm.content.length > 200 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDesc(!showFullDesc)}
                      className="text-cyan-400 hover:text-cyan-300 font-bold text-xs mt-1.5 inline-block"
                    >
                      {showFullDesc ? "Thu gọn" : "Xem thêm"}
                    </button>
                  )}
                </div>

                {/* Action CTAs */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-4">
                  <Link
                    href={`/watch/${displayFilm.slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95"
                  >
                    <Play size={17} className="fill-black" />
                    <span>Xem Phim Ngay</span>
                  </Link>

                  <Link
                    href={`/film/${displayFilm.slug}`}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white font-bold text-sm transition-all"
                  >
                    <Info size={17} className="text-neutral-400" />
                    <span>Chi Tiết</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleToggleWatchlist}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-3 rounded-2xl border font-bold text-sm transition-all",
                      isWatchlisted
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                        : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-neutral-300",
                    )}
                  >
                    <Bookmark
                      size={17}
                      className={isWatchlisted ? "fill-rose-400 text-rose-400" : ""}
                    />
                    <span>{isWatchlisted ? "Đã Lưu" : "Lưu Phim"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRoll}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-neutral-300 hover:text-white font-bold text-sm transition-all"
                  >
                    <RotateCcw size={16} />
                    <span>Bốc Phim Khác</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-neutral-400 hover:text-white transition-all"
                    title="Chia sẻ liên kết phim"
                  >
                    <Share2 size={17} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Initial State */
          <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-white/[0.1] bg-white/[0.01] space-y-4">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
              <Dices size={28} className="animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Sẵn Sàng Cho Cuộc Phiêu Lưu Điện Ảnh?
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
              Bấm nút <strong className="text-cyan-400">"BỐC PHIM NGAY"</strong> phía trên để thuật toán chọn ngẫu nhiên một siêu phẩm dành riêng cho bạn!
            </p>
          </div>
        )}

        {/* ── 7. Recent Rolls History ("Đã Bốc Gần Đây") ── */}
        {recentRolls.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={18} className="text-indigo-400" />
                <h3 className="font-bold text-white text-base sm:text-lg">
                  Đã Bốc Gần Đây ({recentRolls.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRecentRolls([]);
                  sessionStorage.removeItem(RECENT_ROLLS_STORAGE_KEY);
                }}
                className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Xóa lịch sử bốc
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {recentRolls.map((film) => (
                <div
                  key={film.slug}
                  className="group relative rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] hover:border-cyan-500/40 transition-all duration-300"
                >
                  <div className="relative aspect-[2/3] w-full bg-neutral-900">
                    <Image
                      src={
                        resolveImageUrl(film.poster_url || film.thumb_url) ||
                        "/placeholder.jpg"
                      }
                      alt={film.name || film.title || ""}
                      fill
                      sizes="(max-width: 640px) 150px, 200px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-black text-cyan-300 border border-white/10">
                      {film.quality || "HD"}
                    </div>

                    <Link
                      href={`/watch/${film.slug}`}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]"
                    >
                      <div className="w-10 h-10 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play size={16} className="fill-black ml-0.5" />
                      </div>
                    </Link>
                  </div>

                  <div className="p-2.5 space-y-1">
                    <Link
                      href={`/film/${film.slug}`}
                      className="font-bold text-xs text-white line-clamp-1 group-hover:text-cyan-300 transition-colors"
                    >
                      {film.name || film.title}
                    </Link>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span>{film.year || "Phim Mới"}</span>
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <Star size={10} className="fill-amber-400" />
                        {film.imdb_rating || film.vote_average || "8.5"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
