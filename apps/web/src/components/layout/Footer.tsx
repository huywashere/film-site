"use client";

import Link from "next/link";

const FOOTER_COLUMNS = [
  {
    heading: "Khám phá",
    links: [
      { label: "Phim mới nhất", href: "/films" },
      { label: "Phim bộ", href: "/films/series" },
      { label: "Phim lẻ", href: "/films/single" },
      { label: "Hoạt hình", href: "/films/hoat-hinh" },
    ],
  },
  {
    heading: "Thể loại",
    links: [
      { label: "Hành động", href: "/genre/hanh-dong" },
      { label: "Tình cảm", href: "/genre/tinh-cam" },
      { label: "Khoa học viễn tưởng", href: "/genre/khoa-hoc-vien-tuong" },
      { label: "Kinh dị", href: "/genre/kinh-di" },
    ],
  },
  {
    heading: "Quốc gia",
    links: [
      { label: "Hàn Quốc", href: "/country/han-quoc" },
      { label: "Trung Quốc", href: "/country/trung-quoc" },
      { label: "Âu Mỹ", href: "/country/au-my" },
      { label: "Nhật Bản", href: "/country/nhat-ban" },
    ],
  },
  {
    heading: "Hỗ trợ",
    links: [
      { label: "Báo cáo nội dung", href: "/report" },
      { label: "Quyền riêng tư", href: "/privacy" },
    ],
  },
  {
    heading: "CinePhim",
    links: [
      { label: "Điều khoản", href: "/terms" },
      { label: "Liên hệ", href: "/contact" },
    ],
  },
];

// Social icon components
function IconGoogle() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconApple() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.77a4.85 4.85 0 01-1-.08z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { href: "https://google.com", icon: IconGoogle, label: "Google" },
  { href: "https://facebook.com", icon: IconFacebook, label: "Facebook" },
  { href: "https://apple.com", icon: IconApple, label: "Apple" },
  { href: "https://tiktok.com", icon: IconTikTok, label: "TikTok" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      data-site-footer="true"
      className="relative z-20 w-full bg-[#141414] border-t border-white/[0.06]"
    >
      {/* Main footer content */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        {/* Top row: Logo + columns */}
        <div className="grid grid-cols-2 gap-10 py-14 md:grid-cols-[200px_repeat(5,1fr)] lg:gap-8">
          {/* Logo */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cinephim-logo.png"
                alt="CinePhim Logo"
                className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_10px_rgba(168,85,247,0.25)]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-base font-black tracking-tight text-white lowercase">
                cine<span className="text-violet-400">phim</span>
              </span>
            </Link>
            <p className="mt-4 text-xs leading-6 text-neutral-500 max-w-[170px]">
              Nền tảng xem phim trực tuyến miễn phí, chất lượng cao.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading} className="min-w-0">
              <p className="mb-4 text-[11px] font-bold tracking-[0.12em] text-neutral-400 uppercase">
                {column.heading}
              </p>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      data-footer-link="true"
                      className="text-sm text-neutral-500 transition-colors duration-150 hover:text-neutral-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/[0.06]" />

        {/* Bottom row: social icons + copyright */}
        <div className="flex flex-col items-center gap-5 py-8">
          {/* Social icons */}
          <div className="flex items-center gap-6">
            {SOCIAL_LINKS.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-neutral-500 transition-colors duration-150 hover:text-white"
              >
                <Icon />
              </a>
            ))}
          </div>

          {/* Copyright + legal links */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[12px] text-neutral-600">
            <span>© {year} CinePhim. Nội dung được tổng hợp từ các nguồn công khai.</span>
            <span className="text-neutral-700">•</span>
            <Link href="/terms" className="transition-colors hover:text-neutral-400">
              Điều khoản
            </Link>
            <span className="text-neutral-700">•</span>
            <Link href="/privacy" className="transition-colors hover:text-neutral-400">
              Quyền riêng tư
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
