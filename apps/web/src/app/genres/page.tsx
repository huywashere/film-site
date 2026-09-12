"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  ChevronRight,
  LayoutGrid,
  Layers,
  Grid2X2,
  Columns,
  Tv,
  Flame,
  Sparkles,
  Rocket,
  Shield,
  Languages,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { buildAsianHeroImageCandidates } from "@/lib/curated-asian-hero";
import { movieApi, recommendationApi } from "@/lib/api";
import { FilmItem } from "@/components/film/FilmCard";
import { getUniverseCatalog } from "@/lib/universe-catalog";

const Top10RankedRow = dynamic(
  () =>
    import("@/components/film/Top10RankedRow").then(
      (module) => module.Top10RankedRow,
    ),
  {
    loading: () => (
      <div className="h-44 sm:h-56 w-full animate-pulse rounded-2xl bg-white/[0.04]" />
    ),
  },
);

export type HubViewMode = "cinematic" | "poster" | "bento" | "compact";

export const VIEW_MODES = [
  {
    id: "cinematic" as const,
    label: "Cinematic",
    icon: LayoutGrid,
    description: "Thẻ ngang điện ảnh",
  },
  {
    id: "poster" as const,
    label: "Poster",
    icon: Layers,
    description: "Thẻ poster đứng 3D",
  },
  {
    id: "bento" as const,
    label: "Bento Box",
    icon: Grid2X2,
    description: "Bố cục nghệ thuật",
  },
  {
    id: "compact" as const,
    label: "Tối Giản",
    icon: Columns,
    description: "Thẻ mini gọn gàng",
  },
];

interface HubCard {
  slug: string;
  title: string;
  tagline: string;
  category: string;
  highlight: string;
  href: string;
  image: string;
  posterImage?: string;
  countBadge?: string;
  accentColor: string;
  glowColor: string;
  badgeBg: string;
  icon: typeof Tv;
}

