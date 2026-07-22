'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Clapperboard } from 'lucide-react';
import { movieApi } from '@/lib/api';
import { resolveImageUrl, FilmItem } from '@/components/film/FilmCard';

// Fallback items in case API is loading or empty so the marquee ALWAYS renders
const FALLBACK_MOVIES: FilmItem[] = [
  {
    slug: 'giay-phut-ay-vuot-gioi-han',
    name: 'Giây Phút Ấy Vượt Giới Hạn',
    origin_name: 'Overdo',
    year: 2026,
    thumb_url: 'https://img.phimapi.com/upload/vod/20260718-1/3e0f9b32fa9ebce.jpg',
  },
  {
    slug: 'bi-kip-nghich-tap-cua-thieu-hiep',
    name: 'Bí Kíp Nghịch Tập Của Thiếu Hiệp',
    origin_name: 'Young Swordsman',
    year: 2026,
    thumb_url: 'https://img.phimapi.com/upload/vod/20260718-1/9a413d90bd.jpg',
  },
  {
    slug: 'tieu-phuong',
    name: 'Tiểu Phương',
    origin_name: 'Xiao Fang',
    year: 2026,
    thumb_url: 'https://img.phimapi.com/upload/vod/20260718-1/b11d95e.jpg',
  },
  {
    slug: 'vo-nhan-loi-tho',
    name: 'Võ Nhân Lại Thế',
    origin_name: 'Martial Artist Reincarnated',
    year: 2026,
    thumb_url: 'https://img.phimapi.com/upload/vod/20260718-1/cd38f1.jpg',
  },
  {
    slug: 'cuoc-chien-sinh-ton',
    name: 'Cuộc Chiến Sinh Tồn',
    origin_name: 'Survival Game',
    year: 2025,
    thumb_url: 'https://img.phimapi.com/upload/vod/20260718-1/ef9912.jpg',
  },
];

export function ScrollingFilmBanner() {
  const [isPaused, setIsPaused] = useState(false);

  // Fetch latest movies
  const { data: latestRes } = useQuery({
    queryKey: ['footer-latest-movies'],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
    staleTime: 1000 * 60 * 30,
  });

  // Fetch single movies for blockbuster variety
  const { data: singleRes } = useQuery({
    queryKey: ['footer-single-movies'],
    queryFn: () => movieApi.getSingle(1).then((r) => r.data),
    staleTime: 1000 * 60 * 30,
  });

  const latestItems: FilmItem[] = latestRes?.items || latestRes?.data?.items || [];
  const singleItems: FilmItem[] = singleRes?.data?.items || singleRes?.items || [];

  // Combine and deduplicate
  const combined = [...latestItems, ...singleItems];
  const fetchedMovies = Array.from(new Map(combined.map((m) => [m.slug, m])).values());

  // Use fetched movies or fallback
  const movies = fetchedMovies.length > 0 ? fetchedMovies.slice(0, 16) : FALLBACK_MOVIES;

  // Duplicate list to achieve infinite seamless marquee loop
  const loopMovies = [...movies, ...movies, ...movies];

  return (
    <div className="relative w-full overflow-hidden bg-[#14181c] py-3 select-none group/banner">
      {/* Soft fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#14181c] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#14181c] to-transparent z-10" />

      {/* Marquee Track (Ultra-slow, smooth 380s continuous loop) */}
      <div className="overflow-hidden w-full flex">
        <div
          className={`flex gap-3 shrink-0 transition-transform ${
            isPaused ? '[animation-play-state:paused]' : ''
          }`}
          style={{
            animation: 'marquee-rtl 380s linear infinite',
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {loopMovies.map((movie, idx) => {
            const poster = resolveImageUrl(movie.thumb_url) || resolveImageUrl(movie.poster_url);

            return (
              <Link
                key={`${movie.slug}-${idx}`}
                href={`/film/${movie.slug}`}
                className="group/item flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#1c2228]/90 hover:bg-[#242c34] border border-white/5 hover:border-white/20 transition-all duration-200 shrink-0"
              >
                {/* Poster image */}
                <div className="relative w-8 h-11 rounded-lg bg-neutral-900 overflow-hidden shrink-0 border border-white/10">
                  {poster ? (
                    <img
                      src={poster}
                      alt={movie.name}
                      className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      <Clapperboard size={12} />
                    </div>
                  )}
                </div>

                {/* Info text */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-neutral-200 group-hover/item:text-white transition-colors line-clamp-1 max-w-[170px]">
                    {movie.name}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-medium">
                    {movie.year && (
                      <span className="text-neutral-400 font-semibold">{movie.year}</span>
                    )}
                    {movie.origin_name && (
                      <span className="line-clamp-1 max-w-[130px] text-neutral-500">
                        {movie.origin_name}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
