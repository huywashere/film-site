"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmItem,
  FilmCardSkeleton,
  resolveImageUrl,
} from "@/components/film/FilmCard";
import {
  Users,
  Play,
  Plus,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Radio,
  Search,
  X,
  Check,
  Flame,
} from "lucide-react";
import { useToast } from "@/providers/ToastProvider";
import { motion } from "framer-motion";

export default function WatchPartyListPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [inputRoomCode, setInputRoomCode] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<FilmItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customRoomName, setCustomRoomName] = useState("");

  // Fetch trending movies for featured rooms & recommendation grid
  const {
    data: trendingData,
    isLoading: trendingLoading,
    refetch,
  } = useQuery({
    queryKey: ["watch-party-movies"],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
  });

  const movies: FilmItem[] =
    trendingData?.data?.items || trendingData?.items || [];

  // Filter movies for modal search
  const filteredMovies = movies.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.origin_name &&
        m.origin_name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Generate live room cards from actual API movies
  const liveRooms = movies.slice(0, 6).map((m, idx) => {
    const mockHosts = [
      {
        name: "truongdong1989",
        avatar:
          "https://ui-avatars.com/api/?name=Truong+Dong&background=10b981&color=fff",
      },
      {
        name: "yeuphim12345",
        avatar:
          "https://ui-avatars.com/api/?name=Yeu+Phim&background=2563eb&color=fff",
      },
      {
        name: "minhtran_99",
        avatar:
          "https://ui-avatars.com/api/?name=Minh+Tran&background=7c3aed&color=fff",
      },
      {
        name: "hoangnam_cine",
        avatar:
          "https://ui-avatars.com/api/?name=Hoang+Nam&background=db2777&color=fff",
      },
      {
        name: "lananh_movie",
        avatar:
          "https://ui-avatars.com/api/?name=Lan+Anh&background=d97706&color=fff",
      },
      {
        name: "huyen_phimhot",
        avatar:
          "https://ui-avatars.com/api/?name=Huyen+Phim&background=10b981&color=fff",
      },
    ];
    const host = mockHosts[idx % mockHosts.length];
    const roomCode = `WP-${m.slug.substring(0, 4).toUpperCase()}${idx + 1}`;

    return {
      id: roomCode,
      movie: m,
      roomTitle: `Xem chung: ${m.name}`,
      hostName: host.name,
      hostAvatar: host.avatar,
      viewersCount: Math.floor(Math.random() * 18) + 2,
      episodeLabel: m.episode_current || "TẬP FULL",
    };
  });

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputRoomCode.trim().toUpperCase();
    if (!code) {
      toast("Vui lòng nhập mã phòng!", "error");
      return;
    }
    const match = liveRooms.find((r) => r.id.toUpperCase() === code);
    const targetSlug = match ? match.movie.slug : movies[0]?.slug || "dune-2";
    toast(`Đang kết nối vào phòng ${code}...`, "info");
    router.push(`/watch/${targetSlug}?room=${code}`);
  };

  const handleCreateRoom = () => {
    if (!selectedMovie) {
      toast("Vui lòng chọn bộ phim để xem chung!", "error");
      return;
    }
    const newCode =
      "WP-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    toast(`Đã khởi tạo phòng xem chung #${newCode}!`, "success");
    setShowCreateModal(false);
    router.push(`/watch/${selectedMovie.slug}?room=${newCode}`);
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground pl-4 lg:pl-24 pr-4 md:pr-10 pt-20 pb-20 relative">
      {/* Subtle top ambient glow matching site dark aesthetics */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent blur-3xl" />

      {/* ── Top Hero Header (Seamless Glassmorphism matching site design) ── */}
      <div className="relative w-full rounded-3xl overflow-hidden bg-[#0c1015]/80 border border-white/10 p-6 sm:p-10 md:p-12 mb-12 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
          {/* Left Header Content */}
          <div className="space-y-4 max-w-2xl">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider"
            >
              <ArrowLeft size={14} />
              <span>Quay lại trang chủ</span>
            </Link>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Xem Chung Trực Tuyến
            </h1>

            <p className="text-xs sm:text-sm text-neutral-400 font-medium leading-relaxed">
              Lên lịch hoặc tạo phòng chiếu ngay lập tức, mời bạn bè cùng xem
              những bộ phim hấp dẫn và trò chuyện thời gian thực cực kỳ thú vị!
            </p>

            {/* Input Room Code Bar */}
            <form onSubmit={handleJoinByCode} className="pt-2">
              <div className="flex items-center bg-[#131920] border border-white/15 rounded-full p-1.5 max-w-md shadow-xl backdrop-blur-md focus-within:border-emerald-500 transition-all">
                <input
                  type="text"
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value)}
                  placeholder="Dán mã phòng để vào xem..."
                  className="flex-1 bg-transparent px-4 text-xs font-semibold text-white placeholder-neutral-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-2.5 rounded-full flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <ArrowRight size={14} />
                  <span>Vào phòng</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            <button
              onClick={() => {
                refetch();
                toast("Đã cập nhật danh sách phòng chiếu mới nhất!", "success");
              }}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-3 rounded-full border border-white/15 backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <RotateCw
                size={14}
                className={trendingLoading ? "animate-spin" : ""}
              />
              <span>Làm mới</span>
            </button>

            <button
              onClick={() => {
                if (movies.length > 0) setSelectedMovie(movies[0]);
                setShowCreateModal(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs px-6 py-3 rounded-full shadow-lg shadow-emerald-500/25 border border-emerald-400/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Tạo phòng chiếu</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Rooms Section ("Phòng đang hoạt động") ── */}
      <div className="mb-14">
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Phòng đang hoạt động
            </h2>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            {liveRooms.length} phòng trực tuyến
          </span>
        </div>

        {/* Room Grid (Native Dark Card Design) */}
        {trendingLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-white/5 animate-pulse border border-white/10"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveRooms.map((room) => {
              const poster =
                resolveImageUrl(room.movie.thumb_url) ||
                resolveImageUrl(room.movie.poster_url);

              return (
                <motion.div
                  key={room.id}
                  whileHover={{ y: -4 }}
                  onClick={() =>
                    router.push(`/watch/${room.movie.slug}?room=${room.id}`)
                  }
                  className="group relative rounded-2xl bg-[#0d1117] border border-white/10 hover:border-emerald-500/60 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between h-52 p-4"
                >
                  {/* Backdrop Background Image */}
                  {poster && (
                    <img
                      src={poster}
                      alt={room.movie.name}
                      className="absolute inset-0 w-full h-full object-cover brightness-[0.4] group-hover:brightness-[0.5] group-hover:scale-105 transition-all duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/80 to-black/40" />

                  {/* Top Bar: LIVE badge & Viewers count */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow">
                        <Radio size={10} className="animate-pulse" />
                        LIVE
                      </span>
                      <span className="bg-white/15 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase border border-white/20 backdrop-blur-md">
                        {room.episodeLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/30">
                      <Users size={12} />
                      <span>{room.viewersCount}</span>
                    </div>
                  </div>

                  {/* Bottom Info */}
                  <div className="relative z-10 space-y-2 pt-4">
                    <h3 className="text-base font-extrabold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {room.roomTitle}
                    </h3>

                    <div className="flex items-center justify-between pt-1 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <img
                          src={room.hostAvatar}
                          alt={room.hostName}
                          className="w-5 h-5 rounded-full object-cover border border-emerald-400/50"
                        />
                        <span className="text-xs font-semibold text-neutral-300 truncate max-w-[120px]">
                          {room.hostName}
                        </span>
                      </div>

                      <span className="text-[11px] font-extrabold text-emerald-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                        Vào phòng <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Movie Recommendations Grid ("Chọn phim để khởi tạo phòng mới") ── */}
      <div>
        <div className="flex items-center space-x-2 mb-6 px-1">
          <Flame size={18} className="text-emerald-400" />
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Chọn phim hot để tạo phòng mới
          </h2>
        </div>

        {trendingLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <FilmCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {movies.slice(0, 12).map((film) => (
              <div
                key={film.slug}
                onClick={() => {
                  setSelectedMovie(film);
                  setShowCreateModal(true);
                }}
                className="cursor-pointer group"
                title="Bấm để tạo phòng xem chung"
              >
                <FilmCard film={film} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Room Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0c1015] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-emerald-400" />
                <h3 className="text-lg font-extrabold text-white">
                  Tạo Phòng Xem Chung Mới
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Select Movie Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                1. Chọn bộ phim muốn xem chung
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên phim..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Movie Grid Selection */}
              <div className="max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 scrollbar-thin scrollbar-thumb-white/10">
                {filteredMovies.map((m) => {
                  const isSelected = selectedMovie?.slug === m.slug;
                  const thumb =
                    resolveImageUrl(m.thumb_url) ||
                    resolveImageUrl(m.poster_url);

                  return (
                    <div
                      key={m.slug}
                      onClick={() => setSelectedMovie(m)}
                      className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all aspect-[16/9] ${
                        isSelected
                          ? "border-emerald-500 scale-95 shadow-lg shadow-emerald-500/30"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      {thumb && (
                        <img
                          src={thumb}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 p-1.5 flex flex-col justify-end">
                        <span className="text-[10px] font-bold text-white truncate">
                          {m.name}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Room Title Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                2. Đặt tên phòng (Tùy chọn)
              </label>
              <input
                type="text"
                value={customRoomName}
                onChange={(e) => setCustomRoomName(e.target.value)}
                placeholder={
                  selectedMovie
                    ? `Xem chung: ${selectedMovie.name}`
                    : "Nhập tên phòng..."
                }
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleCreateRoom}
                className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95"
              >
                Khởi tạo phòng xem chung
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
