"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Play, Plus, Star, Film, ChevronDown } from "lucide-react";
import { FilmItem } from "@/components/film/FilmCard";
import { TrailerModal } from "@/components/film/TrailerModal";
import { useTranslation } from "@/store/langStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { watchlistApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { guestDataStorage } from "@/lib/user-data";
import { tmdbApi, tmdbBackdrop, tmdbPoster, type TmdbMovie } from "@/lib/tmdb";

interface HeroBannerProps {
  films: FilmItem[];
}

interface HeroFilm extends FilmItem {
  heroBackdrop?: string;
  tmdbOnly?: boolean;
}

const HERO_SESSION_KEY = "cineverse.tmdb-hero.v1";

const HERO_MARKETS = [
  { code: "US", region: "US", language: "en" },
  { code: "GB", region: "GB", language: "en" },
] as const;

function getWatchHref(film: HeroFilm): string {
  if (film.tmdbOnly) {
    return `/search?q=${encodeURIComponent(film.origin_name || film.name)}`;
  }

  const source = film._source;
  const sourceSlug = source ? film._sourceSlugs?.[source] : undefined;
  if (!source || !sourceSlug || sourceSlug === film.slug) {
    return `/watch/${film.slug}${source ? `?source=${source}` : ""}`;
  }

  const query = new URLSearchParams({ source, sourceSlug });
  return `/watch/${film.slug}?${query.toString()}`;
}

// Helper for ultra-fast direct CDN image URL (bypassing local Node.js proxy server overhead)
function resolveDirectImageUrl(url?: unknown): string | null {
  if (!url || typeof url !== "string") return null;
  let resolved = url.trim();
  if (!resolved) return null;

  if (resolved.startsWith("//")) {
    resolved = `https:${resolved}`;
  } else if (
    !resolved.startsWith("http://") &&
    !resolved.startsWith("https://")
  ) {
    const cleanPath = resolved.startsWith("/") ? resolved.slice(1) : resolved;
    resolved = `https://img.phimapi.com/${cleanPath}`;
  }
  return `/api/image-proxy?url=${encodeURIComponent(resolved)}`;
}

function toHeroFilm(movie: TmdbMovie): HeroFilm | null {
  const name = movie.title || movie.name || movie.original_title;
  if (!name || !movie.poster_path || !movie.backdrop_path) return null;

  return {
    _id: `tmdb-${movie.id}`,
    slug: `tmdb-${movie.id}`,
    name,
    origin_name: movie.original_title || movie.title || movie.name,
    poster_url: tmdbPoster(movie.poster_path, "w500") || undefined,
    thumb_url: tmdbBackdrop(movie.backdrop_path, "w1280") || undefined,
    heroBackdrop: tmdbBackdrop(movie.backdrop_path, "w1280") || undefined,
    year:
      Number((movie.release_date || movie.first_air_date || "").slice(0, 4)) ||
      undefined,
    type: movie.media_type || "single",
    quality: "TMDB 4K",
    vote_average: movie.vote_average,
    rating: movie.vote_average,
    content: movie.overview,
    tmdb: {
      id: String(movie.id),
      type: movie.media_type || "movie",
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
    },
    tmdbOnly: true,
  };
}

function selectRandomFilms(groups: TmdbMovie[][]): HeroFilm[] {
  const used = new Set<number>();
  const take = (pool: TmdbMovie[]): HeroFilm | null => {
    const choices = pool
      .filter(
        (movie) =>
          !used.has(movie.id) &&
          Boolean(movie.poster_path) &&
          Boolean(movie.backdrop_path) &&
          Boolean(movie.title || movie.name || movie.original_title),
      )
      .sort(() => Math.random() - 0.5);
    const movie = choices[0];
    if (!movie) return null;
    const heroFilm = toHeroFilm(movie);
    if (!heroFilm) return null;
    used.add(movie.id);
    return heroFilm;
  };

  const selected = groups
    .map((group) => take(group))
    .filter((movie): movie is HeroFilm => Boolean(movie));
  const allMovies = groups.flat();

  while (selected.length < 6) {
    const next = take(allMovies);
    if (!next) break;
    selected.push(next);
  }

  return selected.slice(0, 6);
}

