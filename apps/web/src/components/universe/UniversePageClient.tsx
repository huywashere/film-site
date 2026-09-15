"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Star,
  ChevronRight,
  ChevronLeft,
  Clapperboard,
  Clock,
  ChevronDown,
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
  DORAEMON_SUB_FRANCHISES,
  CONAN_SUB_FRANCHISES,
  UniverseSpotlightItem,
  UniverseType,
} from "@/lib/universe-catalog";
import { cn } from "@/lib/utils";
import {
  buildArtworkCandidates,
  isWsrvImageUrl,
} from "@/lib/image-cdn";
import { resolveImageUrl } from "@/lib/movie-image-url";
import {
  isImagePreloaded,
  markImagePreloaded,
  preloadImage,
} from "@/lib/image-preload-cache";

const TrailerModal = dynamic(
  () => import("@/components/film/TrailerModal").then((m) => m.TrailerModal),
  { ssr: false },
);

function getUniverseLogoCandidates(titleLogo?: string | null): string[] {
  if (!titleLogo) return [];
  return buildArtworkCandidates([titleLogo], "titleLogo", {
    preferEdge: titleLogo.includes("image.tmdb.org"),
    strictProxy: true,
  });
}

async function preloadUniverseLogo(titleLogo?: string | null): Promise<void> {
  const candidates = getUniverseLogoCandidates(titleLogo).slice(0, 2);
  if (!candidates.length) return;
  await new Promise<void>((resolve) => {
    let pending = candidates.length;
    let settled = false;
    candidates.forEach((source) => {
      void preloadImage(source).then((ready) => {
        pending -= 1;
        if (!settled && (ready || pending === 0)) {
          settled = true;
          resolve();
        }
      });
    });
  });
}

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
    return buildArtworkCandidates([item.heroBackdrop], "backdrop", {
      includeWsrvForTmdb: true,
      strictProxy: true,
    });
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

      {src && (isActive || isPriority) && (
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
  isPriority = false,
}: {
  titleLogo?: string | null;
  name: string;
  isPriority?: boolean;
}) {
  const candidates = useMemo(
    () => getUniverseLogoCandidates(titleLogo),
    [titleLogo],
  );

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  useEffect(() => {
    const cachedIdx = candidates.findIndex((source) =>
      isImagePreloaded(source),
    );
    setCandidateIdx(cachedIdx >= 0 ? cachedIdx : 0);
    setHasFailedAll(!titleLogo);
    setLoadedSrc(cachedIdx >= 0 ? candidates[cachedIdx] : null);
  }, [candidates, titleLogo]);

  const cachedIdx = candidates.findIndex((source) =>
    isImagePreloaded(source),
  );
  const resolvedIdx = cachedIdx >= 0 ? cachedIdx : candidateIdx;
  const src = candidates[resolvedIdx];
  const isReady = Boolean(
    src && (loadedSrc === src || isImagePreloaded(src)),
  );

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
        alt=""
        aria-hidden="true"
        fill
        priority={isPriority}
        fetchPriority={isPriority ? "high" : "low"}
        loading="eager"
        decoding="sync"
        unoptimized={isWsrvImageUrl(src) || src.startsWith("/api/")}
        onLoad={() => {
          markImagePreloaded(src);
          setLoadedSrc(src);
        }}
        onError={() => {
          if (resolvedIdx < candidates.length - 1) {
            setCandidateIdx(resolvedIdx + 1);
            setLoadedSrc(null);
          } else {
            setHasFailedAll(true);
          }
        }}
        className={cn(
          "object-contain object-left transition-opacity duration-200",
          isReady ? "opacity-100" : "opacity-0",
        )}
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
  const candidates = useMemo(
    () =>
      buildArtworkCandidates([item.heroBackdrop], "thumbnail", {
        includeWsrvForTmdb: true,
      }),
    [item.heroBackdrop],
  );
  const src = useFallback ? candidates[1] || candidates[0] : candidates[0];

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
  universe: UniverseType;
}

