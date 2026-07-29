"use client";

import { useState } from "react";
import {
  Users,
  Film,
  Eye,
  Radio,
  TrendingUp,
  Award,
  Calendar,
  Sparkles,
  RefreshCw,
} from "lucide-react";

// Mock Overview Data (connected via API in live environment)
const OVERVIEW_DATA = {
  totalUsers: 1428,
  totalMovies: 12850,
  viewsToday: 4890,
  viewsWeek: 34120,
  viewsMonth: 129400,
  activeWatchParties: 5,
  dailyViewsChart: [
    { date: "16/07", views: 2100 },
    { date: "17/07", views: 2450 },
    { date: "18/07", views: 3100 },
    { date: "19/07", views: 2800 },
    { date: "20/07", views: 3900 },
    { date: "21/07", views: 4200 },
    { date: "22/07", views: 3800 },
    { date: "23/07", views: 4100 },
    { date: "24/07", views: 4600 },
    { date: "25/07", views: 5200 },
    { date: "26/07", views: 4900 },
    { date: "27/07", views: 5400 },
    { date: "28/07", views: 4890 },
  ],
  top10WeeklyMovies: [
    { rank: 1, title: "Bố Già", year: 2021, type: "Phim Lẻ", views: 8940, poster: "https://img.phimapi.com/upload/vod/20240101/bo-gia.jpg" },
    { rank: 2, title: "Bọ Ngựa (Queen Mantis)", year: 2025, type: "Phim Bộ", views: 6420, poster: "https://img.phimapi.com/upload/vod/20250101/bo-ngua.jpg" },
    { rank: 3, title: "Bóng Ma Báo Thù", year: 2026, type: "Phim Bộ", views: 5120, poster: "https://img.phimapi.com/upload/vod/20260101/bong-ma.jpg" },
    { rank: 4, title: "Bố Vợ Tôi Là Mafia", year: 2026, type: "Phim Bộ", views: 4980, poster: "https://img.phimapi.com/upload/vod/20260101/bo-vo.jpg" },
    { rank: 5, title: "Dáng Say Tựa Đoá Bách Hợp", year: 2026, type: "Phim Lẻ", views: 4210, poster: "" },
    { rank: 6, title: "One Piece Film Red", year: 2022, type: "Hoạt Hình", views: 3890, poster: "" },
    { rank: 7, title: "Chuyến Tàu Sinh Tử", year: 2016, type: "Phim Lẻ", views: 3540, poster: "" },
    { rank: 8, title: "Biệt Đội Marvel", year: 2023, type: "Phim Lẻ", views: 3200, poster: "" },
    { rank: 9, title: "Naruto Shippuden", year: 2017, type: "Hoạt Hình", views: 2980, poster: "" },
    { rank: 10, title: "Dragon Ball Super", year: 2018, type: "Hoạt Hình", views: 2750, poster: "" },
  ],
};

