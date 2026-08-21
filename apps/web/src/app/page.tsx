"use client";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronRight, ChevronLeft, ChevronDown, Loader2 } from "lucide-react";
import { api, movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmCardSkeleton,
  FilmItem,
} from "@/components/film/FilmCard";
import { useTranslation } from "@/store/langStore";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import { Top10RankedRow } from "@/components/film/Top10RankedRow";
import { ContinueWatchingRow } from "@/components/film/ContinueWatchingRow";
import { DashPagination } from "@/components/film/DashPagination";
import { HeroShowcaseSection } from "@/components/film/HeroShowcaseSection";
import { CuratedSpotlightSection } from "@/components/film/CuratedSpotlightSection";

const HomeAnnouncementPopup = dynamic(
  () =>
    import("@/components/layout/HomeAnnouncementPopup").then(
      (module) => module.HomeAnnouncementPopup,
    ),
  { ssr: false },
);
import { WeeklyScheduleSection } from "@/components/film/WeeklyScheduleSection";
import HeroBanner from "@/app/components/HeroBanner";
import { cardFont } from "@/lib/fonts";

import "swiper/css";
import "swiper/css/navigation";

// Helper: Làm sạch và trích xuất các khóa nhận diện thương hiệu/franchise (tránh đề xuất Phần 1, Phần 2, Phần 3 cùng lúc)
function getFranchiseTokens(film: FilmItem): string[] {
  const tokens: string[] = [];

  const clean = (text?: string) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .replace(/\s*\([^)]*\)/g, " ") // Bỏ ngoặc (Phần 1), (Season 2), (2024), etc.
      .replace(/[-:]\s*(phan|season|part|tap|ss|mua)\s*\d+/gi, " ")
      .replace(/\s+(phan|season|part|tap|ss|mua)\s*\d+/gi, " ")
      .replace(/\s+(i{1,3}|iv|v|vi{1,3}|ix|x)$/gi, " ") // Số La Mã ở cuối
      .replace(/\s+\d+$/g, " ") // Số ở cuối như "Mortal Kombat 2" -> "mortal kombat"
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const cleanSlug = (s?: string) => {
    if (!s) return "";
    return s
      .toLowerCase()
      .replace(/-phan-\d+/gi, "")
      .replace(/-season-\d+/gi, "")
      .replace(/-part-\d+/gi, "")
      .replace(/-ss\d+/gi, "")
      .replace(/-tap-\d+/gi, "")
      .replace(/-mua-\d+/gi, "")
      .replace(/-(i{1,3}|iv|v|vi{1,3}|ix|x)$/gi, "")
      .replace(/-\d+$/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .trim();
  };

  const nameToken = clean(film.name || film.title);
  const originToken = clean(film.origin_name);
  const slugToken = cleanSlug(film.slug);

  if (nameToken && nameToken.length >= 3) tokens.push(`name:${nameToken}`);
  if (originToken && originToken.length >= 3) tokens.push(`origin:${originToken}`);
  if (slugToken && slugToken.length >= 3) tokens.push(`slug:${slugToken}`);

  return tokens;
}

// Helper: Loại bỏ phim trùng lặp theo ID/slug VÀ chỉ giữ 1 phần đại diện duy nhất cho mỗi phim/series
function deduplicate(films: FilmItem[]): FilmItem[] {
  const seenIds = new Set<string>();
  const seenFranchiseTokens = new Set<string>();

  return (films || []).filter((film) => {
    if (!film) return false;
    const exactKey = film._id || film.slug;
    if (exactKey && seenIds.has(exactKey.toLowerCase())) return false;

    const tokens = getFranchiseTokens(film);
    // Nếu phim này cùng tên franchise/series với phim đã có trong danh sách -> Bỏ qua phần trùng
    const hasDuplicateFranchise = tokens.some((token) =>
      seenFranchiseTokens.has(token),
    );
    if (hasDuplicateFranchise) return false;

    if (exactKey) seenIds.add(exactKey.toLowerCase());
    tokens.forEach((token) => seenFranchiseTokens.add(token));
    return true;
  });
}

function catalogItemCount(data: any): number {
  const items = data?.data?.items || data?.items || [];
  return Array.isArray(items) ? items.length : 0;
}

