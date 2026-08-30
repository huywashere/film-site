"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconClock,
  IconPlayerPlay,
  IconRefresh,
  IconRouteAltLeft,
  IconServer,
} from "@tabler/icons-react";
import { adminFetch, queryString } from "@/lib/admin-api";

type Analytics = {
  range: string;
  since: string;
  summary: {
    totalEvents: number;
    successes: number;
    fallbacks: number;
    failures: number;
    fallbackRate: number;
    failureRate: number;
    averageStartMs: number | null;
    slowestStartMs: number | null;
  };
  byProvider: Array<{ provider: string; count: number }>;
  byEvent: Array<{ eventType: string; count: number }>;
  recentFailures: Array<{
    id: string;
    eventType: string;
    movieId?: string;
    provider?: string;
    serverName?: string;
    episode?: string;
    errorCode?: string;
    fromSource?: string;
    toSource?: string;
    occurredAt: string;
  }>;
  sourceHealth: Array<{
    provider: string;
    total: number;
    operational: number;
    degraded: number;
    down: number;
    lastCheckedAt?: string;
    lastError?: string;
  }>;
};

const ranges = [
  { id: "14d", label: "14 ngày" },
  { id: "30d", label: "30 ngày" },
  { id: "6m", label: "6 tháng" },
  { id: "1y", label: "1 năm" },
];

const fmt = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);
const percent = (value: number) =>
  `${(value * 100).toFixed(1).replace(".0", "")}%`;

