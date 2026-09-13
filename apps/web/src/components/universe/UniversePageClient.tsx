"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Clock,
} from "lucide-react";
import dynamic from "next/dynamic";
import { FilmCard, FilmItem } from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { LandscapeSpotlightRow } from "@/components/film/LandscapeSpotlightRow";
import { UniverseTimelineSection } from "@/components/universe/UniverseTimelineSection";
import {
  getUniverseFilms,
  getUniverseSpotlights,
  MARVEL_SUB_FRANCHISES,
  DC_SUB_FRANCHISES,
  UniverseSpotlightItem,
} from "@/lib/universe-catalog";
import { cn } from "@/lib/utils";
import { wsrvImageUrl, isWsrvImageUrl } from "@/lib/image-cdn";
import { resolveImageUrl } from "@/lib/movie-image-url";

const TrailerModal = dynamic(
  () => import("@/components/film/TrailerModal").then((m) => m.TrailerModal),
  { ssr: false },
);

function UniverseSpotlightBackdrop({
  item,
  isActive,
  isPriority,
}: {
  item: UniverseSpotlightItem;
  isActive: boolean;
  isPriority: boolean;
}) {
  const candidates = useMemo(() => {
    const list: string[] = [];
    if (item.heroBackdrop) {
      // 1. Primary TMDB image (processed through Next.js Image Optimization)
      list.push(item.heroBackdrop);
      // 2. Cloudflare edge proxy (wsrv.nl - globally unblocked in VN)
      const wsrv = wsrvImageUrl(item.heroBackdrop, "backdrop");
      if (wsrv) list.push(wsrv);
      // 3. Same-origin local image proxy
      list.push(`/api/image-proxy?url=${encodeURIComponent(item.heroBackdrop)}&strict=1`);
    }
    return list;
  }, [item.heroBackdrop]);

  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [item.heroBackdrop]);

  const src = candidates[candidateIdx] || candidates[0];

  return (
    <div
      className={cn(
        "absolute inset-0 transition-opacity duration-1000 ease-in-out bg-[#07080c]",
        isActive
          ? "opacity-100 z-0 pointer-events-auto"
          : "opacity-0 -z-10 pointer-events-none",
      )}
    >
      {/* Ambient atmospheric backdrop glow so hero is never pitch black */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(35,173,229,0.14),transparent_50%),linear-gradient(135deg,#07080c_0%,#111620_52%,#07080c_100%)]" />

      {src && (
        <Image
          key={src}
          src={src}
          alt={item.name}
          fill
          priority={isPriority}
          fetchPriority={isPriority ? "high" : "low"}
          loading={isPriority ? "eager" : "lazy"}
          decoding={isPriority ? "sync" : "async"}
          unoptimized={isWsrvImageUrl(src) || src.startsWith("/api/")}
          sizes="100vw"
          onError={() => {
            if (candidateIdx < candidates.length - 1) {
              setCandidateIdx((prev) => prev + 1);
            }
          }}
          className="object-cover object-center sm:object-[center_22%]"
        />
      )}
    </div>
  );
}

