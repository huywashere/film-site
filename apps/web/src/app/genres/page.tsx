"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface HubCard {
  slug: string;
  title: string;
  tagline: string;
  category: string;
  highlight: string;
  href: string;
  image: string;
}

const HUBS: HubCard[] = [
  {
    slug: "phim-han-quoc",
    title: "Phim Hàn Quốc",
    tagline: "K-Drama • Melodrama • Lãng Mạn",
    category: "Hàn Quốc",
    highlight: "Nữ Hoàng Nước Mắt, Cõng Anh Mà Chạy, Hạ Cánh Nơi Anh...",
    href: "/country/han-quoc",
    image: "https://image.tmdb.org/t/p/w1280/8Dc24s2heFSqcpIsqDFlnjYICP.jpg",
  },
  {
    slug: "phim-trung-quoc",
    title: "Phim Trung Quốc",
    tagline: "Hoa Ngữ • Cổ Trang • Ngôn Tình",
    category: "Trung Quốc",
    highlight: "Vụng Trộm Không Thể Giấu, Thương Lan Quyết, Dĩ Ái Vi Doanh...",
    href: "/country/trung-quoc",
    image: "https://image.tmdb.org/t/p/w1280/wQlJJJ50gKphCci0SmoetUXmJN4.jpg",
  },
  {
    slug: "anime-hoat-hinh",
    title: "Anime & Hoạt Hình",
    tagline: "Anime Nhật Bản • Chiếu Rạp • Shounen",
    category: "Anime",
    highlight: "Your Name, Thanh Gươm Diệt Quỷ, Chú Thuật Hồi Chiến, One Piece...",
    href: "/films/anime",
    image: "https://image.tmdb.org/t/p/w1280/8x9iKH8kWA0zdkgNdpAew7OstYe.jpg",
  },
];

export default function GenresPage() {
  return (
    <main
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#0a0b10] text-white pb-28 sm:pb-32 pt-16 sm:pt-24",
      )}
    >
      {/* ── Ambient Studio Lighting ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-white/[0.025] to-transparent blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-3.5 sm:px-8 lg:px-12 space-y-4 sm:space-y-8">
        {/* Header Title (Netflix / Apple TV Clean Standard) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-3 sm:pb-4 border-b border-white/[0.08] gap-1.5 sm:gap-2">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-cyan-400">
              Bộ Sưu Tập Tuyển Chọn
            </span>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white mt-0.5 sm:mt-1">
              Khám Phá Vũ Trụ Điện Ảnh
            </h1>
          </div>
          <p className="text-[11px] sm:text-sm text-neutral-400 font-medium">
            Chọn chủ đề để bước vào không gian giải trí đỉnh cao
          </p>
        </div>

        {/* ── Cinematic 3-Hub Showcase Grid ── */}
        <section
          aria-label="Danh sách tuyển tập phim nổi bật"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12 pt-1"
        >
          {HUBS.map((hub, index) => (
            <Link
              key={hub.slug}
              href={hub.href}
              className="group relative flex flex-col justify-end aspect-[16/9] sm:aspect-[16/10] md:aspect-[16/11] lg:aspect-[16/10] min-h-[190px] sm:min-h-[260px] md:min-h-[300px] lg:min-h-[340px] overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] hover:border-white/30 bg-[#12141c] p-4 sm:p-6 lg:p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_28px_65px_rgba(0,0,0,0.95)] cursor-pointer select-none"
            >
              {/* High-Resolution Full-Bleed 4K Backdrop */}
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                aria-hidden="true"
              >
                <Image
                  src={hub.image}
                  alt={hub.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover object-center brightness-[0.72] contrast-[1.06] transition-transform duration-700 ease-out group-hover:scale-106 group-hover:brightness-[0.82]"
                  priority={index === 0}
                />

                {/* Cinematic Vignette Gradients for Text Contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/65 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b10]/70 via-transparent to-black/20" />
                <div className="absolute inset-0 bg-black/15 group-hover:bg-transparent transition-colors duration-500" />
              </div>

              {/* Lower-Third Content Lockup */}
              <div className="relative z-10 space-y-1 sm:space-y-2">
                <p className="text-[10px] sm:text-xs font-bold text-cyan-400 uppercase tracking-wide">
                  {hub.tagline}
                </p>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-none group-hover:text-white transition-colors">
                  {hub.title}
                </h2>

                <p className="text-[11px] sm:text-xs text-neutral-300 font-normal line-clamp-1 leading-relaxed opacity-90">
                  {hub.highlight}
                </p>

                {/* Action Row */}
                <div className="pt-2 sm:pt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/90 hover:bg-white text-black text-[11px] sm:text-xs font-extrabold transition-all duration-300 group-hover:bg-white group-hover:shadow-md">
                    <Play size={12} fill="currentColor" />
                    <span>Khám phá ngay</span>
                  </span>

                  <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 group-hover:text-neutral-200 transition-colors">
                    Hơn 500+ Phim
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
