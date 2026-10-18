"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shuffle,
  Sparkles,
  Play,
  Info,
  Bookmark,
  Share2,
  RotateCcw,
  Zap,
  Heart,
  Smile,
  Ghost,
  Brain,
  Layers,
  Star,
  Film,
  TrendingUp,
  Check,
} from "lucide-react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmCardSkeleton,
  FilmItem,
} from "@/components/film/FilmCard";
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

// ── Tab phân loại Mood / Vibe (Phong cách đơn giản, chuyên nghiệp) ────
interface MoodTab {
  id: string;
  label: string;
  icon: any;
  genres: string[];
}

const MOOD_TABS: MoodTab[] = [
  {
    id: "taste",
    label: "Theo Gu Của Bạn",
    icon: Sparkles,
    genres: [],
  },
  {
    id: "all",
    label: "Bất Kỳ Siêu Phẩm",
    icon: Shuffle,
    genres: [],
  },
  {
    id: "action",
    label: "Hành Động & Gay Cấn",
    icon: Zap,
    genres: ["hanh-dong", "giat-gan", "phieu-luu", "hinh-su"],
  },
  {
    id: "romance",
    label: "Tình Cảm & Lãng Mạn",
    icon: Heart,
    genres: ["tinh-cam", "tam-ly", "gia-dinh"],
  },
  {
    id: "anime",
    label: "Anime & Hoạt Hình",
    icon: Layers,
    genres: ["hoat-hinh", "anime"],
  },
  {
    id: "comedy",
    label: "Hài Hước & Thư Giãn",
    icon: Smile,
    genres: ["hai-huoc", "hoc-duong"],
  },
  {
    id: "mystery",
    label: "Bí Ẩn & Viễn Tưởng",
    icon: Brain,
    genres: ["bi-an", "khoa-hoc-vien-tuong", "hinh-su"],
  },
  {
    id: "horror",
    label: "Kinh Dị & Rùng Rợn",
    icon: Ghost,
    genres: ["kinh-di"],
  },
];

const CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "series", label: "Phim Bộ" },
  { id: "single", label: "Phim Lẻ" },
  { id: "anime", label: "Anime" },
  { id: "chieu-rap", label: "Chiếu Rạp" },
];