// Fallback riêng cho hàng Top 10. Hero không còn dùng bộ banner tĩnh này.
const HOLLYWOOD_TOP10_POOL: FilmItem[] = [
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
    time: "128 phút",
    episode_current: "Full",
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    year: 2024,
    vote_average: 8.5,
    rating: 8.5,
    content:
      "Marvel Universe - Bộ đôi lầy lội Deadpool và Wolverine bắt tay trong phi vụ bảo vệ đa vũ trụ Marvel.",
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
    time: "148 phút",
    episode_current: "Full",
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    year: 2021,
    vote_average: 8.3,
    rating: 8.3,
    content:
      "Marvel Cinematic Universe - Khi danh tính bị tiết lộ, Peter Parker nhờ Doctor Strange làm phép xé rách đa vũ trụ.",
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
    time: "152 phút",
    episode_current: "Full",
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    year: 2008,
    vote_average: 9.0,
    rating: 9.0,
    content:
      "DC Universe - Batman bước vào cuộc đụng độ khốc liệt nhất lịch sử Gotham chống lại tên tội phạm thiên tài Joker.",
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
    time: "192 phút",
    episode_current: "Full",
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    year: 2022,
    vote_average: 8.8,
    rating: 8.8,
    content:
      "Sci-Fi Masterpiece - Jake Sully cùng gia đình Na'vi bảo vệ vùng biển đại dương Pandora huyền ảo.",
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
    time: "181 phút",
    episode_current: "Full",
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    year: 2019,
    vote_average: 8.9,
    rating: 8.9,
    content:
      "Marvel Cinematic Universe - Các siêu anh hùng sống sót sau cú búng tay của Thanos cùng nhau tập hợp cho trận chiến quyết định vận mệnh vũ trụ.",
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
    time: "169 phút",
    episode_current: "Full",
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    year: 2014,
    vote_average: 8.7,
    rating: 8.7,
    content:
      "Sci-Fi / Khoa Học Viễn Tưởng - Nhóm phi hành gia du hành qua hố giun không gian để tìm kiếm ngôi nhà mới cho nhân loại trước nguy cơ diệt vong.",
  },
];

const RETIRED_HERO_TITLES = [
  "deadpool & wolverine",
  "spider-man: no way home",
  "the dark knight",
  "avatar: the way of water",
  "avengers: endgame",
  "interstellar",
  "joker",
  "the batman",
];

function isRetiredHeroFilm(film: FilmItem): boolean {
  const title = `${film.name || ""} ${film.origin_name || ""}`.toLowerCase();
  return RETIRED_HERO_TITLES.some((retiredTitle) =>
    title.includes(retiredTitle),
  );
}

function hasHeroArtwork(film: FilmItem): boolean {
  return Boolean(film.thumb_url && film.poster_url);
}

// Helper: Nhận diện phim Anime hoặc Hoạt hình 3D (Đấu La, Trảm Thần, Tiên Ni...)
function isAnimationOrAnime(film: FilmItem): boolean {
  if (!film || !film.name) return false;
  const name = film.name.toLowerCase();
  const slug = (film.slug || "").toLowerCase();
  const type = (film.type || "").toLowerCase();

  if (
    type === "hoathinh" ||
    slug.includes("hoat-hinh") ||
    slug.includes("anime")
  ) {
    return true;
  }

  // Keywords for Chinese 3D Donghua / Anime
  const animKeywords = [
    "hoạt hình",
    "anime",
    "3d",
    "phong thần",
    "trảm thần",
    "tiên nghịch",
    "đẩu la",
    "vạn cổ",
    "thôn phệ",
    "thế giới hoàn mỹ",
    "già thiên",
    "đại chủ tể",
    "thần ấn",
    "ngẫu nhiên",
    "manga",
  ];

  return animKeywords.some((kw) => name.includes(kw) || slug.includes(kw));
}

// Lọc CHỈ giữ lại phim người đóng thật (Live-Action), loại bỏ 3D/Anime cho các hàng phim thông thường
function filterLiveActionOnly(films: FilmItem[]): FilmItem[] {
  return films.filter((f) => !isAnimationOrAnime(f));
}

function isLikelySeries(film: FilmItem): boolean {
  const type = (film.type || "").toLowerCase();
  const episode = (film.episode_current || "").toLowerCase();
  const title = `${film.name || ""} ${film.origin_name || ""}`.toLowerCase();
  return (
    ["series", "phim-bo", "tvshows", "tv-shows"].includes(type) ||
    /tập|episode|hoàn tất|đang chiếu/.test(episode) ||
    /phần \d+|season \d+/.test(title)
  );
}

