"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmItem,
  FilmCardSkeleton,
  resolveImageUrl,
} from "@/components/film/FilmCard";
import { Top10RankedRow } from "@/components/film/Top10RankedRow";
import { ContinueWatchingRow } from "@/components/film/ContinueWatchingRow";
import { Pagination } from "@/components/film/Pagination";
import { useTmdb } from "@/hooks/useTmdb";
import { tmdbProfile } from "@/lib/tmdb";
import { cardFont } from "@/lib/fonts";
import { useAuthStore } from "@/store/authStore";
import {
  Play,
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Flame,
  Heart,
  Zap,
  Crown,
  Tv,
  UserCheck,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

const COUNTRY_NAMES: Record<string, string> = {
  "han-quoc": "Hàn Quốc",
  "trung-quoc": "Trung Quốc",
  "nhut-ban": "Nhật Bản",
  "nhat-ban": "Nhật Bản",
  "au-my": "Âu Mỹ",
  "thiet-nam": "Việt Nam",
  "viet-nam": "Việt Nam",
  "thai-lan": "Thái Lan",
  "hong-kong": "Hồng Kông",
  "dai-loan": "Đài Loan",
  anh: "Anh",
  phap: "Pháp",
  duc: "Đức",
  "an-do": "Ấn Độ",
};

const GENRE_OPTIONS = [
  { slug: "", label: "Tất cả thể loại" },
  { slug: "tinh-cam", label: "Tình Cảm & Lãng Mạn" },
  { slug: "hanh-dong", label: "Hành Động & Kịch Tính" },
  { slug: "co-trang", label: "Cổ Trang & Thần Thoại" },
  { slug: "hinh-su", label: "Hình Sự & Trinh Thám" },
  { slug: "hoat-hinh", label: "Hoạt Hình & Anime" },
  { slug: "vien-tuong", label: "Viễn Tưởng & Tương Lai" },
];

// Reusable Category Row with Navigation Buttons OUTSIDE on right
function CountryCategoryRow({
  title,
  icon: Icon,
  films,
  isLoading,
  href,
  variant = "standard",
}: {
  title: string;
  icon?: React.ElementType;
  films: FilmItem[];
  isLoading: boolean;
  href?: string;
  variant?: "standard" | "landscape";
}) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!isLoading && !films.length) return null;

  const cardWidth = variant === "landscape" ? 240 : 175;

  return (
    <div className="mb-10" aria-busy={isLoading}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg md:text-xl font-extrabold text-white flex items-center space-x-2">
          {Icon && <Icon size={18} className="text-red-600" />}
          <span>{title}</span>
        </h2>
        {href && (
          <Link
            href={href}
            className="text-xs text-neutral-400 hover:text-white font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors"
          >
            <span>Xem tất cả</span>
            <ChevronRight size={14} />
          </Link>
        )}
      </div>

      <div className="flex items-stretch gap-3.5">
        <div className="flex-1 min-w-0 overflow-hidden">
          <Swiper
            modules={[Navigation, FreeMode]}
            onBeforeInit={(swiper) => {
              if (
                swiper.params.navigation &&
                typeof swiper.params.navigation !== "boolean"
              ) {
                swiper.params.navigation.prevEl = prevRef.current;
                swiper.params.navigation.nextEl = nextRef.current;
              }
            }}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            speed={600}
            slidesPerGroup={3}
            spaceBetween={14}
            slidesPerView="auto"
            freeMode={{ enabled: true, momentumRatio: 0.8 }}
            className="!py-2 !px-1"
          >
            {isLoading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <SwiperSlide key={`sk-${i}`} style={{ width: `${cardWidth}px` }}>
                    <FilmCardSkeleton width={cardWidth} hideDetails={false} />
                  </SwiperSlide>
                ))
              : films.map((film, idx) => (
                  <SwiperSlide
                    key={`${film.slug || film._id || (film as any).id}-${idx}`}
                    style={{ width: `${cardWidth}px` }}
                  >
                    <FilmCard
                      film={film}
                      width={cardWidth}
                      variant={variant}
                      hideDetails={false}
                    />
                  </SwiperSlide>
                ))}
          </Swiper>
        </div>

        {/* Minimalist Navigation Buttons Column */}
        <div className="hidden sm:flex flex-col justify-center gap-3 shrink-0 px-1">
          <button
            ref={nextRef}
            aria-label="Next slide"
            className="p-2 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronRight size={28} strokeWidth={2.5} />
          </button>
          <button
            ref={prevRef}
            aria-label="Previous slide"
            className="p-2 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Featured Actors Row
