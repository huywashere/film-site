"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import { ChevronRight, ChevronLeft, Play, X } from "lucide-react";
import { watchProgressStorage, WatchProgressEntry } from "@/lib/watch-progress";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import { watchHistoryApi } from "@/lib/api";
import { FilmItem, resolveImageUrl } from "./FilmCard";
import { DashPagination } from "./DashPagination";
import { cn } from "@/lib/utils";

import "swiper/css";
import "swiper/css/navigation";

interface ContinueWatchingRowProps {
  fallbackFilms?: FilmItem[];
}

export function ContinueWatchingRow({
  fallbackFilms = [],
}: ContinueWatchingRowProps) {
  const { user } = useAuthStore();
  const [localEntries, setLocalEntries] = useState<WatchProgressEntry[]>([]);
  const [swiper, setSwiper] = useState<any>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Load localStorage entries for non-logged-in guest users or local progress
  useEffect(() => {
    const entries = watchProgressStorage.getHistoryEntries();
    setLocalEntries(entries);
  }, []);

  // Fetch logged-in user history from server
  const { data: serverHistoryData } = useQuery({
    queryKey: ["watch-history-row", user?.id],
    queryFn: () => watchHistoryApi.getHistory(1, 20).then((r) => r.data),
    enabled: !!user,
  });

  // Convert server history into unified items
  const serverItems = useMemo(() => {
    const items = serverHistoryData?.items || [];
    return items.map((item: any) => ({
      slug: item.movieId || item.movieSlug || item.slug,
      epSlug: item.episode || "1",
      epName: item.episode ? `Tập ${item.episode}` : "",
      title: item.movieTitle || item.name || "Phim đã xem",
      poster: item.movieThumb || item.poster || item.thumb,
      currentTime: item.progress || 0,
      duration: item.duration || 100,
      updatedAt: item.updatedAt
        ? new Date(item.updatedAt).getTime()
        : Date.now(),
    }));
  }, [serverHistoryData]);

  // Combine local & server items deduplicated by slug
  const historyEntries = useMemo(() => {
    const combined = [...localEntries, ...serverItems];
    const seen = new Set<string>();
    return combined.filter((item) => {
      if (!item.slug || seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    });
  }, [localEntries, serverItems]);

  const hasHistory = historyEntries.length > 0;
  const sectionTitle = "Lịch Sử Xem Gần Đây";

  // Remove single local item from watch progress
  const handleRemoveItem = (
    e: React.MouseEvent,
    slug: string,
    epSlug?: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    watchProgressStorage.removeEntry(slug, epSlug);
    setLocalEntries((prev) => prev.filter((item) => item.slug !== slug));
  };

  return (
    <div className="w-full mb-8 relative group/section">
      {/* Header with Title + Inline Pill Button + Right Dash Line Indicators */}
      <div className="flex items-center justify-between mb-3.5 px-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
            {sectionTitle}
          </h2>
          {hasHistory && (
            <Link
              href="/history"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.12] text-white/90 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ml-1"
            >
              <span>Xem tất cả</span>
              <ChevronRight size={12} strokeWidth={2.5} />
            </Link>
          )}
        </div>

        {/* Dynamic Dash Line Pagination Indicators (— - - - -) */}
        <DashPagination swiper={swiper} />
      </div>

      {/* Main Carousel Area with Right Minimalist Vertical Navigation */}
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
            spaceBetween={14}
            slidesPerView={1.4}
            freeMode={{ enabled: true, momentumRatio: 0.8 }}
            breakpoints={{
              480: { slidesPerView: 2.2, spaceBetween: 14 },
              640: { slidesPerView: 2.8, spaceBetween: 16 },
              768: { slidesPerView: 3.4, spaceBetween: 16 },
              1024: { slidesPerView: 4.2, spaceBetween: 18 },
              1280: { slidesPerView: 5.2, spaceBetween: 18 },
            }}
            className="w-full !py-1"
          >
            {hasHistory
              ? historyEntries.map((item) => {
                  const posterUrl = resolveImageUrl(item.poster);
                  const percent =
                    item.duration > 0
                      ? Math.min(
                          100,
                          Math.max(
                            5,
                            Math.round(
                              (item.currentTime / item.duration) * 100,
                            ),
                          ),
                        )
                      : 0;

                  return (
                    <SwiperSlide key={item.slug}>
                      <Link
                        href={`/watch/${item.slug}${
                          item.epSlug ? `?ep=${item.epSlug}` : ""
                        }`}
                        className="group/card block relative select-none cursor-pointer"
                      >
                        {/* 16:9 Landscape Card (wide banner format) */}
                        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 group-hover/card:border-white/40 group-hover/card:scale-[1.02] shadow-2xl bg-neutral-900 transition-all duration-300 relative">
                          {posterUrl ? (
                            <img
                              src={posterUrl}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-xs text-neutral-400 font-bold p-2 text-center">
                              {item.title}
                            </div>
                          )}

                          {/* Gradient Bottom Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-85 group-hover/card:opacity-60 transition-opacity" />

                          {/* Remove Button on hover */}
                          <button
                            onClick={(e) =>
                              handleRemoveItem(e, item.slug, item.epSlug)
                            }
                            title="Xóa khỏi lịch sử xem"
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-red-600 text-white/70 hover:text-white transition-all opacity-0 group-hover/card:opacity-100 z-30"
                          >
                            <X size={13} />
                          </button>

                          {/* Red Badge "Mới thêm" / "Tập X" at Bottom Left */}
                          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 pointer-events-none">
                            <span className="bg-white text-black text-[10px] font-extrabold px-2 py-0.5 rounded shadow-md tracking-wide uppercase">
                              {item.epName || "Mới thêm"}
                            </span>
                          </div>

                          {/* Play Button Icon on Hover */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity z-20 bg-black/30 backdrop-blur-[1px]">
                            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform scale-75 group-hover/card:scale-100 transition-transform">
                              <Play
                                size={18}
                                fill="currentColor"
                                className="ml-0.5"
                              />
                            </div>
                          </div>

                          {/* Progress Line Bar at Bottom Edge */}
                          {percent > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
                              <div
                                className="h-full bg-white transition-all duration-300"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Title Underneath Card */}
                        <div className="mt-2 space-y-0.5 px-0.5">
                          <p className="text-xs sm:text-sm font-extrabold text-white truncate group-hover/card:text-white/80 transition-colors">
                            {item.title}
                          </p>
                        </div>
                      </Link>
                    </SwiperSlide>
                  );
                })
              : fallbackFilms.slice(0, 10).map((film) => {
                  const posterUrl =
                    resolveImageUrl(film.thumb_url) ||
                    resolveImageUrl(film.poster_url);

                  return (
                    <SwiperSlide key={film.slug}>
                      <Link
                        href={`/film/${film.slug}`}
                        className="group/card block relative select-none cursor-pointer"
                      >
                        {/* 16:9 Landscape Card (wide banner format) */}
                        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 group-hover/card:border-white/40 group-hover/card:scale-[1.02] shadow-2xl bg-neutral-900 transition-all duration-300 relative">
                          {posterUrl ? (
                            <img
                              src={posterUrl}
                              alt={film.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-xs text-neutral-400 font-bold p-2 text-center">
                              {film.name}
                            </div>
                          )}

                          {/* Gradient Bottom Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-85 group-hover/card:opacity-60 transition-opacity" />

                          {/* Red Badge "Mới thêm" at Bottom Left (Matches Exact User Screenshot) */}
                          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 pointer-events-none">
                            <span className="bg-white text-black text-[10px] font-extrabold px-2 py-0.5 rounded shadow-md tracking-wide uppercase">
                              Mới thêm
                            </span>
                          </div>

                          {/* Play Button Icon on Hover */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity z-20 bg-black/30 backdrop-blur-[1px]">
                            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform scale-75 group-hover/card:scale-100 transition-transform">
                              <Play
                                size={18}
                                fill="currentColor"
                                className="ml-0.5"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Title Underneath Card */}
                        <div className="mt-2 space-y-0.5 px-0.5">
                          <p className="text-xs sm:text-sm font-extrabold text-white truncate group-hover/card:text-white/80 transition-colors">
                            {film.name}
                          </p>
                        </div>
                      </Link>
                    </SwiperSlide>
                  );
                })}
          </Swiper>
        </div>

        {/* Minimalist Navigation Buttons Column */}
        <div className="hidden sm:flex flex-col justify-center gap-3 shrink-0 px-1 my-auto">
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
