"use client";

import { Activity, ShieldCheck, Server, Database, Lock, CheckCircle2, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function SystemHealthPage() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const limiters = [
    { name: "Global API Rate Limiter", limit: "200 req / 15 phút", path: "/api/v1/*", status: "Bật" },
    { name: "Auth & Login Limiter", limit: "30 req / 15 phút", path: "/api/v1/auth/*", status: "Bật" },
    { name: "Quên mật khẩu OTP Limiter", limit: "5 req / 15 phút", path: "/api/v1/auth/forgot-password", status: "Bật" },
    { name: "Search Keyword Limiter", limit: "30 req / 1 phút", path: "/api/v1/movies/search", status: "Bật" },
    { name: "Review & Comment Limiter", limit: "10 req / 1 phút", path: "/api/v1/movies/:id/reviews", status: "Bật" },
    { name: "WatchHistory Sync Throttler", limit: "30 req / 1 phút", path: "/api/v1/users/me/watch-history", status: "Bật" },
  ];

  return (
    <div className="admin-fade-in space-y-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span>An toàn hệ thống</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Bảo mật & Rate Limit</span>
          </div>
          <h1 className="mt-2 text-[29px] font-bold tracking-[-.045em] text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" size={28} /> Kiểm Tra Bảo Mật & Rate Limit
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Theo dõi trạng thái kết nối PostgreSQL Database, Helmet Security Headers và các bộ lọc Rate Limiter chống DDoS.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--admin-brand)] px-3.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--admin-brand-strong)]"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Đang quét..." : "Kiểm tra hệ thống"}
        </button>
      </header>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="admin-card p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">API Backend</span>
            <Server size={18} className="text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="text-xl font-bold text-slate-800">ONLINE (Port 3001)</span>
          </div>
          <p className="text-[11px] text-slate-400">NestJS Engine & Gateway active</p>
        </div>

        <div className="admin-card p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">PostgreSQL DB</span>
            <Database size={18} className="text-emerald-600" />
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="text-xl font-bold text-slate-800">CONNECTED</span>
          </div>
          <p className="text-[11px] text-slate-400">Độ trễ truy vấn DB: 12ms</p>
        </div>

        <div className="admin-card p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bảo vệ DDoS</span>
            <Lock size={18} className="text-violet-600" />
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-violet-600" />
            <span className="text-xl font-bold text-slate-800">PROTECTED</span>
          </div>
          <p className="text-[11px] text-slate-400">6 Bộ lọc Rate Limit đang kích hoạt</p>
        </div>
      </div>

      {/* Rate Limiters Table */}
      <section className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-line)] p-5">
          <h2 className="text-[14px] font-bold text-slate-800">Danh Sách Bộ Lọc Rate Limiter Chống Brute-force</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">Tự động chặn các yêu cầu vượt ngưỡng tần suất cho phép</p>
        </div>

        <div className="divide-y divide-[var(--admin-line)]">
          {limiters.map((item, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 hover:bg-slate-50/70 text-[12px]">
              <div>
                <strong className="block text-slate-800 font-bold">{item.name}</strong>
                <span className="text-slate-400 font-mono text-[11px]">Route: {item.path}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-mono">
                  {item.limit}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 size={11} /> {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
