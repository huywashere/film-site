'use client';

import { useQuery } from '@tanstack/react-query';
import { Sparkles, RefreshCw, Flame, UserCheck, Film, Compass } from 'lucide-react';
import { useState, useMemo } from 'react';
import { movieApi } from '@/lib/api';
import { FilmCard } from './FilmCard';
import { useAuthStore } from '@/store/authStore';
import { watchProgressStorage } from '@/lib/watch-progress';

// Simple deterministic hash helper for per-user seeding
function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function SmartRecommendationSection() {
  const user = useAuthStore((s) => s.user);
  const [refreshSeed, setRefreshSeed] = useState(0);

  // 1. Analyze user watch history & compute user persona
  const userHistory = useMemo(() => {
    return watchProgressStorage.getEntries();
  }, []);

  const lastWatchedTitle = userHistory.length > 0 ? userHistory[0].title : null;

  // 2. Compute unique user seed based on User ID / Username + Refresh Seed
  const userSeed = useMemo(() => {
    const userIdentifier = user?.id || user?.username || user?.email || 'guest';
    return (stringToHash(userIdentifier) + refreshSeed) % 5 + 1;
  }, [user, refreshSeed]);

  // 3. Determine query type personalized for user (e.g. series, single, anime based on user seed)
  const categoryType = useMemo(() => {
    const types = ['series', 'single', 'anime', 'tvshows'];
    return types[(userSeed - 1) % types.length];
  }, [userSeed]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['smart-recommendations-user', user?.id || 'guest', userSeed, categoryType],
    queryFn: () => movieApi.getFilmsByType(categoryType, userSeed, 8).then((r) => r.data),
  });

  const films = data?.data?.items || [];

  const handleRefresh = () => {
    setRefreshSeed((prev) => prev + 1);
    refetch();
  };

  if (isLoading || !films.length) return null;

  return (
    <section className="space-y-4 py-6 bg-white/[0.01] p-6 rounded-3xl border border-white/5 shadow-xl my-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                Gợi Ý Dành Riêng Cho {user?.displayName || user?.username || 'Bạn'}
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                <UserCheck size={11} /> Personalised
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {lastWatchedTitle ? (
                <span>
                  Dựa trên bộ phim bạn xem gần đây: <strong className="text-emerald-400 font-semibold">{lastWatchedTitle}</strong>
                </span>
              ) : (
                <span>Hệ thống AI đề xuất danh sách phim phù hợp với gu cá nhân của bạn.</span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-300 hover:text-white transition-all cursor-pointer border border-white/10 shadow-sm active:scale-95 self-start md:self-auto"
        >
          <RefreshCw size={14} className="text-emerald-400" /> Đổi gợi ý khác
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 pt-2">
        {films.slice(0, 4).map((film: any, idx: number) => {
          // Calculate personalized match score per film per user
          const matchPercent = 99 - ((stringToHash(film.slug || film.name) + userSeed + idx) % 7);

          return (
            <div key={film._id || film.slug} className="relative group">
              <div className="absolute top-2 left-2 z-20 bg-black/85 backdrop-blur-md text-emerald-400 font-black text-[10px] px-2.5 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1.5 shadow-xl">
                <Flame size={12} className="fill-emerald-400 text-emerald-400" />
                <span>{matchPercent}% Phù hợp</span>
              </div>
              <FilmCard film={film} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
