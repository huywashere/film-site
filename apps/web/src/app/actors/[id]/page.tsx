// actor detail
"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Film, Loader2, Star } from "lucide-react";
import { useTmdbPerson } from "@/hooks/useTmdb";
import { tmdbProfile, tmdbPoster, tmdbBackdrop } from "@/lib/tmdb";

export default function ActorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const personId = Number(params.id);
  const { detail, knownFor, images, isLoading } = useTmdbPerson(personId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-4">
        <p className="text-white font-bold">Không tìm thấy diễn viên</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-neutral-400 hover:text-white"
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

  return (
    <div className="min-h-screen bg-[#0d1117] text-white pb-16">
      {knownFor[0]?.backdrop_path && (
        <div className="absolute top-0 left-0 right-0 h-72 overflow-hidden z-0">
          <img
            src={tmdbBackdrop(knownFor[0].backdrop_path, "w1280") || ""}
            alt=""
            className="w-full h-full object-cover object-top brightness-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0d1117]" />
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 pt-20">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Quay lại
        </button>

        {/* Profile */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <div className="flex-shrink-0">
            <div className="w-40 h-56 md:w-48 md:h-72 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-neutral-900">
              {profileUrl ? (
                <img
                  src={profileUrl}
                  alt={detail.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-neutral-600">
                    {detail.name[0]}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                {detail.name}
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                {detail.known_for_department || "Diễn viên"}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-neutral-400">
              {detail.birthday && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-neutral-500" />
                  <span>
                    {new Date(detail.birthday).toLocaleDateString("vi-VN")}
                    {age && ` (${age} tuổi)`}
                  </span>
                </div>
              )}
              {detail.place_of_birth && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-neutral-500" />
                  <span>{detail.place_of_birth}</span>
                </div>
              )}
              {detail.popularity && (
                <div className="flex items-center gap-1.5">
                  <Star
                    size={12}
                    className="text-amber-400"
                    fill="currentColor"
                  />
                  <span className="text-amber-400">
                    {Math.round(detail.popularity)} điểm nổi tiếng
                  </span>
                </div>
              )}
            </div>

            {detail.also_known_as && detail.also_known_as.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-1.5">
                  Còn được biết đến
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.also_known_as.slice(0, 4).map((name, i) => (
                    <span
                      key={i}
                      className="text-[11px] text-neutral-300 bg-white/5 border border-white/8 px-2.5 py-1 rounded-lg"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail.biography && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-2">
                  Tiểu sử
                </p>
                <p className="text-sm text-neutral-300 leading-relaxed line-clamp-5">
                  {detail.biography}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Ảnh */}
        {images.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500 border-b border-white/5 pb-2 mb-4">
              Hình ảnh
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-3">
              {images.slice(0, 10).map((img, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-24 h-32 rounded-xl overflow-hidden border border-white/10 bg-neutral-900"
                >
                  <img
                    src={tmdbProfile(img.file_path, "w185") || ""}
                    alt={`${detail.name} ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Phim nổi bật */}
        {knownFor.length > 0 && (
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500 border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
              <Film size={12} /> Phim nổi bật
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {knownFor.map((movie: any) => {
                const poster = tmdbPoster(movie.poster_path, "w342");
                const title = movie.title || movie.name;
                const year = (
                  movie.release_date ||
                  movie.first_air_date ||
                  ""
                ).slice(0, 4);
                return (
                  <Link
                    key={movie.id}
                    href={`/search?q=${encodeURIComponent(title)}`}
                    className="group flex flex-col gap-2"
                  >
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 border border-white/8 group-hover:border-white/20 transition-colors shadow-lg">
                      {poster ? (
                        <img
                          src={poster}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film size={24} className="text-neutral-700" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-neutral-300 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                        {title}
                      </p>
                      {year && (
                        <p className="text-[10px] text-neutral-600 mt-0.5">
                          {year}
                        </p>
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