const HUBS: HubCard[] = [
  {
    slug: "marvel",
    title: "Vũ Trụ Điện Ảnh Marvel",
    tagline: "MCU • Multiverse • Avengers",
    category: "Marvel Studios",
    highlight: "Kỷ nguyên siêu anh hùng, biệt đội Avengers, Spider-Man và đa vũ trụ.",
    href: "/films?universe=marvel",
    image: "https://image.tmdb.org/t/p/w780/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    posterImage: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    countBadge: "175+ Bom Tấn",
    accentColor: "#ef4444",
    glowColor: "rgba(239, 68, 68, 0.35)",
    badgeBg: "bg-red-500/15 text-red-300 border-red-500/30",
    icon: Flame,
  },
  {
    slug: "dc",
    title: "Vũ Trụ Điện Ảnh DC",
    tagline: "Batman • Superman • Justice League",
    category: "DC Universe",
    highlight: "Hiệp sĩ bóng đêm Batman, Superman, Justice League và thế giới siêu anh hùng DC.",
    href: "/films?universe=dc",
    image: "https://image.tmdb.org/t/p/w780/dqK9Hag1054tghRQSqLSfrkvQnA.jpg",
    posterImage: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    countBadge: "180+ Kiệt Tác",
    accentColor: "#38bdf8",
    glowColor: "rgba(56, 189, 248, 0.35)",
    badgeBg: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    icon: Shield,
  },
  {
    slug: "phim-han-quoc",
    title: "Phim Hàn Quốc",
    tagline: "K-Drama • Tình Cảm • Hồi Hộp",
    category: "Hàn Quốc",
    highlight: "Tình cảm, gia đình, hình sự và các series Hàn nổi bật.",
    href: "/country/han-quoc",
    image: "https://image.tmdb.org/t/p/w780/8Dc24s2heFSqcpIsqDFlnjYICP.jpg",
    posterImage: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    countBadge: "K-Drama tuyển chọn",
    accentColor: "#38bdf8",
    glowColor: "rgba(56, 189, 248, 0.35)",
    badgeBg: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    icon: Tv,
  },
  {
    slug: "phim-trung-quoc",
    title: "Phim Trung Quốc",
    tagline: "Cổ Trang • Tiên Hiệp • Ngôn Tình",
    category: "Trung Quốc",
    highlight: "Cổ trang, tiên hiệp, ngôn tình và phim hiện đại Trung Quốc.",
    href: "/country/trung-quoc",
    image: "https://image.tmdb.org/t/p/w780/4J8znHxVaZY3vKb05IWqWfzczXR.jpg",
    posterImage: "https://image.tmdb.org/t/p/w500/8j58iEBw9pOXFD2L0nt0ZXeHviB.jpg",
    countBadge: "Cổ trang & hiện đại",
    accentColor: "#fbbf24",
    glowColor: "rgba(251, 191, 36, 0.35)",
    badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    icon: Flame,
  },
  {
    slug: "anime-hoat-hinh",
    title: "Anime & Hoạt Hình",
    tagline: "Shounen • Ghibli • 3D Chiếu Rạp",
    category: "Anime",
    highlight: "Anime dài tập, điện ảnh Nhật Bản và hoạt hình nổi bật.",
    href: "/films/anime",
    image: "https://image.tmdb.org/t/p/w780/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg",
    posterImage: "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
    countBadge: "Anime & điện ảnh",
    accentColor: "#a855f7",
    glowColor: "rgba(168, 85, 247, 0.35)",
    badgeBg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    icon: Sparkles,
  },
  {
    slug: "khoa-hoc-vien-tuong",
    title: "Khoa Học Viễn Tưởng",
    tagline: "Vũ Trụ • Đa Chiều • Tương Lai",
    category: "Viễn Tưởng",
    highlight: "Du hành vũ trụ, đa chiều, AI và những thế giới tương lai.",
    href: "/genre/vien-tuong",
    image: "https://image.tmdb.org/t/p/w780/eZ239CUp1d6OryZEBPnO2n87gMG.jpg",
    posterImage: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    countBadge: "Không gian & tương lai",
    accentColor: "#06b6d4",
    glowColor: "rgba(6, 182, 212, 0.35)",
    badgeBg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    icon: Rocket,
  },
  {
    slug: "chien-tranh",
    title: "Chiến Tranh & Lịch Sử",
    tagline: "Khốc Liệt • Hùng Tráng • Quả Cảm",
    category: "Chiến Tranh",
    highlight: "Chiến trường, tiểu sử và những dấu mốc lịch sử trên màn ảnh.",
    href: "/genre/chien-tranh",
    image: "https://image.tmdb.org/t/p/w780/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg",
    posterImage: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    countBadge: "Chiến trường & lịch sử",
    accentColor: "#f97316",
    glowColor: "rgba(249, 115, 22, 0.35)",
    badgeBg: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    icon: Shield,
  },
  {
    slug: "thuyet-minh-song-ngu-ai",
    title: "Thuyết Minh Song Ngữ AI",
    tagline: "Giọng Đọc AI • Song Ngữ • Chuẩn Điện Ảnh",
    category: "Thuyết Minh AI",
    highlight: "Kho phim có lựa chọn giọng đọc và phụ đề song ngữ.",
    href: "/films/thuyet-minh-ai",
    image: "https://image.tmdb.org/t/p/w780/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg",
    posterImage: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    countBadge: "Giọng đọc & phụ đề",
    accentColor: "#ec4899",
    glowColor: "rgba(236, 72, 153, 0.35)",
    badgeBg: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    icon: Languages,
  },
];

