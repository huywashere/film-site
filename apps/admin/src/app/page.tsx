"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconBroadcast,
  IconChevronRight,
  IconEye,
  IconMovie as IconFilm,
  IconRefresh,
  IconUsers,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";
import { ProviderHealthPanel } from "@/components/ProviderHealthPanel";
import { PerformancePanel } from "@/components/PerformancePanel";

type Stats = {
  totalUsers: number;
  totalMovies: number;
  activeUsers: number;
  viewsToday: number;
  viewsWeek: number;
  viewsMonth: number;
  range: string;
  rangeViews: number;
  activeWatchParties: number;
  openReports: number;
  dailyChartData: { date: string; views: number }[];
  topMovies: {
    id: string;
    title: string;
    views: number;
    year?: number;
    status: string;
    sourceCount: number;
  }[];
  recentActivity: {
    id: string;
    action: string;
    adminEmail: string;
    details?: string;
    createdAt: string;
  }[];
};

const fmt = (value = 0) =>
  new Intl.NumberFormat("vi-VN", {
    notation: value > 99_999 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("14d");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStats(await adminFetch<Stats>(`stats?range=${range}`));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, [range]);
  useEffect(() => void refresh(), [refresh]);

  const maxViews = useMemo(
    () =>
      Math.max(1, ...(stats?.dailyChartData.map((item) => item.views) || [1])),
    [stats],
  );
  const cards = [
    {
      label: "NGƯỜI DÙNG HOẠT ĐỘNG",
      value: stats?.activeUsers,
      detail: `${fmt(stats?.totalUsers)} tài khoản`,
      icon: IconUsers,
      accent: "#2878ee",
      visual: "line",
    },
    {
      label: "LƯỢT XEM HÔM NAY",
      value: stats?.viewsToday,
      detail: `${fmt(stats?.viewsWeek)} trong 7 ngày`,
      icon: IconEye,
      accent: "#2878ee",
      visual: "donut",
    },
    {
      label: "THƯ VIỆN PHIM",
      value: stats?.totalMovies,
      detail: "Nội dung đã đồng bộ",
      icon: IconFilm,
      accent: "#02a98d",
      visual: "line",
    },
    {
      label: "SỰ CỐ CHƯA XỬ LÝ",
      value: stats?.openReports,
      detail: `${fmt(stats?.activeWatchParties)} phòng đang xem`,
      icon: IconAlertTriangle,
      accent: "#f7577e",
      visual: "bars",
    },
  ];

  return (
    <div className="admin-fade-in space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[17px] font-extrabold text-[#31334a]">
          Trung tâm vận hành FlexPhim
        </h1>
        <div className="flex items-center gap-1 text-[11px] text-[#9ba6b7]">
          <span className="text-[#4c4c5c]">FlexPhim</span>
          <IconChevronRight size={14} />
          <span>Tổng quan</span>
          <IconChevronRight size={14} />
          <span className="text-[#8c94ad]">Vận hành</span>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-[#fbc4d1] bg-[#fff0f3] px-4 py-3 text-[12px] text-[#d9486b]">
          {error}
        </div>
      )}

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon, accent, visual }) => (
          <article key={label} className="admin-card min-h-[158px] p-5">
            <p className="text-[11px] font-bold text-[#929db0]">{label}</p>
            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f2f5f8] text-[#263244]">
                  <Icon size={20} stroke={1.7} />
                </span>
                <strong className="truncate text-[22px] font-extrabold tracking-[-.025em] text-[#414459]">
                  {loading && value === undefined ? "..." : fmt(value)}
                </strong>
              </div>
              <MiniVisual
                kind={visual}
                color={accent}
                value={Number(value || 0)}
              />
            </div>
            <div className="mt-6 flex items-center gap-2 text-[11px]">
              <span
                className={`flex items-center gap-0.5 font-bold ${label === "SỰ CỐ CHƯA XỬ LÝ" ? "text-[#f7577e]" : "text-[#02a98d]"}`}
              >
                {label === "SỰ CỐ CHƯA XỬ LÝ" ? (
                  <IconArrowDownRight size={14} />
                ) : (
                  <IconArrowUpRight size={14} />
                )}
                {label === "SỰ CỐ CHƯA XỬ LÝ"
                  ? "Cần kiểm tra"
                  : "Dữ liệu trực tiếp"}
              </span>
              <span className="text-[#9ba6b7]">{detail}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(330px,.8fr)]">
        <article className="admin-card overflow-hidden">
          <header className="flex items-center justify-between border-b border-dashed border-[var(--admin-line)] px-5 py-4">
            <h2 className="text-[13px] font-extrabold text-[#3f4256]">
              Tổng quan{" "}
              <span className="font-normal text-[#9ba6b7]">
                (
                {range === "14d"
                  ? "14 ngày"
                  : range === "30d"
                    ? "30 ngày"
                    : range === "6m"
                      ? "6 tháng"
                      : "1 năm"}
                )
              </span>
            </h2>
            <div className="flex gap-1">
              {[
                { id: "14d", label: "14 ngày" },
                { id: "30d", label: "30 ngày" },
                { id: "6m", label: "6 tháng" },
                { id: "1y", label: "1 năm" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setRange(item.id)}
                  aria-pressed={range === item.id}
                  className={`h-8 rounded px-3 text-[10px] font-bold ${range === item.id ? "bg-[#eef1f5] text-[#4c4c5c]" : "text-[#9ba6b7] hover:bg-[#f4f6f9]"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </header>
          <div className="grid min-h-[360px] lg:grid-cols-[325px_minmax(0,1fr)]">
            <div className="border-b border-[var(--admin-line)] p-5 lg:border-b-0 lg:border-r">
              {Number(stats?.openReports || 0) > 0 && (
                <div className="flex gap-3 rounded-md bg-[#fff0ec] p-4 text-[12px] text-[#dc654d]">
                  <IconAlertTriangle size={22} className="shrink-0" />
                  <span>
                    <strong className="block">
                      Hàng đợi sự cố cần được kiểm tra
                    </strong>
                    {fmt(stats?.openReports)} báo cáo đang chờ xử lý.
                  </span>
                </div>
              )}
              <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-6">
                <Metric
                  label="Lượt xem theo kỳ"
                  value={fmt(stats?.rangeViews)}
                  change={range.toUpperCase()}
                />
                <Metric
                  label="Lượt xem tuần"
                  value={fmt(stats?.viewsWeek)}
                  change="7 ngày"
                />
                <Metric
                  label="Tổng người dùng"
                  value={fmt(stats?.totalUsers)}
                  change="Tất cả"
                />
                <Metric
                  label="Phòng trực tiếp"
                  value={fmt(stats?.activeWatchParties)}
                  change="Hiện tại"
                />
              </div>
              <button
                onClick={() => void refresh()}
                disabled={loading}
                className="admin-primary-button mt-7"
              >
                <IconRefresh
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />{" "}
                Làm mới dữ liệu
              </button>
            </div>
            <div className="relative flex min-w-0 items-end gap-2 overflow-hidden px-5 pb-11 pt-9">
              <div className="pointer-events-none absolute inset-x-5 bottom-11 top-9 flex flex-col justify-between">
                {[80, 60, 40, 20, 0].map((line) => (
                  <div key={line} className="flex items-center gap-2">
                    <span className="w-5 text-[9px] text-[#aab3c2]">
                      {line}
                    </span>
                    <span className="h-px flex-1 border-t border-dashed border-[#e8ebf0]" />
                  </div>
                ))}
              </div>
              <div className="relative z-10 ml-7 flex h-[245px] w-full items-end gap-2">
                {(stats?.dailyChartData || []).map((item) => (
                  <div
                    key={item.date}
                    className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    title={`${item.date}: ${fmt(item.views)} lượt xem`}
                  >
                    <div className="flex h-[210px] w-full items-end justify-center">
                      <span
                        className="w-[52%] max-w-4 rounded-t-sm bg-[#46ad9f]"
                        style={{
                          height: `${Math.max(4, (item.views / maxViews) * 195)}px`,
                        }}
                      />
                    </div>
                    <span className="max-w-12 truncate text-[9px] text-[#9ba6b7]">
                      {item.date}
                    </span>
                  </div>
                ))}
                {!stats?.dailyChartData.length && (
                  <span className="m-auto text-[12px] text-[#9ba6b7]">
                    Chưa có dữ liệu phát trong khoảng này.
                  </span>
                )}
              </div>
            </div>
          </div>
        </article>

        <article className="admin-card overflow-hidden">
          <header className="border-b border-dashed border-[var(--admin-line)] px-5 py-4">
            <h2 className="text-[13px] font-extrabold text-[#3f4256]">
              Thành phần hệ thống
            </h2>
          </header>
          <div className="grid place-items-center p-7">
            <div
              className="relative grid h-[230px] w-[230px] place-items-center rounded-full"
              style={{
                background:
                  "conic-gradient(#2878ee 0 25%, #514f98 25% 58%, #46ad9f 58% 76%, #f7577e 76% 100%)",
              }}
            >
              <div className="grid h-[150px] w-[150px] place-items-center rounded-full bg-white text-center">
                <span className="text-[12px] text-[#4c4c5c]">
                  Tổng cộng
                  <strong className="mt-1 block text-[22px] font-semibold">
                    {fmt((stats?.totalMovies || 0) + (stats?.totalUsers || 0))}
                  </strong>
                </span>
              </div>
            </div>
            <div className="mt-7 grid w-full grid-cols-2 gap-x-6 gap-y-3 text-[11px]">
              <Legend
                color="#2878ee"
                label="Phim"
                value={fmt(stats?.totalMovies)}
              />
              <Legend
                color="#514f98"
                label="Người dùng"
                value={fmt(stats?.totalUsers)}
              />
              <Legend
                color="#46ad9f"
                label="Phòng xem chung"
                value={fmt(stats?.activeWatchParties)}
              />
              <Legend
                color="#f7577e"
                label="Sự cố"
                value={fmt(stats?.openReports)}
              />
            </div>
          </div>
        </article>
      </section>

      <section className="admin-card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4">
          <h2 className="text-[13px] font-extrabold text-[#3f4256]">
            Phim được xem nhiều
          </h2>
          <span className="admin-control flex items-center gap-2 px-3 text-[11px]">
            <IconFilm size={15} />
            Theo khoảng đang chọn
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-[#fbfbfd] text-[10px] uppercase">
              <tr>
                <th className="px-5 py-3">Mã phim</th>
                <th className="px-5 py-3">Tên phim</th>
                <th className="px-5 py-3">Năm</th>
                <th className="px-5 py-3">Số nguồn</th>
                <th className="px-5 py-3">Lượt xem</th>
                <th className="px-5 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-line)]">
              {stats?.topMovies.map((movie) => (
                <tr key={movie.id} className="hover:bg-[#fafbfc]">
                  <td className="px-5 py-3 text-[11px] text-[#2878ee]">
                    #{movie.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#eaf1ff] text-[10px] font-bold text-[#2878ee]">
                        {movie.title.charAt(0)}
                      </span>
                      <strong className="text-[11px] text-[#4c4c5c]">
                        {movie.title}
                      </strong>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[11px]">
                    {movie.year || "Không có"}
                  </td>
                  <td className="px-5 py-3 text-[11px] font-bold">
                    {fmt(movie.sourceCount)}
                  </td>
                  <td className="px-5 py-3 text-[11px] font-bold">
                    {fmt(movie.views)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded px-2 py-1 text-[9px] font-bold ${movie.status === "hidden" ? "bg-slate-100 text-slate-500" : "bg-[#dff7f2] text-[#138d78]"}`}
                    >
                      {movie.status === "hidden" ? "Đã ẩn" : "Đang hiển thị"}
                    </span>
                  </td>
                </tr>
              ))}
              {!stats?.topMovies.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-[11px] text-[#9ba6b7]"
                  >
                    Chưa ghi nhận lượt xem trong khoảng này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-2">
        <ProviderHealthPanel />
        <PerformancePanel />
      </section>
    </div>
  );
}

