"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, User, Loader2 } from "lucide-react";
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
  return (
    <Link
      href={`/actors/${person.id}`}
      className="group flex flex-col items-center rounded-2xl p-3 text-center transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="mb-2.5 h-20 w-20 overflow-hidden rounded-full border-2 border-white/10 bg-neutral-900 transition-colors group-hover:border-white/50 sm:h-24 sm:w-24">
        {profileUrl ? (
          <img
            src={profileUrl}
            alt={person.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
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
      <h3 className="w-full line-clamp-1 text-sm font-bold text-white transition-colors group-hover:text-white/70">
        {person.name}
      </h3>
    </Link>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
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
        <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
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
