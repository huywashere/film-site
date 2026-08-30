"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconMessageCircle as MessageSquare,
  IconHistory as History,
  IconBroadcast as Radio,
  IconRefresh as RefreshCw,
  IconTrash as Trash2,
  IconUsers as Users,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";

type Room = {
  id: string;
  name: string;
  movie: { name: string; episode?: string };
  hostName: string;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
};
type Archive = {
  id: string;
  name: string;
  movieName: string;
  episode?: string;
  hostName?: string;
  peakParticipants: number;
  messageCount: number;
  closeReason?: string;
  createdAt: string;
  endedAt: string;
};

export default function WatchPartyPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [data, history] = await Promise.all([
        adminFetch<{ items: Room[] }>("watch-parties"),
        adminFetch<{ items: Archive[] }>("watch-party-archives?limit=30"),
      ]);
      setRooms(data.items);
      setArchives(history.items);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải phòng");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, [load]);
  const close = async (id: string) => {
    if (!window.confirm(`Giải tán phòng ${id}?`)) return;
    try {
      await adminFetch(`watch-parties/${id}`, { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể giải tán phòng",
      );
    }
  };
  return (
    <div className="admin-fade-in space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-slate-400">
            TRỰC TIẾP / PHÒNG XEM CHUNG
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-[29px] font-bold tracking-[-.045em] text-slate-800">
            <Radio className="text-emerald-500" />
            Phòng xem chung
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Danh sách trực tiếp từ WebSocket Gateway, tự làm mới mỗi 10 giây.
          </p>
        </div>
        <button onClick={() => void load()} className="admin-icon-button">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </header>
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700">
          {error}
        </div>
      )}
      <section className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-line)] px-5 py-4 text-[12px] font-semibold text-slate-700">
          {rooms.length} phòng đang hoạt động
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3">Phòng</th>
                <th className="px-4 py-3">Phim</th>
                <th className="px-4 py-3">Chủ phòng</th>
                <th className="px-4 py-3">Người xem</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-line)]">
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td className="px-5 py-3">
                    <strong className="block font-mono text-[11px] text-blue-600">
                      {room.id}
                    </strong>
                    <small className="text-[10px] text-slate-400">
                      {room.name}
                    </small>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-700">
                    {room.movie.name}
                    <small className="block text-slate-400">
                      {room.movie.episode || "Chưa chọn tập"}
                    </small>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">
                    {room.hostName}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      <Users size={13} />
                      {room.participantCount}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => void close(room.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-rose-50 px-3 text-[10px] font-semibold text-rose-600"
                    >
                      <Trash2 size={13} />
                      Giải tán
                    </button>
                  </td>
                </tr>
              ))}
              {!rooms.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-14 text-center text-[12px] text-slate-400"
                  >
                    Không có phòng đang hoạt động.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--admin-line)] px-5 py-4">
          <History size={16} className="text-blue-600" />
          <h2 className="text-[12px] font-semibold text-slate-700">
            Lịch sử phòng đã kết thúc
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3">Phòng</th>
                <th className="px-4 py-3">Phim</th>
                <th className="px-4 py-3">Đỉnh người xem</th>
                <th className="px-4 py-3">Tin nhắn</th>
                <th className="px-5 py-3">Kết thúc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-line)]">
              {archives.map((archive) => (
                <tr key={archive.id}>
                  <td className="px-5 py-3">
                    <strong className="block font-mono text-[11px] text-slate-600">
                      {archive.id}
                    </strong>
                    <small className="text-[10px] text-slate-400">
                      {archive.name} · {archive.closeReason || "Đã kết thúc"}
                    </small>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-700">
                    {archive.movieName}
                    <small className="block text-slate-400">
                      {archive.episode || "Chưa chọn tập"} ·{" "}
                      {archive.hostName || "Ẩn danh"}
                    </small>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-bold text-slate-600">
                    {archive.peakParticipants}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">
                    {archive.messageCount}
                  </td>
                  <td className="px-5 py-3 text-[10px] text-slate-400">
                    {new Date(archive.endedAt).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
              {!archives.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-[11px] text-slate-400"
                  >
                    Chưa có phòng nào được lưu vào lịch sử.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <div className="admin-card flex items-center gap-3 p-4 text-[11px] text-slate-500">
        <MessageSquare size={16} className="text-blue-600" />
        Tin nhắn vẫn được giới hạn và lọc tại WebSocket Gateway; giải tán phòng
        được ghi vào audit log.
      </div>
    </div>
  );
}
