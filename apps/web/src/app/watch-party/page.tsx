"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDot,
  Clock3,
  Film,
  Link2,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Users,
  X,
  Sparkles,
  Play,
  Zap,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmCardSkeleton,
  type FilmItem,
  resolveImageUrl,
} from "@/components/film/FilmCard";
import { useToast } from "@/providers/ToastProvider";
import {
  createWatchPartySocket,
  type SocketAck,
  type WatchPartyLobbyRoom,
} from "@/lib/watch-party-socket";

type LobbyState = "connecting" | "online" | "offline";

export default function WatchPartyListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const socket = useMemo(() => createWatchPartySocket(), []);
  const [rooms, setRooms] = useState<WatchPartyLobbyRoom[]>([]);
  const [lobbyState, setLobbyState] = useState<LobbyState>("connecting");
  const [inputRoomCode, setInputRoomCode] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<FilmItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customRoomName, setCustomRoomName] = useState("");

  const {
    data: trendingData,
    isLoading: trendingLoading,
    refetch,
  } = useQuery({
    queryKey: ["watch-party-movies"],
    queryFn: () => movieApi.getLatest(1).then((response) => response.data),
  });

  const movies: FilmItem[] =
    trendingData?.data?.items || trendingData?.items || [];
  const filteredMovies = movies.filter((movie) => {
    const query = searchQuery.trim().toLocaleLowerCase("vi");
    return (
      !query ||
      movie.name.toLocaleLowerCase("vi").includes(query) ||
      movie.origin_name?.toLocaleLowerCase("vi").includes(query)
    );
  });

  useEffect(() => {
    let active = true;

    const requestRooms = () => {
      if (!active) return;
      setLobbyState("online");
      socket.emit("rooms:list", {}, (result: SocketAck) => {
        if (active && result && result.ok) {
          setRooms(result.rooms || []);
        }
      });
    };

    const handleRooms = (nextRooms: WatchPartyLobbyRoom[]) => {
      if (active) {
        setRooms(nextRooms || []);
        setLobbyState("online");
      }
    };

    const handleOffline = () => {
      if (active) setLobbyState("offline");
    };

    const handleConnecting = () => {
      if (active) setLobbyState("connecting");
    };

    socket.on("connect", requestRooms);
    socket.on("rooms:changed", handleRooms);
    socket.on("disconnect", handleOffline);
    socket.on("connect_error", handleOffline);
    socket.on("reconnecting", handleConnecting);

    socket.connect();

    return () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket]);

  const handleJoinByLink = (event: React.FormEvent) => {
    event.preventDefault();
    const invite = inputRoomCode.trim();
    if (!invite) return toast("Hãy dán liên kết mời vào ô này.", "error");
    try {
      const url = new URL(invite, window.location.origin);
      const roomId = url.searchParams.get("room");
      if (!roomId || !url.pathname.startsWith("/watch/")) throw new Error();
      router.push(`${url.pathname}${url.search}`);
    } catch {
      toast("Liên kết mời không hợp lệ.", "error");
    }
  };

  const openCreateModal = (movie?: FilmItem) => {
    setSelectedMovie(movie || movies[0] || null);
    setShowCreateModal(true);
  };

  const handleCreateRoom = () => {
    if (!selectedMovie) return toast("Hãy chọn một bộ phim.", "error");
    const params = new URLSearchParams({ party: "create" });
    if (customRoomName.trim()) params.set("roomName", customRoomName.trim());
    setShowCreateModal(false);
    router.push(`/watch/${selectedMovie.slug}?${params.toString()}`);
  };

  const refreshLobby = () => {
    refetch();
    setLobbyState("connecting");
    if (!socket.connected) {
      socket.connect();
    } else {
      socket.emit("rooms:list", {}, (result: SocketAck) => {
        if (result && result.ok) {
          setRooms(result.rooms || []);
          setLobbyState("online");
        }
      });
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background pb-24 pl-4 pr-4 pt-20 text-foreground select-none font-sans lg:pl-24 lg:pr-10">
      {/* ── HEADER / HERO SECTION (Ultra-Minimalist Dark) ── */}
      <section className="relative mx-auto max-w-[1500px] border-b border-white/10 pb-12 pt-4">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-[0.2em] text-neutral-400 transition-all hover:text-white hover:translate-x-1"
        >
          <ArrowLeft size={14} /> Trang chủ CineVerse
        </Link>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] lg:items-center">
          {/* Left Column Intro */}
          <div>
            <div className="mb-4 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-xs font-mono font-bold tracking-wider uppercase">
              <Radio size={14} className="text-neutral-400" />
              <span>PHÒNG CHIẾU TRỰC TIẾP 4K</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02] text-white drop-shadow-2xl">
              Cùng Xem Một Phim, <br />
              <span>Dù Đang Ở Xa.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm sm:text-base text-neutral-400 leading-relaxed font-medium">
              Tạo phòng xem phim trực tuyến, chia sẻ liên kết và để CineVerse tự động đồng bộ phát, tạm dừng, tua phim, trò chuyện real-time và thả biểu cảm cùng bạn bè.
            </p>

            {/* Feature Pills */}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold text-neutral-400">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
                <ShieldCheck size={14} className="text-neutral-400" /> Đồng bộ Player 0ms
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
                <Zap size={14} className="text-neutral-400" /> Không cần tài khoản Premium
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
                <Sparkles size={14} className="text-neutral-400" /> Chat & Thả Tim Real-time
              </span>
            </div>
          </div>

          {/* Right Column: Quick Join Box */}
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-neutral-950/90 p-6 sm:p-7 shadow-2xl backdrop-blur-xl group hover:border-white/30 transition-all duration-300">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Link2 size={16} className="text-neutral-400" /> Bạn đã có lời mời?
                </h3>
                <p className="mt-1 text-xs text-neutral-400">
                  Dán đường link do bạn bè hoặc trưởng phòng gửi.
                </p>
              </div>
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-neutral-300 border border-white/15"
              >
                <span
                  className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                />
                {lobbyState === "online"
                  ? "Sẵn sàng"
                  : lobbyState === "connecting"
                    ? "Đang kết nối"
                    : "Sẵn sàng"}
              </span>
            </div>

            <form onSubmit={handleJoinByLink} className="flex flex-col sm:flex-row gap-2.5">
              <label className="relative min-w-0 flex-1">
                <Link2
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  value={inputRoomCode}
                  onChange={(event) => setInputRoomCode(event.target.value)}
                  placeholder="https://cineverse.../watch/...?"
                  className="h-12 w-full rounded-2xl border border-white/15 bg-neutral-900 pl-10 pr-3 text-xs text-white outline-none transition-all placeholder:text-neutral-500 focus:border-white/30"
                />
              </label>
              <button
                type="submit"
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white hover:bg-neutral-200 px-5 text-xs font-extrabold text-black transition-all active:scale-95 shadow-lg shrink-0 cursor-pointer"
              >
                Vào phòng <ArrowRight size={15} />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── LIVE ROOMS SECTION ── */}
      <section className="relative mx-auto mt-12 max-w-[1500px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-neutral-400">
              <CircleDot size={16} className="text-neutral-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-[0.2em]">
                ĐANG PHÁT TRỰC TIẾP
              </span>
            </div>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight text-white">
              Phòng Xem Phim Đang Chiếu
            </h2>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={refreshLobby}
              className="flex h-10 items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] hover:bg-white/10 px-4 text-xs font-bold text-neutral-200 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw size={14} className={lobbyState === "connecting" ? "animate-spin" : ""} /> Làm mới
            </button>
            <button
              onClick={() => openCreateModal()}
              className="flex h-10 items-center gap-2 rounded-2xl bg-white hover:bg-neutral-200 px-5 text-xs font-extrabold text-black transition-all active:scale-95 shadow-lg cursor-pointer"
            >
              <Plus size={16} /> Tạo phòng mới
            </button>
          </div>
        </div>

        {/* Rooms Grid */}
        {lobbyState === "connecting" && rooms.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] text-sm text-neutral-400 gap-3">
            <Loader2 size={24} className="animate-spin text-neutral-400" />
            <p className="text-xs font-medium">Đang đồng bộ danh sách phòng chiếu trực tiếp...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 text-center py-10">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 mb-3">
              <Film size={26} />
            </div>
            <h3 className="text-base font-black text-white">Chưa có phòng nào đang phát sóng công khai</h3>
            <p className="mt-1.5 text-xs text-neutral-400 max-w-sm">
              Bạn có thể mở phòng xem phim đầu tiên và rủ bạn bè cùng tham gia ngay bây giờ!
            </p>
            <button
              onClick={() => openCreateModal()}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-extrabold transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <Plus size={15} /> Tạo Phòng Đầu Tiên
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room, index) => (
              <motion.button
                key={room.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() =>
                  router.push(`/watch/${room.movie.slug}?room=${room.id}`)
                }
                className={`group relative min-h-60 overflow-hidden rounded-3xl border border-white/15 bg-neutral-950 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-white/30 hover:shadow-2xl cursor-pointer ${
                  index === 0 && rooms.length > 2 ? "md:col-span-2" : ""
                }`}
              >
                {room.movie.posterUrl ? (
                  <img
                    src={room.movie.posterUrl}
                    alt={room.movie.name}
                    className="absolute inset-0 h-full w-full object-cover opacity-35 transition-transform duration-700 group-hover:scale-105"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent z-10" />

                <div className="relative z-20 flex h-full min-h-60 flex-col justify-between p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                      <Radio size={11} className="animate-pulse" /> LIVE
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-neutral-300">
                      <Users size={13} /> {room.participantCount} đang xem
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                      👑 Trưởng phòng: {room.hostName}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight line-clamp-1 group-hover:text-white transition-colors">
                      {room.name}
                    </h3>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-neutral-300 font-medium">
                      <span className="truncate pr-4 flex items-center gap-1.5">
                        <Play size={12} className="text-white fill-current shrink-0" />
                        <span className="truncate">{room.movie.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 font-bold text-white group-hover:translate-x-1 transition-transform">
                        Vào phòng <ArrowRight size={14} className="text-neutral-400" />
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </section>

      {/* ── FEATURED MOVIES TO START A WATCH PARTY ── */}
      <section className="relative mx-auto mt-16 max-w-[1500px] border-t border-white/10 pt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-neutral-400 mb-1">
              <Flame size={16} />
              <span className="text-xs font-mono font-bold uppercase tracking-[0.2em]">
                GỢI Ý PHIM HOT
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Chọn Phim & Mở Phòng Chiếu
            </h2>
          </div>
          <span className="hidden items-center gap-2 text-xs font-medium text-neutral-400 sm:flex bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-full">
            <Clock3 size={14} className="text-neutral-400" /> Tự động mở phòng 4K tức thì
          </span>
        </div>

        {trendingLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <FilmCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {movies.slice(0, 12).map((movie) => (
              <button
                key={movie.slug}
                onClick={() => openCreateModal(movie)}
                className="text-left group transition-transform duration-300 hover:-translate-y-1.5 cursor-pointer"
              >
                <FilmCard film={movie} />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── CREATE ROOM MODAL ── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-neutral-950 p-6 shadow-2xl shadow-black/80"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-1.5">
                    <Radio size={14} /> TẠO PHÒNG CHIẾU MỚI
                  </span>
                  <h3 className="mt-1 text-2xl font-black text-white">
                    Chọn phim & Đặt tên phòng
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full border border-white/10 p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search input */}
              <label className="relative mt-5 block">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm kiếm phim để xem cùng..."
                  className="h-11 w-full rounded-2xl border border-white/15 bg-neutral-900 pl-10 pr-4 text-sm text-white outline-none focus:border-white/30 transition-all placeholder:text-neutral-500"
                />
              </label>

              {/* Movie selector grid */}
              <div className="mt-3 grid max-h-64 grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3 scrollbar-thin scrollbar-thumb-white/20">
                {filteredMovies.map((movie) => {
                  const selected = selectedMovie?.slug === movie.slug;
                  const image =
                    resolveImageUrl(movie.thumb_url) ||
                    resolveImageUrl(movie.poster_url);
                  return (
                    <button
                      key={movie.slug}
                      onClick={() => setSelectedMovie(movie)}
                      className={`relative aspect-video overflow-hidden rounded-2xl border text-left transition-all cursor-pointer ${
                        selected
                          ? "border-white ring-2 ring-white/50 shadow-lg shadow-white/10"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={movie.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      <span className="absolute inset-x-2 bottom-2 truncate text-[11px] font-bold text-white">
                        {movie.name}
                      </span>
                      {selected ? (
                        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-black font-black">
                          <Check size={14} strokeWidth={3} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Custom Room Name */}
              <label className="mt-5 block text-xs font-bold text-neutral-300">
                Tên phòng chiếu (Không bắt buộc)
                <input
                  value={customRoomName}
                  maxLength={90}
                  onChange={(event) => setCustomRoomName(event.target.value)}
                  placeholder={
                    selectedMovie
                      ? `Xem chung: ${selectedMovie.name}`
                      : "Ví dụ: Tối nay xem phim cùng nhóm bạn"
                  }
                  className="mt-2 h-11 w-full rounded-2xl border border-white/15 bg-neutral-900 px-4 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-white/30 transition-all"
                />
              </label>

              {/* Modal footer */}
              <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="h-11 rounded-2xl border border-white/15 px-5 text-xs font-bold text-neutral-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={!selectedMovie}
                  className="flex h-11 items-center gap-2 rounded-2xl bg-white hover:bg-neutral-200 px-6 text-xs font-extrabold text-black transition-all shadow-lg disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer active:scale-95"
                >
                  <Plus size={15} /> Mở Phòng Chiếu Trực Tiếp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