const DEFAULT_TOP10_FALLBACK: FilmItem[] = [
  {
    _id: "son-hai-kinh-thiet-lap-lai-trat-tu",
    name: "Sơn Hải Kinh: Thiết Lập Lại Trật Tự",
    origin_name: "The Classic of Mountains and Seas: Return to Order",
    slug: "son-hai-kinh-thiet-lap-lai-trat-tu",
    type: "single",
    poster_url:
      "https://phimimg.com/uploads/movies/20260719/son-hai-kinh-thiet-lap-lai-trat-tu-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260719/son-hai-kinh-thiet-lap-lai-trat-tu-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "tham-uyen-vo-gian",
    name: "Thâm Uyên Vô Gian",
    origin_name: "Abyss",
    slug: "tham-uyen-vo-gian",
    type: "series",
    poster_url:
      "https://phimimg.com/uploads/movies/20260910/tham-uyen-vo-gian-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260910/tham-uyen-vo-gian-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "tro-choi-con-muc-phan-2",
    name: "Trò Chơi Con Mực (Phần 2)",
    origin_name: "Squid Game (Season 2)",
    slug: "tro-choi-con-muc-phan-2",
    type: "series",
    poster_url:
      "https://phimimg.com/upload/vod/20241222-1/7f75c16e63ade7d45ad56f2f3e7a0453.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20241222-1/2c3095b8830832b8630d6d002975513b.jpg",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "nu-hoang-nuoc-mat",
    name: "Nữ Hoàng Nước Mắt",
    origin_name: "Queen Of Tears",
    slug: "nu-hoang-nuoc-mat",
    type: "series",
    poster_url:
      "https://phimimg.com/uploads/movies/20260723/nu-hoang-nuoc-mat-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260723/nu-hoang-nuoc-mat-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "deadpool-va-wolverine",
    name: "Deadpool Và Wolverine",
    origin_name: "Deadpool & Wolverine",
    slug: "deadpool-va-wolverine",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20250821-1/45b6b9aad03ae0aa2aceb5d73419831a.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250821-1/1ec414f82adc729512410edd1b083996.jpg",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "sinh-dung-thoi-diem",
    name: "Sinh Đúng Thời Điểm",
    origin_name: "In My Prime",
    slug: "sinh-dung-thoi-diem",
    type: "series",
    poster_url:
      "https://phimimg.com/uploads/movies/20260904/sinh-dung-thoi-diem-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260904/sinh-dung-thoi-diem-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "duoi-lan-lua-dan",
    name: "Dưới Làn Lửa Đạn",
    origin_name: "Under Fire",
    slug: "duoi-lan-lua-dan",
    type: "single",
    poster_url:
      "https://phimimg.com/uploads/movies/20260911/duoi-lan-lua-dan-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260911/duoi-lan-lua-dan-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "ham-tru-an",
    name: "Hầm Trú Ẩn",
    origin_name: "Silo / Dugout",
    slug: "ham-tru-an",
    type: "series",
    poster_url:
      "https://phimimg.com/upload/vod/20250512-1/c0bc3e1895fc6a849bc27346e05c9ddb.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250512-1/1b8e245bf2a817ca4d0ef01cc310216c.jpg",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "sat-thu-john-wick-phan-4",
    name: "Sát Thủ John Wick: Phần 4",
    origin_name: "John Wick: Chapter 4",
    slug: "sat-thu-john-wick-phan-4",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20230922-1/ee89142558805b924282cf86bc015dc9.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20230922-1/b6beb41b9fdf9449c4313e6ff28975e8.jpg",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "avatar-dong-chay-cua-nuoc",
    name: "Avatar: Dòng Chảy Của Nước",
    origin_name: "Avatar: The Way Of Water",
    slug: "avatar-dong-chay-cua-nuoc",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20250513-1/59fc5ffe0025ca40c99d48b070b59320.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250513-1/7b4e51db1a258ef9602558352066bfec.jpg",
    quality: "FHD",
    lang: "Vietsub",
  },
];