function FeaturedActorsRow({ film }: { film?: FilmItem }) {
  const { cast, creditsLoading } = useTmdb({
    film,
    enabled: !!film,
    fetchImages: false,
    fetchVideos: false,
  });

  if (!film || (!creditsLoading && cast.length === 0)) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center space-x-2 mb-4 px-1">
        <UserCheck size={18} className="text-white/70" />
        <h2 className="text-lg md:text-xl font-extrabold text-white">
          Diễn viên nổi bật
        </h2>
      </div>

      <div className="flex items-center gap-6 overflow-x-auto pb-4 scrollbar-none px-1">
        {creditsLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col items-center flex-shrink-0 animate-pulse"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/[0.08]" />
                <div className="mt-3 h-3 w-20 rounded bg-white/[0.08]" />
              </div>
            ))
          : cast.slice(0, 8).map((actor) => (
              <Link
                key={actor.id}
                href={`/actors/${actor.id}`}
                className="flex flex-col items-center flex-shrink-0 group cursor-pointer"
              >
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-white/50 group-hover:scale-[1.03] transition-all duration-200">
                  {tmdbProfile(actor.profile_path, "w185") ? (
                    <NextImage
                      src={tmdbProfile(actor.profile_path, "w185") || ""}
                      alt={actor.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex w-full h-full items-center justify-center bg-white/[0.08] text-2xl font-bold text-white/50">
                      {actor.name.slice(0, 1)}
                    </span>
                  )}
                </div>
                <span className="mt-2.5 text-xs font-bold text-white group-hover:text-white/70 transition-colors text-center max-w-[110px] truncate">
                  {actor.name}
                </span>
              </Link>
            ))}
      </div>
    </div>
  );
}

// 100% Netflix-Authentic Spotlight Hero Banner
function NetflixHeroBanner({
  film,
  countryName,
}: {
  film?: FilmItem;
  countryName: string;
}) {
  const [isMuted, setIsMuted] = useState(true);

  const { bestBackdrop } = useTmdb({
    film,
    enabled: !!film,
    fetchCredits: false,
    fetchVideos: false,
  });

  if (!film) {
    return (
      <section className="relative w-full h-[68vh] min-h-[500px] max-h-[780px] bg-[#141414] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#141414_20%,#1f1f1f_48%,#141414_76%)] animate-pulse" />
      </section>
    );
  }

  const backdrop =
    (bestBackdrop?.file_path
      ? `https://image.tmdb.org/t/p/original${bestBackdrop.file_path}`
      : null) ||
    resolveImageUrl(film.thumb_url) ||
    resolveImageUrl(film.poster_url);

  const filmTitle = film.name || film.title || "Phim Hay";

  return (
    <section className="relative w-full h-[72vh] min-h-[520px] max-h-[820px] overflow-hidden bg-black select-none">
      {/* Background Image / Media */}
      {backdrop && (
        <NextImage
          src={backdrop}
          alt={filmTitle}
          fill
          sizes="100vw"
          className="object-cover object-center brightness-[0.8] scale-105 transition-transform duration-1000"
          priority
          unoptimized
        />
      )}

      {/* Netflix Multi-layer Gradient Overlays for 100% Authentic Vignette */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: `
            linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, transparent 80%),
            linear-gradient(to top, #141414 0%, rgba(20,20,20,0.6) 20%, transparent 60%),
            linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 25%)
          `,
        }}
      />

      {/* Left Content Overlay */}
      <div className="absolute inset-0 z-20 flex items-center px-4 sm:px-12 md:px-16 lg:px-24">
        <div className="max-w-xl space-y-4 sm:space-y-6 pt-16">
          {/* Netflix Badge */}
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-black text-xs uppercase tracking-widest bg-red-600/10 px-2 py-0.5 rounded border border-red-600/20">
              S E R I E S • {countryName}
            </span>
          </div>

          {/* Title Logo / Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]">
            {filmTitle}
          </h1>

          {film.origin_name && film.origin_name !== filmTitle && (
            <p className="text-sm sm:text-lg font-bold text-neutral-300 italic drop-shadow">
              {film.origin_name}
            </p>
          )}

          {/* Tagline / Summary */}
          <p className="text-xs sm:text-sm md:text-base font-medium text-neutral-200 line-clamp-3 leading-relaxed drop-shadow max-w-lg">
            {film.content ||
              `Trải nghiệm đỉnh cao của điện ảnh ${countryName} với những thước phim kịch tính, lãng mạn và hấp dẫn nhất.`}
          </p>

          {/* Action Buttons (Netflix Style) */}
          <div className="flex items-center gap-3 pt-2">
            <Link
              href={`/watch/${film.slug}`}
              className="flex items-center gap-2.5 bg-white hover:bg-neutral-200 text-black font-black px-7 py-3 rounded-md text-sm sm:text-base shadow-2xl transition-all hover:scale-105 cursor-pointer active:scale-95"
            >
              <Play size={20} fill="currentColor" className="ml-0.5" />
              <span>Phát</span>
            </Link>
            <Link
              href={`/film/${film.slug}`}
              className="flex items-center gap-2.5 bg-white/20 hover:bg-white/30 text-white font-bold px-6 py-3 rounded-md text-sm sm:text-base backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-95"
            >
              <Info size={20} />
              <span>Thông tin khác</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Controls (Volume Toggle & Maturity Badge) */}
      <div className="absolute right-0 bottom-24 z-20 flex items-center gap-3">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="w-10 h-10 rounded-full bg-black/40 border border-white/30 text-white flex items-center justify-center hover:bg-black/60 transition-all backdrop-blur-md cursor-pointer"
          title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <div className="bg-black/60 border-l-3 border-white text-white font-bold text-xs sm:text-sm px-3.5 py-1 backdrop-blur-md pr-6">
          {film.quality || "T18"}
        </div>
      </div>
    </section>
  );
}

