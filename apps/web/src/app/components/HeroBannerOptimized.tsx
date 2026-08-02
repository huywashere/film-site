"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { Play, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { movieApi } from "@/lib/api";
import { useTmdb } from "@/hooks/useTmdb";
import { tmdbBackdrop } from "@/lib/tmdb";
import { FilmItem, resolveImageUrl } from "@/components/film/FilmCard";
import { useTranslation } from "@/store/langStore";
import { cn } from "@/lib/utils";

interface HeroBannerProps {
  films: FilmItem[];
}

function getWatchHref(film: FilmItem): string {
  const source = film._source;
  const sourceSlug = source ? film._sourceSlugs?.[source] : undefined;
  if (!source || !sourceSlug || sourceSlug === film.slug) {
    return `/watch/${film.slug}${source ? `?source=${source}` : ""}`;
  }

  return `/watch/${film.slug}?${new URLSearchParams({ source, sourceSlug }).toString()}`;
}

// ── Curated US/UK Hollywood Blockbusters Fallback ──────────────
const HOLLYWOOD_FALLBACKS: FilmItem[] = [
  {
    slug: "bi-an-gia-toc-rong",
    name: "GIA TỘC RỒNG (PHẦN 3)",
    origin_name: "House of the Dragon (Season 3)",
    thumb_url:
      "https://img.phimapi.com/upload/vod/20240617-1/fdff73c2b4c7e27f2f1c2c5eb9c4edec.jpg",
    poster_url:
      "https://img.phimapi.com/upload/vod/20240617-1/fdff73c2b4c7e27f2f1c2c5eb9c4edec.jpg",
    year: 2024,
    type: "series",
  },
  {
    slug: "biet-doi-sieu-anh-hung-4-tan-cuoc",
    name: "AVENGERS: ENDGAME",
    origin_name: "Avengers: Endgame",
    thumb_url:
      "https://img.phimapi.com/upload/vod/20190426-1/avengers-endgame-poster.jpg",
    poster_url:
      "https://img.phimapi.com/upload/vod/20190426-1/avengers-endgame-poster.jpg",
    year: 2019,
    type: "single",
  },
  {
    slug: "spider-man-no-way-home",
    name: "SPIDER-MAN: NO WAY HOME",
    origin_name: "Spider-Man: No Way Home",
    thumb_url:
      "https://img.phimapi.com/upload/vod/20211224-1/8c7e8e45c5f5c8e8c5f5c8e8c5f5c8e8.jpg",
    poster_url:
      "https://img.phimapi.com/upload/vod/20211224-1/8c7e8e45c5f5c8e8c5f5c8e8c5f5c8e8.jpg",
    year: 2021,
    type: "single",
  },
  {
    slug: "avatar-dong-chay-cua-nuoc",
    name: "AVATAR: DÒNG CHẢY CỦA NƯỚC",
    origin_name: "Avatar: The Way of Water",
    thumb_url: "https://img.phimapi.com/upload/vod/20221216-1/avatar-2.jpg",
    poster_url: "https://img.phimapi.com/upload/vod/20221216-1/avatar-2.jpg",
    year: 2022,
    type: "single",
  },
  {
    slug: "oppenheimer",
    name: "OPPENHEIMER",
    origin_name: "Oppenheimer",
    thumb_url: "https://img.phimapi.com/upload/vod/20230721-1/oppenheimer.jpg",
    poster_url: "https://img.phimapi.com/upload/vod/20230721-1/oppenheimer.jpg",
    year: 2023,
    type: "single",
  },
  {
    slug: "the-dark-knight",
    name: "THE DARK KNIGHT (HIỆP SĨ BÓNG ĐÊM)",
    origin_name: "The Dark Knight",
    thumb_url: "https://img.phimapi.com/upload/vod/20080718-1/dark-knight.jpg",
    poster_url: "https://img.phimapi.com/upload/vod/20080718-1/dark-knight.jpg",
    year: 2008,
    type: "single",
  },
];

