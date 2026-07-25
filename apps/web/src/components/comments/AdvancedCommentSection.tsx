"use client";

import { useState } from "react";
import { Star, ThumbsUp, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { checkCommentRateLimit } from "@/lib/rate-limiter";

export interface CommentItem {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  content: string;
  rating?: number;
  isSpoiler?: boolean;
  likes: number;
  timestamp: string;
  episode?: string;
}

interface AdvancedCommentSectionProps {
  movieSlug: string;
  episodeName?: string;
}

export function AdvancedCommentSection({
  movieSlug,
  episodeName,
}: AdvancedCommentSectionProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { toast } = useToast();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [content, setContent] = useState<string>("");
  const [isSpoiler, setIsSpoiler] = useState<boolean>(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<
    Record<string, boolean>
  >({});

  // Mock comments state initialized with rich initial comments
  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: "c1",
      user: {
        name: "Phú Huy Nguyễn",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      },
      content:
        "Phim đỉnh thực sự, đoạn kết tập này cú quay xe không thể lường trước được!",
      rating: 5,
      isSpoiler: true,
      likes: 24,
      timestamp: "2 giờ trước",
      episode: episodeName || "Tập 01",
    },
    {
      id: "c2",
      user: {
        name: "Minh Anh",
        avatar:
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
      },
      content:
        "Âm nhạc và góc quay quá ấn tượng, xứng đáng 5 sao chất lượng CineVerse.",
      rating: 5,
      isSpoiler: false,
      likes: 12,
      timestamp: "5 giờ trước",
      episode: episodeName || "Tập 01",
    },
  ]);

  const toggleSpoilerReveal = (id: string) => {
    setRevealedSpoilers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLike = (id: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c)),
    );
    toast("Đã thích bình luận!", "info");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const rateCheck = checkCommentRateLimit(currentUser?.id || "guest");
    if (!rateCheck.allowed) {
      toast(
        `Bạn đang gửi bình luận quá nhanh. Vui lòng thử lại sau ${rateCheck.retryAfterSeconds} giây.`,
        "error",
      );
      return;
    }

    const newComment: CommentItem = {
      id: Math.random().toString(),
      user: {
        name:
          currentUser?.displayName ||
          currentUser?.username ||
          "Thành viên CineVerse",
        avatar:
          currentUser?.avatarUrl ||
          `https://ui-avatars.com/api/?name=User&background=2c3440&color=fff`,
      },
      content: content.trim(),
      rating,
      isSpoiler,
      likes: 0,
      timestamp: "Vừa xong",
      episode: episodeName || "Tập 01",
    };

    setComments([newComment, ...comments]);
    setContent("");
    setIsSpoiler(false);
    toast("Đã đăng bình luận & đánh giá thành công!", "success");
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <h3 className="text-lg font-bold text-white">
          Comments {episodeName && `· ${episodeName}`}
        </h3>
        <span className="text-sm text-white/40">
          {comments.length} comments
        </span>
      </div>

      {/* ── Form Đánh giá & Bình luận - MINIMAL REDESIGN ── */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-[#12161c] border border-white/10 p-5"
      >
        {/* Rating & Spoiler in one clean row */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
          {/* Rating Stars */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/60">Rate:</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 hover:scale-110 transition-transform"
                >
                  <Star
                    size={20}
                    className={cn(
                      "transition-colors",
                      (hoverRating || rating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-white/20 hover:text-white/40",
                    )}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm font-medium text-amber-400">
              {rating}.0
            </span>
          </div>

          {/* Spoiler Toggle - Minimal checkbox style */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={isSpoiler}
              onChange={(e) => setIsSpoiler(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-transparent checked:bg-amber-500 checked:border-amber-500 cursor-pointer"
            />
            <span className="text-sm text-white/60 group-hover:text-white transition-colors">
              Contains spoilers
            </span>
          </label>
        </div>

        {/* Text Input - Clean textarea */}
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
            className="w-full bg-[#0d1117] border border-white/10 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#3b82f6] transition-colors resize-none"
          />
        </div>

        {/* Submit button - Minimal style */}
        <div className="flex justify-end gap-2">
          {content.trim() && (
            <button
              type="button"
              onClick={() => setContent("")}
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!content.trim()}
            className="px-5 py-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-white/10 disabled:text-white/30 text-white text-sm font-medium transition-colors"
          >
            Post Comment
          </button>
        </div>
      </form>

      {/* ── Feed Bình Luận - MINIMAL REDESIGN ── */}
      <div className="space-y-4">
        {comments.map((comment) => {
          const isRevealed = revealedSpoilers[comment.id];

          return (
            <div
              key={comment.id}
              className="border-b border-white/5 pb-4 last:border-0 last:pb-0 space-y-3"
            >
              {/* User Info & Rating */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <img
                    src={comment.user.avatar}
                    alt={comment.user.name}
                    className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h4 className="text-sm font-medium text-white">
                        {comment.user.name}
                      </h4>
                      {comment.episode && (
                        <span className="text-xs text-white/40">
                          · {comment.episode}
                        </span>
                      )}
                      <span className="text-xs text-white/40">
                        · {comment.timestamp}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating Badge - Minimal */}
                {comment.rating && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">
                      {comment.rating}.0
                    </span>
                  </div>
                )}
              </div>

              {/* Comment Content - Clean styling */}
              <div className="ml-[52px]">
                {comment.isSpoiler && !isRevealed ? (
                  <button
                    onClick={() => toggleSpoilerReveal(comment.id)}
                    className="w-full text-left p-3 bg-amber-950/20 border border-amber-500/20 hover:bg-amber-950/30 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-sm text-amber-400">
                      <AlertTriangle size={16} />
                      <span>This review may contain spoilers</span>
                    </div>
                    <Eye size={16} className="text-amber-400" />
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-white/80 leading-relaxed">
                      {comment.content}
                    </p>
                    {comment.isSpoiler && isRevealed && (
                      <button
                        onClick={() => toggleSpoilerReveal(comment.id)}
                        className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1 transition-colors"
                      >
                        <EyeOff size={12} />
                        Hide spoiler
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Actions - Minimal */}
              <div className="ml-[52px] flex items-center gap-4 text-xs text-white/40">
                <button
                  onClick={() => handleLike(comment.id)}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <ThumbsUp size={13} />
                  <span>Like {comment.likes > 0 && `(${comment.likes})`}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
