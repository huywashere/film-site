"use client";

import { useState } from "react";
import { Radio, Users, MessageSquare, Trash2, ShieldCheck, RefreshCw, Play } from "lucide-react";

interface PartyRoom {
  id: string;
  movieTitle: string;
  hostName: string;
  participantCount: number;
  messageCount: number;
  createdAt: string;
}

const INITIAL_ROOMS: PartyRoom[] = [
  {
    id: "ROOM-8821",
    movieTitle: "Xác Sống (Walking Dead)",
    hostName: "huywashere",
    participantCount: 4,
    messageCount: 18,
    createdAt: "10 phút trước",
  },
  {
    id: "ROOM-3419",
    movieTitle: "Interstellar 4K",
    hostName: "cine_fan",
    participantCount: 2,
    messageCount: 9,
    createdAt: "45 phút trước",
  },
];

export default function WatchPartyManagementPage() {
  const [rooms, setRooms] = useState<PartyRoom[]>(INITIAL_ROOMS);
  const [notice, setNotice] = useState<string | null>(null);

  const closeRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    setNotice(`Đã giải tán phòng ${id}`);
  };

  return (
    <div className="admin-fade-in space-y-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span>Vận hành</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Watch Party</span>
          </div>
          <h1 className="mt-2 text-[29px] font-bold tracking-[-.045em] text-slate-800 flex items-center gap-2">
            <Radio className="text-emerald-500 animate-pulse" size={28} /> Quản Lý Phòng Xem Chung
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Theo dõi các phòng xem chung thời gian thực qua WebSocket Gateway và quản lý hoạt động phòng.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--admin-line)] bg-white px-4 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Phòng Live</p>
            <strong className="text-[17px] text-emerald-600">{rooms.length} phòng</strong>
          </div>
          <div className="rounded-xl border border-[var(--admin-line)] bg-white px-4 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">WebSocket Status</p>
            <strong className="text-[14px] text-blue-600 flex items-center gap-1 font-bold">
              <ShieldCheck size={16} /> Online
            </strong>
          </div>
        </div>
      </header>

      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[12px] font-medium text-emerald-700">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      <section className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--admin-line)] p-5">
          <div>
            <h2 className="text-[14px] font-bold text-slate-800">Danh sách phòng phát Live</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">{rooms.length} phòng xem chung đang kết nối</p>
          </div>
          <button
            onClick={() => setRooms(INITIAL_ROOMS)}
            className="admin-control flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[.07em] text-slate-400">
              <tr>
                <th className="px-5 py-3">Mã phòng</th>
                <th className="px-4 py-3">Phim phát</th>
                <th className="px-4 py-3">Chủ phòng</th>
                <th className="px-4 py-3 text-center">Người xem</th>
                <th className="px-4 py-3 text-center">Tin nhắn</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-line)]">
              {rooms.map((room) => (
                <tr key={room.id} className="transition-colors hover:bg-slate-50/70 text-[12px]">
                  <td className="px-5 py-3.5 font-mono font-bold text-blue-600">{room.id}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{room.movieTitle}</td>
                  <td className="px-4 py-3.5 text-slate-600">@{room.hostName}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                      <Users size={12} /> {room.participantCount}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare size={13} /> {room.messageCount}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => closeRoom(room.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 size={14} /> Giải tán
                    </button>
                  </td>
                </tr>
              ))}
              {!rooms.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[12px] text-slate-400">
                    Hiện chưa có phòng xem chung nào đang phát.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
