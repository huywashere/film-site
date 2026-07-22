'use client';
import Link from 'next/link';
import { useTranslation } from '@/store/langStore';
import { Play, Film, Tv2, Star, Github, Twitter, Facebook, Youtube, Mail, Shield, Zap, Users } from 'lucide-react';
import { ScrollingFilmBanner } from './ScrollingFilmBanner';

const NAV_COLS = [
  {
    title: 'Duyệt Phim',
    links: [
      { href: '/films/series', label: 'Phim Bộ' },
      { href: '/films/single', label: 'Phim Lẻ' },
      { href: '/films/anime', label: 'Hoạt Hình' },
      { href: '/films/tvshows', label: 'TV Shows' },
    ],
  },
  {
    title: 'Thể Loại',
    links: [
      { href: '/genre/hanh-dong', label: 'Hành Động' },
      { href: '/genre/kinh-di', label: 'Kinh Dị' },
      { href: '/genre/tinh-cam', label: 'Tình Cảm' },
      { href: '/genre/hai-huoc', label: 'Hài Hước' },
      { href: '/genre/vien-tuong', label: 'Viễn Tưởng' },
    ],
  },
  {
    title: 'Nền Tảng',
    links: [
      { href: '/watchlist', label: 'Watchlist' },
      { href: '/search', label: 'Tìm Kiếm' },
      { href: '/settings/security', label: 'Cài Đặt' },
      { href: '/register', label: 'Đăng Ký' },
    ],
  },
];

const STATS = [
  { icon: Film, value: '50,000+', label: 'Bộ phim' },
  { icon: Tv2, value: '1,200+', label: 'TV Series' },
  { icon: Users, value: '500K+', label: 'Thành viên' },
  { icon: Star, value: '4.8 ★', label: 'Đánh giá' },
];

const SOCIALS = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Youtube, href: '#', label: 'YouTube' },
  { icon: Twitter, href: '#', label: 'Twitter / X' },
  { icon: Github, href: '#', label: 'GitHub' },
];

export function Footer() {
  const { lang, setLang } = useTranslation();

  return (
    <footer className="bg-[#050810] text-neutral-300 mt-24 border-t border-white/10">
      <ScrollingFilmBanner />
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#060a16] flex items-center justify-center font-black text-lg shadow-[0_20px_60px_rgba(255,255,255,0.05)]">
                P
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">Plex</p>
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Phim & Series</p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-7 text-neutral-400">
              Giao diện tối ưu cho trải nghiệm phim trực tuyến: tối giản, rõ ràng và sang trọng.
            </p>
            <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Kết nối</span>
                <div className="flex gap-2">
                  {SOCIALS.map(({ icon: Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      aria-label={label}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 hover:bg-white/10 transition"
                    >
                      <Icon size={16} />
                    </a>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-400 mb-3">Ngôn ngữ</p>
                <div className="inline-flex rounded-full border border-white/10 bg-[#0d1320] p-1">
                  <button
                    onClick={() => setLang('vi')}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${lang === 'vi' ? 'bg-white text-[#060a16]' : 'text-neutral-300 hover:bg-white/10'}`}
                  >
                    VI
                  </button>
                  <button
                    onClick={() => setLang('en')}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${lang === 'en' ? 'bg-white text-[#060a16]' : 'text-neutral-300 hover:bg-white/10'}`}
                  >
                    EN
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 mb-5">Công ty</h5>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li><Link href="/about" className="hover:text-white transition">Giới thiệu</Link></li>
              <li><Link href="/careers" className="hover:text-white transition">Tuyển dụng</Link></li>
              <li><Link href="/partners" className="hover:text-white transition">Đối tác</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Liên hệ</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 mb-5">Dịch vụ</h5>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li><Link href="/watch" className="hover:text-white transition">Phim mới</Link></li>
              <li><Link href="/genres" className="hover:text-white transition">Thể loại</Link></li>
              <li><Link href="/collections" className="hover:text-white transition">Bộ sưu tập</Link></li>
              <li><Link href="/watchlist" className="hover:text-white transition">Watchlist</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 mb-5">Hỗ trợ</h5>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li><Link href="/help" className="hover:text-white transition">Trợ giúp</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Điều khoản</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition">Chính sách</Link></li>
              <li><Link href="/status" className="hover:text-white transition">Trạng thái</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-[11px] text-neutral-500">
          <p>© {new Date().getFullYear()} Plex-style Movie Site. Bảo lưu mọi quyền.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy" className="hover:text-white transition">Chính sách bảo mật</Link>
            <Link href="/cookies" className="hover:text-white transition">Cookie</Link>
            <Link href="/info" className="hover:text-white transition">Thông tin pháp lý</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
