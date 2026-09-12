"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Film,
  Star,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Clapperboard,
  Tv,
} from "lucide-react";
import dynamic from "next/dynamic";
import { FilmCard, FilmItem, resolveImageUrl } from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { LandscapeSpotlightRow } from "@/components/film/LandscapeSpotlightRow";
import {
  getUniverseFilms,
  getUniverseSpotlights,
  MARVEL_SUB_FRANCHISES,
  DC_SUB_FRANCHISES,
  UniverseSpotlightItem,
} from "@/lib/universe-catalog";
import { cn } from "@/lib/utils";

const TrailerModal = dynamic(
  () => import("@/components/film/TrailerModal").then((m) => m.TrailerModal),
  { ssr: false },
);

interface UniversePageClientProps {
  universe: "marvel" | "dc";
}

export function UniversePageClient({ universe }: UniversePageClientProps) {
  const isMarvel = universe === "marvel";

  // Data & Spotlights
  const spotlights = useMemo(() => getUniverseSpotlights(universe), [universe]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [trailerFilm, setTrailerFilm] = useState<
    (FilmItem & { trailer_url?: string }) | null
  >(null);

  // Sub-franchise filter for full catalog
  const subFranchises = isMarvel ? MARVEL_SUB_FRANCHISES : DC_SUB_FRANCHISES;
  const [selectedSub, setSelectedSub] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 28;

  // Active spotlight item
  const activeSpotlight: UniverseSpotlightItem = useMemo(() => {
    return spotlights[currentIdx] || spotlights[0];
  }, [spotlights, currentIdx]);

  // Auto-rotate spotlight every 8 seconds
  useEffect(() => {
    if (isPaused || spotlights.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % spotlights.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isPaused, spotlights.length]);

  // Convert spotlight to FilmItem for trailer modal
  const activeFilmItem: FilmItem & { trailer_url?: string } = useMemo(() => {
    return {
      _id: activeSpotlight.id,
      slug: activeSpotlight.slug,
      name: activeSpotlight.name,
      origin_name: activeSpotlight.origin_name,
      poster_url: activeSpotlight.heroBackdrop,
      thumb_url: activeSpotlight.heroBackdrop,
      heroBackdrop: activeSpotlight.heroBackdrop,
      year: activeSpotlight.year,
      quality: activeSpotlight.quality,
      lang: activeSpotlight.lang,
      vote_average: activeSpotlight.rating,
      trailer_url: activeSpotlight.trailer_url,
    };
  }, [activeSpotlight]);

  // Themed rails data
  const rail1 = useMemo(() => {
    const raw = getUniverseFilms(universe, {
      subFranchise: isMarvel ? "avengers" : "batman",
    });
    return mapRawToFilmItems(raw);
  }, [universe, isMarvel]);

  const rail2 = useMemo(() => {
    const raw = getUniverseFilms(universe, {
      subFranchise: isMarvel ? "spiderman" : "justiceleague",
    });
    return mapRawToFilmItems(raw);
  }, [universe, isMarvel]);

  const rail3 = useMemo(() => {
    const raw = getUniverseFilms(universe, {
      subFranchise: isMarvel ? "xmen" : "villains",
    });
    return mapRawToFilmItems(raw);
  }, [universe, isMarvel]);

  const rail4 = useMemo(() => {
    const raw = getUniverseFilms(universe, {
      subFranchise: isMarvel ? "disneyplus" : "series",
    });
    return mapRawToFilmItems(raw);
  }, [universe, isMarvel]);

  // Catalog filtered items
  const catalogFilms = useMemo(() => {
    const raw = getUniverseFilms(universe, { subFranchise: selectedSub });
    return mapRawToFilmItems(raw);
  }, [universe, selectedSub]);

  const totalPages = Math.ceil(catalogFilms.length / pageSize);
  const pagedFilms = useMemo(() => {
    const start = (page - 1) * pageSize;
    return catalogFilms.slice(start, start + pageSize);
  }, [catalogFilms, page]);

  return (
    <div className="relative min-h-screen bg-[#07080c] text-white selection:bg-cyan-500/30">
      {/* ── 1. FULL-BLEED HERO BANNER ──────────────────────────────────────── */}
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative w-full h-[76vh] sm:h-[82vh] lg:h-[88vh] min-h-[580px] max-h-[960px] overflow-hidden select-none"
      >
        {/* Backdrop Crossfade (Preloaded & Seamless) */}
        {spotlights.map((item, idx) => {
          const isActive = idx === currentIdx;
          return (
            <div
              key={item.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-1000 ease-in-out",
                isActive
                  ? "opacity-100 z-0 pointer-events-auto"
                  : "opacity-0 -z-10 pointer-events-none",
              )}
            >
              <Image
                src={item.heroBackdrop}
                alt={item.name}
                fill
                priority={idx === 0}
                sizes="100vw"
                className="object-cover object-center sm:object-[center_22%]"
              />
            </div>
          );
        })}

        {/* Cinematic Lighting Gradients */}
        {/* Left readable text shadow mask */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080c] via-[#07080c]/75 via-40% to-transparent pointer-events-none z-[1]" />
        {/* Bottom bleed into body content */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/50 via-25% to-transparent pointer-events-none z-[1]" />
        {/* Top subtle fade for navbar readability */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#07080c]/80 to-transparent pointer-events-none z-[1]" />

        {/* Spotlight Content Overlay */}
        <div className="relative z-10 h-full max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-14 flex flex-col justify-end pb-10 sm:pb-14 lg:pb-16">
          <div className="max-w-2xl lg:max-w-3xl space-y-4">
            {/* Universe Brand Capsule */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-xl">
              <div className="relative h-4 w-16 sm:h-5 sm:w-20">
                <Image
                  src={
                    isMarvel
                      ? "/images/logos/marvel-studios.svg"
                      : "/images/logos/dc-universe.svg"
                  }
                  alt={isMarvel ? "Marvel Studios" : "DC Universe"}
                  fill
                  className="object-contain object-left"
                />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-300 pl-1 border-l border-white/20">
                {isMarvel ? "Vũ Trụ Điện Ảnh Marvel" : "Vũ Trụ Điện Ảnh DC"}
              </span>
            </div>

            {/* Movie Title or Logo */}
            <div key={activeSpotlight.slug} className="space-y-2">
              {activeSpotlight.titleLogo ? (
                <div className="relative h-14 sm:h-20 lg:h-24 w-60 sm:w-80 lg:w-96 max-w-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)]">
                  <Image
                    src={activeSpotlight.titleLogo}
                    alt={activeSpotlight.name}
                    fill
                    className="object-contain object-left"
                    sizes="(max-width: 768px) 240px, 384px"
                  />
                </div>
              ) : (
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                  {activeSpotlight.name}
                </h1>
              )}

              <div className="text-xs sm:text-sm font-medium text-neutral-300 drop-shadow">
                <span>{activeSpotlight.origin_name}</span>
                <span className="mx-2 text-neutral-500">•</span>
                <span>{activeSpotlight.year}</span>
              </div>
            </div>

            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span>{activeSpotlight.rating.toFixed(1)} TMDB</span>
              </span>

              <span className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-neutral-200 font-medium">
                {activeSpotlight.lang}
              </span>

              <span className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-neutral-200 font-medium">
                {activeSpotlight.quality}
              </span>
            </div>

            {/* Synopsis */}
            <p className="text-xs sm:text-sm text-neutral-300/90 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl drop-shadow">
              {activeSpotlight.content}
            </p>

            {/* Actions Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={`/watch/${activeSpotlight.slug}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-extrabold text-xs sm:text-sm hover:bg-neutral-200 transition-all shadow-[0_8px_24px_rgba(255,255,255,0.25)] active:scale-95"
              >
                <Play size={16} className="fill-black" />
                <span>Xem Phim Ngay</span>
              </Link>

              {activeSpotlight.trailer_url && (
                <button
                  type="button"
                  onClick={() => setTrailerFilm(activeFilmItem)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Clapperboard size={16} />
                  <span>Xem Trailer</span>
                </button>
              )}

              <Link
                href={`/film/${activeSpotlight.slug}`}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-neutral-300 hover:text-white font-semibold text-xs sm:text-sm transition-colors"
              >
                <span>Chi tiết</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* Bottom Right Carousel Thumbnails */}
          <div className="mt-8 lg:mt-0 lg:absolute lg:right-14 lg:bottom-16 flex items-center gap-2.5 overflow-x-auto no-scrollbar py-2">
            {spotlights.map((item, idx) => {
              const isActive = idx === currentIdx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={cn(
                    "relative h-14 w-24 sm:h-16 sm:w-28 rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer shrink-0",
                    isActive
                      ? "border-white ring-2 ring-white/60 scale-105 shadow-xl"
                      : "border-white/20 opacity-60 hover:opacity-100 hover:border-white/50",
                  )}
                >
                  <Image
                    src={item.heroBackdrop}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className="absolute bottom-1 left-1.5 right-1.5 text-[9px] font-bold text-white truncate text-left">
                    {item.name}
                  </span>
                </button>
              );
            })}

            {/* Prev / Next Arrows */}
            <div className="flex items-center gap-1 pl-1 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setCurrentIdx(
                    (prev) => (prev - 1 + spotlights.length) % spotlights.length,
                  )
                }
                className="p-2 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 transition-colors cursor-pointer"
                aria-label="Previous"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentIdx((prev) => (prev + 1) % spotlights.length)
                }
                className="p-2 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 transition-colors cursor-pointer"
                aria-label="Next"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. THEMED HORIZONTAL RAILS (DISNEY+ / HBO MAX STYLE) ─────────────── */}
      <div className="relative z-20 max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-14 pt-6 sm:pt-10 space-y-8 sm:space-y-12">
        {/* Rail 1 */}
        <LandscapeSpotlightRow
          title={
            isMarvel
              ? "Biệt Đội Avengers & Sự Kiện Đa Vũ Trụ"
              : "Kỵ Sĩ Bóng Đêm & Huyền Thoại Gotham"
          }
          films={rail1}
        />

        {/* Rail 2 */}
        <LandscapeSpotlightRow
          title={
            isMarvel
              ? "Người Nhện & Vũ Trụ Spider-Verse"
              : "Liên Minh Công Lý & Siêu Anh Hùng DC"
          }
          films={rail2}
        />

        {/* Rail 3 */}
        <LandscapeSpotlightRow
          title={
            isMarvel
              ? "Dị Nhân X-Men & Đột Biến"
              : "Thế Giới Phản Diện & Joker"
          }
          films={rail3}
        />

        {/* Rail 4 */}
        <LandscapeSpotlightRow
          title={
            isMarvel
              ? "Marvel Series Độc Quyền (Disney+)"
              : "DC Series & Hoạt Hình Huyền Thoại"
          }
          films={rail4}
        />

        {/* ── 3. FULL UNIVERSE CATALOG (LƯỚI PHIM TOÀN BỘ 7 CỘT) ─────────────── */}
        <section id="full-catalog" className="pt-8 sm:pt-12 pb-16 border-t border-white/[0.08]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-1.5 h-6 rounded-full",
                  isMarvel
                    ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]"
                    : "bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.7)]",
                )}
              />
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isMarvel ? "Kho Bom Tấn Marvel Toàn Diện" : "Kho Kiệt Tác DC Toàn Diện"}
              </h2>
              <span className="text-xs font-semibold text-neutral-400">
                ({catalogFilms.length} phim)
              </span>
            </div>

            {/* Sub-franchise Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {subFranchises.map((sub) => {
                const isActive = selectedSub === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSub(sub.id);
                      setPage(1);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 select-none",
                      isActive
                        ? isMarvel
                          ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                          : "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                        : "bg-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10",
                    )}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standard 7-Column Movie Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3.5 lg:gap-4">
            {pagedFilms.map((film, index) => (
              <FilmCard key={film._id || film.slug} film={film} priority={index < 7} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-8 sm:pt-12 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => {
                  setPage(p);
                  const el = document.getElementById("full-catalog");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </div>
          )}
        </section>
      </div>

      {/* Trailer Modal */}
      {trailerFilm && (
        <TrailerModal
          isOpen={Boolean(trailerFilm)}
          film={trailerFilm}
          onClose={() => setTrailerFilm(null)}
        />
      )}
    </div>
  );
}

function mapRawToFilmItems(rawList: any[]): (FilmItem & { trailer_url?: string })[] {
  return rawList.map((item): FilmItem & { trailer_url?: string } => {
    const pUrl = String(item.poster_url || item.thumb_url || "");
    const tUrl = String(item.thumb_url || item.poster_url || "");
    return {
      _id: String(item._id || item.id || item.slug || ""),
      name: String(item.name || item.title || ""),
      origin_name: String(item.origin_name || item.original_title || ""),
      slug: String(item.slug || ""),
      poster_url: resolveImageUrl(pUrl, tUrl) || pUrl,
      thumb_url: resolveImageUrl(tUrl, pUrl) || tUrl,
      year: Number(item.year) || 2024,
      episode_current: String(item.episode_current || "HD"),
      quality: String(item.quality || "FHD"),
      lang: String(item.lang || "Vietsub"),
      category: Array.isArray(item.category) ? item.category : [],
      country: Array.isArray(item.country) ? item.country : [],
      vote_average: Number(item.vote_average || item.rating) || 8.2,
      trailer_url: item.trailer_url,
    };
  });
}
