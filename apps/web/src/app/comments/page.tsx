"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Flame,
  Clock,
  Star,
  Play,
  Share2,
  Search,
  Film,
  Send,
  ShieldCheck,
  Award,
  EyeOff,
  Plus,
  X,
  RefreshCw,
  Sparkles,
  Heart,
  Folder,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
} from "lucide-react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { useToast } from "@/providers/ToastProvider";
import { reviewsApi, movieApi } from "@/lib/api";

export interface CommunityComment {
  id: string;
  movieSlug: string;
  movieName: string;
  moviePoster?: string;
  movieBackdrop?: string;
  episodeName?: string;
  userName: string;
  userAvatar: string;
  userRole?: string;
  content: string;
  rating?: number;
  likes: number;
  dislikes?: number;
  replyCount: number;
  createdAt: number;
  hasSpoiler?: boolean;
  genreSlug?: string;
  genres?: string[];
}

export const HOT_GENRES = [
  { id: "all", label: "Tất cả", aliases: [] },
  { id: "co-trang", label: "Cổ Trang", aliases: ["cổ trang", "co-trang", "kiếm hiệp", "kiem-hiep", "tiên hiệp"] },
  { id: "hanh-dong", label: "Hành Động", aliases: ["hành động", "hanh-dong", "action"] },
  { id: "vien-tuong", label: "Viễn Tưởng", aliases: ["viễn tưởng", "vien-tuong", "khoa học", "sci-fi"] },
  { id: "tinh-cam", label: "Tình Cảm", aliases: ["tình cảm", "tinh-cam", "lãng mạn", "romance", "tâm lý"] },
  { id: "kinh-di", label: "Kinh Dị", aliases: ["kinh dị", "kinh-di", "horror", "bí ẩn"] },
  { id: "hai-huoc", label: "Hài Hước", aliases: ["hài hước", "hai-huoc", "comedy"] },
  { id: "anime", label: "Hoạt Hình / Anime", aliases: ["hoạt hình", "hoat-hinh", "anime", "animation"] },
  { id: "chieu-rap", label: "Chiếu Rạp", aliases: ["chiếu rạp", "chieu-rap", "theatrical"] },
  { id: "series", label: "Phim Bộ", aliases: ["phim-bo", "series", "tvshows"] },
  { id: "single", label: "Phim Lẻ", aliases: ["phim-le", "single"] },
];

const KNOWN_MOVIE_ARTWORKS: Record<
  string,
  { poster: string; backdrop: string; name: string; genres: string[] }
> = {
  "oppenheimer": {
    name: "Oppenheimer",
    poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg",
    genres: ["Chính Kịch", "Lịch Sử", "Chiếu Rạp"],
  },
  "dune-phan-hai": {
    name: "Hành Tinh Cát: Phần Hai",
    poster: "https://image.tmdb.org/t/p/w500/8QdnKQyZDlN6rBSrfU1V5PctfUu.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg",
    genres: ["Khoa Học Viễn Tưởng", "Hành Động", "Chiếu Rạp"],
  },
  "quat-mo-trung-ma": {
    name: "Quật Mộ Trùng Ma",
    poster: "https://image.tmdb.org/t/p/w500/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/j3Z3XktmWB1VhsS8iXNcrR86PXi.jpg",
    genres: ["Kinh Dị", "Bí Ẩn", "Chiếu Rạp"],
  },
  "shogun-2024": {
    name: "Shōgun: Tướng Quân",
    poster: "https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/5zmiBoMzeW3v75Z13B136gP6F2b.jpg",
    genres: ["Cổ Trang", "Lịch Sử", "Phim Bộ"],
  },
  "nu-hoang-nuoc-mat": {
    name: "Nữ Hoàng Nước Mắt",
    poster: "https://image.tmdb.org/t/p/w500/2me55vg6uB5nK1yQ7QYkQ92oY8u.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/7N7j0y1yU14PUepFNeSNGUTiHW.jpg",
    genres: ["Tình Cảm", "Hài Hước", "Phim Bộ"],
  },
  "lat-mat-7-mot-dieu-uoc": {
    name: "Lật Mặt 7: Một Điều Ước",
    poster: "https://phimimg.com/uploads/movies/20240428/lat-mat-7-mot-dieu-uoc-poster.webp",
    backdrop: "https://phimimg.com/uploads/movies/20240428/lat-mat-7-mot-dieu-uoc-thumb.webp",
    genres: ["Tâm Lý", "Gia Đình", "Chiếu Rạp"],
  },
  "solo-leveling-toi-cuong-thang-cap": {
    name: "Tôi Thăng Cấp Một Mình",
    poster: "https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuPxJ8HGao.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/2rmK7mnchw9Xr3XdiTFSxTT0Yqi.jpg",
    genres: ["Hoạt Hình", "Hành Động", "Anime"],
  },
  "chu-thuat-hoi-chien-phan-2": {
    name: "Chú Thuật Hồi Chiến (Mùa 2)",
    poster: "https://image.tmdb.org/t/p/w500/hFWP5w9h9f8F5H7XW6gG7K2eG2n.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/a9069b26e2e2a229168f18471b05814e.jpg",
    genres: ["Hoạt Hình", "Hành Động", "Anime"],
  },
  "tho-san-co-vat": {
    name: "Thợ Săn Cổ Vật",
    poster: "https://phimimg.com/upload/vod/20230926-1/9fd12ecb8a43850ff2e5b785a0c1ae72.jpg",
    backdrop: "https://phimimg.com/upload/vod/20230926-1/be9b88427f1745af49ad15bf54642b9e.jpg",
    genres: ["Phiêu Lưu", "Hành Động", "Chiếu Rạp"],
  },
  "cuoc-doi-cua-pi": {
    name: "Cuộc Đời Của Pi",
    poster: "https://phimimg.com/upload/vod/20231023-1/97760d0209f95609b76a90e9cd05ac44.jpg",
    backdrop: "https://phimimg.com/upload/vod/20231023-1/0d931233a1bf7c7259ff848e61913f79.jpg",
    genres: ["Phiêu Lưu", "Chính Kịch", "Chiếu Rạp"],
  },
};