function UniverseSpotlightLogo({
  titleLogo,
  name,
}: {
  titleLogo?: string | null;
  name: string;
}) {
  const candidates = useMemo(() => {
    const list: string[] = [];
    if (titleLogo) {
      // 1. Primary logo (processed through Next.js Image Optimization)
      list.push(titleLogo);
      // 2. Cloudflare edge proxy (wsrv.nl - globally unblocked in VN)
      const wsrv = wsrvImageUrl(titleLogo, "titleLogo");
      if (wsrv) list.push(wsrv);
      // 3. Same-origin local image proxy
      list.push(`/api/image-proxy?url=${encodeURIComponent(titleLogo)}&strict=1`);
    }
    return list;
  }, [titleLogo]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  useEffect(() => {
    setCandidateIdx(0);
    setHasFailedAll(!titleLogo);
  }, [titleLogo]);

  const src = candidates[candidateIdx];

  if (!titleLogo || hasFailedAll || !src) {
    return (
      <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
        {name}
      </h1>
    );
  }

  return (
    <div className="relative h-16 sm:h-24 md:h-28 lg:h-32 xl:h-36 w-72 sm:w-96 md:w-[420px] lg:w-[480px] xl:w-[520px] max-w-full drop-shadow-[0_10px_30px_rgba(0,0,0,0.95)]">
      <Image
        key={src}
        src={src}
        alt={name}
        fill
        priority
        fetchPriority="high"
        loading="eager"
        decoding="sync"
        unoptimized={isWsrvImageUrl(src) || src.startsWith("/api/")}
        onError={() => {
          if (candidateIdx < candidates.length - 1) {
            setCandidateIdx((prev) => prev + 1);
          } else {
            setHasFailedAll(true);
          }
        }}
        className="object-contain object-left"
        sizes="(max-width: 768px) 320px, 520px"
      />
    </div>
  );
}

function UniverseThumbnailButton({
  item,
  isActive,
  onClick,
}: {
  item: UniverseSpotlightItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const [useFallback, setUseFallback] = useState(false);
  const src = useFallback
    ? wsrvImageUrl(item.heroBackdrop, "thumbnail") || item.heroBackdrop
    : item.heroBackdrop;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative h-14 w-24 sm:h-[62px] sm:w-[110px] lg:h-[68px] lg:w-[120px] rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer shrink-0 bg-neutral-900/90",
        isActive
          ? "border-white ring-2 ring-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.3)] z-10"
          : "border-white/20 opacity-65 hover:opacity-100 hover:border-white/60",
      )}
    >
      <Image
        key={src}
        src={src}
        alt={item.name}
        fill
        sizes="(max-width: 640px) 96px, 120px"
        loading="lazy"
        unoptimized={useFallback}
        onError={() => {
          if (!useFallback) setUseFallback(true);
        }}
        className={cn(
          "object-cover transition-transform duration-500",
          isActive ? "scale-105" : "group-hover:scale-105",
        )}
      />
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
      <span className="absolute bottom-1.5 left-2 right-2 text-[10px] sm:text-[11px] font-bold text-white truncate text-left drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        {item.name}
      </span>
    </button>
  );
}

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

  const thumbnailScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active thumbnail into view smoothly
  useEffect(() => {
    if (!thumbnailScrollRef.current) return;
    const activeBtn = thumbnailScrollRef.current.children[currentIdx] as HTMLElement | undefined;
    if (activeBtn && typeof activeBtn.scrollIntoView === "function") {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentIdx]);

  // Auto-rotate spotlight every 8 seconds
  useEffect(() => {
    if (isPaused || spotlights.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % spotlights.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isPaused, spotlights.length]);

  // Idle-preload remaining spotlight backdrops and logos into browser memory for 0ms transitions
  useEffect(() => {
    if (typeof window === "undefined" || !spotlights.length) return;

    const idleCallback =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 150);

    const handle = idleCallback(() => {
      spotlights.slice(1).forEach((item) => {
        if (item.heroBackdrop) {
          const wsrv = wsrvImageUrl(item.heroBackdrop, "backdrop");
          const img = new window.Image();
          img.decoding = "async";
          img.src = wsrv || item.heroBackdrop;
        }
        if (item.titleLogo) {
          const wsrv = wsrvImageUrl(item.titleLogo, "titleLogo");
          const img = new window.Image();
          img.decoding = "async";
          img.src = wsrv || item.titleLogo;
        }
      });
    });

    return () => {
      if (typeof window.cancelIdleCallback === "function" && typeof handle === "number") {
        window.cancelIdleCallback(handle);
      }
    };
  }, [spotlights]);

  // Convert spotlight to FilmItem for trailer modal
  const activeFilmItem: FilmItem & { trailer_url?: string } = useMemo(() => {
    return {
      _id: activeSpotlight.id,
      slug: activeSpotlight.slug,
      name: activeSpotlight.name,
      origin_name: activeSpotlight.origin_name,
      type: "single",
      thumb_url: activeSpotlight.heroBackdrop,
      poster_url: activeSpotlight.heroBackdrop,
      year: activeSpotlight.year,
      quality: activeSpotlight.quality,
      lang: activeSpotlight.lang,
      vote_average: activeSpotlight.rating,
      trailer_url: activeSpotlight.trailer_url,
    };
  }, [activeSpotlight]);

  // Rails categorized by franchise
  const isDc = !isMarvel;
  const rail1 = useMemo(() => {
    const raw = getUniverseFilms(universe, {
      subFranchise: isMarvel ? "avengers" : "batman",
    });
    return mapRawToFilmItems(raw);
  }, [universe, isMarvel]);

  const rail2 = useMemo(() => {
    const raw = getUniverseFilms(universe, {
      subFranchise: isMarvel ? "spiderman" : "justice-league",
    });
    return mapRawToFilmItems(raw);
  }, [universe, isMarvel]);

  const rail3 = useMemo(() => {
    const raw = getUniverseFilms(universe, {
      subFranchise: isMarvel ? "xmen" : "superman",
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
        className="relative w-full min-h-[640px] sm:min-h-[700px] lg:min-h-[740px] lg:h-[90vh] max-h-[1020px] overflow-hidden select-none"
      >
        {/* Backdrop Crossfade (Preloaded & Seamless) */}
        {spotlights.map((item, idx) => (
          <UniverseSpotlightBackdrop
            key={item.id}
            item={item}
            isActive={idx === currentIdx}
            isPriority={idx === 0}
          />
        ))}

        {/* Cinematic Lighting Gradients */}
        {/* Left readable text shadow mask */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080c] via-[#07080c]/75 via-40% to-transparent pointer-events-none z-[1]" />
        {/* Bottom bleed into body content */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/50 via-25% to-transparent pointer-events-none z-[1]" />
        {/* Top subtle fade for navbar readability */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#07080c]/80 to-transparent pointer-events-none z-[1]" />

        {/* Spotlight Content Overlay */}
        <div className="relative z-10 h-full max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-14 flex flex-col justify-end pb-8 sm:pb-10 lg:pb-12 pt-20">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-8">
            {/* Left Column: Movie Info & Actions */}
            <div className="max-w-xl xl:max-w-2xl 2xl:max-w-3xl space-y-3.5 sm:space-y-4">
              {/* Universe Official Brand Logo (Original Logo, no custom container wrapper) */}
              <div className="flex items-center select-none ml-0.5 sm:ml-1">
                {isMarvel ? (
                  // Official Marvel Brand Logo
                  <div className="relative h-7 sm:h-9 md:h-10 w-20 sm:w-24 md:w-28 shrink-0">
                    <Image
                      src="/images/logos/marvel-logo.svg"
                      alt="Marvel"
                      fill
                      priority
                      sizes="(max-width: 640px) 80px, 112px"
                      className="object-contain object-left"
                    />
                  </div>
                ) : (
                  // Official DC Comics Vector Logo
                  <div className="relative h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 shrink-0">
                    <Image
                      src="/images/logos/dc-logo.svg"
                      alt="DC Comics"
                      fill
                      priority
                      sizes="(max-width: 640px) 48px, 56px"
                      className="object-contain object-left"
                    />
                  </div>
                )}
              </div>

              {/* Movie Title or Logo */}
              <div key={activeSpotlight.slug} className="space-y-2">
                <UniverseSpotlightLogo
                  titleLogo={activeSpotlight.titleLogo}
                  name={activeSpotlight.name}
                />

                <div className="text-xs sm:text-sm font-medium text-neutral-300 drop-shadow">
                  <span>{activeSpotlight.origin_name}</span>
                  <span className="mx-2 text-neutral-500">•</span>
                  <span>{activeSpotlight.year}</span>
                </div>
              </div>

              {/* Meta tags */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold shadow-sm">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span>{activeSpotlight.rating.toFixed(1)} TMDB</span>
                </span>

                <span className="px-2.5 py-1 rounded-lg bg-[#141720] border border-white/10 text-neutral-300 font-medium shadow-sm">
                  {activeSpotlight.lang}
                </span>

                <span className="px-2.5 py-1 rounded-lg bg-[#141720] border border-white/10 text-neutral-300 font-medium shadow-sm">
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
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-extrabold text-xs sm:text-sm hover:bg-neutral-100 transition-all shadow-lg shadow-black/40 active:scale-95"
                >
                  <Play size={16} className="fill-black" />
                  <span>Xem Phim Ngay</span>
                </Link>

                {activeSpotlight.trailer_url && (
                  <button
                    type="button"
                    onClick={() => setTrailerFilm(activeFilmItem)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#181b24] hover:bg-[#232836] text-white font-bold text-xs sm:text-sm border border-white/10 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Clapperboard size={16} />
                    <span>Xem Trailer</span>
                  </button>
                )}

                <Link
                  href={`/film/${activeSpotlight.slug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-neutral-300 hover:text-white font-semibold text-xs sm:text-sm transition-colors hover:bg-white/5"
                >
                  <span>Chi tiết</span>
                  <ChevronRight size={14} />
                </Link>

                <a
                  href="#universe-timeline"
                  className="inline-flex items-center gap-1.5 px-3.5 py-3 rounded-xl text-neutral-300 hover:text-white font-semibold text-xs sm:text-sm transition-colors bg-[#181b24]/80 hover:bg-[#232836] border border-white/10"
                >
                  <Clock size={14} className={isMarvel ? "text-red-400" : "text-sky-400"} />
                  <span>Dòng Thời Gian</span>
                </a>
              </div>
            </div>

            {/* Right Column: Carousel Thumbnails */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 max-w-full lg:max-w-[580px] xl:max-w-[700px]">
              <div
                ref={thumbnailScrollRef}
                className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-2.5 px-0.5 scroll-smooth overscroll-x-contain"
              >
                {spotlights.map((item, idx) => (
                  <UniverseThumbnailButton
                    key={item.id}
                    item={item}
                    isActive={idx === currentIdx}
                    onClick={() => setCurrentIdx(idx)}
                  />
                ))}
              </div>

              {/* Prev / Next Arrows */}
              <div className="flex items-center gap-1 pl-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIdx(
                      (prev) => (prev - 1 + spotlights.length) % spotlights.length,
                    )
                  }
                  className="p-2 sm:p-2.5 rounded-xl bg-black/75 hover:bg-white/20 text-white/90 hover:text-white border border-white/15 backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-lg"
                  aria-label="Previous"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIdx((prev) => (prev + 1) % spotlights.length)
                  }
                  className="p-2 sm:p-2.5 rounded-xl bg-black/75 hover:bg-white/20 text-white/90 hover:text-white border border-white/15 backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-lg"
                  aria-label="Next"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
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

        {/* ── 3. CHRONOLOGICAL TIMELINE ROADMAP ─────────────────────────────── */}
        <UniverseTimelineSection universe={universe} />

        {/* ── 4. FULL UNIVERSE CATALOG (LƯỚI PHIM TOÀN BỘ 7 CỘT) ─────────────── */}
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
