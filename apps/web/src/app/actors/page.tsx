"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, User, Star, Loader2 } from "lucide-react";
import { tmdbApi, tmdbProfile } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

// ── Actor Card ────────────────────────────────────────────────────
function ActorCard({ person }: { person: any }) {
  const profileUrl = tmdbProfile(person.profile_path, "w185");
  const initials = person.name
    .split(" ")
    .slice(-2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();
  const knownFor = (person.known_for || [])
    .slice(0, 2)
    .map((m: any) => m.title || m.name)
    .filter(Boolean);

  return (
    <Link
      href={`/actors/${person.id}`}
      className="bg-[#12161a]/70 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center hover:border-white/25 hover:-translate-y-1 transition-all group shadow-xl"
    >
      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-red-500/60 transition-colors mb-3 bg-neutral-900 shadow-lg">
        {profileUrl ? (
          <img
            src={profileUrl}
            alt={person.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-lg font-bold text-neutral-400">
              {initials}
            </span>
          </div>
        )}
      </div>
      <h3 className="font-extrabold text-sm text-white group-hover:text-red-400 transition-colors line-clamp-1 w-full">
        {person.name}
      </h3>
      <p className="text-[10px] text-neutral-500 mt-0.5 mb-2">
        {person.known_for_department || "Diễn viên"}
      </p>
      {knownFor.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-1">
          {knownFor.map((title: string, i: number) => (
            <span
              key={i}
              className="text-[9px] font-semibold text-neutral-400 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded-md line-clamp-1 max-w-[120px]"
            >
              {title}
            </span>
          ))}
        </div>
      )}
      {person.popularity && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-400/70">
          <Star size={9} fill="currentColor" />
          <span>{Math.round(person.popularity)}</span>
        </div>
      )}
    </Link>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ActorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Trending people từ TMDB
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ["tmdb-trending-people"],
    queryFn: () => tmdbApi.getTrending("all", "week"),
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

  const trendingPeople = (trendingData?.results || []).filter(
    (p: any) => p.media_type === "person",
  );
  const searchPeople = searchData?.results || [];
  const displayPeople =
    searchQuery.trim().length >= 2 ? searchPeople : trendingPeople;
  const isLoading = trendingLoading || searchLoading;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  return (
    <div className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 pt-20 sm:pt-24 pb-20 bg-background min-h-screen text-foreground">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-white/10 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <User className="text-red-500" size={28} />
            Diễn Viên
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Dữ liệu thực từ TMDB · {displayPeople.length} kết quả
          </p>
        </div>
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Tìm diễn viên..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-[#12161a] border border-white/15 rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-white/30 transition-all"
          />
        </form>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-neutral-500" />
        </div>
      ) : displayPeople.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {displayPeople.map((person: any) => (
            <ActorCard key={person.id} person={person} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-[#12161a]/40 border border-white/10 rounded-2xl">
          <User size={36} className="mx-auto text-neutral-500 mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            Không tìm thấy diễn viên
          </h3>
          <p className="text-xs text-neutral-400">Thử từ khóa khác</p>
        </div>
      )}
    </div>
  );
}
