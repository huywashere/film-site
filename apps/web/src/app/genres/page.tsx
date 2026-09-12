"use client";

import { useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  ChevronRight,
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
    slug: "marvel",
    title: "Vũ Trụ Điện Ảnh Marvel",
    tagline: "MCU • Multiverse • Avengers",
    category: "Marvel Studios",
    highlight: "Kỷ nguyên siêu anh hùng, biệt đội Avengers, Spider-Man và đa vũ trụ.",
    href: "/universe/marvel",
    image: "https://image.tmdb.org/t/p/w780/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    countBadge: "175+ Bom Tấn",
    icon: Flame,
  },
  {
    slug: "dc",
    title: "Vũ Trụ Điện Ảnh DC",
    tagline: "Batman • Superman • Justice League",
    category: "DC Universe",
    highlight: "Hiệp sĩ bóng đêm Batman, Superman, Justice League và thế giới siêu anh hùng DC.",
    href: "/universe/dc",
    image: "https://image.tmdb.org/t/p/w780/dqK9Hag1054tghRQSqLSfrkvQnA.jpg",
    countBadge: "180+ Kiệt Tác",
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
    image: "https://image.tmdb.org/t/p/w780/4J8znHxVaZY3vKb05IWqWfzczXR.jpg",
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
    image: "https://image.tmdb.org/t/p/w780/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg",
    countBadge: "Anime & điện ảnh",
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
    image: "https://image.tmdb.org/t/p/w780/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg",
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
    image: "https://image.tmdb.org/t/p/w780/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg",
    countBadge: "Giọng đọc & phụ đề",
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
  alt,
  isPriority,
}: {
  src: string;
  alt: string;
  isPriority?: boolean;
}) {
  const candidates = useMemo(() => {
    return buildAsianHeroImageCandidates(src);
  }, [src]);

  const [candidateIdx, setCandidateIdx] = useMemo(() => {
    let idx = 0;
    return [
      idx,
      (nextVal: number | ((prev: number) => number)) => {
        if (typeof nextVal === "function") {
          idx = nextVal(idx);
        } else {
          idx = nextVal;
        }
      },
    ];
  }, []);

  const currentSrc = candidates[candidateIdx] || src;

  return (
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
      className="w-full h-full object-cover object-center brightness-[0.58] contrast-[1.1] transition-transform duration-500 ease-out group-hover:scale-105 group-hover:brightness-[0.72]"
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
      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-3.5 sm:px-6 md:pl-20 md:pr-6 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-12 space-y-8 sm:space-y-10">
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

        {/* ── TOP 10 Đang Được Xem Nhiều ── */}
        <section aria-label="TOP 10 Đang Được Xem Nhiều" className="pt-1">
          <Top10RankedRow
            films={top10Films}
            showCrown={false}
            className="mb-0"
          />
        </section>

        {/* ── 8 Vũ Trụ Điện Ảnh Chuẩn Dark Cinematic ── */}
        <section
          aria-label="Danh sách vũ trụ điện ảnh"
          className="space-y-4"
        >
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-1 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              <h2
                className={`${cardFont.className} text-lg md:text-xl font-extrabold text-white tracking-[-0.015em] flex items-center gap-2`}
              >
                Vũ Trụ Điện Ảnh
              </h2>
              <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full">
                8 Vũ Trụ
              </span>
            </div>
          </div>

          {/* Clean 8-Card Cinematic Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {HUBS.map((hub, idx) => {
              const Icon = hub.icon;
              return (
                <Link
                  key={hub.slug}
                  href={hub.href}
                  prefetch={true}
                  onMouseEnter={() => handlePrefetchHub(hub)}
                  onFocus={() => handlePrefetchHub(hub)}
                  className="group relative flex flex-col justify-between h-[132px] sm:h-[150px] lg:h-[162px] overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.08] hover:border-white/25 bg-[#0e1017] p-3 sm:p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(0,0,0,0.85)] cursor-pointer select-none"
                >
                  {/* Backdrop Image with Deep Cinematic Vignette */}
                  <div
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    aria-hidden="true"
                  >
                    <ResilientHubCardImage
                      src={hub.image}
                      alt={hub.title}
                      isPriority={idx < 4}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/80 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b10]/85 via-[#0a0b10]/30 to-black/30" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors duration-300" />
                  </div>

                  {/* Top Category Badge Row */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 border border-white/[0.08] text-[9px] sm:text-[10px] font-semibold text-neutral-300 backdrop-blur-md">
                      <Icon size={11} className="text-white/70" />
                      <span>{hub.category}</span>
                    </span>

                    <span className="text-[8.5px] sm:text-[9.5px] font-medium text-neutral-400 bg-black/50 border border-white/[0.06] px-2 py-0.5 rounded-md backdrop-blur-sm">
                      {hub.countBadge}
                    </span>
                  </div>

                  {/* Bottom Info Lockup */}
                  <div className="relative z-10 space-y-1">
                    <h3 className="text-xs sm:text-sm lg:text-[15px] font-black text-white tracking-tight leading-snug group-hover:text-cyan-300 transition-colors line-clamp-1">
                      {hub.title}
                    </h3>

                    <p className="text-[9px] sm:text-[10px] text-neutral-400 font-normal line-clamp-1 leading-tight opacity-85 hidden sm:block">
                      {hub.highlight}
                    </p>

                    {/* Sleek Dark Action Bar (Zero bright white buttons) */}
                    <div className="pt-1 flex items-center justify-between border-t border-white/[0.06]">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] group-hover:bg-white/[0.14] border border-white/[0.1] text-white/90 text-[9px] sm:text-[10px] font-bold transition-all duration-200 backdrop-blur-md">
                        <Play size={9} fill="currentColor" className="text-white/80" />
                        <span>Khám phá</span>
                      </span>

                      <span className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 group-hover:text-white transition-colors flex items-center gap-0.5">
                        <span>Xem phim</span>
                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform text-neutral-400 group-hover:text-cyan-400" />
                      </span>
                    </div>
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
