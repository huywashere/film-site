"use client";

import { useState, useEffect } from "react";
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
  user: { name: string; avatar: string; role?: string };
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
  currentVideoTimeSeconds?: number;
  onSeekToTimestamp?: (seconds: number) => void;
}

function parseTimestampToSeconds(ts: string): number {
  const parts = ts.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function formatSecondsToTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function AdvancedCommentSection({
  movieSlug,
  episodeName,
  currentVideoTimeSeconds = 0,
  onSeekToTimestamp,
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

  // Initial comments list with localStorage persistence
  const [comments, setComments] = useState<CommentItem[]>([]);

  const storageKey = `cineverse_comments_${movieSlug || "default"}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setComments(JSON.parse(raw));
      }
    } catch {
      // ignore JSON parse error
    }
  }, [storageKey]);

  const saveComments = (newComments: CommentItem[]) => {
    setComments(newComments);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newComments));
    } catch {
      // ignore
    }
  };

  const toggleSpoilerReveal = (id: string) =>
    setRevealedSpoilers((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleLike = (id: string) => {
    const updated = comments.map((c) =>
      c.id === id ? { ...c, likes: c.likes + 1 } : c,
    );
    saveComments(updated);
  };

  const insertCurrentTimestamp = () => {
    const formatted = formatSecondsToTimestamp(currentVideoTimeSeconds);
    setContent((prev) => `${prev} [${formatted}] `);
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
        role: currentUser?.role || "USER",
      },
      content: content.trim(),
      rating,
      isSpoiler,
      likes: 0,
      timestamp: "Vừa xong",
      episode: episodeName,
    };

    const updated = [newComment, ...comments];
    saveComments(updated);
    setContent("");
    setIsSpoiler(false);
    toast("Đã đăng bình luận!", "success");
  };

  const renderCommentContent = (text: string) => {
    // Regex matching timestamp patterns like 05:20, 1:25:30, [12:45]
    const regex = /(?:\[)?\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b(?:\])?/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }
      const timeString = match[0].replace(/[\[\]]/g, "");
      const seconds = parseTimestampToSeconds(timeString);

      parts.push(
        <button
          key={`${timeString}-${matchIndex}`}
          type="button"
          onClick={() => {
            if (onSeekToTimestamp) {
              onSeekToTimestamp(seconds);
              toast(`Đã chuyển tới mốc ${timeString}`, "info");
            }
          }}
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/35 text-blue-400 font-mono font-bold text-[11px] border border-blue-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
          title={`Bấm để chuyển trình phát tới ${timeString}`}
        >
          ⏱ {timeString}
        </button>,
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
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
        {/* Rating row + Insert Timestamp Button */}
        <div className="flex flex-wrap items-center justify-between gap-2">
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

          {/* Instant Timestamp Insert Button */}
          {currentUser && (
            <button
              type="button"
              onClick={insertCurrentTimestamp}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="Gắn số phút/giây đang xem vào ô bình luận"
            >
              <span>⏱ Chèn mốc time ({formatSecondsToTimestamp(currentVideoTimeSeconds)})</span>
            </button>
          )}
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              currentUser
                ? "Chia sẻ suy nghĩ của bạn (ví dụ: 'Đoạn 05:20 xem hay quá!')..."
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
        <div className="space-y-3">
          {comments.map((comment) => {
            const isRevealed = revealedSpoilers[comment.id];
            const isAdminComment =
              comment.user.name.toLowerCase().includes("huy") ||
              comment.user.name === "Phu Huy Nguyen" ||
              comment.user.name === "huywashere" ||
              (comment as any).user?.role === "admin";

            return (
              <div
                key={comment.id}
                className="py-3.5 space-y-2 border-b border-white/[0.04] last:border-none"
              >
                {/* Row: avatar + name + time + rating */}
                <div className="flex items-center gap-2.5">
                  <img
                    src={comment.user.avatar}
                    alt={comment.user.name}
                    className="w-7 h-7 rounded-full object-cover border border-white/10 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white tracking-tight">
                      {comment.user.name}
                    </span>
                    {isAdminComment && (
                      <span className="px-2.5 py-1 rounded-lg bg-white/12 border border-white/25 text-white text-[11px] font-mono font-black uppercase tracking-wider shadow-sm">
                        👑 ADMIN
                      </span>
                    )}
                    <span className="text-[10px] text-white/30 font-mono">
                      {comment.timestamp}
                    </span>
                  </div>
                  {comment.rating && (
                    <div className="flex items-center gap-0.5 text-[10px] text-amber-400/80 font-bold flex-shrink-0">
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
                      <div className="text-xs text-white/60 leading-relaxed">
                        {renderCommentContent(comment.content)}
                      </div>
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