const SECTION_TITLE_TONES: Record<string, string> = {
  "Phim Mới Cập Nhật": "from-cyan-400 via-sky-400 to-indigo-300",
  "Phim Thần Thoại & Kỹ Xảo": "from-violet-400 via-fuchsia-400 to-rose-300",
  "Phim Hành Động": "from-orange-400 via-amber-400 to-yellow-300",
  "Phim Âu-Mỹ Đáng Xem": "from-emerald-400 via-teal-400 to-cyan-300",
  "Series Quốc Tế": "from-blue-400 via-indigo-400 to-violet-300",
  "Anime & Hoạt Hình": "from-pink-400 via-rose-400 to-orange-300",
  "Phim Phiêu Lưu Mạo Hiểm": "from-lime-400 via-emerald-400 to-teal-300",
  "Phim Lẻ Âu-Mỹ Chất Lượng Cao": "from-amber-300 via-yellow-300 to-lime-300",
  "Phim Chính Kịch": "from-purple-400 via-violet-400 to-blue-300",
  "Phim Kinh Dị & Sinh Tồn": "from-red-400 via-rose-400 to-orange-300",
  "Thể Loại Chiến Tranh Và Gai Góc":
    "from-stone-300 via-neutral-400 to-slate-300",
  "Phim Hài": "from-yellow-300 via-lime-300 to-emerald-300",
  "Phim Tình Cảm": "from-fuchsia-400 via-pink-400 to-rose-300",
};

function sectionTitleTone(title: string) {
  return (
    SECTION_TITLE_TONES[title] || "from-cyan-400 via-sky-400 to-indigo-300"
  );
}

