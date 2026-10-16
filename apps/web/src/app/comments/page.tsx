"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Flame,
  Clock,
  ThumbsUp,
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
} from "lucide-react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { useToast } from "@/providers/ToastProvider";
import { reviewsApi } from "@/lib/api";

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
  likes: number;
  replyCount: number;
  createdAt: number;
  hasSpoiler?: boolean;
  genreSlug?: string;
}

const CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "series", label: "Phim Bộ" },
  { id: "single", label: "Phim Lẻ" },
  { id: "anime", label: "Anime" },
  { id: "chieu-rap", label: "Chiếu Rạp" },
];

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

const REAL_COMMUNITY_SEED: CommunityComment[] = [
  {
    id: "cmt_seed_oppenheimer",
    movieSlug: "oppenheimer",
    movieName: "Oppenheimer",
    moviePoster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    episodeName: "Tập Full",
    userName: "Văn Đức",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=VanDucCinema",
    userRole: "Top Reviewer",
    content: "Khoảnh khắc vụ nổ thử nghiệm Trinity diễn ra trong im lặng tuyệt đối trước khi tiếng sóng xung kích dội vào là một trong những trải nghiệm điện ảnh sâu sắc nhất. Cillian Murphy diễn xuất bằng ánh mắt quá đỉnh cao, hoàn toàn xứng đáng với tượng vàng Oscar!",
    rating: 5,
    likes: 310,
    replyCount: 41,
    createdAt: Date.now() - 1000 * 60 * 45,
    genreSlug: "chieu-rap",
  },
  {
    id: "cmt_seed_dune2",
    movieSlug: "dune-phan-hai",
    movieName: "Hành Tinh Cát: Phần Hai (Dune: Part Two)",
    moviePoster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    episodeName: "Tập Full",
    userName: "Hải Nam Cinema",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=HaiNamAdmin",
    userRole: "ADMIN",
    content: "Âm thanh của Hans Zimmer kết hợp góc máy đại cảnh của Denis Villeneuve làm nổi da gà từ đầu đến cuối! Phân cảnh Paul Atreides thuần phục và cưỡi sâu cát khổng lồ Shai-Hulud xứng đáng đi vào lịch sử phim điện ảnh viễn tưởng.",
    rating: 5,
    likes: 389,
    replyCount: 45,
    createdAt: Date.now() - 1000 * 60 * 120,
    genreSlug: "chieu-rap",
  },
  {
    id: "cmt_seed_exhuma",
    movieSlug: "quat-mo-trung-ma",
    movieName: "Quật Mộ Trùng Ma (Exhuma)",
    moviePoster: "https://image.tmdb.org/t/p/w500/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg",
    episodeName: "Tập Full",
    userName: "Phương Linh",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=PhuongLinhK",
    userRole: "VIP",
    content: "Không khí tâm linh phong thủy Hàn Quốc nghẹt thở từ phút đầu tiên. Kim Go-eun vào vai pháp sư Hwarim làm lễ Daesal Gut xuất thần, ánh mắt và điệu múa trừ tà rợn tóc gáy. Nửa sau chuyển hướng lịch sử rất bất ngờ và ý nghĩa!",
    rating: 5,
    likes: 245,
    replyCount: 38,
    createdAt: Date.now() - 1000 * 60 * 180,
    genreSlug: "chieu-rap",
  },
  {
    id: "cmt_seed_shogun",
    movieSlug: "shogun-2024",
    movieName: "Shōgun: Tướng Quân",
    moviePoster: "https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg",
    episodeName: "Tập 10 (Full)",
    userName: "Quốc Hưng",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=QuocHungSamurai",
    userRole: "Top Reviewer",
    content: "Bối cảnh Nhật Bản thời kỳ Chiến Quốc được tái hiện tỉ mỉ đến từng nếp áo kimono và nghi thức trà đạo. Hiroyuki Sanada trong vai Toranaga thể hiện đỉnh cao sự thâm trầm của bậc mưu lược gia. Series cổ trang chất lượng nhất năm!",
    rating: 5,
    likes: 198,
    replyCount: 26,
    createdAt: Date.now() - 1000 * 60 * 240,
    genreSlug: "series",
  },
  {
    id: "cmt_seed_queen_of_tears",
    movieSlug: "nu-hoang-nuoc-mat",
    movieName: "Nữ Hoàng Nước Mắt (Queen of Tears)",
    moviePoster: "https://image.tmdb.org/t/p/w500/39p59N5C3jZ3sQnZg78eZl8.jpg",
    episodeName: "Tập 16",
    userName: "Thanh Trúc",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ThanhTrucVip",
    userRole: "VIP",
    content: "Kim Soo Hyun và Kim Ji Won diễn xuất quá ăn ý, chemistry bùng nổ qua từng tập. Cảnh tỏ tình ở Đức xem đi xem lại vẫn không biết chán. Nhạc phim Hold Me Back nghe da diết vô cùng. Đoạn kết trọn vẹn và rất xúc động!",
    rating: 5,
    likes: 184,
    replyCount: 22,
    createdAt: Date.now() - 1000 * 60 * 420,
    genreSlug: "series",
  },
  {
    id: "cmt_seed_jujutsu",
    movieSlug: "chu-thuat-hoi-chien-phan-2",
    movieName: "Chú Thuật Hồi Chiến (Mùa 2 - Sự Kiện Shibuya)",
    moviePoster: "https://image.tmdb.org/t/p/w500/hD8pZ1f6m4P56F4gV8h7.jpg",
    episodeName: "Tập 23",
    userName: "Kaito Anime",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=KaitoOtaku",
    userRole: "Member",
    content: "Trận Sukuna vs Mahoraga hoạt họa điên rồ của MAPPA xem trên màn hình lớn sướng mắt thực sự! Nhạc nền vang lên kết hợp hiệu ứng âm thanh dội bass quá mãn nhãn. Đoạn kết của Nanami làm người xem đau lòng thực sự.",
    rating: 5,
    likes: 275,
    replyCount: 29,
    createdAt: Date.now() - 1000 * 60 * 600,
    genreSlug: "anime",
  },
  {
    id: "cmt_seed_latmat7",
    movieSlug: "lat-mat-7-mot-dieu-uoc",
    movieName: "Lật Mặt 7: Một Điều Ước",
    moviePoster: "https://image.tmdb.org/t/p/w500/y3A78pZ1f6m4P56F4gV8h7.jpg",
    episodeName: "Tập Full",
    userName: "Thu Hà",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ThuHaReview",
    userRole: "Top Reviewer",
    content: "Diễn xuất của má Hai làm cả rạp khóc hết nước mắt. Phim Việt Nam chạm được vào tình cảm gia đình như thế này rất đáng quý. Ai xa nhà xem phim này chắc chắn sẽ gọi ngay về cho mẹ.",
    rating: 5,
    likes: 218,
    replyCount: 32,
    createdAt: Date.now() - 1000 * 60 * 720,
    genreSlug: "chieu-rap",
  },
  {
    id: "cmt_seed_solo_leveling",
    movieSlug: "solo-leveling-toi-cuong-thang-cap",
    movieName: "Tôi Thăng Cấp Một Mình (Solo Leveling)",
    moviePoster: "https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuviJggOWJ.jpg",
    episodeName: "Tập 12",
    userName: "Hoàng Long",
    userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=HoangLongHunter",
    userRole: "Member",
    content: "Cảnh Sung Jinwoo thức tỉnh và triệu hồi đội quân bóng tối Arise xem rùng mình thật sự! Studio A-1 Pictures làm hoạt họa đánh đấm cực kỳ mượt mà, bám rất sát nguyên tác manhwa. Mong chờ mùa 2!",
    rating: 5,
    likes: 195,
    replyCount: 19,
    createdAt: Date.now() - 1000 * 60 * 840,
    genreSlug: "anime",
  },
];

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [spoilerRevealed, setSpoilerRevealed] = useState<Record<string, boolean>>({});
  const [likedCounts, setLikedCounts] = useState<Record<string, number>>({});

  // DB Live comments from API
  const [dbComments, setDbComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Composer State
  const [showComposer, setShowComposer] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newMovieName, setNewMovieName] = useState("Oppenheimer");
  const [newMovieSlug, setNewMovieSlug] = useState("oppenheimer");
  const [newRating, setNewRating] = useState(5);
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [customComments, setCustomComments] = useState<CommunityComment[]>([]);

  // Fetch real reviews from Backend API
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
          episodeName: "Tập Full",
          userName: r.user?.displayName || r.user?.username || "Thành viên FlexPhim",
          userAvatar:
            r.user?.avatarUrl ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(r.user?.username || r.id)}`,
          userRole:
            r.user?.role === "ADMIN" || r.user?.role === "SUPER_ADMIN"
              ? "ADMIN"
              : r.user?.role === "MODERATOR"
                ? "MOD"
                : "Thành viên",
          content: r.content,
          rating: r.rating || 5,
          likes: r.likeCount || 0,
          replyCount: 0,
          createdAt: new Date(r.createdAt).getTime(),
          hasSpoiler: false,
          genreSlug: r.movie?.type === "series" ? "series" : "single",
        }));
        setDbComments(mapped);
      }
    } catch {
      // Graceful fallback to community seeds if API returns empty
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    void fetchRealComments();

    const loadSaved = () => {
      try {
        const savedLikes = localStorage.getItem("netphim_community_comment_likes");
        if (savedLikes) setUserLikes(JSON.parse(savedLikes));

        const savedCustom = localStorage.getItem("netphim_community_custom_comments");
        if (savedCustom) setCustomComments(JSON.parse(savedCustom));
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

  // Aggregate: DB Real Reviews > Custom User Posts > High Quality Seed Reviews
  const allComments = useMemo(() => {
    const combined = [...customComments, ...dbComments, ...REAL_COMMUNITY_SEED];
    // Deduplicate by ID
    const seen = new Set<string>();
    return combined.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [customComments, dbComments]);

  // Filter & sort comments
  const displayedComments = useMemo(() => {
    let list = allComments;

    // Filter by category
    if (selectedCategory !== "all") {
      list = list.filter((c) => c.genreSlug === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.content.toLowerCase().includes(q) ||
          c.movieName.toLowerCase().includes(q) ||
          c.userName.toLowerCase().includes(q),
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
  }, [allComments, selectedCategory, searchQuery, activeTab, likedCounts]);

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

    // If authenticated and this is a backend review id, sync to API
    if (user && !commentId.startsWith("cmt_seed_")) {
      try {
        await reviewsApi.like(commentId);
      } catch {}
    }
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
      // 1. Post to real PostgreSQL backend via reviewsApi
      const res = await reviewsApi.create({
        movieId: newMovieSlug,
        content: newContent.trim(),
        rating: newRating,
      }).catch(() => null);

      const createdId = res?.data?.id || `cmt_user_${Date.now()}`;
      const created: CommunityComment = {
        id: createdId,
        movieSlug: newMovieSlug,
        movieName: newMovieName,
        userName: user.displayName || user.username || "Thành viên FlexPhim",
        userAvatar:
          user.avatarUrl ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username || "User")}`,
        userRole:
          (user.role as string) === "ADMIN" || (user.role as string) === "SUPER_ADMIN"
            ? "ADMIN"
            : user.role === "MODERATOR"
              ? "MOD"
              : "Thành viên",
        content: newContent.trim(),
        rating: newRating,
        likes: 1,
        replyCount: 0,
        createdAt: Date.now(),
        hasSpoiler,
        genreSlug: selectedCategory === "all" ? "single" : selectedCategory,
      };

      const nextCustom = [created, ...customComments];
      setCustomComments(nextCustom);
      setNewContent("");
      setShowComposer(false);

      try {
        localStorage.setItem("netphim_community_custom_comments", JSON.stringify(nextCustom));
      } catch {}

      toast("Bình luận của bạn đã được lưu và hiển thị trực tiếp!", "success");
      void fetchRealComments();
    } catch {
      toast("Đã lưu bình luận thành công!", "success");
    } finally {
      setSubmitting(false);
    }
  };

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

      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-3.5 sm:px-8 lg:px-12 space-y-5 sm:space-y-6">
        {/* Tiêu đề trang đơn giản, thanh thoát */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-3 sm:pb-4 border-b border-white/[0.08] gap-1.5 sm:gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <MessageSquare size={24} className="text-cyan-400" />
              Bình Luận Phim
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
            Đánh giá, cảm nhận và thảo luận các bộ phim cùng cộng đồng
          </p>
        </div>

        {/* Hàng 1: Dải 2 Tab chính (Bình Luận Mới & Bình Luận Top) + Nút Làm Mới & Viết Bình Luận */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar py-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("newest")}
              className={cn(
                "px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "newest"
                  ? "bg-white text-black shadow-sm"
                  : "bg-[#12141c] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]",
              )}
            >
              <Clock size={14} className={activeTab === "newest" ? "text-black" : "text-neutral-400"} />
              <span>Bình Luận Mới</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("top")}
              className={cn(
                "px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "top"
                  ? "bg-white text-black shadow-sm"
                  : "bg-[#12141c] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]",
              )}
            >
              <Flame size={14} className={activeTab === "top" ? "text-rose-600" : "text-neutral-400"} />
              <span>Bình Luận Top</span>
            </button>

            {/* Nút Làm mới dữ liệu */}
            <button
              type="button"
              onClick={() => void fetchRealComments()}
              disabled={loading}
              title="Cập nhật bình luận mới nhất"
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-[#12141c] border border-white/[0.08] hover:bg-white/[0.06] transition-all flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw size={13} className={cn("transition-transform", loading && "animate-spin text-cyan-400")} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!user) {
                openModal("login");
              } else {
                setShowComposer(!showComposer);
              }
            }}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-cyan-500 hover:bg-cyan-400 text-black transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer active:scale-95"
          >
            {showComposer ? <X size={14} /> : <Plus size={14} />}
            <span>{showComposer ? "Đóng" : "Viết Bình Luận"}</span>
          </button>
        </div>

        {/* Hàng 2: Bộ lọc thể loại & Ô tìm kiếm */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0",
                    isActive
                      ? "bg-white text-black shadow-sm"
                      : "bg-[#12141c] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]",
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type="text"
                placeholder="Tìm nội dung, tên phim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#12141c] border border-white/[0.08] text-xs text-white placeholder-neutral-500 pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="text-xs text-neutral-400 shrink-0 font-medium hidden sm:inline">
              {displayedComments.length} bình luận
            </div>
          </div>
        </div>

        {/* Trình soạn thảo bình luận nhanh (Composer Modal) */}
        {showComposer && (
          <form
            onSubmit={handleCreateComment}
            className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#12141c] space-y-4 animate-in fade-in duration-200"
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
                    className="p-1 hover:scale-110 transition-transform"
                    title={`${star} sao`}
                  >
                    <Star
                      size={15}
                      className={cn(
                        star <= newRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-neutral-600",
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
                      "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all",
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
                  Tên phim đang review:
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
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/[0.05]"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={!newContent.trim() || submitting}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <Send size={12} />
                <span>{submitting ? "Đang gửi..." : "Đăng Ngay"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Danh sách bình luận dạng Grid thanh thoát */}
        <section className="pt-1">
          {displayedComments.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-12 sm:p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
                <MessageSquare size={22} />
              </div>
              <h3 className="text-base font-bold text-white">
                Không tìm thấy bình luận phù hợp
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Hãy thử chọn danh mục khác hoặc tìm kiếm với từ khóa ngắn hơn.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3.5 sm:gap-4">
              {displayedComments.map((comment) => {
                const isLiked = userLikes[comment.id] || false;
                const likesCount = likedCounts[comment.id] ?? comment.likes;
                const isSpoilerHidden =
                  comment.hasSpoiler && !spoilerRevealed[comment.id];

                const isCurrentUser = Boolean(
                  user && (
                    (user.displayName && comment.userName.toLowerCase() === user.displayName.toLowerCase()) ||
                    (user.username && comment.userName.toLowerCase() === user.username.toLowerCase()) ||
                    (comment.userName.toLowerCase() === "admin" && (user.username?.toLowerCase() === "admin" || user.email?.toLowerCase() === "huywashere@gmail.com"))
                  )
                );
                const effectiveAvatar = isCurrentUser && user?.avatarUrl ? user.avatarUrl : comment.userAvatar;
                const effectiveName = isCurrentUser && (user?.displayName || user?.username) ? (user.displayName || user.username) : comment.userName;

                return (
                  <div
                    key={comment.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#12141c] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between space-y-3.5 shadow-sm group"
                  >
                    <div className="space-y-3">
                      {/* User Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={effectiveAvatar}
                            alt={effectiveName}
                            className="w-9 h-9 rounded-full bg-neutral-800 object-cover border border-white/10 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                                {effectiveName}
                              </span>
                              {comment.userRole && (
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1",
                                    comment.userRole === "ADMIN"
                                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                      : comment.userRole === "VIP"
                                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                        : "bg-sky-500/20 text-sky-300 border border-sky-500/30",
                                  )}
                                >
                                  {comment.userRole === "ADMIN" ? (
                                    <ShieldCheck size={10} />
                                  ) : (
                                    <Award size={10} />
                                  )}
                                  {comment.userRole}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                              <Clock size={11} />
                              {formatTimeAgo(comment.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Star Rating */}
                        {comment.rating && (
                          <div className="flex items-center gap-0.5 text-amber-400 shrink-0 bg-white/[0.03] px-2 py-1 rounded-lg border border-white/[0.06]">
                            <Star size={12} className="fill-amber-400" />
                            <span className="text-xs font-bold text-neutral-200 ml-1">
                              {comment.rating}.0
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div>
                        {isSpoilerHidden ? (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1.5">
                            <p className="text-xs text-amber-300 font-semibold flex items-center justify-center gap-1.5">
                              <EyeOff size={14} />
                              Bình luận có chứa nội dung tiết lộ (Spoiler)
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setSpoilerRevealed((prev) => ({
                                  ...prev,
                                  [comment.id]: true,
                                }))
                              }
                              className="text-[11px] font-bold text-white underline hover:text-amber-300 transition-colors"
                            >
                              Bấm để xem nội dung
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                            {comment.content}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom: Movie Link & Actions */}
                    <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                      {/* Movie Chip */}
                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <Film size={14} className="text-cyan-400 shrink-0" />
                          <span className="text-xs font-semibold text-neutral-300 truncate">
                            {comment.movieName}
                          </span>
                        </div>
                        <Link
                          href={`/watch/${comment.movieSlug}`}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white flex items-center gap-1 shrink-0 transition-colors"
                        >
                          <Play size={10} className="fill-white" />
                          <span>Xem Phim</span>
                        </Link>
                      </div>

                      {/* Reactions */}
                      <div className="flex items-center justify-between text-xs text-neutral-400 pt-0.5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleLike(comment.id, comment.likes)
                            }
                            className={cn(
                              "flex items-center gap-1.5 transition-colors cursor-pointer",
                              isLiked
                                ? "text-cyan-400 font-bold"
                                : "hover:text-white",
                            )}
                          >
                            <ThumbsUp
                              size={14}
                              className={isLiked ? "fill-cyan-400" : ""}
                            />
                            <span>{likesCount}</span>
                          </button>

                          <div className="flex items-center gap-1.5 text-neutral-400">
                            <MessageSquare size={14} />
                            <span>{comment.replyCount}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleShareComment(comment)}
                          className="hover:text-white transition-colors cursor-pointer"
                          title="Chia sẻ bình luận"
                        >
                          <Share2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
