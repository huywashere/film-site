"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Send,
  LogIn,
  Pin,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { checkCommentRateLimit } from "@/lib/rate-limiter";

export interface CommentUser {
  id?: string;
  name: string;
  avatar: string;
  role?: "ADMIN" | "USER" | "MODERATOR" | string;
  email?: string;
}

export interface CommentItem {
  id: string;
  user: CommentUser;
  content: string;
  rating?: number;
  isPinned?: boolean;
  pinnedBy?: string;
  likes: number;
  dislikes?: number;
  userReaction?: "like" | "dislike" | null;
  createdAt: number;
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
  onSeekToTimestamp,
}: AdvancedCommentSectionProps) {
  const currentUser = useAuthStore((s) => s.user);
  const openAuthModal = useAuthModalStore((s) => s.openModal);
  const { toast } = useToast();

  const isCurrentAdmin = useMemo(() => isUserAdmin(currentUser), [currentUser]);

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [content, setContent] = useState<string>("");

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

  const toggleRepliesExpansion = (id: string) =>
    setExpandedReplies((prev) => ({ ...prev, [id]: !prev[id] }));

  // Handle Likes / Dislikes for both top-level and nested replies
  const handleReaction = (
    commentId: string,
    reactionType: "like" | "dislike",
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
        return {
          ...c,
          isPinned: nextPinned,
          pinnedBy: nextPinned ? "Admin" : undefined,
        };
      }
      return c;
    });

    saveComments(updated);
    toast("Đã cập nhật trạng thái ghim!", "success");
  };

  // Delete Comment (Author or Admin)
  const handleDeleteComment = (commentId: string) => {
    const deleteFromList = (list: CommentItem[]): CommentItem[] => {
      return list
        .filter((c) => c.id !== commentId)
        .map((c) => ({
          ...c,
          replies: c.replies ? deleteFromList(c.replies) : [],
        }));
    };

    const updated = deleteFromList(comments);
    saveComments(updated);
    toast("Đã xóa bình luận.", "info");
  };

  // Submit new top-level comment
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (!currentUser) {
      openAuthModal("login");
      return;
    }

    // Rate limiter check
    const rateLimit = checkCommentRateLimit(currentUser.id || "guest");
    if (!rateLimit.allowed) {
      toast(
        `Bạn đang bình luận quá nhanh. Vui lòng thử lại sau ${rateLimit.retryAfterSeconds}s.`,
        "error",
      );
      return;
    }

    const isAdmin = isUserAdmin(currentUser);

    const newComment: CommentItem = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user: {
        id: currentUser?.id,
        name: currentUser?.displayName || currentUser?.username || "Ẩn danh",
        avatar:
          currentUser?.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.username || "U")}&background=1e293b&color=fff`,
        role: isAdmin ? "ADMIN" : currentUser?.role || "USER",
        email: currentUser?.email,
      },
      content: content.trim(),
      rating,
      likes: 0,
      dislikes: 0,
      createdAt: Date.now(),
      episode: episodeName,
      replies: [],
    };

    const updated = [newComment, ...comments];
    saveComments(updated);
    setContent("");
    toast("Đã đăng bình luận!", "success");
  };

  // Submit nested reply
  const handleSubmitReply = (parentCommentId: string) => {
    if (!replyContent.trim()) return;

    if (!currentUser) {
      openAuthModal("login");
      return;
    }

    const rateLimit = checkCommentRateLimit(currentUser.id || "guest");
    if (!rateLimit.allowed) {
      toast(
        `Bạn đang bình luận quá nhanh. Vui lòng thử lại sau ${rateLimit.retryAfterSeconds}s.`,
        "error",
      );
      return;
    }

    const isAdmin = isUserAdmin(currentUser);

    const newReply: CommentItem = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user: {
        id: currentUser?.id,
        name: currentUser?.displayName || currentUser?.username || "Ẩn danh",
        avatar:
          currentUser?.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.username || "U")}&background=1e293b&color=fff`,
        role: isAdmin ? "ADMIN" : currentUser?.role || "USER",
        email: currentUser?.email,
      },
      content: replyContent.trim(),
      replyToUser: replyTargetUser,
      likes: 0,
      dislikes: 0,
      createdAt: Date.now(),
    };

    const addReplyToList = (list: CommentItem[]): CommentItem[] => {
      return list.map((c) => {
        if (c.id === parentCommentId) {
          return {
            ...c,
            replies: [...(c.replies || []), newReply],
          };
        }
        return c;
      });
    };

    saveComments(addReplyToList(comments));
    setReplyContent("");
    setReplyingToCommentId(null);
    setExpandedReplies((prev) => ({ ...prev, [parentCommentId]: true }));
    toast("Đã gửi câu trả lời!", "success");
  };

  // Render clickable timestamps inside comments (e.g. [05:20] -> seeks player)
  const renderCommentContent = (text: string) => {
    const timestampRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
    const parts: Array<{ type: "text" | "ts"; value: string; seconds?: number }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = timestampRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          value: text.slice(lastIndex, match.index),
        });
      }
      parts.push({
        type: "ts",
        value: match[1],
        seconds: parseTimestampToSeconds(match[1]),
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        value: text.slice(lastIndex),
      });
    }

    return parts.map((part, i) => {
      if (part.type === "ts" && part.seconds !== undefined) {
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSeekToTimestamp?.(part.seconds!)}
            className="inline-flex items-center font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors mx-0.5 underline cursor-pointer"
            title={`Tua đến ${part.value}`}
          >
            [{part.value}]
          </button>
        );
      }
      return <span key={i}>{part.value}</span>;
    });
  };

  // Sort pinned comments to the top, then newest first
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [comments]);

  const totalCommentCount = useMemo(() => {
    let count = comments.length;
    comments.forEach((c) => {
      if (c.replies) count += c.replies.length;
    });
    return count;
  }, [comments]);

  return (
    <section className="w-full space-y-6 pt-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Bình luận
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 border border-white/[0.08]">
            {totalCommentCount}
          </span>
        </div>
      </div>

      {/* Comment Input Form */}
      {!currentUser ? (
        <div className="p-4 rounded-2xl bg-neutral-900/40 border border-white/[0.06] flex items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-neutral-400">
            Đăng nhập để tham gia thảo luận và đánh giá phim.
          </p>
          <button
            onClick={() => openAuthModal("login")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-all cursor-pointer shrink-0 shadow-sm"
          >
            <LogIn size={13} />
            <span>Đăng nhập</span>
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmitComment}
          className="p-4 rounded-2xl bg-neutral-900/40 border border-white/[0.06] focus-within:border-white/15 focus-within:bg-neutral-900/70 transition-all space-y-3"
        >
          {/* User Row + Rating Stars */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={
                  currentUser?.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.username || "U")}&background=1e293b&color=fff`
                }
                alt="avatar"
                className={cn(
                  "w-8 h-8 rounded-full object-cover",
                  isCurrentAdmin
                    ? "ring-1.5 ring-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.15)]"
                    : "border border-white/10",
                )}
              />
              <div className="flex items-center gap-2">
                {isCurrentAdmin && (
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30">
                    ADMIN
                  </span>
                )}
                <span className="text-xs font-semibold text-white">
                  {currentUser?.displayName || currentUser?.username}
                </span>
              </div>
            </div>

            {/* Rating Stars */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110 cursor-pointer"
                >
                  <Star
                    size={15}
                    className={cn(
                      "transition-colors",
                      (hoverRating || rating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-neutral-700",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Clean Textarea */}
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Viết bình luận của bạn..."
              rows={3}
              className="w-full bg-transparent border-0 text-sm text-neutral-100 placeholder-neutral-500 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Submit Row */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.04]">
            {content.trim() && (
              <button
                type="button"
                onClick={() => setContent("")}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={!content.trim()}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                content.trim()
                  ? "bg-white text-black hover:bg-neutral-200 active:scale-95 shadow-sm"
                  : "bg-white/5 text-neutral-600 cursor-not-allowed",
              )}
            >
              <Send size={12} />
              <span>Gửi bình luận</span>
            </button>
          </div>
        </form>
      )}

      {/* Comment List */}
      {sortedComments.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-neutral-500 gap-2 border border-dashed border-white/[0.06] rounded-2xl">
          <MessageCircle size={28} strokeWidth={1.25} className="text-neutral-600" />
          <p className="text-xs font-medium">Chưa có bình luận nào. Hãy là người đầu tiên thảo luận!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedComments.map((comment) => {
            const isAdmin = isUserAdmin(comment.user);
            const replies = comment.replies || [];
            const isExpanded = expandedReplies[comment.id] !== false;

            return (
              <div
                key={comment.id}
                className={cn(
                  "p-4 rounded-2xl transition-all border",
                  comment.isPinned
                    ? "bg-neutral-900/50 border-l-2 border-l-amber-400 border-y border-r border-white/[0.06]"
                    : "bg-neutral-900/20 border-white/[0.04] hover:border-white/[0.08] hover:bg-neutral-900/40",
                )}
              >
                {/* Pinned Label */}
                {comment.isPinned && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 mb-2 select-none">
                    <Pin size={11} className="fill-amber-400 rotate-45" />
                    <span>Ghim bởi {comment.pinnedBy || "Admin"}</span>
                  </div>
                )}

                {/* Author Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={comment.user.avatar}
                      alt={comment.user.name}
                      referrerPolicy="no-referrer"
                      className={cn(
                        "w-8 h-8 rounded-full object-cover flex-shrink-0",
                        isAdmin
                          ? "ring-1.5 ring-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.15)]"
                          : "border border-white/10",
                      )}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}&background=1e293b&color=ffffff&size=64`;
                      }}
                    />

                    <div className="flex items-center gap-2 flex-wrap">
                      {isAdmin && (
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30">
                          ADMIN
                        </span>
                      )}
                      <span className="text-xs font-semibold text-white tracking-tight">
                        {comment.user.name}
                      </span>
                      <span className="text-[11px] text-neutral-500 font-medium">
                        {formatTimeAgo(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {comment.rating && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span>{comment.rating}.0</span>
                    </div>
                  )}
                </div>

                {/* Comment Content & Actions */}
                <div className="pl-10.5 mt-1.5">
                  <div className="text-sm text-neutral-200 leading-relaxed font-normal">
                    {renderCommentContent(comment.content)}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                    <button
                      onClick={() => handleReaction(comment.id, "like")}
                      className={cn(
                        "flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer active:scale-90 font-medium",
                        comment.userReaction === "like" && "text-sky-400 font-semibold",
                      )}
                    >
                      <ThumbsUp size={13} className={comment.userReaction === "like" ? "fill-sky-400" : ""} />
                      <span>{comment.likes > 0 ? comment.likes : ""}</span>
                    </button>

                    <button
                      onClick={() => handleReaction(comment.id, "dislike")}
                      className={cn(
                        "flex items-center gap-1 hover:text-white transition-colors cursor-pointer active:scale-90",
                        comment.userReaction === "dislike" && "text-rose-400 font-semibold",
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
                      className="hover:text-white transition-colors cursor-pointer font-medium"
                    >
                      Phản hồi
                    </button>

                    {/* Admin Exclusive Pin Button */}
                    {isCurrentAdmin && (
                      <button
                        onClick={() => handleTogglePin(comment.id)}
                        className={cn(
                          "flex items-center gap-1 transition-colors cursor-pointer font-medium",
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

                    {/* Delete button (Author or Admin) */}
                    {(isCurrentAdmin || currentUser?.id === comment.user.id) && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="hover:text-rose-400 transition-colors cursor-pointer ml-auto"
                        title="Xóa bình luận"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Reply Input Box */}
                {replyingToCommentId === comment.id && (
                  <div className="pl-10.5 mt-3 pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-neutral-400">
                      <CornerDownRight size={12} className="text-neutral-500" />
                      <span>
                        Trả lời <strong className="text-neutral-200">@{replyTargetUser}</strong>
                      </span>
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
                        className="w-full bg-neutral-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-white/20 transition-all pr-20"
                        autoFocus
                      />
                      <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToCommentId(null);
                            setReplyContent("");
                          }}
                          className="px-2 py-1 text-xs text-neutral-400 hover:text-white"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={!replyContent.trim()}
                          className={cn(
                            "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                            replyContent.trim()
                              ? "bg-white text-black hover:bg-neutral-200 cursor-pointer"
                              : "bg-white/10 text-neutral-500 cursor-not-allowed",
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
                    <button
                      onClick={() => toggleRepliesExpansion(comment.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer select-none mb-2"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={13} strokeWidth={2} />
                          <span>Ẩn phản hồi</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={13} strokeWidth={2} />
                          <span>Xem {replies.length} câu trả lời</span>
                        </>
                      )}
                    </button>

                    {/* Tree connector branch container */}
                    {isExpanded && (
                      <div className="relative space-y-3 pt-1 before:absolute before:left-3.5 before:top-2 before:bottom-3 before:w-[1px] before:bg-white/10">
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
                                className="absolute left-3.5 top-3.5 w-3.5 h-3.5 border-b border-l border-white/10 rounded-bl-lg pointer-events-none"
                              />

                              {/* Reply User Row */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={reply.user.avatar}
                                    alt={reply.user.name}
                                    referrerPolicy="no-referrer"
                                    className={cn(
                                      "w-6 h-6 rounded-full object-cover flex-shrink-0",
                                      isReplyAdmin
                                        ? "ring-1.5 ring-amber-400/60"
                                        : "border border-white/10",
                                    )}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user.name)}&background=1e293b&color=ffffff&size=64`;
                                    }}
                                  />

                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {isReplyAdmin && (
                                      <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30">
                                        ADMIN
                                      </span>
                                    )}
                                    <span className="text-xs font-semibold text-white tracking-tight">
                                      {reply.user.name}
                                    </span>
                                    <span className="text-[10px] text-neutral-500 font-medium">
                                      {formatTimeAgo(reply.createdAt)}
                                    </span>
                                  </div>
                                </div>

                                {/* Delete reply button */}
                                {(isCurrentAdmin || currentUser?.id === reply.user.id) && (
                                  <button
                                    onClick={() => handleDeleteComment(reply.id)}
                                    className="text-neutral-500 hover:text-rose-400 transition-colors opacity-0 group-hover/reply:opacity-100 cursor-pointer"
                                    title="Xóa phản hồi"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>

                              {/* Reply Content */}
                              <div className="pl-8 mt-1">
                                <div className="text-xs text-neutral-300 leading-relaxed">
                                  {renderCommentContent(reply.content)}
                                </div>

                                <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500">
                                  <button
                                    onClick={() => handleReaction(reply.id, "like")}
                                    className={cn(
                                      "flex items-center gap-1 hover:text-white transition-colors cursor-pointer",
                                      reply.userReaction === "like" && "text-sky-400 font-semibold",
                                    )}
                                  >
                                    <ThumbsUp size={11} className={reply.userReaction === "like" ? "fill-sky-400" : ""} />
                                    <span>{reply.likes > 0 ? reply.likes : ""}</span>
                                  </button>

                                  <button
                                    onClick={() => handleReaction(reply.id, "dislike")}
                                    className={cn(
                                      "flex items-center gap-1 hover:text-white transition-colors cursor-pointer",
                                      reply.userReaction === "dislike" && "text-rose-400 font-semibold",
                                    )}
                                  >
                                    <ThumbsDown size={11} className={reply.userReaction === "dislike" ? "fill-rose-400" : ""} />
                                    {reply.dislikes ? <span>{reply.dislikes}</span> : null}
                                  </button>
                                </div>
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
    </section>
  );
}
