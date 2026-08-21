"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconDatabase,
  IconLock,
  IconRefresh,
  IconServer,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";

type Health = {
  checkedAt: string;
  api: { status: string; uptimeSeconds: number };
  database: { status: string; latencyMs: number };
  cache: { backend: string; hits: number; misses: number; hitRate: number };
  security: {
    helmet: boolean;
    globalRateLimit: boolean;
    reviewRateLimitPath: string;
  };
};

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    operational: "Hoạt động tốt",
    protected: "Được bảo vệ",
    degraded: "Suy giảm",
    unavailable: "Không khả dụng",
  };
  return labels[status] || status;
};

export default function SystemPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHealth(await adminFetch<Health>("system"));
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Kiểm tra hệ thống thất bại",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  const cards = health
    ? [
        {
          label: "API NestJS",
          value: statusLabel(health.api.status),
          detail: `Đã chạy ${Math.round(health.api.uptimeSeconds / 60)} phút`,
          Icon: IconServer,
        },
        {
          label: "PostgreSQL",
          value: statusLabel(health.database.status),
          detail: `Độ trễ ${health.database.latencyMs} ms`,
          Icon: IconDatabase,
        },
        {
          label: "Bộ nhớ đệm Redis",
          value: health.cache.backend,
          detail: `${(health.cache.hitRate * 100).toFixed(1)}% truy cập trúng`,
          Icon: IconRefresh,
        },
        {
          label: "Bảo mật",
          value: statusLabel(
            health.security.helmet && health.security.globalRateLimit
              ? "protected"
              : "degraded",
          ),
          detail: health.security.reviewRateLimitPath,
          Icon: IconLock,
        },
      ]
    : [];

  return (
    <div className="admin-fade-in space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold text-slate-400">
            HẠ TẦNG / TRẠNG THÁI
          </p>
          <h1 className="mt-2 text-[29px] font-bold tracking-[-.045em] text-slate-800">
            Trạng thái hệ thống thực tế
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Mỗi lần kiểm tra đều truy vấn trực tiếp API và cơ sở dữ liệu.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="admin-icon-button"
          aria-label="Kiểm tra lại hệ thống"
        >
          <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </header>
      {error && (
        <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700">
          <IconAlertTriangle size={16} /> {error}
        </div>
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, Icon }) => (
          <article key={label} className="admin-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {label}
              </span>
              <Icon size={18} className="text-blue-600" />
            </div>
            <strong className="mt-4 flex items-center gap-2 text-[15px] uppercase text-slate-800">
              <IconCircleCheck size={16} className="text-emerald-600" /> {value}
            </strong>
            <p className="mt-1 text-[10px] text-slate-400">{detail}</p>
          </article>
        ))}
      </section>
      <section className="admin-card p-5">
        <h2 className="text-[14px] font-bold text-slate-800">
          Các lớp bảo vệ đang áp dụng
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-600">
            <strong className="block">Giới hạn API toàn cục</strong>
            100 yêu cầu/phút qua bộ giới hạn Redis
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-600">
            <strong className="block">Đánh giá và bình luận</strong>
            10 yêu cầu/phút tại `/api/v1/reviews`
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-600">
            <strong className="block">Tiêu đề bảo mật</strong>
            Helmet, HSTS, CSP và chặn nhúng khung
          </div>
        </div>
        {health && (
          <p className="mt-4 text-[10px] text-slate-400">
            Kiểm tra lúc {new Date(health.checkedAt).toLocaleString("vi-VN")}
          </p>
        )}
      </section>
    </div>
  );
}
