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
 * Authentic TMDB Pill Logo SVG (Teal & Mint pills with official typography)
 */
export function TmdbLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 56 24"
      className={cn('w-auto shrink-0 select-none drop-shadow-sm', className || 'h-5 sm:h-6')}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="The Movie Database"
    >
      {/* Top right pill */}
      <rect x="32" y="3" width="18" height="6.5" rx="3.25" fill="#01b4e4" />
      {/* Bottom left pill */}
      <rect x="4" y="14.5" width="18" height="6.5" rx="3.25" fill="#90cea1" />
      {/* Text "THE" */}
      <text
        x="6"
        y="8.5"
        fill="#01b4e4"
        fontSize="6.8"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0.4"
      >
        THE
      </text>
      {/* Text "MOVIE" */}
      <text
        x="5.5"
        y="14.5"
        fill="#01b4e4"
        fontSize="6.2"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0.6"
      >
        MOVIE
      </text>
      {/* Text "DB" */}
      <text
        x="29"
        y="20.5"
        fill="#90cea1"
        fontSize="7.2"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0.4"
      >
        DB
      </text>
    </svg>
  );
}

/**
 * Authentic IMDb Yellow Rounded Square Logo SVG
 */
export function ImdbLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 46 24"
      className={cn('w-auto shrink-0 select-none rounded shadow-sm', className || 'h-5 sm:h-6')}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="IMDb"
    >
      <rect width="46" height="24" rx="4" fill="#F5C518" />
      <path
        fill="#000000"
        d="M6 5.5h3.6v13H6v-13zm5.8 0h3.8l1.9 7.3 1.9-7.3h3.8v13h-3.2v-7.2l-1.7 6.8h-1.6l-1.7-6.8v7.2h-3.1v-13zm15.8 0h4.3c2.7 0 4.3 1.9 4.3 5v3c0 3.1-1.6 5-4.3 5h-4.3v-13zm3.4 9.8h.9c.9 0 1.3-.6 1.3-1.7V8.9c0-1.1-.4-1.7-1.3-1.7h-.9v8.1zm7.3-9.8h3.2v4.5c.6-1 1.6-1.3 2.6-1.3 2 0 3.3 1.8 3.3 4.5v.7c0 2.8-1.4 4.6-3.3 4.6-1 0-1.9-.5-2.6-1.3v1.2h-3.2v-12.9zm3.2 7.7c0 1.2.5 1.9 1.4 1.9.9 0 1.4-.7 1.4-1.9v-.7c0-1.2-.5-1.9-1.4-1.9-.9 0-1.4.7-1.4 1.9v.7z"
      />
    </svg>
  );
}

/**
 * Rotten Tomatoes Tomatometer Icon (Fresh Tomato >= 60% or Rotten Splat < 60%)
 */