export default function AdminDashboardPage() {
  const [chartDays, setChartDays] = useState<7 | 14>(14);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const maxViews = Math.max(...OVERVIEW_DATA.dailyViewsChart.map((d) => d.views));

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── Top Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#30363d] pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Dashboard Tổng Quan</span>
            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-medium">
              GIAI ĐOẠN 1
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Giám sát số liệu hệ thống, lưu lượng xem và bảng xếp hạng phim realtime
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-[#161b22] hover:bg-[#21262d] text-neutral-300 hover:text-white border border-[#30363d] text-xs font-semibold px-4 py-2 rounded-lg transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin text-blue-400" : ""} />
          <span>Cập nhật số liệu</span>
        </button>
      </div>

      {/* ── Item 1: Core Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold">Tổng Người Dùng</span>
            <Users size={18} className="text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {OVERVIEW_DATA.totalUsers.toLocaleString("vi-VN")}
          </div>
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp size={12} /> +12.4% so với tháng trước
          </p>
        </div>

        {/* Total Movies */}
        <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold">Tổng Phim Hệ Thống</span>
            <Film size={18} className="text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {OVERVIEW_DATA.totalMovies.toLocaleString("vi-VN")}
          </div>
          <p className="text-[11px] text-neutral-400 font-medium">
            Tự động đồng bộ từ 3 nguồn API
          </p>
        </div>

        {/* Today/Week Views */}
        <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold">Lượt Xem Hôm Nay</span>
            <Eye size={18} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {OVERVIEW_DATA.viewsToday.toLocaleString("vi-VN")}
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-[#21262d]">
            <span>Tuần này: <strong>{OVERVIEW_DATA.viewsWeek.toLocaleString("vi-VN")}</strong></span>
            <span>Tháng: <strong>{(OVERVIEW_DATA.viewsMonth / 1000).toFixed(0)}k</strong></span>
          </div>
        </div>

        {/* Active Watch Parties */}
        <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold">Phòng Xem Chung (Active)</span>
            <Radio size={18} className="text-rose-400 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>{OVERVIEW_DATA.activeWatchParties}</span>
            <span className="text-xs font-normal text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              Live Now
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 font-medium">
            28 thành viên đang trực tuyến xem cùng nhau
          </p>
        </div>
      </div>

      {/* ── Item 1.2: Daily Views Chart ── */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-400" />
              Biểu Đồ Lượt Xem Theo Ngày
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Thống kê tổng lượt xem từng ngày trong 14 ngày gần nhất
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
            <button
              onClick={() => setChartDays(7)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                chartDays === 7
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              7 ngày
            </button>
            <button
              onClick={() => setChartDays(14)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                chartDays === 14
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              14 ngày
            </button>
          </div>
        </div>

        {/* Minimalist SVG Bar Chart */}
        <div className="pt-4 pb-2">
          <div className="h-48 flex items-end justify-between gap-2 border-b border-[#30363d] pb-2 px-2">
            {OVERVIEW_DATA.dailyViewsChart
              .slice(chartDays === 7 ? 7 : 0)
              .map((item, idx) => {
                const heightPercent = Math.round((item.views / maxViews) * 100);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 border border-[#30363d] text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap mb-1">
                      {item.views.toLocaleString("vi-VN")} lượt xem
                    </div>
                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[28px] bg-blue-600 hover:bg-blue-500 rounded-t transition-all duration-300 cursor-pointer"
                    />
                    {/* Date label */}
                    <span className="text-[10px] text-neutral-500 font-mono group-hover:text-neutral-300">
                      {item.date}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── Item 1.3: Top 10 Most Viewed Movies Weekly ── */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award size={16} className="text-amber-400" />
              Top 10 Phim Xem Nhiều Nhất Trong Tuần
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Xếp hạng dựa trên dữ liệu ViewLog thực tế từ người dùng
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#30363d] text-neutral-400 uppercase text-[10px] tracking-wider bg-[#0d1117]/50">
                <th className="py-3 px-4 font-bold w-16">Hạng</th>
                <th className="py-3 px-4 font-bold">Tên Phim</th>
                <th className="py-3 px-4 font-bold w-24">Năm</th>
                <th className="py-3 px-4 font-bold w-28">Loại Phim</th>
                <th className="py-3 px-4 font-bold w-36 text-right">Lượt Xem Tuần</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {OVERVIEW_DATA.top10WeeklyMovies.map((movie) => (
                <tr key={movie.rank} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-extrabold text-neutral-400">
                    {movie.rank <= 3 ? (
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-black text-white ${
                        movie.rank === 1 ? "bg-amber-500" : movie.rank === 2 ? "bg-neutral-400" : "bg-amber-700"
                      }`}>
                        {movie.rank}
                      </span>
                    ) : (
                      <span className="ml-2">#{movie.rank}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-11 bg-neutral-800 rounded overflow-hidden shrink-0 border border-white/10">
                        {movie.poster ? (
                          <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-600">
                            🎬
                          </div>
                        )}
                      </div>
                      <span>{movie.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-neutral-400 font-mono">{movie.year}</td>
                  <td className="py-3 px-4 text-neutral-300 font-medium">{movie.type}</td>
                  <td className="py-3 px-4 font-extrabold text-blue-400 text-right font-mono">
                    {movie.views.toLocaleString("vi-VN")} lượt
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
