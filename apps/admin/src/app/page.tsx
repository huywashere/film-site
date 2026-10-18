"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBolt,
  IconBuildingBank,
  IconCalendar,
  IconCreditCard,
  IconDotsVertical,
  IconEye,
  IconGridDots,
  IconMovie,
  IconRefresh,
  IconSettings,
  IconShoppingBag,
  IconSparkles,
  IconTrendingDown,
  IconTrendingUp,
  IconUsers,
  IconWallet,
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
  const [showConfigModal, setShowConfigModal] = useState(false);

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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const maxViews = useMemo(
    () =>
      Math.max(1, ...(stats?.dailyChartData.map((item) => item.views) || [1])),
    [stats],
  );

  return (
    <div className="admin-fade-in space-y-6 pb-12">
      {/* Top Banner Alert (if error) */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Row 1: Analytics Hero Banner (2 cols) + Weekly Sales (1 col) + Purchase Orders (1 col) */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {/* Card 1: Analytics Dashboard Hero (spans 2 cols) */}
        <div className="admin-card lg:col-span-2 relative overflow-hidden p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-4 max-w-sm">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-slate-900 dark:text-white">
                  Analytics Dashboard
                </h2>
                <p className="text-[13px] text-slate-400">
                  Check all the statistics
                </p>
              </div>

              <div className="flex items-center gap-8 pt-2">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">
                    Earnings (Lượt xem)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                      ${fmt(stats?.viewsToday ? stats.viewsToday * 1.5 : 27850)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60">
                      +18%
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">
                    Expense (Chi phí hạ tầng)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                      ${fmt(stats?.activeUsers ? stats.activeUsers * 12 : 18453)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 text-[10.5px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60">
                      -5%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vector Illustration mimicking ShadcnSpace desk scene */}
            <div className="relative shrink-0 w-44 h-36 hidden sm:block">
              <svg
                viewBox="0 0 180 150"
                className="w-full h-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Desk */}
                <rect x="25" y="105" width="130" height="6" rx="3" fill="#1e293b" />
                <rect x="35" y="111" width="6" height="34" rx="2" fill="#64748b" />
                <rect x="139" y="111" width="6" height="34" rx="2" fill="#64748b" />
                {/* Laptop */}
                <path d="M68 95 L112 95 L116 105 L64 105 Z" fill="#475569" />
                <rect x="70" y="72" width="40" height="23" rx="2" fill="#0f172a" />
                <rect x="73" y="75" width="34" height="17" rx="1" fill="#38bdf8" />
                {/* Character */}
                <circle cx="90" cy="40" r="14" fill="#fbcfe8" />
                <path d="M82 32 C82 25, 98 25, 98 32 C98 35, 90 35, 82 32 Z" fill="#0f172a" />
                {/* Hair bun / cap */}
                <circle cx="90" cy="27" r="6" fill="#0f172a" />
                {/* Glasses / Phone */}
                <circle cx="86" cy="40" r="3" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx="94" cy="40" r="3" stroke="#0f172a" strokeWidth="1.5" />
                <rect x="99" y="38" width="4" height="8" rx="1" fill="#10b981" />
                {/* Body / Shirt */}
                <path d="M72 58 C72 52, 108 52, 108 58 L114 96 L66 96 Z" fill="#0d9488" />
                {/* Arms */}
                <path d="M72 62 L60 84 L76 92" stroke="#0d9488" strokeWidth="6" strokeLinecap="round" />
                <path d="M108 62 L118 78 L98 88" stroke="#0d9488" strokeWidth="6" strokeLinecap="round" />
                {/* Chair back */}
                <rect x="76" y="55" width="28" height="42" rx="4" fill="#334155" />
                {/* Desk Mug */}
                <rect x="122" y="93" width="9" height="12" rx="2" fill="#f59e0b" />
                <path d="M131 96 C134 96, 134 101, 131 101" stroke="#f59e0b" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Weekly Sales */}
        <div className="admin-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
              Weekly Sales
            </span>
            <div className="h-10 w-10 rounded-full border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <IconCalendar size={18} stroke={1.8} />
            </div>
          </div>

          <div className="space-y-1 my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                ${fmt(stats?.viewsWeek ? Math.round(stats.viewsWeek / 2) : 4587)}
              </span>
              <span className="inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                -15%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">So với tuần trước</p>
          </div>

          <Link
            href="/analytics"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white transition-colors pt-2 border-t border-slate-100 dark:border-slate-800"
          >
            <span>See Report</span>
            <IconArrowRight size={14} />
          </Link>
        </div>

        {/* Card 3: Purchase Orders */}
        <div className="admin-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
              Purchase Orders
            </span>
            <div className="h-10 w-10 rounded-full border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <IconShoppingBag size={18} stroke={1.8} />
            </div>
          </div>

          <div className="space-y-1 my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                {stats?.totalMovies ? fmt(stats.totalMovies) : "230"}
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                +10%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Nội dung đã index</p>
          </div>

          <Link
            href="/movies"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white transition-colors pt-2 border-t border-slate-100 dark:border-slate-800"
          >
            <span>See Report</span>
            <IconArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Row 2: Revenue Updates (2 cols) + Monthly Earnings (1 col) + Yearly Backup (1 col) */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {/* Card 4: Revenue Updates (Grouped Bar Chart) */}
        <div className="admin-card lg:col-span-2 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
                Revenue Updates
              </h3>
              <p className="text-[12px] text-slate-400">Overview of profit</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="14d">Year 2026</option>
                <option value="30d">30 ngày qua</option>
                <option value="6m">6 tháng qua</option>
                <option value="1y">1 năm qua</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6 items-center">
            {/* Grouped Bar Chart mimicking the screenshot */}
            <div className="relative h-56 flex flex-col justify-between">
              {/* Y-axis grid ticks */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-4">3k</span>
                  <div className="h-px flex-1 border-t border-slate-100 dark:border-slate-800" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4">2k</span>
                  <div className="h-px flex-1 border-t border-slate-100 dark:border-slate-800" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4">1k</span>
                  <div className="h-px flex-1 border-t border-slate-100 dark:border-slate-800" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 font-semibold text-slate-600 dark:text-slate-300">0k</span>
                  <div className="h-px flex-1 border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4">-1k</span>
                  <div className="h-px flex-1 border-t border-slate-100 dark:border-slate-800" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4">-2k</span>
                  <div className="h-px flex-1 border-t border-slate-100 dark:border-slate-800" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4">-3k</span>
                  <div className="h-px flex-1 border-t border-slate-100 dark:border-slate-800" />
                </div>
              </div>

              {/* Bars container */}
              <div className="relative z-10 ml-6 flex h-full items-center justify-around pb-5">
                {[
                  { date: "16/08", pos: 70, neg: 25 },
                  { date: "17/08", pos: 95, neg: 40 },
                  { date: "18/08", pos: 80, neg: 65 },
                  { date: "19/08", pos: 110, neg: 35 },
                  { date: "20/08", pos: 60, neg: 20 },
                  { date: "21/08", pos: 45, neg: 15 },
                  { date: "22/08", pos: 75, neg: 30 },
                ].map((col) => (
                  <div
                    key={col.date}
                    className="flex flex-col items-center h-full justify-center group relative"
                  >
                    {/* Top Bar (Light Slate/Gray) */}
                    <div className="h-1/2 flex items-end">
                      <span
                        className="w-2.5 rounded-t-sm bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400 dark:group-hover:bg-slate-500 transition-colors"
                        style={{ height: `${col.pos * 0.75}px` }}
                      />
                    </div>
                    {/* Bottom Bar (Dark Black) */}
                    <div className="h-1/2 flex items-start">
                      <span
                        className="w-2.5 rounded-b-sm bg-black dark:bg-white group-hover:opacity-80 transition-opacity"
                        style={{ height: `${col.neg * 0.75}px` }}
                      />
                    </div>
                    {/* Date label */}
                    <span className="absolute -bottom-1 text-[9px] text-slate-400">
                      {col.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Summary column */}
            <div className="space-y-5 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 md:pl-6 pt-4 md:pt-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-700 dark:text-slate-300">
                  <IconGridDots size={20} />
                </div>
                <div>
                  <strong className="text-[20px] font-extrabold text-slate-900 dark:text-white block leading-tight">
                    ${fmt(stats?.rangeViews ? stats.rangeViews * 1.8 : 63489.5)}
                  </strong>
                  <span className="text-[11px] text-slate-400">Total Earnings</span>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <div>
                    <span className="text-[11px] text-slate-400 block leading-none">
                      Earnings this month
                    </span>
                    <strong className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                      $48,820
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-black dark:bg-white" />
                  <div>
                    <span className="text-[11px] text-slate-400 block leading-none">
                      Expense this month
                    </span>
                    <strong className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                      $26,498
                    </strong>
                  </div>
                </div>
              </div>

              <Link
                href="/analytics"
                className="inline-block w-full text-center rounded-lg bg-black text-white dark:bg-white dark:text-black py-2.5 text-[12px] font-semibold hover:opacity-90 transition-opacity"
              >
                View Full Report
              </Link>
            </div>
          </div>
        </div>

        {/* Card 5: Monthly Earnings */}
        <div className="admin-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                Monthly earnings
              </span>
              <div className="h-9 w-9 rounded-full border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <IconBolt size={17} />
              </div>
            </div>

            <div className="mt-3">
              <span className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white block">
                ${fmt(stats?.viewsMonth ? Math.round(stats.viewsMonth / 1.5) : 6820)}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  -8%
                </span>
                <span className="text-[11px] text-slate-400">than last year</span>
              </div>
            </div>
          </div>

          {/* Spline line chart curve with soft gradient fill */}
          <div className="h-20 w-full mt-4">
            <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="splineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 45 Q 30 15, 60 40 T 120 35 T 160 10 T 200 25 L 200 60 L 0 60 Z"
                fill="url(#splineGradient)"
              />
              <path
                d="M0 45 Q 30 15, 60 40 T 120 35 T 160 10 T 200 25"
                fill="none"
                stroke="#0f172a"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="dark:stroke-slate-200"
              />
            </svg>
          </div>
        </div>

        {/* Card 6: Yearly Backup */}
        <div className="admin-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
              Yearly Backup
            </span>
          </div>

          <div className="grid grid-cols-[1.1fr_1fr] items-center gap-3 my-2">
            <div>
              <span className="text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white block">
                ${fmt(stats?.totalUsers ? stats.totalUsers * 45 : 36358)}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  +9%
                </span>
                <span className="text-[11px] text-slate-400">last year</span>
              </div>

              <div className="flex items-center gap-3 mt-4 text-[11px]">
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  2024
                </span>
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  2025
                </span>
              </div>
            </div>

            {/* Teal and Orange Donut Chart */}
            <div className="relative w-24 h-24 mx-auto grid place-items-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {/* Background Ring */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="4"
                  className="dark:stroke-slate-800"
                />
                {/* Teal Segment (70%) */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="4"
                  strokeDasharray="72, 100"
                  strokeLinecap="round"
                />
                {/* Orange Segment (28%) */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="4"
                  strokeDasharray="24, 100"
                  strokeDashoffset="-74"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Dữ liệu đồng bộ đám mây
          </div>
        </div>
      </section>

      {/* Row 3: Weekly Stats + Sales from Locations + Recent Transactions */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Card 7: Weekly Stats */}
        <div className="admin-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
              Weekly Stats
            </h3>
            <p className="text-[12px] text-slate-400">Average sales & streams</p>
          </div>

          <div className="h-32 w-full my-3">
            <svg viewBox="0 0 200 80" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#64748b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 70 Q 40 70, 70 30 T 130 50 T 170 15 T 200 40 L 200 80 L 0 80 Z"
                fill="url(#areaGradient)"
              />
              <path
                d="M0 70 Q 40 70, 70 30 T 130 50 T 170 15 T 200 40"
                fill="none"
                stroke="#1e293b"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="dark:stroke-slate-200"
              />
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11.5px] pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Trung bình lượt xem</span>
            <strong className="text-slate-800 dark:text-slate-100">
              {fmt(stats?.viewsWeek ? Math.round(stats.viewsWeek / 7) : 1240)} / ngày
            </strong>
          </div>
        </div>

        {/* Card 8: Sales from Locations (Provider & CDN Health) */}
        <div className="admin-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
              Sales from Locations
            </h3>
            <p className="text-[12px] text-slate-400">This Year (Hạ tầng mạng)</p>
          </div>

          <div className="space-y-3.5 my-3">
            {[
              { name: "Việt Nam (VNPT / Viettel)", percent: 84, color: "bg-teal-500" },
              { name: "Hoa Kỳ (US CDN Edge)", percent: 62, color: "bg-indigo-500" },
              { name: "Singapore (Sea Relay)", percent: 45, color: "bg-orange-500" },
              { name: "Nhật Bản (Tokyo HLS)", percent: 28, color: "bg-blue-500" },
            ].map((loc) => (
              <div key={loc.name} className="space-y-1">
                <div className="flex justify-between text-[11.5px]">
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {loc.name}
                  </span>
                  <span className="text-slate-400">{loc.percent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${loc.color}`}
                    style={{ width: `${loc.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/system"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white transition-colors pt-2 border-t border-slate-100 dark:border-slate-800"
          >
            <span>Chi tiết hạ tầng máy chủ</span>
            <IconArrowRight size={13} />
          </Link>
        </div>

        {/* Card 9: Recent Transactions */}
        <div className="admin-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
                Recent Transactions
              </h3>
              <p className="text-[12px] text-slate-400">Hoạt động tài chính & hệ thống</p>
            </div>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Tùy chọn giao dịch"
            >
              <IconDotsVertical size={16} />
            </button>
          </div>

          <div className="space-y-3.5 my-3">
            {[
              {
                icon: IconBuildingBank,
                bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
                title: "PayPal Transfer",
                desc: "Money added",
                amount: "+$6,235",
              },
              {
                icon: IconWallet,
                bg: "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400",
                title: "Wallet",
                desc: "Big Brands",
                amount: "+$345",
              },
              {
                icon: IconCreditCard,
                bg: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400",
                title: "Credit Card",
                desc: "Money reversed",
                amount: "+$2,235",
              },
              {
                icon: IconBuildingBank,
                bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
                title: "Bank Transfer",
                desc: "Refund",
                amount: "+$320",
              },
            ].map((tx) => {
              const Icon = tx.icon;
              return (
                <div key={tx.title} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl grid place-items-center ${tx.bg}`}
                    >
                      <Icon size={18} stroke={1.8} />
                    </div>
                    <div>
                      <strong className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 block leading-tight">
                        {tx.title}
                      </strong>
                      <span className="text-[11px] text-slate-400">{tx.desc}</span>
                    </div>
                  </div>
                  <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">
                    {tx.amount}
                  </span>
                </div>
              );
            })}
          </div>

          <Link
            href="/audit"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white transition-colors pt-2 border-t border-slate-100 dark:border-slate-800"
          >
            <span>Xem nhật ký giao dịch</span>
            <IconArrowRight size={13} />
          </Link>
        </div>
      </section>

      {/* Row 4: Top Movies List + Provider & Performance Diagnostics */}
      <section className="admin-card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
              Phim được xem nhiều nhất
            </h3>
            <p className="text-[11.5px] text-slate-400">
              Thống kê lượt phát và nguồn streaming theo thời gian thực
            </p>
          </div>
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[11.5px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3">Mã phim</th>
                <th className="px-6 py-3">Tên phim</th>
                <th className="px-6 py-3">Năm</th>
                <th className="px-6 py-3">Số nguồn</th>
                <th className="px-6 py-3">Lượt xem</th>
                <th className="px-6 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[12.5px]">
              {stats?.topMovies.map((movie) => (
                <tr
                  key={movie.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">
                    #{movie.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                        {movie.title.charAt(0)}
                      </span>
                      <strong className="font-semibold text-slate-800 dark:text-slate-100">
                        {movie.title}
                      </strong>
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">
                    {movie.year || "N/A"}
                  </td>
                  <td className="px-6 py-3.5 font-bold text-slate-700 dark:text-slate-300">
                    {fmt(movie.sourceCount)}
                  </td>
                  <td className="px-6 py-3.5 font-extrabold text-slate-900 dark:text-white">
                    {fmt(movie.views)}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
                        movie.status === "hidden"
                          ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60"
                      }`}
                    >
                      {movie.status === "hidden" ? "Đã ẩn" : "Hoạt động"}
                    </span>
                  </td>
                </tr>
              ))}
              {!stats?.topMovies.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-400 text-[12px]"
                  >
                    Chưa ghi nhận lượt xem trong khoảng thời gian này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Row 5: Infrastructure Panels (Health & Cache Performance) */}
      <section className="grid gap-5 2xl:grid-cols-2">
        <ProviderHealthPanel />
        <PerformancePanel />
      </section>

      {/* Floating Gear Button (FAB) matching the bottom-right button in ShadcnSpace */}
      <button
        type="button"
        onClick={() => {
          window.location.href = "/configuration";
        }}
        className="fixed bottom-6 right-6 z-30 h-12 w-12 rounded-full bg-black text-white dark:bg-white dark:text-black shadow-xl grid place-items-center hover:scale-105 transition-all cursor-pointer border border-slate-700 dark:border-slate-300"
        aria-label="Mở cài đặt quản trị"
        title="Cài đặt hệ thống"
      >
        <IconSettings size={20} className="animate-spin-slow" />
      </button>
    </div>
  );
}
