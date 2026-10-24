"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
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
  Play,
} from "lucide-react";
import { movieApi } from "@/lib/api";
import { type FilmItem, resolveImageUrl } from "@/components/film/FilmCard";
import { useToast } from "@/providers/ToastProvider";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import {
  createWatchPartySocket,
  type SocketAck,
  type WatchPartyLobbyRoom,
} from "@/lib/watch-party-socket";
import { deduplicateSectionRow } from "@/lib/recommendation-engine";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useReliableNavigation } from "@/hooks/useReliableNavigation";
import type { Socket } from "socket.io-client";

type LobbyState = "connecting" | "online" | "offline";

export default function WatchPartyListPage() {
  const router = useReliableNavigation();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rooms, setRooms] = useState<WatchPartyLobbyRoom[]>([]);
  const [lobbyState, setLobbyState] = useState<LobbyState>("connecting");
  const [inputRoomCode, setInputRoomCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<FilmItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customRoomName, setCustomRoomName] = useState("");
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Default trending movies for fallback
  const { data: trendingData } = useQuery({
    queryKey: ["watch-party-trending-pool"],
    queryFn: () => movieApi.getLatest(1).then((res) => res?.data || res),
    staleTime: 1000 * 60 * 5,
  });

  // Live search query when user types in top bar
  const { data: searchResultsData, isLoading: isSearching } = useQuery({
    queryKey: ["watch-party-search", debouncedQuery],
    queryFn: () =>
      movieApi
        .search(debouncedQuery, 1, 8)
        .then((res: any) => res?.data?.items || res?.items || res?.data || []),
    enabled: Boolean(debouncedQuery),
    staleTime: 1000 * 60 * 2,
  });

  const defaultMovies: FilmItem[] = useMemo(() => {
    const list =
      trendingData?.items || trendingData?.data?.items || trendingData || [];
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
    return deduplicateSectionRow(Array.isArray(list) ? list : []).slice(0, 6);
  }, [debouncedQuery, searchResultsData]);

  // Socket lobby room updates
  useEffect(() => {
    let active = true;
    let activeSocket: Socket | null = null;

    const requestRooms = () => {
      if (!active) return;
      setLobbyState("online");
      activeSocket?.emit("rooms:list", {}, (result: SocketAck) => {
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

    void createWatchPartySocket().then((nextSocket) => {
      if (!active) {
        nextSocket.disconnect();
        return;
      }
      activeSocket = nextSocket;
      setSocket(nextSocket);
      nextSocket.on("connect", requestRooms);
      nextSocket.on("rooms:changed", handleRooms);
      nextSocket.on("disconnect", handleOffline);
      nextSocket.on("connect_error", handleOffline);
      nextSocket.on("reconnecting", handleConnecting);
      nextSocket.connect();
    });

    return () => {
      active = false;
      activeSocket?.removeAllListeners();
      activeSocket?.disconnect();
    };
  }, []);

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

  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthModalStore((s) => s.openModal);

  const openCreateModal = (movie?: FilmItem) => {
    if (!user) {
      toast("Vui lòng đăng nhập để tạo phòng xem chung.", "warning");
      openAuthModal("login");
      return;
    }
    setSelectedMovie(movie || defaultMovies[0] || null);
    setShowCreateModal(true);
    setSearchQuery("");
  };

  const handleCreateRoom = () => {
    if (!user) {
      toast("Vui lòng đăng nhập để tạo phòng xem chung.", "warning");
      openAuthModal("login");
      return;
    }
    if (!selectedMovie) return toast("Hãy chọn một bộ phim.", "error");
    const params = new URLSearchParams({ party: "create" });
    if (customRoomName.trim()) params.set("roomName", customRoomName.trim());
    setShowCreateModal(false);
    router.push(`/watch/${selectedMovie.slug}?${params.toString()}`);
  };

  const refreshLobby = () => {
    setLobbyState("connecting");
    if (!socket) {
      toast("Đang kết nối máy chủ xem chung.", "info");
      return;
    }
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Breadcrumb */}
        <nav className="flex items-center justify-between gap-3 text-xs text-neutral-400">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 hover:text-white text-xs font-semibold transition-all"
          >
            <ArrowLeft size={13} />
            <span>Trang chủ</span>
          </Link>
        </nav>

        {/* ── Visual Cinema Banner Hero Card ── */}
        <div className="isolate relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)] bg-[#0b0c10] p-6 sm:p-10 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 min-h-[260px] sm:min-h-[300px] md:min-h-[320px] group">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <Image
              src="/img-backtop/tab-watch-party.webp"
              alt="Phòng Xem Chung FlexPhim"
              fill
              priority
              unoptimized
              placeholder="blur"
              blurDataURL="data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAADQBACdASogABIAPzmIvFavKKYjsBgIAeAnCWMAAI9AyVWwdcX8rz8+XoNxsUWygAD+7UTcT3Esw3GL02YjG+iu8ovjZJlMKjawD0pWUxjKJrC+60jdUY5jV+9RYiB0jXxrjV5fqMalEcKh6cxkZTemAAA="
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 1200px, 1280px"
              quality={90}
              className="object-cover object-[center_28%] sm:object-[center_24%] scale-100 group-hover:scale-105 transition-transform duration-1000 ease-out brightness-[0.98] contrast-[1.05] saturate-[1.1] pointer-events-none"
            />
            {/* Directional gradient: deep contrast on left for crisp readability, open on right for cinematic poster collage */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#07080b]/95 via-[#07080b]/75 via-45% to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07080b]/90 via-transparent to-black/40" />
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-violet-600/10 to-transparent pointer-events-none" />
          </div>

          <div className="space-y-2.5 max-w-xl relative z-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
              Phòng Xem Chung
            </h1>
            <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              Thưởng thức phim điện ảnh và series cùng bạn bè với tính năng đồng
              bộ phát video tức thì, tua phim siêu tốc và trò chuyện trực tiếp
              không độ trễ.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative z-10 shrink-0">
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-neutral-100 text-black font-extrabold text-xs sm:text-sm shadow-[0_10px_25px_rgba(255,255,255,0.2)] transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
            >
              <Plus size={16} className="stroke-[2.5]" />
              <span>Tạo phòng ngay</span>
            </button>
          </div>
        </div>

        {/* ── Minimalist 2-in-1 Action Inputs ── */}
        <div className="space-y-6 pb-6 border-b border-white/[0.08]">
          <div className="grid gap-3 md:grid-cols-2">
            {/* Search to create with live autocomplete dropdown */}
            <div className="relative" ref={searchDropdownRef}>
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm phim để mở phòng chiếu ngay..."
                aria-label="Tìm kiếm phim để mở phòng ngay"
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-10 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-white/25 focus:bg-white/[0.05]"
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

              {/* Autocomplete Dropdown */}
              {debouncedQuery && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-white/10 bg-[#141720]/95 backdrop-blur-xl shadow-2xl p-2 space-y-1">
                  {isSearching ? (
                    <div className="flex items-center justify-center p-4 text-xs text-neutral-400 gap-2">
                      <Loader2
                        size={14}
                        className="animate-spin text-neutral-400"
                      />
                      <span>Đang tìm kiếm phim...</span>
                    </div>
                  ) : searchMovies.length === 0 ? (
                    <div className="p-4 text-center text-xs text-neutral-500">
                      Không tìm thấy phim phù hợp.
                    </div>
                  ) : (
                    searchMovies.map((movie) => (
                      <button
                        key={movie.slug}
                        type="button"
                        onClick={() => openCreateModal(movie)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-left cursor-pointer group"
                      >
                        <img
                          src={
                            resolveImageUrl(movie.thumb_url) ||
                            resolveImageUrl(movie.poster_url) ||
                            ""
                          }
                          alt=""
                          className="w-8 h-11 rounded-md object-cover bg-neutral-900 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-neutral-200 truncate">
                            {movie.name}
                          </p>
                          <p className="text-[10px] text-neutral-400 truncate">
                            {movie.origin_name || movie.year || "Phim"}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/10 shrink-0 transition-colors">
                          Tạo phòng
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Join via link / code */}
            <form onSubmit={handleJoinByLink} className="flex gap-2">
              <div className="relative flex-1">
                <Link2
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value)}
                  placeholder="Dán liên kết hoặc mã phòng..."
                  aria-label="Dán liên kết hoặc mã phòng"
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-white/25 focus:bg-white/[0.05]"
                />
              </div>
              <button
                type="submit"
                aria-label="Vào phòng xem chung"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-white/10 px-5 text-xs sm:text-sm font-bold text-white transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <span>Vào phòng</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* ── Section: Active Live Public Rooms ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleDot size={15} className="text-neutral-400 animate-pulse" />
              <h2 className="text-base sm:text-lg font-bold text-white">
                Phòng Đang Chiếu Trực Tiếp
              </h2>
              {rooms.length > 0 && (
                <span className="rounded-full bg-neutral-800 text-neutral-300 border border-white/10 px-2 py-0.2 text-[10px] font-bold">
                  {rooms.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshLobby}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-neutral-400 hover:text-white transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw
                  size={11}
                  className={lobbyState === "connecting" ? "animate-spin" : ""}
                />
                <span>Làm mới</span>
              </button>
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>Tạo phòng</span>
              </button>
            </div>
          </div>

          {lobbyState === "connecting" && rooms.length === 0 ? (
            <div className="flex min-h-24 flex-col items-center justify-center gap-2 text-neutral-400 p-6">
              <Loader2 size={18} className="animate-spin text-purple-400" />
              <p className="text-xs font-medium">Đang tải danh sách phòng...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500 space-y-1">
              <p className="font-semibold text-neutral-400">
                Hiện tại chưa có phòng công khai nào.
              </p>
              <p className="text-[11px] text-neutral-600">
                Tìm kiếm phim ở trên hoặc bấm "Tạo phòng" để bắt đầu xem cùng
                bạn bè!
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() =>
                    router.push(`/watch/${room.movie.slug}?room=${room.id}`)
                  }
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition-all hover:border-purple-500/40 hover:bg-white/[0.04] cursor-pointer shadow-lg"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/20 text-purple-300 px-2 py-0.5 text-[10px] font-bold">
                      <Radio size={10} /> Live
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400">
                      <Users size={12} /> {room.participantCount} người xem
                    </span>
                  </div>

                  <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    {room.name || `Xem cùng ${room.hostName}`}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs text-neutral-400 flex items-center gap-1">
                    <Film size={11} className="text-neutral-500 shrink-0" />
                    <span>{room.movie.name}</span>
                  </p>
                </button>
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
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/[0.08] bg-[#12141a] p-5 sm:p-6 shadow-2xl shadow-black/90"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
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
                <div className="mt-4 flex items-center gap-3.5 p-3 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      Phim đã chọn
                    </span>
                    <h4 className="font-extrabold text-sm text-white truncate">
                      {selectedMovie.name}
                    </h4>
                    <p className="text-xs text-neutral-400 truncate">
                      {selectedMovie.origin_name ||
                        `${selectedMovie.year || 2026}`}
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
                  className="h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all"
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
                  className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 hover:bg-purple-500 px-6 py-2.5 text-xs font-extrabold text-white transition-all active:scale-95 cursor-pointer shadow-lg shadow-purple-600/30 disabled:opacity-40"
                >
                  <Play size={13} className="fill-white" />
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
