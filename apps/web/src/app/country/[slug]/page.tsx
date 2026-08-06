"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmItem,
  FilmCardSkeleton,
  resolveImageUrl,
} from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { useTmdb } from "@/hooks/useTmdb";
import { tmdbProfile } from "@/lib/tmdb";
import {
  Play,
  Info,
  ChevronRight,
  ChevronLeft,
  Flame,
  Heart,
  Zap,
  Crown,
  Tv,
  UserCheck,
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

// Reusable Category Row with Navigation Buttons OUTSIDE on right
function CountryCategoryRow({
  title,
  icon: Icon,
  films,
  isLoading,
  href,
}: {
  title: string;
  icon: React.ElementType;
  films: FilmItem[];
  isLoading: boolean;
  href?: string;
}) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!isLoading && !films.length) return null;

  return (
    <div className="mb-10" aria-busy={isLoading}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg md:text-xl font-extrabold text-white flex items-center space-x-2">
          <Icon size={18} className="text-netflixRed" />
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
                  <SwiperSlide key={`sk-${i}`} style={{ width: "175px" }}>
                    <FilmCardSkeleton width={175} hideDetails={false} />
                  </SwiperSlide>
                ))
              : films.map((film, idx) => (
                  <SwiperSlide key={`${film.slug || film._id || (film as any).id}-${idx}`} style={{ width: "175px" }}>
                    <FilmCard
                      film={film}
                      width={175}
                      variant="standard"
                      hideDetails={false}
                    />
                  </SwiperSlide>
                ))}
          </Swiper>
        </div>

        {/* Minimalist Navigation Buttons Column (Không màu, không bo viền) */}
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

// The cast follows the active hero, instead of showing a static demo roster.
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
                    <img
                      src={tmdbProfile(actor.profile_path, "w185") || ""}
                      alt={actor.name}
                      className="w-full h-full object-cover"
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

