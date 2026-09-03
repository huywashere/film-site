"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Sparkles } from "lucide-react";
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
  countBadge?: string;
}

const HUBS: HubCard[] = [
  {
    slug: "phim-han-quoc",
    title: "Phim Hàn Quốc",
    tagline: "K-Drama • Tình Cảm • Hồi Hộp",
    category: "Hàn Quốc",
    highlight: "Queen of Tears, Hạ Cánh Nơi Anh, Nữ Luật Sư Kỳ Lạ...",
    href: "/country/han-quoc",
    image: "https://image.tmdb.org/t/p/w780/8Dc24s2heFSqcpIsqDFlnjYICP.jpg",
    countBadge: "Hơn 600+ Phim",
  },
  {
    slug: "phim-trung-quoc",
    title: "Phim Trung Quốc",
    tagline: "Cổ Trang • Tiên Hiệp • Ngôn Tình",
    category: "Trung Quốc",
    highlight: "Dữ Phượng Hành, Trường Tương Tư, Tinh Hán Xán Lạn...",
    href: "/country/trung-quoc",
    image: "https://image.tmdb.org/t/p/w780/4J8znHxVaZY3vKb05IWqWfzczXR.jpg",
    countBadge: "Hơn 500+ Phim",
  },
  {
    slug: "anime-hoat-hinh",
    title: "Anime & Hoạt Hình",
    tagline: "Shounen • Ghibli • 3D Chiếu Rạp",
    category: "Anime",
    highlight: "Thanh Gươm Diệt Quỷ, Solo Leveling, Jujutsu Kaisen...",
    href: "/films/anime",
    image: "https://image.tmdb.org/t/p/w780/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg",
    countBadge: "Hơn 450+ Phim",
  },
  {
    slug: "khoa-hoc-vien-tuong",
    title: "Khoa Học Viễn Tưởng",
    tagline: "Vũ Trụ • Đa Chiều • Tương Lai",
    category: "Viễn Tưởng",
    highlight: "Interstellar, Dune 2, Avatar, Inception, The Matrix...",
    href: "/genre/vien-tuong",
    image: "https://image.tmdb.org/t/p/w780/eZ239CUp1d6OryZEBPnO2n87gMG.jpg",
    countBadge: "Hơn 400+ Phim",
  },
  {
    slug: "chien-tranh",
    title: "Chiến Tranh & Lịch Sử",
    tagline: "Khốc Liệt • Hùng Tráng • Quả Cảm",
    category: "Chiến Tranh",
    highlight: "1917, Oppenheimer, Cuồng Nộ, Giải Cứu Binh Nhì Ryan...",
    href: "/genre/chien-tranh",
    image: "https://image.tmdb.org/t/p/w780/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg",
    countBadge: "Hơn 300+ Phim",
  },
];

export default function GenresPage() {
  return (
    <main
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#0a0b10] text-white pb-24 sm:pb-28 pt-16 sm:pt-20",
      )}
    >
      {/* ── Ambient Studio Lighting ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-white/[0.025] to-transparent blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-3.5 sm:px-8 lg:px-12 space-y-6 sm:space-y-8">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-3 sm:pb-4 border-b border-white/[0.08] gap-1.5 sm:gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-cyan-400">
              <Sparkles size={13} className="text-cyan-400" />
              Bộ Sưu Tập Tuyển Chọn
            </span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white mt-0.5 sm:mt-1">
              Khám Phá Vũ Trụ Điện Ảnh
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
            Chọn chủ đề để bước vào không gian giải trí đỉnh cao
          </p>
        </div>

        {/* ── 5 Curated Pillars Grid (Optimized Direct CDN Loading) ── */}
        <section
          aria-label="Danh sách tuyển tập phim nổi bật"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-4.5"
        >
          {HUBS.map((hub) => (
            <Link
              key={hub.slug}
              href={hub.href}
              prefetch={true}
              className="group relative flex flex-col justify-end aspect-[16/10] min-h-[170px] sm:min-h-[190px] lg:min-h-[205px] overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.08] hover:border-white/30 bg-[#12141c] p-3.5 sm:p-4 lg:p-4.5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.85)] cursor-pointer select-none"
            >
              {/* High-Resolution Full-Bleed Backdrop - Fast Edge CDN with unoptimized=true */}
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                aria-hidden="true"
              >
                <Image
                  src={hub.image}
                  alt={hub.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 20vw"
                  className="object-cover object-center brightness-[0.72] contrast-[1.06] transition-transform duration-500 ease-out group-hover:scale-105 group-hover:brightness-[0.85]"
                  priority={true}
                  unoptimized={true}
                />

                {/* Cinematic Vignette Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/65 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b10]/70 via-transparent to-black/20" />
                <div className="absolute inset-0 bg-black/15 group-hover:bg-transparent transition-colors duration-300" />
              </div>

              {/* Lower Content Lockup */}
              <div className="relative z-10 space-y-1">
                <p className="text-[9px] sm:text-[10px] font-bold text-cyan-400 uppercase tracking-wide">
                  {hub.tagline}
                </p>

                <h2 className="text-base sm:text-lg lg:text-xl font-black text-white tracking-tight leading-tight group-hover:text-cyan-100 transition-colors">
                  {hub.title}
                </h2>

                <p className="text-[10px] sm:text-[11px] text-neutral-300 font-normal line-clamp-1 leading-relaxed opacity-90">
                  {hub.highlight}
                </p>

                {/* Action Row */}
                <div className="pt-1.5 sm:pt-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.2 rounded-lg bg-white/90 group-hover:bg-white text-black text-[10px] sm:text-[11px] font-extrabold transition-all duration-200 group-hover:shadow-sm">
                    <Play size={10} fill="currentColor" />
                    <span>Khám phá</span>
                  </span>

                  <span className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 group-hover:text-neutral-200 transition-colors">
                    {hub.countBadge || "Hơn 500+ Phim"}
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