export function RottenTomatoesIcon({
  score = 100,
  className,
}: {
  score?: number;
  className?: string;
}) {
  const isFresh = score >= 60;

  if (isFresh) {
    return (
      <svg
        viewBox="0 0 32 32"
        className={cn('w-auto shrink-0 select-none drop-shadow-sm', className || 'h-5 sm:h-6')}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Rotten Tomatoes Fresh"
      >
        <defs>
          <radialGradient id="tomato-body-grad" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#FF4A2A" />
            <stop offset="55%" stopColor="#FA320A" />
            <stop offset="100%" stopColor="#A81600" />
          </radialGradient>
          <linearGradient id="tomato-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
        </defs>
        {/* Tomato round body */}
        <path
          d="M16 8.5C10.5 8.5 5.5 12.5 5.5 19C5.5 25.5 10.5 29.5 16 29.5C21.5 29.5 26.5 25.5 26.5 19C26.5 12.5 21.5 8.5 16 8.5Z"
          fill="url(#tomato-body-grad)"
        />
        {/* Gloss highlight */}
        <path
          d="M10.5 13.5C9 15.5 9 18.5 9.5 20.5"
          stroke="#FFE4DE"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.65"
        />
        {/* Leaves / stem on top */}
        <path
          d="M16 9C15.5 5.5 17 3.5 19 2.5M16 9L11.5 5M16 9L12.5 10.8M16 9L19.5 5.5M16 9L20.5 10.5M16 9L16 11.5"
          stroke="url(#tomato-leaf-grad)"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Rotten Splat (< 60%)
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('h-5 sm:h-6 w-auto shrink-0 select-none drop-shadow-sm', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Rotten Tomatoes Rotten"
    >
      <path
        d="M15 5C10 6 7 10 5.5 14.5C4 19 6.5 23 10 26C14 29 20 28.5 24 25.5C27.5 22.5 28 17 26 13C24 9 19 4 15 5Z"
        fill="#578E2C"
      />
      <circle cx="15.5" cy="16.5" r="3.2" fill="#3B631C" />
    </svg>
  );
}

/**
 * Rotten Tomatoes Popcorn Icon (Popcorn bucket >= 60% or Spilled bucket < 60%)
 */
export function PopcornIcon({
  score = 100,
  className,
}: {
  score?: number;
  className?: string;
}) {
  const isFresh = score >= 60;

  if (isFresh) {
    return (
      <svg
        viewBox="0 0 32 32"
        className={cn('w-auto shrink-0 select-none drop-shadow-sm', className || 'h-5 sm:h-6')}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Rotten Tomatoes Popcorn Audience"
      >
        <defs>
          <linearGradient id="popcorn-gold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="60%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>
        </defs>
        {/* Popped golden corn cluster on top */}
        <path
          d="M8.5 12C6.5 12 5.5 10 6.5 8.5C7.5 7 9.5 7.5 10.5 6.5C11.5 5 13.5 4.5 15 5.5C16.5 4 19 4 20 5.5C21.5 4.5 23.5 5.5 23.5 7C24.5 7 26.5 8 26 10C25.5 12 23.5 12 23.5 12Z"
          fill="url(#popcorn-gold)"
        />
        <circle cx="11.5" cy="9" r="2.2" fill="#FEF08A" />
        <circle cx="16" cy="7.5" r="2.5" fill="#FEF08A" />
        <circle cx="20.5" cy="9" r="2.2" fill="#FEF08A" />
        <circle cx="14" cy="10.5" r="1.6" fill="#CA8A04" opacity="0.6" />
        <circle cx="18" cy="10.5" r="1.6" fill="#CA8A04" opacity="0.6" />

        {/* Popcorn white bucket */}
        <path d="M8 12.5L10 28H22L24 12.5H8Z" fill="#FFFFFF" />

        {/* Classic red stripes */}
        <path d="M10.8 12.5L12.3 28H14.1L12.9 12.5H10.8Z" fill="#DC2626" />
        <path d="M15.1 12.5L15.6 28H16.4L16.9 12.5H15.1Z" fill="#DC2626" />
        <path d="M19.1 12.5L17.9 28H19.7L21.2 12.5H19.1Z" fill="#DC2626" />

        {/* Bucket top red rim */}
        <rect x="7.5" y="11.5" width="17" height="2" rx="1" fill="#DC2626" />
        {/* Bucket bottom edge */}
        <line x1="10" y1="28" x2="22" y2="28" stroke="#DC2626" strokeWidth="0.8" />
      </svg>
    );
  }

  // Tipped / Spilled bucket (< 60%)
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('w-auto shrink-0 select-none drop-shadow-sm', className || 'h-5 sm:h-6')}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Rotten Tomatoes Audience Spilled Popcorn"
    >
      <path d="M12 9L27 18L22 27L7 18L12 9Z" fill="#FFFFFF" opacity="0.85" />
      <path d="M15 11L24 22" stroke="#DC2626" strokeWidth="2.2" />
      <circle cx="6" cy="22" r="2.2" fill="#EAB308" />
      <circle cx="4" cy="25" r="1.8" fill="#FDE047" />
      <circle cx="8" cy="26" r="2" fill="#EAB308" />
      <circle cx="11" cy="27" r="1.6" fill="#FDE047" />
    </svg>
  );
}

