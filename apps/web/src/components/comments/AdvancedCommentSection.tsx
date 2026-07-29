"use client";

import { useState } from "react";
import {
  Star,
  ThumbsUp,
  AlertTriangle,
  Eye,
  EyeOff,
  MessageCircle,
  Send,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { checkCommentRateLimit } from "@/lib/rate-limiter";

export interface CommentItem {
  id: string;
  user: { name: string; avatar: string };
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

  // Empty initial comments — no demo data
  const [comments, setComments] = useState<CommentItem[]>([]);

  const toggleSpoilerReveal = (id: string) =>
    setRevealedSpoilers((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleLike = (id: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c)),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const rateCheck = checkCommentRateLimit(currentUser?.id || "guest");
    if (!rateCheck.allowed) {
      toast(
        `Bình luận quá nhanh. Thử lại sau ${rateCheck.retryAfterSeconds}s.`,
        "error",
      );
      return;
    }

    const newComment: CommentItem = {
      id: Math.random().toString(),
      user: {
        name: currentUser?.displayName || currentUser?.username || "Ẩn danh",
        avatar:
          currentUser?.avatarUrl ||
          `https://ui-avatars.com/api/?name=U&background=1e293b&color=fff`,
      },
      content: content.trim(),
      rating,
      isSpoiler,
      likes: 0,
      timestamp: "Vừa xong",
      episode: episodeName,
    };

    setComments([newComment, ...comments]);
    setContent("");
    setIsSpoiler(false);
    toast("Đã đăng bình luận!", "success");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle size={15} className="text-white/40" />
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
          Bình luận
          {episodeName && (
            <span className="text-white/30 ml-1.5">— {episodeName}</span>
          )}
        </h3>
        {comments.length > 0 && (
          <span className="ml-auto text-xs text-white/30">
            {comments.length}
          </span>
        )}
      </div>

      {/* Write Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Rating row */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">Đánh giá:</span>
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
                  size={16}
                  className={cn(
                    "transition-colors",
                    (hoverRating || rating) >= star
                      ? "fill-amber-400 text-amber-400"
                      : "text-white/15",
                  )}
                />
              </button>
            ))}
          </div>
          <span className="text-xs text-amber-400/80 font-medium">
            {rating}.0
          </span>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              currentUser
                ? "Chia sẻ suy nghĩ của bạn..."
                : "Đăng nhập để bình luận"
            }
            disabled={!currentUser}
            rows={3}
            className={cn(
              "w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3",
              "text-sm text-white placeholder-white/25 outline-none resize-none",
              "focus:border-white/20 focus:bg-white/[0.05] transition-all",
              !currentUser && "opacity-50 cursor-not-allowed",
            )}
          />
        </div>

        {/* Submit */}
        {currentUser && (
          <div className="flex justify-end gap-2">
            {content.trim() && (
              <button
                type="button"
                onClick={() => setContent("")}
                className="px-3 py-1.5 text-xs text-white/40 hover:text-white transition-colors rounded-lg"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={!content.trim()}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                content.trim()
                  ? "bg-white/10 hover:bg-white/15 text-white border border-white/15"
                  : "bg-white/5 text-white/25 cursor-not-allowed",
              )}
            >
              <Send size={12} />
              Gửi
            </button>
          </div>
        )}
      </form>

      {/* Comment list */}
      {comments.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-white/20 gap-2">
          <MessageCircle size={28} strokeWidth={1.25} />
          <p className="text-xs">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </p>
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-white/[0.04]">
          {comments.map((comment) => {
            const isRevealed = revealedSpoilers[comment.id];
            return (
              <div key={comment.id} className="py-4 space-y-2">
                {/* Row: avatar + name + time + rating */}
                <div className="flex items-center gap-2.5">
                  <img
                    src={comment.user.avatar}
                    alt={comment.user.name}
                    className="w-7 h-7 rounded-full object-cover border border-white/10 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-white/80">
                      {comment.user.name}
                    </span>
                    <span className="text-[10px] text-white/30 ml-2">
                      {comment.timestamp}
                    </span>
                  </div>
                  {comment.rating && (
                    <div className="flex items-center gap-0.5 text-[10px] text-amber-400/70 flex-shrink-0">
                      <Star size={10} fill="currentColor" />
                      <span>{comment.rating}.0</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="pl-[36px]">
                  {comment.isSpoiler && !isRevealed ? (
                    <button
                      onClick={() => toggleSpoilerReveal(comment.id)}
                      className="flex items-center gap-2 text-[11px] text-amber-400/60 hover:text-amber-400 transition-colors"
                    >
                      <AlertTriangle size={12} />
                      <span>Chứa spoiler — Bấm để xem</span>
                      <Eye size={12} />
                    </button>
                  ) : (
                    <div>
                      <p className="text-xs text-white/60 leading-relaxed">
                        {comment.content}
                      </p>
                      {comment.isSpoiler && isRevealed && (
                        <button
                          onClick={() => toggleSpoilerReveal(comment.id)}
                          className="mt-1 text-[10px] text-white/25 hover:text-white/40 flex items-center gap-1"
                        >
                          <EyeOff size={10} /> Ẩn spoiler
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Like */}
                <div className="pl-[36px]">
                  <button
                    onClick={() => handleLike(comment.id)}
                    className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors"
                  >
                    <ThumbsUp size={11} />
                    {comment.likes > 0 && <span>{comment.likes}</span>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
