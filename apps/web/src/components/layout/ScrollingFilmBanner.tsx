'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Flame, Sparkles, Play, Pause, Clapperboard } from 'lucide-react';
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

  // Use fetched movies or fallback to ensure banner always shows!
  const movies = fetchedMovies.length > 0 ? fetchedMovies.slice(0, 16) : FALLBACK_MOVIES;

  // Duplicate list to achieve infinite seamless marquee loop
  const loopMovies = [...movies, ...movies, ...movies];

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-[#04060d] via-[#0b0f1e] to-[#04060d] border-b border-white/10 py-3 group/banner">
      {/* Header bar */}
      <div className="max-w-7xl mx-auto px-6 mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-widest text-amber-400 shadow-sm shadow-amber-500/10">
            <Flame size={12} className="text-orange-400 animate-pulse" />
            PHIM MỚI & BOM TẤN HOT
          </span>
          <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-white/20" />
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-neutral-400 font-medium">
            <Sparkles size={12} className="text-indigo-400" />
            Cập nhật liên tục 24/7
          </span>
        </div>

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
          title={isPaused ? 'Tiếp tục chạy' : 'Tạm dừng chạy'}
        >
          {isPaused ? (
            <>
              <Play size={11} className="fill-current text-emerald-400" />
              <span>Phát</span>
            </>
          ) : (
            <>
              <Pause size={11} className="fill-current text-amber-400" />
              <span>Tạm dừng</span>
            </>
          )}
        </button>
      </div>

      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#04060d] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#04060d] to-transparent z-10" />

      {/* Marquee Track (Left to Right animation) */}
      <div className="overflow-hidden w-full flex">
        <div
          className={`flex gap-4 shrink-0 transition-transform ${
            isPaused ? '[animation-play-state:paused]' : ''
          }`}
          style={{
            animation: 'marquee-rtl 80s linear infinite',
          }}
        >
          {loopMovies.map((movie, idx) => {
            const poster = resolveImageUrl(movie.thumb_url) || resolveImageUrl(movie.poster_url);
            const isHot = idx % 3 === 0;

            return (
              <Link
                key={`${movie.slug}-${idx}`}
                href={`/film/${movie.slug}`}
                className="group/item flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-[#524cf8]/15 border border-white/[0.06] hover:border-[#524cf8]/40 transition-all duration-200 shrink-0 hover:scale-105 shadow-md shadow-black/40"
              >
                {/* Poster image */}
                <div className="relative w-9 h-12 rounded-lg bg-neutral-900 overflow-hidden shrink-0 border border-white/10 group-hover/item:border-[#524cf8]/50 shadow-inner">
                  {poster ? (
                    <img
                      src={poster}
                      alt={movie.name}
                      className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      <Clapperboard size={14} />
                    </div>
                  )}
                </div>

                {/* Info text */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    {isHot && (
                      <span className="bg-red-500/20 text-red-400 text-[9px] font-black px-1.5 py-0.2 rounded border border-red-500/30 uppercase tracking-tighter">
                        BOM TẤN
                      </span>
                    )}
                    <span className="text-xs font-bold text-neutral-200 group-hover/item:text-white transition-colors line-clamp-1 max-w-[180px]">
                      {movie.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-medium">
                    {movie.year && (
                      <span className="text-neutral-400 font-semibold">{movie.year}</span>
                    )}
                    {movie.origin_name && (
                      <span className="line-clamp-1 max-w-[140px] text-neutral-500">
                        {movie.origin_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Separator dot */}
                <div className="ml-2 w-1.5 h-1.5 rounded-full bg-white/10 group-hover/item:bg-[#524cf8]/60 transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Marquee CSS Keyframes */}
      <style jsx global>{`
        @keyframes marquee-rtl {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
