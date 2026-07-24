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
} from "lucide-react";
import { movieApi, watchlistApi, ratingsApi, reviewsApi } from "@/lib/api";
import { StarRating } from "@/components/film/StarRating";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/store/langStore";
import { Button } from "@/components/ui/button";

// ── Cast Card (Plex Circle Style) ──────────────────────────
function CastCard({ name }: { name: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["cast-image", name],
    queryFn: async () => {
      const res = await fetch(
        `/api/cast-image?name=${encodeURIComponent(name)}`,
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.url;
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const imageUrl = data && data !== "placeholder" ? data : null;

  return (
    <div
      className="flex flex-col items-center text-center space-y-2 p-1.5 w-24 md:w-28 flex-shrink-0 group cursor-pointer"
      title={name}
    >
      <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border border-white/10 group-hover:border-netflixRed/80 group-hover:scale-105 bg-neutral-900/60 flex items-center justify-center shadow-lg transition-all duration-300">
        {isLoading ? (
          <div className="w-full h-full bg-neutral-800 animate-pulse" />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-sm font-bold text-neutral-400">
            {initials || "?"}
          </span>
        )}
      </div>
      <div className="w-full truncate px-1">
        <p className="text-[11px] font-bold text-white group-hover:text-netflixRed transition-colors truncate">
          {name}
        </p>
        <p className="text-[9px] text-neutral-500 truncate mt-0.5">Actor</p>
      </div>
    </div>
  );
}

// ── Episode List (Plex Grid Style) ───────────────────────────
function EpisodeList({ episodes, slug }: { episodes: any[]; slug: string }) {
  const [serverIdx, setServerIdx] = useState(0);
  if (!episodes?.length) return null;

  const server = episodes[serverIdx];
  const items = server?.server_data || [];

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400">
          Danh Sách Tập Phim
        </h3>
        {/* Server selection tabs */}
        {episodes.length > 1 && (
          <div className="flex gap-2">
            {episodes.map((s: any, i: number) => (
              <button
                key={i}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold border transition-all",
                  i === serverIdx
                    ? "bg-netflixRed border-netflixRed text-white"
                    : "bg-white/5 border-white/10 text-neutral-400 hover:text-white",
                )}
                onClick={() => setServerIdx(i)}
              >
                {s.server_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Episode grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
        {items.map((ep: any, i: number) => (
          <Link
            key={ep.slug || i}
            href={`/watch/${slug}?ep=${ep.slug || ep.name}`}
            className="flex items-center justify-center bg-white/5 hover:bg-netflixRed border border-white/5 hover:border-netflixRed text-neutral-350 hover:text-white rounded-lg py-2.5 text-xs font-bold transition-all shadow-sm"
          >
            Tập {ep.name}
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

  // Fetch film detail
  const { data, isLoading, error } = useQuery({
    queryKey: ["film", slug],
    queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
  });

  // Fetch reviews
  const { data: reviewsData } = useQuery({
    queryKey: ["reviews", slug],
    queryFn: () =>
      reviewsApi
        .getByMovie(slug)
        .then((r) => r.data)
        .catch(() => ({ reviews: [], total: 0 })),
    enabled: !!data,
  });

  // Fetch rating
  const { data: ratingData } = useQuery({
    queryKey: ["rating", slug],
    queryFn: () =>
      ratingsApi
        .getAverage(slug)
        .then((r) => r.data)
        .catch(() => ({ average: 0, count: 0 })),
    enabled: !!data,
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

  // ── Smart Recommendation Query ─────────────────────────────────────
  const rawTitle = (
    film?.name ||
    film?.origin_name ||
    slug ||
    ""
  ).toLowerCase();
  const firstGenre = film?.category?.[0]?.slug;

  const matchedKeyword = useMemo(() => {
    const keywords = [
      "marvel",
      "dc",
      "superman",
      "batman",
      "spider-man",
      "spiderman",
      "avengers",
      "doraemon",
      "naruto",
      "one piece",
      "conan",
      "dragon ball",
      "harry potter",
      "star wars",
      "pokemon",
      "godzilla",
      "x-men",
      "transformers",
      "fast & furious",
      "john wick",
      "jurassic",
      "matrix",
      "avatar",
    ];
    return keywords.find((kw) => rawTitle.includes(kw));
  }, [rawTitle]);

  const { data: smartSimilarData } = useQuery({
    queryKey: ["smart-similar-films", slug, firstGenre, matchedKeyword],
    queryFn: async () => {
      const recItems: any[] = [];
      if (matchedKeyword) {
        try {
          const res = await movieApi.search(matchedKeyword, 1, 15);
          const items = res?.data?.items || res?.data?.data?.items || [];
          recItems.push(...items);
        } catch {}
      }
      if (firstGenre) {
        try {
          const res = await movieApi.getByGenre(firstGenre, 1);
          const items = res?.data?.data?.items || res?.data?.items || [];
          recItems.push(...items);
        } catch {}
      }
      try {
        const res = await movieApi.getLatest(1);
        const items = res?.data?.items || res?.data?.data?.items || [];
        recItems.push(...items);
      } catch {}

      const seen = new Set<string>();
      return recItems
        .filter((item: any) => {
          if (!item || !item.slug || item.slug === slug || seen.has(item.slug))
            return false;
          seen.add(item.slug);
          return true;
        })
        .slice(0, 12);
    },
    enabled: !!slug && !isNotFound,
  });

  const similarFilms = smartSimilarData || [];

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

  const posterUrl = film
    ? resolveImageUrl(film?.poster_url) ||
      resolveImageUrl(film?.thumb_url) ||
      undefined
    : undefined;

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
    if (isNotFound) return;
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

  if (isNotFound)
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
          title: film.name,
          thumbUrl: posterUrl,
          type: film.type,
          year: film.year,
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

  const reviews = reviewsData?.reviews || [];
  const avgRating = ratingData?.average || 0;
  const ratingCount = ratingData?.count || 0;

  const firstEp = episodes?.[0]?.server_data?.[0];
  const watchLink = firstEp
    ? `/watch/${slug}?ep=${firstEp.slug || firstEp.name}`
    : `/watch/${slug}`;

  return (
    <div className="bg-[#0f1216] min-h-screen text-foreground pb-24 font-sans relative">
      {/* ── Giant Backdrop Banner (Plex Style Left-to-Right Blended Layout) ── */}
      {posterUrl && (
        <div className="absolute top-0 left-0 right-0 h-[65vh] md:h-[82vh] w-full z-0 overflow-hidden select-none">
          <NextImage
            src={posterUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-top opacity-50 scale-105 filter blur-[1px]"
            unoptimized
          />
          {/* Subtle color overlay */}
          <div className="absolute inset-0 bg-[#0f1216]/60 backdrop-blur-[2px]" />
          {/* Plex gradient mask from left (opaque dark-slate) to right (translucent movie art) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f1216] via-[#0f1216]/90 to-transparent w-full md:w-[65%]" />
          {/* Gradient mask from bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0f1216] to-transparent" />
        </div>
      )}

      {/* ── Main Content Container ── */}
      <div className="relative z-10 container mx-auto px-4 md:px-12 pt-[14vh] md:pt-[18vh]">
        {/* ── Top Hero Area ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Hero Title & Info Section */}
          <div className="lg:col-span-8 flex flex-col space-y-4 md:space-y-6">
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider drop-shadow-2xl">
              {film.name}
            </h1>

            {/* Metadata Tags Row */}
            <div className="flex flex-wrap items-center gap-3.5 text-xs md:text-sm font-bold text-neutral-300">
              {film.quality && (
                <span className="bg-white/10 px-2.5 py-0.5 rounded text-[10px] uppercase font-extrabold tracking-wide backdrop-blur-md border border-white/5">
                  {film.quality}
                </span>
              )}
              {film.lang && (
                <span className="border border-white/20 bg-black/10 px-2 py-0.5 rounded text-[10px] font-semibold">
                  {film.lang}
                </span>
              )}
              <span className="text-neutral-300">{film.year}</span>
              <span className="text-neutral-400">&bull;</span>
              <span className="text-neutral-350">{film.time}</span>
              <span className="text-neutral-400">&bull;</span>
              <span className="text-neutral-350 font-semibold">
                {film.category?.map((c: any) => c.name).join(", ")}
              </span>
            </div>

            {/* Play and Action Widgets */}
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <Link
                href={watchLink}
                className="bg-white hover:bg-neutral-200 text-black px-8 py-3 rounded-full font-black tracking-wider uppercase text-xs shadow-xl flex items-center space-x-2 transition-transform hover:scale-105"
                onMouseEnter={prefetchWatchData}
              >
                <Play size={14} fill="currentColor" />
                <span>{t("watch.watchFilm", "Xem phim")}</span>
              </Link>

              <button
                onClick={() =>
                  toast(
                    t("film.trailerLoading", "Tính năng trailer đang tải!"),
                    "info",
                  )
                }
                className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-full font-black tracking-wider uppercase text-xs border border-white/10 backdrop-blur-md transition-colors"
              >
                {t("film.trailer", "Trailer")}
              </button>

              {/* Plex Circle Indicator Buttons */}
              <div className="flex items-center space-x-4 ml-2">
                {/* Watchlist Button */}
                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={handleWatchlist}
                    className={cn(
                      "w-10 h-10 rounded-full border flex items-center justify-center backdrop-blur-md transition-all",
                      inWatchlist
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-white/5 border-white/10 text-neutral-300 hover:text-white hover:border-white/30",
                    )}
                  >
                    {inWatchlist ? (
                      <Check size={16} className="stroke-[3]" />
                    ) : (
                      <Plus size={16} />
                    )}
                  </button>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                    {t("nav.watchlist", "Watchlist")}
                  </span>
                </div>

                {/* Follow Episode Notification Button */}
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
                    className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 hover:border-emerald-500/50 backdrop-blur-md transition-all text-neutral-300 hover:text-emerald-400 cursor-pointer"
                  >
                    <Bell size={16} />
                  </button>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                    Theo dõi
                  </span>
                </div>

                {/* Rating Button */}
                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={() => handleRate(5)}
                    className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 hover:border-white/30 backdrop-blur-md transition-all text-neutral-300 hover:text-white"
                  >
                    <Star
                      size={16}
                      fill={myRating ? "currentColor" : "none"}
                      className={cn(myRating ? "text-amber-500" : "")}
                    />
                  </button>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                    {t("watch.rate", "Đánh giá")}
                  </span>
                </div>

                {/* Share Button */}
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
                    className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 hover:border-white/30 backdrop-blur-md transition-all text-neutral-300 hover:text-white"
                  >
                    <Share2 size={16} />
                  </button>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                    {t("film.share", "Chia sẻ")}
                  </span>
                </div>
              </div>
            </div>

            {/* Synopsis Section */}
            {cleanContent && (
              <div className="pt-2 text-sm md:text-base text-neutral-300 leading-relaxed max-w-2xl drop-shadow-md">
                <p>{cleanContent}</p>
              </div>
            )}

            {/* Meta Directors/Writers */}
            <div className="pt-4 border-t border-white/5 flex flex-col gap-2.5 text-xs text-neutral-400 max-w-xl">
              {directors.length > 0 && (
                <p>
                  <span className="font-bold text-neutral-500 mr-2 uppercase tracking-wide">
                    {t("film.director", "Đạo diễn")}:
                  </span>
                  <span className="text-neutral-300 font-semibold">
                    {directors.join(", ")}
                  </span>
                </p>
              )}
              {film.origin_name && (
                <p>
                  <span className="font-bold text-neutral-500 mr-2 uppercase tracking-wide">
                    {t("film.originName", "Tên gốc")}:
                  </span>
                  <span className="text-neutral-300 font-semibold italic">
                    {film.origin_name}
                  </span>
                </p>
              )}
              <p>
                <span className="font-bold text-neutral-500 mr-2 uppercase tracking-wide">
                  {t("film.ageRating", "Độ tuổi")}:
                </span>
                <span className="inline-block border border-white/20 bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wider">
                  {film.type === "series" ? "TV-MA" : "PG-13"}
                </span>
              </p>
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

        {/* ── Grid Sections (Cast, Episodes, Reviews) ── */}
        <div className="mt-16 space-y-12">
          {/* Series Episode Grid */}
          {film.type === "series" && episodes.length > 0 && (
            <div className="bg-[#151920]/80 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <EpisodeList episodes={episodes} slug={slug} />
            </div>
          )}

          {/* Cast Members (Diễn viên) */}
          {actors.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 border-b border-white/5 pb-2">
                {t("film.cast", "Diễn Viên Tham Gia")}
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
                {actors.map((actor, idx) => (
                  <CastCard key={idx} name={actor} />
                ))}
              </div>
            </div>
          )}

          {/* Reviews & Average Rating */}
          <div className="space-y-8 pt-4">
            {/* Top Row: Write Review Box & Average Rating Box (Equal Height side-by-side) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Write Review Column */}
              <div className="lg:col-span-8">
                <WriteReview movieId={slug} />
              </div>

              {/* Average Rating Stats */}
              <div className="lg:col-span-4 bg-[#151920]/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg h-full min-h-[160px]">
                <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-3">
                  {t("film.averageRating", "Đánh giá chung")}
                </h3>
                <StarRating
                  value={myRating || avgRating}
                  onChange={handleRate}
                  size={28}
                />
                {avgRating > 0 && (
                  <p className="text-xs text-neutral-400 mt-2.5">
                    <span className="text-white font-extrabold text-xl">
                      {avgRating.toFixed(1)} ★
                    </span>{" "}
                    <br />
                    <span className="text-neutral-500 font-medium">
                      ({ratingCount}{" "}
                      {t("film.ratingCountSuffix", "lượt đánh giá")})
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Row: User Reviews List */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 border-b border-white/5 pb-2">
                {t("film.reviewsTitle", "Bình luận người dùng")} (
                {reviews.length})
              </h3>
              <div className="flex flex-col gap-3.5">
                {reviews.map((r: any) => (
                  <ReviewItem key={r.id} review={r} />
                ))}
                {reviews.length === 0 && (
                  <div className="text-neutral-500 text-xs py-4 italic">
                    {t(
                      "film.noReviews",
                      "Chưa có bình luận nào cho phim này. Hãy là người đầu tiên bình luận!",
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Similar recommendations row (Phim tương tự) */}
          {similarFilms.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 border-b border-white/5 pb-2">
                {t("film.similarFilms", "Có Thể Bạn Cũng Thích")}
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
                {similarFilms.map((item: any) => {
                  const thumb =
                    resolveImageUrl(item.thumb_url) ||
                    resolveImageUrl(item.poster_url);
                  return (
                    <Link
                      key={item.slug}
                      href={`/film/${item.slug}`}
                      className="w-32 md:w-36 flex-shrink-0 flex flex-col bg-[#151920]/40 border border-white/5 rounded-xl overflow-hidden group hover:border-white/20 transition-all shadow-md"
                    >
                      <div className="aspect-[2/3] bg-neutral-900 overflow-hidden relative">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-700">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-center min-w-0">
                        <p className="font-bold text-[10px] text-white line-clamp-1 group-hover:text-netflixRed transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[8px] text-neutral-500 mt-0.5">
                          {item.year}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
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
