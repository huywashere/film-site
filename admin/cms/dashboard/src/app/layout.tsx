"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Bell,
  ChevronDown,
  Clapperboard,
  ExternalLink,
  Film,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Users,
  Radio,
  X,
} from "lucide-react";

const PRIMARY_NAV = [
  { href: "/", label: "Tổng quan", description: "Hoạt động hôm nay", icon: LayoutDashboard },
  { href: "/movies", label: "Thư viện phim", description: "Nội dung và nguồn", icon: Film },
  { href: "/users", label: "Người dùng", description: "Tài khoản DB & Phiên", icon: Users },
  { href: "/watch-party", label: "Watch Party", description: "Phòng Live WebSocket", icon: Radio },
  { href: "/system", label: "Bảo mật & Rate Limit", description: "Kiểm tra hệ thống", icon: ShieldCheck },
];

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [search, setSearch] = useState("");

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/movies?search=${encodeURIComponent(query)}` : "/movies");
    setMobileNavigationOpen(false);
  };

  return (
    <html lang="vi">
      <head>
        <title>CineVerse Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#182235" />
      </head>
      <body>
        <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
          <aside
            className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-[var(--admin-sidebar)] text-slate-200 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
              mobileNavigationOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            aria-label="Điều hướng quản trị"
          >
            <div className="flex h-[74px] items-center justify-between border-b border-white/10 px-5">
              <Link href="/" className="flex items-center gap-3" onClick={() => setMobileNavigationOpen(false)}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f8cff] to-[#1e56dd] shadow-[0_8px_18px_rgba(39,105,255,.28)]">
                  <Clapperboard size={19} strokeWidth={2.4} className="text-white" />
                </span>
                <span>
                  <span className="block text-[17px] font-bold tracking-[-.03em] text-white">cineverse</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">control room</span>
                </span>
              </Link>
              <button className="lg:hidden admin-icon-button !text-slate-300 hover:!bg-white/10 hover:!text-white" onClick={() => setMobileNavigationOpen(false)} aria-label="Đóng menu">
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-6">
              <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.15em] text-slate-500">Vận hành</p>
              <div className="space-y-1">
                {PRIMARY_NAV.map(({ href, label, description, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileNavigationOpen(false)}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                        active ? "bg-[#2a3a55] text-white" : "text-slate-400 hover:bg-white/[.055] hover:text-slate-100"
                      }`}
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? "bg-[#3b75e9] text-white" : "text-slate-400 group-hover:bg-white/10 group-hover:text-slate-100"}`}>
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold">{label}</span>
                        <span className={`mt-0.5 block text-[10px] ${active ? "text-blue-200" : "text-slate-500"}`}>{description}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-8 border-t border-white/[.08] pt-6">
                <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.15em] text-slate-500">An toàn hệ thống</p>
                <div className="mx-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[.06] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><ShieldCheck size={15} /> Bảo vệ đang bật</div>
                  <p className="mt-1 text-[11px] leading-4 text-slate-400">Quyền quản trị được kiểm soát theo vai trò.</p>
                </div>
              </div>
            </nav>

            <div className="border-t border-white/[.08] p-3">
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-rose-400 text-[11px] font-bold text-slate-800">AD</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">Administrator</span><span className="block truncate text-[10px] text-slate-500">admin@cineverse.vn</span></span>
                <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="text-slate-500 transition-colors hover:text-white" title="Mở trang CineVerse"><ExternalLink size={15} /></a>
              </div>
            </div>
          </aside>

          {mobileNavigationOpen && <button aria-label="Đóng menu" className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[1px] lg:hidden" onClick={() => setMobileNavigationOpen(false)} />}

          <div className="min-w-0">
            <header className="sticky top-0 z-20 h-[74px] border-b border-[var(--admin-line)] bg-white/90 backdrop-blur-xl">
              <div className="mx-auto flex h-full max-w-[1700px] items-center gap-3 px-4 sm:px-6 lg:px-8">
                <button className="admin-icon-button lg:hidden" onClick={() => setMobileNavigationOpen(true)} aria-label="Mở menu"><Menu size={20} /></button>
                <form onSubmit={submitSearch} className="relative hidden w-full max-w-[310px] sm:block">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} className="admin-control w-full bg-[#f5f7fb] pl-9 pr-3 text-[12px] placeholder:text-slate-400" placeholder="Tìm phim hoặc mã nội dung..." aria-label="Tìm phim" />
                </form>
                <div className="ml-auto flex items-center gap-1 sm:gap-2">
                  <span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 md:inline-flex">Production</span>
                  <button className="admin-icon-button relative" aria-label="Thông báo"><Bell size={18} /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" /></button>
                  <div className="hidden h-7 w-px bg-[var(--admin-line)] sm:block" />
                  <button className="flex items-center gap-2 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-slate-50" aria-label="Mở menu tài khoản">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-rose-400 text-[11px] font-bold text-slate-800">AD</span>
                    <span className="hidden sm:block"><span className="block text-[12px] font-semibold leading-4 text-slate-700">Administrator</span><span className="block text-[10px] text-slate-400">Quản trị viên</span></span>
                    <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
                  </button>
                </div>
              </div>
            </header>

            <main className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
