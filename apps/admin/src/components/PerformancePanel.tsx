"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconActivity as Activity,
  IconDatabase as Database,
  IconGauge as Gauge,
  IconCpu as MemoryStick,
  IconRefresh as RefreshCw,
  IconAlertTriangle as TriangleAlert,
} from "@tabler/icons-react";

type Summary = { count: number; p50: number | null; p95: number | null };
type Metrics = {
  generatedAt: string;
  samples: number;
  webVitals: { lcp: Summary; inp: Summary; cls: Summary };
  api: {
    requests: number;
    errors: number;
    errorRate: number;
    latency: Summary;
    reportedCacheHitRate: number;
  };
  playback: { successes: number; fallbacks: number; fallbackRate: number };
  cache: {
    backend: string;
    hits: number;
    misses: number;
    hitRate: number;
    memoryEntries: number;
  };
  process: { heapUsedBytes: number; rssBytes: number; uptimeSeconds: number };
};

type Payload = {
  available: boolean;
  probeLatencyMs: number;
  message?: string;
  metrics?: Metrics;
};

function ms(value: number | null) {
  return value === null ? "Chưa có" : `${Math.round(value)} ms`;
}

function percent(value: number) {
  return `${(value * 100).toFixed(1).replace(".0", "")}%`;
}

function megabytes(value: number) {
  return `${Math.round(value / 1024 / 1024)} MB`;
}

export function PerformancePanel() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/performance", { cache: "no-store" });
      setPayload((await response.json()) as Payload);
    } catch {
      setPayload({
        available: false,
        probeLatencyMs: 0,
        message: "Không thể kết nối điểm đo hiệu suất của trang quản trị",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const metrics = payload?.metrics;
  const cards = metrics
    ? [
        {
          label: "LCP p95",
          value: ms(metrics.webVitals.lcp.p95),
          detail: `${metrics.webVitals.lcp.count} mẫu`,
          Icon: Gauge,
        },
        {
          label: "API p95",
          value: ms(metrics.api.latency.p95),
          detail: `${metrics.api.requests} yêu cầu, ${percent(metrics.api.errorRate)} lỗi`,
          Icon: Activity,
        },
        {
          label: "Tỷ lệ trúng Redis",
          value: percent(metrics.cache.hitRate),
          detail: `${metrics.cache.backend}, ${metrics.cache.hits} lần trúng`,
          Icon: Database,
        },
        {
          label: "Bộ nhớ API / RSS",
          value: megabytes(metrics.process.heapUsedBytes),
          detail: `RSS ${megabytes(metrics.process.rssBytes)}`,
          Icon: MemoryStick,
        },
      ]
    : [];

  return (
    <section className="admin-card overflow-hidden" aria-live="polite">
      <div className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-bold text-slate-800">
            Hiệu suất hệ thống
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Web Vitals, API, Redis và bộ nhớ trong cửa sổ 60 phút
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="admin-icon-button !h-8 !w-8 disabled:opacity-50"
          aria-label="Làm mới số liệu hiệu suất"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {!payload && loading ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : !payload?.available || !metrics ? (
        <div className="m-5 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-4 text-[11px] text-amber-800">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>{payload?.message || "Số liệu hiệu suất chưa sẵn sàng"}</span>
        </div>
      ) : (
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, detail, Icon }) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">
                  {label}
                </span>
                <Icon size={16} className="text-[var(--admin-brand)]" />
              </div>
              <strong className="mt-3 block text-[21px] tracking-[-.04em] text-slate-800">
                {value}
              </strong>
              <span className="mt-1 block text-[10px] text-slate-400">
                {detail}
              </span>
            </div>
          ))}
        </div>
      )}

      {metrics && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--admin-line)] px-5 py-3 text-[10px] text-slate-400">
          <span>
            Tỷ lệ chuyển nguồn: {percent(metrics.playback.fallbackRate)} · INP
            p95: {ms(metrics.webVitals.inp.p95)}
          </span>
          <span>{metrics.samples} mẫu đo lường</span>
        </div>
      )}
    </section>
  );
}