export function UniversePageClient({ universe }: UniversePageClientProps) {
  const isMarvel = universe === "marvel";
  const isDC = universe === "dc";
  const isDoraemon = universe === "doraemon";
  const isConan = universe === "conan";

  // Data & Spotlights
  const spotlights = useMemo(() => getUniverseSpotlights(universe), [universe]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const slideActivationRequest = useRef(0);
  const [isPaused, setIsPaused] = useState(false);
  const [trailerFilm, setTrailerFilm] = useState<
    (FilmItem & { trailer_url?: string }) | null
  >(null);

  // Sub-franchise filter for full catalog
  const subFranchises = isMarvel
    ? MARVEL_SUB_FRANCHISES
    : isDC
      ? DC_SUB_FRANCHISES
      : isDoraemon
        ? DORAEMON_SUB_FRANCHISES
        : CONAN_SUB_FRANCHISES;
  const [selectedSub, setSelectedSub] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 28;

  // Active spotlight item
  const activeSpotlight: UniverseSpotlightItem = useMemo(() => {
    return spotlights[currentIdx] || spotlights[0];
  }, [spotlights, currentIdx]);

  const thumbnailScrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [isHeroVisible, setIsHeroVisible] = useState(true);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsHeroVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // Center only the horizontal thumbnail rail. scrollIntoView also moved the
  // page vertically and pulled mobile users back to the hero every 8 seconds.
  useEffect(() => {
    const rail = thumbnailScrollRef.current;
    if (!rail) return;
    const activeButton = rail.children[currentIdx] as HTMLElement | undefined;
    if (!activeButton) return;
    const centeredLeft =
      activeButton.offsetLeft - (rail.clientWidth - activeButton.offsetWidth) / 2;
    rail.scrollTo({ left: Math.max(0, centeredLeft), behavior: "smooth" });
  }, [currentIdx]);

  const activateSpotlight = useCallback(
    async (requestedIndex: number) => {
      if (!spotlights.length) return;
      const nextIndex =
        (requestedIndex + spotlights.length) % spotlights.length;
      const requestId = ++slideActivationRequest.current;

      // Do not replace the painted title with an undecoded image. This keeps
      // carousel changes atomic and prevents the browser's broken-image frame.
      await preloadUniverseLogo(spotlights[nextIndex]?.titleLogo);
      if (requestId !== slideActivationRequest.current) return;
      setCurrentIdx(nextIndex);
    },
    [spotlights],
  );

  // Auto-rotate spotlight every 8 seconds
  useEffect(() => {
    if (isPaused || !isHeroVisible || spotlights.length <= 1) return;
    const timer = window.setTimeout(() => {
      void activateSpotlight(currentIdx + 1);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [activateSpotlight, currentIdx, isHeroVisible, isPaused, spotlights.length]);

  // Title logos are tiny compared with hero backdrops. Decode them up front so
  // both automatic rotation and non-adjacent thumbnail selection stay instant.
  useEffect(() => {
    if (!isHeroVisible) return;
    spotlights.forEach((item) => {
      void preloadUniverseLogo(item.titleLogo);
    });
  }, [isHeroVisible, spotlights]);

  // Warm only the next slide while the hero is visible. Loading the entire
  // spotlight pool competed with timeline posters on mobile.
  useEffect(() => {
    if (!isHeroVisible || spotlights.length <= 1) return;
    const handle = window.setTimeout(() => {
      const item = spotlights[(currentIdx + 1) % spotlights.length];
      const nextBackdrop = buildArtworkCandidates(
        [item.heroBackdrop],
        "backdrop",
      )[0];
      for (const source of [nextBackdrop]) {
        if (!source) continue;
        const image = new window.Image();
        image.decoding = "async";
        image.src = source;
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [currentIdx, isHeroVisible, spotlights]);

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
  const rail1 = useMemo(() => {
    let sub = "avengers";
    if (isDC) sub = "batman";
    else if (isDoraemon) sub = "movies";
    else if (isConan) sub = "movies";
    const raw = getUniverseFilms(universe, { subFranchise: sub });
    return mapRawToFilmItems(raw);
  }, [universe, isDC, isDoraemon, isConan]);

  const rail2 = useMemo(() => {
    let sub = "spiderman";
    if (isDC) sub = "justice-league";
    else if (isDoraemon) sub = "3d";
    else if (isConan) sub = "black-org";
    const raw = getUniverseFilms(universe, { subFranchise: sub });
    return mapRawToFilmItems(raw);
  }, [universe, isDC, isDoraemon, isConan]);

  const rail3 = useMemo(() => {
    let sub = "xmen";
    if (isDC) sub = "superman";
    else if (isDoraemon) sub = "adventure";
    else if (isConan) sub = "kaito-kid";
    const raw = getUniverseFilms(universe, { subFranchise: sub });
    return mapRawToFilmItems(raw);
  }, [universe, isDC, isDoraemon, isConan]);

  const rail4 = useMemo(() => {
    let sub = "disneyplus";
    if (isDC) sub = "series";
    else if (isDoraemon) sub = "classic";
    else if (isConan) sub = "series";
    const raw = getUniverseFilms(universe, { subFranchise: sub });
    return mapRawToFilmItems(raw);
  }, [universe, isDC, isDoraemon, isConan]);

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
    <div className="relative min-h-[100dvh] bg-[#07080c] text-white selection:bg-cyan-500/30">
      {/* ── 1. FULL-BLEED HERO BANNER ──────────────────────────────────────── */}
      <section
        ref={heroRef}
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
                {isMarvel && (
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
                )}
                {isDC && (
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

              {/* Movie Title or Logo. Keep every small logo mounted so changing
                  slides only crossfades already-painted DOM nodes. */}
              <div className="space-y-2">
                <div className="relative h-16 w-72 max-w-full sm:h-24 sm:w-96 md:h-28 md:w-[420px] lg:h-32 lg:w-[480px] xl:h-36 xl:w-[520px]">
                  {spotlights.map((item, idx) => (
                    <div
                      key={item.id}
                      data-universe-logo-active={idx === currentIdx}
                      className={cn(
                        "absolute inset-0 transition-opacity duration-200",
                        idx === currentIdx
                          ? "z-10 opacity-100"
                          : "pointer-events-none opacity-0",
                      )}
                    >
                      <UniverseSpotlightLogo
                        titleLogo={item.titleLogo}
                        name={item.name}
                        isPriority={idx === 0}
                      />
                    </div>
                  ))}
                </div>

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
              <div className="grid w-full grid-cols-2 gap-2 pt-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                <Link
                  href={`/watch/${activeSpotlight.slug}`}
                  className="col-span-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-xs font-extrabold text-black shadow-lg shadow-black/40 transition-colors hover:bg-neutral-100 active:translate-y-px sm:col-auto sm:w-auto sm:text-sm"
                >
                  <Play size={16} className="fill-black" />
                  <span>Xem Phim Ngay</span>
                </Link>

                {activeSpotlight.trailer_url && (
                  <button
                    type="button"
                    onClick={() => setTrailerFilm(activeFilmItem)}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#181b24] px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-[#232836] active:translate-y-px sm:w-auto sm:px-5 sm:text-sm"
                  >
                    <Clapperboard size={16} />
                    <span>Xem Trailer</span>
                  </button>
                )}

                <Link
                  href={`/film/${activeSpotlight.slug}`}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white sm:w-auto sm:border-transparent sm:bg-transparent sm:text-sm"
                >
                  <span>Chi tiết</span>
                  <ChevronRight size={14} />
                </Link>

                <a
                  href={isMarvel || isDC ? "#universe-timeline" : "#full-catalog"}
                  className={cn(
                    "group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition-colors active:translate-y-px sm:w-auto sm:text-sm",
                    isMarvel
                      ? "border-red-500/35 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                      : isDC
                        ? "border-sky-500/35 bg-sky-500/10 text-sky-200 hover:bg-sky-500/15"
                        : isDoraemon
                          ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
                          : "border-rose-500/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15",
                  )}
                >
                  {isMarvel || isDC ? (
                    <>
                      <Clock aria-hidden="true" size={14} />
                      <span>Dòng thời gian</span>
                    </>
                  ) : (
                    <>
                      <Clapperboard aria-hidden="true" size={14} />
                      <span>Khám phá trọn bộ</span>
                    </>
                  )}
                  <ChevronDown aria-hidden="true" size={14} className="transition-transform group-hover:translate-y-0.5" />
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
                    onClick={() => void activateSpotlight(idx)}
                  />
                ))}
              </div>

              {/* Prev / Next Arrows */}
              <div className="hidden items-center gap-1 pl-1 shrink-0 sm:flex">
                <button
                  type="button"
                  onClick={() => void activateSpotlight(currentIdx - 1)}
                  className="p-2 sm:p-2.5 rounded-xl bg-black/75 hover:bg-white/20 text-white/90 hover:text-white border border-white/15 backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-lg"
                  aria-label="Previous"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => void activateSpotlight(currentIdx + 1)}
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
              : isDC
                ? "Kỵ Sĩ Bóng Đêm & Huyền Thoại Gotham"
                : isDoraemon
                  ? "Movie Chiếu Rạp Mới Nhất (Thế Hệ Mới)"
                  : "Movie Chiếu Rạp Bom Tấn (Movie 1 - 28)"
          }
          films={rail1}
        />

        {/* Rail 2 */}
        <LandscapeSpotlightRow
          title={
            isMarvel
              ? "Người Nhện & Vũ Trụ Spider-Verse"
              : isDC
                ? "Liên Minh Công Lý & Siêu Anh Hùng DC"
                : isDoraemon
                  ? "Stand by Me & Kỷ Niệm Tuổi Thơ (3D)"
                  : "Cuộc Chiến Tổ Chức Áo Đen & FBI"
          }
          films={rail2}
        />

        {/* Rail 3 */}
        <LandscapeSpotlightRow
          title={
            isMarvel
              ? "Dị Nhân X-Men & Đột Biến"
              : isDC
                ? "Thế Giới Phản Diện & Joker"
                : isDoraemon
                  ? "Phiêu Lưu Vũ Trụ & Thế Giới Diệu Kỳ"
                  : "Màn Đối Đầu Siêu Đạo Tặc Kaito Kid"
          }
          films={rail3}
        />

        {/* Rail 4 */}
        <LandscapeSpotlightRow
          title={
            isMarvel
              ? "Marvel Series Độc Quyền (Disney+)"
              : isDC
                ? "DC Series & Hoạt Hình Huyền Thoại"
                : isDoraemon
                  ? "Movie Chiếu Rạp Kinh Điển (2D Tuyển Chọn)"
                  : "Conan TV Series & Ngoại Truyện Đặc Biệt"
          }
          films={rail4}
        />

        {/* ── 3. CHRONOLOGICAL TIMELINE ROADMAP ─────────────────────────────── */}
        {(isMarvel || isDC) && (
          <UniverseTimelineSection universe={universe as "marvel" | "dc"} />
        )}

        {/* ── 4. FULL UNIVERSE CATALOG (LƯỚI PHIM TOÀN BỘ 7 CỘT) ─────────────── */}
        <section id="full-catalog" className="pt-8 sm:pt-12 pb-16 border-t border-white/[0.08]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-1.5 h-6 rounded-full",
                  isMarvel
                    ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]"
                    : isDC
                      ? "bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.7)]"
                      : isDoraemon
                        ? "bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.7)]"
                        : "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)]",
                )}
              />
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isMarvel
                  ? "Kho Bom Tấn Marvel Toàn Diện"
                  : isDC
                    ? "Kho Kiệt Tác DC Toàn Diện"
                    : isDoraemon
                      ? "Trọn Bộ 48 Movie Doraemon Chiếu Rạp"
                      : "Trọn Bộ Thám Tử Lừng Danh Conan"}
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
                          : isDC
                            ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                            : isDoraemon
                              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                              : "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
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
