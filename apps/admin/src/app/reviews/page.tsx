"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconMessageCircle as MessageSquare,
  IconEye as Eye,
  IconEyeOff as EyeOff,
  IconSearch as Search,
  IconTrash as Trash2,
} from "@tabler/icons-react";
import { adminFetch, queryString } from "@/lib/admin-api";

type Review = {
  id: string;
  content: string;
  rating?: number;
  likeCount: number;
  isHidden: boolean;
  moderationNote?: string;
  createdAt: string;
  user: { username: string; displayName?: string; isBanned: boolean };
  movie: { id: string; title: string };
};
type Data = { items: Review[]; pagination: { total: number } };
export default function ReviewsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setData(
        await adminFetch<Data>(`reviews?${queryString({ limit: 50, search })}`),
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải bình luận",
      );
    }
  }, [search]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);
  const remove = async (id: string) => {
    if (!confirm("Xóa vĩnh viễn bình luận này?")) return;
    try {
      await adminFetch(`reviews/${id}`, { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xóa");
    }
  };
  const moderate = async (item: Review) => {
    const note = item.isHidden
      ? ""
      : (window.prompt(
          "Lý do ẩn bình luận (không bắt buộc):",
          item.moderationNote || "",
        ) ?? null);
    if (note === null) return;
    try {
      await adminFetch(`reviews/${item.id}/moderation`, {
        method: "PATCH",
        body: JSON.stringify({ hidden: !item.isHidden, note }),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể kiểm duyệt");
    }
  };
  return (
    <div className="admin-fade-in space-y-6">
      <header>
        <p className="text-[11px] font-semibold text-slate-400">
          CỘNG ĐỒNG / KIỂM DUYỆT
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-[29px] font-bold text-slate-800">
          <MessageSquare className="text-blue-600" />
          Bình luận và đánh giá
        </h1>
      </header>
      {error && (
        <div className="rounded-xl bg-rose-50 p-3 text-[12px] text-rose-700">
          {error}
        </div>
      )}
      <section className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-line)] p-5">
          <label className="relative block">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-control w-full bg-slate-50 pl-9 pr-3 text-[12px]"
              placeholder="Tìm nội dung, phim hoặc username..."
            />
          </label>
        </div>
        <div className="divide-y divide-[var(--admin-line)]">
          {data?.items.map((item) => (
            <article
              key={item.id}
              className={`grid gap-3 px-5 py-4 sm:grid-cols-[160px_1fr_auto] ${item.isHidden ? "bg-amber-50/40" : ""}`}
            >
              <div>
                <strong className="text-[11px] text-slate-700">
                  @{item.user.username}
                </strong>
                <small className="block text-[9px] text-slate-400">
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </small>
              </div>
              <div>
                <p className="text-[12px] leading-5 text-slate-600">
                  {item.content}
                </p>
                <small className="mt-1 block text-[10px] text-slate-400">
                  {item.movie.title} · {item.rating || "Chưa chấm"}/5 ·{" "}
                  {item.likeCount} lượt thích
                </small>
                {item.isHidden && (
                  <small className="mt-1 block text-[10px] font-semibold text-amber-600">
                    Đang ẩn khỏi trang công khai
                    {item.moderationNote ? ` · ${item.moderationNote}` : ""}
                  </small>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => void moderate(item)}
                  className="admin-icon-button !text-amber-600"
                  title={item.isHidden ? "Hiện lại bình luận" : "Ẩn bình luận"}
                >
                  {item.isHidden ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  onClick={() => void remove(item.id)}
                  className="admin-icon-button !text-rose-600"
                  title="Xóa vĩnh viễn bình luận"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
          {!data?.items.length && (
            <p className="p-14 text-center text-[12px] text-slate-400">
              Chưa có bình luận.
            </p>
          )}
        </div>
        <footer className="border-t border-[var(--admin-line)] px-5 py-3 text-[10px] text-slate-400">
          {data?.pagination.total || 0} bình luận
        </footer>
      </section>
    </div>
  );
}
