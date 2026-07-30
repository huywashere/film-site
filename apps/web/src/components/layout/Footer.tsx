"use client";

import Link from "next/link";
import { Play } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-[#07080a] text-neutral-400 font-sans border-t border-white/10 py-8 px-6 lg:pl-28 md:px-12 z-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Minimal Brand & Copyright */}
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Play
                size={13}
                fill="currentColor"
                className="text-white ml-0.5"
              />
            </div>
            <span className="text-sm font-black tracking-tight text-white uppercase">
              cineverse
            </span>
          </Link>
          <span className="text-neutral-600">|</span>
          <p className="text-xs text-neutral-400 font-medium">
            © {new Date().getFullYear()} CineVerse. Xem phim 4K miễn phí.
          </p>
        </div>

        {/* Right: Minimal Footer Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400 font-medium">
          <Link href="/films" className="hover:text-white transition-colors">
            Tất cả phim
          </Link>
          <Link
            href="/films/series"
            className="hover:text-white transition-colors"
          >
            Phim bộ
          </Link>
          <Link
            href="/films/single"
            className="hover:text-white transition-colors"
          >
            Phim lẻ
          </Link>
          <Link
            href="/films/hoat-hinh"
            className="hover:text-white transition-colors"
          >
            Hoạt hình
          </Link>
          <Link href="/privacy" className="hover:text-white transition-colors">
            Quyền riêng tư
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            Điều khoản
          </Link>
        </div>
      </div>
    </footer>
  );
}