// Standard Film Carousel Section Component (With Sleek Right Vertical Pills Navigation)
function FilmSection({
  title,
  films,
  isLoading,
  href,
}: {
  title: string;
  films: FilmItem[];
  isLoading: boolean;
  href?: string;
}) {
  const { t } = useTranslation();
  const [swiper, setSwiper] = useState<any>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!isLoading && (!films || films.length === 0)) return null;

  return (
    <div
      data-film-section="true"
      className={`${cardFont.className} mb-8 group/section`}
    >
      {/* Title Header matching user's requested layout (Inline pill button + right dash line pagination) */}
      <div className="mb-3.5 flex items-center justify-between px-1">
        {/* Left Side: Title + Inline "Xem tất cả >" Pill Button */}
        <div className="flex items-center gap-2.5">
          <div>
            <h2
              data-film-section-title="true"
              className={`${cardFont.className} bg-gradient-to-r ${sectionTitleTone(title)} bg-clip-text text-xl font-extrabold tracking-[-0.025em] text-transparent sm:text-2xl`}
            >
              {title}
            </h2>
          </div>
          {href && (
            <Link
              href={href}
              data-film-section-action="true"
              className={`${cardFont.className} inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.12] text-white/90 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ml-1`}
            >
              <span>{t("home.viewAll", "Xem tất cả")}</span>
              <ChevronRight size={12} strokeWidth={2.5} />
            </Link>
          )}
        </div>

        {/* Right Side: Dynamic Dash Line Pagination Indicators (— - - - -) */}
        {isLoading ? (
          <div className="h-2 w-24 rounded bg-white/[0.07] motion-safe:animate-pulse" />
        ) : (
          <DashPagination swiper={swiper} />
        )}
      </div>

      {/* Row Container with Right Minimalist Vertical Stack Navigation */}
      <div className="flex items-stretch gap-3" aria-busy={isLoading}>
        <div className="flex-1 min-w-0">
          <Swiper
            modules={[Navigation, FreeMode]}
            onSwiper={(s) => setSwiper(s)}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            onBeforeInit={(swiper: any) => {
              if (
                swiper.params.navigation &&
                typeof swiper.params.navigation !== "boolean"
              ) {
                swiper.params.navigation.prevEl = prevRef.current;
                swiper.params.navigation.nextEl = nextRef.current;
              }
            }}
            spaceBetween={8}
            slidesPerView={3.8}
            freeMode={{ enabled: true, momentumRatio: 0.8 }}
            breakpoints={{
              360: { slidesPerView: 3.8, spaceBetween: 8 },
              480: { slidesPerView: 4.5, spaceBetween: 10 },
              640: { slidesPerView: 5.2, spaceBetween: 12 },
              768: { slidesPerView: 6.0, spaceBetween: 14 },
              1024: { slidesPerView: 7.0, spaceBetween: 16 },
              1280: { slidesPerView: 7.8, spaceBetween: 16 },
            }}
            className="w-full !py-1"
          >
            {isLoading
              ? Array.from({ length: 10 }, (_, index) => (
                  <SwiperSlide key={`film-skeleton-${index}`}>
                    <FilmCardSkeleton />
                  </SwiperSlide>
                ))
              : films.map((film, idx) => (
                  <SwiperSlide key={`slide-${title}-${film._id || film.slug || 'film'}-${idx}`}>
                    <FilmCard
                      film={film}
                      priority={idx < 8}
                      preferHighQuality={
                        title === "Phim Mới Cập Nhật" && idx < 8
                      }
                    />
                  </SwiperSlide>
                ))}
          </Swiper>
        </div>

        {/* ── Minimalist Vertical Chevron Navigation (Pure icons without background box) ── */}
        <div className="hidden sm:flex flex-col justify-center gap-3 shrink-0 my-auto px-1">
          <button
            ref={nextRef}
            disabled={isLoading}
            aria-label={`Chuyển sang phải cho ${title}`}
            title={`Xem phim tiếp theo trong ${title}`}
            className="p-1.5 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-15 disabled:pointer-events-none"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>

          <button
            ref={prevRef}
            disabled={isLoading}
            aria-label={`Chuyển sang trái cho ${title}`}
            title={`Xem phim trước trong ${title}`}
            className="p-1.5 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-15 disabled:pointer-events-none"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Component Wrapper for Intersection Observer Lazy Load (No min-height gaps, GPU Accelerated)
function LazySection({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "350px 0px" },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="[content-visibility:auto] [contain-intrinsic-size:1px_400px] transform-gpu"
    >
      {isVisible ? (
        children
      ) : (
        <div className="mb-8 h-[260px] w-full rounded-2xl bg-white/[0.01] motion-safe:animate-pulse sm:h-[340px] lg:h-[360px]" />
      )}
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();

  const [showMoreSections, setShowMoreSections] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);

  // Let the hero become interactive before starting the below-the-fold
  // catalogue fan-out. This removes several competing requests from the LCP
  // window without changing the rows users receive.
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => setCatalogReady(true), {
        timeout: 1_200,
      });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = globalThis.setTimeout(() => setCatalogReady(true), 500);
    return () => globalThis.clearTimeout(timer);
  }, []);

  const handleShowMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setShowMoreSections(true);
      setIsLoadingMore(false);
    }, 450);
  };

  // ── Initial 4 Sections Data (Prioritizing Hollywood/Western Live-Action & Fantasy Movies) ──
  // 1. Phim kỹ xảo (VFX, Fantasy & Myth Movies)
  const { data: vfxGenreData } = useQuery({
    queryKey: ["vfx-movies-genre"],
    queryFn: () => movieApi.getByGenre("than-thoai", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    enabled: catalogReady,
  });
  const { data: vfxUsUkData } = useQuery({
    queryKey: ["vfx-movies-us-uk"],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: "au-my",
          category: "vien-tuong",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    enabled: catalogReady,
  });
  const { data: vfxMoreData, isLoading: vfxLoading } = useQuery({
    queryKey: ["vfx-movies-genre-p2"],
    queryFn: () => movieApi.getByGenre("than-thoai", 2).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    enabled: catalogReady,
  });

  // 2. Series Âu-Mỹ (Hollywood TV Series)
  const { data: usUkSeriesData, isLoading: usUkSeriesLoading } = useQuery({
    queryKey: ["us-uk-series-v2"],
    queryFn: () =>
      movieApi
        .getFiltered({
          type: "phim-bo",
          country: "au-my",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    enabled: catalogReady,
  });
  const { data: usUkSeriesMoreData } = useQuery({
    queryKey: ["us-uk-series-v2", 2],
    queryFn: () =>
      movieApi
        .getFiltered({
          type: "phim-bo",
          country: "au-my",
          page: 2,
          limit: 24,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    enabled: catalogReady,
  });

  // 3. Phim hành động (Hollywood & International Action Movies)
  const { data: actionUsUkData } = useQuery({
    queryKey: ["action-movies-us-uk"],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: "au-my",
          category: "hanh-dong",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    enabled: catalogReady,
  });
  const { data: actionData, isLoading: actionLoading } = useQuery({
    queryKey: ["action-movies"],
    queryFn: () => movieApi.getByGenre("hanh-dong", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    enabled: catalogReady,
  });

  // 4. Phim khoa học viễn tưởng bom tấn (Hollywood Sci-Fi Blockbusters)
  const { data: scifiUsUkData } = useQuery({
    queryKey: ["scifi-movies-us-uk"],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: "au-my",
          category: "vien-tuong",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    enabled: catalogReady,
  });
  const { data: scifiData, isLoading: scifiLoading } = useQuery({
    queryKey: ["scifi-movies"],
    queryFn: () => movieApi.getByGenre("vien-tuong", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    enabled: catalogReady,
  });

  // ── Lazy Loaded 10 Sections Data (Loaded after clicking Xem Thêm) ──

  // 5. Xem gì tiếp theo (Hollywood Recommendations)
  const { data: usUkBlockbustersData, isLoading: nextWatchLoading } = useQuery({
    queryKey: ["us-uk-blockbusters-next"],
    queryFn: () => movieApi.getByCountry("au-my", 2).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 6. Series quốc tế (International Series)
  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ["series-v2", 1],
    queryFn: () => movieApi.getSeries(1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 7. Anime & Hoạt hình lồng tiếng (ONLY place for Anime/3D Animation)
  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: ["anime-v2", 1],
    queryFn: () => movieApi.getAnime(1).then((r) => r.data),
    enabled: showMoreSections,
  });
  const { data: animeGenreData } = useQuery({
    queryKey: ["anime-genre", 1],
    queryFn: () => movieApi.getByGenre("hoat-hinh", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 8. Phim phiêu lưu mạo hiểm (Hollywood Adventure Movies)
  const { data: adventureUsUkData, isLoading: adventureLoading } = useQuery({
    queryKey: ["adventure-movies-us-uk"],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: "au-my",
          category: "phieu-luu",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    enabled: showMoreSections,
  });
  const { data: adventureData } = useQuery({
    queryKey: ["adventure-movies"],
    queryFn: () => movieApi.getByGenre("phieu-luu", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 9. Phim chất lượng 4K (Hollywood 4K Movies)
  const { data: singleData, isLoading: singleLoading } = useQuery({
    queryKey: ["single-us-uk-v3", 1],
    queryFn: () =>
      movieApi
        .getFiltered({
          type: "phim-le",
          country: "au-my",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    enabled: showMoreSections,
  });

  // 10. Phim chính kịch chuyển thể từ sách (Book Adaptation Dramas)
  const { data: dramaData, isLoading: dramaLoading } = useQuery({
    queryKey: ["drama-movies"],
    queryFn: () => movieApi.getByGenre("chinh-kich", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 11. Phim kịch tính về thảm họa chết chóc (Hollywood Thriller & Disaster)
  const { data: disasterUsUkData, isLoading: disasterLoading } = useQuery({
    queryKey: ["disaster-movies-us-uk"],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: "au-my",
          category: "kinh-di",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    enabled: showMoreSections,
  });

  // 12. Thể loại chiến tranh và gai góc (War Movies)
  const { data: warData, isLoading: warLoading } = useQuery({
    queryKey: ["war-movies"],
    queryFn: () => movieApi.getByGenre("chien-tranh", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 13. Phim hài (Comedy Movies)
  const { data: comedyData, isLoading: comedyLoading } = useQuery({
    queryKey: ["comedy-movies"],
    queryFn: () => movieApi.getByGenre("hai-huoc", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 14. Bộ phim giải trí hoàn hảo (Romance & Feel-Good Movies)
  const { data: romanceData, isLoading: romanceLoading } = useQuery({
    queryKey: ["romance-movies"],
    queryFn: () => movieApi.getByGenre("tinh-cam", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // Latest films query for Phim Mới Cập Nhật
  const { data: latestData, isLoading: latestLoading } = useQuery({
    queryKey: ["latest-v2", 1],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    enabled: catalogReady,
  });

  const { data: trendingData } = useQuery({
    queryKey: ["weekly-trending-movies"],
    queryFn: () =>
      api
        .get<FilmItem[]>("/movies/trending?limit=30")
        .then((r) => r.data)
        .catch(() => []),
    staleTime: 1000 * 60 * 10,
    retry: false,
    enabled: catalogReady,
  });

  // ── Process arrays with STRICT Live-Action filtering for Hollywood rows ──
  const vfxFilms = useMemo(() => {
    const list1 = vfxGenreData?.data?.items || vfxGenreData?.items || [];
    const list2 = vfxUsUkData?.data?.items || vfxUsUkData?.items || [];
    const list3 = vfxMoreData?.data?.items || vfxMoreData?.items || [];
    return filterLiveActionOnly(deduplicate([...list1, ...list2, ...list3]));
  }, [vfxGenreData, vfxUsUkData, vfxMoreData]);

  const usUkSeriesFilms = useMemo(() => {
    const firstPage =
      usUkSeriesData?.data?.items || usUkSeriesData?.items || [];
    const secondPage =
      usUkSeriesMoreData?.data?.items || usUkSeriesMoreData?.items || [];
    const liveAction = filterLiveActionOnly(
      deduplicate([...firstPage, ...secondPage]),
    );
    return liveAction.filter(isLikelySeries);
  }, [usUkSeriesData, usUkSeriesMoreData]);

  const actionFilms = useMemo(() => {
    const usUkList = actionUsUkData?.data?.items || actionUsUkData?.items || [];
    const genList = actionData?.data?.items || actionData?.items || [];
    return filterLiveActionOnly(deduplicate([...usUkList, ...genList]));
  }, [actionUsUkData, actionData]);

  const scifiFilms = useMemo(() => {
    const usUkList = scifiUsUkData?.data?.items || scifiUsUkData?.items || [];
    const genList = scifiData?.data?.items || scifiData?.items || [];
    return filterLiveActionOnly(deduplicate([...usUkList, ...genList]));
  }, [scifiUsUkData, scifiData]);

  const nextWatchFilms = useMemo(() => {
    const list =
      usUkBlockbustersData?.data?.items || usUkBlockbustersData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [usUkBlockbustersData]);

  const seriesFilms = useMemo(() => {
    const list = seriesData?.data?.items || seriesData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [seriesData]);

  // Anime & 3D Animation (ONLY row allowed to contain Animation)
  const animeFilms = useMemo(() => {
    const list1 = animeData?.data?.items || animeData?.items || [];
    const list2 = animeGenreData?.data?.items || animeGenreData?.items || [];
    return deduplicate([...list1, ...list2]);
  }, [animeData, animeGenreData]);

  const adventureFilms = useMemo(() => {
    const usUkList =
      adventureUsUkData?.data?.items || adventureUsUkData?.items || [];
    const genList = adventureData?.data?.items || adventureData?.items || [];
    return filterLiveActionOnly(deduplicate([...usUkList, ...genList]));
  }, [adventureUsUkData, adventureData]);

  const singleFilms = useMemo(() => {
    const list = singleData?.data?.items || singleData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [singleData]);

  const dramaFilms = useMemo(() => {
    const list = dramaData?.data?.items || dramaData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [dramaData]);

  const disasterFilms = useMemo(() => {
    const list = disasterUsUkData?.data?.items || disasterUsUkData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [disasterUsUkData]);

  const warFilms = useMemo(() => {
    const list = warData?.data?.items || warData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [warData]);

  const comedyFilms = useMemo(() => {
    const list = comedyData?.data?.items || comedyData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [comedyData]);

  const romanceFilms = useMemo(() => {
    const list = romanceData?.data?.items || romanceData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [romanceData]);

  const latestFilms = useMemo(
    () => deduplicate(latestData?.items || latestData?.data?.items || []),
    [latestData],
  );
  const trendingFilms = useMemo(
    () => deduplicate(Array.isArray(trendingData) ? trendingData : []),
    [trendingData],
  );

  // Priority High-Interest & Top-Trending Movies for Hero Banner
  const bannerFilms = useMemo(() => {
    const trendingPool = filterLiveActionOnly(trendingFilms);
    return deduplicate([...latestFilms, ...trendingPool])
      .filter((film) => hasHeroArtwork(film) && !isRetiredHeroFilm(film))
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
      .slice(0, 6);
  }, [latestFilms, trendingFilms]);

  const showBannerSkeleton = false;

  // Deduplication registry & row limits
  const {
    top10List,
    latestRowList,
    vfxRowList,
    usUkSeriesRowList,
    actionRowList,
    scifiRowList,
    nextWatchRowList,
    seriesRowList,
    animeRowList,
    adventureRowList,
    singleRowList,
    dramaRowList,
    disasterRowList,
    warRowList,
    comedyRowList,
    romanceRowList,
  } = useMemo(() => {
    const buildRow = (rawFilms: FilmItem[], targetCount = 12): FilmItem[] => {
      return deduplicate(rawFilms).slice(0, targetCount);
    };

    // Initial Sections
    const latestRowList = buildRow(latestFilms);
    const vfxRowList = buildRow(vfxFilms);
    const usUkSeriesRowList = buildRow(usUkSeriesFilms, 16);
    const actionRowList = buildRow(actionFilms);
    const scifiRowList = buildRow(scifiFilms);

    // Lazy 10 Sections
    const nextWatchRowList = buildRow(nextWatchFilms);
    const seriesRowList = buildRow(seriesFilms);
    const animeRowList = buildRow(animeFilms);
    const adventureRowList = buildRow(adventureFilms);
    const singleRowList = buildRow(singleFilms);
    const dramaRowList = buildRow(dramaFilms);
    const disasterRowList = buildRow(disasterFilms);
    const warRowList = buildRow(warFilms);
    const comedyRowList = buildRow(comedyFilms);
    const romanceRowList = buildRow(romanceFilms);

    const sectionSlugs = new Set(
      [
        ...latestRowList,
        ...vfxRowList,
        ...usUkSeriesRowList,
        ...actionRowList,
        ...scifiRowList,
        ...nextWatchRowList,
        ...seriesRowList,
        ...animeRowList,
        ...adventureRowList,
        ...singleRowList,
        ...dramaRowList,
        ...disasterRowList,
        ...warRowList,
        ...comedyRowList,
        ...romanceRowList,
      ].map((film) => film.slug),
    );

    const highInterestFilms = deduplicate([
      ...trendingFilms,
      ...actionFilms,
      ...scifiFilms,
      ...HOLLYWOOD_TOP10_POOL,
    ]);

    const top10List = filterLiveActionOnly(highInterestFilms)
      .filter((film) => !sectionSlugs.has(film.slug))
      .slice(0, 10);
    if (top10List.length < 10) {
      top10List.push(
        ...filterLiveActionOnly(highInterestFilms)
          .filter(
            (film) =>
              !sectionSlugs.has(film.slug) &&
              !top10List.some((ranked) => ranked.slug === film.slug),
          )
          .slice(0, 10 - top10List.length),
      );
    }
    if (top10List.length < 10) {
      top10List.push(
        ...filterLiveActionOnly(highInterestFilms)
          .filter(
            (film) => !top10List.some((ranked) => ranked.slug === film.slug),
          )
          .slice(0, 10 - top10List.length),
      );
    }

    return {
      top10List,
      latestRowList,
      vfxRowList,
      usUkSeriesRowList,
      actionRowList,
      scifiRowList,
      nextWatchRowList,
      seriesRowList,
      animeRowList,
      adventureRowList,
      singleRowList,
      dramaRowList,
      disasterRowList,
      warRowList,
      comedyRowList,
      romanceRowList,
    };
  }, [
    trendingFilms,
    latestFilms,
    vfxFilms,
    usUkSeriesFilms,
    actionFilms,
    scifiFilms,
    nextWatchFilms,
    seriesFilms,
    animeFilms,
    adventureFilms,
    singleFilms,
    dramaFilms,
    disasterFilms,
    warFilms,
    comedyFilms,
    romanceFilms,
  ]);

  return (
    <div className="bg-background min-h-screen text-foreground overflow-hidden pb-12">
      <HomeAnnouncementPopup />
      {/* Hero Banner slider */}
      <HeroBanner />

      {/* Main Content Area */}
      <div
        data-home-content="true"
        className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 relative pt-6 md:pt-10 z-30"
      >
        {/* ONLY TOP 10 RANKED MOVIES KEPT AT TOP */}
        <Top10RankedRow films={top10List} />

        {/* ── 16:9 LANDSCAPE WATCH HISTORY / RECENTLY WATCHED ROW ── */}
        <ContinueWatchingRow />

        {/* ── LỊCH CHIẾU PHIM HÔM NAY (WEEKLY SCHEDULE STRIP) ── */}
        <LazySection>
          <WeeklyScheduleSection items={seriesFilms} />
        </LazySection>

        {/* ── PHIM MỚI CẬP NHẬT (NEWLY UPDATED MOVIES ROW) ── */}
        <LazySection>
          <FilmSection
            title={t("sections.latest", "Phim Mới Cập Nhật")}
            films={latestRowList}
            isLoading={latestLoading}
            href="/films"
          />
        </LazySection>

        {/* ── Initial 4 Movie Sections ── */}
        <LazySection>
          <FilmSection
            title={t("sections.vfx", "Phim Thần Thoại & Kỹ Xảo")}
            films={vfxRowList}
            isLoading={vfxLoading}
            href="/genre/than-thoai"
          />
        </LazySection>

        <LazySection>
          <HeroShowcaseSection
            title={t("sections.usUkSeries", "Series Âu-Mỹ Đỉnh Cao")}
            films={usUkSeriesRowList}
            isLoading={usUkSeriesLoading}
            href="/search?type=series&country=au-my"
          />
        </LazySection>

        <LazySection>
          <FilmSection
            title={t("sections.action", "Phim Hành Động Kịch Tính")}
            films={actionRowList}
            isLoading={actionLoading}
            href="/genre/hanh-dong"
          />
        </LazySection>

        <LazySection>
          <CuratedSpotlightSection
            title={t("sections.scifi", "Tuyệt Tác Khoa Học Viễn Tưởng")}
            films={scifiRowList}
            isLoading={scifiLoading}
            href="/genre/vien-tuong"
          />
        </LazySection>

        {/* ── Ultra-Minimal Show More Sections Button ── */}
        {!showMoreSections ? (
          <div className="my-3 flex w-full justify-center px-1 sm:my-5 lg:my-6">
            <button
              onClick={handleShowMore}
              disabled={isLoadingMore}
              className={`${cardFont.className} group inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-neutral-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 shadow-lg transition-all cursor-pointer active:scale-95`}
            >
              <span className="font-semibold tracking-wide">{t("common.viewMore", "Xem thêm phim")}</span>
              {isLoadingMore ? (
                <Loader2 size={13} className="animate-spin text-white" />
              ) : (
                <ChevronDown
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-y-0.5 text-neutral-300 group-hover:text-white"
                />
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* ── 10 Lazy Loaded Sections ── */}
            <LazySection>
              <FilmSection
                title={t("sections.nextWatch", "Gợi Ý Phim Tiếp Theo")}
                films={nextWatchRowList}
                isLoading={nextWatchLoading}
                href="/country/au-my"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.series", "Phim Bộ Đặc Sắc")}
                films={seriesRowList}
                isLoading={seriesLoading}
                href="/films/series"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.anime", "Thế Giới Anime & Hoạt Hình")}
                films={animeRowList}
                isLoading={animeLoading}
                href="/films/anime"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.adventure", "Phim Phiêu Lưu & Khám Phá")}
                films={adventureRowList}
                isLoading={adventureLoading}
                href="/genre/phieu-luu"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.single", "Phim Lẻ Tuyển Chọn")}
                films={singleRowList}
                isLoading={singleLoading}
                href="/films/single"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.drama", "Phim Tâm Lý & Xã Hội")}
                films={dramaRowList}
                isLoading={dramaLoading}
                href="/genre/chinh-kich"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.disaster", "Phim Thảm Họa & Sinh Tồn")}
                films={disasterRowList}
                isLoading={disasterLoading}
                href="/genre/kinh-di"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.war", "Phim Chiến Tranh & Lịch Sử")}
                films={warRowList}
                isLoading={warLoading}
                href="/genre/chien-tranh"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.comedy", "Phim Hài Hước & Gia Đình")}
                films={comedyRowList}
                isLoading={comedyLoading}
                href="/genre/hai-huoc"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.romance", "Phim Lãng Mạn & Tình Cảm")}
                films={romanceRowList}
                isLoading={romanceLoading}
                href="/genre/tinh-cam"
              />
            </LazySection>
          </div>
        )}
      </div>
    </div>
  );
}
