"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Loader2, UserX } from "lucide-react";
import { tmdbApi, tmdbProfile } from "@/lib/tmdb";

// ── Ultra-Minimalist Monochrome Actor Card ────────────────────────
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
      className="group flex flex-col items-center rounded-2xl bg-neutral-950/40 p-4 border border-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-neutral-900/60"
    >
      {/* Avatar Container */}
      <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-neutral-900 transition-all duration-300 group-hover:border-white/60 sm:h-28 sm:w-28">
        {profileUrl ? (
          <img
            src={profileUrl}
            alt={person.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-800">
            <span className="text-lg font-extrabold text-neutral-400">
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Actor Info */}
      <h3 className="w-full text-center line-clamp-1 text-xs font-bold text-white transition-colors duration-200 group-hover:text-neutral-300">
        {person.name}
      </h3>
      <p className="mt-1 text-[10px] font-medium text-neutral-500 line-clamp-1">
        {person.known_for_department === "Acting" ? "Diễn viên" : person.known_for_department || "Diễn viên"}
      </p>
    </Link>
  );
}

// ── Main Ultra-Minimalist Actors Page ────────────────────────────
export default function ActorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Fetch 3 pages of TMDB Popular People to get 60 top famous actors
  const { data: popularData, isLoading: popularLoading } = useQuery({
    queryKey: ["tmdb-popular-people-50"],
    queryFn: async () => {
      const [p1, p2, p3] = await Promise.all([
        tmdbApi.getPopularPeople(1),
        tmdbApi.getPopularPeople(2),
        tmdbApi.getPopularPeople(3),
      ]);
      const combined = [...(p1?.results || []), ...(p2?.results || []), ...(p3?.results || [])];
      // Filter unique actors with valid profile pictures
      const uniqueMap = new Map();
      combined.forEach((item) => {
        if (item && item.id && item.profile_path && !uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });
      return Array.from(uniqueMap.values()).slice(0, 54);
    },
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

  const popularPeople = popularData || [];
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
      {/* Minimalist Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-white/10 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Diễn Viên Nổi Tiếng
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            {displayPeople.length} diễn viên điện ảnh nổi tiếng
          </p>
        </div>

        {/* Minimalist Search Box */}
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Tìm kiếm diễn viên..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition-colors"
          />
        </form>
      </div>

      {/* Actor Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-3">
          <Loader2 size={24} className="animate-spin text-neutral-400" />
          <p className="text-xs text-neutral-500">Đang tải danh sách diễn viên...</p>
        </div>
      ) : displayPeople.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {displayPeople.map((person: any) => (
            <ActorCard key={person.id} person={person} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-neutral-900/40 border border-white/5 rounded-2xl max-w-md mx-auto">
          <UserX size={32} className="mx-auto text-neutral-600 mb-2" />
          <h3 className="text-sm font-bold text-white mb-1">
            Không tìm thấy diễn viên
          </h3>
          <p className="text-xs text-neutral-500">Thử tìm kiếm tên khác</p>
        </div>
      )}
    </div>
  );
}
