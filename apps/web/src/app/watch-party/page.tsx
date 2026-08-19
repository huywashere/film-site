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
import { deduplicateSectionRow } from "@/lib/recommendation-engine";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type LobbyState = "connecting" | "online" | "offline";

export default function WatchPartyListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const socket = useMemo(() => createWatchPartySocket(), []);
  const [rooms, setRooms] = useState<WatchPartyLobbyRoom[]>([]);
  const [lobbyState, setLobbyState] = useState<LobbyState>("connecting");
  const [inputRoomCode, setInputRoomCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<FilmItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customRoomName, setCustomRoomName] = useState("");

  // Debounce search input for snappy UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Default trending/latest movies for watch party
  const {
    data: trendingData,
    isLoading: trendingLoading,
    refetch,
  } = useQuery({
    queryKey: ["watch-party-trending-pool"],
    queryFn: () => movieApi.getLatest(1).then((res) => res?.data || res),
    staleTime: 1000 * 60 * 5,
  });

  // Live search query when user types
  const { data: searchResultsData, isLoading: isSearching } = useQuery({
    queryKey: ["watch-party-search", debouncedQuery],
    queryFn: () =>
      movieApi
        .search(debouncedQuery, 1, 24)
        .then((res: any) => res?.data?.items || res?.items || res?.data || []),
    enabled: Boolean(debouncedQuery),
    staleTime: 1000 * 60 * 2,
  });

  const defaultMovies: FilmItem[] = useMemo(() => {
    const list = trendingData?.items || trendingData?.data?.items || trendingData || [];
    return deduplicateSectionRow(Array.isArray(list) ? list : []);
  }, [trendingData]);

  const searchMovies: FilmItem[] = useMemo(() => {
    if (!debouncedQuery) return [];
    const list = Array.isArray(searchResultsData)
      ? searchResultsData
      : searchResultsData?.items ||
        searchResultsData?.data?.items ||
        searchResultsData?.data ||
        [];
    return deduplicateSectionRow(Array.isArray(list) ? list : []);
  }, [debouncedQuery, searchResultsData]);

  const displayMovies = debouncedQuery ? searchMovies : defaultMovies;
  const isListLoading = debouncedQuery ? isSearching : trendingLoading;

  // Socket lobby room updates
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
    if (!invite) return toast("Hãy dán liên kết hoặc mã phòng.", "error");

    try {
      if (invite.startsWith("http://") || invite.startsWith("https://")) {
        const url = new URL(invite);
        const roomId = url.searchParams.get("room");
        if (!roomId || !url.pathname.startsWith("/watch/")) throw new Error();
        router.push(`${url.pathname}${url.search}`);
        return;
      }

      // If room ID directly
      const activeRoom = rooms.find(
        (r) => r.id.toLowerCase() === invite.toLowerCase(),
      );
      if (activeRoom) {
        router.push(`/watch/${activeRoom.movie.slug}?room=${activeRoom.id}`);
      } else {
        toast("Không tìm thấy phòng tương ứng với mã này.", "error");
      }
    } catch {
      toast("Liên kết phòng không hợp lệ.", "error");
    }
  };

  const openCreateModal = (movie?: FilmItem) => {
    setSelectedMovie(movie || defaultMovies[0] || null);
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
    <main
      className={cn(
        cardFont.className,
        "bg-background min-h-screen text-foreground pb-20 pt-20 sm:pt-24",
      )}
    >
      {/* Aligned Grid Container matching standard site layout */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Breadcrumb & Status */}
        <nav className="flex items-center justify-between gap-3 text-xs text-neutral-400">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/90 hover:text-white text-xs font-semibold transition-all shadow-sm"
          >
            <ArrowLeft size={13} />
            <span>Trang chủ</span>
          </Link>

          {/* Server Status indicator */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md shadow-sm",
              lobbyState === "online"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : lobbyState === "connecting"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300 animate-pulse"
                  : "border-neutral-700 bg-neutral-800 text-neutral-400",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                lobbyState === "online"
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : lobbyState === "connecting"
                    ? "bg-amber-300"
                    : "bg-neutral-500",
              )}
            />
            {lobbyState === "online"
              ? "Máy chủ sẵn sàng"
              : lobbyState === "connecting"
                ? "Đang kết nối..."
                : "Mất kết nối"}
          </span>
        </nav>

        {/* ── Hero Section ── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#141822] via-[#0d1017] to-[#0a0c10] p-6 sm:p-8 md:p-10 shadow-2xl">
          {/* Ambient Glow */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-pink-600/20 blur-[100px]" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-600/15 blur-[100px]" />

          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-3.5 py-1 text-xs font-bold text-pink-300 shadow-sm">
              <Radio size={13} className="text-pink-400 animate-pulse" />
              <span>Rạp Chiếu Phim Trực Tuyến</span>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              Phòng Xem Chung
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-2xl">
              Cùng bạn bè thưởng thức những bộ phim điện ảnh bom tấn và series yêu thích với tính năng đồng bộ phát video và trò chuyện trực tiếp theo thời gian thực.
            </p>
          </div>

          {/* ── Control Actions Row: 2 Balanced Cards ── */}
          <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-2">
            {/* Card 1: Search & Create Room */}
            <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-md p-4 sm:p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-pink-400 uppercase tracking-wider">
                  <Sparkles size={14} />
                  <span>Mở phòng chiếu mới</span>
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  Tìm kiếm phim theo tên hoặc chọn từ danh sách bên dưới để bắt đầu.
                </p>
              </div>

              <div className="relative w-full">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm phim để mở phòng ngay..."
                  aria-label="Tìm kiếm phim để mở phòng ngay"
                  className="h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.04] pl-10 pr-10 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-pink-500 focus:bg-black/60 focus:ring-1 focus:ring-pink-500/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Xóa từ khóa tìm kiếm"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: Join Room via Link / Code */}
            <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-md p-4 sm:p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Link2 size={14} />
                  <span>Tham gia phòng có sẵn</span>
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  Dán đường dẫn mời hoặc mã phòng được bạn bè chia sẻ để tham gia.
                </p>
              </div>

              <form onSubmit={handleJoinByLink} className="flex gap-2">
                <input
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value)}
                  placeholder="Dán liên kết hoặc mã phòng..."
                  aria-label="Dán liên kết hoặc mã phòng"
                  className="h-11 flex-1 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-cyan-400 focus:bg-black/60 focus:ring-1 focus:ring-cyan-400/30"
                />
                <button
                  type="submit"
                  aria-label="Vào phòng xem chung"
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-neutral-200 px-4 sm:px-5 text-xs sm:text-sm font-extrabold text-black transition-all active:scale-95 cursor-pointer shadow-md shrink-0"
                >
                  <span>Vào phòng</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Section: Active Live Public Rooms ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleDot size={16} className="text-pink-400 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-black text-white">
                Phòng Đang Chiếu Trực Tiếp
              </h2>
              {rooms.length > 0 && (
                <span className="rounded-full bg-pink-500/20 px-2.5 py-0.5 text-xs font-bold text-pink-300">
                  {rooms.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshLobby}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-semibold text-neutral-300 transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw
                  size={12}
                  className={lobbyState === "connecting" ? "animate-spin" : ""}
                />
                <span>Làm mới</span>
              </button>
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-extrabold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Tạo phòng</span>
              </button>
            </div>
          </div>

          {lobbyState === "connecting" && rooms.length === 0 ? (
            <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[#0e1017]/60 text-neutral-400 p-6">
              <Loader2 size={20} className="animate-spin text-pink-400" />
              <p className="text-xs font-medium">Đang tải danh sách phòng...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0e1017]/60 p-6 sm:p-8 text-center space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-neutral-300">
                Hiện tại chưa có phòng công khai nào.
              </p>
              <p className="text-xs text-neutral-500">
                Hãy chọn một bộ phim bên dưới để tạo phòng chiếu đầu tiên và mời bạn bè cùng xem!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() =>
                    router.push(`/watch/${room.movie.slug}?room=${room.id}`)
                  }
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e1017] p-4 text-left transition-all hover:border-pink-500/50 hover:bg-white/[0.02] cursor-pointer shadow-lg"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold text-pink-300">
                      <Radio size={10} /> Live
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400">
                      <Users size={12} /> {room.participantCount} người xem
                    </span>
                  </div>

                  <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                    {room.name || `Xem cùng ${room.hostName}`}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs text-neutral-400 flex items-center gap-1">
                    <Film size={11} className="text-pink-400 shrink-0" />
                    <span>{room.movie.name}</span>
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Section: Movie Selector / Live Search Results ── */}
        <section className="space-y-4 pt-4 border-t border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-amber-400" />
              <h2 className="text-lg sm:text-xl font-black text-white">
                {debouncedQuery
                  ? `Kết quả tìm kiếm cho "${debouncedQuery}"`
                  : "Chọn Phim Để Bắt Đầu Phòng Xem"}
              </h2>
            </div>
            {debouncedQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Xóa tìm kiếm
              </button>
            )}
          </div>

          {isListLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : displayMovies.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0e1017]/60 p-10 text-center space-y-2">
              <Film size={28} className="text-neutral-500 mx-auto" />
              <p className="text-sm font-bold text-white">Không tìm thấy bộ phim phù hợp</p>
              <p className="text-xs text-neutral-400">
                Hãy thử tìm kiếm với tên phim không dấu hoặc tên gốc tiếng Anh.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {displayMovies.slice(0, 24).map((movie) => (
                <div
                  key={movie.slug}
                  className="group relative overflow-hidden rounded-2xl transition-transform duration-300 hover:scale-[1.02]"
                >
                  <FilmCard film={movie} />
                  {/* Click overlay interceptor to trigger watch party modal */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openCreateModal(movie);
                    }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-end p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-600 hover:bg-pink-500 px-4 py-1.5 text-xs font-black text-white shadow-xl transition-transform active:scale-95">
                      <Play size={12} className="fill-white" />
                      <span>Mở phòng chiếu</span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── CREATE ROOM MODAL ── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/[0.12] bg-[#0e1017] p-5 sm:p-6 shadow-2xl shadow-black/90"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-pink-400">
                    <Radio size={14} /> Tạo phòng mới
                  </span>
                  <h3 className="mt-1 text-lg sm:text-xl font-extrabold text-white">
                    Xác Nhận Mở Phòng Xem Chung
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full border border-white/10 p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                  aria-label="Đóng"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Selected Movie Info */}
              {selectedMovie && (
                <div className="mt-4 flex items-center gap-3.5 p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      resolveImageUrl(selectedMovie.thumb_url) ||
                      resolveImageUrl(selectedMovie.poster_url) ||
                      ""
                    }
                    alt={selectedMovie.name}
                    className="h-16 w-12 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
                      Phim đã chọn
                    </span>
                    <h4 className="font-extrabold text-sm text-white truncate">
                      {selectedMovie.name}
                    </h4>
                    <p className="text-xs text-neutral-400 truncate">
                      {selectedMovie.origin_name || `${selectedMovie.year || 2026}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Custom Room Name */}
              <div className="mt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Tên phòng chiếu (Tùy chọn)
                </label>
                <input
                  value={customRoomName}
                  maxLength={80}
                  onChange={(e) => setCustomRoomName(e.target.value)}
                  placeholder={
                    selectedMovie
                      ? `Phòng xem: ${selectedMovie.name}`
                      : "Ví dụ: Xem phim cuối tuần..."
                  }
                  className="h-11 w-full rounded-xl border border-white/[0.12] bg-black/60 px-4 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 transition-all"
                />
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-white/[0.08] pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={!selectedMovie}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white hover:bg-neutral-200 px-6 py-2.5 text-xs font-extrabold text-black transition-all active:scale-95 cursor-pointer shadow-md disabled:opacity-40"
                >
                  <Play size={13} className="fill-black" />
                  <span>Bắt đầu phòng chiếu</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
