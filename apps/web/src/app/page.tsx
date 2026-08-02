"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import HeroBanner from "@/app/components/HeroBanner";

import "swiper/css";
import "swiper/css/navigation";

// Helper: loại bỏ phim trùng lặp theo ID/slug
function deduplicate(films: FilmItem[]): FilmItem[] {
  const seen = new Set<string>();
  return films.filter((f) => {
    const key = f._id || f.slug || f.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Danh sách dự phòng khi playlist TMDB của Hero chưa kịp tải ──
const HERO_5_FILMS: FilmItem[] = [
  {
    _id: "ky-si-bong-dem",
    name: "The Dark Knight",
    origin_name: "The Dark Knight",
    slug: "ky-si-bong-dem",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20240104-1/2cae46be24f514793c9e873f6de0fc32.jpg",
    thumb_url:
      "https://image.tmdb.org/t/p/original/dqK9Hag1054tghRQSqLSfrkvQnA.jpg",
    time: "152 phút",
    episode_current: "Full",
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    year: 2008,
    vote_average: 9.0,
    rating: 9.0,
    content:
      "Người dơi bước vào giai đoạn cam go nhất trong cuộc chiến chống lại cái ác khi tên tội phạm bậc thầy The Joker xuất hiện nhằm đe dọa biến Gotham thành đống đổ nát.",
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
      "https://image.tmdb.org/t/p/original/AeK2MPOpYrOOgZNfFnfwp0L8tNn.jpg",
    time: "148 phút",
    episode_current: "Full",
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    year: 2021,
    vote_average: 8.3,
    rating: 8.3,
    content:
      "Peter Parker đã bị lộ mặt và không còn có thể tách biệt cuộc sống bình thường. Khi anh yêu cầu sự giúp đỡ từ Doctor Strange, một phép thuật sai lầm đã xé rách đa vũ trụ.",
  },
  {
    _id: "thoi-khac-cong-bo",
    name: "Disclosure Day",
    origin_name: "Disclosure Day",
    slug: "thoi-khac-cong-bo",
    type: "single",
    poster_url:
      "https://phimimg.com/uploads/movies/20260722/thoi-khac-cong-bo-poster.webp",
    thumb_url:
      "https://image.tmdb.org/t/p/original/flxau5Iu7bChQHsESqvGZ3FQRaI.jpg",
    time: "146 phút",
    episode_current: "Full",
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    year: 2026,
    vote_average: 8.5,
    rating: 8.5,
    content:
      "Nếu một ngày bạn nhận ra rằng chúng ta chưa bao giờ đơn độc trong vũ trụ. Mùa Hè 2026, sự thật vĩ đại vạch trần toàn thế giới trong Ngày Khai Tiết.",
  },
  {
    _id: "star-wars-mandalorian-va-grogu",
    name: "Star Wars: The Mandalorian & Grogu",
    origin_name: "Star Wars: The Mandalorian and Grogu",
    slug: "star-wars-mandalorian-va-grogu",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20260625-1/e43e9e9207618823fa3ca762e8fc274e.jpg",
    thumb_url:
      "https://image.tmdb.org/t/p/original/MJcERawyqGqJdPsOBc0C449hQ9.jpg",
    time: "132 phút",
    episode_current: "Full",
    quality: "4K Ultra HD",
    lang: "Vietsub",
    year: 2026,
    vote_average: 8.7,
    rating: 8.7,
    content:
      "Đế Chế sụp đổ nhưng các lãnh chúa chiến tranh vẫn rải rác khắp thiên hà. Thợ săn tiền thưởng Din Djarin cùng chú bé Grogu phải bảo vệ hòa bình của Nền Cộng Hòa Mới.",
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
      "https://image.tmdb.org/t/p/original/kJsPVzdyBrYHLomuNv5SJDXUQ2f.jpg",
    time: "192 phút",
    episode_current: "Full",
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    year: 2022,
    vote_average: 8.8,
    rating: 8.8,
    content:
      "Phim lấy bối cảnh 10 năm sau sự kiện phần đầu. Jake Sully cùng gia đình Na'vi phải rời bỏ quê nhà để tới sinh sống tại vùng biển Pandora trước sự tấn công của con người.",
  },
];

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
  const [swiper, setSwiper] = useState<any>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <FilmCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!films || films.length === 0) return null;

  return (
    <div className="mb-8 group/section">
      {/* Title Header matching user's requested layout (Inline pill button + right dash line pagination) */}
      <div className="flex items-center justify-between mb-3.5 px-1">
        {/* Left Side: Title + Inline "Xem tất cả >" Pill Button */}
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
            {title}
          </h2>
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.12] text-white/90 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ml-1"
            >
              <span>Xem tất cả</span>
              <ChevronRight size={12} strokeWidth={2.5} />
            </Link>
          )}
        </div>

        {/* Right Side: Dynamic Dash Line Pagination Indicators (— - - - -) */}
        <DashPagination swiper={swiper} />
      </div>

      {/* Row Container with Right Minimalist Vertical Stack Navigation */}
      <div className="flex items-stretch gap-3">
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
            spaceBetween={12}
            slidesPerView={2.5}
            freeMode={{ enabled: true, momentumRatio: 0.8 }}
            breakpoints={{
              480: { slidesPerView: 3.6, spaceBetween: 12 },
              640: { slidesPerView: 4.5, spaceBetween: 14 },
              768: { slidesPerView: 5.5, spaceBetween: 14 },
              1024: { slidesPerView: 6.8, spaceBetween: 16 },
              1280: { slidesPerView: 7.5, spaceBetween: 16 },
            }}
            className="w-full !py-1"
          >
            {films.map((film, idx) => (
              <SwiperSlide key={film._id || film.slug || idx}>
                <FilmCard film={film} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* ── Minimalist Vertical Chevron Navigation (Pure icons without background box) ── */}
        <div className="hidden sm:flex flex-col justify-center gap-3 shrink-0 my-auto px-1">
          <button
            ref={nextRef}
            aria-label="Next slide"
            title="Xem phim tiếp theo"
            className="p-1.5 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-15 disabled:pointer-events-none"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>

          <button
            ref={prevRef}
            aria-label="Previous slide"
            title="Xem phim trước"
            className="p-1.5 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-15 disabled:pointer-events-none"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Component Wrapper for Intersection Observer Lazy Load (No min-height gaps)
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
      { rootMargin: "250px" },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      {isVisible ? (
        children
      ) : (
        <div className="w-full h-32 animate-pulse bg-white/[0.01] rounded-2xl mb-8" />
      )}
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [showMoreSections, setShowMoreSections] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleShowMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setShowMoreSections(true);
      setIsLoadingMore(false);
    }, 450);
  };

  // ── Initial 4 Sections Data (Prioritizing Hollywood/Western Live-Action Movies) ──
  // 1. Phim kỹ xảo (Hollywood VFX & Fantasy)
  const { data: vfxUsUkData } = useQuery({
    queryKey: ["vfx-movies-us-uk"],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: "au-my",
          category: "than-thoai",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });
  const { data: vfxData, isLoading: vfxLoading } = useQuery({
    queryKey: ["vfx-movies"],
    queryFn: () => movieApi.getByGenre("than-thoai", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // 2. Series Âu-Mỹ (Hollywood TV Series)
  const { data: usUkSeriesData, isLoading: usUkSeriesLoading } = useQuery({
    queryKey: ["us-uk-series"],
    queryFn: () => movieApi.getByCountry("au-my", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // 3. Phim hành động (Hollywood Action Movies)
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
  });
  const { data: actionData, isLoading: actionLoading } = useQuery({
    queryKey: ["action-movies"],
    queryFn: () => movieApi.getByGenre("hanh-dong", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
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
  });
  const { data: scifiData, isLoading: scifiLoading } = useQuery({
    queryKey: ["scifi-movies"],
    queryFn: () => movieApi.getByGenre("vien-tuong", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
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
    queryKey: ["single-v2", 1],
    queryFn: () => movieApi.getByCountry("au-my", 1).then((r) => r.data),
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

  // Latest films query for Hero Banner
  const { data: latestData } = useQuery({
    queryKey: ["latest-v2", 1],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
  });

  const { data: trendingData } = useQuery({
    queryKey: ["weekly-trending-movies"],
    queryFn: () => api.get<FilmItem[]>("/movies/trending?limit=30").then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  // US/UK data for Hero Banner
  const { data: usUkBannerData } = useQuery({
    queryKey: ["hero-us-uk-blockbusters-p1"],
    queryFn: () => movieApi.getByCountry("au-my", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  const { data: marvelHeroData } = useQuery({
    queryKey: ["hero-marvel-blockbusters"],
    queryFn: () => movieApi.search("Marvel", 1).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // ── Process arrays with STRICT Live-Action filtering for Hollywood rows ──
  const vfxFilms = useMemo(() => {
    const usUkList = vfxUsUkData?.data?.items || vfxUsUkData?.items || [];
    const genList = vfxData?.data?.items || vfxData?.items || [];
    return filterLiveActionOnly(deduplicate([...usUkList, ...genList]));
  }, [vfxUsUkData, vfxData]);

  const usUkSeriesFilms = useMemo(() => {
    const list = usUkSeriesData?.data?.items || usUkSeriesData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [usUkSeriesData]);

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

  // Hero tự thay thế danh sách dự phòng bằng 6 phim TMDB ngẫu nhiên mỗi phiên.
  const bannerFilms = HERO_5_FILMS;
  const showBannerSkeleton = false;

  // Deduplication registry & row limits
  const {
    top10List,
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

    // Initial 4 Sections
    const vfxRowList = buildRow(vfxFilms);
    const usUkSeriesRowList = buildRow(usUkSeriesFilms);
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
    const top10List = filterLiveActionOnly(trendingFilms)
      .filter((film) => !sectionSlugs.has(film.slug))
      .slice(0, 10);
    if (top10List.length < 10) {
      top10List.push(
        ...filterLiveActionOnly(latestFilms)
          .filter(
            (film) =>
              !sectionSlugs.has(film.slug) &&
              !top10List.some((ranked) => ranked.slug === film.slug),
          )
          .slice(0, 10 - top10List.length),
      );
    }
    // A new deployment may not have any local view logs yet. Keep the section
    // useful during that warm-up period, while preferring non-duplicated titles
    // whenever the catalogue gives us enough options.
    if (top10List.length < 10) {
      top10List.push(
        ...filterLiveActionOnly(latestFilms)
          .filter(
            (film) => !top10List.some((ranked) => ranked.slug === film.slug),
          )
          .slice(0, 10 - top10List.length),
      );
    }

    return {
      top10List,
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
      {/* Hero Banner slider */}
      {showBannerSkeleton ? (
        <div className="w-full h-screen bg-gradient-to-br from-neutral-950 via-[#10141a] to-neutral-900 animate-pulse" />
      ) : (
        <HeroBanner films={bannerFilms} />
      )}

      {/* Main Content Area */}
      <div className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 relative pt-6 md:pt-10 z-30">
        {/* ONLY TOP 10 RANKED MOVIES KEPT AT TOP */}
        <Top10RankedRow films={top10List} />

        {/* ── 16:9 LANDSCAPE WATCH HISTORY / RECENTLY WATCHED ROW ── */}
        <ContinueWatchingRow fallbackFilms={top10List} />

        {/* ── Initial 4 Movie Sections ── */}
        <LazySection>
          <FilmSection
            title="Phim Kỹ Xảo"
            films={vfxRowList}
            isLoading={vfxLoading}
            href="/genre/than-thoai"
          />
        </LazySection>

        <LazySection>
          <FilmSection
            title="Series Âu-Mỹ"
            films={usUkSeriesRowList}
            isLoading={usUkSeriesLoading}
            href="/country/au-my"
          />
        </LazySection>

        <LazySection>
          <FilmSection
            title="Phim Hành Động"
            films={actionRowList}
            isLoading={actionLoading}
            href="/genre/hanh-dong"
          />
        </LazySection>

        <LazySection>
          <FilmSection
            title="Phim Khoa Học Viễn Tưởng Bom Tấn"
            films={scifiRowList}
            isLoading={scifiLoading}
            href="/genre/vien-tuong"
          />
        </LazySection>

        {/* ── Ultra-Minimal Show More Sections Button ── */}
        {!showMoreSections ? (
          <div className="w-full my-6 flex justify-center px-1">
            <button
              onClick={handleShowMore}
              disabled={isLoadingMore}
              className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium text-neutral-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer active:scale-95"
            >
              <span>Xem thêm danh mục</span>
              {isLoadingMore ? (
                <Loader2 size={13} className="animate-spin text-white" />
              ) : (
                <ChevronDown
                  size={13}
                  className="transition-transform duration-300 group-hover:translate-y-0.5 text-neutral-400 group-hover:text-white"
                />
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* ── 10 Lazy Loaded Sections ── */}
            <LazySection>
              <FilmSection
                title="Xem Gì Tiếp Theo"
                films={nextWatchRowList}
                isLoading={nextWatchLoading}
                href="/films"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Series Quốc Tế"
                films={seriesRowList}
                isLoading={seriesLoading}
                href="/films/series"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Anime & Hoạt Hình Lồng Tiếng"
                films={animeRowList}
                isLoading={animeLoading}
                href="/films/anime"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Phim Phiêu Lưu Mạo Hiểm"
                films={adventureRowList}
                isLoading={adventureLoading}
                href="/genre/phieu-luu"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Phim Chất Lượng 4K"
                films={singleRowList}
                isLoading={singleLoading}
                href="/films/single"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Phim Chính Kịch Chuyển Thể Từ Sách"
                films={dramaRowList}
                isLoading={dramaLoading}
                href="/genre/chinh-kich"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Phim Kịch Tính Về Thảm Họa Chết Chóc"
                films={disasterRowList}
                isLoading={disasterLoading}
                href="/genre/kinh-di"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Thể Loại Chiến Tranh Và Gai Góc"
                films={warRowList}
                isLoading={warLoading}
                href="/genre/chien-tranh"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Phim Hài"
                films={comedyRowList}
                isLoading={comedyLoading}
                href="/genre/hai-huoc"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title="Bộ Phim Giải Trí Hoàn Hảo"
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
