'use client';
import Link from 'next/link';
import { useTranslation } from '@/store/langStore';
import { Film, Tv2, Star, Github, Twitter, Facebook, Youtube, Heart, Sparkles } from 'lucide-react';
import { ScrollingFilmBanner } from './ScrollingFilmBanner';

const NAV_COLS = [
  {
    title: 'Duyệt Phim',
    links: [
      { href: '/films/series', label: 'Phim Bộ' },
      { href: '/films/single', label: 'Phim Lẻ' },
      { href: '/films/hoathinh', label: 'Hoạt Hình / Anime' },
      { href: '/films/tvshows', label: 'TV Shows' },
    ],
  },
  {
    title: 'Thể Loại Nổi Bật',
    links: [
      { href: '/genre/hanh-dong', label: 'Hành Động' },
      { href: '/genre/kinh-di', label: 'Kinh Dị' },
      { href: '/genre/tinh-cam', label: 'Tình Cảm' },
      { href: '/genre/hai-huoc', label: 'Hài Hước' },
      { href: '/genre/vien-tuong', label: 'Viễn Tưởng' },
    ],
  },
  {
    title: 'Tiện Ích Cá Nhân',
    links: [
      { href: '/search', label: 'Tìm Kiếm Phim' },
      { href: '/watchlist', label: 'Danh Sách Theo Dõi' },
      { href: '/settings/security', label: 'Cài Đặt Tài Khoản' },
    ],
  },
];

const SOCIALS = [
  { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
  { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Github, href: 'https://github.com', label: 'GitHub' },
];

export function Footer() {
  const { lang, setLang } = useTranslation();

  return (
    <footer className="bg-[#14181c] text-neutral-300 border-t border-[#2c3440] mt-0 font-sans">
      {/* ── Marquee Film Banner ── */}
      <ScrollingFilmBanner />

      {/* ── Main Footer Body ── */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-[#00e054] text-black flex items-center justify-center font-black text-xl shadow-lg shadow-[#00e054]/20 group-hover:scale-105 transition-transform">
                C
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight text-white group-hover:text-[#00e054] transition-colors">
                  CineVerse
                </span>
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#00e054]">
                  Cinema Experience
                </span>
              </div>
            </Link>

            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm font-normal">
              Nền tảng xem phim trực tuyến hiện đại với tốc độ phát cực nhanh, kho phim bom tấn đa dạng và giao diện thiết kế chuẩn điện ảnh.
            </p>

            {/* Social Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl bg-[#1c2228] border border-[#2c3440] flex items-center justify-center text-neutral-400 hover:text-[#00e054] hover:border-[#00e054]/40 hover:bg-[#242c34] transition-all duration-200"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav Columns */}
          {NAV_COLS.map((col) => (
            <div key={col.title} className="space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-white border-l-2 border-[#00e054] pl-2.5">
                {col.title}
              </h4>
              <ul className="space-y-2 text-xs font-medium text-neutral-400">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="hover:text-[#00e054] transition-colors inline-block py-0.5"
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
      <div className="border-t border-[#2c3440]/60 py-5 bg-[#0e1114]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 font-medium">
          <p>© {new Date().getFullYear()} CineVerse Platform. Tất cả quyền được bảo lưu.</p>
          <div className="flex items-center space-x-6 text-neutral-400">
            <Link href="/privacy" className="hover:text-[#00e054] transition-colors">
              Chính sách bảo mật
            </Link>
            <span className="text-neutral-700">•</span>
            <Link href="/terms" className="hover:text-[#00e054] transition-colors">
              Điều khoản dịch vụ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
