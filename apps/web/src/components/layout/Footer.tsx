"use client";
import Link from "next/link";
import { useTranslation } from "@/store/langStore";
import {
  Film,
  Tv2,
  Star,
  Github,
  Twitter,
  Facebook,
  Youtube,
  Heart,
  Sparkles,
} from "lucide-react";
import { ScrollingFilmBanner } from "./ScrollingFilmBanner";

const NAV_COLS = [
  {
    title: "Duyệt Phim",
    links: [
      { href: "/films/series", label: "Phim Bộ" },
      { href: "/films/single", label: "Phim Lẻ" },
      { href: "/films/hoathinh", label: "Hoạt Hình / Anime" },
      { href: "/films/tvshows", label: "TV Shows" },
    ],
  },
  {
    title: "Thể Loại Nổi Bật",
    links: [
      { href: "/genre/hanh-dong", label: "Hành Động" },
      { href: "/genre/kinh-di", label: "Kinh Dị" },
      { href: "/genre/tinh-cam", label: "Tình Cảm" },
      { href: "/genre/hai-huoc", label: "Hài Hước" },
      { href: "/genre/vien-tuong", label: "Viễn Tưởng" },
    ],
  },
  {
    title: "Tiện Ích Cá Nhân",
    links: [
      { href: "/search", label: "Tìm Kiếm Phim" },
      { href: "/watchlist", label: "Danh Sách Theo Dõi" },
      { href: "/settings/security", label: "Cài Đặt Tài Khoản" },
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
  const { lang, setLang } = useTranslation();

  return (
    <footer className="bg-[#101418] text-neutral-400 border-t border-white/10 mt-0 font-sans">
      {/* ── Marquee Film Banner ── */}
      <ScrollingFilmBanner />

      {/* ── Main Footer Body ── */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-black text-lg group-hover:bg-white/20 transition-all">
                C
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-neutral-200 transition-colors">
                  CineVerse
                </span>
                <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-neutral-500">
                  Cinema Experience
                </span>
              </div>
            </Link>

            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm font-normal">
              Nền tảng xem phim trực tuyến hiện đại với tốc độ phát cực nhanh,
              kho phim bom tấn đa dạng và giao diện thiết kế chuẩn điện ảnh.
            </p>

            {/* Social Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all duration-200"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav Columns */}
          {NAV_COLS.map((col) => (
            <div key={col.title} className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                {col.title}
              </h4>
              <ul className="space-y-2 text-xs font-medium text-neutral-400">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="hover:text-white transition-colors inline-block py-0.5"
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

      {/* ── Bottom Bar ── */}
      <div className="border-t border-white/10 py-4 bg-[#0b0e11]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 font-medium">
          <p>
            © {new Date().getFullYear()} CineVerse Platform. Tất cả quyền được
            bảo lưu.
          </p>
          <div className="flex items-center space-x-5 text-neutral-400 text-xs">
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              Chính sách bảo mật
            </Link>
            <span className="text-neutral-700">•</span>
            <Link href="/terms" className="hover:text-white transition-colors">
              Điều khoản dịch vụ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
