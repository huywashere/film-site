"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CirclePlay,
  Database,
  Eye,
  Film,
  MoreHorizontal,
  RefreshCw,
  ServerCog,
  TrendingUp,
  Users,
} from "lucide-react";
import { ProviderHealthPanel } from "@/components/ProviderHealthPanel";
import { PerformancePanel } from "@/components/PerformancePanel";

const TRAFFIC = [38, 45, 49, 47, 56, 62, 59, 66, 63, 72, 69, 76];
const CONTENT_SHARE = [44, 29, 17, 10];
const ACTIVITY = [
  {
    title: "Đồng bộ nguồn OPhim hoàn tất",
    detail: "1.284 bản ghi đã được kiểm tra",
    time: "8 phút trước",
    icon: Database,
    tone: "blue",
  },
  {
    title: "Tài khoản mới được xác thực",
    detail: "nguyen.minh@cineverse.vn",
    time: "21 phút trước",
    icon: Users,
    tone: "emerald",
  },
  {
    title: "Nguồn NguonC cần kiểm tra",
    detail: "Tỷ lệ phản hồi thấp hơn ngưỡng",
    time: "42 phút trước",
    icon: ServerCog,
    tone: "amber",
  },
  {
    title: "Phim được đưa về bản nháp",
    detail: "Lãnh Chúa Vùng Đất Không Cư Dân",
    time: "1 giờ trước",
    icon: Film,
    tone: "rose",
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function MiniTrend({
  values,
  color = "#246bfe",
}: {
  values: number[];
  color?: string;
}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 26 - ((value - min) / Math.max(max - min, 1)) * 21;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 30"
      className="h-9 w-24 overflow-visible"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatCard({
  label,
  value,
  delta,
  down,
  icon: Icon,
  chart,
  chartColor,
}: {
  label: string;
  value: string;
  delta: string;
  down?: boolean;
  icon: typeof Users;
  chart: number[];
  chartColor?: string;
}) {
  return (
    <section className="admin-card min-w-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf3ff] text-[var(--admin-brand)]">
          <Icon size={19} />
        </span>
        <MiniTrend values={chart} color={chartColor} />
      </div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[.08em] text-slate-400">
        {label}
      </p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <strong className="text-[25px] font-bold tracking-[-.04em] text-slate-800">
          {value}
        </strong>
        <span
          className={`mb-1 inline-flex items-center gap-0.5 text-[11px] font-semibold ${down ? "text-rose-500" : "text-emerald-600"}`}
        >
          {down ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
          {delta}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">so với kỳ trước</p>
    </section>
  );
}

export default function AdminDashboardPage() {
  const [range, setRange] = useState<"7D" | "30D" | "12T">("30D");
  const [refreshing, setRefreshing] = useState(false);
  const chartData = useMemo(
    () =>
      range === "7D"
        ? TRAFFIC.slice(-7)
        : range === "12T"
          ? TRAFFIC
          : [...TRAFFIC, 71, 79, 83, 78, 88, 91],
    [range],
  );
  const chartMax = Math.max(...chartData);

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 620);
  };

  return (
    <div className="admin-fade-in space-y-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span>Dashboard</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Tổng quan</span>
          </div>
          <h1 className="mt-2 text-[28px] font-bold tracking-[-.045em] text-slate-800 sm:text-[32px]">
            Chào buổi sáng, Admin
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Đây là nhịp vận hành CineVerse trong hôm nay.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-[12px] text-slate-500 sm:inline-flex">
            <CalendarDays size={15} className="text-slate-400" /> 02 tháng 08,
            2026
          </span>
          <button
            onClick={refresh}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--admin-brand)] px-3.5 text-[12px] font-semibold text-white shadow-[0_6px_14px_rgba(36,107,254,.18)] transition-colors hover:bg-[var(--admin-brand-strong)] disabled:opacity-70"
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Đang đồng bộ" : "Làm mới dữ liệu"}
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Người dùng hoạt động"
          value="24.680"
          delta="12,5%"
          icon={Users}
          chart={[10, 12, 15, 13, 17, 19, 24, 22, 25]}
        />
        <StatCard
          label="Lượt xem hôm nay"
          value="48.230"
          delta="8,2%"
          icon={Eye}
          chart={[8, 14, 12, 17, 19, 18, 25, 22, 30]}
          chartColor="#16a085"
        />
        <StatCard
          label="Phim trong thư viện"
          value="12.850"
          delta="3,1%"
          icon={Film}
          chart={[10, 10, 12, 14, 14, 16, 18, 20, 22]}
          chartColor="#8b5cf6"
        />
        <StatCard
          label="Tỷ lệ phát thành công"
          value="98,4%"
          delta="0,6%"
          icon={CirclePlay}
          chart={[15, 16, 15, 17, 16, 18, 19, 18, 20]}
          chartColor="#d58a18"
        />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.75fr)_minmax(330px,.8fr)]">
        <div className="admin-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4">
            <div>
              <h2 className="text-[14px] font-bold text-slate-800">
                Xu hướng lượt xem
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Tổng lượt phát hợp lệ theo thời gian
              </p>
            </div>
            <div className="flex rounded-lg bg-slate-100 p-1">
              {(["7D", "30D", "12T"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setRange(item)}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${range === item ? "bg-white text-[var(--admin-brand)] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-[180px_minmax(0,1fr)]">
            <div className="space-y-5 lg:border-r lg:border-[var(--admin-line)] lg:pr-5">
              <div>
                <p className="text-[11px] text-slate-400">Tổng lượt xem</p>
                <p className="mt-1 text-[25px] font-bold tracking-[-.04em] text-slate-800">
                  129.400
                </p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-1 text-[10px] font-bold text-emerald-700">
                  <TrendingUp size={11} /> 11,2%
                </span>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Thời gian xem TB</p>
                <p className="mt-1 text-[18px] font-bold text-slate-700">
                  38 phút
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  cao hơn 4 phút
                </p>
              </div>
              <div className="rounded-lg bg-[#f5f8ff] p-3">
                <p className="text-[10px] font-semibold text-blue-700">
                  Gợi ý vận hành
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Kiểm tra nguồn phát có tỷ lệ lỗi cao vào khung giờ tối.
                </p>
              </div>
            </div>
            <div className="relative min-w-0">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
              <div className="pointer-events-none absolute inset-x-0 top-[16%] border-t border-dashed border-slate-100" />
              <div className="pointer-events-none absolute inset-x-0 bottom-[17%] border-t border-dashed border-slate-100" />
              <div className="relative flex h-[246px] items-end justify-between gap-1.5 pt-6 sm:gap-3">
                {chartData.map((value, index) => (
                  <div
                    key={`${value}-${index}`}
                    className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="relative w-full max-w-[26px] rounded-t-md bg-gradient-to-t from-[#246bfe] to-[#81abff] transition-transform duration-200 group-hover:-translate-y-1"
                      style={{
                        height: `${Math.max(18, (value / chartMax) * 100)}%`,
                      }}
                    >
                      <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-white group-hover:block">
                        {value}k
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400">
                      {range === "12T" ? `T${index + 1}` : `${index + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
            <div>
              <h2 className="text-[14px] font-bold text-slate-800">
                Phân bổ nội dung
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Theo định dạng hiện có
              </p>
            </div>
            <button
              className="admin-icon-button !h-8 !w-8"
              aria-label="Tùy chọn biểu đồ"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="p-5">
            <div
              className="mx-auto grid h-44 w-44 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#246bfe 0 ${CONTENT_SHARE[0]}%, #14b8a6 ${CONTENT_SHARE[0]}% ${CONTENT_SHARE[0] + CONTENT_SHARE[1]}%, #8b5cf6 ${CONTENT_SHARE[0] + CONTENT_SHARE[1]}% ${CONTENT_SHARE[0] + CONTENT_SHARE[1] + CONTENT_SHARE[2]}%, #e8edf5 ${CONTENT_SHARE[0] + CONTENT_SHARE[1] + CONTENT_SHARE[2]}% 100%)`,
              }}
            >
              <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
                <span>
                  <strong className="block text-[25px] tracking-[-.04em] text-slate-800">
                    12,8k
                  </strong>
                  <small className="text-[10px] text-slate-400">
                    Tổng phim
                  </small>
                </span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-3 text-[11px]">
              {[
                ["Phim bộ", "44%", "bg-[#246bfe]"],
                ["Phim lẻ", "29%", "bg-[#14b8a6]"],
                ["Hoạt hình", "17%", "bg-[#8b5cf6]"],
                ["Khác", "10%", "bg-slate-200"],
              ].map(([label, percentage, color]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-500">
                    <i className={`h-2 w-2 rounded-full ${color}`} />
                    {label}
                  </span>
                  <strong className="text-slate-700">{percentage}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,.9fr)]">
        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
            <div>
              <h2 className="text-[14px] font-bold text-slate-800">
                Hoạt động gần đây
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Thay đổi quan trọng của hệ thống
              </p>
            </div>
            <button className="text-[11px] font-semibold text-[var(--admin-brand)] hover:text-[var(--admin-brand-strong)]">
              Xem nhật ký
            </button>
          </div>
          <div className="divide-y divide-[var(--admin-line)] px-5">
            {ACTIVITY.map(({ title, detail, time, icon: Icon, tone }) => (
              <div key={title} className="flex gap-3 py-4">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone === "blue" ? "bg-blue-50 text-blue-600" : tone === "emerald" ? "bg-emerald-50 text-emerald-600" : tone === "amber" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-500"}`}
                >
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-slate-700">
                    {title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">
                    {detail}
                  </p>
                </div>
                <span className="whitespace-nowrap pt-1 text-[10px] text-slate-400">
                  {time}
                </span>
              </div>
            ))}
          </div>
        </div>
        <ProviderHealthPanel />
      </section>

      <PerformancePanel />
    </div>
  );
}
