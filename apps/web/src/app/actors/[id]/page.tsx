// actor detail
"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Film,
  Loader2,
  Star,
  ExternalLink,
} from "lucide-react";
import { useTmdbPerson } from "@/hooks/useTmdb";
import { tmdbProfile, tmdbPoster, tmdbBackdrop } from "@/lib/tmdb";

export default function ActorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const personId = Number(params.id);
  const { detail, knownFor, images, isLoading } = useTmdbPerson(personId);

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
      {/* Backdrop blur */}
      {knownFor[0]?.backdrop_path && (
        <div className="absolute top-0 left-0 right-0 h-80 overflow-hidden z-0 pointer-events-none">
          <img
            src={tmdbBackdrop(knownFor[0].backdrop_path, "w1280") || ""}
            alt=""
            className="w-full h-full object-cover object-top brightness-[0.25]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background" />
        </div>
      )}

      <div className="relative z-10 w-full pt-2 max-w-6xl mx-auto">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors mb-8 group"
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
              Hình ảnh
            </h2>
            <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-hide">
              {images.slice(0, 12).map((img: any, i: number) => (
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

        {/* Known For Movies */}
        {knownFor.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-2 mb-6">
              <Film size={16} className="text-neutral-400" />
              <h2 className="text-lg font-bold text-white">
                Phim đã tham gia
              </h2>
              <span className="text-xs text-neutral-600 font-medium">({knownFor.length})</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {knownFor.map((item: any) => {
                const poster = tmdbPoster(item.poster_path, "w342");
                const title = item.title || item.name || "";
                const year = (item.release_date || item.first_air_date || "").slice(0, 4);

                return (
                  <Link
                    key={`${item.media_type || "movie"}-${item.id}`}
                    href={`/search?q=${encodeURIComponent(title)}`}
                    className="group flex flex-col gap-2"
                  >
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 border border-white/8 group-hover:border-white/20 transition-all duration-300 relative shadow-md">
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
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-neutral-400 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                        {title}
                      </p>
                      {year && (
                        <p className="text-[10px] text-neutral-700 mt-0.5">{year}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
