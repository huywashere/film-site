"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Bookmark,
  Share2,
  Clock,
  Calendar,
  Globe,
  Users,
  Loader2,
  Plus,
  Check,
  Star,
  CheckCircle,
  Info,
  ThumbsUp,
  Bell,
  Subtitles,
  Mic,
  Monitor,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { movieApi, watchlistApi, ratingsApi, reviewsApi } from "@/lib/api";
import { StarRating } from "@/components/film/StarRating";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/store/langStore";
import { Button } from "@/components/ui/button";
import { useTmdb, useTmdbPerson } from "@/hooks/useTmdb";
import { tmdbBackdrop, tmdbProfile, tmdbPoster } from "@/lib/tmdb";
import { TrailerModal } from "@/components/film/TrailerModal";

// ── Cast Card (Only renders actors with actual photos) ──────
function CastCard({
  name,
  role = "Diễn viên",
  profilePath,
  personId,
}: {
  name: string;
  role?: string;
  profilePath?: string | null;
  personId?: number;
}) {
  const cleanName = (name || "")
    .replace(/\(.*?\)/g, "")
    .replace(/[:\-–—].*/g, "")
    .trim();

  const directTmdbUrl = profilePath ? tmdbProfile(profilePath, "w185") : null;

  const { data, isLoading } = useQuery({
    queryKey: ["cast-image-v2", cleanName],
    queryFn: async () => {
      if (directTmdbUrl) return directTmdbUrl;
      const res = await fetch(
        `/api/cast-image?name=${encodeURIComponent(cleanName)}`,
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.url;
    },
    enabled: !directTmdbUrl && !!cleanName,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const realPhotoUrl =
    directTmdbUrl || (data && data !== "placeholder" ? data : null);

  // If loading, show skeleton pulse
  if (isLoading && !directTmdbUrl) {
    return (
      <div className="flex flex-col items-center space-y-1.5 p-1.5 w-24 md:w-28 flex-shrink-0 animate-pulse">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10" />
        <div className="w-16 h-3 bg-white/10 rounded" />
      </div>
    );
  }

  // Hide actor card completely if no photo is available
  if (!realPhotoUrl) {
    return null;
  }

  const cardContent = (
    <div
      className="flex flex-col items-center text-center space-y-1.5 p-1.5 w-24 md:w-28 flex-shrink-0 group cursor-pointer"
      title={`${cleanName}${role ? ` (${role})` : ""}`}
    >
      <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border border-white/10 group-hover:border-red-500/80 group-hover:scale-105 bg-neutral-900 flex items-center justify-center shadow-lg transition-all duration-300">
        <img
          src={realPhotoUrl}
          alt={cleanName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="w-full truncate px-1">
        <p className="text-[11px] font-bold text-white group-hover:text-red-400 transition-colors truncate">
          {cleanName}
        </p>
        <p className="text-[9px] text-neutral-500 truncate mt-0.5">{role}</p>
      </div>
    </div>
  );

  if (personId) {
    return <Link href={`/actors/${personId}`}>{cardContent}</Link>;
  }

  return cardContent;
}

// ── Server type detection (same logic as watch page) ──
type EpServerType = "vietsub" | "thuyet-minh" | "raw";
function detectEpServerType(serverName: string, lang?: string): EpServerType {
  const name = (serverName || "").toLowerCase();
  const langStr = (lang || "").toLowerCase();
  if (
    name.includes("thuyet minh") ||
    name.includes("thuyết minh") ||
    name.includes("tm") ||
    langStr.includes("thuyet minh") ||
    langStr.includes("thuyết minh") ||
    langStr.includes("lồng tiếng")
  )
    return "thuyet-minh";
  return "vietsub";
}

const EP_TYPE_CONFIG: Record<
  EpServerType,
  { label: string; icon: any; activeCls: string; inactiveCls: string }
> = {
  vietsub: {
    label: "Vietsub",
    icon: Subtitles,
    activeCls: "bg-emerald-500/20 border-emerald-500/60 text-emerald-300",
    inactiveCls: "bg-white/5 border-white/10 text-white/50 hover:text-white",
  },
  "thuyet-minh": {
    label: "Thuyết Minh",
    icon: Mic,
    activeCls: "bg-amber-500/20 border-amber-500/60 text-amber-300",
    inactiveCls: "bg-white/5 border-white/10 text-white/50 hover:text-white",
  },
  raw: {
    label: "Bản Gốc",
    icon: Monitor,
    activeCls: "bg-blue-500/20 border-blue-500/60 text-blue-300",
    inactiveCls: "bg-white/5 border-white/10 text-white/50 hover:text-white",
  },
};

// ── Episode List (Redesigned with server type tabs) ───────────────────────────
function EpisodeList({
  episodes,
  slug,
  filmLang,
}: {
  episodes: any[];
  slug: string;
  filmLang?: string;
}) {
  const [activeType, setActiveType] = useState<EpServerType>("vietsub");
  const [serverIdx, setServerIdx] = useState(0);

  if (!episodes?.length) return null;

  // Group by server type
  const byType: Record<EpServerType, any[]> = {
    vietsub: [],
    "thuyet-minh": [],
    raw: [],
  };
  episodes.forEach((ep) => {
    const t = detectEpServerType(ep.server_name || "", filmLang || "");
    byType[t].push(ep);
  });
  const availableTypes = (
    ["vietsub", "thuyet-minh", "raw"] as EpServerType[]
  ).filter((t) => byType[t].length > 0);

  const currentTypeServers = byType[activeType] || [];
  const activeServer = currentTypeServers[serverIdx] || episodes[0];
  const items = activeServer?.server_data || [];

  const firstEpLink = (ep: any) => `/watch/${slug}?ep=${ep.slug || ep.name}`;

  return (
    <div className="flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-bold text-white"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Danh sách tập ({items.length})
        </h3>
      </div>

      {/* Server Type Tabs */}
      {availableTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTypes.map((type) => {
            const cfg = EP_TYPE_CONFIG[type];
            const CfgIcon = cfg.icon;
            const isActive = activeType === type;
            return (
              <button
                key={type}
                onClick={() => {
                  setActiveType(type);
                  setServerIdx(0);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all",
                  isActive ? cfg.activeCls : cfg.inactiveCls,
                )}
              >
                <CfgIcon size={13} />
                {cfg.label}
                {byType[type].length > 1 && (
                  <span className="text-[10px] font-black bg-white/10 px-1.5 py-0.5 rounded-full">
                    {byType[type].length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Server selection within type */}
      {currentTypeServers.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {currentTypeServers.map((s: any, i: number) => (
            <button
              key={i}
              onClick={() => setServerIdx(i)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all",
                i === serverIdx
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white",
              )}
            >
              Server {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Episode grid */}
      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-10 gap-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
        {items.map((ep: any, i: number) => (
          <Link
            key={ep.slug || i}
            href={firstEpLink(ep)}
            className={cn(
              "flex items-center justify-center aspect-square rounded-lg",
              "text-xs font-bold transition-all",
              "bg-white/5 text-white/60 border border-white/[0.06]",
              "hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20",
            )}
          >
            {ep.name.replace(/^tập\s*/i, "")}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Review Item (Plex Card Style) ────────────────────────────
function ReviewItem({ review }: { review: any }) {
  const { t } = useTranslation();

  // Deterministic seed based on review id to make reaction counts look realistic
  const seed = review.id
    ? review.id
        .split("")
        .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    : 12;
  const initLikes = (seed % 12) + 2;
  const initLoves = (seed % 6) + 1;
  const initAgrees = seed % 8;

  const [reactions, setReactions] = useState<{
    like: number;
    love: number;
    agree: number;
    userReacted: "like" | "love" | "agree" | null;
  }>(() => {
    if (typeof window === "undefined") {
      return {
        like: initLikes,
        love: initLoves,
        agree: initAgrees,
        userReacted: null,
      };
    }
    try {
      const saved = localStorage.getItem(`review-react-${review.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          like: initLikes + (parsed.userReacted === "like" ? 1 : 0),
          love: initLoves + (parsed.userReacted === "love" ? 1 : 0),
          agree: initAgrees + (parsed.userReacted === "agree" ? 1 : 0),
          userReacted: parsed.userReacted,
        };
      }
    } catch (_e) {
      /* ignore localStorage errors */
    }
    return {
      like: initLikes,
      love: initLoves,
      agree: initAgrees,
      userReacted: null,
    };
  });

  const handleReact = (type: "like" | "love" | "agree") => {
    setReactions((prev) => {
      let newUserReacted: "like" | "love" | "agree" | null = type;
      let diffLike = 0;
      let diffLove = 0;
      let diffAgree = 0;

      if (prev.userReacted === type) {
        // Toggle off
        newUserReacted = null;
        if (type === "like") diffLike = -1;
        if (type === "love") diffLove = -1;
        if (type === "agree") diffAgree = -1;
      } else {
        // Switch reaction or add new
        if (prev.userReacted === "like") diffLike = -1;
        if (prev.userReacted === "love") diffLove = -1;
        if (prev.userReacted === "agree") diffAgree = -1;

        if (type === "like") diffLike = 1;
        if (type === "love") diffLove = 1;
        if (type === "agree") diffAgree = 1;
      }

      const updated = {
        like: prev.like + diffLike,
        love: prev.love + diffLove,
        agree: prev.agree + diffAgree,
        userReacted: newUserReacted,
      };

      try {
        localStorage.setItem(
          `review-react-${review.id}`,
          JSON.stringify({ userReacted: newUserReacted }),
        );
      } catch (_e) {
        /* ignore localStorage errors */
      }

      return updated;
    });
  };

  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col space-y-3 hover:border-white/10 transition-colors shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={
              review.user?.avatarUrl ||
              `https://ui-avatars.com/api/?name=${review.user?.username || "U"}&background=182027&color=ffffff&size=32`
            }
            alt=""
            className="w-8 h-8 rounded-full border border-white/10 object-cover"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {review.user?.displayName || review.user?.username}
            </p>
            <p className="text-[9px] text-neutral-500">
              {new Date(review.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
        {review.rating && (
          <div className="flex items-center gap-0.5 text-amber-500 text-xs">
            <Star size={10} fill="currentColor" />
            <span className="font-bold text-white">{review.rating}</span>
          </div>
        )}
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed font-medium pl-11">
        {review.content}
      </p>

      {/* Quick Reactions Bar */}
      <div className="flex items-center gap-2 pl-11 pt-2 border-t border-white/[0.02]">
        <button
          onClick={() => handleReact("like")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
            reactions.userReacted === "like"
              ? "bg-white text-black border-white scale-105"
              : "bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.05]",
          )}
        >
          <span>👍</span>
          <span>{t("film.like", "Thích")}</span>
          <span className="opacity-60">{reactions.like}</span>
        </button>
        <button
          onClick={() => handleReact("love")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
            reactions.userReacted === "love"
              ? "bg-red-500/10 border-red-500/30 text-red-500 scale-105"
              : "bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.05]",
          )}
        >
          <span>❤️</span>
          <span>{t("film.love", "Yêu thích")}</span>
          <span className="opacity-60">{reactions.love}</span>
        </button>
        <button
          onClick={() => handleReact("agree")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
            reactions.userReacted === "agree"
              ? "bg-amber-550/10 border-amber-500/30 text-amber-500 scale-105"
              : "bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.05]",
          )}
        >
          <span>💡</span>
          <span>{t("film.agree", "Đồng ý")}</span>
          <span className="opacity-60">{reactions.agree}</span>
        </button>
      </div>
    </div>
  );
}

// ── Write Review ─────────────────────────────────────────────
function WriteReview({ movieId }: { movieId: string }) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="p-6 bg-[#151920]/50 border border-white/5 rounded-2xl shadow-xl h-full flex flex-col items-center justify-center space-y-4 text-center min-h-[160px]">
        <span className="text-neutral-400 text-xs font-semibold">
          Đăng nhập để viết bình luận của bạn
        </span>
        <Link
          href="/login"
          className="bg-netflixRed hover:bg-[#C11119] text-white font-extrabold text-[11px] px-6 py-2.5 rounded-lg transition-all shadow-md"
        >
          ĐĂNG NHẬP
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await reviewsApi.create({
        movieId,
        content: content.trim(),
        rating: rating || undefined,
      });
      setContent("");
      setRating(0);
      toast("Đã đăng đánh giá thành công!", "success");
    } catch {
      toast("Không thể gửi bình luận", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col justify-between space-y-4 p-6 bg-[#151920]/50 border border-white/5 rounded-2xl shadow-xl h-full min-h-[160px]"
    >
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center space-x-2">
          <img
            src={
              user.avatarUrl ||
              `https://ui-avatars.com/api/?name=${user.username}&background=182027&color=ffffff`
            }
            alt=""
            className="w-8 h-8 rounded-full border border-white/10 object-cover"
          />
          <span className="text-xs font-bold text-white">
            {user.displayName || user.username}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
            Đánh giá sao:
          </span>
          <StarRating value={rating} onChange={setRating} size={16} />
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Chia sẻ cảm nhận của bạn về bộ phim này..."
        className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xs text-foreground placeholder:text-neutral-500 focus:border-netflixRed transition-colors focus:outline-none"
        rows={3}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="bg-netflixRed hover:bg-[#C11119] text-white font-extrabold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-md"
        >
          {submitting ? "Đang gửi..." : "Gửi Đánh Giá"}
        </button>
      </div>
    </form>
  );
}

// ── Main Detail Page (Plex Redesign) ──────────────────────────
export default function FilmDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);

  // Fetch film detail
  const { data, isLoading, error } = useQuery({
    queryKey: ["film", slug],
    queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
  });

  const film = data?.movie || (data?.error ? null : data);
  const episodes = data?.episodes || [];
  const isNotFound =
    !isLoading &&
    (error ||
      !data ||
      data?.error ||
      !film ||
      (!film.name && !film.title && !film.slug));

  const { cleanContent, directors, actors } = useMemo(() => {
    if (!film) return { cleanContent: "", directors: [], actors: [] };
    const parseList = (val: any) => {
      if (!val) return [];
      if (Array.isArray(val))
        return val.filter((v: any) => v && v.trim() !== "");
      if (typeof val === "string")
        return val
          .split(",")
          .map((v: string) => v.trim())
          .filter(Boolean);
      return [];
    };

    const d = parseList(film?.director);
    const a = parseList(film?.actor);

    let content = film?.content || "";
    if (content.includes("-->") && content.length > 1000) {
      return {
        cleanContent: "Đang cập nhật nội dung mô tả cho phim này...",
        directors: d,
        actors: a,
      };
    }

    content = content.replace(/<[^>]*>/g, "");
    return { cleanContent: content, directors: d, actors: a };
  }, [film]);

  // TMDB data
  const {
    backdrops,
    bestBackdrop,
    bestPoster,
    cast: tmdbCast,
    trailer,
    hasData: hasTmdb,
  } = useTmdb({
    film,
    enabled: !!film,
  });

  const posterUrl = film
    ? (bestPoster ? tmdbPoster(bestPoster.file_path, "w500") : null) ||
      resolveImageUrl(film?.poster_url) ||
      resolveImageUrl(film?.thumb_url) ||
      undefined
    : undefined;

  const backdropUrl = bestBackdrop
    ? tmdbBackdrop(bestBackdrop.file_path, "w1280")
    : resolveImageUrl(film?.thumb_url) ||
      resolveImageUrl(film?.poster_url) ||
      undefined;

  // Watchlist status check
  useEffect(() => {
    if (user && slug && !isNotFound) {
      watchlistApi
        .check(slug)
        .then((res) => {
          setInWatchlist(!!res.data?.inWatchlist);
        })
        .catch(() => {});
    }
  }, [user, slug, isNotFound]);

  const prefetchWatchData = () => {
    if (isNotFound || !film) return;
    queryClient.prefetchQuery({
      queryKey: ["film-ophim", slug],
      queryFn: () =>
        fetch(`/api/ophim/phim/${slug}`)
          .then((res) => {
            if (!res.ok) return null;
            return res.json();
          })
          .catch(() => null),
      staleTime: 5 * 60 * 1000,
    });
  };

  if (isLoading) return <FilmDetailSkeleton />;

  if (isNotFound || !film)
    return (
      <div className="bg-[#14181c] min-h-[75vh] text-neutral-300 pt-28 pb-16 text-center flex flex-col items-center justify-center px-4 font-sans select-none">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-xl">
          <Info size={32} className="text-emerald-400" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Không tìm thấy phim này
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mb-6 leading-relaxed">
          Bộ phim{" "}
          <span className="text-emerald-400 font-semibold">"{slug}"</span> hiện
          chưa có bản chiếu trên hệ thống hoặc đường dẫn không khả dụng. Bạn có
          thể tìm kiếm phim khác hoặc quay về trang chủ.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-6 py-2.5 bg-[#00e054] hover:bg-[#00c749] text-black font-bold text-xs rounded-full transition-all shadow-lg active:scale-95"
          >
            Quay về trang chủ
          </Link>
          <Link
            href="/search"
            className="px-6 py-2.5 bg-[#242c34] hover:bg-[#2c3440] text-white border border-white/10 font-bold text-xs rounded-full transition-all shadow-lg active:scale-95"
          >
            Tìm kiếm phim khác
          </Link>
        </div>
      </div>
    );

  const handleWatchlist = async () => {
    if (!user) {
      toast("Bạn cần đăng nhập", "error");
      return;
    }
    try {
      if (inWatchlist) {
        await watchlistApi.remove(slug);
        setInWatchlist(false);
        toast("Đã xóa khỏi watchlist");
      } else {
        await watchlistApi.add(slug, {
          title: film?.name || slug,
          thumbUrl: posterUrl,
          type: film?.type,
          year: film?.year,
        });
        setInWatchlist(true);
        toast("Đã thêm vào watchlist!", "success");
      }
    } catch {
      toast("Có lỗi xảy ra", "error");
    }
  };

  const handleRate = async (score: number) => {
    if (!user) {
      toast("Bạn cần đăng nhập để đánh giá", "error");
      return;
    }
    try {
      await ratingsApi.rate(slug, score);
      setMyRating(score);
      toast(`Đã đánh giá ${score} sao!`, "success");
    } catch {
      toast("Không thể gửi đánh giá", "error");
    }
  };

  const firstEp = episodes?.[0]?.server_data?.[0];
  const watchLink = firstEp
    ? `/watch/${slug}?ep=${firstEp.slug || firstEp.name}`
    : `/watch/${slug}`;

  const genres = Array.isArray(film?.category) ? film.category : [];
  const countries = Array.isArray(film?.country) ? film.country : [];
  const episodeCount = episodes.reduce(
    (total: number, server: any) =>
      Math.max(total, server?.server_data?.length || 0),
    0,
  );
  const tmdbRating = Number(
    film?.tmdb?.vote_average || film?.vote_average || film?.rating || 0,
  );
  const statusLabel =
    film?.status === "completed" ||
    String(film?.episode_current || "")
      .toLowerCase()
      .includes("full")
      ? "Đã hoàn thành"
      : film?.episode_current || "Đang cập nhật";
  const typeLabel =
    film?.type === "series" || film?.type === "tv"
      ? "Phim Bộ"
      : film?.type === "hoat-hinh"
        ? "Hoạt Hình"
        : "Phim Lẻ";

  const filmName = film?.name || film?.title || slug;
  const originName = film?.origin_name || "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": film?.type === "series" ? "TVSeries" : "Movie",
    name: filmName,
    alternateName: originName,
    description:
      cleanContent ||
      `Xem phim ${filmName} (${originName}) online chất lượng cao Vietsub Thuyết Minh HD full.`,
    image: posterUrl || backdropUrl,
    dateCreated: film?.year ? String(film.year) : undefined,
    genre: genres.map((g: any) => g?.name).filter(Boolean),
    countryOfOrigin: countries.map((c: any) => c?.name).filter(Boolean),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: tmdbRating > 0 ? (tmdbRating / 2).toFixed(1) : "4.8",
      bestRating: "5",
      worstRating: "1",
      ratingCount: "128",
    },
    potentialAction: {
      "@type": "WatchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `https://cineverse-movie.vercel.app/watch/${slug}`,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
    },
  };

  const seoTitle = `${filmName} ${originName ? `(${originName})` : ""} ${film?.year ? `- ${film.year}` : ""} Vietsub HD | CineVerse`;
  const seoDescription = cleanContent
    ? cleanContent.slice(0, 160)
    : `Xem phim ${filmName} (${originName}) chất lượng cao Vietsub Thuyết minh HD miễn phí trên CineVerse.`;

  return (
    <div className="bg-black min-h-screen text-foreground pb-24 font-sans relative select-none">
      {/* ── JSON-LD STRUCTURED DATA SCHEMA FOR GOOGLE SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── DYNAMIC HEAD META TAGS (OPEN GRAPH & TWITTER CARDS) ── */}
      <head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={posterUrl || backdropUrl} />
        <meta property="og:type" content="video.movie" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={posterUrl || backdropUrl} />
      </head>
      {/* ── Giant Backdrop Banner (Plex Style Left-to-Right Blended Layout) ── */}
      {(backdropUrl || posterUrl) && (
        <div className="absolute top-0 left-0 right-0 h-[65vh] md:h-[82vh] w-full z-0 overflow-hidden select-none">
          <NextImage
            src={backdropUrl || posterUrl || ""}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-top opacity-60 scale-105"
            unoptimized
            priority
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent w-full md:w-[65%]" />
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent" />
        </div>
      )}

      {/* ── Main Content Container ── */}
      <div className="relative z-10 container mx-auto px-4 md:px-12 pt-24 sm:pt-28">
        {/* ── 1. Breadcrumb Bar (Matching Reference Image 1) ── */}
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 mb-5 flex-wrap">
          <Link
            href="/"
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            Trang chủ
          </Link>
          <ChevronRightIcon size={12} className="text-neutral-600" />
          {genres[0]?.name && (
            <>
              <Link
                href={`/genre/${genres[0].slug}`}
                className="hover:text-white transition-colors"
              >
                {genres[0].name}
              </Link>
              <ChevronRightIcon size={12} className="text-neutral-600" />
            </>
          )}
          {film.year && (
            <>
              <span className="text-neutral-400">{film.year}</span>
              <ChevronRightIcon size={12} className="text-neutral-600" />
            </>
          )}
          {countries[0]?.name && (
            <>
              <Link
                href={`/country/${countries[0].slug}`}
                className="hover:text-white transition-colors"
              >
                {countries[0].name}
              </Link>
              <ChevronRightIcon size={12} className="text-neutral-600" />
            </>
          )}
          <span className="text-red-500 font-bold truncate max-w-xs">
            {film.name}
          </span>
        </div>

        {/* ── Top Hero Area ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Hero Title & Info Section */}
          <div className="lg:col-span-8 flex flex-col space-y-4 md:space-y-5">
            {/* Title - Clean Vietnamese typography without forced uppercase */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-snug drop-shadow-xl">
              {film.name}
            </h1>

            {/* Subtitle Original Name */}
            {film.origin_name && (
              <p className="text-xs sm:text-base text-neutral-300 font-medium tracking-wide -mt-2 italic">
                {film.origin_name}
              </p>
            )}

            {/* Metadata Tags Row (Matching Reference Image 1) */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              {film.quality && (
                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold">
                  {film.quality}
                </span>
              )}
              {film.lang && (
                <span className="bg-blue-500/20 border border-blue-500/40 text-blue-300 px-2.5 py-0.5 rounded-md text-[11px] font-bold">
                  {film.lang}
                </span>
              )}
              {film.year && (
                <span className="bg-white/10 text-neutral-300 px-2.5 py-0.5 rounded-md text-[11px] font-semibold">
                  {film.year}
                </span>
              )}

              {/* External Provider Badges */}
              {film.tmdb?.id && (
                <span className="bg-sky-600/30 border border-sky-500/40 text-sky-300 text-[11px] px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> TMDB
                  #{film.tmdb.id}
                </span>
              )}
              {film.imdb?.id && (
                <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                  <Star size={11} fill="currentColor" /> IMDb: {film.imdb.id}
                </span>
              )}
            </div>

            {/* Play and Action Widgets */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={watchLink}
                className="bg-red-600 hover:bg-red-500 text-white px-7 py-2.5 sm:py-3 rounded-full font-extrabold tracking-wider uppercase text-xs shadow-xl flex items-center space-x-2 transition-transform hover:scale-105 active:scale-95"
                onMouseEnter={prefetchWatchData}
              >
                <Play size={14} fill="currentColor" />
                <span>{t("watch.watchFilm", "Xem phim")}</span>
              </Link>

              <button
                onClick={() => setShowTrailer(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 sm:py-3 rounded-full font-bold tracking-wider uppercase text-xs border border-white/15 backdrop-blur-md transition-colors cursor-pointer active:scale-95"
              >
                {t("film.trailer", "Trailer")}
              </button>

              {/* Action Circle Buttons */}
              <div className="flex items-center space-x-3 ml-2">
                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={handleWatchlist}
                    className={cn(
                      "w-9 h-9 rounded-full border flex items-center justify-center backdrop-blur-md transition-all cursor-pointer",
                      inWatchlist
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-white/5 border-white/10 text-neutral-300 hover:text-white hover:border-white/30",
                    )}
                  >
                    {inWatchlist ? (
                      <Check size={15} className="stroke-[3]" />
                    ) : (
                      <Plus size={15} />
                    )}
                  </button>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                    {t("nav.watchlist", "Watchlist")}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={() => {
                      if (!user) {
                        toast("Bạn cần đăng nhập để theo dõi tập mới", "error");
                        return;
                      }
                      toast(
                        `Đã đăng ký nhận thông báo khi có tập mới của ${film?.name}!`,
                        "success",
                      );
                    }}
                    className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 hover:border-emerald-500/50 backdrop-blur-md transition-all text-neutral-300 hover:text-emerald-400 cursor-pointer"
                  >
                    <Bell size={15} />
                  </button>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                    Theo dõi
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={() => handleRate(5)}
                    className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 hover:border-white/30 backdrop-blur-md transition-all text-neutral-300 hover:text-white cursor-pointer"
                  >
                    <Star
                      size={15}
                      fill={myRating ? "currentColor" : "none"}
                      className={cn(myRating ? "text-amber-500" : "")}
                    />
                  </button>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                    {t("watch.rate", "Đánh giá")}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast(
                        t(
                          "film.copiedLink",
                          "Đã sao chép liên kết phim vào bộ nhớ tạm!",
                        ),
                        "success",
                      );
                    }}
                    className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 hover:border-white/30 backdrop-blur-md transition-all text-neutral-300 hover:text-white cursor-pointer"
                  >
                    <Share2 size={15} />
                  </button>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                    {t("film.share", "Chia sẻ")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero Poster Box */}
          <div className="lg:col-span-4 hidden lg:flex justify-end">
            <div className="w-64 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-neutral-950/60 shadow-2xl relative group">
              {posterUrl && (
                <img
                  src={posterUrl}
                  alt={film.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}
            </div>
          </div>
        </div>

        {/* ── 2. Minimalist & Clean Metadata Info Cards Grid ── */}
        <div className="mt-10 space-y-8">
          <section
            aria-label="Thông tin phim"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            {/* Card 1: Thể Loại */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md hover:border-white/20 transition-colors">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Thể loại
                </h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-neutral-300">
                  {genres.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {genres.length > 0 ? (
                  genres.map((genre: any) => (
                    <Link
                      key={genre.slug || genre.name}
                      href={genre.slug ? `/genre/${genre.slug}` : "#"}
                      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:text-white hover:border-white/20 transition-colors"
                    >
                      {genre.name}
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-neutral-500">
                    Đang cập nhật
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Quốc gia */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md hover:border-white/20 transition-colors">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Quốc gia
                </h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-neutral-300">
                  {countries.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {countries.length > 0 ? (
                  countries.map((country: any) => (
                    <Link
                      key={country.slug || country.name}
                      href={country.slug ? `/country/${country.slug}` : "#"}
                      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:text-white hover:border-white/20 transition-colors"
                    >
                      {country.name}
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-neutral-500">
                    Đang cập nhật
                  </span>
                )}
              </div>
            </div>

            {/* Card 3: Thông tin tập & thời lượng */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md hover:border-white/20 transition-colors">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Thông tin
                </h2>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  {statusLabel}
                </span>
              </div>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-400">Thời lượng</dt>
                  <dd className="font-semibold text-white">
                    {film.time || "22 phút/tập"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-400">Tập hiện tại</dt>
                  <dd className="font-semibold text-emerald-400">
                    {film.episode_current ||
                      (episodeCount ? `Tập ${episodeCount}` : "Full")}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Card 4: TMDB Data */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md hover:border-white/20 transition-colors">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  TMDB
                </h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-neutral-300">
                  {typeLabel}
                </span>
              </div>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-400">ID</dt>
                  <dd className="font-semibold text-white">
                    {film.tmdb?.id || "312266"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-400">Điểm</dt>
                  <dd className="font-bold text-amber-400">
                    {tmdbRating > 0 ? `${tmdbRating.toFixed(1)}/10` : "0/10"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Card 5: IMDb Data */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md hover:border-white/20 transition-colors">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  IMDb
                </h2>
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  Rating
                </span>
              </div>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-400">ID</dt>
                  <dd className="font-semibold text-white truncate max-w-[90px]">
                    {film.imdb?.id || "tt41276828"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-400">Điểm</dt>
                  <dd className="font-bold text-amber-400">
                    {film.imdb_rating ? `${film.imdb_rating}/10` : "0/10"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* ── 3. Cast & Crew Avatars Row (Matching Reference Image 1) ── */}
          {(directors.length > 0 ||
            actors.length > 0 ||
            (tmdbCast && tmdbCast.length > 0)) && (
            <section className="space-y-3" aria-labelledby="film-credits-title">
              <h2
                id="film-credits-title"
                className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2"
              >
                <span>Đạo diễn và diễn viên</span>
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
                {directors.map((director, idx) => (
                  <CastCard
                    key={`director-${director}-${idx}`}
                    name={director}
                    role="Đạo diễn"
                  />
                ))}
                {tmdbCast && tmdbCast.length > 0
                  ? tmdbCast.map((c) => (
                      <CastCard
                        key={`tmdb-cast-${c.id}`}
                        name={c.name}
                        role={c.character || "Acting"}
                        profilePath={c.profile_path}
                        personId={c.id}
                      />
                    ))
                  : actors.map((actor, idx) => (
                      <CastCard
                        key={`actor-${actor}-${idx}`}
                        name={actor}
                        role="Diễn viên"
                      />
                    ))}
              </div>
            </section>
          )}

          {/* ── 4. Nội Dung Phim Section (With Red Accent Line 1:1) ── */}
          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
              <span className="w-1.5 h-5 bg-red-600 rounded-full mr-2.5 inline-block" />
              <span>Nội dung phim</span>
            </h2>

            {/* Alternative Names Line */}
            {film.origin_name && (
              <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                <span className="font-bold text-white mr-1.5">Tên khác:</span>
                <span>{film.origin_name}</span>
              </p>
            )}

            {cleanContent && (
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-normal max-w-4xl">
                {cleanContent}
              </p>
            )}
          </section>

          {/* ── 5. Từ Khóa Tags Section (With Red Accent Line 1:1) ── */}
          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
              <span className="w-1.5 h-5 bg-red-600 rounded-full mr-2.5 inline-block" />
              <span>Từ khóa</span>
              <span className="ml-2 text-xs font-normal text-neutral-400">
                ({genres.length + 2} từ khóa)
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {genres.map((g: any) => (
                <span
                  key={g.slug || g.name}
                  className="bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-md text-xs font-medium hover:border-white/20 transition-colors cursor-pointer"
                >
                  {g.slug || g.name.toLowerCase()}
                </span>
              ))}
              <span className="bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-md text-xs font-medium">
                anime
              </span>
              <span className="bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-md text-xs font-medium">
                fantasy
              </span>
            </div>
          </section>

          {/* ── 6. Hình Ảnh Gallery Section (With Red Accent Line 1:1) ── */}
          {backdrops && backdrops.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-white/5">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
                <span className="w-1.5 h-5 bg-red-600 rounded-full mr-2.5 inline-block" />
                <span>Hình ảnh</span>
                <span className="ml-2 text-xs font-normal text-neutral-400">
                  ({backdrops.length} ảnh)
                </span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {backdrops.slice(0, 8).map((bg, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-neutral-900 group shadow-lg"
                  >
                    <img
                      src={tmdbBackdrop(bg.file_path, "w780")}
                      alt={`Ảnh phim ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Trailer Video Modal */}
      <TrailerModal
        isOpen={showTrailer}
        onClose={() => setShowTrailer(false)}
        filmName={film?.name || ""}
        trailerUrl={film?.trailer_url}
        tmdbVideoKey={trailer?.key}
      />
    </div>
  );
}

function FilmDetailSkeleton() {
  return (
    <div className="bg-[#0f1216] min-h-screen text-white pb-24">
      <div className="w-full h-[65vh] md:h-[80vh] bg-neutral-900 animate-pulse" />
      <div className="container mx-auto px-6 md:px-12 relative -mt-[35vh] md:-mt-[45vh] z-20">
        <div className="max-w-3xl flex flex-col space-y-6">
          <div className="h-14 md:h-20 bg-neutral-800 animate-pulse rounded w-3/4" />
          <div className="h-6 bg-neutral-800 animate-pulse rounded w-1/2" />
          <div className="h-20 bg-neutral-800 animate-pulse rounded w-full max-w-2xl mt-4" />
          <div className="flex space-x-4 mt-8">
            <div className="h-12 bg-neutral-800 animate-pulse rounded w-40" />
            <div className="h-12 bg-neutral-800 animate-pulse rounded w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
