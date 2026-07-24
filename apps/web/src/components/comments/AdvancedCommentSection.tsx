"use client";

import { useState } from "react";
import {
  Star,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  Eye,
  EyeOff,
  Send,
  Sparkles,
} from "lucide-react";
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
    <div className="bg-card/20 p-6 md:p-8 rounded-2xl border border-border/20 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="text-xl font-black text-white flex items-center gap-2">
          <MessageSquare size={20} className="text-emerald-400" />
          Bình Luận & Đánh Giá {episodeName && `(${episodeName})`}
        </h3>
        <span className="text-xs text-neutral-400 font-bold bg-white/5 px-3 py-1 rounded-full border border-white/5">
          {comments.length} bình luận
        </span>
      </div>

      {/* ── Form Đánh giá & Bình luận ── */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-black/40 p-4 rounded-xl border border-white/10"
      >
        {/* Rating Star Selection */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-300">
              Đánh giá của bạn:
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                >
                  <Star
                    size={18}
                    className={cn(
                      (hoverRating || rating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-neutral-600",
                    )}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-black text-amber-400 ml-1">
              {rating}/5 sao
            </span>
          </div>

          {/* Spoiler Warning Toggle Switch */}
          <button
            type="button"
            onClick={() => setIsSpoiler(!isSpoiler)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
              isSpoiler
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                : "bg-white/5 text-neutral-400 border-white/10 hover:text-white",
            )}
          >
            <AlertTriangle size={14} />
            {isSpoiler ? "Có chứa Spoiler" : "Không Spoiler"}
          </button>
        </div>

        {/* Text Input */}
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Chia sẻ cảm nghĩ của bạn về bộ phim / tập phim này..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-emerald-500/50 transition-colors resize-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!content.trim()}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <Send size={14} /> Gửi Bình Luận
          </button>
        </div>
      </form>

      {/* ── Feed Bình Luận ── */}
      <div className="space-y-4 pt-2">
        {comments.map((comment) => {
          const isRevealed = revealedSpoilers[comment.id];

          return (
            <div
              key={comment.id}
              className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={comment.user.avatar}
                    alt={comment.user.name}
                    className="w-9 h-9 rounded-full object-cover border border-white/10"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {comment.user.name}
                      {comment.episode && (
                        <span className="text-[10px] bg-white/10 text-neutral-300 font-mono px-2 py-0.5 rounded-md">
                          {comment.episode}
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] text-neutral-500">
                      {comment.timestamp}
                    </span>
                  </div>
                </div>

                {comment.rating && (
                  <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">
                      {comment.rating}.0
                    </span>
                  </div>
                )}
              </div>

              {/* Comment Content with Spoiler Blur */}
              <div className="relative">
                {comment.isSpoiler && !isRevealed ? (
                  <div
                    onClick={() => toggleSpoilerReveal(comment.id)}
                    className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl cursor-pointer flex items-center justify-between text-amber-400 hover:bg-amber-950/50 transition-all"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <AlertTriangle size={16} />
                      <span>
                        Bình luận này chứa Spoiler nội dung. Bấm để tiết lộ!
                      </span>
                    </div>
                    <Eye size={16} />
                  </div>
                ) : (
                  <p className="text-sm text-neutral-300 leading-relaxed break-words">
                    {comment.content}
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-neutral-400">
                <button
                  onClick={() => handleLike(comment.id)}
                  className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <ThumbsUp size={13} />
                  <span>Hữu ích ({comment.likes})</span>
                </button>
                {comment.isSpoiler && isRevealed && (
                  <button
                    onClick={() => toggleSpoilerReveal(comment.id)}
                    className="flex items-center gap-1 text-[11px] hover:text-white transition-colors cursor-pointer"
                  >
                    <EyeOff size={12} /> Ẩn Spoiler
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
