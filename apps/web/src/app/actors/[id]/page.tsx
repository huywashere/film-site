// actor detail
"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Film,
  Loader2,
  Star,
  ExternalLink,
  Play,
  Sparkles,
} from "lucide-react";
import { useTmdbPerson } from "@/hooks/useTmdb";
import { tmdbProfile, tmdbPoster } from "@/lib/tmdb";
import { FilmCardSkeleton } from "@/components/film/FilmCard";

export default function ActorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const personId = Number(params.id);
  const { detail, knownFor, images, isLoading } = useTmdbPerson(personId);

  const [filterType, setFilterType] = useState<"all" | "movie" | "tv">("all");
  const [movieQuery, setMovieQuery] = useState("");

  // Chỉ lấy danh sách các phim của diễn viên THỰC SỰ CÓ TRONG HỆ THỐNG
  const { data: systemFilmsData, isLoading: isSystemFilmsLoading } = useQuery({
    queryKey: ["actor-system-films", personId],
    queryFn: async () => {
      const res = await fetch(`/api/actor-films?personId=${personId}`);
      if (!res.ok) return { films: [], total: 0 };
      return res.json();
    },
    enabled: Boolean(personId),
    staleTime: 1000 * 60 * 60, // 1 giờ
  });

  const systemFilms: any[] = useMemo(
    () => systemFilmsData?.films || [],
    [systemFilmsData],
  );

  const moviesCount = useMemo(
    () =>
      systemFilms.filter((m: any) => (m.media_type || "movie") === "movie")
        .length,
    [systemFilms],
  );
  const tvCount = useMemo(
    () => systemFilms.filter((m: any) => m.media_type === "tv").length,
    [systemFilms],
  );

  const filteredMovies = useMemo(() => {
    return systemFilms.filter((item: any) => {
      const type = item.media_type || "movie";
      const matchesType = filterType === "all" || type === filterType;
      const title = `${item.name || ""} ${item.origin_name || ""}`.toLowerCase();
      const matchesSearch =
        !movieQuery.trim() ||
        title.includes(movieQuery.toLowerCase().trim());
      return matchesType && matchesSearch;
    });
  }, [systemFilms, filterType, movieQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-white font-bold">
          Không tìm thấy diễn viên
        </p>
        <button
          onClick={() => router.back()}
          className="text-sm text-neutral-400 hover:text-white transition-colors"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const profileUrl = tmdbProfile(detail.profile_path, "h632");
  const age = detail.birthday
    ? Math.floor(
        (Date.now() - new Date(detail.birthday).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25),
      )
    : null;

  // Prefer English/Latin name
  const displayName = (() => {
    const name: string = detail.name || "";
    const hasNonLatin = /[^\u0000-\u024F\u1E00-\u1EFF\s\-'.]/.test(name);
    if (hasNonLatin && detail.also_known_as?.length) {
      const latinAlt = detail.also_known_as.find(
        (n: string) => !/[^\u0000-\u024F\u1E00-\u1EFF\s\-'.]/.test(n),
      );
      if (latinAlt) return latinAlt;
    }
    return name;
  })();

  return (
    <div className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 pt-20 sm:pt-24 pb-20 bg-background min-h-screen text-foreground relative">
      <div className="relative z-10 w-full pt-2 max-w-6xl mx-auto">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors mb-8 group cursor-pointer"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          Quay lại
        </button>

        {/* Profile Hero */}
        <div className="flex flex-col md:flex-row gap-8 mb-14">
          {/* Photo */}
          <div className="flex-shrink-0">
            <div className="w-40 h-56 md:w-52 md:h-[19rem] rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] bg-neutral-900 relative">
              {profileUrl ? (
                <img
                  src={profileUrl}
                  alt={displayName}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-neutral-600">
                    {displayName[0]}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-5">
            {/* Name */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400 mb-1">
                {detail.known_for_department === "Acting"
                  ? "Diễn viên"
                  : detail.known_for_department || "Diễn viên"}
              </p>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {displayName}
              </h1>
              {/* Native name if different */}
              {displayName !== detail.name && (
                <p className="text-sm text-neutral-500 mt-1">{detail.name}</p>
              )}
            </div>

            {/* Meta pills */}
            <div className="flex flex-wrap gap-2.5 text-xs text-neutral-400">
              {detail.birthday && (
                <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/8 rounded-lg px-3 py-1.5">
                  <Calendar size={11} className="text-neutral-500" />
                  <span>
                    {new Date(detail.birthday).toLocaleDateString("vi-VN")}
                    {age && <span className="text-neutral-500 ml-1">({age} tuổi)</span>}
                  </span>
                </div>
              )}
              {detail.place_of_birth && (
                <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/8 rounded-lg px-3 py-1.5">
                  <MapPin size={11} className="text-neutral-500" />
                  <span className="line-clamp-1 max-w-[220px]">{detail.place_of_birth}</span>
                </div>
              )}
              {detail.popularity && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                  <Star size={11} className="text-amber-400" fill="currentColor" />
                  <span className="text-amber-400 font-semibold">
                    {Math.round(detail.popularity)} điểm nổi tiếng
                  </span>
                </div>
              )}
            </div>

            {/* Also known as */}
            {detail.also_known_as && detail.also_known_as.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-2">
                  Tên khác
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.also_known_as.slice(0, 5).map((name: string, i: number) => (
                    <span
                      key={i}
                      className="text-[11px] text-neutral-400 bg-white/[0.04] border border-white/8 px-2.5 py-1 rounded-lg"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {detail.biography && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-2">
                  Tiểu sử
                </p>
                <p className="text-[13px] text-neutral-400 leading-relaxed line-clamp-6">
                  {detail.biography}
                </p>
              </div>
            )}

            {/* IMDb link */}
            {detail.imdb_id && (
              <a
                href={`https://www.imdb.com/name/${detail.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#f5c518] hover:text-yellow-300 transition-colors"
              >
                <svg viewBox="0 0 64 32" width="28" height="14" aria-label="IMDb">
                  <rect width="64" height="32" rx="4" fill="#F5C518" />
                  <text x="5" y="23" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="20" fill="#000">IMDb</text>
                </svg>
                <span>Hồ sơ IMDb</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>

        {/* Photos strip */}
        {images.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-600 border-b border-white/5 pb-2.5 mb-4">
              Hình ảnh ({images.length})
            </h2>
            <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-hide">
              {images.slice(0, 15).map((img: any, i: number) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden border border-white/8 bg-neutral-900 hover:border-white/25 transition-colors"
                >
                  <img
                    src={tmdbProfile(img.file_path, "w185") || ""}
                    alt={`${displayName} ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* System Filmography Section - Chỉ hiển thị phim có trên hệ thống */}
        <section className="mb-14 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Film size={18} className="text-amber-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Phim có trên hệ thống
              </h2>
              {!isSystemFilmsLoading && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-400/30">
                  {filteredMovies.length} phim
                </span>
              )}
            </div>

            {/* Filters & Search */}
            <div className="flex items-center flex-wrap gap-2.5">
              <div className="flex items-center p-0.5 bg-black/40 border border-white/10 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterType === "all"
                      ? "bg-amber-500 text-black shadow-sm font-extrabold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Tất cả ({systemFilms.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("movie")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterType === "movie"
                      ? "bg-amber-500 text-black shadow-sm font-extrabold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Phim lẻ ({moviesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("tv")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterType === "tv"
                      ? "bg-amber-500 text-black shadow-sm font-extrabold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Series ({tvCount})
                </button>
              </div>

              {/* Movie search in actor filmography */}
              <input
                type="text"
                placeholder="Lọc tên phim..."
                value={movieQuery}
                onChange={(e) => setMovieQuery(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 w-36 transition-all"
              />
            </div>
          </div>

          {/* Loading Skeletons */}
          {isSystemFilmsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredMovies.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-3">
              <Film size={32} className="text-neutral-600 mb-1" />
              <p className="text-sm font-bold text-neutral-200">
                {movieQuery.trim()
                  ? "Không tìm thấy phim phù hợp với từ khóa lọc."
                  : `Hiện tại chưa có phim nào của ${displayName} trên hệ thống.`}
              </p>
              <p className="text-xs text-neutral-500 max-w-md">
                {movieQuery.trim()
                  ? "Hãy thử tìm kiếm với tên phim khác hoặc đặt lại bộ lọc."
                  : "Kho phim NetPhim liên tục được cập nhật các tác phẩm mới hàng ngày. Bạn có thể khám phá thêm kho phim thịnh hành."}
              </p>
              <Link
                href="/films"
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-extrabold text-black transition-colors shadow-lg shadow-amber-500/20"
              >
                Khám phá kho phim
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
              {filteredMovies.map((item: any) => {
                const poster =
                  item.poster_url || tmdbPoster(item.poster_path, "w342");
                const title = item.name || item.title || "";
                const year =
                  item.year ||
                  (item.release_date || item.first_air_date || "").slice(0, 4);
                const isTv = item.media_type === "tv";
                const character = item.character;
                const episodeBadge =
                  item.episode_current || (isTv ? "Series" : "Full");
                const qualityBadge = item.quality || "FHD";
                const langBadge = item.lang;

                return (
                  <Link
                    key={`${item.media_type || "movie"}-${item.slug || item._id}`}
                    href={`/film/${item.slug}`}
                    className="group flex flex-col gap-2 relative transition-all duration-300 select-none"
                    title={`Xem phim ${title}`}
                  >
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 border border-white/10 group-hover:border-amber-400/40 group-hover:shadow-[0_10px_30px_-10px_rgba(245,158,11,0.3)] transition-all duration-300 relative shadow-lg">
                      {poster ? (
                        <img
                          src={poster}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film size={20} className="text-neutral-700" />
                        </div>
                      )}

                      {/* Top Gradient Overlay */}
                      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />

                      {/* Bottom Gradient Overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

                      {/* Top Left: Episode Badge */}
                      <div className="absolute top-1.5 left-1.5 z-20 flex items-center gap-1">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-amber-300 border border-amber-400/30">
                          {episodeBadge}
                        </span>
                      </div>

                      {/* Top Right: Rating Badge */}
                      {item.vote_average > 0 && (
                        <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-0.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 text-[9px] font-bold text-amber-400">
                          <Star size={9} fill="currentColor" />
                          <span>{Number(item.vote_average).toFixed(1)}</span>
                        </div>
                      )}

                      {/* Bottom Badges: Quality & Audio */}
                      <div className="absolute bottom-1.5 inset-x-1.5 z-20 flex items-center justify-between pointer-events-none">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-white/90 border border-white/10">
                          {qualityBadge}
                        </span>
                        {langBadge && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 backdrop-blur-md text-amber-200 border border-amber-400/30 truncate max-w-[90px]">
                            {langBadge}
                          </span>
                        )}
                      </div>

                      {/* Frosted Glass Hover Play Icon */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none z-20">
                        <div className="w-11 h-11 rounded-full bg-amber-500/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Play
                            size={18}
                            fill="currentColor"
                            className="ml-0.5 text-black"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="px-0.5">
                      <p className="text-xs font-bold text-neutral-200 group-hover:text-amber-400 transition-colors line-clamp-1 leading-snug">
                        {title}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-0.5">
                        {character ? (
                          <span className="truncate max-w-[120px] text-amber-400/90 font-medium">
                            vai {character}
                          </span>
                        ) : (
                          <span className="truncate max-w-[120px] text-neutral-400">
                            {item.origin_name ||
                              (isTv ? "Truyền hình" : "Điện ảnh")}
                          </span>
                        )}
                        {year && (
                          <span className="shrink-0 text-neutral-500 font-medium">
                            {year}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
