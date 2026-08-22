"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Flame,
  Sparkles,
  Film,
  Compass,
  Heart,
  Smile,
  Ghost,
  Rocket,
  Users,
  Search,
  Crown,
  Video,
  Music,
  Globe2,
  Sword,
  Clapperboard,
  Tv,
} from "lucide-react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import {
  tmdbApi,
  tmdbPoster,
  tmdbBackdrop,
  type TmdbDiscoverOptions,
  type TmdbMovie,
} from "@/lib/tmdb";

// ── 1. SPOTLIGHT FEATURED HUBS (TOP QUỐC GIA & VŨ TRỤ TIÊU ĐIỂM) ────
interface FeaturedHub {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  description: string;
  href: string;
  accent: string;
  gradient: string;
  flag: string;
  discover: TmdbDiscoverOptions;
  // Multiple sharp fallback romance backdrops from TMDB CDN
  curatedBackdrops: string[];
}

const FEATURED_HUBS: FeaturedHub[] = [
  {
    id: "phim-han-quoc",
    title: "Điện Ảnh Hàn Quốc",
    subtitle: "K-Drama Ngôn Tình & Lãng Mạn",
    badge: "💖 NGÔN TÌNH HOT",
    badgeColor: "from-pink-500 via-rose-500 to-red-500",
    description:
      "K-Drama ngôn tình ngọt ngào, lãng mạn rung động trái tim và các câu chuyện tình yêu kinh điển xứ kim chi.",
    href: "/country/han-quoc",
    accent: "#fb7185",
    gradient: "from-rose-950/80 via-neutral-950/70 to-black/90",
    flag: "🇰🇷",
    // Focus specifically on popular Romance / Drama K-Dramas (Genre 10749)
    discover: { with_origin_country: "KR", with_genres: "10749", sort_by: "popularity.desc" },
    curatedBackdrops: [
      "https://image.tmdb.org/t/p/w1280/8Z8G8E3kLqM8tN7.jpg",
      "https://image.tmdb.org/t/p/w1280/2O4FhL8uM8tH8zR.jpg",
      "https://image.tmdb.org/t/p/w1280/9A1k0p8i9d8r7a8.jpg",
      "https://image.tmdb.org/t/p/w1280/q85h8h7l67nJ8c8.jpg",
      "https://image.tmdb.org/t/p/w1280/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    ],
  },
  {
    id: "phim-trung-quoc",
    title: "Điện Ảnh Trung Quốc",
    subtitle: "Cổ Trang Ngôn Tình & Thanh Xuân",
    badge: "✨ NGÔN TÌNH HOA NGỮ",
    badgeColor: "from-amber-500 via-orange-500 to-rose-500",
    description:
      "Vũ trụ phim ngôn tình cổ trang tiên hiệp kỳ ảo, thanh xuân vườn trường và tình cảm hiện đại siêu ngọt ngào.",
    href: "/country/trung-quoc",
    accent: "#f97316",
    gradient: "from-orange-950/80 via-neutral-950/70 to-black/90",
    flag: "🇨🇳",
    // Focus specifically on popular Romance / Cổ trang Hoa Ngữ (Genre 10749)
    discover: { with_origin_country: "CN", with_genres: "10749", sort_by: "popularity.desc" },
    curatedBackdrops: [
      "https://image.tmdb.org/t/p/w1280/3b23bL2q7lX8m9p.jpg",
      "https://image.tmdb.org/t/p/w1280/d1K5q7m8Lq9t8zR.jpg",
      "https://image.tmdb.org/t/p/w1280/7k9L8m5t8q9x7zR.jpg",
      "https://image.tmdb.org/t/p/w1280/4m8L7q9x7zR9m5t.jpg",
      "https://image.tmdb.org/t/p/w1280/1TUg5L5v.jpg",
    ],
  },
  {
    id: "phim-au-my",
    title: "Điện Ảnh Âu Mỹ & Hollywood",
    subtitle: "Blockbuster 4K & Oscar",
    badge: "🎬 BOM TẤN TOÀN CẦU",
    badgeColor: "from-blue-500 to-cyan-600",
    description:
      "Những kiệt tác điện ảnh Hollywood chuẩn 4K, kỹ xảo mãn nhãn và các siêu phẩm đoạt tượng vàng danh giá.",
    href: "/country/au-my",
    accent: "#06b6d4",
    gradient: "from-cyan-950/80 via-neutral-950/70 to-black/90",
    flag: "🇺🇸",
    discover: { with_origin_country: "US", sort_by: "popularity.desc" },
    curatedBackdrops: [
      "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
      "https://image.tmdb.org/t/p/w1280/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
    ],
  },
  {
    id: "anime-nhat-ban",
    title: "Anime & Hoạt Họa Nhật Bản",
    subtitle: "Thế Giới Anime Huyền Thoại",
    badge: "🌸 ĐẶC SẮC NHẬT BẢN",
    badgeColor: "from-purple-500 to-indigo-600",
    description:
      "Vũ trụ anime bất tận từ Shonen kịch tính, thế giới phép thuật kỳ ảo đến những thước phim chữa lành tâm hồn.",
    href: "/films/anime",
    accent: "#a855f7",
    gradient: "from-purple-950/80 via-neutral-950/70 to-black/90",
    flag: "🇯🇵",
    discover: {
      with_genres: "16",
      with_original_language: "ja",
      sort_by: "popularity.desc",
    },
    curatedBackdrops: [
      "https://image.tmdb.org/t/p/w1280/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg",
      "https://image.tmdb.org/t/p/w1280/8sNiqpwhvO4cdiXq7Srrqgz5pRx.jpg",
    ],
  },
];

// ── 2. GENRE TOPICS (DANH SÁCH THỂ LOẠI CHI TIẾT) ───────────────────
interface MovieGenre {
  slug: string;
  title: string;
  description: string;
  href: string;
  accent: string;
  icon: any;
  category: "popular" | "emotion" | "special";
  discover: TmdbDiscoverOptions;
}

const GENRE_TOPICS: MovieGenre[] = [
  {
    slug: "hanh-dong",
    title: "Hành Động Nghẹt Thở",
    description: "Đối đầu, truy đuổi và những trận chiến tốc độ cao mãn nhãn.",
    href: "/genre/hanh-dong",
    accent: "#fb7185",
    icon: Flame,
    category: "popular",
    discover: { with_genres: "28", sort_by: "popularity.desc" },
  },
  {
    slug: "vien-tuong",
    title: "Thế Giới Viễn Tưởng",
    description: "Không gian, tương lai và công nghệ ngoài sức tưởng tượng.",
    href: "/genre/vien-tuong",
    accent: "#60a5fa",
    icon: Rocket,
    category: "popular",
    discover: { with_genres: "878", sort_by: "popularity.desc" },
  },
  {
    slug: "kinh-di",
    title: "Kinh Dị Đêm Khuya",
    description: "Bầu không khí u ám, ám ảnh và những bí mật đáng sợ.",
    href: "/genre/kinh-di",
    accent: "#c084fc",
    icon: Ghost,
    category: "emotion",
    discover: { with_genres: "27", sort_by: "popularity.desc" },
  },
  {
    slug: "tinh-cam",
    title: "Tình Yêu & Lãng Mạn",
    description: "Những mối tình sâu sắc, ngọt ngào chạm đến trái tim.",
    href: "/genre/tinh-cam",
    accent: "#f472b6",
    icon: Heart,
    category: "emotion",
    discover: { with_genres: "10749", sort_by: "popularity.desc" },
  },
  {
    slug: "hai-huoc",
    title: "Hài Hước & Tiếng Cười",
    description: "Nhẹ nhàng, duyên dáng xả stress với vô vàn tràng cười sảng khoái.",
    href: "/genre/hai-huoc",
    accent: "#facc15",
    icon: Smile,
    category: "emotion",
    discover: { with_genres: "35", sort_by: "popularity.desc" },
  },
  {
    slug: "phieu-luu",
    title: "Phiêu Lưu Kỳ Thú",
    description: "Những chuyến viễn chinh xa xôi, vùng đất lạ và thử thách hiểm nguy.",
    href: "/genre/phieu-luu",
    accent: "#2dd4bf",
    icon: Compass,
    category: "popular",
    discover: { with_genres: "12", sort_by: "popularity.desc" },
  },
  {
    slug: "gia-dinh",
    title: "Gia Đình Cuối Tuần",
    description: "Ấm áp, tích cực và trọn vẹn cảm xúc để xem cùng người thân.",
    href: "/genre/gia-dinh",
    accent: "#4ade80",
    icon: Users,
    category: "emotion",
    discover: { with_genres: "10751", sort_by: "popularity.desc" },
  },
  {
    slug: "bi-an",
    title: "Bí Ẩn & Trinh Thám",
    description: "Manh mối nghẹt thở, cú lật bất ngờ và câu hỏi chưa có lời đáp.",
    href: "/genre/bi-an",
    accent: "#818cf8",
    icon: Search,
    category: "popular",
    discover: { with_genres: "9648", sort_by: "popularity.desc" },
  },
  {
    slug: "lich-su",
    title: "Sử Thi & Lịch Sử",
    description: "Tái hiện những thời đại lớn, chiến trường khốc liệt và nhân vật lẫy lừng.",
    href: "/genre/lich-su",
    accent: "#fbbf24",
    icon: Crown,
    category: "special",
    discover: { with_genres: "36", sort_by: "popularity.desc" },
  },
  {
    slug: "tai-lieu",
    title: "Tài Liệu Đời Thật",
    description: "Những câu chuyện chân thực về con người, thiên nhiên và xã hội.",
    href: "/genre/tai-lieu",
    accent: "#38bdf8",
    icon: Video,
    category: "special",
    discover: { with_genres: "99", sort_by: "popularity.desc" },
  },
  {
    slug: "am-nhac",
    title: "Âm Nhạc & Nghệ Thuật",
    description: "Giai điệu bất hủ, vũ đạo thăng hoa và những màn trình diễn đỉnh cao.",
    href: "/genre/am-nhac",
    accent: "#e879f9",
    icon: Music,
    category: "special",
    discover: { with_genres: "10402", sort_by: "popularity.desc" },
  },
  {
    slug: "chinh-kich",
    title: "Tâm Lý Xã Hội",
    description: "Khai thác sâu sắc nội tâm con người, xung đột và số phận đa đoan.",
    href: "/genre/tam-ly",
    accent: "#a78bfa",
    icon: Clapperboard,
    category: "popular",
    discover: { with_genres: "18", sort_by: "popularity.desc" },
  },
];

// Helper to extract sharp TMDB backdrops with randomized romance selection
function extractTmdbBackdrop(
  movieList?: TmdbMovie[],
  fallbackList?: string[],
  seed = 0,
): string | null {
  if (movieList && movieList.length > 0) {
    const candidates = movieList.filter((m) => Boolean(m.backdrop_path));
    if (candidates.length > 0) {
      const idx = Math.abs(seed) % Math.min(candidates.length, 6);
      const chosen = candidates[idx];
      if (chosen?.backdrop_path) {
        return tmdbBackdrop(chosen.backdrop_path, "w1280");
      }
    }
    const posterCandidates = movieList.filter((m) => Boolean(m.poster_path));
    if (posterCandidates.length > 0) {
      const idx = Math.abs(seed) % Math.min(posterCandidates.length, 6);
      const chosen = posterCandidates[idx];
      if (chosen?.poster_path) {
        return tmdbPoster(chosen.poster_path, "w780");
      }
    }
  }
  if (fallbackList && fallbackList.length > 0) {
    return fallbackList[Math.abs(seed) % fallbackList.length];
  }
  return null;
}

export default function GenresTopicsPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [loadRemaining, setLoadRemaining] = useState(false);
  const [randomSeed, setRandomSeed] = useState(0);

  useEffect(() => {
    setRandomSeed(Math.floor(Math.random() * 10));
    const timer = setTimeout(() => setLoadRemaining(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // 1. Fetch real TMDB items for Spotlight Featured Hubs
  const featuredQueries = useQueries({
    queries: FEATURED_HUBS.map((hub) => ({
      queryKey: ["featured-hub-tmdb", hub.id, hub.discover],
      queryFn: async () => {
        try {
          const res = await tmdbApi.discoverMovies(hub.discover);
          return res?.results || [];
        } catch {
          return [];
        }
      },
      staleTime: 60 * 60 * 1000,
    })),
  });

  // 2. Fetch real TMDB items for Genres
  const genreQueries = useQueries({
    queries: GENRE_TOPICS.map((genre, idx) => ({
      queryKey: ["genre-topic-tmdb", genre.slug, genre.discover],
      queryFn: async () => {
        try {
          const res = await tmdbApi.discoverMovies(genre.discover);
          return res?.results || [];
        } catch {
          return [];
        }
      },
      staleTime: 60 * 60 * 1000,
      enabled: idx < 6 || loadRemaining,
    })),
  });

  const filteredGenres = useMemo(() => {
    if (activeFilter === "all") return GENRE_TOPICS;
    return GENRE_TOPICS.filter((g) => g.category === activeFilter);
  }, [activeFilter]);

  return (
    <main
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] overflow-hidden bg-[#0c0d12] text-white px-4 sm:px-6 pb-28 pt-20 md:pr-8 lg:pl-24",
      )}
    >
      {/* Background Ambient Aura Orbs */}
      <div className="pointer-events-none fixed left-1/4 top-10 h-[450px] w-[450px] rounded-full bg-rose-600/10 blur-[130px]" />
      <div className="pointer-events-none fixed right-1/4 top-32 h-[450px] w-[450px] rounded-full bg-cyan-600/10 blur-[130px]" />
      <div className="pointer-events-none fixed bottom-10 left-1/3 h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[150px]" />

      <div className="relative mx-auto w-full max-w-[1720px]">
        {/* ── HEADER NAVIGATION & HERO TITLE ── */}
        <header className="mb-8 sm:mb-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 transition-colors hover:text-white cursor-pointer px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08]"
          >
            <ArrowLeft size={14} /> Quay lại
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/20">
              <Sparkles size={12} />
              Vũ Trụ Điện Ảnh & Thể Loại
            </span>
            <span className="text-[11px] font-medium text-neutral-400 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
              Tuyển chọn 4K
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Thế Giới Phim
          </h1>
          <p className="mt-2.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-neutral-400">
            Khám phá vũ trụ điện ảnh theo từng quốc gia nổi tiếng và thể loại đặc sắc. Mỗi chủ đề mở ra hàng ngàn bộ phim bom tấn với chất lượng hình ảnh sắc nét.
          </p>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 1: 🔥 TIÊU ĐIỂM QUỐC GIA LÊN ĐẦU TIÊN (FEATURED HUBS)
            Đặc biệt: Điện Ảnh Hàn Quốc & Điện Ảnh Trung Quốc ở vị trí nổi bật nhất!
        ───────────────────────────────────────────────────────────── */}
        <section aria-label="Tiêu điểm điện ảnh quốc gia" className="mb-14">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Globe2 size={18} className="text-rose-400" />
                Tiêu Điểm Quốc Gia & Vũ Trụ Điện Ảnh
              </h2>
            </div>
            <span className="text-xs text-neutral-500 font-medium hidden sm:inline-block">
              Hình ảnh sắc nét từ TMDB Cinema
            </span>
          </div>

          {/* 4 Large Featured Hero Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            {FEATURED_HUBS.map((hub, idx) => {
              const movies = featuredQueries[idx]?.data || [];
              const rawBackdrop = extractTmdbBackdrop(movies, hub.curatedBackdrops, randomSeed + idx);
              const topTitles = movies.slice(0, 3).map((m) => m.title).filter(Boolean);

              return (
                <Link
                  key={hub.id}
                  href={hub.href}
                  className="group relative flex min-h-[280px] sm:min-h-[320px] flex-col justify-between overflow-hidden rounded-[26px] border border-white/[0.12] bg-[#12141c] p-6 transition-all duration-500 hover:-translate-y-1.5 hover:border-white/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.85)] cursor-pointer select-none"
                >
                  {/* Real Sharp TMDB Backdrop Image */}
                  {rawBackdrop && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                      <Image
                        src={rawBackdrop}
                        alt={hub.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        className="object-cover object-center brightness-[0.85] contrast-[1.05] transition-all duration-700 group-hover:scale-110 group-hover:brightness-100"
                        priority={idx < 2}
                        unoptimized
                      />
                      {/* Gradient Overlay for High Readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/75 to-black/30 group-hover:via-[#090a0f]/50 transition-colors duration-500" />
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at top right, ${hub.accent}33 0%, transparent 60%)`,
                        }}
                      />
                    </div>
                  )}

                  {/* Top Bar: Flag + Badge + Action Arrow */}
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl drop-shadow-md">{hub.flag}</span>
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase text-white shadow-md bg-gradient-to-r",
                          hub.badgeColor,
                        )}
                      >
                        {hub.badge}
                      </span>
                    </div>

                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white transition-all duration-300 group-hover:bg-white group-hover:text-black group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                    >
                      <ArrowUpRight size={17} strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Bottom Content: Title & Top Titles preview */}
                  <div className="relative z-10 mt-auto pt-8">
                    <span
                      className="inline-block text-[11px] font-extrabold uppercase tracking-wider mb-1"
                      style={{ color: hub.accent }}
                    >
                      {hub.subtitle}
                    </span>
                    <h3 className="text-2xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] group-hover:text-white transition-colors">
                      {hub.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                      {hub.description}
                    </p>

                    {/* Trending Movie Name Chips (if available) */}
                    {topTitles.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.08]">
                        {topTitles.map((title, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/60 backdrop-blur-sm border border-white/10 text-neutral-300 truncate max-w-[140px]"
                          >
                            {title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 2: 🎬 VŨ TRỤ THỂ LOẠI CHI TIẾT (GENRE MATRIX GRID)
        ───────────────────────────────────────────────────────────── */}
        <section aria-label="Danh mục thể loại phim">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Film size={18} className="text-cyan-400" />
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Vũ Trụ Thể Loại Phim
              </h2>
            </div>

            {/* Quick Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: "all", label: "Tất Cả Thể Loại" },
                { id: "popular", label: "🔥 Phổ Biến Nhất" },
                { id: "emotion", label: "❤️ Cảm Xúc & Thư Giãn" },
                { id: "special", label: "⭐ Đặc Biệt & Sử Thi" },
              ].map((filter) => {
                const isSelected = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border select-none shrink-0",
                      isSelected
                        ? "bg-white text-black border-white shadow-md font-extrabold scale-[1.02]"
                        : "bg-white/[0.03] text-neutral-400 border-white/[0.06] hover:bg-white/[0.08] hover:text-white",
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Genre Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-4.5">
            {filteredGenres.map((genre) => {
              const genreIndex = GENRE_TOPICS.findIndex((g) => g.slug === genre.slug);
              const movies = genreQueries[genreIndex]?.data || [];
              const rawBackdrop = extractTmdbBackdrop(movies);
              const Icon = genre.icon;

              return (
                <Link
                  key={genre.slug}
                  href={genre.href}
                  className="group relative flex min-h-[210px] flex-col justify-between overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#11131a] p-5 sm:p-6 transition-all duration-400 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_16px_40px_rgba(0,0,0,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer"
                >
                  {/* Real Sharp TMDB Backdrop Artwork */}
                  {rawBackdrop && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                      <Image
                        src={rawBackdrop}
                        alt={genre.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover object-center opacity-70 brightness-[0.9] contrast-[1.05] transition-all duration-500 group-hover:scale-108 group-hover:opacity-90 group-hover:brightness-105"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/70 to-black/25 group-hover:from-[#090a0f]/90 group-hover:via-[#090a0f]/45 transition-colors duration-300" />
                    </div>
                  )}

                  {/* Top: Icon + Accent Bar + Arrow */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-xl backdrop-blur-md border border-white/10 text-white"
                        style={{ backgroundColor: `${genre.accent}25` }}
                      >
                        <Icon size={16} style={{ color: genre.accent }} />
                      </div>
                      <span
                        className="inline-block h-1.5 w-6 rounded-full transition-all duration-300 group-hover:w-10"
                        style={{ backgroundColor: genre.accent }}
                      />
                    </div>

                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/80 transition-all duration-300 group-hover:bg-white group-hover:text-black group-hover:shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                      <ArrowUpRight size={14} />
                    </div>
                  </div>

                  {/* Bottom: Title & Description */}
                  <div className="relative z-10 mt-auto pt-6">
                    <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] group-hover:text-white transition-colors">
                      {genre.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                      {genre.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 3: 💡 GỢI Ý XEM THEO TÂM TRẠNG & CẢM XÚC (MOOD SELECTOR)
        ───────────────────────────────────────────────────────────── */}
        <section className="mt-16 rounded-[26px] border border-white/[0.1] bg-gradient-to-r from-purple-950/30 via-neutral-950/60 to-cyan-950/30 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Sparkles size={14} />
                Gợi Ý Hôm Nay
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Bạn Đang Cần Tìm Cảm Giác Thế Nào?
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-xl">
                Bấm nhanh vào tâm trạng hiện tại để hệ thống đề xuất ngay những bộ phim phù hợp nhất với bạn:
              </p>
            </div>

            {/* Quick Mood Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/genre/hai-huoc"
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.05] border border-white/10 hover:bg-yellow-500 hover:text-black hover:border-yellow-400 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>😂 Xả stress</span>
              </Link>
              <Link
                href="/genre/kinh-di"
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.05] border border-white/10 hover:bg-purple-500 hover:text-white hover:border-purple-400 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>😱 Thót tim gay cấn</span>
              </Link>
              <Link
                href="/genre/tinh-cam"
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.05] border border-white/10 hover:bg-pink-500 hover:text-white hover:border-pink-400 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>💖 Ngọt ngào lãng mạn</span>
              </Link>
              <Link
                href="/genre/hanh-dong"
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.05] border border-white/10 hover:bg-rose-500 hover:text-white hover:border-rose-400 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>💥 Mãn nhãn bùng nổ</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
