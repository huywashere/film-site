"use client";
import Link from "next/link";
import { Github, Twitter, Facebook, Youtube } from "lucide-react";
import { ScrollingFilmBanner } from "./ScrollingFilmBanner";

const NAV_COLS = [
  {
    title: "Khám Phá",
    links: [
      { href: "/films/series", label: "Phim Bộ" },
      { href: "/films/single", label: "Phim Lẻ" },
      { href: "/films/hoathinh", label: "Hoạt Hình" },
      { href: "/films/tvshows", label: "TV Shows" },
    ],
  },
  {
    title: "Thể Loại",
    links: [
      { href: "/genre/hanh-dong", label: "Hành Động" },
      { href: "/genre/kinh-di", label: "Kinh Dị" },
      { href: "/genre/tinh-cam", label: "Tình Cảm" },
      { href: "/genre/hai-huoc", label: "Hài Hước" },
      { href: "/genre/vien-tuong", label: "Viễn Tưởng" },
    ],
  },
  {
    title: "Tài Khoản",
    links: [
      { href: "/search", label: "Tìm Kiếm" },
      { href: "/watchlist", label: "Danh Sách Xem" },
      { href: "/history", label: "Lịch Sử" },
      { href: "/settings/security", label: "Cài Đặt" },
    ],
  },
];

const SOCIALS = [
  { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
  { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { icon: Github, href: "https://github.com", label: "GitHub" },
];

export function Footer() {
  return (
    <footer className="relative bg-[#0d1014] text-neutral-400 font-sans overflow-hidden">
      {/* ── Ambient glow top ── */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* ── Marquee Film Banner ── */}
      <ScrollingFilmBanner />

      {/* ── Main Body ── */}
      <div className="max-w-7xl mx-auto px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-20">

          {/* Left — Brand block */}
          <div className="space-y-6 max-w-xs">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-800" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-black text-lg tracking-tighter leading-none">C</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[17px] font-extrabold tracking-tight text-white leading-none group-hover:text-neutral-100 transition-colors">
                  CineVerse
                </span>
                <span className="text-[9px] uppercase tracking-[0.22em] text-neutral-600 font-semibold">
                  Cinema Experience
                </span>
              </div>
            </Link>

            {/* Tagline */}
            <p className="text-[13px] text-neutral-500 leading-relaxed">
              Nền tảng xem phim trực tuyến với kho phim bom tấn đa dạng và tốc độ phát cực nhanh.
            </p>

            {/* Socials */}
            <div className="flex items-center gap-2">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg border border-white/8 flex items-center justify-center text-neutral-500 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all duration-200 active:scale-95"
                >
                  <Icon size={13} strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          {/* Right — Nav columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12">
            {NAV_COLS.map((col) => (
              <div key={col.title} className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  {col.title}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-neutral-400 hover:text-white transition-colors duration-150 inline-block"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* ── Bottom bar ── */}
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[12px] text-neutral-600">
          &copy; {new Date().getFullYear()} CineVerse. Tất cả quyền được bảo lưu.
        </p>
        <div className="flex items-center gap-5 text-[12px] text-neutral-600">
          <Link href="/privacy" className="hover:text-neutral-300 transition-colors">
            Chính sách bảo mật
          </Link>
          <span className="text-neutral-800">·</span>
          <Link href="/terms" className="hover:text-neutral-300 transition-colors">
            Điều khoản dịch vụ
          </Link>
        </div>
      </div>
    </footer>
  );
}