export default function CountryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const page = Number(searchParams.get("page") || 1);
  const selectedGenre = searchParams.get("category") || "";
  const label = COUNTRY_NAMES[slug] || slug;
  const isKoreanPage = slug === "han-quoc";
  const user = useAuthStore((s) => s.user);

  const [heroSeed, setHeroSeed] = useState(() => Math.random());
  const [showGenreMenu, setShowGenreMenu] = useState(false);

  // Main catalog query for full listing & pagination
  const { data: mainData, isLoading: mainLoading } = useQuery({
    queryKey: ["country", slug, page, selectedGenre],
    queryFn: () =>
      selectedGenre
        ? movieApi.getFiltered({ country: slug, category: selectedGenre, page }).then((r) => r.data)
        : movieApi.getByCountry(slug, page).then((r) => r.data),
  });

  const films: FilmItem[] = mainData?.data?.items || mainData?.items || [];
  const heroFilm = films.length
    ? films[Math.floor(heroSeed * films.length)]
    : undefined;

  useEffect(() => {
    setHeroSeed(Math.random());
  }, [slug]);

  // Specific genre queries filtered by country
  const { data: romanceData, isLoading: romanceLoading } = useQuery({
    queryKey: ["country-romance", slug],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: slug,
          category: "tinh-cam",
          page: 1,
          limit: 18,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  const { data: actionData, isLoading: actionLoading } = useQuery({
    queryKey: ["country-action", slug],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: slug,
          category: "hanh-dong",
          page: 1,
          limit: 18,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  const { data: coTrangData, isLoading: coTrangLoading } = useQuery({
    queryKey: ["country-cotrang", slug],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: slug,
          category: "co-trang",
          page: 1,
          limit: 18,
        })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  const { data: crimeData, isLoading: crimeLoading } = useQuery({
    queryKey: ["country-hinhsu", slug],
    queryFn: () =>
      movieApi
        .getFiltered({ country: slug, category: "hinh-su", page: 1, limit: 18 })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

  const romanceFilms: FilmItem[] =
    romanceData?.data?.items || romanceData?.items || [];
  const actionFilms: FilmItem[] =
    actionData?.data?.items || actionData?.items || [];
  const coTrangFilms: FilmItem[] =
    coTrangData?.data?.items || coTrangData?.items || [];
  const crimeFilms: FilmItem[] =
    crimeData?.data?.items || crimeData?.items || [];

  const rawTotal =
    mainData?.data?.params?.pagination?.totalPages ||
    mainData?.params?.pagination?.totalPages ||
    mainData?.pagination?.totalPages ||
    (mainData?.data?.params?.pagination?.totalItems
      ? Math.ceil(
          mainData.data.params.pagination.totalItems /
            (mainData.data.params.pagination.totalItemsPerPage || 24),
        )
      : undefined);

  const totalPages =
    rawTotal && rawTotal > 1 ? rawTotal : films.length > 0 ? 50 : 1;
  const totalItems =
    mainData?.data?.params?.pagination?.totalItems ||
    mainData?.pagination?.totalItems;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/country/${slug}?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectGenre = (genreSlug: string) => {
    setShowGenreMenu(false);
    const params = new URLSearchParams(searchParams.toString());
    if (genreSlug) {
      params.set("category", genreSlug);
    } else {
      params.delete("category");
    }
    params.set("page", "1");
    router.push(`/country/${slug}?${params.toString()}`);
  };

  const activeGenreLabel =
    GENRE_OPTIONS.find((g) => g.slug === selectedGenre)?.label || "Thể loại";

  return (
    <div className={`${cardFont.className} min-h-screen w-full bg-[#141414] text-foreground`}>
      {/* ── Sub-header Bar (Sub-navbar matching Netflix Screenshot 1) ── */}
      <div className="sticky top-16 z-40 bg-[#141414]/90 backdrop-blur-md px-4 sm:px-12 md:px-16 lg:px-24 py-3 flex items-center justify-between border-b border-white/5 transition-all">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isKoreanPage ? "Phim Hàn Quốc" : `Phim ${label}`}
          </h1>

          {/* Dropdown Genre Filter "Thể loại ▾" */}
          <div className="relative">
            <button
              onClick={() => setShowGenreMenu(!showGenreMenu)}
              className="flex items-center gap-2 bg-black border border-white/40 hover:border-white text-white font-bold text-xs sm:text-sm px-3 py-1 rounded transition-colors cursor-pointer select-none"
            >
              <span>{activeGenreLabel}</span>
              <ChevronDown size={14} />
            </button>

            {showGenreMenu && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-[#141414] border border-white/20 rounded-md shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in duration-150">
                {GENRE_OPTIONS.map((g) => (
                  <button
                    key={g.slug}
                    onClick={() => handleSelectGenre(g.slug)}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      selectedGenre === g.slug
                        ? "bg-white/20 text-white font-bold"
                        : "text-neutral-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Netflix Spotlight Hero Banner ── */}
      <NetflixHeroBanner film={heroFilm} countryName={label} />

      {/* ── Content Rows ── */}
      <div className="px-4 sm:px-12 md:px-16 lg:px-24 pt-6 pb-16 space-y-4">
        {/* Continue Watching Row if logged in or has history */}
        <ContinueWatchingRow />

        {/* Top Picks For You Today (Landscape Cards) */}
        <CountryCategoryRow
          title="Lựa chọn hàng đầu hôm nay cho bạn"
          icon={Flame}
          films={films.slice(0, 12)}
          isLoading={mainLoading}
          variant="landscape"
        />

        {/* Top 10 Row (Netflix-Style Giant Rank Numbers) */}
        <Top10RankedRow
          films={films}
          title={isKoreanPage ? "Top 10 Phim Hàn tại Việt Nam hôm nay" : `Top 10 Phim ${label} Hôm Nay`}
        />

        {/* Romantic K-Dramas Row */}
        <CountryCategoryRow
          title={isKoreanPage ? "Phim Hàn Tình Cảm & Lãng Mạn hay nhất" : "Phim Tình Cảm & Lãng Mạn"}
          icon={Heart}
          films={romanceFilms.slice(0, 14)}
          isLoading={romanceLoading}
        />

        {/* Binge-Worthy Thriller Row (Landscape Cards) */}
        <CountryCategoryRow
          title={isKoreanPage ? "Series Phim Hàn kịch tính đáng xem liên tục" : "Phim Hành Động & Kịch Tính"}
          icon={Zap}
          films={actionFilms.slice(0, 14)}
          isLoading={actionLoading}
          variant="landscape"
        />

        {/* Historical / Period K-Dramas */}
        <CountryCategoryRow
          title={isKoreanPage ? "Phim Hàn Cổ Trang & Thần Thoại" : "Phim Cổ Trang"}
          icon={Crown}
          films={coTrangFilms.slice(0, 14)}
          isLoading={coTrangLoading}
        />

        {/* Crime & Mystery K-Dramas */}
        <CountryCategoryRow
          title={isKoreanPage ? "Phim Hàn Hình Sự & Trinh Thám" : "Phim Hình Sự & Trinh Thám"}
          icon={Flame}
          films={crimeFilms.slice(0, 14)}
          isLoading={crimeLoading}
        />

        {/* Featured Actors */}
        <FeaturedActorsRow film={heroFilm} />

        {/* Full Catalog Header */}
        <div className="mt-14 mb-8 pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Tất Cả Phim {label} {selectedGenre ? `• ${activeGenreLabel}` : ""}
            </h2>
            <p className="text-xs text-neutral-400 font-semibold mt-1">
              Kho phim điện ảnh và series truyền hình chọn lọc sản xuất tại {label}
            </p>
          </div>
          <div className="text-xs font-bold text-neutral-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 self-start md:self-auto">
            Trang <span className="text-white font-extrabold">{page}</span> /{" "}
            {totalPages}
          </div>
        </div>

        {/* Full Catalog Grid */}
        {mainLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7">
            {Array.from({ length: 14 }).map((_, i) => (
              <FilmCardSkeleton key={i} />
            ))}
          </div>
        ) : films.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7">
            {films.map((f) => (
              <FilmCard key={f.slug} film={f} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-neutral-500 font-semibold text-sm">
            Chưa tìm thấy bộ phim nào phù hợp.
          </div>
        )}

        {/* Pagination Controls */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