/**
 * Unified MovieRatingBadges Component:
 * Displays [TMDB 82%] [IMDb 8,3] [🍅 93%] [🍿 95%] in one crisp, responsive row.
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
  const iconClass = isSm ? 'h-3.5 sm:h-4' : 'h-5 sm:h-6';
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

  // Format IMDb score: e.g. "8,3" (or "8.3")
  const formattedImdb = React.useMemo(() => {
    if (!imdbScore) return null;
    const str = String(imdbScore).trim();
    const num = parseFloat(str.replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) return null;
    return num.toFixed(1).replace('.', ',');
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

  const hasAnyRating =
    Boolean(formattedTmdb) ||
    Boolean(formattedImdb) ||
    Boolean(formattedTomato) ||
    Boolean(formattedPopcorn);

  if (!hasAnyRating) {
    return null;
  }

  return (
    <div
      className={cn(
        isSm
          ? 'inline-flex flex-wrap items-center gap-x-3.5 sm:gap-x-4 gap-y-1.5 select-none'
          : 'flex flex-wrap items-center justify-center sm:justify-start gap-x-5 sm:gap-x-6 gap-y-2 py-1 select-none',
        className,
      )}
      aria-label="Đánh giá phim từ các bảng xếp hạng uy tín"
    >
      {/* 1. THE MOVIE DB */}
      {formattedTmdb && (
        <div
          title={`Điểm cộng đồng The Movie Database: ${formattedTmdb}`}
          className="inline-flex items-center gap-1.5 transition-transform duration-150 hover:scale-105"
        >
          {tmdbId ? (
            <a
              href={`https://www.themoviedb.org/movie/${tmdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 focus:outline-none"
            >
              <TmdbLogoIcon className={iconClass} />
              <span className={textClass}>
                {formattedTmdb}
              </span>
            </a>
          ) : (
            <>
              <TmdbLogoIcon className={iconClass} />
              <span className={textClass}>
                {formattedTmdb}
              </span>
            </>
          )}
        </div>
      )}

      {/* 2. IMDb */}
      {formattedImdb && (
        <div
          title={`Điểm đánh giá IMDb: ${formattedImdb}/10`}
          className="inline-flex items-center gap-1.5 transition-transform duration-150 hover:scale-105"
        >
          {imdbId ? (
            <a
              href={`https://www.imdb.com/title/${imdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 focus:outline-none"
            >
              <ImdbLogoIcon className={iconClass} />
              <span className={textClass}>
                {formattedImdb}
              </span>
            </a>
          ) : (
            <>
              <ImdbLogoIcon className={iconClass} />
              <span className={textClass}>
                {formattedImdb}
              </span>
            </>
          )}
        </div>
      )}

      {/* 3. Rotten Tomatoes Cà Chua (Tomatometer Critics) */}
      {formattedTomato && (
        <div
          title={`Rotten Tomatoes Tomatometer (Giới phê bình): ${formattedTomato}`}
          className="inline-flex items-center gap-1.5 transition-transform duration-150 hover:scale-105"
        >
          <RottenTomatoesIcon score={tomatoNum} className={iconClass} />
          <span className={textClass}>
            {formattedTomato}
          </span>
        </div>
      )}

      {/* 4. Rotten Tomatoes Bỏng Ngô (Popcornmeter Audience) */}
      {formattedPopcorn && (
        <div
          title={`Rotten Tomatoes Popcornmeter (Điểm khán giả): ${formattedPopcorn}`}
          className="inline-flex items-center gap-1.5 transition-transform duration-150 hover:scale-105"
        >
          <PopcornIcon score={popcornNum} className={iconClass} />
          <span className={textClass}>
            {formattedPopcorn}
          </span>
        </div>
      )}
    </div>
  );
}
