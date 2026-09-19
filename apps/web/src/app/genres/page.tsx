"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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

interface HubCard {
  slug: string;
  title: string;
  tagline: string;
  category: string;
  highlight: string;
  href: string;
  image: string;
  countBadge?: string;
  icon: typeof Tv;
}

const HUBS: HubCard[] = [
  {
    slug: "phim-han-quoc",
    title: "Phim Hàn Quốc",
    tagline: "K-Drama • Tình Cảm • Hồi Hộp",
    category: "Hàn Quốc",
    highlight: "Tình cảm, gia đình, hình sự và các series Hàn nổi bật.",
    href: "/country/han-quoc",
    image: "https://image.tmdb.org/t/p/w1280/8Dc24s2heFSqcpIsqDFlnjYICP.jpg",
    countBadge: "K-Drama tuyển chọn",
    icon: Tv,
  },
  {
    slug: "phim-trung-quoc",
    title: "Phim Trung Quốc",
    tagline: "Cổ Trang • Tiên Hiệp • Ngôn Tình",
    category: "Trung Quốc",
    highlight: "Cổ trang, tiên hiệp, ngôn tình và phim hiện đại Trung Quốc.",
    href: "/country/trung-quoc",
    image: "https://image.tmdb.org/t/p/w1280/4J8znHxVaZY3vKb05IWqWfzczXR.jpg",
    countBadge: "Cổ trang & hiện đại",
    icon: Flame,
  },
  {
    slug: "anime-hoat-hinh",
    title: "Anime & Hoạt Hình",
    tagline: "Shounen • Ghibli • 3D Chiếu Rạp",
    category: "Anime",
    highlight: "Anime dài tập, điện ảnh Nhật Bản và hoạt hình nổi bật.",
    href: "/films/anime",
    image: "https://image.tmdb.org/t/p/w1280/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg",
    countBadge: "Anime & điện ảnh",
    icon: Sparkles,
  },
  {
    slug: "doraemon",
    title: "Doraemon Movie",
    tagline: "Bảo Bối Thần Kỳ • Movie Chiếu Rạp • Stand by Me",
    category: "Doraemon",
    highlight:
      "Trọn bộ 48 movie chiếu rạp, Stand by Me 3D và những chuyến phiêu lưu kỳ thú của Doraemon và Nobita.",
    href: "/universe/doraemon",
    image: "https://phimimg.com/upload/vod/20250521-1/0514f6f2eef84b1340afd31c42574a2d.jpg",
    countBadge: "48 Movie",
    icon: Sparkles,
  },
  {
    slug: "conan",
    title: "Thám Tử Lừng Danh Conan",
    tagline: "Thám Tử Nhí • 28 Movie Chiếu Rạp • Án Mạng Bí Ẩn",
    category: "Detective Conan",
    highlight:
      "Trọn bộ 28 Movie chiếu rạp bom tấn, TV series phá án ly kỳ và cuộc đối đầu Kaito Kid, Tổ Chức Áo Đen.",
    href: "/universe/conan",
    image: "https://phimimg.com/upload/vod/20241229-1/309e1f1623755fa993140a83167f577b.jpg",
    countBadge: "34+ Movie & Series",
    icon: Shield,
  },
  {
    slug: "khoa-hoc-vien-tuong",
    title: "Khoa Học Viễn Tưởng",
    tagline: "Vũ Trụ • Đa Chiều • Tương Lai",
    category: "Viễn Tưởng",
    highlight: "Du hành vũ trụ, đa chiều, AI và những thế giới tương lai.",
    href: "/genre/vien-tuong",
    image: "https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg",
    countBadge: "Không gian & tương lai",
    icon: Rocket,
  },
  {
    slug: "chien-tranh",
    title: "Chiến Tranh & Lịch Sử",
    tagline: "Khốc Liệt • Hùng Tráng • Quả Cảm",
    category: "Chiến Tranh",
    highlight: "Chiến trường, tiểu sử và những dấu mốc lịch sử trên màn ảnh.",
    href: "/genre/chien-tranh",
    image: "https://image.tmdb.org/t/p/w1280/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg",
    countBadge: "Chiến trường & lịch sử",
    icon: Shield,
  },
  {
    slug: "thuyet-minh-song-ngu-ai",
    title: "Thuyết Minh Song Ngữ AI",
    tagline: "Giọng Đọc AI • Song Ngữ • Chuẩn Điện Ảnh",
    category: "Thuyết Minh AI",
    highlight: "Kho phim có lựa chọn giọng đọc và phụ đề song ngữ.",
    href: "/films/thuyet-minh-ai",
    image: "https://image.tmdb.org/t/p/w1280/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg",
    countBadge: "Giọng đọc & phụ đề",
    icon: Languages,
  },
  {
    slug: "marvel",
    title: "Vũ Trụ Marvel",
    tagline: "MCU • Multiverse • Avengers",
    category: "Marvel Studios",
    highlight:
      "Kỷ nguyên siêu anh hùng, biệt đội Avengers, Spider-Man và đa vũ trụ.",
    href: "/universe/marvel",
    image: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    countBadge: "175+ Bom Tấn",
    icon: Flame,
  },
  {
    slug: "dc",
    title: "Vũ Trụ DC",
    tagline: "Batman • Superman • Justice League",
    category: "DC Universe",
    highlight:
      "Hiệp sĩ bóng đêm Batman, Superman, Justice League và thế giới siêu anh hùng DC.",
    href: "/universe/dc",
    image: "https://image.tmdb.org/t/p/w1280/dqK9Hag1054tghRQSqLSfrkvQnA.jpg",
    countBadge: "180+ Kiệt Tác",
    icon: Shield,
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
    _id: "dao-doc-dac",
    name: "Đảo Độc Đắc",
    origin_name: "Jackpot Island",
    slug: "dao-doc-dac",
    type: "single",
    poster_url:
      "https://phimimg.com/uploads/movies/20260715/dao-doc-dac-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260715/dao-doc-dac-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "canh-sat-tap-su",
    name: "Cảnh Sát Tập Sự",
    origin_name: "Midnight Runners",
    slug: "canh-sat-tap-su",
    type: "single",
    poster_url:
      "https://phimimg.com/uploads/movies/20260721/canh-sat-tap-su-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260721/canh-sat-tap-su-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "biet-doi-san-moi",
    name: "Biệt Đội Săn Mồi",
    origin_name: "The Chaser Squad",
    slug: "biet-doi-san-moi",
    type: "single",
    poster_url:
      "https://phimimg.com/uploads/movies/20260720/biet-doi-san-moi-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260720/biet-doi-san-moi-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
];

function ResilientHubCardImage({
  src,
  isPriority,
}: {
  src: string;
  isPriority?: boolean;
}) {
  const candidates = useMemo(() => {
    if (src.includes("image.tmdb.org")) {
      return [
        `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=640&q=80&output=webp&we=1`,
        src,
        `/api/image-proxy?url=${encodeURIComponent(src)}&strict=1`,
      ];
    }
    return buildAsianHeroImageCandidates(src);
  }, [src]);

  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [src]);

  const currentSrc = candidates[candidateIdx] || src;

  return (
    <Image
      key={currentSrc}
      src={currentSrc}
      alt=""
      aria-hidden="true"
      fill
      unoptimized
      sizes="(max-width: 639px) calc(100vw - 28px), (max-width: 1279px) 50vw, 25vw"
      loading={isPriority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={isPriority ? "high" : "auto"}
      referrerPolicy="no-referrer"
      onError={() => {
        if (candidateIdx < candidates.length - 1) {
          setCandidateIdx((prev: number) => prev + 1);
        }
      }}
      className="object-cover object-center brightness-[0.92] saturate-[1.04] transition-[transform,filter] duration-500 ease-out group-hover:scale-[1.025] group-hover:brightness-100"
    />
  );
}

export default function GenresPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
          queryFn: async () => {
            const { getUniverseFilms } = await import("@/lib/universe-catalog");
            return getUniverseFilms("marvel");
          },
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === "dc") {
        void queryClient.prefetchQuery({
          queryKey: ["films-universe", "dc", 1],
          queryFn: async () => {
            const { getUniverseFilms } = await import("@/lib/universe-catalog");
            return getUniverseFilms("dc");
          },
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === "doraemon") {
        void queryClient.prefetchQuery({
          queryKey: ["films-universe", "doraemon", 1],
          queryFn: async () => {
            const { getUniverseFilms } = await import("@/lib/universe-catalog");
            return getUniverseFilms("doraemon");
          },
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === "conan") {
        void queryClient.prefetchQuery({
          queryKey: ["films-universe", "conan", 1],
          queryFn: async () => {
            const { getUniverseFilms } = await import("@/lib/universe-catalog");
            return getUniverseFilms("conan");
          },
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
          queryKey: ["country-fast", "han-quoc", 1, ""],
          queryFn: () =>
            movieApi.getByCountryFast("han-quoc", 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === "phim-trung-quoc") {
        void queryClient.prefetchQuery({
          queryKey: ["country-fast", "trung-quoc", 1, ""],
          queryFn: () =>
            movieApi.getByCountryFast("trung-quoc", 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === "thuyet-minh-song-ngu-ai") {
        void queryClient.prefetchQuery({
          queryKey: ["films-type", "thuyet-minh-ai", 1],
          queryFn: () =>
            movieApi.getThuyetMinh(1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      }
    },
    [queryClient, router],
  );

  // Background idle prefetch for top hubs
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      void queryClient.prefetchQuery({
        queryKey: ["country-fast", "han-quoc", 1, ""],
        queryFn: () =>
          movieApi.getByCountryFast("han-quoc", 1).then((r) => r.data),
        staleTime: 30 * 60 * 1000,
      });
      void queryClient.prefetchQuery({
        queryKey: ["country-fast", "trung-quoc", 1, ""],
        queryFn: () =>
          movieApi.getByCountryFast("trung-quoc", 1).then((r) => r.data),
        staleTime: 30 * 60 * 1000,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [queryClient]);

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
      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-3.5 sm:px-6 md:pl-20 md:pr-6 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-12 space-y-8 sm:space-y-10">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-3 sm:pb-4 border-b border-white/[0.08] gap-1.5 sm:gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              Chủ Đề
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
            Khám phá Top 10 thịnh hành và các chủ đề phim đặc sắc
          </p>
        </div>

        {/* ── TOP 10 Đang Được Xem Nhiều ── */}
        <section aria-label="TOP 10 Đang Được Xem Nhiều" className="pt-1">
          <Top10RankedRow
            films={top10Films}
            showCrown={false}
            className="mb-0"
          />
        </section>

        {/* ── 8 Chủ Đề Chuẩn Dark Cinematic ── */}
        <section aria-label="Danh sách chủ đề điện ảnh" className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-1 rounded-full bg-red-600" />
              <h2
                className={`${cardFont.className} text-lg md:text-xl font-extrabold text-white tracking-[-0.015em] flex items-center gap-2`}
              >
                Chủ Đề
              </h2>
              <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full">
                {HUBS.length} Chủ Đề
              </span>
            </div>
          </div>

          {/* Image-first cinematic grid: 2 columns on mobile, 2 on tablet, 4 on desktop */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            {HUBS.map((hub, idx) => {
              return (
                <Link
                  key={hub.slug}
                  href={hub.href}
                  prefetch={true}
                  onMouseEnter={() => handlePrefetchHub(hub)}
                  onFocus={() => handlePrefetchHub(hub)}
                  onTouchStart={() => handlePrefetchHub(hub)}
                  onPointerDown={() => handlePrefetchHub(hub)}
                  className="group relative isolate aspect-[4/3] sm:aspect-[16/10] min-h-[170px] sm:min-h-[210px] cursor-pointer select-none overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.10] bg-[#0e1017] shadow-[0_16px_42px_rgba(0,0,0,0.20)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_20px_52px_rgba(0,0,0,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090d]"
                >
                  {/* Artwork with rich contrast protection */}
                  <div
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    aria-hidden="true"
                  >
                    <ResilientHubCardImage
                      src={hub.image}
                      isPriority={idx < 4}
                    />
                    {/* Overall dark tint so bright artwork doesn't overpower text */}
                    <div className="absolute inset-0 bg-black/35 transition-opacity duration-300 group-hover:bg-black/25" />
                    {/* Deep bottom-to-top gradient ensuring text is 100% legible */}
                    <div className="absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-[#07080d] via-[#07080d]/95 via-50% to-transparent" />
                  </div>

                  {/* Bottom Info Lockup */}
                  <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4 sm:p-[18px]">
                    <p className="mb-1 sm:mb-1.5 line-clamp-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.12em] text-violet-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                      {hub.tagline}
                    </p>

                    <h3 className="line-clamp-1 text-xs sm:text-base lg:text-[17px] font-black leading-tight tracking-[-0.02em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                      {hub.title}
                    </h3>

                    <p className="mt-0.5 sm:mt-1 line-clamp-2 max-w-full text-[10px] sm:text-[11px] font-medium leading-[1.35] sm:leading-[1.4] text-neutral-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                      {hub.highlight}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
