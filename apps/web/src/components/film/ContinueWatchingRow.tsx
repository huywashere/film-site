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

import "swiper/css";
import "swiper/css/navigation";

interface ContinueWatchingRowProps {
  fallbackFilms?: FilmItem[];
}

function getHistoryCardMeta(item: any) {
  const title = item.title || item.name || "Phim đã xem";
  const originName = item.originName || item.origin_name || item.titleEn || "";

  const year =
    item.year ||
    (item.release_date ? String(item.release_date).slice(0, 4) : "2026");

  let ageRating = item.ageRating || item.content_rating || "T16";
  const lowerTitle = (title + " " + originName).toLowerCase();
  if (
    lowerTitle.includes("ma ") ||
    lowerTitle.includes("evil") ||
    lowerTitle.includes("kinh dị") ||
    lowerTitle.includes("địa ngục")
  ) {
    ageRating = "T18";
  } else if (
    lowerTitle.includes("spider") ||
    lowerTitle.includes("nhện") ||
    lowerTitle.includes("marvel")
  ) {
    ageRating = "T13";
  } else if (
    lowerTitle.includes("hoạt hình") ||
    lowerTitle.includes("cưới") ||
    lowerTitle.includes("gia đình")
  ) {
    ageRating = "P";
  }

  let durationStr = "";
  if (item.currentTime && item.duration) {
    const mins = Math.floor(item.duration / 60);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      durationStr = `${h}h ${m < 10 ? `0${m}` : m}m`;
    } else if (mins > 0) {
      durationStr = `${mins}m`;
    } else {
      durationStr = item.epName || `Tập ${item.epSlug || 1}`;
    }
  } else if (item.time && item.time !== "Đang cập nhật") {
    durationStr = item.time;
  } else if (item.epSlug || item.epName) {
    durationStr = item.epName || `Tập ${item.epSlug}`;
  } else {
    durationStr = "1h 48m";
  }

  let badge = "P.Sub";
  const langLower = (item.lang || item.quality || "").toLowerCase();
  if (langLower.includes("lồng tiếng") || langLower.includes("l.tiếng")) {
    badge = "L.Tiếng";
  } else if (langLower.includes("thuyết minh")) {
    badge = "P.Thuyết Minh";
  } else if (langLower.includes("vietsub") || langLower.includes("sub")) {
    badge = "P.Sub";
  } else if (item.quality) {
    badge = item.quality;
  }

  return { title, originName, year, ageRating, durationStr, badge };
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
      originName: item.originName || item.origin_name || item.titleEn || "",
      poster:
        item.poster ||
        item.moviePoster ||
        item.poster_url ||
        item.movieThumb ||
        item.thumb,
      thumb:
        item.movieThumb ||
        item.thumb ||
        item.thumb_url ||
        item.backdrop ||
        item.poster,
      year: item.year || item.movieYear,
      lang: item.lang || item.movieLang,
      quality: item.quality || item.movieQuality,
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
    <div
      data-history-row="true"
      className="w-full mb-10 relative group/section"
    >
      {/* Header with Title + Inline Pill Button + Right Dash Line Indicators */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <h2
            data-history-title="true"
            className="text-lg md:text-xl font-extrabold text-white tracking-tight"
          >
            {sectionTitle}
          </h2>
          {hasHistory && (
            <Link
              href="/history"
              data-history-action="true"
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

      {/* Main Carousel Area with Fixed Slide Widths */}
      <div className="flex items-stretch gap-3.5">
        <div className="flex-1 min-w-0 overflow-hidden">
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
            speed={500}
            slidesPerGroup={2}
            freeMode={{ enabled: true, momentumRatio: 0.8 }}
            spaceBetween={18}
            slidesPerView="auto"
            className="w-full !pb-3 !pt-1 !pl-0.5"
          >
            {hasHistory
              ? historyEntries.map((item: any) => {
                  const posterUrl =
                    resolveImageUrl(item.poster) ||
                    resolveImageUrl(item.thumb);
                  const thumbUrl =
                    resolveImageUrl(item.thumb) ||
                    resolveImageUrl(item.poster);

                  const {
                    title,
                    originName,
                    year,
                    ageRating,
                    durationStr,
                    badge,
                  } = getHistoryCardMeta(item);

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
                    <SwiperSlide key={item.slug} className="!w-auto">
                      <div className="w-[240px] sm:w-[280px] md:w-[310px] shrink-0">
                        <Link
                          href={`/watch/${item.slug}${
                            item.epSlug ? `?ep=${item.epSlug}` : ""
                          }`}
                          className="group/card block relative select-none cursor-pointer"
                        >
                          {/* 16:9 Landscape Card Format */}
                          <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 group-hover/card:border-white/40 group-hover/card:scale-[1.02] shadow-2xl bg-neutral-900 transition-all duration-300 relative">
                            {thumbUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={thumbUrl}
                                alt={title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-xs text-neutral-400 font-bold p-2 text-center">
                                {title}
                              </div>
                            )}

                            {/* Gradient Bottom Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-80 group-hover/card:opacity-60 transition-opacity" />

                            {/* Language / Quality Badge inside Banner */}
                            <div className="absolute bottom-2.5 right-2.5 z-20">
                              <span className="bg-[#2a3853]/90 border border-white/15 text-blue-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded backdrop-blur-md shadow-md uppercase tracking-wider">
                                {badge}
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

                            {/* Red Progress Line Bar at Bottom Edge */}
                            {percent > 0 && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
                                <div
                                  className="h-full bg-[#e50914] transition-all duration-300"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Overlapping Vertical Poster Thumbnail + Title & Detailed Metadata Lines */}
                          <div className="flex items-start gap-2.5 mt-2.5 px-0.5 relative">
                            {/* Overlapping Vertical Poster Thumbnail on Bottom Left */}
                            <div className="relative -mt-6 shrink-0 w-11 sm:w-13 aspect-[2/3] rounded-xl overflow-hidden border-2 border-[#141414] shadow-2xl bg-neutral-800 z-20 transition-transform duration-300 group-hover/card:scale-105 group-hover/card:-translate-y-1">
                              {posterUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={posterUrl}
                                  alt={title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] text-neutral-500 font-bold p-1 text-center">
                                  {title}
                                </div>
                              )}
                            </div>

                            {/* Title & 3-line Detailed Metadata Block */}
                            <div className="flex-1 min-w-0 pt-0.5 space-y-0.5">
                              {/* Main Title */}
                              <h3 className="text-xs sm:text-sm font-extrabold text-white leading-snug line-clamp-1 group-hover/card:text-blue-400 transition-colors">
                                {title}
                              </h3>

                              {/* English / Original Title */}
                              {originName ? (
                                <p className="text-[11px] text-neutral-400 font-normal leading-tight line-clamp-1">
                                  {originName}
                                </p>
                              ) : null}

                              {/* Metadata Line: T18 • 2026 • 1h 50m */}
                              <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 font-bold pt-0.5 flex-wrap">
                                <span className="text-neutral-300 font-extrabold">
                                  {ageRating}
                                </span>
                                <span>•</span>
                                <span>{year}</span>
                                {durationStr ? (
                                  <>
                                    <span>•</span>
                                    <span>{durationStr}</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    </SwiperSlide>
                  );
                })
              : fallbackFilms.slice(0, 10).map((film) => {
                  const posterUrl =
                    resolveImageUrl(film.poster_url) ||
                    resolveImageUrl(film.thumb_url);
                  const thumbUrl =
                    resolveImageUrl(film.thumb_url) ||
                    resolveImageUrl(film.poster_url);

                  const {
                    title,
                    originName,
                    year,
                    ageRating,
                    durationStr,
                    badge,
                  } = getHistoryCardMeta(film);

                  return (
                    <SwiperSlide key={film.slug} className="!w-auto">
                      <div className="w-[240px] sm:w-[280px] md:w-[310px] shrink-0">
                        <Link
                          href={`/film/${film.slug}`}
                          className="group/card block relative select-none cursor-pointer"
                        >
                          {/* 16:9 Landscape Card Format */}
                          <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 group-hover/card:border-white/40 group-hover/card:scale-[1.02] shadow-2xl bg-neutral-900 transition-all duration-300 relative">
                            {thumbUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={thumbUrl}
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
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-80 group-hover/card:opacity-60 transition-opacity" />

                            {/* Quality / Language Badge inside Banner */}
                            <div className="absolute bottom-2.5 right-2.5 z-20">
                              <span className="bg-[#2a3853]/90 border border-white/15 text-blue-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded backdrop-blur-md shadow-md uppercase tracking-wider">
                                {badge}
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

                          {/* Overlapping Vertical Poster Thumbnail + Title & Detailed Metadata Lines */}
                          <div className="flex items-start gap-2.5 mt-2.5 px-0.5 relative">
                            {/* Overlapping Vertical Poster Thumbnail on Bottom Left */}
                            <div className="relative -mt-6 shrink-0 w-11 sm:w-13 aspect-[2/3] rounded-xl overflow-hidden border-2 border-[#141414] shadow-2xl bg-neutral-800 z-20 transition-transform duration-300 group-hover/card:scale-105 group-hover/card:-translate-y-1">
                              {posterUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={posterUrl}
                                  alt={title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] text-neutral-500 font-bold p-1 text-center">
                                  {title}
                                </div>
                              )}
                            </div>

                            {/* Title & 3-line Detailed Metadata Block */}
                            <div className="flex-1 min-w-0 pt-0.5 space-y-0.5">
                              {/* Main Title */}
                              <h3 className="text-xs sm:text-sm font-extrabold text-white leading-snug line-clamp-1 group-hover/card:text-blue-400 transition-colors">
                                {title}
                              </h3>

                              {/* English / Original Title */}
                              {originName ? (
                                <p className="text-[11px] text-neutral-400 font-normal leading-tight line-clamp-1">
                                  {originName}
                                </p>
                              ) : null}

                              {/* Metadata Line: T18 • 2026 • 1h 50m */}
                              <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 font-bold pt-0.5 flex-wrap">
                                <span className="text-neutral-300 font-extrabold">
                                  {ageRating}
                                </span>
                                <span>•</span>
                                <span>{year}</span>
                                {durationStr ? (
                                  <>
                                    <span>•</span>
                                    <span>{durationStr}</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
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