export default function PlaybackOperationsPage() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await adminFetch<Analytics>(
          `playback-analytics?${queryString({ range })}`,
        ),
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải dữ liệu player",
      );
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = data
    ? [
        {
          label: "Lượt phát thành công",
          value: fmt(data.summary.successes),
          detail: `${fmt(data.summary.totalEvents)} event đã ghi`,
          icon: IconPlayerPlay,
        },
        {
          label: "Tỷ lệ chuyển nguồn",
          value: percent(data.summary.fallbackRate),
          detail: `${fmt(data.summary.fallbacks)} lần chuyển nguồn dự phòng`,
          icon: IconRouteAltLeft,
        },
        {
          label: "Lỗi phát",
          value: percent(data.summary.failureRate),
          detail: `${fmt(data.summary.failures)} lỗi nguồn`,
          icon: IconAlertTriangle,
        },
        {
          label: "Thời gian bắt đầu",
          value:
            data.summary.averageStartMs === null
              ? "Chưa có"
              : `${Math.round(data.summary.averageStartMs)} ms`,
          detail:
            data.summary.slowestStartMs === null
              ? "Chưa có mẫu"
              : `Chậm nhất ${Math.round(data.summary.slowestStartMs)} ms`,
          icon: IconClock,
        },
      ]
    : [];

  return (
    <div className="admin-fade-in space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[.08em] text-slate-400">
            VẬN HÀNH TRÌNH PHÁT
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-[20px] font-extrabold text-slate-800">
            <IconActivityHeartbeat
              size={21}
              className="text-[var(--admin-brand)]"
            />
            Vận hành nguồn phát
          </h1>
          <p className="mt-1 text-[11px] text-slate-500">
            Theo dõi thời gian mở phim, lỗi máy chủ và luồng chuyển nguồn từ dữ
            liệu người xem.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ranges.map((item) => (
            <button
              key={item.id}
              onClick={() => setRange(item.id)}
              className={`admin-control px-3 text-[10px] font-bold ${range === item.id ? "!border-[var(--admin-brand)] !text-[var(--admin-brand)]" : ""}`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => void load()}
            disabled={loading}
            className="admin-icon-button"
          >
            <IconRefresh size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
          {error}
        </div>
      )}

      {!data && loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="admin-card h-32 animate-pulse bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, detail, icon: Icon }) => (
            <article key={label} className="admin-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  {label}
                </span>
                <Icon size={18} className="text-[var(--admin-brand)]" />
              </div>
              <strong className="mt-4 block text-[23px] tracking-[-.04em] text-slate-800">
                {value}
              </strong>
              <small className="mt-1 block text-[10px] text-slate-400">
                {detail}
              </small>
            </article>
          ))}
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.4fr)]">
        <article className="admin-card overflow-hidden">
          <header className="border-b border-[var(--admin-line)] px-5 py-4">
            <h2 className="text-[13px] font-extrabold text-slate-800">
              Sức khỏe nguồn đã ghi nhận
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Trạng thái cập nhật từ lần phát gần nhất
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead className="bg-slate-50 text-[9px] uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3">Nguồn</th>
                  <th className="px-3 py-3">Tổng</th>
                  <th className="px-3 py-3">Ổn định</th>
                  <th className="px-3 py-3">Chậm</th>
                  <th className="px-5 py-3">Lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-line)]">
                {data?.sourceHealth.map((source) => (
                  <tr key={source.provider}>
                    <td className="px-5 py-3">
                      <strong className="block text-[11px] uppercase text-slate-700">
                        {source.provider}
                      </strong>
                      <small
                        className="block max-w-52 truncate text-[9px] text-slate-400"
                        title={source.lastError}
                      >
                        {source.lastError || "Không có lỗi gần đây"}
                      </small>
                    </td>
                    <td className="px-3 py-3 text-[11px]">{source.total}</td>
                    <td className="px-3 py-3 text-[11px] text-emerald-600">
                      {source.operational}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-amber-600">
                      {source.degraded}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-rose-600">
                      {source.down}
                    </td>
                  </tr>
                ))}
                {!data?.sourceHealth.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-10 text-center text-[11px] text-slate-400"
                    >
                      Chưa có nguồn phát có cấu trúc. Đồng bộ hoặc cập nhật
                      trong Thư viện phim.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-card overflow-hidden">
          <header className="border-b border-[var(--admin-line)] px-5 py-4">
            <h2 className="text-[13px] font-extrabold text-slate-800">
              Sự cố gần đây
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Chuyển nguồn, lỗi nguồn và lỗi truyền tải trong khoảng đã chọn
            </p>
          </header>
          <div className="max-h-[420px] overflow-auto">
            {data?.recentFailures.map((event) => (
              <div
                key={event.id}
                className="grid gap-2 border-b border-[var(--admin-line)] px-5 py-3 sm:grid-cols-[130px_minmax(0,1fr)_auto]"
              >
                <span>
                  <strong className="block text-[10px] text-rose-600">
                    {event.eventType}
                  </strong>
                  <small className="text-[9px] text-slate-400">
                    {event.provider || "Chưa rõ"} /{" "}
                    {event.serverName || "Chưa rõ"}
                  </small>
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-[11px] text-slate-700">
                    {event.movieId || "Chưa liên kết phim"}
                  </strong>
                  <small className="text-[9px] text-slate-400">
                    {event.errorCode ||
                      (event.fromSource && event.toSource
                        ? `${event.fromSource} sang ${event.toSource}`
                        : "Không có mã lỗi")}
                  </small>
                </span>
                <time className="text-[9px] text-slate-400">
                  {new Date(event.occurredAt).toLocaleString("vi-VN")}
                </time>
              </div>
            ))}
            {!data?.recentFailures.length && (
              <div className="grid min-h-52 place-items-center p-8 text-center">
                <span>
                  <IconServer size={28} className="mx-auto text-emerald-500" />
                  <strong className="mt-3 block text-[12px] text-slate-700">
                    Không có sự cố trong khoảng này
                  </strong>
                  <small className="mt-1 block text-[10px] text-slate-400">
                    Các lỗi trình phát mới sẽ xuất hiện tại đây.
                  </small>
                </span>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="admin-card overflow-hidden">
        <header className="border-b border-[var(--admin-line)] px-5 py-4">
          <h2 className="text-[13px] font-extrabold text-slate-800">
            Phân bố event
          </h2>
        </header>
        <div className="grid gap-x-8 gap-y-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {data?.byEvent.map((item) => (
            <div key={item.eventType} className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-[var(--admin-brand)]">
                <IconActivityHeartbeat size={15} />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-[10px] text-slate-700">
                  {item.eventType}
                </strong>
                <small className="text-[9px] text-slate-400">
                  {fmt(item.count)} event
                </small>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
