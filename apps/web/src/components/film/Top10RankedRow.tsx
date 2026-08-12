"use client";
import Link from "next/link";
import { Montserrat } from "next/font/google";
import { useRef, useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import { FilmItem, resolveImageUrl } from "./FilmCard";
import { Play, ChevronLeft, ChevronRight, Clapperboard } from "lucide-react";
import { DashPagination } from "./DashPagination";
import { cardFont } from "@/lib/fonts";
import { useTmdbArtwork } from "@/hooks/useTmdbArtwork";
import { cn } from "@/lib/utils";

import "swiper/css";
import "swiper/css/navigation";

const rankFont = Montserrat({
  subsets: ["latin"],
  weight: ["900"],
  display: "swap",
});

interface Top10RankedRowProps {
  films: FilmItem[];
  title?: string;
}

function getRankColorStyle(rank: number) {
  // Unique vibrant neon color palette for all 10 ranks (No duplicate colors!)
  const colors: Record<number, { stroke: string; glow: string }> = {
    1: { stroke: "#fbbf24", glow: "rgba(251, 191, 36, 0.6)" },  // Gold
    2: { stroke: "#f43f5e", glow: "rgba(244, 63, 94, 0.6)" },   // Crimson Red
    3: { stroke: "#f97316", glow: "rgba(249, 115, 22, 0.6)" },  // Vibrant Orange
    4: { stroke: "#38bdf8", glow: "rgba(56, 189, 248, 0.55)" }, // Electric Cyan
    5: { stroke: "#a855f7", glow: "rgba(168, 85, 247, 0.55)" }, // Neon Purple
    6: { stroke: "#10b981", glow: "rgba(16, 185, 129, 0.55)" }, // Emerald Green
    7: { stroke: "#ec4899", glow: "rgba(236, 72, 153, 0.55)" }, // Hot Pink
    8: { stroke: "#84cc16", glow: "rgba(132, 204, 22, 0.55)" }, // Lime Green
    9: { stroke: "#6366f1", glow: "rgba(99, 102, 241, 0.55)" }, // Indigo Blue
    10: { stroke: "#ff5252", glow: "rgba(255, 82, 82, 0.55)" }, // Coral Rose
  };

  const style = colors[rank] || { stroke: "#e5e7eb", glow: "rgba(255, 255, 255, 0.35)" };

  return {
    WebkitTextStroke: "3px " + style.stroke,
    color: "transparent",
    filter: `drop-shadow(0 4px 18px ${style.glow})`,
  };
}

function Top10Item({ film, rank }: { film: FilmItem; rank: number }) {
  const initialUrl =
    resolveImageUrl(film.poster_url, film.thumb_url) ||
    resolveImageUrl(film.thumb_url);

  const [imgSrc, setImgSrc] = useState<string | null>(initialUrl);

  const { posterUrl: tmdbPosterUrl, backdropUrl: tmdbBackdropUrl } = useTmdbArtwork(
    film,
    !imgSrc || imgSrc.startsWith("/api/image-proxy"),
  );

  const preferredTmdb = tmdbPosterUrl || tmdbBackdropUrl;

  useEffect(() => {
    if (initialUrl) {
      setImgSrc(initialUrl);
    } else if (preferredTmdb) {
      setImgSrc(preferredTmdb);
    }
  }, [initialUrl, preferredTmdb]);

  useEffect(() => {
    if (preferredTmdb && (!imgSrc || imgSrc.startsWith("/api/image-proxy"))) {
      setImgSrc(preferredTmdb);
    }
  }, [preferredTmdb, imgSrc]);

  const filmTitle = film.name || film.title || "Phim Top 10";

  return (
    <Link
      href={`/film/${film.slug}`}
      className="flex flex-col group/item relative select-none cursor-pointer pt-4 pb-2 pr-2"
    >
      {/* Bold Rank Number Peeking Behind the Top-Left of Poster Card */}
      <div className={cn(
        "absolute -top-4 sm:-top-6 z-0 pointer-events-none select-none",
        rank === 1 ? "left-2 sm:left-4 md:left-5" : "left-0 sm:-left-2 md:-left-3"
      )}>
        <span
          className={`${rankFont.className} block text-[98px] font-black leading-none tracking-[-0.09em] opacity-100 transition-transform duration-300 group-hover/item:scale-105 sm:text-[132px] md:text-[156px]`}
          style={getRankColorStyle(rank)}
        >
          {rank}
        </span>
      </div>

      {/* Poster Card Container Overlapping Rank Number (Creating 3D Depth Layer) */}
      <div className="relative pl-10 sm:pl-14 md:pl-16 z-10">
        <div className="relative w-[130px] sm:w-[160px] md:w-[185px] aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 shadow-2xl group-hover/item:border-white/40 group-hover/item:scale-105 transition-all duration-300 bg-neutral-900">
          {imgSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imgSrc}
              alt={filmTitle}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105"
              onError={() => {
                if (preferredTmdb && imgSrc !== preferredTmdb) {
                  setImgSrc(preferredTmdb);
                } else if (imgSrc && !imgSrc.startsWith("/api/image-proxy")) {
                  setImgSrc(`/api/image-proxy?url=${encodeURIComponent(imgSrc)}`);
                } else {
                  setImgSrc(null);
                }
              }}
            />
          ) : null}

          {/* Fallback Movie Specific Title Backdrop */}
          <div className="absolute inset-0 -z-10 flex flex-col items-center justify-between p-3 bg-gradient-to-b from-neutral-800 via-neutral-900 to-black text-center">
            <span className="text-[10px] text-amber-400 font-bold self-end">
              #{rank}
            </span>
            <div className="flex flex-col items-center gap-1.5 px-1">
              <Clapperboard className="w-7 h-7 text-amber-500/80 mb-0.5" />
              <h3 className="text-xs font-black text-white line-clamp-3 leading-snug">
                {filmTitle}
              </h3>
            </div>
            <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
              {film.quality || "HD"}
            </span>
          </div>

          {/* Top Right Quality Badge */}
          <div className="absolute top-2 right-2 z-20 pointer-events-none">
            <span className="bg-black/80 border border-white/20 backdrop-blur-md text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
              {film.quality || "FHD"}
            </span>
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl transform scale-75 group-hover/item:scale-100 transition-transform">
              <Play size={18} fill="currentColor" className="ml-0.5" />
            </div>
          </div>
        </div>

        {/* Movie Title Below Card */}
        <div className="mt-2 text-center max-w-[130px] sm:max-w-[160px] md:max-w-[185px]">
          <p className={`${cardFont.className} text-xs font-bold text-neutral-200 line-clamp-1 group-hover/item:text-amber-400 transition-colors`}>
            {filmTitle}
          </p>
          {film.origin_name && (
            <p className="text-[10px] text-neutral-400 line-clamp-1 italic font-medium">
              {film.origin_name}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function Top10RankedRow({
  films,
  title = "TOP 10 Đang Được Xem Nhiều",
}: Top10RankedRowProps) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!films || films.length === 0) return null;

  const top10 = films.slice(0, 10);

  return (
    <section className="mb-10 relative group/section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            {title}
          </span>
        </h2>

        {/* Custom Navigation */}
        <div className="flex items-center gap-3">
          <DashPagination
            total={top10.length}
            current={activeIndex}
            className="hidden sm:flex"
          />
          <div className="flex items-center gap-2">
            <button
              ref={prevRef}
              aria-label="Previous Top 10 slide"
              className="w-8 h-8 rounded-full bg-neutral-900/80 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              ref={nextRef}
              aria-label="Next Top 10 slide"
              className="w-8 h-8 rounded-full bg-neutral-900/80 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <Swiper
          modules={[Navigation, FreeMode]}
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          onBeforeInit={(swiper) => {
            if (swiper.params.navigation && typeof swiper.params.navigation !== "boolean") {
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
          freeMode={{ enabled: true, momentumRatio: 0.8 }}
          spaceBetween={16}
          slidesPerView="auto"
          className="!py-4 !pl-8 sm:!pl-12 md:!pl-16 !pr-4"
        >
          {top10.map((film, index) => (
            <SwiperSlide key={film.slug || index} className="!w-auto">
              <Top10Item film={film} rank={index + 1} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
