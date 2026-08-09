"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ServerOff,
} from "lucide-react";

type ProviderStatus = "operational" | "degraded" | "down";

type ProviderHealth = {
  id: string;
  name: string;
  role: string;
  status: ProviderStatus;
  latencyMs: number;
  httpStatus: number | null;
  message: string;
};

type HealthPayload = {
  status: ProviderStatus;
  checkedAt: string;
  summary: {
    total: number;
    operational: number;
    degraded: number;
    down: number;
  };
  providers: ProviderHealth[];
};

const STATUS_STYLE: Record<
  ProviderStatus,
  { label: string; dot: string; badge: string }
> = {
  operational: {
    label: "Ổn định",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
  },
  degraded: {
    label: "Phản hồi chậm",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700",
  },
  down: {
    label: "Mất kết nối",
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700",
  },
};

function checkedTime(value?: string) {
  if (!value) return "Chưa kiểm tra";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function ProviderHealthPanel() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/provider-health${force ? "?force=1" : ""}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData((await response.json()) as HealthPayload);
    } catch {
      setError("Không thể tải trạng thái nguồn phim từ máy chủ quản trị.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const summaryTone =
    data?.status === "operational"
      ? "text-emerald-600"
      : data?.status === "degraded"
        ? "text-amber-600"
        : "text-rose-600";

  return (
    <section className="admin-card overflow-hidden" aria-live="polite">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-bold text-slate-800">
            Sức khỏe nguồn phim
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Kiểm tra qua proxy website mỗi 60 giây
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span
              className={`hidden items-center gap-1 text-[10px] font-bold sm:inline-flex ${summaryTone}`}
            >
              {data.status === "operational" ? (
                <CheckCircle2 size={13} />
              ) : data.status === "degraded" ? (
                <AlertTriangle size={13} />
              ) : (
                <ServerOff size={13} />
              )}
              {data.summary.operational}/{data.summary.total} ổn định
            </span>
          )}
          <button
            type="button"
            onClick={() => void refresh(true)}
            disabled={loading}
            className="admin-icon-button !h-8 !w-8 disabled:opacity-50"
            aria-label="Kiểm tra lại các nguồn phim"
            title="Kiểm tra lại"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="p-5">
        {loading && !data ? (
          <div className="space-y-3" aria-label="Đang kiểm tra nguồn phim">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="h-[52px] animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : error && !data ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
            <div className="flex items-start gap-2 text-[11px] leading-5 text-rose-700">
              <ServerOff size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void refresh(true)}
              className="mt-3 text-[11px] font-semibold text-rose-700 hover:text-rose-900"
            >
              Thử kiểm tra lại
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-line)]">
            {data?.providers.map((provider) => {
              const style = STATUS_STYLE[provider.status];
              return (
                <div
                  key={provider.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold text-slate-700">
                        {provider.name}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400">
                        {provider.role}
                      </span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold ${style.badge}`}
                      title={provider.message}
                    >
                      {style.label}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] text-slate-400">
                      {provider.httpStatus
                        ? `HTTP ${provider.httpStatus} · `
                        : ""}
                      {provider.latencyMs}ms
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--admin-line)] pt-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock3 size={13} /> Cập nhật lúc {checkedTime(data?.checkedAt)}
          </span>
          {error && data && <span className="text-rose-500">{error}</span>}
        </div>
      </div>
    </section>
  );
}
