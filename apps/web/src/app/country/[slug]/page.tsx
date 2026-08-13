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

function getBaseTitle(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\(phần\s*\d+\)/gi, "")
    .replace(/phần\s*\d+/gi, "")
    .replace(/season\s*\d+/gi, "")
    .replace(/\(vietsub\)/gi, "")
    .replace(/\(thuyết\s*minh\)/gi, "")
    .replace(/\(lồng\s*tiếng\)/gi, "")
    .replace(/\(fhd\)/gi, "")
    .replace(/\(hd\)/gi, "")
    .replace(/[^a-z0-9\s]/gi, "")
    .trim();
}

function dedupeFilmsList(
  films: FilmItem[],
  globalSlugs?: Set<string>,
): FilmItem[] {
  const seenBase = new Set<string>();
  const result: FilmItem[] = [];

  for (const film of films) {
    if (!film) continue;
    const slug = film.slug || film._id || (film as any).id;
    const rawTitle = film.name || film.title || "";
    const baseTitle = getBaseTitle(rawTitle);

    if (globalSlugs && slug && globalSlugs.has(slug)) continue;
    if (baseTitle && seenBase.has(baseTitle)) continue;

    if (baseTitle) seenBase.add(baseTitle);
    if (globalSlugs && slug) globalSlugs.add(slug);
    result.push(film);
  }

  return result;
}