const TRENDING_MOVIE_SUGGESTIONS = [
  { name: "Oppenheimer", slug: "oppenheimer", genre: "chieu-rap" },
  { name: "Hành Tinh Cát: Phần Hai (Dune 2)", slug: "dune-phan-hai", genre: "chieu-rap" },
  { name: "Quật Mộ Trùng Ma (Exhuma)", slug: "quat-mo-trung-ma", genre: "chieu-rap" },
  { name: "Shōgun: Tướng Quân", slug: "shogun-2024", genre: "series" },
  { name: "Nữ Hoàng Nước Mắt (Queen of Tears)", slug: "nu-hoang-nuoc-mat", genre: "series" },
  { name: "Lật Mặt 7: Một Điều Ước", slug: "lat-mat-7-mot-dieu-uoc", genre: "chieu-rap" },
  { name: "Tôi Thăng Cấp Một Mình (Solo Leveling)", slug: "solo-leveling-toi-cuong-thang-cap", genre: "anime" },
  { name: "Chú Thuật Hồi Chiến (Mùa 2)", slug: "chu-thuat-hoi-chien-phan-2", genre: "anime" },
];

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d trước`;
  return `${Math.floor(diffDay / 30)} tháng trước`;
}

// ── Thành phần thẻ bình luận đồng bộ chuẩn Cinematic ─────────────────
interface CommentCardProps {
  comment: CommunityComment;
  user: any;
  userLikes: Record<string, boolean>;
  userDislikes: Record<string, boolean>;
  likedCounts: Record<string, number>;
  dislikedCounts: Record<string, number>;
  spoilerRevealed: Record<string, boolean>;
  movieArtworks: Record<string, { poster: string; backdrop: string; name: string; genres: string[] }>;
  onToggleLike: (commentId: string, initialLikes: number) => void;
  onToggleDislike: (commentId: string, initialDislikes: number) => void;
  onRevealSpoiler: (commentId: string) => void;
  onShare: (comment: CommunityComment) => void;
}

export function CommentCard({
  comment,
  user,
  userLikes,
  userDislikes,
  likedCounts,
  dislikedCounts,
  spoilerRevealed,
  movieArtworks,
  onToggleLike,
  onToggleDislike,
  onRevealSpoiler,
  onShare,
}: CommentCardProps) {
  const isLiked = userLikes[comment.id] || false;
  const isDisliked = userDislikes[comment.id] || false;
  const likesCount = likedCounts[comment.id] ?? comment.likes;
  const dislikesCount = dislikedCounts[comment.id] ?? (comment.dislikes || 0);
  const isSpoilerHidden = comment.hasSpoiler && !spoilerRevealed[comment.id];

  const isCurrentUser = Boolean(
    user && (
      (user.displayName && comment.userName.toLowerCase() === user.displayName.toLowerCase()) ||
      (user.username && comment.userName.toLowerCase() === user.username.toLowerCase()) ||
      (comment.userName.toLowerCase() === "admin" &&
        (user.username?.toLowerCase() === "admin" || user.email?.toLowerCase() === "huywashere@gmail.com"))
    )
  );

  const effectiveAvatar =
    isCurrentUser && user?.avatarUrl
      ? user.avatarUrl
      : comment.userAvatar || "https://ui-avatars.com/api/?name=U&background=1e293b&color=fff";
  const effectiveName =
    isCurrentUser && (user?.displayName || user?.username)
      ? user.displayName || user.username
      : comment.userName;

  const artwork = movieArtworks[comment.movieSlug];
  const effectivePoster = comment.moviePoster || artwork?.poster;
  const effectiveBackdrop = comment.movieBackdrop || artwork?.backdrop || effectivePoster;
  const effectiveMovieTitle = comment.movieName || artwork?.name || comment.movieSlug;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] hover:border-white/[0.22] transition-all duration-300 p-4 sm:p-4.5 flex flex-col justify-between group shadow-lg min-h-[175px] bg-[#12141c] hover:shadow-cyan-950/20">
      {/* Ảnh nền phim làm mờ (Ambient Movie Backdrop) */}
      {effectiveBackdrop && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={effectiveBackdrop}
            alt=""
            className="w-full h-full object-cover blur-xl scale-125 opacity-20 group-hover:opacity-30 transition-opacity duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#141622]/85 via-[#11131c]/92 to-[#0c0d14]/98" />
        </div>
      )}

      {/* Nội dung chính bên trong thẻ */}
      <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
        {/* Hàng đầu: Avatar + Tên người dùng bên trái, Poster phim bên phải */}
        <div className="flex items-start justify-between gap-3">
          {/* Bên trái: Avatar & Username */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={effectiveAvatar}
                alt={effectiveName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10 ring-offset-2 ring-offset-black/40 bg-neutral-800"
                loading="lazy"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate max-w-[130px] sm:max-w-[160px]">
                  {effectiveName}
                </span>
                {/* Biểu tượng vô cực đồng bộ chuẩn thiết kế */}
                <span
                  className="text-neutral-400 text-xs font-semibold select-none leading-none"
                  title="Thành viên cộng đồng FlexPhim"
                >
                  ∞
                </span>
              </div>
              {comment.userRole && comment.userRole !== "Thành viên" && (
                <span
                  className={cn(
                    "inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider mt-0.5",
                    comment.userRole === "ADMIN"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30",
                  )}
                >
                  {comment.userRole}
                </span>
              )}
            </div>
          </div>

          {/* Bên phải: Poster phim thu nhỏ (Movie Thumbnail) */}
          {effectivePoster ? (
            <Link
              href={`/watch/${comment.movieSlug}`}
              title={`Xem phim: ${effectiveMovieTitle}`}
              className="relative shrink-0 w-10 h-14 sm:w-11 sm:h-15 rounded-lg overflow-hidden border border-white/20 shadow-md group/poster hover:scale-105 hover:border-cyan-400 transition-all cursor-pointer block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={effectivePoster}
                alt={effectiveMovieTitle}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </Link>
          ) : (
            <Link
              href={`/watch/${comment.movieSlug}`}
              title={effectiveMovieTitle}
              className="shrink-0 w-10 h-14 sm:w-11 sm:h-15 rounded-lg bg-neutral-800/80 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            >
              <Film size={15} />
            </Link>
          )}
        </div>

        {/* Thân bình luận */}
        <div className="flex-1">
          {isSpoilerHidden ? (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
              <p className="text-[11px] text-amber-300 font-semibold flex items-center justify-center gap-1">
                <EyeOff size={12} />
                Bình luận chứa tiết lộ nội dung (Spoiler)
              </p>
              <button
                type="button"
                onClick={() => onRevealSpoiler(comment.id)}
                className="text-[10px] font-bold text-white underline hover:text-amber-300 transition-colors"
              >
                Bấm để xem nội dung
              </button>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-neutral-200 line-clamp-3 leading-relaxed font-normal">
              {comment.content}
            </p>
          )}
        </div>

        {/* Hàng dưới: Lượt thích, Không thích, Số phản hồi */}
        <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Lượt thích (Upvote) */}
            <button
              type="button"
              onClick={() => onToggleLike(comment.id, comment.likes)}
              className={cn(
                "flex items-center gap-1 transition-colors cursor-pointer group/up",
                isLiked ? "text-cyan-400 font-bold" : "hover:text-white",
              )}
              title="Thích bình luận này"
            >
              <svg
                className={cn(
                  "w-4 h-4 transition-transform group-hover/up:scale-110",
                  isLiked ? "fill-cyan-400 text-cyan-400" : "fill-none stroke-current",
                )}
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m16 12-4-4-4 4M12 16V8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[11px]">{likesCount}</span>
            </button>

            {/* Không thích (Downvote) */}
            <button
              type="button"
              onClick={() => onToggleDislike(comment.id, comment.dislikes || 0)}
              className={cn(
                "flex items-center gap-1 transition-colors cursor-pointer group/down",
                isDisliked ? "text-rose-400 font-bold" : "hover:text-white",
              )}
              title="Không thích"
            >
              <svg
                className={cn(
                  "w-4 h-4 transition-transform group-hover/down:scale-110",
                  isDisliked ? "fill-rose-400 text-rose-400" : "fill-none stroke-current",
                )}
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m8 12 4 4 4-4M12 8v8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[11px]">{dislikesCount}</span>
            </button>

            {/* Phản hồi / Thảo luận */}
            <Link
              href={`/watch/${comment.movieSlug}`}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer group/chat"
              title="Xem thảo luận trên trang xem phim"
            >
              <MessageSquare size={13} className="group-hover/chat:text-cyan-400 transition-colors" />
              <span className="text-[11px]">{comment.replyCount || 0}</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onShare(comment)}
              title="Sao chép liên kết"
              className="hover:text-white transition-colors"
            >
              <Share2 size={12} />
            </button>
            <span className="text-[10px] text-neutral-400">
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Trang Bình Luận Chính ───────────────────────────────────────────
export default function CommentsPage() {
  const { user } = useAuthStore();
  const { openModal } = useAuthModalStore();
  const { toast } = useToast();

  // Tab điều hướng: "hot" (Sôi nổi nhất), "top" (Yêu thích nhất)
  const [activeTab, setActiveTab] = useState<"hot" | "top">("hot");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Tương tác
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userDislikes, setUserDislikes] = useState<Record<string, boolean>>({});
  const [likedCounts, setLikedCounts] = useState<Record<string, number>>({});
  const [dislikedCounts, setDislikedCounts] = useState<Record<string, number>>({});
  const [spoilerRevealed, setSpoilerRevealed] = useState<Record<string, boolean>>({});

  // Dữ liệu bình luận thực tế (Database & Watch pages)
  const [dbComments, setDbComments] = useState<CommunityComment[]>([]);
  const [customComments, setCustomComments] = useState<CommunityComment[]>([]);
  const [watchComments, setWatchComments] = useState<CommunityComment[]>([]);
  const [movieArtworks, setMovieArtworks] = useState<
    Record<string, { poster: string; backdrop: string; name: string; genres: string[] }>
  >(KNOWN_MOVIE_ARTWORKS);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Trình soạn thảo bình luận
  const [showComposer, setShowComposer] = useState(false);
  const [newMovieSlug, setNewMovieSlug] = useState("");
  const [newMovieName, setNewMovieName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [hasSpoiler, setHasSpoiler] = useState(false);

  // Thanh cuộn ngang ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -340, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 340, behavior: "smooth" });
    }
  };

  // Nạp bình luận thực tế từ Backend API
  const fetchRealComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reviewsApi.getRecent(1);
      const items = Array.isArray(res?.data) ? res.data : [];
      if (items.length > 0) {
        const mapped: CommunityComment[] = items.map((r: any) => ({
          id: r.id,
          movieSlug: r.movie?.id || r.movieId,
          movieName: r.movie?.title || r.movieId,
          moviePoster: r.movie?.posterUrl || r.movie?.thumbUrl,
          movieBackdrop: r.movie?.thumbUrl || r.movie?.posterUrl,
          episodeName: "Tập Full",
          userName: r.user?.displayName || r.user?.username || "Thành viên FlexPhim",
          userAvatar:
            r.user?.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(r.user?.displayName || r.user?.username || "U")}&background=1e293b&color=fff`,
          userRole:
            r.user?.role === "ADMIN" || r.user?.role === "SUPER_ADMIN"
              ? "ADMIN"
              : r.user?.role === "MODERATOR"
                ? "MOD"
                : "Thành viên",
          content: r.content,
          rating: r.rating || 5,
          likes: r.likeCount || 0,
          dislikes: 0,
          replyCount: 0,
          createdAt: new Date(r.createdAt).getTime(),
          hasSpoiler: false,
          genreSlug: r.movie?.type === "series" ? "series" : "single",
        }));
        setDbComments(mapped);
      }
    } catch {
      // API cold catch
    } finally {
      setLoading(false);
    }
  }, []);

  // Nạp dữ liệu từ localStorage
  useEffect(() => {
    void fetchRealComments();

    const loadSaved = () => {
      try {
        const savedLikes = localStorage.getItem("netphim_community_comment_likes");
        if (savedLikes) setUserLikes(JSON.parse(savedLikes));

        const savedDislikes = localStorage.getItem("netphim_community_comment_dislikes");
        if (savedDislikes) setUserDislikes(JSON.parse(savedDislikes));

        const savedCustom = localStorage.getItem("netphim_community_custom_comments");
        let customList: CommunityComment[] = [];
        if (savedCustom) {
          const parsed = JSON.parse(savedCustom);
          if (Array.isArray(parsed)) {
            customList = parsed.filter(
              (c: any) => !c.id?.startsWith("cmt_seed_") && !c.id?.startsWith("seed-"),
            );
          }
        }
        setCustomComments(customList);

        // Thu thập bình luận thực tế người dùng gửi từ các trang xem phim
        const collected: CommunityComment[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("netphim_comments_tree_")) {
            const slug = key.replace("netphim_comments_tree_", "");
            if (slug && slug !== "default") {
              const raw = localStorage.getItem(key);
              if (raw) {
                try {
                  const parsed = JSON.parse(raw);
                  if (Array.isArray(parsed)) {
                    parsed.forEach((c: any) => {
                      if (
                        c.id &&
                        !c.id.startsWith("seed-") &&
                        !c.id.startsWith("cmt_seed_") &&
                        c.content
                      ) {
                        collected.push({
                          id: c.id,
                          movieSlug: slug,
                          movieName:
                            c.movieName ||
                            slug.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
                          moviePoster: c.moviePoster,
                          movieBackdrop: c.movieBackdrop,
                          episodeName: c.episode || "Tập Full",
                          userName: c.user?.name || "Thành viên FlexPhim",
                          userAvatar:
                            c.user?.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user?.name || "U")}&background=1e293b&color=fff`,
                          userRole: c.user?.role || "Thành viên",
                          content: c.content,
                          rating: c.rating || 5,
                          likes: c.likes || 0,
                          dislikes: c.dislikes || 0,
                          replyCount: Array.isArray(c.replies) ? c.replies.length : 0,
                          createdAt: c.createdAt || Date.now(),
                          genreSlug: "single",
                        });
                      }
                    });
                  }
                } catch {}
              }
            }
          }
        }
        setWatchComments(collected);
      } catch {}
    };

    loadSaved();
    window.addEventListener("netphim_user_updated", loadSaved);
    window.addEventListener("storage", loadSaved);
    return () => {
      window.removeEventListener("netphim_user_updated", loadSaved);
      window.removeEventListener("storage", loadSaved);
    };
  }, [fetchRealComments]);

  // Tổng hợp tất cả bình luận thực tế (không demo)
  const allComments = useMemo(() => {
    const combined = [...customComments, ...watchComments, ...dbComments];
    const seen = new Set<string>();
    return combined.filter((c) => {
      if (!c.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [customComments, watchComments, dbComments]);

  // Tự động tìm kiếm ảnh poster và backdrop chuẩn cho các phim trong bình luận
  useEffect(() => {
    const missingSlugs = Array.from(
      new Set(
        allComments
          .map((c) => c.movieSlug)
          .filter((slug) => slug && !movieArtworks[slug]?.poster),
      ),
    );

    if (missingSlugs.length === 0) return;

    let isMounted = true;
    const fetchArtworks = async () => {
      const updates: Record<
        string,
        { poster: string; backdrop: string; name: string; genres: string[] }
      > = {};

      await Promise.all(
        missingSlugs.slice(0, 15).map(async (slug) => {
          try {
            const res = await movieApi.getDetail(slug).catch(() => null);
            const m = res?.data?.movie || res?.data?.item;
            if (m) {
              const poster = m.poster_url || m.thumb_url || "";
              const backdrop = m.thumb_url || m.poster_url || "";
              const name = m.name || m.title || slug;
              const genres = Array.isArray(m.category)
                ? m.category.map((cat: any) => cat.name || cat.slug || "")
                : [];
              updates[slug] = { poster, backdrop, name, genres };
            }
          } catch {}
        }),
      );

      if (isMounted && Object.keys(updates).length > 0) {
        setMovieArtworks((prev) => ({ ...prev, ...updates }));
      }
    };

    void fetchArtworks();
    return () => {
      isMounted = false;
    };
  }, [allComments, movieArtworks]);

  // Bộ lọc và sắp xếp bình luận
  const displayedComments = useMemo(() => {
    let list = allComments;

    // Lọc theo thể loại
    if (selectedGenre !== "all") {
      const targetGenre = HOT_GENRES.find((g) => g.id === selectedGenre);
      const aliases = targetGenre?.aliases || [selectedGenre];

      list = list.filter((c) => {
        if (c.genreSlug === selectedGenre) return true;
        const artwork = movieArtworks[c.movieSlug];
        if (artwork?.genres && artwork.genres.length > 0) {
          return artwork.genres.some((g) =>
            aliases.some((a) => g.toLowerCase().includes(a.toLowerCase())),
          );
        }
        return false;
      });
    }

    // Lọc theo ô tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.content.toLowerCase().includes(q) ||
          c.movieName.toLowerCase().includes(q) ||
          c.userName.toLowerCase().includes(q),
      );
    }

    // Sắp xếp theo Tab
    if (activeTab === "hot") {
      // SÔI NỔI NHẤT: ưu tiên bình luận có nhiều phản hồi và tương tác cao
      return [...list].sort((a, b) => {
        const scoreA = (a.replyCount * 3) + (likedCounts[a.id] ?? a.likes) * 2;
        const scoreB = (b.replyCount * 3) + (likedCounts[b.id] ?? b.likes) * 2;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.createdAt - a.createdAt;
      });
    }

    if (activeTab === "top") {
      // YÊU THÍCH NHẤT: sắp xếp theo số lượt thích cao nhất
      return [...list].sort((a, b) => {
        const likesA = likedCounts[a.id] ?? a.likes;
        const likesB = likedCounts[b.id] ?? b.likes;
        if (likesB !== likesA) return likesB - likesA;
        return b.createdAt - a.createdAt;
      });
    }

    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [allComments, selectedGenre, searchQuery, activeTab, likedCounts, movieArtworks]);

  // Xử lý Thích (Upvote)
  const handleToggleLike = async (commentId: string, initialLikes: number) => {
    const isLiked = !userLikes[commentId];
    const newLikesMap = { ...userLikes, [commentId]: isLiked };
    setUserLikes(newLikesMap);

    const currentCount = likedCounts[commentId] ?? initialLikes;
    setLikedCounts((prev) => ({
      ...prev,
      [commentId]: isLiked ? currentCount + 1 : Math.max(0, currentCount - 1),
    }));

    try {
      localStorage.setItem("netphim_community_comment_likes", JSON.stringify(newLikesMap));
    } catch {}

    if (user && !commentId.startsWith("cmt_user_")) {
      try {
        await reviewsApi.like(commentId);
      } catch {}
    }
  };

  // Xử lý Không thích (Downvote)
  const handleToggleDislike = (commentId: string, initialDislikes: number) => {
    const isDisliked = !userDislikes[commentId];
    const newDislikesMap = { ...userDislikes, [commentId]: isDisliked };
    setUserDislikes(newDislikesMap);

    const currentCount = dislikedCounts[commentId] ?? initialDislikes;
    setDislikedCounts((prev) => ({
      ...prev,
      [commentId]: isDisliked ? currentCount + 1 : Math.max(0, currentCount - 1),
    }));

    try {
      localStorage.setItem("netphim_community_comment_dislikes", JSON.stringify(newDislikesMap));
    } catch {}
  };

  const handleShareComment = (comment: CommunityComment) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/watch/${comment.movieSlug}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        toast("Đã sao chép liên kết phim vào bộ nhớ tạm!", "info");
      }
    }
  };

  const handleSelectTrending = (item: (typeof TRENDING_MOVIE_SUGGESTIONS)[0]) => {
    setNewMovieName(item.name);
    setNewMovieSlug(item.slug);
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    if (!user) {
      openModal("login");
      return;
    }

    setSubmitting(true);
    try {
      const res = await reviewsApi
        .create({
          movieId: newMovieSlug || "phim-chua-dat-ten",
          content: newContent.trim(),
          rating: newRating,
        })
        .catch(() => null);

      const createdId = res?.data?.id || `cmt_user_${Date.now()}`;
      const artwork = movieArtworks[newMovieSlug];

      const created: CommunityComment = {
        id: createdId,
        movieSlug: newMovieSlug || "phim-chua-dat-ten",
        movieName: newMovieName || "Phim Đang Xem",
        moviePoster: artwork?.poster,
        movieBackdrop: artwork?.backdrop,
        userName: user.displayName || user.username || "Thành viên FlexPhim",
        userAvatar:
          user.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username || "U")}&background=1e293b&color=fff`,
        userRole:
          (user.role as string) === "ADMIN" || (user.role as string) === "SUPER_ADMIN"
            ? "ADMIN"
            : user.role === "MODERATOR"
              ? "MOD"
              : "Thành viên",
        content: newContent.trim(),
        rating: newRating,
        likes: 1,
        dislikes: 0,
        replyCount: 0,
        createdAt: Date.now(),
        hasSpoiler,
        genreSlug: selectedGenre === "all" ? "single" : selectedGenre,
      };

      const nextCustom = [created, ...customComments];
      setCustomComments(nextCustom);
      setNewContent("");
      setShowComposer(false);

      try {
        localStorage.setItem("netphim_community_custom_comments", JSON.stringify(nextCustom));
      } catch {}

      toast("Bình luận của bạn đã được đăng thành công!", "success");
      void fetchRealComments();
    } catch {
      toast("Đã lưu bình luận thành công!", "success");
    } finally {
      setSubmitting(false);
    }
  };

  const activeGenreObj = HOT_GENRES.find((g) => g.id === selectedGenre);
  const selectedGenreLabel = activeGenreObj?.label || "Tất cả";

  return (
    <main
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#0a0b10] text-white pb-24 sm:pb-28 pt-16 sm:pt-20 select-none",
      )}
    >
      {/* Nền studio tối giản đồng bộ Trang Chủ */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-white/[0.025] to-transparent blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-3.5 sm:px-8 lg:px-12 space-y-6">
        {/* ── Tiêu đề trang & Thanh công cụ ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-white/[0.08] gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <MessageSquare size={24} className="text-cyan-400" />
              Bình Luận Phim
            </h1>
            <p className="text-[11px] sm:text-xs text-neutral-400 font-medium mt-1">
              Khám phá và tham gia các thảo luận sôi nổi từ cộng đồng khán giả FlexPhim
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void fetchRealComments()}
              disabled={loading}
              title="Làm mới dữ liệu bình luận"
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-[#12141c] border border-white/[0.08] hover:bg-white/[0.06] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RefreshCw size={13} className={cn("transition-transform", loading && "animate-spin text-cyan-400")} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!user) {
                  openModal("login");
                } else {
                  setShowComposer(!showComposer);
                }
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-900/20 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Viết Bình Luận</span>
            </button>
          </div>
        </div>

        {/* ── Dải 3 Tab Điều Hướng Chuẩn Hình Ảnh (SÔI NỔI NHẤT, YÊU THÍCH NHẤT, THỂ LOẠI HOT) ── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            {/* Dải 3 Tab */}
            <div className="flex items-center gap-6 sm:gap-9 text-xs sm:text-sm font-extrabold uppercase tracking-wider overflow-x-auto no-scrollbar py-1">
              {/* Tab 1: SÔI NỔI NHẤT */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("hot");
                  setShowGenreDropdown(false);
                }}
                className={cn(
                  "flex items-center gap-2 pb-1.5 transition-all cursor-pointer relative shrink-0",
                  activeTab === "hot" ? "text-white" : "text-neutral-400 hover:text-neutral-200",
                )}
              >
                <Flame
                  size={16}
                  className={cn(
                    "transition-colors",
                    activeTab === "hot" ? "text-amber-400 fill-amber-400" : "text-neutral-400",
                  )}
                />
                <span>SÔI NỔI NHẤT</span>
                {activeTab === "hot" && (
                  <span className="absolute -bottom-[6px] left-0 right-0 h-[2.5px] bg-amber-400 rounded-full" />
                )}
              </button>

              {/* Tab 2: YÊU THÍCH NHẤT */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("top");
                  setShowGenreDropdown(false);
                }}
                className={cn(
                  "flex items-center gap-2 pb-1.5 transition-all cursor-pointer relative shrink-0",
                  activeTab === "top" ? "text-white" : "text-neutral-400 hover:text-neutral-200",
                )}
              >
                <Heart
                  size={16}
                  className={cn(
                    "transition-colors",
                    activeTab === "top" ? "text-amber-300 fill-amber-300" : "text-neutral-400",
                  )}
                />
                <span>YÊU THÍCH NHẤT</span>
                {activeTab === "top" && (
                  <span className="absolute -bottom-[6px] left-0 right-0 h-[2.5px] bg-amber-300 rounded-full" />
                )}
              </button>

              {/* Tab 3: THỂ LOẠI HOT */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGenreDropdown((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-2 pb-1.5 transition-all cursor-pointer relative",
                    selectedGenre !== "all" || showGenreDropdown
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-200",
                  )}
                >
                  <Folder
                    size={16}
                    className={cn(
                      "transition-colors",
                      selectedGenre !== "all" || showGenreDropdown
                        ? "text-amber-400 fill-amber-400"
                        : "text-neutral-400",
                    )}
                  />
                  <span>
                    {selectedGenre === "all" ? "THỂ LOẠI HOT" : `THỂ LOẠI: ${selectedGenreLabel}`}
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn("transition-transform duration-200", showGenreDropdown && "rotate-180")}
                  />
                  {(selectedGenre !== "all" || showGenreDropdown) && (
                    <span className="absolute -bottom-[6px] left-0 right-0 h-[2.5px] bg-amber-400 rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Ô tìm kiếm nhanh */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Tìm bình luận, tên phim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#12141c] border border-white/[0.08] text-xs text-white placeholder-neutral-500 pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Dải nút thể loại yêu thích (Khi bấm THỂ LOẠI HOT hoặc luôn hiển thị dưới dạng Pill) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
            {HOT_GENRES.map((g) => {
              const isSelected = selectedGenre === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setSelectedGenre(g.id);
                    setShowGenreDropdown(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0 flex items-center gap-1.5",
                    isSelected
                      ? "bg-amber-400 text-black font-extrabold shadow-sm"
                      : "bg-[#12141c] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]",
                  )}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                  <span>{g.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Trình soạn thảo bình luận nhanh ── */}
        {showComposer && (
          <form
            onSubmit={handleCreateComment}
            className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#12141c] space-y-4 animate-in fade-in duration-200 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Send size={14} className="text-cyan-400" />
                Viết đánh giá & cảm nhận của bạn
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    title={`${star} sao`}
                  >
                    <Star
                      size={15}
                      className={cn(
                        star <= newRating ? "fill-amber-400 text-amber-400" : "text-neutral-600",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Gợi ý phim hot 1-click */}
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5 flex items-center gap-1">
                <Sparkles size={11} className="text-amber-400" />
                Gợi ý phim đang hot:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {TRENDING_MOVIE_SUGGESTIONS.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => handleSelectTrending(item)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer",
                      newMovieSlug === item.slug
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        : "bg-white/[0.03] text-neutral-400 border-white/[0.06] hover:text-white hover:bg-white/[0.06]",
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                  Tên phim đang đánh giá:
                </label>
                <input
                  type="text"
                  value={newMovieName}
                  onChange={(e) => {
                    setNewMovieName(e.target.value);
                    setNewMovieSlug(
                      e.target.value
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/đ/g, "d")
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                    );
                  }}
                  className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  placeholder="Ví dụ: Oppenheimer"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-0">
                <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasSpoiler}
                    onChange={(e) => setHasSpoiler(e.target.checked)}
                    className="rounded border-white/20 bg-neutral-800 text-cyan-500 focus:ring-0"
                  />
                  <span>Chứa nội dung tiết lộ (Spoiler)</span>
                </label>
              </div>
            </div>

            <textarea
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Chia sẻ cảm xúc, phân tích nhân vật hoặc góc nhìn của bạn về bộ phim này..."
              className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50 resize-none"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/[0.05] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || !newContent.trim()}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Send size={12} />
                <span>{submitting ? "Đang gửi..." : "Đăng bình luận"}</span>
              </button>
            </div>
          </form>
        )}

        {/* ── Bố cục hiển thị thẻ bình luận ── */}
        {displayedComments.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-12 sm:p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
              <MessageSquare size={22} />
            </div>
            <h3 className="text-base font-bold text-white">
              {searchQuery.trim() || selectedGenre !== "all"
                ? "Không tìm thấy bình luận phù hợp"
                : "Chưa có bình luận nào"}
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              {searchQuery.trim() || selectedGenre !== "all"
                ? "Hãy thử chọn thể loại khác hoặc tìm kiếm với từ khóa ngắn hơn."
                : "Hãy là người đầu tiên chia sẻ cảm nhận và đánh giá bộ phim bạn yêu thích!"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Hàng trượt ngang chuẩn Hình 1 với mũi tên điều hướng ── */}
            <div className="relative group/rail">
              {/* Nút lùi về trước */}
              <button
                type="button"
                onClick={scrollLeft}
                aria-label="Cuộn sang trái"
                className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg opacity-80 hover:opacity-100"
              >
                <ChevronLeft size={18} />
              </button>

              {/* Dải cuộn thẻ bình luận */}
              <div
                ref={scrollContainerRef}
                className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0"
              >
                {displayedComments.map((comment) => (
                  <div key={comment.id} className="w-[280px] sm:w-[320px] shrink-0">
                    <CommentCard
                      comment={comment}
                      user={user}
                      userLikes={userLikes}
                      userDislikes={userDislikes}
                      likedCounts={likedCounts}
                      dislikedCounts={dislikedCounts}
                      spoilerRevealed={spoilerRevealed}
                      movieArtworks={movieArtworks}
                      onToggleLike={handleToggleLike}
                      onToggleDislike={handleToggleDislike}
                      onRevealSpoiler={(id) =>
                        setSpoilerRevealed((prev) => ({ ...prev, [id]: true }))
                      }
                      onShare={handleShareComment}
                    />
                  </div>
                ))}
              </div>

              {/* Nút tiến tới */}
              <button
                type="button"
                onClick={scrollRight}
                aria-label="Cuộn sang phải"
                className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg opacity-80 hover:opacity-100"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* ── Lưới toàn bộ bình luận bên dưới ── */}
            <div className="pt-2">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Tất cả thảo luận ({displayedComments.length})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 sm:gap-4">
                {displayedComments.map((comment) => (
                  <CommentCard
                    key={`grid-${comment.id}`}
                    comment={comment}
                    user={user}
                    userLikes={userLikes}
                    userDislikes={userDislikes}
                    likedCounts={likedCounts}
                    dislikedCounts={dislikedCounts}
                    spoilerRevealed={spoilerRevealed}
                    movieArtworks={movieArtworks}
                    onToggleLike={handleToggleLike}
                    onToggleDislike={handleToggleDislike}
                    onRevealSpoiler={(id) =>
                      setSpoilerRevealed((prev) => ({ ...prev, [id]: true }))
                    }
                    onShare={handleShareComment}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
