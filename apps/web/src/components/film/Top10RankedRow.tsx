"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import { FilmItem, resolveImageUrl } from "./FilmCard";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { DashPagination } from "./DashPagination";

import "swiper/css";
import "swiper/css/navigation";

interface Top10RankedRowProps {
  films: FilmItem[];
  title?: string;
}

export function Top10RankedRow({
  films,
  title = "TOP 10 Đang Được Xem Nhiều",
}: Top10RankedRowProps) {
  const top10 = films.slice(0, 10);
  const [swiper, setSwiper] = useState<any>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!top10.length) return null;

  return (
    <div className="w-full my-8 relative">
      {/* Section Header matching standard film sections (Clean typography + dash indicators) */}
      <div className="flex items-center justify-between mb-3.5 px-1">
        <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
          {title}
        </h2>

        {/* Right Side: Dash Line Pagination Indicators (— - - - -) */}
        <DashPagination swiper={swiper} />
      </div>

      {/* Main Row: Swiper on left, Navigation Buttons Column OUTSIDE on right */}
      <div className="flex items-stretch gap-3.5">
        <div className="flex-1 min-w-0 overflow-hidden">
          <Swiper
            modules={[Navigation, FreeMode]}
            onSwiper={(s) => setSwiper(s)}
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

              return (
                <SwiperSlide key={film.slug || index} className="!w-auto">
                  <Link
                    href={`/film/${film.slug}`}
                    className="flex flex-col group/item relative select-none cursor-pointer pt-4 pb-2 pr-2"
                  >
                    {/* Big Montserrat 900 Rank Number peeking BEHIND the TOP-LEFT of the card */}
                    <div className="absolute -top-4 left-0 z-0 pointer-events-none select-none">
                      <span
                        className="text-[95px] sm:text-[125px] md:text-[155px] font-black leading-none tracking-tighter transition-transform duration-300 group-hover/item:scale-105 block drop-shadow-2xl"
                        style={{
                          color: "transparent",
                          WebkitTextStroke:
                            rank === 1
                              ? "4px #3b82f6"
                              : rank === 2
                                ? "4px #ec4899"
                                : rank === 3
                                  ? "4px #eab308"
                                  : "3.5px #64748b",
                          fontFamily:
                            "'Montserrat', 'Russo One', 'Barlow Semi Condensed', sans-serif",
                          fontWeight: 900,
                        }}
                      >
                        {rank}
                      </span>
                    </div>

                    {/* Vertical Movie Title running along the left side of the poster card */}
                    <div className="absolute bottom-3 left-0 sm:left-1 z-20 flex flex-col justify-end pointer-events-none max-h-[180px] sm:max-h-[210px] md:max-h-[240px]">
                      <p className="[writing-mode:vertical-rl] rotate-180 text-xs sm:text-sm font-extrabold text-white group-hover/item:text-netflixRed transition-colors tracking-wide max-h-[170px] sm:max-h-[200px] truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                        {film.name}
                      </p>
                    </div>

                    {/* Vertical Poster Card (Foreground z-10) */}
                    <div className="relative z-10 w-[130px] sm:w-[155px] md:w-[180px] h-[195px] sm:h-[232px] md:h-[270px] rounded-2xl overflow-hidden border border-white/10 group-hover/item:border-white/50 group-hover/item:scale-[1.03] shadow-2xl bg-neutral-900 transition-all duration-300 mt-9 sm:mt-11 md:mt-13 ml-7 sm:ml-9 md:ml-11">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={film.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-xs text-neutral-500 font-bold p-2 text-center">
                          {film.name}
                        </div>
                      )}

                      {/* Quality Badge */}
                      <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
                        {film.quality && (
                          <span className="bg-netflixRed text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                            {film.quality}
                          </span>
                        )}
                      </div>

                      {/* Play Button Icon on Hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity z-20 bg-black/40 backdrop-blur-[2px]">
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
            className="p-1.5 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-15 disabled:pointer-events-none"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
          <button
            ref={prevRef}
            aria-label="Previous slide"
            className="p-1.5 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-15 disabled:pointer-events-none"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