// Reusable Category Row with Netflix Overlay Navigation Arrows
function CountryCategoryRow({
  title,
  films,
  isLoading,
  href,
  variant = "standard",
}: {
  title: string;
  films: FilmItem[];
  isLoading: boolean;
  href?: string;
  variant?: "standard" | "landscape";
}) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!isLoading && !films.length) return null;

  const cardWidth = variant === "landscape" ? 245 : 175;

  return (
    <div className="mb-8 group/row relative" aria-busy={isLoading}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg md:text-xl font-extrabold text-white">
          {title}
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

      <div className="relative w-full overflow-hidden">
        {/* Left Overlay Arrow */}
        <button
          ref={prevRef}
          aria-label="Previous slide"
          className="absolute left-0 top-0 bottom-0 z-30 w-11 bg-black/75 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer disabled:hidden rounded-r-md"
        >
          <ChevronLeft size={30} strokeWidth={2.5} />
        </button>

        {/* Right Overlay Arrow */}
        <button
          ref={nextRef}
          aria-label="Next slide"
          className="absolute right-0 top-0 bottom-0 z-30 w-11 bg-black/75 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer disabled:hidden rounded-l-md"
        >
          <ChevronRight size={30} strokeWidth={2.5} />
        </button>

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
          slidesPerGroup={4}
          spaceBetween={14}
          slidesPerView="auto"
          freeMode={{ enabled: true, momentumRatio: 0.8 }}
          className="!py-2 !px-1 w-full"
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
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

function NetflixHeroBanner({
  film,
  countryName,
}: {
  film?: FilmItem;
  countryName: string;
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [frameReady, setFrameReady] = useState(false);

  const { bestBackdrop, trailer, bestLogo } = useTmdb({
    film,
    enabled: !!film,
    fetchCredits: false,
    fetchVideos: true,
  });

  const trailerKey = trailer?.key;

  useEffect(() => {
    setFrameReady(false);
  }, [trailerKey]);

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

  const logoUrl = bestLogo?.file_path
    ? `https://image.tmdb.org/t/p/w500${bestLogo.file_path}`
    : null;

  const filmTitle = film.name || film.title || "Phim Hay";

  return (
    <section className="relative w-full h-[85vh] sm:h-[92vh] lg:h-[96vh] min-h-[620px] max-h-[960px] overflow-hidden bg-black select-none">
      {/* High-Resolution Backdrop Image Layer (Always visible underneath) */}
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

      {/* Autoplay Video Trailer Layer (Fades in smoothly ONLY AFTER buffering finishes, hiding YouTube play/pause bezel) */}
      {trailerKey && (
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
          <iframe
            key={`${film.slug}-${trailerKey}`}
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
              trailerKey,
            )}?autoplay=1&mute=${
              isMuted ? 1 : 0
            }&controls=0&showinfo=0&autohide=1&loop=1&playlist=${encodeURIComponent(
              trailerKey,
            )}&playsinline=1&enablejsapi=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0`}
            allow="autoplay; encrypted-media; picture-in-picture"
            onLoad={() => {
              setTimeout(() => setFrameReady(true), 600);
            }}
            className={`absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[100vw] min-w-[177.78vh] -translate-x-1/2 -translate-y-1/2 border-0 object-cover scale-110 brightness-[0.85] transition-opacity duration-1000 ease-out pointer-events-none select-none ${
              frameReady ? "opacity-100" : "opacity-0"
            }`}
            title={filmTitle}
            tabIndex={-1}
          />
        </div>
      )}

      {/* Netflix Multi-layer Gradient Overlays for 100% Authentic Vignette */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, transparent 80%),
            linear-gradient(to top, #141414 0%, rgba(20,20,20,0.6) 20%, transparent 60%),
            linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 25%)
          `,
        }}
      />

      {/* Left Content Overlay */}
      <div className="absolute inset-0 z-20 flex items-center pl-4 sm:pl-12 md:pl-20 lg:pl-24 pr-4 sm:pr-8">
        <div className="max-w-xl space-y-4 sm:space-y-6 pt-16">
          {/* Official Title Logo PNG or Styled Heading */}
          {logoUrl ? (
            <div className="relative w-72 sm:w-96 h-24 sm:h-32 mb-2">
              <NextImage
                src={logoUrl}
                alt={filmTitle}
                fill
                className="object-contain object-left drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]"
                unoptimized
              />
            </div>
          ) : (
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]">
              {filmTitle}
            </h1>
          )}

          {film.origin_name && film.origin_name !== filmTitle && !logoUrl && (
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
      <div className="absolute right-0 bottom-36 sm:bottom-44 z-20 flex items-center gap-3">
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

  // Main catalog query for full listing & pagination with Instant Cache
  const { data: mainData, isLoading: mainLoading } = useQuery({
    queryKey: ["country", slug, page, selectedGenre],
    queryFn: () =>
      selectedGenre
        ? movieApi.getFiltered({ country: slug, category: selectedGenre, page }).then((r) => r.data)
        : movieApi.getByCountry(slug, page).then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    placeholderData: (previousData) => previousData,
  });

  const films: FilmItem[] = mainData?.data?.items || mainData?.items || [];
  const heroFilm = films.length
    ? films[Math.floor(heroSeed * films.length)]
    : undefined;

  useEffect(() => {
    setHeroSeed(Math.random());
  }, [slug]);

  // Specific genre queries filtered by country with Instant Cache
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
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
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
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
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
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const { data: crimeData, isLoading: crimeLoading } = useQuery({
    queryKey: ["country-hinhsu", slug],
    queryFn: () =>
      movieApi
        .getFiltered({ country: slug, category: "hinh-su", page: 1, limit: 18 })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });

  // Additional queries for maximum Korean movie variety with Instant Cache
  const { data: page2Data, isLoading: page2Loading } = useQuery({
    queryKey: ["country-p2", slug],
    queryFn: () => movieApi.getByCountry(slug, 2).then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const { data: comedyData, isLoading: comedyLoading } = useQuery({
    queryKey: ["country-comedy", slug],
    queryFn: () =>
      movieApi
        .getFiltered({ country: slug, category: "hai-huoc", page: 1, limit: 20 })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const { data: dramaData, isLoading: dramaLoading } = useQuery({
    queryKey: ["country-drama", slug],
    queryFn: () =>
      movieApi
        .getFiltered({ country: slug, category: "tam-ly", page: 1, limit: 20 })
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const romanceFilms: FilmItem[] =
    romanceData?.data?.items || romanceData?.items || [];
  const actionFilms: FilmItem[] =
    actionData?.data?.items || actionData?.items || [];
  const coTrangFilms: FilmItem[] =
    coTrangData?.data?.items || coTrangData?.items || [];
  const crimeFilms: FilmItem[] =
    crimeData?.data?.items || crimeData?.items || [];
  const page2Films: FilmItem[] =
    page2Data?.data?.items || page2Data?.items || [];
  const comedyFilms: FilmItem[] =
    comedyData?.data?.items || comedyData?.items || [];
  const dramaFilms: FilmItem[] =
    dramaData?.data?.items || dramaData?.items || [];

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

  // Prepare 100% Unique non-repeating lists for each Netflix row
  const globalSeenSlugs = new Set<string>();
  const row1Films = dedupeFilmsList(films, globalSeenSlugs).slice(0, 14);
  const row2Films = dedupeFilmsList(romanceFilms, globalSeenSlugs).slice(0, 14);
  const row3Films = dedupeFilmsList(
    page2Films.length ? page2Films : films.slice(10),
    globalSeenSlugs,
  ).slice(0, 14);
  const row4Films = dedupeFilmsList(actionFilms, globalSeenSlugs).slice(0, 14);
  const row5Films = dedupeFilmsList(coTrangFilms, globalSeenSlugs).slice(0, 14);
  const row6Films = dedupeFilmsList(comedyFilms, globalSeenSlugs).slice(0, 14);
  const row7Films = dedupeFilmsList(crimeFilms, globalSeenSlugs).slice(0, 14);
  const row8Films = dedupeFilmsList(dramaFilms, globalSeenSlugs).slice(0, 14);

  return (
    <div className={`${cardFont.className} min-h-screen w-full bg-[#141414] text-foreground -mt-20 sm:-mt-24`}>
      {/* ── Netflix Spotlight Hero Banner with Background Video Trailer ── */}
      <NetflixHeroBanner film={heroFilm} countryName={label} />

      {/* ── Content Rows (Negative top margin to overlap full screen video trailer matching Netflix screenshot) ── */}
      <div className="relative z-20 -mt-32 sm:-mt-44 pl-4 sm:pl-12 md:pl-20 lg:pl-24 pr-2 sm:pr-4 md:pr-6 pb-16 space-y-6">
        {/* Row 1: Phải thoát khỏi đây! */}
        <CountryCategoryRow
          title={isKoreanPage ? "Phải thoát khỏi đây!" : "Phim Nổi Bật Hôm Nay"}
          films={row1Films}
          isLoading={mainLoading}
          variant="landscape"
        />

        {/* Row 2: Tuyệt phẩm K-Drama lãng mạn */}
        <CountryCategoryRow
          title={
            isKoreanPage
              ? "Tuyệt phẩm K-Drama lãng mạn khiến trái tim tan chảy"
              : "Phim Tình Cảm & Lãng Mạn"
          }
          films={row2Films}
          isLoading={romanceLoading}
        />

        {/* Row 3: Có thể bạn chưa xem */}
        <CountryCategoryRow
          title="Có thể bạn chưa xem"
          films={row3Films}
          isLoading={page2Loading || mainLoading}
          variant="landscape"
        />

        {/* Row 4: Series Phim Hàn kịch tính & giật gân */}
        <CountryCategoryRow
          title={
            isKoreanPage
              ? "Series Phim Hàn kịch tính & giật gân đáng xem liên tục"
              : "Phim Hành Động & Kịch Tính"
          }
          films={row4Films}
          isLoading={actionLoading}
          variant="landscape"
        />

        {/* Row 5: Phim Hàn Cổ Trang & Thần Thoại */}
        <CountryCategoryRow
          title={
            isKoreanPage
              ? "Phim Hàn Cổ Trang & Thần Thoại Kỳ Ảo Đỉnh Cao"
              : "Phim Cổ Trang"
          }
          films={row5Films}
          isLoading={coTrangLoading}
        />

        {/* Row 6: Phim Hài Hước & Giải Trí Sảng Khoái */}
        <CountryCategoryRow
          title={
            isKoreanPage
              ? "Phim Hàn Hài Hước & Giải Trí Sảng Khoái"
              : "Phim Hài Hước Đặc Sắc"
          }
          films={row6Films}
          isLoading={comedyLoading}
          variant="landscape"
        />

        {/* Row 7: Phim Hình Sự & Trinh Thám */}
        <CountryCategoryRow
          title={
            isKoreanPage
              ? "Phim Hàn Hình Sự, Trinh Thám & Phá Án Hồi Hộp"
              : "Phim Hình Sự & Trinh Thám"
          }
          films={row7Films}
          isLoading={crimeLoading}
        />

        {/* Row 8: Phim Tâm Lý & Đời Thường */}
        <CountryCategoryRow
          title={
            isKoreanPage
              ? "Top Phim Tâm Lý & Đời Thường Chạm Đến Cảm Xúc"
              : "Phim Tâm Lý Chọn Lọc"
          }
          films={row8Films}
          isLoading={dramaLoading}
        />

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
            {dedupeFilmsList(films).map((f, idx) => (
              <FilmCard key={`${f.slug || f._id || idx}-${idx}`} film={f} />
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
