"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconDownload as Download,
  IconFingerprint as Fingerprint,
  IconSearch as Search,
} from "@tabler/icons-react";
import { adminFetch, queryString } from "@/lib/admin-api";
type Log = {
  id: string;
  adminEmail: string;
  action: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
};
type Data = { items: Log[]; pagination: { total: number } };
export default function AuditPage() {
  const [data, setData] = useState<Data | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setData(
        await adminFetch<Data>(
          `audit-logs?${queryString({ limit: 100, search })}`,
        ),
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải audit log",
      );
    }
  }, [search]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);
  const download = () => {
    if (!data) return;
    const quote = (v: unknown) => `"${String(v || "").replaceAll('"', '""')}"`;
    const csv = [
      "time,actor,action,target,details",
      ...data.items.map((x) =>
        [x.createdAt, x.adminEmail, x.action, x.targetId, x.details]
          .map(quote)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `netphim-audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="admin-fade-in space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold text-slate-400">
            BẢO MẬT / TRUY VẾT
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-[29px] font-bold text-slate-800">
            <Fingerprint className="text-violet-600" />
            Nhật ký quản trị
          </h1>
        </div>
        <button
          onClick={download}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-800 px-3 text-[11px] font-semibold text-white"
        >
          <Download size={14} />
          Xuất CSV
        </button>
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
              placeholder="Tìm hành động, quản trị viên hoặc nội dung..."
            />
          </label>
        </div>
        <div className="divide-y divide-[var(--admin-line)]">
          {data?.items.map((log) => (
            <article
              key={log.id}
              className="grid gap-2 px-5 py-4 sm:grid-cols-[170px_180px_1fr]"
            >
              <time className="text-[9px] text-slate-400">
                {new Date(log.createdAt).toLocaleString("vi-VN")}
              </time>
              <span>
                <strong className="block text-[10px] text-violet-700">
                  {log.action}
                </strong>
                <small className="text-[9px] text-slate-400">
                  {log.adminEmail}
                </small>
              </span>
              <span className="text-[10px] leading-4 text-slate-500">
                {log.details || "Không có chi tiết"}
                <small className="block font-mono text-[9px] text-slate-400">
                  {log.targetId || "Không có"}{" "}
                  {log.ipAddress ? `· ${log.ipAddress}` : ""}
                </small>
              </span>
            </article>
          ))}
          {!data?.items.length && (
            <p className="p-14 text-center text-[12px] text-slate-400">
              Chưa có nhật ký.
            </p>
          )}
        </div>
        <footer className="border-t border-[var(--admin-line)] px-5 py-3 text-[10px] text-slate-400">
          {data?.pagination.total || 0} bản ghi
        </footer>
      </section>
    </div>
  );
}
