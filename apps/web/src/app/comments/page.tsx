"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Flame,
  Sparkles,
  Heart,
  Star,
  Play,
  Share2,
  Search,
  Filter,
  Film,
  Eye,
  Send,
  Clock,
} from "lucide-react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { useToast } from "@/providers/ToastProvider";

interface CommunityComment {
  id: string;
  movieSlug: string;
  movieName: string;
  moviePoster?: string;
  episodeName?: string;
  userName: string;
  userAvatar: string;
  userRole?: string;
  content: string;
  rating?: number;
  emotion?: {
    emoji: string;
    label: string;
  };
  likes: number;
  replyCount: number;
  createdAt: number;
  hasSpoiler?: boolean;
  genreSlug?: string;
}

const SEED_COMMENTS: CommunityComment[] = [
  {
    id: "cmt_seed_1",
    movieSlug: "chu-chuot-dau-bep",
    movieName: "Chú Chuột Đầu Bếp (Ratatouille)",
    moviePoster: "https://vsmov.com/storage/images/rkrU5jFUJ02NAxoU2GVdWsd1Hh6.jpg",
    episodeName: "Tập Full",
    userName: "Minh Quân",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=MinhQuan",
    userRole: "VIP",
    content: "Đoạn Anton Ego nếm miếng Ratatouille rồi nhớ về tuổi thơ thật sự là kiệt tác của điện ảnh hoạt hình! Xem lại lần thứ 5 vẫn rơm rớm nước mắt. Thông điệp 'Ai cũng có thể nấu ăn' quá đẹp.",
    rating: 5,
    emotion: { emoji: "💖", label: "Xúc động" },
    likes: 142,
    replyCount: 18,
    createdAt: Date.now() - 1000 * 60 * 35, // 35 phút trước
    genreSlug: "hoat-hinh",
  },
  {
    id: "cmt_seed_2",
    movieSlug: "lat-mat-7-mot-dieu-uoc",
    movieName: "Lật Mặt 7: Một Điều Ước",
    moviePoster: "https://image.tmdb.org/t/p/w500/y3A78pZ1f6m4P56F4gV8h7.jpg",
    episodeName: "Tập Full",
    userName: "Thu Hà",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ThuHa",
    userRole: "Top Reviewer",
    content: "Diễn xuất của má Hai làm cả rạp khóc hết nước mắt. Phim Việt Nam chạm được vào tình cảm gia đình như thế này rất đáng quý. Ai xa nhà xem phim này chắc chắn sẽ gọi ngay về cho mẹ.",
    rating: 5,
    emotion: { emoji: "🥺", label: "Cảm động" },
    likes: 218,
    replyCount: 32,
    createdAt: Date.now() - 1000 * 60 * 120, // 2 giờ trước
    genreSlug: "tam-ly",
  },
  {
    id: "cmt_seed_3",
    movieSlug: "dune-phan-hai",
    movieName: "Hành Tinh Cát: Phần Hai (Dune: Part Two)",
    moviePoster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    episodeName: "Tập Full",
    userName: "Hải Nam Cinema",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=HaiNam",
    userRole: "ADMIN",
    content: "Âm thanh của Hans Zimmer kết hợp góc máy đại cảnh của Denis Villeneuve làm nổi da gà từ đầu đến cuối! Cảnh Paul Atreides cưỡi sâu cát xứng đáng đi vào lịch sử điện ảnh viễn tưởng.",
    rating: 5,
    emotion: { emoji: "🔥", label: "Cực cuốn" },
    likes: 389,
    replyCount: 45,
    createdAt: Date.now() - 1000 * 60 * 250, // 4 giờ trước
    genreSlug: "vien-tuong",
  },
  {
    id: "cmt_seed_4",
    movieSlug: "dao-pho-va-piano",
    movieName: "Đào, Phở và Piano",
    moviePoster: "https://image.tmdb.org/t/p/w500/o79r4a9vXzR8iY0.jpg",
    episodeName: "Tập Full",
    userName: "Linh Đan",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=LinhDan",
    userRole: "Thành viên",
    content: "Hà Nội mùa đông 1946 hiện lên vừa hào hùng vừa lãng mạn. Âm nhạc và bối cảnh được phục dựng rất chỉn chu. Tình yêu đôi lứa hòa vào tình yêu đất nước thời chiến tranh.",
    rating: 4.5,
    emotion: { emoji: "✨", label: "Hào hùng" },
    likes: 95,
    replyCount: 12,
    createdAt: Date.now() - 1000 * 60 * 15, // 15 phút trước
    genreSlug: "chinh-kich",
  },
  {
    id: "cmt_seed_5",
    movieSlug: "tham-tu-lung-danh-conan",
    movieName: "Thám Tử Lừng Danh Conan: Tàu Ngầm Sắt Màu Đen",
    moviePoster: "https://image.tmdb.org/t/p/w500/9e0xR8B01aJz9.jpg",
    episodeName: "Tập Full",
    userName: "Kenichi99",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Kenichi",
    userRole: "Fan Cứng",
    content: "Cảnh Haibara và Conan phối hợp dưới đại dương thực sự đỉnh cao! Tổ chức Áo Đen xuất hiện lần này rất nguy hiểm và có nhiều tình tiết bất ngờ.",
    rating: 5,
    emotion: { emoji: "🌊", label: "Hồi hộp" },
    likes: 312,
    replyCount: 38,
    createdAt: Date.now() - 1000 * 60 * 180,
    hasSpoiler: true,
    genreSlug: "anime",
  },
  {
    id: "cmt_seed_6",
    movieSlug: "mai",
    movieName: "Mai (2024)",
    moviePoster: "https://image.tmdb.org/t/p/w500/z6e01aJz9r8.jpg",
    episodeName: "Tập Full",
    userName: "Phương Vy",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=PhuongVy",
    userRole: "Thành viên",
    content: "Một câu chuyện tình đầy trăn trở về định kiến xã hội. Phương Anh Đào diễn xuất quá xuất thần, ánh mắt chất chứa biết bao tổn thương.",
    rating: 4,
    emotion: { emoji: "💔", label: "Day dứt" },
    likes: 184,
    replyCount: 22,
    createdAt: Date.now() - 1000 * 60 * 50,
    genreSlug: "tam-ly",
  },
  {
    id: "cmt_seed_7",
    movieSlug: "solo-leveling",
    movieName: "Tôi Thăng Cấp Một Mình (Solo Leveling)",
    moviePoster: "https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0QfpmR0r6xuaN.jpg",
    episodeName: "Tập 12",
    userName: "ShadowMonarch",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ShadowMonarch",
    userRole: "VIP",
    content: "Tiếng 'ARISE' (Trỗi dậy) cất lên làm nổi cả da gà! Studio A-1 Pictures làm phần hoạt họa combat mượt và lực kinh khủng khiếp.",
    rating: 5,
    emotion: { emoji: "🔥", label: "Cực cuốn" },
    likes: 420,
    replyCount: 56,
    createdAt: Date.now() - 1000 * 60 * 8, // 8 phút trước
    genreSlug: "anime",
  },
  {
    id: "cmt_seed_8",
    movieSlug: "oppenheimer",
    movieName: "Oppenheimer",
    moviePoster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    episodeName: "Tập Full",
    userName: "Dr. Hoàng",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=DrHoang",
    userRole: "Top Reviewer",
    content: "Đoạn thử nghiệm Trinity im lặng tuyệt đối trước khi sóng xung kích ập tới... Christopher Nolan đã tạo nên khoảnh khắc điện ảnh chân thực và ám ảnh tột cùng về sự hủy diệt.",
    rating: 5,
    emotion: { emoji: "🧠", label: "Sâu sắc" },
    likes: 512,
    replyCount: 64,
    createdAt: Date.now() - 1000 * 60 * 360,
    genreSlug: "chinh-kich",
  },
];

