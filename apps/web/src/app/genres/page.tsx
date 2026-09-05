"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { buildAsianHeroImageCandidates } from "@/lib/curated-asian-hero";
import { movieApi, recommendationApi } from "@/lib/api";
import { FilmItem } from "@/components/film/FilmCard";

const Top10RankedRow = dynamic(
  () =>
    import("@/components/film/Top10RankedRow").then(
      (mod) => mod.Top10RankedRow,
    ),
  { ssr: false },
);

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
  {
    slug: "thuyet-minh-song-ngu-ai",
    title: "Thuyết Minh Song Ngữ AI",
    tagline: "Giọng Đọc AI • Song Ngữ • Chuẩn Điện Ảnh",
    category: "Thuyết Minh AI",
    highlight: "Avengers, Interstellar, Blade Runner 2049, Dune, Spider-Man...",
    href: "/films/thuyet-minh-ai",
    image: "https://image.tmdb.org/t/p/w780/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg",
    countBadge: "Hơn 550+ Phim",
  },
];

const DEFAULT_TOP10_FALLBACK: FilmItem[] = [
  {
    _id: "deadpool-va-wolverine",
    name: "Deadpool & Wolverine",
    origin_name: "Deadpool & Wolverine",
    slug: "deadpool-va-wolverine",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20250821-1/45b6b9aad03ae0aa2aceb5d73419831a.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250821-1/1ec414f82adc729512410edd1b083996.jpg",
    quality: "4K Ultra HD",
    lang: "Vietsub",
  },
  {
    _id: "nguoi-nhen-khong-con-nha",
    name: "Spider-Man: No Way Home",
    origin_name: "Spider-Man: No Way Home",
    slug: "nguoi-nhen-khong-con-nha",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20250828-1/08fd0a68865ce452e959ae2bf58b7a8c.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250828-1/db868e69da1af78d124ed464063b27a6.jpg",
    quality: "4K Ultra HD",
    lang: "Vietsub",
  },
  {
    _id: "ky-si-bong-dem",
    name: "The Dark Knight",
    origin_name: "The Dark Knight",
    slug: "ky-si-bong-dem",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20240104-1/2cae46be24f514793c9e873f6de0fc32.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20240104-1/b2748e456090a1c43b246c014b60fa1a.jpg",
    quality: "4K Ultra HD",
    lang: "Vietsub",
  },
  {
    _id: "avatar-dong-chay-cua-nuoc",
    name: "Avatar: The Way Of Water",
    origin_name: "Avatar: The Way Of Water",
    slug: "avatar-dong-chay-cua-nuoc",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20250513-1/59fc5ffe0025ca40c99d48b070b59320.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250513-1/7b4e51db1a258ef9602558352066bfec.jpg",
    quality: "4K Ultra HD",
    lang: "Vietsub",
  },
  {
    _id: "avengers-tran-chien-cuoi-cung",
    name: "Avengers: Endgame",
    origin_name: "Avengers: Endgame",
    slug: "avengers-tran-chien-cuoi-cung",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20240128-1/4278b5bc228cbc7963f50547e6c76cff.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20240128-1/72824a2b39de2fbb3e9617058b2f9eb3.jpg",
    quality: "4K Ultra HD",
    lang: "Vietsub",
  },
  {
    _id: "ho-den-tu-than",
    name: "Interstellar",
    origin_name: "Interstellar",
    slug: "ho-den-tu-than",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20250302-1/4cee31c3afd0fbfd11ed4f14b1bfd816.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250302-1/6012710a981edf1b6209bdb7fa82d1a6.jpg",
    quality: "4K Ultra HD",
    lang: "Thuyết Minh",
  },
  {
    _id: "oppenheimer",
    name: "Oppenheimer",
    origin_name: "Oppenheimer",
    slug: "oppenheimer",
    type: "single",
    poster_url:
      "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    thumb_url:
      "https://image.tmdb.org/t/p/w1280/rLb2cw69Pazuxaj0sRXQnnALVY9.jpg",
    quality: "4K Ultra HD",
    lang: "Vietsub",
  },
  {
    _id: "ke-danh-cap-giac-mo",
    name: "Inception",
    origin_name: "Inception",
    slug: "ke-danh-cap-giac-mo",
    type: "single",
    poster_url:
      "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    thumb_url:
      "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    quality: "4K Ultra HD",
    lang: "Thuyết Minh",
  },
  {
    _id: "hanh-tinh-cat-phan-2",
    name: "Dune: Part Two",
    origin_name: "Dune: Part Two",
    slug: "hanh-tinh-cat-phan-2",
    type: "single",
    poster_url:
      "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    thumb_url:
      "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg",
    quality: "4K Ultra HD",
    lang: "Vietsub",
  },
  {
    _id: "sat-thu-john-wick-phan-4",
    name: "John Wick: Chapter 4",
    origin_name: "John Wick: Chapter 4",
    slug: "sat-thu-john-wick-phan-4",
    type: "single",
    poster_url:
      "https://image.tmdb.org/t/p/w500/vZloFAK7NKnMGKEslUsZloS9O3m.jpg",
    thumb_url:
      "https://image.tmdb.org/t/p/w1280/7I6VUdPj6tQECNHdviJkUHD2389.jpg",
    quality: "4K Ultra HD",
    lang: "Vietsub",
  },
];

function ResilientHubCardImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const candidates = useMemo(() => {
    return buildAsianHeroImageCandidates(src);
  }, [src]);

  const [candidateIdx, setCandidateIdx] = useState(0);

  const currentSrc = candidates[candidateIdx] || src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={currentSrc}
      src={currentSrc}
      alt={alt}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      referrerPolicy="no-referrer"
      onError={() => {
        if (candidateIdx < candidates.length - 1) {
          setCandidateIdx((prev) => prev + 1);
        }
      }}
      className="w-full h-full object-cover object-center brightness-[0.72] contrast-[1.06] transition-transform duration-500 ease-out group-hover:scale-105 group-hover:brightness-[0.85]"
    />
  );
}

export default function GenresPage() {
  const { data: homeFeedData } = useQuery({
    queryKey: ["home-feed", 24],
    queryFn: () => movieApi.getHomeFeed(24).then((res) => res.data),
    staleTime: 1000 * 60 * 10,
  });

  const { data: aiTop10Data } = useQuery({
    queryKey: ["ai-top10-recommendations"],
    queryFn: () => recommendationApi.getTop10(),
    staleTime: 1000 * 60 * 5,
  });

  const top10Films = useMemo(() => {
    const aiList: FilmItem[] = (aiTop10Data?.items as FilmItem[]) || [];
    const rawList: FilmItem[] =
      aiList.length > 0 ? aiList : (homeFeedData?.top10 || []);
    const pool = rawList.length > 0 ? rawList : DEFAULT_TOP10_FALLBACK;
    const combined: FilmItem[] = [];
    const seen = new Set<string>();

    for (const item of pool) {
      if (!seen.has(item.slug)) {
        seen.add(item.slug);
        combined.push(item);
      }
      if (combined.length === 10) break;
    }

    if (combined.length < 10) {
      for (const fallback of DEFAULT_TOP10_FALLBACK) {
        if (!seen.has(fallback.slug)) {
          seen.add(fallback.slug);
          combined.push(fallback);
        }
        if (combined.length === 10) break;
      }
    }

    return combined.slice(0, 10);
  }, [aiTop10Data?.items, homeFeedData?.top10]);

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

      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-3.5 sm:px-8 lg:px-12 space-y-8 sm:space-y-10">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-3 sm:pb-4 border-b border-white/[0.08] gap-1.5 sm:gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              Duyệt Tìm
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
            Khám phá Top 10 thịnh hành và các vũ trụ điện ảnh đặc sắc
          </p>
        </div>

        {/* ── TOP 10 Đang Được Xem Nhiều (Hiển thị cả Desktop và Điện thoại) ── */}
        <section aria-label="TOP 10 Đang Được Xem Nhiều" className="pt-1">
          <Top10RankedRow
            films={top10Films}
            showCrown={false}
            className="mb-0"
          />
        </section>

        {/* ── 6 Curated Pillars Grid (Resilient Multi-CDN Fallback) ── */}
        <section
          aria-label="Danh sách vũ trụ điện ảnh"
          className="space-y-4"
        >
          <h2
            className={`${cardFont.className} text-lg md:text-xl font-extrabold text-white tracking-[-0.015em]`}
          >
            Vũ Trụ Điện Ảnh
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4.5 lg:gap-5">
            {HUBS.map((hub) => (
              <Link
                key={hub.slug}
                href={hub.href}
                prefetch={true}
                className="group relative flex flex-col justify-end aspect-[16/10] min-h-[170px] sm:min-h-[190px] lg:min-h-[205px] overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.08] hover:border-white/30 bg-[#12141c] p-3.5 sm:p-4 lg:p-4.5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.85)] cursor-pointer select-none"
              >
                {/* High-Resolution Full-Bleed Backdrop with Resilient Multi-Tier Proxy */}
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  aria-hidden="true"
                >
                  <ResilientHubCardImage
                    src={hub.image}
                    alt={hub.title}
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
          </div>
        </section>
      </div>
    </main>
  );
}
