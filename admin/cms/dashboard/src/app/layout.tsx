"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  Users,
  Activity,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  LogOut,
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/movies", label: "Quản lý Phim", icon: Film },
  { href: "/users", label: "Quản lý Người dùng", icon: Users },
  { href: "/system", label: "Trạng thái Hệ thống", icon: Activity, badge: "Giai đoạn 2" },
  { href: "/watch-party", label: "Quản lý Watch Party", icon: Radio, badge: "Giai đoạn 2" },
  { href: "/homepage", label: "Cấu hình Trang chủ", icon: SlidersHorizontal, badge: "Giai đoạn 2" },
];

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="vi">
      <head>
        <title>CineVerse Admin Panel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-[#0d1117] text-neutral-200 flex flex-col md:flex-row font-sans select-none antialiased">
        {/* ── Left Sidebar ── */}
        <aside className="w-full md:w-64 bg-[#161b22] border-b md:border-b-0 md:border-r border-[#30363d] flex flex-col shrink-0">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#30363d] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow">
                A
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide leading-none">
                  CineVerse Admin
                </h2>
                <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
                  CMS Control Panel
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
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
                      className={active ? "text-white" : "text-neutral-400 group-hover:text-white"}
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
                      className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                        active ? "opacity-100" : ""
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer User Info */}
          <div className="p-4 border-t border-[#30363d] bg-[#0d1117]/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                AD
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">Administrator</p>
                <p className="text-[10px] text-neutral-400 truncate">admin@cineverse.com</p>
              </div>
            </div>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Về Website User"
            >
              <LogOut size={15} />
            </a>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="flex-1 min-w-0 bg-[#0d1117] p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
