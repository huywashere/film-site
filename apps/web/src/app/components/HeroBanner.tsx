"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Play, Plus, Star, Film } from "lucide-react";
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
  { code: "KR", region: "KR", language: "ko" },
  { code: "CN", region: "CN", language: "zh" },
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
  const resolved = url.trim();
  if (!resolved) return null;
  if (resolved.startsWith("//")) return `https:${resolved}`;
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    return resolved;
  }
  if (resolved.startsWith("/")) return resolved;
  const cleanPath = resolved.startsWith("/") ? resolved.slice(1) : resolved;
  return `https://img.phimapi.com/${cleanPath}`;
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
    const seenSlugs = new Set<string>();
    const seenThumbs = new Set<string>();
    const seenBaseNames = new Set<string>();
    const result: HeroFilm[] = [];

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

  const featured = tmdbFeatured || fallbackFeatured;

  useEffect(() => {
    let active = true;

    try {
      const cached = sessionStorage.getItem(HERO_SESSION_KEY);
      if (cached) {
        const parsed: unknown = JSON.parse(cached);
        if (isStoredHeroPlaylist(parsed)) {
          setTmdbFeatured(parsed);
          return () => {
            active = false;
          };
        }
      }
    } catch {
      // A malformed session cache should never prevent the fallback banner.
    }

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
      try {
        sessionStorage.setItem(HERO_SESSION_KEY, JSON.stringify(playlist));
      } catch {
        // Private browsing can reject session storage; in-memory data is enough.
      }
    };

    void loadPlaylist();
    return () => {
      active = false;
    };
  }, []);

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

  const film = featured[current];
  if (!film) return null;

  const promoCards = Array.from(
    { length: Math.min(3, featured.length) },
    (_, offset) => featured[(current + offset) % featured.length],
  );

  const ratingVal =
    film.tmdb?.vote_average || film.vote_average || film.rating || 8.3;

  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden bg-[#08090c]">
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
            item.heroBackdrop ||
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

      {/* Three artwork-only cards create a compact cinematic reel. */}
      <div className="absolute left-8 top-1/2 z-20 hidden w-[232px] -translate-y-1/2 xl:block 2xl:left-16">
        <div className="relative h-[350px]">
          {promoCards.map((promo, index) => {
            const poster =
              resolveDirectImageUrl(promo.poster_url) ||
              resolveDirectImageUrl(promo.thumb_url);
            const transforms = [
              { x: 0, y: 0, rotate: -4, scale: 1 },
              { x: 28, y: 32, rotate: 4, scale: 0.92 },
              { x: 55, y: 64, rotate: 9, scale: 0.84 },
            ];
            const transform = transforms[index];

            return (
              <motion.article
                key={`${promo.slug}-${index}`}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{
                  opacity: 1 - index * 0.18,
                  x: transform.x,
                  y: transform.y,
                  rotate: transform.rotate,
                  scale: transform.scale,
                }}
                transition={{
                  type: "spring",
                  stiffness: 130,
                  damping: 22,
                  mass: 0.72,
                  delay: reduceMotion ? 0 : index * 0.05,
                }}
                className="absolute left-0 top-0 w-[174px] overflow-hidden rounded-2xl border border-white/15 bg-[#11161e] shadow-[0_20px_45px_rgba(0,0,0,0.42)]"
                style={{ zIndex: 3 - index, transformOrigin: "bottom left" }}
              >
                <div className="aspect-[2/3] overflow-hidden bg-[#151b24]">
                  {poster ? (
                    <img
                      src={poster}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Cinema-first content stays clear of the visual reel on wide screens. */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-end px-4 pb-20 text-center sm:pb-24 md:pb-28">
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

      {/* Direct controls let people select the next featured film without waiting. */}
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
                setCurrent(i);
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
    </section>
  );
}