export default function HeroBannerOptimized({ films }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { t } = useTranslation();

  // Curated Hollywood list fallback if films prop is empty
  const featured = useMemo(() => {
    const validFilms = films && films.length > 0 ? films : HOLLYWOOD_FALLBACKS;
    return validFilms.slice(0, 6);
  }, [films]);

  // Auto-rotate banner
  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrent((c) => (c + 1) % featured.length);
      setTimeout(() => setIsTransitioning(false), 800);
    }, 8000);
    return () => clearInterval(timer);
  }, [featured.length]);

  const film = featured[current];

  // Fetch TMDB detail for ultra high-resolution backdrop (w1280)
  const { data: detailData } = useQuery({
    queryKey: ["hero-film-detail-w1280", film?.slug],
    queryFn: () =>
      movieApi.getDetail(film!.slug).then((response) => response.data),
    enabled: !!film?.slug,
    staleTime: 10 * 60 * 1000,
  });

  const filmDetail = detailData?.movie || detailData || film;
  const { bestBackdrop } = useTmdb({
    film: filmDetail,
    enabled: !!filmDetail,
    fetchCredits: false,
    fetchVideos: false,
  });

  const tmdbBackdropUrl = bestBackdrop
    ? tmdbBackdrop(bestBackdrop.file_path, "w1280")
    : null;

  if (!film) return null;

  const backdrop =
    tmdbBackdropUrl ||
    resolveImageUrl(film.poster_url) ||
    resolveImageUrl(film.thumb_url);

  // Dynamic font size
  const nameLen = film.name.length;
  const titleFontSizeClass =
    nameLen > 60
      ? "text-2xl md:text-4xl lg:text-5xl"
      : nameLen > 40
        ? "text-3xl md:text-5xl lg:text-6xl"
        : "text-4xl md:text-7xl";

  return (
    <div className="relative h-[78vh] min-h-[500px] md:h-[calc(100vh+80px)] md:min-h-[680px] w-full overflow-hidden bg-background">
      {/* Hidden pre-warmer for all featured slide backdrops (parallel background fetch) */}
      <div className="hidden pointer-events-none">
        {featured.map((f, idx) => {
          const img =
            resolveImageUrl(f.thumb_url) || resolveImageUrl(f.poster_url);
          if (!img || idx === current) return null;
          return (
            <img
              key={f.slug || idx}
              src={img}
              alt=""
              loading="eager"
              decoding="async"
            />
          );
        })}
      </div>

      {/* ── Background Image với Instant Initial Render ──────────────── */}
      <div className="absolute inset-0 w-full h-full">
        {backdrop ? (
          <div className="absolute inset-0 w-full h-full">
            <Image
              src={backdrop}
              alt={film.name}
              fill
              priority
              quality={80}
              sizes="100vw"
              className="object-cover object-center brightness-[0.7]"
              loading="eager"
            />
          </div>
        ) : (
          // Fallback gradient nếu không có image
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900" />
        )}
      </div>

      {/* ── Gradient Overlay ─────────────────────────────────────── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, rgba(20,24,28,1) 0%, rgba(20,24,28,0.7) 35%, transparent 65%),
            linear-gradient(to top, rgba(20,24,28,1) 0%, rgba(20,24,28,0.95) 15%, rgba(20,24,28,0.6) 40%, transparent 100%),
            rgba(0, 0, 0, 0.05)
          `,
        }}
      />

      {/* ── Content Container ────────────────────────────────────── */}
      <div className="absolute inset-0 z-20 flex items-center">
        <div className="w-full px-4 sm:pl-16 md:pl-28 md:pr-8 pt-8 md:pt-0">
          <div className="max-w-2xl">
            {/* Content with fade-in animation */}
            <div
              key={current}
              className="flex flex-col space-y-4 md:space-y-5"
              style={{
                animation:
                  "fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              }}
            >
              {/* ── Badges ─────────────────────────────────────── */}
              <div className="flex items-center space-x-3">
                <span className="bg-neutral-800 text-white dark:bg-white dark:text-black text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm shadow">
                  NEW
                </span>
                <span className="border border-foreground/40 text-foreground text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                  12
                </span>
                {film.year && (
                  <span className="text-foreground/60 text-xs font-semibold">
                    {film.year}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1
                className={cn(
                  "font-extrabold text-foreground tracking-wide leading-tight drop-shadow-2xl uppercase",
                  titleFontSizeClass,
                )}
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {film.name}
              </h1>
              {film.origin_name && (
                <p className="text-base md:text-xl text-foreground/75 font-semibold tracking-wide -mt-2">
                  {film.origin_name}
                </p>
              )}

              {/* ── Description ────────────────────────────────── */}
              <p className="text-xs md:text-sm text-foreground/80 max-w-xl leading-relaxed line-clamp-3">
                {t("home.heroDesc") ||
                  "Khám phá bộ sưu tập phim hay nhất từ các nguồn uy tín. Xem phim lẻ, phim bộ, hoạt hình và nhiều hơn thế nữa."}
              </p>

              {/* ── Action Buttons ─────────────────────────────── */}
              <div className="flex items-center space-x-3 pt-2">
                <Link
                  href={getWatchHref(film)}
                  className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-900 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black px-7 py-3 rounded-full text-xs font-black tracking-wider uppercase transition-colors shadow-md border border-neutral-700 dark:border-white/5"
                  prefetch={false}
                >
                  <Play size={14} fill="currentColor" />
                  <span>Xem Phim</span>
                </Link>
                <Link
                  href={`/film/${film.slug}`}
                  className="flex items-center space-x-2 bg-black/5 hover:bg-black/10 text-neutral-800 border border-black/10 dark:bg-white/10 dark:hover:bg-white/25 dark:text-white px-7 py-3 rounded-full text-xs font-black tracking-wider uppercase transition-colors backdrop-blur-sm dark:border dark:border-white/10"
                  prefetch={false}
                >
                  <Info size={14} />
                  <span>{t("home.details") || "Chi tiết"}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Thumbnail Indicators ─────────────────────────────────── */}
      <div className="absolute right-4 sm:right-8 md:right-12 bottom-6 sm:bottom-8 z-30 flex items-center gap-1.5 sm:gap-2">
        {featured.map((item, i) => {
          const thumbImg =
            resolveImageUrl(item.thumb_url) ||
            resolveImageUrl(item.poster_url) ||
            "";
          const isActive = i === current;
          return (
            <button
              key={item.slug || i}
              onClick={() => {
                setIsTransitioning(true);
                setCurrent(i);
                setTimeout(() => setIsTransitioning(false), 800);
              }}
              aria-label={`Switch to ${item.name}`}
              className={cn(
                "relative w-14 sm:w-16 md:w-20 aspect-[16/9] rounded-md overflow-hidden cursor-pointer flex-shrink-0 transition-all duration-300",
                isActive
                  ? "border-2 border-white scale-105 shadow-xl opacity-100"
                  : "border border-white/20 opacity-50 hover:opacity-100 scale-95 hover:scale-100",
              )}
            >
              {thumbImg ? (
                <Image
                  src={thumbImg}
                  alt={item.name}
                  fill
                  quality={50}
                  sizes="88px"
                  className="object-cover object-center"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4OCIgaGVpZ2h0PSI1MCIgZmlsbD0iIzI4MmMzNCIvPgo8L3N2Zz4="
                />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-400 font-bold">
                  {i + 1}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Scroll Down Indicator ────────────────────────────────── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-5 z-20 flex flex-col items-center gap-1.5 cursor-pointer group opacity-65 hover:opacity-100 transition-opacity"
        onClick={() =>
          window.scrollTo({
            top: window.innerHeight * 0.85,
            behavior: "smooth",
          })
        }
        title="Cuộn xuống để xem phim"
      >
        {/* Animated Mouse Icon */}
        <div className="w-[22px] h-[34px] rounded-full border-2 border-white/60 flex justify-center pt-1.5 backdrop-blur-md bg-black/40 group-hover:border-white/90 group-hover:bg-black/60 transition-all">
          <div className="w-1 h-2 bg-white/80 group-hover:bg-white rounded-full animate-bounce" />
        </div>

        {/* Scroll Chevron Arrow */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/70 group-hover:text-white transform group-hover:translate-y-0.5 transition-all"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
