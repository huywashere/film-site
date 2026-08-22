"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Eye,
  EyeOff,
  MessageCircle,
  Send,
  Clock,
  LogIn,
  Pin,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { checkCommentRateLimit } from "@/lib/rate-limiter";
import {
  EmotionAdminAvatar,
  EmotionAdminBadge,
  EmotionBurningFlame,
} from "@/components/ui/EmotionBadges";

export interface CommentUser {
  id?: string;
  name: string;
  avatar: string;
  role?: "ADMIN" | "USER" | "MODERATOR" | string;
  email?: string;
  gender?: "male" | "female" | "other";
  flairs?: string[];
}

export interface CommentItem {
  id: string;
  user: CommentUser;
  content: string;
  rating?: number;
  isSpoiler?: boolean;
  isPinned?: boolean;
  pinnedBy?: string;
  likes: number;
  dislikes?: number;
  userReaction?: "like" | "dislike" | null;
  createdAt: number;
  timestampString?: string;
  episode?: string;
  replyToUser?: string;
  replies?: CommentItem[];
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

function formatTimeAgo(timestamp: number | string): string {
  const time =
    typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
  if (!time || isNaN(time)) {
    return typeof timestamp === "string" ? timestamp : "Vừa xong";
  }

  const diffMs = Date.now() - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 45) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 30) return `${diffDay} ngày trước`;
  if (diffMonth < 12) return `${diffMonth} tháng trước`;
  return `${diffYear} năm trước`;
}

function isUserAdmin(
  user?: {
    role?: string;
    email?: string;
    username?: string;
    name?: string;
    displayName?: string;
  } | null,
): boolean {
  if (!user) return false;
  const role = (user.role || "").toUpperCase();
  if (role === "ADMIN" || role === "MODERATOR") return true;
  const email = (user.email || "").toLowerCase();
  const name = (
    user.name ||
    user.displayName ||
    user.username ||
    ""
  ).toLowerCase();
  return (
    email === "huywashere@gmail.com" ||
    name === "cậu be" ||
    name === "cau be" ||
    name === "caube" ||
    name === "huywashere" ||
    name === "admin" ||
    name === "phu huy nguyen"
  );
}

