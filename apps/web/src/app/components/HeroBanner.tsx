"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Play, Plus, Star, ChevronDown, Film } from "lucide-react";
import { FilmItem } from "@/components/film/FilmCard";
import { TrailerModal } from "@/components/film/TrailerModal";
import { useTranslation } from "@/store/langStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { watchlistApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface HeroBannerProps {
  films: FilmItem[];
}

// Helper for ultra-fast direct CDN image URL (bypassing local Node.js proxy server overhead)
function resolveDirectImageUrl(url?: unknown): string | null {
  if (!url || typeof url !== "string") return null;
  const resolved = url.trim();
  if (!resolved) return null;
  if (resolved.startsWith("//")) return `https:${resolved}`;
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    return resolved;
  }
  const cleanPath = resolved.startsWith("/") ? resolved.slice(1) : resolved;
  return `https://img.phimapi.com/${cleanPath}`;
}

export default function HeroBanner({ films }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [trailerModalFilm, setTrailerModalFilm] = useState<FilmItem | null>(
    null,
  );
  const { user } = useAuthStore();
  const { toast } = useToast();
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
    if (featured.length <= 1) return;
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrent((c) => (c + 1) % featured.length);
      setTimeout(() => setIsTransitioning(false), 700);
    }, 12000); // 12s slide rotation
    return () => clearInterval(timer);
  }, [featured.length]);

  const film = featured[current];
  if (!film) return null;

  const ratingVal =
    film.tmdb?.vote_average || film.vote_average || film.rating || 8.3;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0a0c10]">
      {/* Direct CDN Preloaded Backdrop Layers (60 FPS Smooth GPU Opacity Crossfade) */}
      <div className="absolute inset-0 w-full h-full">
        {featured.map((item, idx) => {
          const bgUrl =
            resolveDirectImageUrl(item.thumb_url) ||
            resolveDirectImageUrl(item.poster_url);
          if (!bgUrl) return null;
          const isActive = idx === current;

          return (
            <div
              key={item.slug || idx}
              className={cn(
                "absolute inset-0 w-full h-full transition-opacity duration-700 ease-out will-change-[opacity] pointer-events-none",
                isActive ? "opacity-100 z-10" : "opacity-0 z-0",
              )}
            >
              <img
                src={bgUrl}
                alt={item.name}
                loading="eager"
                decoding="async"
                // @ts-ignore
                fetchPriority="high"
                className="w-full h-full object-cover object-center brightness-[0.72]"
              />
            </div>
          );
        })}
      </div>

      {/* Cineplay Radial Vignette Dark Gradient Overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at center, transparent 25%, rgba(10, 12, 16, 0.55) 70%, rgba(10, 12, 16, 0.95) 100%),
            linear-gradient(to top, #14181c 0%, rgba(20, 24, 28, 0.8) 25%, transparent 60%),
            linear-gradient(to bottom, rgba(10, 12, 16, 0.8) 0%, transparent 30%)
          `,
        }}
      />

      {/* Cineplay Center-Aligned Content Container */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-16 sm:pb-20 md:pb-24 text-center px-4">
        <div className="max-w-2xl mx-auto w-full flex flex-col items-center space-y-3.5 sm:space-y-4">
          <div
            key={current}
            className="flex flex-col items-center space-y-3 sm:space-y-4 animate-fade-in-up w-full"
          >
            {/* Movie Title */}
            <h1
              className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-wide uppercase leading-tight drop-shadow-[0_10px_35px_rgba(0,0,0,0.95)] max-w-2xl"
              style={{ fontFamily: "'Be Vietnam Pro', 'Inter', sans-serif" }}
            >
              {film.origin_name || film.name}
            </h1>

            {/* Badges Pill Row (Matching Cineplay Screenshot ⭐ Rating & Year) */}
            <div className="flex items-center justify-center gap-2">
              <span className="bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs font-extrabold text-amber-400 flex items-center gap-1.5 shadow-lg">
                <Star size={13} className="fill-amber-400 text-amber-400" />
                <span>
                  {typeof ratingVal === "number"
                    ? ratingVal.toFixed(1)
                    : ratingVal}
                </span>
              </span>

              {film.year && (
                <span className="bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs font-bold text-neutral-200 shadow-lg">
                  {film.year}
                </span>
              )}

              {film.quality && (
                <span className="bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs font-bold text-emerald-400 shadow-lg">
                  {film.quality}
                </span>
              )}
            </div>

            {/* Centered Overview Text */}
            <p className="text-xs sm:text-sm text-neutral-300/90 max-w-xl mx-auto leading-relaxed line-clamp-2 font-normal drop-shadow-md">
              {film.content
                ? film.content.replace(/<[^>]*>?/gm, "")
                : film.origin_name
                  ? `${film.origin_name} — ` + t("home.heroDesc")
                  : t("home.heroDesc")}
            </p>

            {/* Action Buttons (Watch Now + Trailer + Circular Plus) */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <Link
                href={`/watch/${film.slug}`}
                className="flex items-center gap-2 bg-white hover:bg-neutral-200 text-black px-7 py-3 rounded-full text-xs font-black tracking-wide uppercase transition-all duration-200 shadow-2xl hover:scale-105 active:scale-95"
              >
                <Play size={15} className="fill-black" />
                <span>Watch Now</span>
              </Link>

              <button
                type="button"
                onClick={() => setTrailerModalFilm(film)}
                className="flex items-center gap-2 bg-[#181c24]/80 hover:bg-white/20 border border-white/15 text-neutral-200 hover:text-white px-5 py-3 rounded-full text-xs font-bold transition-all duration-200 backdrop-blur-md hover:scale-105 active:scale-95 cursor-pointer shadow-xl"
              >
                <Film size={14} className="text-neutral-300" />
                <span>Trailer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    toast("Vui lòng đăng nhập để lưu phim", "info");
                    return;
                  }
                  watchlistApi
                    .add(film.slug)
                    .then(() =>
                      toast(`Đã thêm "${film.name}" vào tủ phim`, "success"),
                    )
                    .catch(() => toast("Phim đã có trong tủ phim", "info"));
                }}
                title="Thêm vào danh sách xem sau"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-xl"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ELEMENT 1: Animated Mouse Scroll Indicator (Desktop Only) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-4 z-30 hidden md:flex flex-col items-center gap-1 cursor-pointer group transition-all duration-300 opacity-70 hover:opacity-100"
        onClick={() =>
          window.scrollTo({
            top: window.innerHeight * 0.95,
            behavior: "smooth",
          })
        }
        title="Cuộn xuống để xem tiếp"
      >
        <div className="w-[22px] h-[34px] rounded-full border-2 border-white/50 flex justify-center pt-1.5 backdrop-blur-md bg-black/40 group-hover:border-white group-hover:bg-black/60 transition-all shadow-xl">
          <div className="w-1 h-2 bg-white rounded-full animate-bounce" />
        </div>
        <ChevronDown
          size={14}
          className="text-white/70 group-hover:text-white transform group-hover:translate-y-0.5 transition-all"
        />
      </div>

      {/* ELEMENT 2: Running Thumbnail Cards Carousel Row (Bottom Right Corner) */}
      <div className="absolute right-4 sm:right-8 md:right-12 bottom-6 z-30 hidden sm:flex items-center gap-2.5">
        {featured.map((item, i) => {
          const thumbImg =
            resolveDirectImageUrl(item.thumb_url) ||
            resolveDirectImageUrl(item.poster_url) ||
            "";
          const isActive = i === current;

          return (
            <button
              key={item.slug || i}
              onClick={() => {
                setIsTransitioning(true);
                setCurrent(i);
                setTimeout(() => setIsTransitioning(false), 700);
              }}
              aria-label={`Switch to ${item.name}`}
              className={cn(
                "relative w-16 sm:w-20 md:w-24 aspect-[16/9] rounded-lg overflow-hidden cursor-pointer flex-shrink-0 group transition-all duration-300",
                isActive
                  ? "border-2 border-white scale-105 shadow-2xl z-10 ring-2 ring-white/50 opacity-100"
                  : "border border-white/20 opacity-50 hover:opacity-100 hover:border-white/60 scale-95 hover:scale-100",
              )}
            >
              {thumbImg ? (
                <img
                  src={thumbImg}
                  alt={item.name}
                  className="w-full h-full object-cover object-center"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-400 font-bold px-1 text-center truncate">
                  {item.name}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Trailer Modal 4K */}
      <TrailerModal
        film={trailerModalFilm}
        isOpen={!!trailerModalFilm}
        onClose={() => setTrailerModalFilm(null)}
      />
    </div>
  );
}
