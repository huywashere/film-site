"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
    const requestRooms = () => {
      setLobbyState("online");
      socket.emit("rooms:list", {}, (result: SocketAck) => {
        if (result.ok) setRooms(result.rooms || []);
      });
    };
    const handleRooms = (nextRooms: WatchPartyLobbyRoom[]) =>
      setRooms(nextRooms);
    const handleOffline = () => setLobbyState("offline");

    socket.on("connect", requestRooms);
    socket.on("rooms:changed", handleRooms);
    socket.on("disconnect", handleOffline);
    socket.on("connect_error", handleOffline);
    socket.connect();
    return () => {
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
    if (socket.connected) {
      socket.emit("rooms:list", {}, (result: SocketAck) => {
        if (result.ok) setRooms(result.rooms || []);
      });
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07090c] pb-24 pl-4 pr-4 pt-24 text-white lg:pl-24 lg:pr-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(circle_at_72%_0%,rgba(16,185,129,0.13),transparent_42%)]" />

      <section className="relative mx-auto max-w-[1500px] border-b border-white/10 pb-10">
        <Link
          href="/"
          className="mb-7 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-400 transition-colors hover:text-emerald-300"
        >
          <ArrowLeft size={14} /> Trang chủ
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:items-end">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-black">
                <Radio size={19} />
              </span>
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-neutral-400">
                Phòng chiếu trực tiếp
              </span>
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Cùng xem một phim,
              <span className="block text-neutral-500">dù đang ở xa.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
              Tạo phòng, gửi liên kết và để Cineverse đồng bộ phát, tạm dừng,
              tua phim, trò chuyện và biểu cảm cho mọi người trong phòng.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101419] p-5 shadow-2xl shadow-black/40">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold">Bạn đã có lời mời?</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Dán liên kết do trưởng phòng gửi.
                </p>
              </div>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  lobbyState === "online"
                    ? "bg-emerald-400"
                    : lobbyState === "connecting"
                      ? "animate-pulse bg-amber-400"
                      : "bg-red-400"
                }`}
                title={lobbyState === "online" ? "Đã kết nối" : "Mất kết nối"}
              />
            </div>
            <form onSubmit={handleJoinByLink} className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <Link2
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  value={inputRoomCode}
                  onChange={(event) => setInputRoomCode(event.target.value)}
                  placeholder="https://cineverse.../watch/..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-neutral-600 focus:border-emerald-400/60"
                />
              </label>
              <button className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-black transition-transform active:scale-95">
                Vào phòng <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-10 max-w-[1500px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CircleDot size={16} />
              <span className="text-xs font-extrabold uppercase tracking-[0.16em]">
                Đang hoạt động
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Phòng đang chiếu
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refreshLobby}
              className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/10"
            >
              <RefreshCw size={14} /> Làm mới
            </button>
            <button
              onClick={() => openCreateModal()}
              className="flex h-10 items-center gap-2 rounded-full bg-emerald-400 px-5 text-xs font-black text-black transition-colors hover:bg-emerald-300"
            >
              <Plus size={15} /> Tạo phòng
            </button>
          </div>
        </div>

        {lobbyState === "connecting" ? (
          <div className="flex min-h-44 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] text-sm text-neutral-400">
            <Loader2 size={18} className="mr-2 animate-spin" /> Đang kết nối
            sảnh phòng chiếu
          </div>
        ) : lobbyState === "offline" ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.04] px-6 py-10 text-center">
            <p className="font-bold">Chưa kết nối được máy chủ xem chung.</p>
            <p className="mt-2 text-sm text-neutral-500">
              Cineverse sẽ tự kết nối lại. Bạn cũng có thể bấm Làm mới.
            </p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 text-center">
            <div>
              <Film size={28} className="mx-auto text-neutral-600" />
              <p className="mt-4 font-bold">Chưa có phòng nào đang chiếu.</p>
              <p className="mt-2 text-sm text-neutral-500">
                Chọn một bộ phim bên dưới để mở phòng đầu tiên.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room, index) => (
              <button
                key={room.id}
                onClick={() =>
                  router.push(`/watch/${room.movie.slug}?room=${room.id}`)
                }
                className={`group relative min-h-56 overflow-hidden rounded-2xl border border-white/10 bg-[#101419] text-left transition-all hover:-translate-y-0.5 hover:border-emerald-400/40 ${
                  index === 0 && rooms.length > 2 ? "md:col-span-2" : ""
                }`}
              >
                {room.movie.posterUrl ? (
                  <img
                    src={room.movie.posterUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-35 transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[#090b0e] via-[#090b0e]/80 to-transparent" />
                <div className="relative flex h-full min-h-56 flex-col justify-between p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                      <Radio size={11} /> Live
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-black/50 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                      <Users size={12} /> {room.participantCount}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-400">
                      {room.hostName} đang chiếu
                    </p>
                    <h3 className="mt-2 text-xl font-black leading-tight">
                      {room.name}
                    </h3>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-neutral-400">
                      <span className="truncate pr-4">{room.movie.name}</span>
                      <span className="flex shrink-0 items-center gap-1 text-white">
                        Vào phòng <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="relative mx-auto mt-16 max-w-[1500px] border-t border-white/10 pt-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
              Bắt đầu phòng mới
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Chọn phim đang được quan tâm
            </h2>
          </div>
          <span className="hidden items-center gap-2 text-xs text-neutral-500 sm:flex">
            <Clock3 size={14} /> Phòng đóng khi người cuối cùng rời đi
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
                className="text-left"
              >
                <FilmCard film={movie} />
              </button>
            ))}
          </div>
        )}
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#101419] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
                  Phòng chiếu mới
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  Chọn phim và đặt tên
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-full border border-white/10 p-2 text-neutral-400 hover:bg-white/5 hover:text-white"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <label className="relative mt-6 block">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm trong danh sách phim"
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-9 pr-4 text-sm outline-none focus:border-emerald-400/60"
              />
            </label>

            <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {filteredMovies.map((movie) => {
                const selected = selectedMovie?.slug === movie.slug;
                const image =
                  resolveImageUrl(movie.thumb_url) ||
                  resolveImageUrl(movie.poster_url);
                return (
                  <button
                    key={movie.slug}
                    onClick={() => setSelectedMovie(movie)}
                    className={`relative aspect-video overflow-hidden rounded-xl border text-left transition-colors ${
                      selected
                        ? "border-emerald-400"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <span className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <span className="absolute inset-x-2 bottom-2 truncate text-[11px] font-bold">
                      {movie.name}
                    </span>
                    {selected ? (
                      <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-emerald-400 text-black">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <label className="mt-5 block text-xs font-bold text-neutral-400">
              Tên phòng, không bắt buộc
              <input
                value={customRoomName}
                maxLength={90}
                onChange={(event) => setCustomRoomName(event.target.value)}
                placeholder={
                  selectedMovie
                    ? `Xem chung: ${selectedMovie.name}`
                    : "Ví dụ: Tối nay xem phim cùng nhóm"
                }
                className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-emerald-400/60"
              />
            </label>

            <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="h-10 rounded-full border border-white/10 px-5 text-xs font-bold text-neutral-300 hover:bg-white/5"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!selectedMovie}
                className="flex h-10 items-center gap-2 rounded-full bg-emerald-400 px-5 text-xs font-black text-black hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={14} /> Mở phòng chiếu
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