export function AdvancedCommentSection({
  movieSlug,
  episodeName,
  currentVideoTimeSeconds = 0,
  onSeekToTimestamp,
}: AdvancedCommentSectionProps) {
  const currentUser = useAuthStore((s) => s.user);
  const openAuthModal = useAuthModalStore((s) => s.openModal);
  const { toast } = useToast();

  const isCurrentAdmin = useMemo(() => isUserAdmin(currentUser), [currentUser]);

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [content, setContent] = useState<string>("");
  const [isSpoiler, setIsSpoiler] = useState<boolean>(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  // Reply state
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>("");
  const [replyTargetUser, setReplyTargetUser] = useState<string>("");
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // Comments list with localStorage persistence
  const [comments, setComments] = useState<CommentItem[]>([]);

  const storageKey = `cineverse_comments_tree_${movieSlug || "default"}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const clean = Array.isArray(parsed)
          ? parsed.filter((c: any) => !c.id?.startsWith("seed-"))
          : [];
        setComments(clean);
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
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

  const toggleRepliesExpansion = (id: string) =>
    setExpandedReplies((prev) => ({ ...prev, [id]: !prev[id] }));

  // Handle Likes / Dislikes for both top-level and nested replies
  const handleReaction = (
    commentId: string,
    reactionType: "like" | "dislike",
    parentCommentId?: string,
  ) => {
    const updateCommentList = (list: CommentItem[]): CommentItem[] => {
      return list.map((c) => {
        if (c.id === commentId) {
          const prevReaction = c.userReaction;
          let newReaction: "like" | "dislike" | null = reactionType;
          let newLikes = c.likes;
          let newDislikes = c.dislikes || 0;

          if (prevReaction === reactionType) {
            newReaction = null;
            if (reactionType === "like") newLikes = Math.max(0, newLikes - 1);
            if (reactionType === "dislike") newDislikes = Math.max(0, newDislikes - 1);
          } else {
            if (prevReaction === "like") newLikes = Math.max(0, newLikes - 1);
            if (prevReaction === "dislike") newDislikes = Math.max(0, newDislikes - 1);
            if (reactionType === "like") newLikes += 1;
            if (reactionType === "dislike") newDislikes += 1;
          }

          return {
            ...c,
            likes: newLikes,
            dislikes: newDislikes,
            userReaction: newReaction,
          };
        }

        if (c.replies && c.replies.length > 0) {
          return {
            ...c,
            replies: updateCommentList(c.replies),
          };
        }

        return c;
      });
    };

    saveComments(updateCommentList(comments));
  };

  // Admin exclusive Pin / Unpin
  const handleTogglePin = (commentId: string) => {
    if (!isCurrentAdmin) {
      toast("Chỉ quản trị viên mới có quyền ghim bình luận.", "error");
      return;
    }

    const updated = comments.map((c) => {
      if (c.id === commentId) {
        const nextPinned = !c.isPinned;
        toast(
          nextPinned ? "Đã ghim bình luận lên đầu trang!" : "Đã bỏ ghim bình luận.",
          "success",
        );
        return {
          ...c,
          isPinned: nextPinned,
          pinnedBy: nextPinned ? "Admin" : undefined,
        };
      }
      return c;
    });

    saveComments(updated);
  };

  // Delete comment
  const handleDeleteComment = (commentId: string, parentCommentId?: string) => {
    if (parentCommentId) {
      const updated = comments.map((c) => {
        if (c.id === parentCommentId) {
          return {
            ...c,
            replies: (c.replies || []).filter((r) => r.id !== commentId),
          };
        }
        return c;
      });
      saveComments(updated);
      toast("Đã xóa phản hồi", "info");
    } else {
      const updated = comments.filter((c) => c.id !== commentId);
      saveComments(updated);
      toast("Đã xóa bình luận", "info");
    }
  };

  const insertCurrentTimestamp = (isForReply = false) => {
    const formatted = formatSecondsToTimestamp(currentVideoTimeSeconds);
    if (isForReply) {
      setReplyContent((prev) => `${prev} [${formatted}] `);
    } else {
      setContent((prev) => `${prev} [${formatted}] `);
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const rateCheck = checkCommentRateLimit(currentUser?.id || "guest");
    if (!rateCheck.allowed) {
      toast(`Bình luận quá nhanh. Thử lại sau ${rateCheck.retryAfterSeconds}s.`, "error");
      return;
    }

    const isAdmin = isUserAdmin(currentUser);

    const newComment: CommentItem = {
      id: "comment-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      user: {
        id: currentUser?.id,
        name: currentUser?.displayName || currentUser?.username || "Ẩn danh",
        avatar:
          currentUser?.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.username || "U")}&background=334155&color=fff`,
        role: isAdmin ? "ADMIN" : currentUser?.role || "USER",
        email: currentUser?.email,
        gender: "male",
        flairs: isAdmin ? ["flame", "male"] : [],
      },
      content: content.trim(),
      rating,
      isSpoiler,
      likes: 0,
      dislikes: 0,
      createdAt: Date.now(),
      episode: episodeName,
      replies: [],
    };

    const updated = [newComment, ...comments];
    saveComments(updated);
    setContent("");
    setIsSpoiler(false);
    toast("Đã đăng bình luận!", "success");
  };

  const handleSubmitReply = (parentCommentId: string) => {
    if (!replyContent.trim()) return;

    const rateCheck = checkCommentRateLimit(currentUser?.id || "guest");
    if (!rateCheck.allowed) {
      toast(`Thao tác quá nhanh. Thử lại sau ${rateCheck.retryAfterSeconds}s.`, "error");
      return;
    }

    const isAdmin = isUserAdmin(currentUser);

    const newReply: CommentItem = {
      id: "reply-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      user: {
        id: currentUser?.id,
        name: currentUser?.displayName || currentUser?.username || "Ẩn danh",
        avatar:
          currentUser?.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.username || "U")}&background=334155&color=fff`,
        role: isAdmin ? "ADMIN" : currentUser?.role || "USER",
        email: currentUser?.email,
        gender: "male",
        flairs: isAdmin ? ["flame", "male"] : [],
      },
      content: replyContent.trim(),
      replyToUser: replyTargetUser || undefined,
      likes: 0,
      dislikes: 0,
      createdAt: Date.now(),
      episode: episodeName,
    };

    const updated = comments.map((c) => {
      if (c.id === parentCommentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply],
        };
      }
      return c;
    });

    saveComments(updated);
    setReplyContent("");
    setReplyingToCommentId(null);
    setReplyTargetUser("");
    setExpandedReplies((prev) => ({ ...prev, [parentCommentId]: true }));
    toast("Đã gửi phản hồi!", "success");
  };

  // Render clickable timestamp pills & mentions (@Name)
  const renderCommentContent = (text: string, replyToUser?: string) => {
    // Regex for [05:20] or 12:45
    const regex = /(?:\[)?\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b(?:\])?/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    const fullText = text;

    while ((match = regex.exec(fullText)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(fullText.substring(lastIndex, matchIndex));
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
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/35 text-sky-400 font-mono font-bold text-[11px] border border-sky-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
          title={`Bấm để chuyển trình phát tới ${timeString}`}
        >
          ⏱ {timeString}
        </button>,
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < fullText.length) {
      parts.push(fullText.substring(lastIndex));
    }

    return (
      <span>
        {replyToUser && (
          <span className="text-sky-400 font-bold mr-1.5 hover:underline cursor-pointer">
            @{replyToUser}
          </span>
        )}
        {parts.length > 0 ? parts : fullText}
      </span>
    );
  };

  // Sorted comments: Pinned comments always on top
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [comments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-white/40" />
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
            Bình luận
            {episodeName && (
              <span className="text-white/40 ml-1.5 font-normal lowercase">— {episodeName}</span>
            )}
          </h3>
          {comments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/70 font-mono font-bold">
              {comments.length}
            </span>
          )}
        </div>
      </div>

      {/* Write Comment Form / Login Prompt */}
      {!currentUser ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-neutral-300 shrink-0">
              <MessageCircle size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Bạn cần đăng nhập để bình luận</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Đăng nhập để đánh giá phim, gắn mốc thời gian và thảo luận cùng cộng đồng.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer shrink-0 select-none"
          >
            <LogIn size={14} />
            <span>Đăng nhập ngay</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmitComment} className="space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5 sm:p-4">
          {/* User Preview & Rating row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {isCurrentAdmin ? (
                <EmotionAdminAvatar
                  src={
                    currentUser?.avatarUrl ||
                    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&auto=format&fit=crop&q=80"
                  }
                  alt={currentUser?.displayName || "Admin"}
                  size={30}
                />
              ) : (
                <img
                  src={
                    currentUser?.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.username || "U")}&background=334155&color=fff`
                  }
                  alt="avatar"
                  className="w-7 h-7 rounded-full object-cover border border-white/10"
                />
              )}
              <div className="flex items-center gap-1.5">
                {isCurrentAdmin && <EmotionAdminBadge label="ADMIN" />}
                <span className="text-xs font-bold text-white">
                  {currentUser?.displayName || currentUser?.username}
                </span>
                {isCurrentAdmin && <EmotionBurningFlame size={15} />}
              </div>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      size={15}
                      className={cn(
                        "transition-colors",
                        (hoverRating || rating) >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-white/20",
                      )}
                    />
                  </button>
                ))}
              </div>

              {/* Instant Timestamp Insert Button */}
              <button
                type="button"
                onClick={() => insertCurrentTimestamp(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Gắn số phút/giây đang xem vào ô bình luận"
              >
                <Clock size={12} className="text-sky-400" />
                <span>Mốc {formatSecondsToTimestamp(currentVideoTimeSeconds)}</span>
              </button>
            </div>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Viết bình luận của bạn (nhắc tới thời gian như [05:20] để tạo liên kết)..."
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none resize-none focus:border-white/30 focus:bg-black/60 transition-all"
            />
          </div>

          {/* Submit Row */}
          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="rounded bg-white/10 border-white/20 text-amber-500 focus:ring-0"
              />
              <span>Chứa Spoiler</span>
            </label>

            <div className="flex items-center gap-2">
              {content.trim() && (
                <button
                  type="button"
                  onClick={() => setContent("")}
                  className="px-3 py-1.5 text-xs text-white/40 hover:text-white transition-colors rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
              )}
              <button
                type="submit"
                disabled={!content.trim()}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer",
                  content.trim()
                    ? "bg-white text-black hover:bg-neutral-200 active:scale-95 shadow-md"
                    : "bg-white/5 text-white/20 cursor-not-allowed",
                )}
              >
                <Send size={12} />
                <span>Gửi bình luận</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Comment List */}
      {sortedComments.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-white/30 gap-2 border border-dashed border-white/10 rounded-2xl">
          <MessageCircle size={32} strokeWidth={1.25} />
          <p className="text-xs font-medium">Chưa có bình luận nào. Hãy là người đầu tiên thảo luận!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedComments.map((comment) => {
            const isRevealed = revealedSpoilers[comment.id];
            const isAdmin = isUserAdmin(comment.user);
            const replies = comment.replies || [];
            const isExpanded = expandedReplies[comment.id] !== false; // Default true

            return (
              <div
                key={comment.id}
                className={cn(
                  "p-3.5 sm:p-4 rounded-2xl transition-all border",
                  comment.isPinned
                    ? "bg-gradient-to-b from-amber-500/[0.07] to-transparent border-amber-500/20 shadow-lg"
                    : "bg-white/[0.015] border-white/[0.05] hover:border-white/10",
                )}
              >
                {/* Pinned Label */}
                {comment.isPinned && (
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-400 mb-2.5 select-none">
                    <Pin size={12} className="fill-amber-400 rotate-45" />
                    <span>Ghim bởi {comment.pinnedBy || "Admin"}</span>
                  </div>
                )}

                {/* Main Author Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {isAdmin ? (
                      <EmotionAdminAvatar
                        src={comment.user.avatar}
                        alt={comment.user.name}
                        size={32}
                      />
                    ) : (
                      <img
                        src={comment.user.avatar}
                        alt={comment.user.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}&background=334155&color=ffffff&size=64`;
                        }}
                      />
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isAdmin && <EmotionAdminBadge label="ADMIN" />}
                      <span className="text-xs font-bold text-white tracking-tight">
                        {comment.user.name}
                      </span>
                      {isAdmin && <EmotionBurningFlame size={15} className="inline-flex" />}
                      {comment.user.gender === "male" && (
                        <span className="text-[11px] text-sky-400 font-bold" title="Nam">
                          ♂️
                        </span>
                      )}
                      {comment.user.gender === "female" && (
                        <span className="text-[11px] text-pink-400 font-bold" title="Nữ">
                          ♀️
                        </span>
                      )}
                      <span className="text-[11px] text-white/30 font-medium">
                        {formatTimeAgo(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {comment.rating && (
                    <div className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span>{comment.rating}.0</span>
                    </div>
                  )}
                </div>

                {/* Comment Content */}
                <div className="pl-10 mt-1.5">
                  {comment.isSpoiler && !isRevealed ? (
                    <button
                      onClick={() => toggleSpoilerReveal(comment.id)}
                      className="flex items-center gap-2 text-xs text-amber-400/80 hover:text-amber-300 py-1 transition-colors cursor-pointer"
                    >
                      <AlertTriangle size={13} />
                      <span>Chứa spoiler — Bấm để xem nội dung</span>
                      <Eye size={13} />
                    </button>
                  ) : (
                    <div>
                      <div className="text-xs text-white/85 leading-relaxed font-normal">
                        {renderCommentContent(comment.content)}
                      </div>
                      {comment.isSpoiler && isRevealed && (
                        <button
                          onClick={() => toggleSpoilerReveal(comment.id)}
                          className="mt-1 text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1"
                        >
                          <EyeOff size={10} /> Ẩn spoiler
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions Row: Likes, Dislikes, Reply, Admin Pin, Delete */}
                  <div className="flex items-center gap-4 mt-2.5 pt-1 text-[11px] text-white/40">
                    <button
                      onClick={() => handleReaction(comment.id, "like")}
                      className={cn(
                        "flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer active:scale-90 font-medium",
                        comment.userReaction === "like" && "text-sky-400 font-bold",
                      )}
                    >
                      <ThumbsUp size={13} className={comment.userReaction === "like" ? "fill-sky-400" : ""} />
                      <span>{comment.likes > 0 ? comment.likes : ""}</span>
                    </button>

                    <button
                      onClick={() => handleReaction(comment.id, "dislike")}
                      className={cn(
                        "flex items-center gap-1 hover:text-white transition-colors cursor-pointer active:scale-90",
                        comment.userReaction === "dislike" && "text-rose-400 font-bold",
                      )}
                    >
                      <ThumbsDown size={13} className={comment.userReaction === "dislike" ? "fill-rose-400" : ""} />
                      {comment.dislikes ? <span>{comment.dislikes}</span> : null}
                    </button>

                    <button
                      onClick={() => {
                        if (!currentUser) {
                          openAuthModal("login");
                          return;
                        }
                        setReplyingToCommentId(
                          replyingToCommentId === comment.id ? null : comment.id,
                        );
                        setReplyTargetUser(comment.user.name);
                        setReplyContent("");
                      }}
                      className="hover:text-white transition-colors cursor-pointer font-bold"
                    >
                      Phản hồi
                    </button>

                    {/* Admin Exclusive Pin Button */}
                    {isCurrentAdmin && (
                      <button
                        onClick={() => handleTogglePin(comment.id)}
                        className={cn(
                          "flex items-center gap-1 transition-colors cursor-pointer font-bold",
                          comment.isPinned
                            ? "text-amber-400 hover:text-amber-300"
                            : "hover:text-amber-400",
                        )}
                        title={comment.isPinned ? "Bỏ ghim bình luận này" : "Ghim bình luận này lên đầu"}
                      >
                        <Pin size={12} className={comment.isPinned ? "fill-amber-400 rotate-45" : ""} />
                        <span>{comment.isPinned ? "Bỏ ghim" : "Ghim"}</span>
                      </button>
                    )}

                    {/* Delete button (If Author or Admin) */}
                    {(isCurrentAdmin || currentUser?.id === comment.user.id) && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="hover:text-rose-400 transition-colors cursor-pointer ml-auto"
                        title="Xóa bình luận này"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Reply Input Box */}
                {replyingToCommentId === comment.id && (
                  <div className="pl-10 mt-3 pt-2 border-t border-white/[0.05]">
                    <div className="flex items-center gap-2 mb-2 text-xs text-white/50">
                      <CornerDownRight size={12} className="text-sky-400" />
                      <span>
                        Đang trả lời <strong className="text-sky-400">@{replyTargetUser}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => insertCurrentTimestamp(true)}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
                      >
                        <Clock size={11} /> + Mốc ({formatSecondsToTimestamp(currentVideoTimeSeconds)})
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitReply(comment.id);
                          }
                        }}
                        placeholder={`Trả lời @${replyTargetUser}...`}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-sky-400/50 transition-all pr-20"
                        autoFocus
                      />
                      <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToCommentId(null);
                            setReplyContent("");
                          }}
                          className="px-2 py-1 text-[11px] text-white/40 hover:text-white"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={!replyContent.trim()}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all",
                            replyContent.trim()
                              ? "bg-white text-black hover:bg-neutral-200 cursor-pointer"
                              : "bg-white/10 text-white/30 cursor-not-allowed",
                          )}
                        >
                          Gửi
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nested Tree Branch Replies */}
                {replies.length > 0 && (
                  <div className="pl-6 sm:pl-9 mt-3 pt-2">
                    {/* Toggle Replies button */}
                    <button
                      onClick={() => toggleRepliesExpansion(comment.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer select-none mb-2"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} strokeWidth={2.5} />
                          <span>Ẩn phản hồi</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} strokeWidth={2.5} />
                          <span>Xem {replies.length} câu trả lời</span>
                        </>
                      )}
                    </button>

                    {/* Tree connector branch container */}
                    {isExpanded && (
                      <div className="relative space-y-3 pt-1 before:absolute before:left-3.5 before:top-2 before:bottom-3 before:w-[1.5px] before:bg-white/10 before:rounded-full">
                        {replies.map((reply) => {
                          const isReplyAdmin = isUserAdmin(reply.user);

                          return (
                            <div
                              key={reply.id}
                              className="relative pl-7 group/reply"
                            >
                              {/* Curved branch tree connector line */}
                              <div
                                aria-hidden="true"
                                className="absolute left-3.5 top-3.5 w-3.5 h-3.5 border-b border-l border-white/15 rounded-bl-xl pointer-events-none"
                              />

                              {/* Reply User Row */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {isReplyAdmin ? (
                                    <EmotionAdminAvatar
                                      src={reply.user.avatar}
                                      alt={reply.user.name}
                                      size={26}
                                    />
                                  ) : (
                                    <img
                                      src={reply.user.avatar}
                                      alt={reply.user.name}
                                      referrerPolicy="no-referrer"
                                      className="w-6 h-6 rounded-full object-cover border border-white/10 flex-shrink-0"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user.name)}&background=334155&color=ffffff&size=64`;
                                      }}
                                    />
                                  )}

                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {isReplyAdmin && <EmotionAdminBadge label="ADMIN" />}
                                    <span className="text-xs font-bold text-white tracking-tight">
                                      {reply.user.name}
                                    </span>
                                    {isReplyAdmin && <EmotionBurningFlame size={14} className="inline-flex" />}
                                    {reply.user.gender === "male" && (
                                      <span className="text-[10px] text-sky-400 font-bold">
                                        ♂️
                                      </span>
                                    )}
                                    {reply.user.gender === "female" && (
                                      <span className="text-[10px] text-pink-400 font-bold">
                                        ♀️
                                      </span>
                                    )}
                                    <span className="text-[10px] text-white/30 font-medium">
                                      {formatTimeAgo(reply.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Reply Content */}
                              <div className="pl-8 mt-1 text-xs text-white/80 leading-relaxed font-normal">
                                {renderCommentContent(reply.content, reply.replyToUser)}
                              </div>

                              {/* Reply Actions */}
                              <div className="pl-8 flex items-center gap-3.5 mt-1.5 text-[10px] text-white/35">
                                <button
                                  onClick={() => handleReaction(reply.id, "like", comment.id)}
                                  className={cn(
                                    "flex items-center gap-1 hover:text-white transition-colors cursor-pointer",
                                    reply.userReaction === "like" && "text-sky-400 font-bold",
                                  )}
                                >
                                  <ThumbsUp size={11} className={reply.userReaction === "like" ? "fill-sky-400" : ""} />
                                  {reply.likes > 0 && <span>{reply.likes}</span>}
                                </button>

                                <button
                                  onClick={() => handleReaction(reply.id, "dislike", comment.id)}
                                  className={cn(
                                    "flex items-center gap-1 hover:text-white transition-colors cursor-pointer",
                                    reply.userReaction === "dislike" && "text-rose-400 font-bold",
                                  )}
                                >
                                  <ThumbsDown size={11} className={reply.userReaction === "dislike" ? "fill-rose-400" : ""} />
                                </button>

                                <button
                                  onClick={() => {
                                    if (!currentUser) {
                                      openAuthModal("login");
                                      return;
                                    }
                                    setReplyingToCommentId(comment.id);
                                    setReplyTargetUser(reply.user.name);
                                    setReplyContent("");
                                  }}
                                  className="hover:text-white transition-colors cursor-pointer font-bold"
                                >
                                  Phản hồi
                                </button>

                                {(isCurrentAdmin || currentUser?.id === reply.user.id) && (
                                  <button
                                    onClick={() => handleDeleteComment(reply.id, comment.id)}
                                    className="hover:text-rose-400 transition-colors cursor-pointer ml-auto opacity-0 group-hover/reply:opacity-100"
                                    title="Xóa phản hồi này"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