const GENRE_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "anime", label: "Anime" },
  { id: "vien-tuong", label: "Viễn Tưởng" },
  { id: "tam-ly", label: "Tâm Lý & Tình Cảm" },
  { id: "hoat-hinh", label: "Hoạt Hình" },
  { id: "chinh-kich", label: "Chính Kịch & Lịch Sử" },
];

function formatTimeAgo(timeMs: number): string {
  const diffSec = Math.floor((Date.now() - timeMs) / 1000);
  if (diffSec < 60) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return `${Math.floor(diffDay / 30)} tháng trước`;
}

export default function CommentsPage() {
  const { user } = useAuthStore();
  const { openModal } = useAuthModalStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"newest" | "top">("newest");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [spoilerRevealed, setSpoilerRevealed] = useState<Record<string, boolean>>({});
  const [likedCounts, setLikedCounts] = useState<Record<string, number>>({});

  // Quick Comment Composer state
  const [showComposer, setShowComposer] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newMovieName, setNewMovieName] = useState("Chú Chuột Đầu Bếp");
  const [newMovieSlug, setNewMovieSlug] = useState("chu-chuot-dau-bep");
  const [newEmotion, setNewEmotion] = useState({ emoji: "💖", label: "Xúc động" });
  const [newRating, setNewRating] = useState(5);
  const [customComments, setCustomComments] = useState<CommunityComment[]>([]);

  // Load user likes and stored comments from localStorage
  useEffect(() => {
    try {
      const savedLikes = localStorage.getItem("netphim_community_comment_likes");
      if (savedLikes) setUserLikes(JSON.parse(savedLikes));

      const savedCustom = localStorage.getItem("netphim_community_custom_comments");
      if (savedCustom) setCustomComments(JSON.parse(savedCustom));
    } catch {}
  }, []);

  // Aggregate comments
  const allComments = useMemo(() => {
    return [...customComments, ...SEED_COMMENTS];
  }, [customComments]);

  // Filter & sort comments
  const displayedComments = useMemo(() => {
    let list = allComments;

    // Filter by genre
    if (selectedGenre !== "all") {
      list = list.filter((c) => c.genreSlug === selectedGenre);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.content.toLowerCase().includes(q) ||
          c.movieName.toLowerCase().includes(q) ||
          c.userName.toLowerCase().includes(q)
      );
    }

    // Sort by tab
    if (activeTab === "top") {
      return [...list].sort((a, b) => {
        const likesA = likedCounts[a.id] ?? a.likes;
        const likesB = likedCounts[b.id] ?? b.likes;
        return likesB - likesA;
      });
    }

    // Newest
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [allComments, selectedGenre, searchQuery, activeTab, likedCounts]);

  const handleToggleLike = (commentId: string, initialLikes: number) => {
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

  const handleCreateComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    if (!user) {
      openModal("login");
      return;
    }

    const created: CommunityComment = {
      id: `cmt_user_${Date.now()}`,
      movieSlug: newMovieSlug,
      movieName: newMovieName,
      userName: user.displayName || user.username || "Thành viên Netphim",
      userAvatar:
        user.avatarUrl ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username || "User")}`,
      userRole: user.role === "ADMIN" ? "ADMIN" : "Thành viên",
      content: newContent.trim(),
      rating: newRating,
      emotion: newEmotion,
      likes: 0,
      replyCount: 0,
      createdAt: Date.now(),
      genreSlug: "all",
    };

    const updated = [created, ...customComments];
    setCustomComments(updated);
    setNewContent("");
    setShowComposer(false);

    try {
      localStorage.setItem("netphim_community_custom_comments", JSON.stringify(updated));
    } catch {}

    toast("Đã đăng bình luận lên Cộng Đồng!", "success");
  };

  return (
    <main
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#0a0b10] text-white pb-24 sm:pb-28 pt-16 sm:pt-20 select-none"
      )}
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-purple-500/[0.035] via-sky-500/[0.02] to-transparent blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-3.5 sm:px-8 lg:px-12 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-4 border-b border-white/[0.08] gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                Cộng Đồng Trực Tiếp
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-sky-400 shrink-0" />
              Cộng Đồng Bình Luận
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">
              Khám phá những đánh giá chân thực, góc nhìn sâu sắc và cảm xúc mới nhất từ cộng đồng người yêu phim Netphim.
            </p>
          </div>

          {/* Quick Action */}
          <button
            type="button"
            onClick={() => {
              if (!user) {
                openModal("login");
              } else {
                setShowComposer(!showComposer);
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 transition-all font-bold text-xs sm:text-sm cursor-pointer shadow-lg active:scale-95 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Viết Đánh Giá Mới</span>
          </button>
        </div>

        {/* Quick Review Composer Modal/Box */}
        {showComposer && (
          <form
            onSubmit={handleCreateComment}
            className="p-4 sm:p-5 rounded-2xl bg-[#12141c] border border-white/[0.1] shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-3 duration-200"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                Chia Sẻ Cảm Nhận Phim
              </span>
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className="text-neutral-400 hover:text-white text-xs font-semibold px-2 py-1 rounded-md hover:bg-white/10"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  Chọn Phim Bình Luận
                </label>
                <select
                  value={newMovieSlug}
                  onChange={(e) => {
                    setNewMovieSlug(e.target.value);
                    const opt = e.target.options[e.target.selectedIndex];
                    if (opt) setNewMovieName(opt.text);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0b10] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="chu-chuot-dau-bep">Chú Chuột Đầu Bếp (Ratatouille)</option>
                  <option value="dune-phan-hai">Hành Tinh Cát 2 (Dune: Part Two)</option>
                  <option value="lat-mat-7-mot-dieu-uoc">Lật Mặt 7: Một Điều Ước</option>
                  <option value="mai">Mai (2024)</option>
                  <option value="dao-pho-va-piano">Đào, Phở và Piano</option>
                  <option value="tham-tu-lung-danh-conan">Conan: Tàu Ngầm Sắt Màu Đen</option>
                  <option value="solo-leveling">Solo Leveling</option>
                  <option value="oppenheimer">Oppenheimer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  Cảm Xúc Của Bạn
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {[
                    { emoji: "💖", label: "Xúc động" },
                    { emoji: "🔥", label: "Cực cuốn" },
                    { emoji: "😂", label: "Hài hước" },
                    { emoji: "🧠", label: "Sâu sắc" },
                    { emoji: "😱", label: "Hồi hộp" },
                  ].map((emo) => (
                    <button
                      key={emo.label}
                      type="button"
                      onClick={() => setNewEmotion(emo)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 shrink-0 transition-all",
                        newEmotion.label === emo.label
                          ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                          : "bg-white/[0.03] text-neutral-400 border-white/[0.06] hover:text-white"
                      )}
                    >
                      <span>{emo.emoji}</span>
                      <span>{emo.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                Nội Dung Đánh Giá
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Chia sẻ cảm xúc chân thực của bạn về bộ phim này..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0b10] border border-white/[0.08] text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500 resize-none placeholder:text-neutral-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <span>Đánh giá:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className={cn(
                      "cursor-pointer text-base transition-transform active:scale-125",
                      star <= newRating ? "text-amber-400" : "text-neutral-600"
                    )}
                  >
                    ★
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!newContent.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Đăng Ngay</span>
              </button>
            </div>
          </form>
        )}

        {/* 2 Main Tabs + Filters & Search Bar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* 2 Main Tabs (Bình luận mới & Bình luận top) */}
            <div className="flex items-center bg-[#12141c] p-1 rounded-xl border border-white/[0.08] shrink-0 self-start">
              <button
                type="button"
                onClick={() => setActiveTab("newest")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                  activeTab === "newest"
                    ? "bg-white text-black shadow-md"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                <span>Bình Luận Mới</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("top")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                  activeTab === "top"
                    ? "bg-white text-black shadow-md"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Bình Luận Top</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm bình luận, tên phim..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#12141c] border border-white/[0.08] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          {/* Sub Genre Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
            <span className="text-[11px] font-semibold text-neutral-500 shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Lọc:
            </span>
            {GENRE_FILTERS.map((g) => {
              const isSelected = selectedGenre === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGenre(g.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border",
                    isSelected
                      ? "bg-white/15 text-white border-white/25"
                      : "bg-[#12141c] text-neutral-400 hover:text-white border-white/[0.06]"
                  )}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comments Grid */}
        <div className="space-y-4">
          {displayedComments.length === 0 ? (
            <div className="text-center py-16 px-4 bg-[#12141c]/50 rounded-2xl border border-white/[0.06] space-y-3">
              <MessageSquare className="w-10 h-10 text-neutral-600 mx-auto" />
              <p className="text-sm font-bold text-neutral-300">Không tìm thấy bình luận phù hợp</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Hãy thử đổi từ khóa tìm kiếm hoặc chọn thể loại khác để xem các thảo luận cộng đồng.
              </p>
            </div>
          ) : (
            displayedComments.map((comment) => {
              const isLiked = userLikes[comment.id];
              const likeCount = likedCounts[comment.id] ?? comment.likes;
              const isRevealed = spoilerRevealed[comment.id];

              return (
                <div
                  key={comment.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#12141c] border border-white/[0.08] hover:border-white/[0.14] transition-all space-y-3.5 shadow-xl group"
                >
                  {/* Top: User info + Post meta */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={comment.userAvatar}
                        alt={comment.userName}
                        className="w-10 h-10 rounded-full bg-neutral-800 object-cover border border-white/10 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-400 transition-colors">
                            {comment.userName}
                          </span>
                          {comment.userRole && (
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border",
                                comment.userRole === "ADMIN"
                                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                                  : comment.userRole === "VIP"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                              )}
                            >
                              {comment.userRole}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                          {comment.episodeName && (
                            <>
                              <span>•</span>
                              <span className="text-neutral-300 font-medium">
                                {comment.episodeName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rating & Emotion Badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      {comment.emotion && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-neutral-300">
                          <span>{comment.emotion.emoji}</span>
                          <span>{comment.emotion.label}</span>
                        </span>
                      )}
                      {comment.rating && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{comment.rating}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Linked Movie Mini Showcase */}
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/40 border border-white/[0.06] hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Film className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-xs font-bold text-white truncate">
                        {comment.movieName}
                      </span>
                    </div>

                    <Link
                      href={`/watch/${comment.movieSlug}`}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-bold transition-all shrink-0 border border-sky-500/20"
                    >
                      <Play className="w-3 h-3 fill-sky-400" />
                      <span>Xem Phim</span>
                    </Link>
                  </div>

                  {/* Comment Body */}
                  <div className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-normal">
                    {comment.hasSpoiler && !isRevealed ? (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
                        <span className="text-xs text-amber-300 font-medium">
                          ⚠️ Bình luận có chứa nội dung tiết lộ cốt truyện (Spoiler).
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSpoilerRevealed((prev) => ({
                              ...prev,
                              [comment.id]: true,
                            }))
                          }
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem nội dung</span>
                        </button>
                      </div>
                    ) : (
                      <p className="whitespace-pre-line">{comment.content}</p>
                    )}
                  </div>

                  {/* Footer Interaction Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs text-neutral-400">
                    <div className="flex items-center gap-4">
                      {/* Heart Like button */}
                      <button
                        type="button"
                        onClick={() => handleToggleLike(comment.id, comment.likes)}
                        className={cn(
                          "flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-all cursor-pointer font-bold",
                          isLiked
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : "hover:bg-white/[0.06] hover:text-white"
                        )}
                      >
                        <Heart
                          className={cn(
                            "w-3.5 h-3.5 transition-transform active:scale-125",
                            isLiked ? "fill-rose-400 text-rose-400" : ""
                          )}
                        />
                        <span>{likeCount}</span>
                      </button>

                      {/* Reply counter */}
                      <span className="flex items-center gap-1.5 py-1 px-2 text-neutral-400">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{comment.replyCount} thảo luận</span>
                      </span>
                    </div>

                    {/* Share action */}
                    <button
                      type="button"
                      onClick={() => handleShareComment(comment)}
                      className="flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
                      title="Chia sẻ bình luận"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Chia sẻ</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
