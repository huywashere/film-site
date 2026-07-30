"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  RefreshCw,
  Flame,
  UserCheck,
  Film,
  Compass,
} from "lucide-react";
import { useState, useMemo } from "react";
import { movieApi } from "@/lib/api";
import { FilmCard, FilmItem } from "./FilmCard";
import { useAuthStore } from "@/store/authStore";
import { watchProgressStorage } from "@/lib/watch-progress";
import {
  rankFilmsByUserTaste,
  buildUserTasteVector,
} from "@/lib/user-taste-algorithm";

export function SmartRecommendationSection() {
  const user = useAuthStore((s) => s.user);
  const [refreshSeed, setRefreshSeed] = useState(0);

  // 1. Compute dynamic User Taste Vector from watch history & bookmarks
  const userVector = useMemo(() => {
    return buildUserTasteVector();
  }, [refreshSeed, user]);

  const userHistory = useMemo(() => {
    return watchProgressStorage.getEntries();
  }, []);

  const lastWatchedTitle = userHistory.length > 0 ? userHistory[0].title : null;

  const queryType = useMemo(() => {
    const types = ["series", "single", "anime", "tvshows"];
    return types[refreshSeed % types.length];
  }, [refreshSeed]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "smart-recommendations-user-taste-v3",
      user?.id || "guest",
      refreshSeed,
      queryType,
    ],
    queryFn: () =>
      movieApi
        .getFilmsByType(queryType, (refreshSeed % 3) + 1, 16)
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const rawFilms: FilmItem[] = data?.data?.items || data?.items || [];

  // 2. Rank candidate films using our personalized user taste scoring algorithm
  const rankedFilms = useMemo(() => {
    return rankFilmsByUserTaste(rawFilms, userVector, false);
  }, [rawFilms, userVector]);

  const handleRefresh = () => {
    setRefreshSeed((prev) => prev + 1);
    refetch();
  };

  if (isLoading || !rankedFilms.length) return null;

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
                Gợi Ý Cho {user?.displayName || user?.username || "Gu Của Bạn"}
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                <UserCheck size={11} /> Taste AI Vector
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {lastWatchedTitle ? (
                <span>
                  Phân tích từ phim bạn đã xem:{" "}
                  <strong className="text-emerald-400 font-semibold">
                    {lastWatchedTitle}
                  </strong>
                </span>
              ) : (
                <span>
                  Thuật toán AI tự động xếp hạng phim dựa trên sở thích cá nhân
                  của bạn.
                </span>
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
        {rankedFilms.slice(0, 4).map(({ film, matchPercent }) => {
          return (
            <div key={film._id || film.slug} className="relative group">
              <div className="absolute top-2 left-2 z-20 bg-black/85 backdrop-blur-md text-emerald-400 font-black text-[10px] px-2.5 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1.5 shadow-xl">
                <Flame
                  size={12}
                  className="fill-emerald-400 text-emerald-400"
                />
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