function ResilientHubCardImage({
  src,
  alt,
  isPriority = false,
}: {
  src: string;
  alt: string;
  isPriority?: boolean;
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
      loading={isPriority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={isPriority ? "high" : "auto"}
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<HubViewMode>("cinematic");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("genres_hub_view_mode") as HubViewMode;
      if (
        saved &&
        ["cinematic", "poster", "bento", "compact"].includes(saved)
      ) {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const handleChangeViewMode = (mode: HubViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("genres_hub_view_mode", mode);
    } catch {}
  };

  const { data: aiTop10Data } = useQuery({
    queryKey: ["ai-top10-recommendations"],
    queryFn: () => recommendationApi.getTop10(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const handlePrefetchHub = useCallback(
    (hub: HubCard) => {
      router.prefetch(hub.href);
      if (hub.slug === "marvel") {
        void queryClient.prefetchQuery({
          queryKey: ["films-universe", "marvel", 1],
          queryFn: () => Promise.resolve(getUniverseCatalog("marvel")),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === "dc") {
        void queryClient.prefetchQuery({
          queryKey: ["films-universe", "dc", 1],
          queryFn: () => Promise.resolve(getUniverseCatalog("dc")),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === "khoa-hoc-vien-tuong") {
        void queryClient.prefetchQuery({
          queryKey: ["genre", "vien-tuong", 1],
          queryFn: () =>
            movieApi.getByGenre("vien-tuong", 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === "chien-tranh") {
        void queryClient.prefetchQuery({
          queryKey: ["genre", "chien-tranh", 1],
          queryFn: () =>
            movieApi.getByGenre("chien-tranh", 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === "anime-hoat-hinh") {
        void queryClient.prefetchQuery({
          queryKey: ["films-type", "anime", 1],
          queryFn: () =>
            movieApi.getByCountryFast("nhat-ban", 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === "phim-han-quoc") {
        void queryClient.prefetchQuery({
          queryKey: ["country", "han-quoc", 1],
          queryFn: () =>
            movieApi.getByCountry("han-quoc", 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === "phim-trung-quoc") {
        void queryClient.prefetchQuery({
          queryKey: ["country", "trung-quoc", 1],
          queryFn: () =>
            movieApi.getByCountry("trung-quoc", 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      }
    },
    [queryClient, router],
  );

  const top10Films = useMemo(() => {
    const aiList: FilmItem[] = (aiTop10Data?.items as FilmItem[]) || [];
    const pool = aiList.length > 0 ? aiList : DEFAULT_TOP10_FALLBACK;
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
  }, [aiTop10Data?.items]);

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
              Chủ Đề
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
          {/* Section Header with View Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
              <h2
                className={`${cardFont.className} text-lg md:text-xl font-extrabold text-white tracking-[-0.015em] flex items-center gap-2`}
              >
                Vũ Trụ Điện Ảnh
              </h2>
              <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full">
                8 Vũ Trụ
              </span>
            </div>

            {/* View Mode Toggle Controls */}
            <div
              role="tablist"
              aria-label="Chế độ hiển thị thẻ vũ trụ điện ảnh"
              className="flex items-center gap-1 bg-[#12141c]/90 p-1 rounded-xl border border-white/[0.08] backdrop-blur-md self-start sm:self-auto shadow-inner"
            >
              {VIEW_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = viewMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleChangeViewMode(mode.id)}
                    aria-label={`Chế độ hiển thị: ${mode.label} (${mode.description})`}
                    title={`${mode.label} - ${mode.description}`}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 select-none cursor-pointer",
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                        : "text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-transparent",
                    )}
                  >
                    <Icon size={13} className={isActive ? "text-cyan-400" : "text-neutral-400"} />
                    <span className="text-[11px] font-medium hidden sm:inline">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── MODE 1: CINEMATIC (Thẻ Ngang Điện Ảnh) ── */}
          {viewMode === "cinematic" && (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-3.5">
              {HUBS.map((hub, idx) => {
                const Icon = hub.icon;
                return (
                  <Link
                    key={hub.slug}
                    href={hub.href}
                    prefetch={true}
                    onMouseEnter={() => handlePrefetchHub(hub)}
                    onFocus={() => handlePrefetchHub(hub)}
                    className="group relative flex flex-col justify-end h-[112px] sm:h-[130px] lg:h-[142px] overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.08] hover:border-white/30 bg-[#12141c] p-2 sm:p-2.5 lg:p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_35px_rgba(0,0,0,0.85)] cursor-pointer select-none"
                  >
                    {/* Full-Bleed Backdrop with Vignette */}
                    <div
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                      aria-hidden="true"
                    >
                      <ResilientHubCardImage
                        src={hub.image}
                        alt={hub.title}
                        isPriority={idx < 2}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/75 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b10]/80 via-transparent to-black/25" />
                      <div className="absolute inset-0 bg-black/15 group-hover:bg-transparent transition-colors duration-300" />
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{
                          background: `radial-gradient(ellipse at bottom left, ${hub.glowColor}, transparent 65%)`,
                        }}
                      />
                    </div>

                    {/* Content Lockup */}
                    <div className="relative z-10 space-y-0.5 sm:space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Icon size={10} className="text-cyan-400 shrink-0" />
                        <p className="text-[8px] sm:text-[9px] font-bold text-cyan-400 uppercase tracking-wider line-clamp-1">
                          {hub.tagline}
                        </p>
                      </div>

                      <h3 className="text-xs sm:text-sm lg:text-base font-black text-white tracking-tight leading-snug group-hover:text-cyan-100 transition-colors line-clamp-1">
                        {hub.title}
                      </h3>

                      <p className="text-[8.5px] sm:text-[9.5px] text-neutral-300 font-normal line-clamp-1 leading-tight opacity-80 hidden sm:block">
                        {hub.highlight}
                      </p>

                      <div className="pt-0.5 sm:pt-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-0.8 rounded-md bg-white/90 group-hover:bg-white text-black text-[8px] sm:text-[9.5px] font-extrabold transition-all duration-200 shadow-sm">
                          <Play size={8} fill="currentColor" />
                          <span>Khám phá</span>
                        </span>

                        <span className="text-[7.5px] sm:text-[8.5px] font-semibold text-neutral-400 group-hover:text-neutral-200 transition-colors">
                          {hub.countBadge || "Hơn 500+ Phim"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── MODE 2: POSTER (Thẻ Poster Đứng 3D Showcase) ── */}
          {viewMode === "poster" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3 lg:gap-3.5">
              {HUBS.map((hub, idx) => {
                const Icon = hub.icon;
                return (
                  <Link
                    key={hub.slug}
                    href={hub.href}
                    prefetch={true}
                    onMouseEnter={() => handlePrefetchHub(hub)}
                    onFocus={() => handlePrefetchHub(hub)}
                    className="group relative flex flex-col justify-between aspect-[2/3] min-h-[220px] sm:min-h-[260px] lg:min-h-[295px] overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.08] hover:border-white/35 bg-[#12141c] p-2.5 sm:p-3 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_35px_rgba(0,0,0,0.9)] cursor-pointer select-none"
                  >
                    {/* Vertical Poster Backdrop */}
                    <div
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                      aria-hidden="true"
                    >
                      <ResilientHubCardImage
                        src={hub.posterImage || hub.image}
                        alt={hub.title}
                        isPriority={idx < 3}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-transparent" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at center bottom, ${hub.glowColor}, transparent 70%)`,
                        }}
                      />
                    </div>

                    {/* Top Floating Badge */}
                    <div className="relative z-10 flex items-center justify-between w-full">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9.5px] font-black border backdrop-blur-md shadow-sm", hub.badgeBg)}>
                        <Icon size={10} />
                        <span>{hub.category}</span>
                      </span>

                      <div className="w-7 h-7 rounded-full bg-white/90 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200 shadow-md">
                        <Play size={11} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="relative z-10 space-y-1">
                      <p className="text-[8px] sm:text-[9px] font-bold text-cyan-400 uppercase tracking-wider line-clamp-1">
                        {hub.tagline}
                      </p>
                      <h3 className="text-xs sm:text-sm font-black text-white leading-snug group-hover:text-cyan-100 transition-colors line-clamp-2">
                        {hub.title}
                      </h3>
                      <div className="pt-1 border-t border-white/[0.08] flex items-center justify-between text-[8px] sm:text-[9px] font-semibold text-neutral-300">
                        <span>{hub.countBadge}</span>
                        <span className="text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center">
                          Xem <ChevronRight size={10} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── MODE 3: BENTO BOX (Bố Cục Nghệ Thuật) ── */}
          {viewMode === "bento" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
              {HUBS.map((hub, idx) => {
                const Icon = hub.icon;
                const isWide = idx === 0 || idx === 6;
                const isFull = idx === 7;
                return (
                  <Link
                    key={hub.slug}
                    href={hub.href}
                    prefetch={true}
                    onMouseEnter={() => handlePrefetchHub(hub)}
                    onFocus={() => handlePrefetchHub(hub)}
                    className={cn(
                      "group relative flex flex-col justify-end overflow-hidden rounded-2xl border border-white/[0.08] hover:border-white/35 bg-[#12141c] p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.85)] cursor-pointer select-none",
                      isFull
                        ? "lg:col-span-3 h-[145px] sm:h-[165px] lg:h-[185px]"
                        : isWide
                          ? "lg:col-span-2 h-[145px] sm:h-[165px] lg:h-[185px]"
                          : "lg:col-span-1 h-[145px] sm:h-[165px] lg:h-[185px]",
                    )}
                  >
                    {/* Backdrop */}
                    <div
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                      aria-hidden="true"
                    >
                      <ResilientHubCardImage
                        src={hub.image}
                        alt={hub.title}
                        isPriority={idx < 2}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/70 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b10]/85 via-transparent to-black/30" />
                      <div className="absolute inset-0 bg-black/15 group-hover:bg-transparent transition-colors duration-300" />
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at 10% 90%, ${hub.glowColor}, transparent 65%)`,
                        }}
                      />
                    </div>

                    {/* Bento Content */}
                    <div className="relative z-10 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border backdrop-blur-md", hub.badgeBg)}>
                          <Icon size={10} />
                          <span>{hub.category}</span>
                        </span>
                        <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider line-clamp-1">
                          {hub.tagline}
                        </p>
                      </div>

                      <h3 className={cn(
                        "font-black text-white tracking-tight leading-tight group-hover:text-cyan-100 transition-colors line-clamp-1",
                        isWide || isFull ? "text-base sm:text-lg lg:text-xl" : "text-sm sm:text-base",
                      )}>
                        {hub.title}
                      </h3>

                      <p className="text-[9.5px] sm:text-[11px] text-neutral-300 font-normal line-clamp-1 leading-relaxed opacity-85">
                        {hub.highlight}
                      </p>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/90 group-hover:bg-white text-black text-[9px] sm:text-[10px] font-black transition-all duration-200 shadow-md">
                          <Play size={9} fill="currentColor" />
                          <span>{isWide || isFull ? "Khám phá vũ trụ" : "Khám phá"}</span>
                        </span>

                        <span className="text-[8.5px] sm:text-[9.5px] font-semibold text-neutral-400 group-hover:text-neutral-200 transition-colors">
                          {hub.countBadge}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── MODE 4: COMPACT (Thanh Thẻ Tối Giản) ── */}
          {viewMode === "compact" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
              {HUBS.map((hub, idx) => {
                const Icon = hub.icon;
                return (
                  <Link
                    key={hub.slug}
                    href={hub.href}
                    prefetch={true}
                    onMouseEnter={() => handlePrefetchHub(hub)}
                    onFocus={() => handlePrefetchHub(hub)}
                    className="group relative flex items-center justify-between h-[70px] sm:h-[78px] overflow-hidden rounded-xl border border-white/[0.08] hover:border-cyan-400/40 bg-[#12141c] pr-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.7)] cursor-pointer select-none"
                  >
                    {/* Left Thumbnail Window */}
                    <div className="relative w-18 sm:w-20 h-full overflow-hidden shrink-0 rounded-l-xl">
                      <ResilientHubCardImage
                        src={hub.image}
                        alt={hub.title}
                        isPriority={idx < 3}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#12141c]" />
                      <div
                        className="absolute inset-0 opacity-40 group-hover:opacity-70 transition-opacity"
                        style={{ background: hub.accentColor, mixBlendMode: "color" }}
                      />
                    </div>

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0 px-2.5 sm:px-3 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Icon size={11} className="text-cyan-400 shrink-0" />
                        <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider line-clamp-1">
                          {hub.category}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-black text-white tracking-tight line-clamp-1 group-hover:text-cyan-200 transition-colors">
                        {hub.title}
                      </h3>
                      <p className="text-[9px] text-neutral-400 font-medium line-clamp-1">
                        {hub.countBadge}
                      </p>
                    </div>

                    {/* Right Chevron Button */}
                    <div className="w-7 h-7 rounded-full bg-white/[0.06] group-hover:bg-cyan-500 group-hover:text-black text-neutral-400 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105">
                      <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
