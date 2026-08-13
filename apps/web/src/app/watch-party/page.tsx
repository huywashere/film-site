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
import { cardFont } from "@/lib/fonts";

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
    <main
      className={`${cardFont.className} relative min-h-[100dvh] overflow-x-hidden bg-[#121212] pb-16 pl-4 pr-4 pt-16 text-white select-none lg:pl-24 lg:pr-8`}
    >
      {/* Hero */}
      <section className="relative mx-auto max-w-[1320px] pb-7 pt-4 sm:pt-5">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-white"
        >
          <ArrowLeft size={14} /> Quay lại trang chủ
        </Link>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#171717]">
          <div className="grid lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
            <div className="relative px-5 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-violet-300">
                <Radio size={14} />
                <span>Xem phim cùng bạn bè</span>
              </div>

              <h1 className="max-w-[620px] text-3xl font-extrabold leading-[1.12] tracking-[-0.03em] text-white sm:text-4xl lg:text-[42px]">
                Cùng xem một bộ phim, dù đang ở xa
              </h1>

              <p className="mt-3 max-w-[560px] text-xs font-medium leading-6 text-neutral-400 sm:text-sm">
                Tạo phòng riêng, chia sẻ liên kết và đồng bộ phát phim theo thời
                gian thực với những người bạn của bạn.
              </p>
            </div>

            <div className="flex items-center border-t border-white/[0.08] bg-[#141414] p-5 sm:p-6 lg:border-l lg:border-t-0 lg:p-7">
              <div className="w-full">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                      <Link2 size={16} />
                    </div>
                    <h2 className="text-base font-bold tracking-tight text-white">
                      Tham gia bằng liên kết
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      Dán liên kết phòng được bạn bè chia sẻ.
                    </p>
                  </div>
                  <span
                    className={`mt-1 inline-flex items-center gap-2 text-xs font-semibold ${
                      lobbyState === "online"
                        ? "text-emerald-400"
                        : lobbyState === "connecting"
                          ? "text-amber-300"
                          : "text-neutral-500"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        lobbyState === "online"
                          ? "bg-emerald-400"
                          : lobbyState === "connecting"
                            ? "animate-pulse bg-amber-300"
                            : "bg-neutral-600"
                      }`}
                    />
                    {lobbyState === "online"
                      ? "Sẵn sàng"
                      : lobbyState === "connecting"
                        ? "Đang kết nối"
                        : "Mất kết nối"}
                  </span>
                </div>

                <form onSubmit={handleJoinByLink} className="space-y-3">
                  <label className="relative block">
                    <Link2
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                    />
                    <input
                      value={inputRoomCode}
                      onChange={(event) => setInputRoomCode(event.target.value)}
                      placeholder="Dán liên kết phòng xem chung"
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-xs text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-violet-400/60"
                    />
                  </label>
                  <button
                    type="submit"
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-bold text-black transition-colors hover:bg-neutral-200 active:scale-[0.98]"
                  >
                    Vào phòng <ArrowRight size={15} />
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="grid border-t border-white/[0.08] sm:grid-cols-3">
            {[
              [
                ShieldCheck,
                "Đồng bộ thời gian thực",
                "Phát, dừng và tua cùng nhau",
              ],
              [Zap, "Thiết lập nhanh", "Chọn phim và gửi liên kết"],
              [Sparkles, "Tương tác trong phòng", "Trò chuyện và gửi biểu cảm"],
            ].map(([Icon, title, description], index) => (
              <div
                key={String(title)}
                className={`flex items-start gap-2.5 px-5 py-4 sm:px-6 ${index ? "border-t border-white/[0.08] sm:border-l sm:border-t-0" : ""}`}
              >
                <Icon size={15} className="mt-0.5 shrink-0 text-violet-300" />
                <div>
                  <p className="text-xs font-semibold text-neutral-200">
                    {String(title)}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-5 text-neutral-500">
                    {String(description)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live rooms */}
      <section className="relative mx-auto mt-3 max-w-[1320px] border-t border-white/[0.08] pt-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-violet-300">
              <CircleDot size={15} />
              <span className="text-xs font-semibold">
                Phòng đang hoạt động
              </span>
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Tham gia phòng xem chung
            </h2>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={refreshLobby}
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-neutral-300 transition-colors hover:bg-white/[0.08] active:scale-[0.98]"
            >
              <RefreshCw
                size={14}
                className={lobbyState === "connecting" ? "animate-spin" : ""}
              />{" "}
              Làm mới
            </button>
            <button
              onClick={() => openCreateModal()}
              className="flex h-10 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-black transition-colors hover:bg-neutral-200 active:scale-[0.98]"
            >
              <Plus size={16} /> Tạo phòng mới
            </button>
          </div>
        </div>

        {/* Rooms Grid */}
        {lobbyState === "connecting" && rooms.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[#171717] text-neutral-400">
            <Loader2 size={22} className="animate-spin text-violet-300" />
            <p className="text-xs font-medium">
              Đang cập nhật danh sách phòng...
            </p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="grid min-h-48 place-items-center rounded-2xl border border-white/[0.08] bg-[#171717] px-5 py-8 text-center">
            <div>
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                <Film size={19} />
              </div>
              <h3 className="text-sm font-bold text-white">
                Chưa có phòng công khai
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-neutral-500">
                Chọn một bộ phim bên dưới để mở phòng và mời bạn bè tham gia.
              </p>
              <button
                onClick={() => openCreateModal()}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-black transition-colors hover:bg-neutral-200 active:scale-[0.98]"
              >
                <Plus size={15} /> Tạo phòng đầu tiên
              </button>
            </div>
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
                className={`group relative min-h-52 overflow-hidden rounded-2xl border border-white/10 bg-[#171717] text-left transition-all duration-300 hover:-translate-y-1 hover:border-violet-300/40 cursor-pointer ${
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

                <div className="relative z-20 flex h-full min-h-52 flex-col justify-between p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 rounded-lg bg-violet-500/20 px-2.5 py-1 text-[10px] font-bold text-violet-200 backdrop-blur-md">
                      <Radio size={11} /> Đang chiếu
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-neutral-300 backdrop-blur-md">
                      <Users size={13} /> {room.participantCount} đang xem
                    </span>
                  </div>

                  <div>
                    <span className="mb-1 block text-xs font-medium text-neutral-400">
                      Trưởng phòng: {room.hostName}
                    </span>
                    <h3 className="line-clamp-1 text-lg font-bold leading-tight text-white sm:text-xl">
                      {room.name}
                    </h3>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-neutral-300 font-medium">
                      <span className="truncate pr-4 flex items-center gap-1.5">
                        <Play
                          size={12}
                          className="text-white fill-current shrink-0"
                        />
                        <span className="truncate">{room.movie.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 font-bold text-white group-hover:translate-x-1 transition-transform">
                        Vào phòng{" "}
                        <ArrowRight size={14} className="text-neutral-400" />
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </section>

      {/* Movie picker */}
      <section className="relative mx-auto mt-10 max-w-[1320px] border-t border-white/[0.08] pt-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-violet-300">
              <Flame size={15} />
              <span className="text-xs font-semibold">Gợi ý dành cho bạn</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Chọn phim và mở phòng
            </h2>
          </div>
          <span className="hidden items-center gap-2 text-xs font-medium text-neutral-500 sm:flex">
            <Clock3 size={15} /> Mở phòng ngay sau khi chọn phim
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
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#171717] p-4 shadow-2xl shadow-black/80 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-300">
                    <Radio size={14} /> Tạo phòng mới
                  </span>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-white">
                    Chọn phim và đặt tên phòng
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-white/10 p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
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
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-violet-400/60"
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
                      className={`relative aspect-video overflow-hidden rounded-xl border text-left transition-all cursor-pointer ${
                        selected
                          ? "border-violet-300 ring-2 ring-violet-400/25"
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
                        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-lg bg-violet-300 text-black font-black">
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
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-violet-400/60"
                />
              </label>

              {/* Modal footer */}
              <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="h-11 rounded-xl border border-white/10 px-5 text-sm font-semibold text-neutral-300 transition-colors hover:bg-white/10 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={!selectedMovie}
                  className="flex h-11 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer active:scale-[0.98]"
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
