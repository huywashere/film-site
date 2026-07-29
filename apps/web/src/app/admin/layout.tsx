"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  Users,
  ShieldAlert,
  Activity,
  Radio,
  Settings,
  ChevronRight,
  LogOut,
  SlidersHorizontal,
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/movies", label: "Quản lý Phim", icon: Film },
  { href: "/admin/users", label: "Quản lý Người dùng", icon: Users },
  {
    href: "/admin/system",
    label: "Trạng thái Hệ thống",
    icon: Activity,
    badge: "Giai đoạn 2",
  },
  {
    href: "/admin/watch-party",
    label: "Quản lý Watch Party",
    icon: Radio,
    badge: "Giai đoạn 2",
  },
  {
    href: "/admin/homepage",
    label: "Cấu hình Trang chủ",
    icon: SlidersHorizontal,
    badge: "Giai đoạn 2",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0d1117] text-neutral-200 flex flex-col md:flex-row font-sans select-none">
      {/* ── Left Sidebar Navigation ── */}
      <aside className="w-full md:w-64 bg-[#161b22] border-b md:border-b-0 md:border-r border-white/10 flex flex-col shrink-0">
        {/* Admin Brand Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow">
              A
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-wide leading-none">
                CineVerse Admin
              </h2>
              <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
                Control Panel
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-sm font-bold"
                    : "text-neutral-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={16}
                    className={
                      active
                        ? "text-white"
                        : "text-neutral-400 group-hover:text-white"
                    }
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="text-[9px] bg-white/10 text-neutral-400 px-1.5 py-0.5 rounded font-mono">
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight
                    size={13}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity ${active ? "opacity-100" : ""}`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin User Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0d1117]/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
              AD
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">
                Administrator
              </p>
              <p className="text-[10px] text-neutral-400 truncate">
                admin@cineverse.com
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Thoát Admin về Website"
          >
            <LogOut size={15} />
          </Link>
        </div>
      </aside>

      {/* ── Main Admin Content Area ── */}
      <main className="flex-1 min-w-0 bg-[#0d1117] p-6 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