function isStoredHeroPlaylist(value: unknown): value is HeroFilm[] {
  return (
    Array.isArray(value) &&
    value.length === 6 &&
    value.every(
      (film) =>
        typeof film === "object" &&
        film !== null &&
        typeof (film as HeroFilm).slug === "string" &&
        typeof (film as HeroFilm).heroBackdrop === "string",
    )
  );
}

export default function HeroBanner({ films }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [tmdbFeatured, setTmdbFeatured] = useState<HeroFilm[] | null>(null);
  const [trailerModalFilm, setTrailerModalFilm] = useState<FilmItem | null>(
    null,
  );
  const reduceMotion = useReducedMotion();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { t } = useTranslation();

  const fallbackFeatured = useMemo(() => {
    if (films && films.length > 0) {
      return films.slice(0, 6);
    }
    return [];
  }, [films]);

  const featured = useMemo(() => {
    if (fallbackFeatured && fallbackFeatured.length > 0) {
      return fallbackFeatured;
    }
    return tmdbFeatured || [];
  }, [fallbackFeatured, tmdbFeatured]);

  useEffect(() => {
    // Clear old session storage cache so page refresh always reflects current films setup
    try {
      sessionStorage.removeItem(HERO_SESSION_KEY);
    } catch {
      // Ignore storage clear errors
    }

    if (films && films.length > 0) {
      setTmdbFeatured(null);
      return;
    }

    let active = true;
    const loadPlaylist = async () => {
      const groups = await Promise.all(
        HERO_MARKETS.map(async (market) => {
          const response = await tmdbApi.discoverMovies({
            page: 1 + Math.floor(Math.random() * 3),
            region: market.region,
            with_origin_country: market.code,
            with_original_language: market.language,
          });
          return response?.results || [];
        }),
      );
      const playlist = selectRandomFilms(groups);

      if (!active || playlist.length !== 6) return;
      setTmdbFeatured(playlist);
    };

    void loadPlaylist();
    return () => {
      active = false;
    };
  }, [films]);

  useEffect(() => {
    setCurrent((index) => (index >= featured.length ? 0 : index));
  }, [featured.length]);

  useEffect(() => {
    if (featured.length <= 1 || reduceMotion) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % featured.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [featured.length, reduceMotion]);

  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  const promoCards = useMemo(() => {
    if (featured.length <= 1) return [];
    return Array.from(
      { length: Math.min(3, featured.length - 1) },
      (_, offset) => featured[(current + offset + 1) % featured.length],
    );
  }, [featured, current]);

  const film = featured[current];
  if (!film) return null;

  const ratingVal =
    film.tmdb?.vote_average || film.vote_average || film.rating || 8.3;

  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden bg-[#08090c] transform-gpu contain-paint">
      {/* Keep the player mounted at the top of the Hero instead of after its body content. */}
      <TrailerModal
        film={trailerModalFilm}
        isOpen={!!trailerModalFilm}
        onClose={() => setTrailerModalFilm(null)}
        presentation="hero"
      />

      {/* Direct CDN Preloaded Backdrop Layers (60 FPS Smooth GPU Opacity Crossfade) */}
      <div className="absolute inset-0 w-full h-full">
        {featured.map((item, idx) => {
          const bgUrl =
            (item as any).heroBackdrop ||
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bgUrl}
                alt={item.name}
                loading={isActive ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={isActive ? "high" : "low"}
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

      {/* Three artwork-only cards create a compact cinematic reel with hover info & click interaction. */}
      <div className="absolute left-6 top-1/2 z-30 hidden w-[280px] -translate-y-1/2 xl:block 2xl:left-14">
        <div className="relative h-[380px]">
          {promoCards.map((promo, index) => {
            const poster =
              resolveDirectImageUrl(promo.poster_url) ||
              resolveDirectImageUrl(promo.thumb_url);
            const isHovered = hoveredCardIndex === index;

            const baseTransforms = [
              { x: 0, y: 0, rotate: -6, scale: 1 },
              { x: 42, y: 36, rotate: 3, scale: 0.94 },
              { x: 82, y: 72, rotate: 11, scale: 0.88 },
            ];
            const baseTransform = baseTransforms[index] || baseTransforms[0];

            return (
              <div key={`${promo.slug}-${index}`}>
                <motion.article
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{
                    opacity: isHovered ? 1 : 1 - index * 0.15,
                    x: isHovered ? baseTransform.x + 8 : baseTransform.x,
                    y: isHovered ? baseTransform.y - 10 : baseTransform.y,
                    rotate: isHovered ? 0 : baseTransform.rotate,
                    scale: isHovered ? 1.08 : baseTransform.scale,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 20,
                  }}
                  onMouseEnter={() => setHoveredCardIndex(index)}
                  onMouseLeave={() => setHoveredCardIndex(null)}
                  onClick={() => {
                    const targetIndex = featured.findIndex(
                      (f) => f.slug === promo.slug,
                    );
                    if (targetIndex !== -1) setCurrent(targetIndex);
                  }}
                  className={cn(
                    "absolute left-0 top-0 w-[160px] overflow-hidden rounded-2xl border bg-[#0d1017] shadow-[0_20px_50px_rgba(0,0,0,0.8)] cursor-pointer transition-all duration-300",
                    isHovered
                      ? "border-white/80 ring-2 ring-white/90 shadow-[0_0_35px_rgba(255,255,255,0.4)] z-50"
                      : "border-white/20 z-[3-index]"
                  )}
                  style={{ zIndex: isHovered ? 50 : 3 - index, transformOrigin: "bottom left" }}
                >
                  <div className="aspect-[2/3] overflow-hidden bg-[#131822] relative group">
                    {poster ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={poster}
                        alt={promo.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          if (
                            promo.thumb_url &&
                            e.currentTarget.src !== promo.thumb_url
                          ) {
                            e.currentTarget.src = promo.thumb_url;
                          }
                        }}
                      />
                    ) : null}

                    {/* Scrim overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-2.5 text-left">
                      <p className="text-[11px] font-extrabold text-white leading-tight line-clamp-1">
                        {promo.origin_name || promo.name}
                      </p>
                      {promo.year && (
                        <p className="text-[9px] font-mono text-neutral-400 font-bold mt-0.5">
                          {promo.year} • ★ {promo.vote_average || 8.5}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.article>

                {/* Floating Hover Card Info Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: -10, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-[175px] z-[60] w-[240px] p-4 rounded-2xl bg-[#0b0e17]/95 border border-white/20 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] pointer-events-none space-y-2 text-left"
                      style={{ top: `${baseTransform.y - 10}px` }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
                          ★ {promo.vote_average || 8.5}
                        </span>
                        {promo.year && (
                          <span className="text-[10px] font-mono text-neutral-400 font-bold">
                            {promo.year}
                          </span>
                        )}
                        <span className="ml-auto text-[9px] font-mono font-bold text-rose-400 uppercase">
                          Bấm để xem ▶
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-white leading-snug line-clamp-1">
                        {promo.name}
                      </h4>
                      {promo.origin_name && (
                        <p className="text-[10px] text-neutral-400 font-mono line-clamp-1">
                          {promo.origin_name}
                        </p>
                      )}

                      <p className="text-[11px] text-neutral-300 leading-relaxed line-clamp-2 pt-0.5">
                        {promo.content || "Chuyển sang xem trailer & thông tin bộ phim bom tấn này."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cinema-first content stays clear of the visual reel on wide screens. */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-end px-4 pb-16 text-center sm:pb-18 md:pb-20">
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
                href={getWatchHref(film)}
                className="flex items-center gap-2 bg-white hover:bg-neutral-200 text-black px-7 py-3 rounded-full text-xs font-black tracking-wide uppercase transition-all duration-200 shadow-2xl hover:scale-105 active:scale-95"
              >
                <Play size={15} className="fill-black" />
                <span>Xem ngay</span>
              </Link>

              <button
                type="button"
                onClick={() => setTrailerModalFilm(film)}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-[#181c24]/80 px-5 py-3 text-xs font-bold text-neutral-200 shadow-xl transition-all duration-200 hover:scale-105 hover:bg-white/20 hover:text-white active:scale-95"
              >
                <Film size={14} className="text-neutral-300" />
                <span>Trailer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const movieData = {
                    title: film.name,
                    titleEn: film.origin_name,
                    posterUrl: film.poster_url,
                    thumbUrl: film.thumb_url,
                    type: film.type,
                    year: film.year,
                  };
                  if (!user) {
                    guestDataStorage.addWatchlist(film.slug, movieData);
                    toast("Đã lưu vào Xem sau trên thiết bị", "success");
                    return;
                  }
                  watchlistApi
                    .add(film.slug, movieData)
                    .then(() =>
                      toast(`Đã thêm "${film.name}" vào tủ phim`, "success"),
                    )
                    .catch(() => {
                      guestDataStorage.addWatchlist(film.slug, movieData);
                      toast(
                        "Đã lưu cục bộ, sẽ đồng bộ lại khi kết nối ổn định",
                        "info",
                      );
                    });
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

      {/* 🐭 Static Mouse Scroll Indicator (Independent of title transitions) */}
      <div
        onClick={() => {
          if (typeof window !== "undefined") {
            window.scrollTo({
              top: window.innerHeight - 70,
              behavior: "smooth",
            });
          }
        }}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer select-none group"
        title="Cuộn xuống"
      >
        <div className="w-5 h-8 rounded-full border border-white/40 group-hover:border-white flex items-start justify-center p-1 backdrop-blur-xs transition-colors">
          <motion.div
            animate={{ y: [0, 8, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="w-1 h-1.5 rounded-full bg-white"
          />
        </div>
        <ChevronDown size={12} className="text-white/60 group-hover:text-white transition-colors -mt-0.5 animate-bounce" />
      </div>

      {/* Compact Minimalist 16:9 Widescreen Movie Card Bar (Direct TMDB Images, Sleek White Border) */}
      <div className="absolute right-4 sm:right-8 md:right-12 bottom-6 z-30 flex items-center gap-2 overflow-x-auto max-w-[calc(100vw-2rem)] p-1 scrollbar-none">
        {featured.slice(0, 6).map((item, i) => {
          const cardImg =
            item.thumb_url ||
            item.poster_url ||
            (item as any).heroBackdrop ||
            "";
          const isActive = i === current;

          return (
            <button
              key={item.slug || i}
              onClick={() => setCurrent(i)}
              type="button"
              title={item.origin_name || item.name}
              className={cn(
                "relative w-20 sm:w-24 aspect-[16/9] rounded-lg overflow-hidden cursor-pointer flex-shrink-0 group transition-all duration-300 shadow-xl border text-left",
                isActive
                  ? "border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.35)] z-10 opacity-100 ring-1 ring-white/40"
                  : "border-white/20 opacity-50 hover:opacity-90 hover:border-white/60 hover:scale-105",
              )}
            >
              {cardImg ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={cardImg}
                  alt={item.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  loading="eager"
                  decoding="async"
                  onError={(e) => {
                    if (
                      item.poster_url &&
                      e.currentTarget.src !== item.poster_url
                    ) {
                      e.currentTarget.src = item.poster_url;
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-[9px] text-neutral-400 font-bold px-1 text-center truncate">
                  {item.name}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
