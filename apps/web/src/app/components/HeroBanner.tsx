"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useState, useEffect, useMemo } from "react";
import { Play, Info } from "lucide-react";
import { FilmItem, resolveImageUrl } from "@/components/film/FilmCard";
import { useTranslation } from "@/store/langStore";
import { cn } from "@/lib/utils";

interface HeroBannerProps {
  films: FilmItem[];
}

export default function HeroBanner({ films }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { t } = useTranslation();
  const featured = useMemo(() => {
    const seenSlugs = new Set<string>();
    const seenThumbs = new Set<string>();
    const seenBaseNames = new Set<string>();
    const result: FilmItem[] = [];

    for (const f of films) {
      if (!f || (!f.poster_url && !f.thumb_url)) continue;

      const slug = (f.slug || "").toLowerCase().trim();
      const thumb = (f.thumb_url || f.poster_url || "").toLowerCase().trim();
      // Normalize root title (e.g. "Ma Cà Rồng Nguyên Thủy (Phần 3)" -> "ma ca rong nguyen thuy")
      const baseName = (f.name || f.title || "")
        .toLowerCase()
        .replace(/\(phần\s*\d+\)/gi, "")
        .replace(/\(season\s*\d+\)/gi, "")
        .replace(/phần\s*\d+/gi, "")
        .trim();

      if (
        (slug && seenSlugs.has(slug)) ||
        (thumb && seenThumbs.has(thumb)) ||
        (baseName && seenBaseNames.has(baseName))
      ) {
        continue;
      }

      if (slug) seenSlugs.add(slug);
      if (thumb) seenThumbs.add(thumb);
      if (baseName) seenBaseNames.add(baseName);
      result.push(f);

      if (result.length >= 6) break;
    }
    return result;
  }, [films]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrent((c) => (c + 1) % featured.length);
      setTimeout(() => setIsTransitioning(false), 800);
    }, 8000);
    return () => clearInterval(timer);
  }, [featured.length]);

  const film = featured[current];
  if (!film) return null;

  const backdrop =
    resolveImageUrl(film.thumb_url) || resolveImageUrl(film.poster_url);

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

      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        {backdrop && (
          <div
            className="absolute inset-0 w-full h-full will-change-opacity transition-opacity duration-700 ease-in-out"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transform: "translate3d(0, 0, 0)",
            }}
          >
            <NextImage
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
        )}
      </div>

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, var(--background) 0%, rgba(var(--background-rgb), 0.75) 45%, transparent 80%),
            linear-gradient(to top, var(--background) 0%, rgba(var(--background-rgb), 0.95) 20%, rgba(var(--background-rgb), 0.5) 50%, transparent 100%),
            rgba(0, 0, 0, 0.1)
          `,
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 z-20 flex items-center">
        <div className="w-full px-4 sm:pl-16 md:pl-28 md:pr-8 pt-8 md:pt-0">
          <div className="max-w-2xl">
            <div
              key={current}
              className="flex flex-col space-y-3 sm:space-y-4 md:space-y-5 animate-fade-in-up"
            >
              {/* Badges */}
              <div className="flex items-center space-x-2.5">
                <span className="bg-netflixRed text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-md">
                  HOT
                </span>
                {film.year && (
                  <span className="text-foreground/75 text-xs font-bold">
                    {film.year}
                  </span>
                )}
                {film.quality && (
                  <span className="bg-white/10 text-neutral-200 text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10">
                    {film.quality}
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
                <p className="text-sm sm:text-base md:text-xl text-foreground/75 font-semibold tracking-wide -mt-1 sm:-mt-2 line-clamp-1">
                  {film.origin_name}
                </p>
              )}

              {/* Description */}
              <p className="text-xs md:text-sm text-foreground/80 max-w-xl leading-relaxed line-clamp-2 sm:line-clamp-3">
                {t("home.heroDesc")}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2.5 sm:space-x-3 pt-1 sm:pt-2">
                <Link
                  href={`/watch/${film.slug}`}
                  className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-900 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black px-5 py-2.5 sm:px-7 sm:py-3 rounded-full text-xs font-black tracking-wider uppercase transition-colors shadow-md shrink-0"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Xem Phim</span>
                </Link>
                <Link
                  href={`/film/${film.slug}`}
                  className="flex items-center space-x-2 bg-black/5 hover:bg-black/10 text-neutral-800 border border-black/10 dark:bg-white/10 dark:hover:bg-white/25 dark:text-white px-5 py-2.5 sm:px-7 sm:py-3 rounded-full text-xs font-black tracking-wider uppercase transition-colors backdrop-blur-sm shrink-0"
                >
                  <Info size={14} />
                  <span>{t("home.details")}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnail Indicators */}
      <div className="absolute right-3 sm:right-8 md:right-12 bottom-16 sm:bottom-8 z-30 flex items-center gap-1.5 sm:gap-2">
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
                  : "border border-white/20 opacity-50 hover:opacity-100 scale-95",
              )}
            >
              {thumbImg && (
                <NextImage
                  src={thumbImg}
                  alt={item.name}
                  fill
                  quality={60}
                  sizes="88px"
                  className="object-cover object-center"
                  loading="lazy"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll Indicator */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-5 z-20 flex flex-col items-center gap-1.5 cursor-pointer group opacity-65 hover:opacity-100 transition-opacity"
        onClick={() =>
          window.scrollTo({
            top: window.innerHeight * 0.85,
            behavior: "smooth",
          })
        }
      >
        <div className="w-[22px] h-[34px] rounded-full border-2 border-white/60 flex justify-center pt-1.5 backdrop-blur-md bg-black/40">
          <div className="w-1 h-2 bg-white/80 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