// Top Spotlight Hero Banner for Country Page
function CountryHeroBanner({
  film,
  countryName,
  fullBleed = false,
}: {
  film?: FilmItem;
  countryName: string;
  fullBleed?: boolean;
}) {
  const { bestBackdrop } = useTmdb({
    film,
    enabled: !!film,
    fetchCredits: false,
    fetchVideos: false,
  });

  if (!film) {
    return (
      <section
        aria-label="Đang tải phim nổi bật"
        className={
          fullBleed
            ? "relative w-full min-h-[440px] md:min-h-[560px] overflow-hidden bg-[#0b0e13]"
            : "relative w-full h-[450px] md:h-[520px] rounded-3xl overflow-hidden mb-12 bg-[#0b0e13] border border-white/10"
        }
      >
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#0b0e13_20%,#171c24_48%,#0b0e13_76%)] animate-pulse" />
        <div className="absolute bottom-12 left-5 w-2/3 max-w-md space-y-3 sm:left-10 lg:left-[calc(6rem+4vw)]">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="h-10 w-full rounded bg-white/10" />
          <div className="h-4 w-2/3 rounded bg-white/[0.07]" />
        </div>
      </section>
    );
  }

  const backdrop =
    (bestBackdrop?.file_path
      ? `https://image.tmdb.org/t/p/original${bestBackdrop.file_path}`
      : null) ||
    resolveImageUrl(film.thumb_url) ||
    resolveImageUrl(film.poster_url);

  return (
    <section
      className={
        fullBleed
          ? "relative w-full min-h-[440px] md:min-h-[560px] overflow-hidden bg-[#090c12]"
          : "relative w-full h-[450px] md:h-[520px] rounded-3xl overflow-hidden mb-12 shadow-2xl bg-neutral-900 border border-white/10"
      }
    >
      {backdrop && (
        <img
          src={backdrop}
          alt={film.name}
          className="absolute inset-0 w-full h-full object-cover object-center brightness-[0.7]"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to right, rgba(7,9,14,0.96) 0%, rgba(7,9,14,0.65) 45%, transparent 100%), linear-gradient(to top, rgba(7,9,14,0.95) 0%, transparent 60%)`,
        }}
      />

      <div
        className={`absolute inset-0 flex items-end sm:items-center z-10 ${
          fullBleed
            ? "px-5 pb-12 pt-28 sm:px-10 sm:py-20 lg:pl-[calc(6rem+4vw)]"
            : "p-6 sm:p-12"
        }`}
      >
        <div className="max-w-2xl space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white/80">
            <span className="bg-white text-[#11151b] px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider">
              Phim {countryName} nổi bật
            </span>
            {film.year && <span>{film.year}</span>}
            {film.quality && <span>• {film.quality}</span>}
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight drop-shadow-lg">
            {film.name}
          </h1>
          {film.origin_name && (
            <p className="text-sm sm:text-base font-semibold text-neutral-300">
              #{film.origin_name}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Link
              href={`/watch/${film.slug}`}
              className="flex items-center gap-2 bg-white hover:bg-neutral-200 text-black font-black px-6 py-3 rounded-full text-xs uppercase tracking-wider shadow-xl transition-all hover:scale-105"
            >
              <Play size={16} fill="currentColor" />
              <span>Xem Ngay</span>
            </Link>
            <Link
              href={`/film/${film.slug}`}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-3 rounded-full text-xs uppercase tracking-wider border border-white/15 transition-all"
            >
              <Info size={16} />
              <span>Chi tiết</span>
            </Link>
          </div>
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
  const label = COUNTRY_NAMES[slug] || slug;
  const isFeaturedCountry = slug === "han-quoc" || slug === "trung-quoc";
  const [heroSeed, setHeroSeed] = useState(() => Math.random());

  // Main catalog query for full listing & pagination
  const { data: mainData, isLoading: mainLoading } = useQuery({
    queryKey: ["country", slug, page],
    queryFn: () => movieApi.getByCountry(slug, page).then((r) => r.data),
  });

  const films: FilmItem[] = mainData?.data?.items || mainData?.items || [];
  const heroFilm = films.length
    ? films[Math.floor(heroSeed * films.length)]
    : undefined;

  // Change the featured title whenever a visitor enters either country hub.
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

  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: ["country-anime", slug],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: slug,
          category: "hoat-hinh",
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
  const animeFilms: FilmItem[] =
    animeData?.data?.items || animeData?.items || [];
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
    router.push(`/country/${slug}?page=${newPage}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 pt-20 pb-16 bg-background min-h-screen text-foreground">
      {/* Full-bleed media is reserved for the Korean and Chinese hubs. */}
      {isFeaturedCountry ? (
        <div className="-mt-20 -mx-4 mb-10 md:-mx-10 lg:-ml-24 lg:-mr-10">
          <CountryHeroBanner film={heroFilm} countryName={label} fullBleed />
        </div>
      ) : (
        <CountryHeroBanner film={heroFilm} countryName={label} />
      )}

      {/* Categorized Movie Hub Rows */}
      <CountryCategoryRow
        title={`Phim ${label} Đang Chiếu Hot`}
        icon={Flame}
        films={films.slice(0, 14)}
        isLoading={mainLoading}
      />

      <CountryCategoryRow
        title="Phim Tình Cảm & Lãng Mạn"
        icon={Heart}
        films={romanceFilms.slice(0, 14)}
        isLoading={romanceLoading}
      />

      <CountryCategoryRow
        title="Phim Hành Động & Kịch Tính"
        icon={Zap}
        films={actionFilms.slice(0, 14)}
        isLoading={actionLoading}
      />

      <CountryCategoryRow
        title="Phim Cổ Trang"
        icon={Crown}
        films={coTrangFilms.slice(0, 14)}
        isLoading={coTrangLoading}
      />

      {/* Featured Actors Row */}
      <FeaturedActorsRow film={heroFilm} />

      <CountryCategoryRow
        title="Phim Hoạt Hình & Anime"
        icon={Tv}
        films={animeFilms.slice(0, 14)}
        isLoading={animeLoading}
      />

      <CountryCategoryRow
        title="Phim Hình Sự & Trinh Thám"
        icon={Flame}
        films={crimeFilms.slice(0, 14)}
        isLoading={crimeLoading}
      />

      {/* Full Catalog Section Header */}
      <div className="mt-14 mb-8 pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Tất Cả Phim {label}
          </h2>
          <p className="text-xs text-neutral-400 font-semibold mt-1">
            Danh sách tổng hợp đầy đủ kho phim chọn lọc sản xuất tại {label}
          </p>
        </div>
        <div className="text-xs font-bold text-neutral-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 self-start md:self-auto">
          Trang <span className="text-white font-extrabold">{page}</span> /{" "}
          {totalPages}
        </div>
      </div>

      {/* Full Catalog Grid */}
      {mainLoading ? (
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2.5 sm:gap-4">
          {Array.from({ length: 14 }).map((_, i) => (
            <FilmCardSkeleton key={i} />
          ))}
        </div>
      ) : films.length > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2.5 sm:gap-4">
          {films.map((f) => (
            <FilmCard key={f.slug} film={f} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-neutral-500 font-semibold text-sm">
          Chưa có bộ phim nào thuộc quốc gia này.
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
  );
}
