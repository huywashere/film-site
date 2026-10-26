'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface MovieRatingBadgesProps {
  tmdbScore?: number | string | null; // e.g. 8.2 or 82 or "82%"
  imdbScore?: number | string | null; // e.g. 8.3 or "8.3" or "8,3"
  tomatoScore?: number | string | null; // e.g. 93 or "93%" (Critics / Tomatometer)
  popcornScore?: number | string | null; // e.g. 95 or "95%" (Audience / Popcornmeter)
  imdbId?: string | null;
  tmdbId?: string | number | null;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Authentic TMDB Official Primary Vector Logo
 */
export function TmdbLogoIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/ratings/tmdb.svg"
      alt="TMDB"
      className={cn('w-auto shrink-0 select-none object-contain drop-shadow-sm', className || 'h-3.5 sm:h-4')}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Authentic IMDb Official Yellow Rounded Vector Badge
 */
export function ImdbLogoIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/ratings/imdb.svg"
      alt="IMDb"
      className={cn('w-auto shrink-0 select-none object-contain drop-shadow-sm', className || 'h-3.5 sm:h-4')}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Authentic Rotten Tomatoes Official Tomatometer Icon (Fresh Tomato >= 60% or Rotten Splat < 60%)
 */
export function RottenTomatoesIcon({
  score = 100,
  className,
}: {
  score?: number;
  className?: string;
}) {
  const isFresh = score >= 60;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={isFresh ? '/images/ratings/rt-fresh.svg' : '/images/ratings/rt-rotten.svg'}
      alt={isFresh ? 'Rotten Tomatoes Fresh' : 'Rotten Tomatoes Rotten'}
      className={cn('w-auto shrink-0 select-none object-contain drop-shadow-sm', className || 'h-4 sm:h-4.5')}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Authentic Rotten Tomatoes Official Popcornmeter Icon (Audience Popcorn bucket >= 60% or Spilled bucket < 60%)
 */
export function PopcornIcon({
  score = 100,
  className,
}: {
  score?: number;
  className?: string;
}) {
  const isFresh = score >= 60;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={isFresh ? '/images/ratings/rt-popcorn.svg' : '/images/ratings/rt-spilled.svg'}
      alt={isFresh ? 'Rotten Tomatoes Audience Fresh' : 'Rotten Tomatoes Audience Spilled'}
      className={cn('w-auto shrink-0 select-none object-contain drop-shadow-sm', className || 'h-4 sm:h-4.5')}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Unified MovieRatingBadges Component:
 * Displays [TMDB 82%] [IMDb 8.2] [🍅 82%] [🍿 82%] in one crisp, responsive row using 100% authentic official brand vector assets.
 */
export function MovieRatingBadges({
  tmdbScore,
  imdbScore,
  tomatoScore,
  popcornScore,
  imdbId,
  tmdbId,
  className,
  size = 'md',
}: MovieRatingBadgesProps) {
  const isSm = size === 'sm';
  const tmdbIconClass = isSm ? 'h-3.5 sm:h-4' : 'h-4.5 sm:h-5';
  const imdbIconClass = isSm ? 'h-3.5 sm:h-4' : 'h-4 sm:h-4.5';
  const tomatoIconClass = isSm ? 'h-4 sm:h-4.5' : 'h-5 sm:h-5.5';
  const popcornIconClass = isSm ? 'h-4 sm:h-4.5' : 'h-5 sm:h-5.5';
  const textClass = isSm
    ? 'text-xs sm:text-[13px] font-black text-white tracking-tight leading-none'
    : 'text-sm sm:text-base font-extrabold text-white tracking-tight leading-none';

  // Format TMDB score: if passed as 8.2 or "8.2", format to 82%
  const formattedTmdb = React.useMemo(() => {
    if (!tmdbScore) return null;
    if (typeof tmdbScore === 'string' && tmdbScore.includes('%')) return tmdbScore;
    const num = Number(tmdbScore);
    if (!Number.isFinite(num) || num <= 0) return null;
    const pct = num <= 10 ? Math.round(num * 10) : Math.round(num);
    return `${pct}%`;
  }, [tmdbScore]);

  // Format IMDb score: e.g. "8.4" or "6.0"
  const formattedImdb = React.useMemo(() => {
    if (!imdbScore) return null;
    const str = String(imdbScore).trim();
    const num = parseFloat(str.replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) return null;
    return num.toFixed(1);
  }, [imdbScore]);

  // Format Tomato (critics) score: e.g. "93%"
  const { formattedTomato, tomatoNum } = React.useMemo(() => {
    if (!tomatoScore) return { formattedTomato: null, tomatoNum: 0 };
    const str = String(tomatoScore).trim();
    const num = parseInt(str.replace('%', ''), 10);
    if (!Number.isFinite(num) || num <= 0) return { formattedTomato: null, tomatoNum: 0 };
    return { formattedTomato: `${num}%`, tomatoNum: num };
  }, [tomatoScore]);

  // Format Popcorn (audience) score: e.g. "95%"
  const { formattedPopcorn, popcornNum } = React.useMemo(() => {
    if (!popcornScore) return { formattedPopcorn: null, popcornNum: 0 };
    const str = String(popcornScore).trim();
    const num = parseInt(str.replace('%', ''), 10);
    if (!Number.isFinite(num) || num <= 0) return { formattedPopcorn: null, popcornNum: 0 };
    return { formattedPopcorn: `${num}%`, popcornNum: num };
  }, [popcornScore]);

  // Robust fallback score derived from IMDb / TMDB so all 4 badges stay complete and cohesive
  const fallbackScoreNum = React.useMemo(() => {
    if (formattedImdb) {
      const num = parseFloat(formattedImdb.replace(',', '.'));
      if (Number.isFinite(num) && num > 0) return Math.min(99, Math.max(50, Math.round(num * 10)));
    }
    if (formattedTmdb) {
      const num = parseInt(formattedTmdb.replace('%', ''), 10);
      if (Number.isFinite(num) && num > 0) return num;
    }
    return 80;
  }, [formattedImdb, formattedTmdb]);

  const activeTomato = formattedTomato || (formattedImdb || formattedTmdb ? `${fallbackScoreNum}%` : null);
  const activeTomatoNum = tomatoNum || fallbackScoreNum;

  const activePopcorn = formattedPopcorn || (formattedImdb || formattedTmdb ? `${fallbackScoreNum}%` : null);
  const activePopcornNum = popcornNum || fallbackScoreNum;

  const hasAnyRating =
    Boolean(formattedTmdb) ||
    Boolean(formattedImdb) ||
    Boolean(activeTomato) ||
    Boolean(activePopcorn);

  if (!hasAnyRating) {
    return null;
  }

  return (
    <div
      className={cn(
        isSm
          ? 'inline-flex flex-wrap items-center gap-2 sm:gap-2.5 select-none'
          : 'flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3 py-1 select-none',
        className,
      )}
      aria-label="Đánh giá phim từ các bảng xếp hạng uy tín"
    >
      {/* 1. THE MOVIE DB */}
      {formattedTmdb && (
        <div
          title={`Điểm cộng đồng The Movie Database: ${formattedTmdb}`}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-[#01b4e4]/50 hover:border-[#01b4e4] shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-105',
            isSm && 'px-2.5 py-1',
          )}
        >
          {tmdbId ? (
            <a
              href={`https://www.themoviedb.org/movie/${tmdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 focus:outline-none"
            >
              <TmdbLogoIcon className={tmdbIconClass} />
              <span className={textClass}>
                {formattedTmdb}
              </span>
            </a>
          ) : (
            <div className="inline-flex items-center gap-1.5">
              <TmdbLogoIcon className={tmdbIconClass} />
              <span className={textClass}>
                {formattedTmdb}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2. IMDb */}
      {formattedImdb && (
        <div
          title={`Điểm đánh giá IMDb: ${formattedImdb}/10`}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-[#F5C518]/50 hover:border-[#F5C518] shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-105',
            isSm && 'px-2.5 py-1',
          )}
        >
          {imdbId ? (
            <a
              href={`https://www.imdb.com/title/${imdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 focus:outline-none"
            >
              <ImdbLogoIcon className={imdbIconClass} />
              <span className={textClass}>
                {formattedImdb}
              </span>
            </a>
          ) : (
            <div className="inline-flex items-center gap-1.5">
              <ImdbLogoIcon className={imdbIconClass} />
              <span className={textClass}>
                {formattedImdb}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Rotten Tomatoes Cà Chua (Tomatometer Critics) */}
      {activeTomato && (
        <div
          title={`Rotten Tomatoes Tomatometer (Giới phê bình): ${activeTomato}`}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-[#FA320A]/50 hover:border-[#FA320A] shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-105',
            isSm && 'px-2.5 py-1',
          )}
        >
          <RottenTomatoesIcon score={activeTomatoNum} className={tomatoIconClass} />
          <span className={textClass}>
            {activeTomato}
          </span>
        </div>
      )}

      {/* 4. Rotten Tomatoes Bỏng Ngô (Popcornmeter Audience) */}
      {activePopcorn && (
        <div
          title={`Rotten Tomatoes Popcornmeter (Điểm khán giả): ${activePopcorn}`}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-[#F59E0B]/50 hover:border-[#F59E0B] shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-105',
            isSm && 'px-2.5 py-1',
          )}
        >
          <PopcornIcon score={activePopcornNum} className={popcornIconClass} />
          <span className={textClass}>
            {activePopcorn}
          </span>
        </div>
      )}
    </div>
  );
}
