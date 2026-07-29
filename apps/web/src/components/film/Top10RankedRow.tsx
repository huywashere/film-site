"use client";
import Link from "next/link";
import { useState } from "react";
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

  if (!top10.length) return null;

  return (
    <div className="w-full my-8 relative group">
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

      {/* Swiper Carousel with Ranked Numbers */}
      <div className="relative">
        <Swiper
          modules={[Navigation, FreeMode]}
          navigation={{
            prevEl: ".top10-prev",
            nextEl: ".top10-next",
          }}
          freeMode={{ enabled: true, sticky: false }}
          spaceBetween={16}
          slidesPerView="auto"
          className="!py-4 !pl-1 !pr-20"
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
                        <Play size={18} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            );
          })}
        </Swiper>

        {/* Custom Navigation Overlay Buttons (Stacked Card Pair placed outside movie cards) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
          <button className="top10-next w-10 h-16 bg-[#202430] hover:bg-[#2e3648] text-white/80 hover:text-white rounded-xl border border-white/10 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer hover:scale-105 active:scale-95">
            <ChevronRight size={18} />
          </button>
          <button className="top10-prev w-10 h-16 bg-[#202430] hover:bg-[#2e3648] text-white/80 hover:text-white rounded-xl border border-white/10 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer hover:scale-105 active:scale-95">
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