export default function RandomMoviePage() {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();

  const [selectedMood, setSelectedMood] = useState<string>("taste");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [tasteVector, setTasteVector] = useState<UserTasteVector | null>(null);
  const [hasTasteData, setHasTasteData] = useState<boolean>(false);

  // Candidate pool & roll state
  const [candidates, setCandidates] = useState<FilmItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [spotlightFilm, setSpotlightFilm] = useState<FilmItem | null>(null);
  const [matchScore, setMatchScore] = useState<number>(96);
  const [isWatchlisted, setIsWatchlisted] = useState<boolean>(false);

  // 1. Phân tích Gu người dùng
  useEffect(() => {
    try {
      const vector = buildUserTasteVector();
      setTasteVector(vector);
      const history = getAllGuestWatchHistoryEntries();
      const watchlist = guestDataStorage.getWatchlist();
      setHasTasteData(history.length > 0 || watchlist.length > 0);
    } catch {}
  }, [user]);

  // 2. Fetch kho phim ứng viên theo Tab & Category
  const fetchFilmPool = useCallback(async () => {
    setIsLoading(true);
    try {
      const promises: Promise<any>[] = [];
      const currentMood = MOOD_TABS.find((m) => m.id === selectedMood);
      const moodGenres = currentMood?.genres || [];

      if (selectedCategory === "single") {
        promises.push(movieApi.getSingle(1).catch(() => ({ data: { items: [] } })));
        promises.push(movieApi.getSingle(2).catch(() => ({ data: { items: [] } })));
      } else if (selectedCategory === "series") {
        promises.push(movieApi.getSeries(1).catch(() => ({ data: { items: [] } })));
        promises.push(movieApi.getSeries(2).catch(() => ({ data: { items: [] } })));
      } else if (selectedCategory === "anime") {
        promises.push(movieApi.getAnime(1).catch(() => ({ data: { items: [] } })));
        promises.push(movieApi.getAnime(2).catch(() => ({ data: { items: [] } })));
      } else if (selectedCategory === "chieu-rap") {
        promises.push(movieApi.getChieuRap(1).catch(() => ({ data: { items: [] } })));
      } else if (moodGenres.length > 0) {
        moodGenres.forEach((g) => {
          promises.push(movieApi.getByGenre(g, 1).catch(() => ({ data: { items: [] } })));
        });
      } else {
        promises.push(movieApi.getLatest(1).catch(() => ({ data: { items: [] } })));
        promises.push(movieApi.getSingle(1).catch(() => ({ data: { items: [] } })));
        promises.push(movieApi.getSeries(1).catch(() => ({ data: { items: [] } })));
      }

      const results = await Promise.all(promises);
      const collected: FilmItem[] = [];

      results.forEach((res) => {
        const items =
          res?.data?.items ||
          res?.data?.data?.items ||
          res?.data ||
          [];
        if (Array.isArray(items)) collected.push(...items);
      });

      // Deduplicate films by slug
      const seen = new Set<string>();
      const deduped: FilmItem[] = [];
      for (const item of collected) {
        if (!item || !item.slug) continue;
        const s = item.slug.toLowerCase();
        if (!seen.has(s)) {
          seen.add(s);
          deduped.push(item);
        }
      }

      // Xếp hạng theo taste nếu chọn tab "taste"
      let finalPool = deduped;
      if (selectedMood === "taste" && tasteVector) {
        const ranked = rankFilmsByUserTaste(deduped, tasteVector, false);
        finalPool = ranked.map((r) => r.film);
      }

      setCandidates(finalPool);

      // Nếu chưa có spotlight hoặc vừa đổi filter, đặt spotlight ban đầu
      if (finalPool.length > 0) {
        const initialPick = finalPool[Math.floor(Math.random() * Math.min(10, finalPool.length))];
        setSpotlightFilm(initialPick);
        if (tasteVector) {
          setMatchScore(calculateFilmMatchScore(initialPick, tasteVector));
        }
      }
    } catch (err) {
      console.error("Failed fetching film pool:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMood, selectedCategory, tasteVector]);

  useEffect(() => {
    fetchFilmPool();
  }, [fetchFilmPool]);

  // Cập nhật trạng thái Watchlist khi đổi spotlight
  useEffect(() => {
    if (spotlightFilm?.slug) {
      setIsWatchlisted(guestDataStorage.isWatchlisted(spotlightFilm.slug));
    }
  }, [spotlightFilm]);

  // 3. Cơ chế Bốc Phim Ngẫu Nhiên
  const handleRoll = useCallback(() => {
    if (!candidates.length || isRolling) return;

    setIsRolling(true);
    let counter = 0;
    const maxSteps = 12;
    let delay = 60;

    const shuffleTick = () => {
      counter++;
      const randomIdx = Math.floor(Math.random() * candidates.length);
      const pick = candidates[randomIdx];
      setSpotlightFilm(pick);

      if (counter < maxSteps) {
        delay += 15;
        setTimeout(shuffleTick, delay);
      } else {
        setIsRolling(false);
        const finalScore = tasteVector
          ? calculateFilmMatchScore(pick, tasteVector)
          : Math.floor(Math.random() * 8) + 91;
        setMatchScore(finalScore);
        toast(`Đã bốc: "${pick.name || pick.title}" (${finalScore}% Phù hợp)`, "success");
      }
    };

    shuffleTick();
  }, [candidates, isRolling, tasteVector, toast]);

  // Lưu / gỡ khỏi tủ phim
  const handleToggleWatchlist = () => {
    if (!spotlightFilm) return;
    const movieData = {
      title: spotlightFilm.name || spotlightFilm.title || "",
      titleEn: spotlightFilm.origin_name,
      posterUrl: spotlightFilm.poster_url || spotlightFilm.thumb_url,
      thumbUrl: spotlightFilm.thumb_url || spotlightFilm.poster_url,
      type: spotlightFilm.type,
      year: spotlightFilm.year,
    };
    const isFav = guestDataStorage.toggleFavorite(spotlightFilm.slug, movieData);
    setIsWatchlisted(isFav);
    toast(
      isFav
        ? `Đã lưu "${spotlightFilm.name || spotlightFilm.title}" vào tủ phim`
        : `Đã gỡ "${spotlightFilm.name || spotlightFilm.title}" khỏi tủ phim`,
      isFav ? "success" : "info",
    );
  };

  const handleShare = () => {
    if (!spotlightFilm) return;
    const url = `${window.location.origin}/film/${spotlightFilm.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast("Đã sao chép liên kết phim vào bộ nhớ tạm!", "success");
    }
  };

  return (
    <main
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#0a0b10] text-white pb-24 sm:pb-28 pt-16 sm:pt-20 select-none",
      )}
    >
      {/* Nền studio tối giản đồng bộ Trang Chủ & Lịch Chiếu */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-white/[0.025] to-transparent blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-3.5 sm:px-8 lg:px-12 space-y-5 sm:space-y-6">
        {/* Tiêu đề trang đơn giản, thanh thoát */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-3 sm:pb-4 border-b border-white/[0.08] gap-1.5 sm:gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Shuffle size={24} className="text-purple-400" />
              Phim Ngẫu Nhiên
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
            Bốc phim ngẫu nhiên và khám phá theo gu sở thích của bạn
          </p>
        </div>

        {/* Hàng 1: Dải các Tab Mood / Gu xem phim (Kiểu Pill thanh lịch như Lịch Chiếu) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          {MOOD_TABS.map((tab) => {
            const isSelected = selectedMood === tab.id;
            const TabIcon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedMood(tab.id)}
                className={cn(
                  "px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0 select-none",
                  isSelected
                    ? "bg-white text-black shadow-sm"
                    : "bg-[#12141c] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]",
                )}
              >
                <TabIcon
                  size={14}
                  className={isSelected ? "text-black" : "text-neutral-400"}
                />
                <span>{tab.label}</span>
                {tab.id === "taste" && hasTasteData && (
                  <span
                    className={cn(
                      "ml-1 text-[10px] font-semibold",
                      isSelected ? "text-neutral-500" : "text-purple-400",
                    )}
                  >
                    (Ưu tiên)
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Hàng 2: Bộ lọc thể loại & Nút Bốc Phim Ngay */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0",
                    isActive
                      ? "bg-white text-black shadow-sm"
                      : "bg-[#12141c] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]",
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={isRolling || isLoading}
              onClick={handleRoll}
              className="px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all flex items-center gap-2 shrink-0 shadow-md shadow-purple-900/25 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Shuffle size={14} className={cn(isRolling && "animate-spin")} />
              <span>{isRolling ? "Đang Bốc..." : "Bốc Phim Ngay"}</span>
            </button>
            <div className="text-xs text-neutral-400 shrink-0 font-medium hidden sm:inline">
              {candidates.length} phim
            </div>
          </div>
        </div>

        {/* Khối Spotlight Phim Trúng Tuyển (Thiết kế phẳng, tinh tế) */}
        {spotlightFilm && (
          <div className="p-4 sm:p-6 rounded-2xl bg-[#12141c] border border-white/[0.08] relative overflow-hidden transition-all shadow-sm">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6 relative z-10">
              {/* Poster */}
              <div className="w-36 sm:w-44 flex-shrink-0 group">
                <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/10 shadow-lg bg-neutral-900">
                  <Image
                    src={
                      resolveImageUrl(
                        spotlightFilm.poster_url || spotlightFilm.thumb_url,
                      ) || "/placeholder.jpg"
                    }
                    alt={spotlightFilm.name || spotlightFilm.title || "Poster"}
                    fill
                    sizes="(max-width: 640px) 144px, 176px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/85 border border-white/15 text-white text-[9px] font-black uppercase shadow-md">
                    {spotlightFilm.quality || "HD"}
                  </div>
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/80 text-amber-400 text-[10px] font-bold">
                    <Star size={10} className="fill-amber-400" />
                    <span>
                      {spotlightFilm.imdb_rating ||
                        spotlightFilm.vote_average ||
                        spotlightFilm.rating ||
                        "8.5"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thông tin & Hành động */}
              <div className="flex-1 space-y-3 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <Sparkles size={11} />
                    {matchScore}% Phù Hợp
                  </span>

                  {spotlightFilm.year && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-neutral-300">
                      Năm {spotlightFilm.year}
                    </span>
                  )}

                  {spotlightFilm.episode_current && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-neutral-300">
                      {spotlightFilm.episode_current}
                    </span>
                  )}

                  {spotlightFilm.lang && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-neutral-300">
                      {spotlightFilm.lang}
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {spotlightFilm.name || spotlightFilm.title}
                  </h2>
                  {spotlightFilm.origin_name && (
                    <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                      {spotlightFilm.origin_name}
                    </p>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-neutral-300 line-clamp-3 leading-relaxed max-w-3xl">
                  {cleanMovieDescription(spotlightFilm.content) ||
                    "Bộ phim đặc sắc mang đến trải nghiệm giải trí ấn tượng, cốt truyện lôi cuốn và cảnh quay mãn nhãn."}
                </p>

                {/* Các nút hành động */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-2">
                  <Link
                    href={`/watch/${spotlightFilm.slug}`}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shadow-purple-900/25 active:scale-95"
                  >
                    <Play size={14} className="fill-white" />
                    <span>Xem Phim Ngay</span>
                  </Link>

                  <Link
                    href={`/film/${spotlightFilm.slug}`}
                    className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
                  >
                    <Info size={14} />
                    <span>Chi Tiết</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleToggleWatchlist}
                    className={cn(
                      "px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                      isWatchlisted
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                        : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-neutral-300",
                    )}
                  >
                    <Bookmark
                      size={14}
                      className={isWatchlisted ? "fill-rose-400 text-rose-400" : ""}
                    />
                    <span>{isWatchlisted ? "Đã Lưu" : "Lưu Phim"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRoll}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-neutral-300 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Đổi Phim Khác</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-neutral-400 hover:text-white transition-all cursor-pointer"
                    title="Chia sẻ phim"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lưới phim chuẩn Desktop 7 cột (Đồng bộ chuẩn 7-cols như Trang Chủ & Lịch Chiếu) */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
              <Film size={16} className="text-purple-400" />
              Kho Phim Đề Xuất Phù Hợp ({candidates.length})
            </h3>
            <span className="text-xs text-neutral-400">
              Chọn trực tiếp phim bạn muốn xem hoặc bấm "Bốc Phim Ngay"
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {Array.from({ length: 14 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-12 sm:p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
                <Film size={22} />
              </div>
              <h3 className="text-base font-bold text-white">
                Không tìm thấy phim phù hợp
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Vui lòng thử chọn danh mục hoặc thể loại khác.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {candidates.map((film, idx) => (
                <FilmCard
                  key={`${film.slug || idx}-${idx}`}
                  film={film}
                  priority={idx < 7}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
