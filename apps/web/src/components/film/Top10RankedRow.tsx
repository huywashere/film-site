"use client";
import Link from "next/link";
import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import { FilmItem, resolveImageUrl } from "./FilmCard";
import { TrendingUp, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import "swiper/css";
import "swiper/css/navigation";

interface Top10RankedRowProps {
  films: FilmItem[];
  title?: string;
}

const NUMBER_GRADIENTS: Record<number, string> = {
  1: "from-[#ffe89c] via-[#e5b839] to-[#8a6008]", // Gold
  2: "from-[#ffffff] via-[#cbd5e1] to-[#64748b]", // Silver
  3: "from-[#fed7aa] via-[#ea580c] to-[#7c2d12]", // Bronze
};

export function Top10RankedRow({
  films,
  title = "TOP 10 Phim Nổi Bật Trong Tuần",
}: Top10RankedRowProps) {
  const top10 = films.slice(0, 10);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!top10.length) return null;

  return (
    <div className="w-full my-8 relative">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-netflixRed/10 border border-netflixRed/30 text-netflixRed">
            <TrendingUp size={18} />
          </div>
          <h2
            className="text-lg md:text-xl font-black text-white uppercase tracking-wider"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {title}
          </h2>
        </div>
      </div>

      {/* Main Row: Swiper on left, Navigation Buttons Column OUTSIDE on right */}
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
            freeMode={{ enabled: true, sticky: false }}
            spaceBetween={16}
            slidesPerView="auto"
            className="!py-4 !pl-1 !pr-2"
          >
            {top10.map((film, index) => {
              const rank = index + 1;
              const posterUrl =
                resolveImageUrl(film.poster_url) ||
                resolveImageUrl(film.thumb_url);

              const gradientClass =
                NUMBER_GRADIENTS[rank] ||
                "from-neutral-300 via-neutral-500 to-neutral-700";

              return (
                <SwiperSlide key={film.slug || index} className="!w-auto">
                  <Link
                    href={`/film/${film.slug}`}
                    className="flex items-end group/item relative select-none cursor-pointer"
                  >
                    {/* Big Metallic Rank Number (Netflix Style) */}
                    <div className="relative z-0 -mr-6 md:-mr-10 flex items-end">
                      <span
                        className={cn(
                          "text-[100px] sm:text-[130px] md:text-[160px] font-black leading-none tracking-tighter select-none transition-transform duration-300 group-hover/item:scale-105",
                          "bg-gradient-to-b bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]",
                          gradientClass,
                        )}
                        style={{
                          WebkitTextStroke: "1.5px rgba(255,255,255,0.15)",
                          fontFamily: "'Outfit', sans-serif",
                        }}
                      >
                        {rank}
                      </span>
                    </div>

                    {/* Vertical Poster Card */}
                    <div className="relative z-10 w-[120px] sm:w-[145px] md:w-[165px] aspect-[2/3] rounded-xl overflow-hidden border border-white/10 group-hover/item:border-netflixRed/80 group-hover/item:scale-105 shadow-2xl bg-neutral-900 transition-all duration-300">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={film.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-xs text-neutral-500 font-bold p-2 text-center">
                          {film.name}
                        </div>
                      )}

                      {/* Gradient Overlay & Badges */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover/item:opacity-40 transition-opacity" />

                      {/* Quality / Ep Badge */}
                      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                        {film.quality && (
                          <span className="bg-netflixRed text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                            {film.quality}
                          </span>
                        )}
                      </div>

                      {/* Title overlay at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-0.5">
                        <p className="text-xs font-extrabold text-white truncate group-hover/item:text-netflixRed transition-colors">
                          {film.name}
                        </p>
                        {film.origin_name && (
                          <p className="text-[10px] text-neutral-400 truncate">
                            {film.origin_name}
                          </p>
                        )}
                      </div>

                      {/* Play Button Icon on Hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-netflixRed text-white flex items-center justify-center shadow-lg transform scale-75 group-hover/item:scale-100 transition-transform">
                          <Play
                            size={18}
                            fill="currentColor"
                            className="ml-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                </SwiperSlide>
              );
            })}
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