function MiniVisual({
  kind,
  color,
  value,
}: {
  kind: string;
  color: string;
  value: number;
}) {
  if (kind === "donut")
    return (
      <div
        className="grid h-16 w-16 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${color} 0 ${Math.min(92, 35 + (value % 58))}%, var(--admin-chart-track) 0)`,
        }}
      >
        <span className="h-10 w-10 rounded-full bg-white" />
      </div>
    );
  if (kind === "bars")
    return (
      <div className="flex h-14 w-24 items-end gap-1">
        {[35, 52, 44, 66, 28, 16, 8, 12, 50, 72].map((height, index) => (
          <span
            key={index}
            className="flex-1 rounded-t-sm"
            style={{ height: `${height}%`, background: color }}
          />
        ))}
      </div>
    );
  return (
    <svg viewBox="0 0 120 48" className="h-12 w-28 overflow-visible">
      <polyline
        points="0,42 12,39 24,34 36,30 48,22 60,18 72,7 84,4 96,19 108,24 120,14"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Metric({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div>
      <p className="text-[11px] text-[#9ba6b7]">{label}</p>
      <strong className="mt-1 block text-[18px] font-semibold text-[#414459]">
        {value}
      </strong>
      <span className="mt-2 inline-flex rounded-full bg-[#dff7f2] px-2 py-0.5 text-[9px] font-bold text-[#138d78]">
        {change}
      </span>
    </div>
  );
}
function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      <span className="text-[#596174]">{label}</span>
      <strong className="ml-auto text-[#9ba6b7]">{value}</strong>
    </div>
  );
}
