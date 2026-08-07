"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Flame, Sparkles, Loader2, UserX } from "lucide-react";
import { tmdbApi, tmdbProfile } from "@/lib/tmdb";

// ── Minimalist Actor Card ─────────────────────────────────────────
function ActorCard({ person }: { person: any }) {
  const profileUrl = tmdbProfile(person.profile_path, "w185");
  const initials = person.name
    .split(" ")
    .slice(-2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  const popularityScore = person.popularity ? Math.round(person.popularity) : null;

  return (
    <Link
      href={`/actors/${person.id}`}
      className="group relative flex flex-col items-center rounded-2xl bg-neutral-900/40 p-4 border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-red-500/30 hover:bg-neutral-900/80 hover:shadow-[0_12px_30px_rgba(229,9,20,0.15)]"
    >
      {/* Popularity Badge */}
      {popularityScore && popularityScore > 50 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
          <Flame size={10} className="fill-amber-400" />
          <span>{popularityScore}</span>
        </div>
      )}

      {/* Avatar Container */}
      <div className="relative mb-3.5 h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 bg-neutral-950 p-0.5 transition-all duration-300 group-hover:border-red-500/60 group-hover:scale-105 sm:h-28 sm:w-28 shadow-lg">
        <div className="h-full w-full overflow-hidden rounded-full bg-neutral-900">
          {profileUrl ? (
            <img
              src={profileUrl}
              alt={person.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-800">
              <span className="text-xl font-black text-neutral-400">
                {initials}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actor Info */}
      <h3 className="w-full text-center line-clamp-1 text-sm font-extrabold text-white transition-colors duration-200 group-hover:text-red-400">
        {person.name}
      </h3>
      <p className="mt-1 text-[11px] font-medium text-neutral-400 tracking-wide line-clamp-1">
        {person.known_for_department === "Acting" ? "Diễn viên" : person.known_for_department || "Nghệ sĩ"}
      </p>
    </Link>
  );
}

// ── Main Minimalist Actors Page ───────────────────────────────────
export default function ActorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Popular / Trending actors từ TMDB
  const { data: popularData, isLoading: popularLoading } = useQuery({
    queryKey: ["tmdb-popular-people"],
    queryFn: () => tmdbApi.getPopularPeople(1),
    staleTime: 1000 * 60 * 30,
    enabled: !searchQuery,
  });

  // Search people
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["tmdb-search-people", searchQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/tmdb/search/person?query=${encodeURIComponent(searchQuery)}&language=vi-VN`,
      );
      return res.json();
    },
    enabled: searchQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  const popularPeople = popularData?.results || [];
  const searchPeople = searchData?.results || [];
  const displayPeople =
    searchQuery.trim().length >= 2 ? searchPeople : popularPeople;
  const isLoading = popularLoading || searchLoading;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground pl-4 lg:pl-24 pr-4 md:pr-10 pt-20 sm:pt-24 pb-24">
      {/* Minimalist Hero Banner */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-r from-neutral-900/90 via-neutral-900/60 to-transparent p-6 md:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-bold text-red-400 mb-3">
              <Sparkles size={12} />
              <span>TMDB Real-Time Data</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Diễn Viên Nổi Tiếng
            </h1>
            <p className="mt-1.5 text-xs md:text-sm text-neutral-400 max-w-lg leading-relaxed">
              Khám phá gương mặt các ngôi sao điện ảnh hàng đầu thế giới và xem các bộ phim đình đám của họ.
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative w-full md:w-80">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Tìm kiếm diễn viên..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 backdrop-blur-md transition-all"
            />
          </form>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-widest">
            {searchQuery ? `Kết quả cho "${searchQuery}"` : "Ngôi Sao Đang Hot"}
          </h2>
        </div>
        <span className="text-xs text-neutral-500 font-medium">
          {displayPeople.length} diễn viên
        </span>
      </div>

      {/* Actor Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-3">
          <Loader2 size={32} className="animate-spin text-red-500" />
          <p className="text-xs text-neutral-400 font-medium">Đang tải danh sách diễn viên...</p>
        </div>
      ) : displayPeople.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {displayPeople.map((person: any) => (
            <ActorCard key={person.id} person={person} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-neutral-900/30 border border-white/10 rounded-3xl max-w-md mx-auto">
          <UserX size={40} className="mx-auto text-neutral-500 mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            Không tìm thấy diễn viên phù hợp
          </h3>
          <p className="text-xs text-neutral-400">Thử tìm kiếm với tên tiếng Anh hoặc tên khác</p>
        </div>
      )}
    </div>
  );
}
