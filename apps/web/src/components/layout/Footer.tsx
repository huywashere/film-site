"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cardFont } from "@/lib/fonts";
import { useTranslation } from "@/store/langStore";

// Social icon components
function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconTelegram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.77a4.85 4.85 0 01-1-.08z" />
    </svg>
  );
}

function IconEmail() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 sm:w-5 sm:h-5"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { href: "https://facebook.com", icon: IconFacebook, label: "Facebook" },
  { href: "https://t.me/netphim_official", icon: IconTelegram, label: "Telegram" },
  { href: "https://tiktok.com", icon: IconTikTok, label: "TikTok" },
  { href: "mailto:contact@netphim.app", icon: IconEmail, label: "Email" },
];

const CAT_MASCOTS = [
  { src: "/images/cat1.gif", alt: "Mèo NetPhim 1" },
  { src: "/images/cat2.gif", alt: "Mèo NetPhim 2" },
  { src: "/images/cat3.gif", alt: "Mèo NetPhim 3" },
  { src: "/images/cat4.gif", alt: "Mèo NetPhim 4" },
];

export function Footer() {
  const year = new Date().getFullYear();
  const [catIndex, setCatIndex] = useState(0);
  const { t, lang } = useTranslation();

  const footerColumns = [
    {
      heading: t("footer.quickLinks", "Khám phá"),
      links: [
        { label: t("sections.latest", "Phim mới nhất"), href: "/films" },
        { label: t("nav.series", "Phim bộ"), href: "/films/series" },
        { label: t("nav.single", "Phim lẻ"), href: "/films/single" },
        { label: t("nav.anime", "Hoạt hình"), href: "/films/anime" },
      ],
    },
    {
      heading: t("footer.genres", "Thể loại"),
      links: [
        { label: t("genres_list.hanh-dong", "Hành động"), href: "/genre/hanh-dong" },
        { label: t("genres_list.tinh-cam", "Tình cảm"), href: "/genre/tinh-cam" },
        { label: t("genres_list.khoa-hoc-vien-tuong", "Khoa học viễn tưởng"), href: "/genre/khoa-hoc-vien-tuong" },
        { label: t("genres_list.kinh-di", "Kinh dị"), href: "/genre/kinh-di" },
      ],
    },
    {
      heading: t("nav.country", "Quốc gia"),
      links: [
        { label: t("countries_list.han-quoc", "Hàn Quốc"), href: "/country/han-quoc" },
        { label: t("countries_list.trung-quoc", "Trung Quốc"), href: "/country/trung-quoc" },
        { label: t("countries_list.au-my", "Âu Mỹ"), href: "/country/au-my" },
        { label: t("countries_list.nhat-ban", "Nhật Bản"), href: "/country/nhat-ban" },
      ],
    },
    {
      heading: t("footer.support", "Hỗ trợ & Bản quyền"),
      links: [
        { label: t("footer.report", "Báo lỗi"), href: "/report" },
        { label: t("footer.privacy", "Chính sách bảo mật"), href: "/privacy" },
        { label: t("footer.terms", "Điều khoản sử dụng"), href: "/terms" },
        { label: t("footer.contact", "Liên hệ"), href: "/contact" },
      ],
    },
  ];

  // Random 1 of 4 cat mascots on page load/reload
  useEffect(() => {
    setCatIndex(Math.floor(Math.random() * CAT_MASCOTS.length));
  }, []);

  const randomCat = CAT_MASCOTS[catIndex] || CAT_MASCOTS[0];

  return (
    <footer
      data-site-footer="true"
      className={`${cardFont.className} relative z-20 w-full border-t border-white/[0.06] bg-[#141414]`}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        {/* Main section */}
        <div className="flex flex-col gap-8 py-8 sm:py-10 md:flex-row md:items-start md:justify-between lg:gap-14">
          {/* Logo & Tagline */}
          <div className="shrink-0 md:max-w-[260px]">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cinephim-logo.png"
                alt="NetPhim Logo"
                className="h-9 w-auto sm:h-10 object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Net<span className="text-violet-400">Phim</span>
              </span>
            </Link>
            <p className="mt-3 text-xs sm:text-[13px] leading-relaxed text-neutral-400">
              {t("footer.description", "Nền tảng xem phim trực tuyến miễn phí, chất lượng cao Full HD & 4K Ultra HD.")}
            </p>
          </div>

          {/* 4 Balanced Link Columns */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 sm:gap-6 md:flex-1 md:gap-8">
            {footerColumns.map((column) => (
              <div key={column.heading} className="min-w-0">
                <p className="mb-3 text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-neutral-200">
                  {column.heading}
                </p>
                <ul className="space-y-2 sm:space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        data-footer-link="true"
                        className="text-[12px] sm:text-[13px] text-neutral-400 transition-colors duration-150 hover:text-white"
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

        {/* Divider */}
        <div className="h-px w-full bg-white/[0.06]" />

        {/* Bottom row: Socials + Disclaimer + Copyright + 1 Random Cat Mascot */}
        <div className="flex flex-col items-center gap-3.5 pt-6 pb-20 sm:pb-6 text-center">
          {/* Social icons */}
          <div className="flex items-center gap-5 sm:gap-6">
            {SOCIAL_LINKS.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-neutral-400 transition-all duration-200 hover:text-violet-400 hover:scale-110"
              >
                <Icon />
              </a>
            ))}
          </div>

          {/* Disclaimer text */}
          <p className="max-w-3xl text-[11px] sm:text-xs leading-relaxed text-neutral-400">
            {lang === "en"
              ? "NetPhim is a movie catalog and streaming discovery platform serving the community. We do not host any media files on our own servers; all metadata and streams are indexed automatically from public third-party services on the internet."
              : "NetPhim là nền tảng tổng hợp và giới thiệu thông tin phim ảnh phục vụ cộng đồng người xem tại Việt Nam. Chúng tôi không lưu trữ bất kỳ tệp video nào trên máy chủ riêng; toàn bộ dữ liệu và nội dung đều được dẫn nguồn, liên kết tự động từ các dịch vụ bên thứ ba công khai trên Internet."}
          </p>

          {/* Copyright */}
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
            © {year} NetPhim. {lang === "en" ? "Thank you for supporting our film enthusiast community." : "Cảm ơn bạn đã đồng hành và ủng hộ cộng đồng yêu phim."}
          </p>

          {/* 1 Random Cat Mascot */}
          <div className="mt-0.5 flex items-center justify-center select-none pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={randomCat.src}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-11 w-auto sm:h-13 max-w-[90px] rounded-lg object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
