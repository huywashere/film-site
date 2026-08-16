"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Loader2, UserX, TrendingUp } from "lucide-react";
import { tmdbApi, tmdbProfile } from "@/lib/tmdb";

// ── Actor Card ────────────────────────────────────────────────────
function ActorCard({ person }: { person: any }) {
  const profileUrl = tmdbProfile(person.profile_path, "w185");

  // Prefer English/Latin name over native-script name
  const displayName = (() => {
    const name: string = person.name || "";
    const hasNonLatin = /[^\u0000-\u024F\u1E00-\u1EFF\s\-'.]/.test(name);
    if (hasNonLatin) {
      // Try also_known_as for a Latin alternative
      if (person.also_known_as?.length) {
        const latinAlt = person.also_known_as.find(
          (n: string) => !/[^\u0000-\u024F\u1E00-\u1EFF\s\-'.]/.test(n) && n.trim().length > 1,
        );
        if (latinAlt) return latinAlt;
      }
      // If only original_name exists and is Latin, use it
      if (person.original_name && !/[^\u0000-\u024F\u1E00-\u1EFF\s\-'.]/.test(person.original_name)) {
        return person.original_name;
      }
    }
    return name;
  })();

  const isNativeScript = /[^\u0000-\u024F\u1E00-\u1EFF\s\-'.]/.test(displayName);

  const initials = displayName
    .split(" ")
    .slice(-2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/actors/${person.id}`}
      className="group flex flex-col items-center gap-3 p-3 rounded-2xl transition-all duration-300 hover:bg-white/[0.04]"
    >
      {/* Avatar */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-white/40 transition-all duration-300 bg-neutral-900 shrink-0">
        {profileUrl ? (
          <img
            src={profileUrl}
            alt={displayName}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-800">
            <span className="text-lg font-extrabold text-neutral-400 font-[family-name:var(--font-manrope)]">
              {initials}
            </span>
          </div>
        )}
        {/* Popularity glow on hover */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Name */}
      <div className="text-center w-full">
        <h3 className={`w-full text-center line-clamp-2 leading-snug transition-colors duration-200 group-hover:text-white font-[family-name:var(--font-manrope)] ${
            isNativeScript
              ? "text-[11px] font-medium text-neutral-500 italic"
              : "text-xs sm:text-[13px] font-bold text-neutral-200"
          }`}>
          {displayName}
        </h3>
        <p className="mt-0.5 text-[10px] text-neutral-600 font-medium">
          {person.known_for_department === "Acting"
            ? "Diễn viên"
            : person.known_for_department || "Diễn viên"}
        </p>
      </div>
    </Link>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ActorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data: popularData, isLoading: popularLoading } = useQuery({
    queryKey: ["tmdb-popular-people-54"],
    queryFn: async () => {
      const [p1, p2, p3] = await Promise.all([
        tmdbApi.getPopularPeople(1),
        tmdbApi.getPopularPeople(2),
        tmdbApi.getPopularPeople(3),
      ]);
      const combined = [
        ...(p1?.results || []),
        ...(p2?.results || []),
        ...(p3?.results || []),
      ];
      const uniqueMap = new Map();
      combined.forEach((item) => {
        if (item?.id && item.profile_path && !uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });
      return Array.from(uniqueMap.values()).slice(0, 54);
    },
    staleTime: 1000 * 60 * 30,
    enabled: !searchQuery,
  });

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["tmdb-search-people", searchQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/tmdb/search/person?query=${encodeURIComponent(searchQuery)}&language=en-US`,
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
    <div className="w-full min-h-screen bg-background text-foreground pt-20 sm:pt-24 pb-24 px-4 sm:px-8 md:px-12 lg:pl-28 lg:pr-12">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-violet-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">
                Nổi tiếng nhất
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white font-[family-name:var(--font-manrope)]">
              Diễn Viên
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              {displayPeople.length > 0
                ? `${displayPeople.length} diễn viên điện ảnh nổi tiếng`
                : "Đang tải..."}
            </p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative w-full md:w-72">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Tìm kiếm diễn viên..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value.trim().length < 2) setSearchQuery("");
              }}
              className="w-full bg-neutral-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 transition-colors font-[family-name:var(--font-manrope)]"
            />
          </form>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 size={28} className="animate-spin text-neutral-500" />
            <p className="text-xs text-neutral-600">Đang tải danh sách diễn viên...</p>
          </div>
        ) : displayPeople.length > 0 ? (
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9">
            {displayPeople.map((person: any) => (
              <ActorCard key={person.id} person={person} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-neutral-900/30 border border-white/5 rounded-2xl max-w-sm mx-auto">
            <UserX size={28} className="mx-auto text-neutral-600 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1 font-[family-name:var(--font-manrope)]">
              Không tìm thấy
            </h3>
            <p className="text-xs text-neutral-600">Thử tìm kiếm tên khác</p>
          </div>
        )}
      </div>
    </div>
  );
}
