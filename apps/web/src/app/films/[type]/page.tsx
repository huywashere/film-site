"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmItem,
  FilmCardSkeleton,
} from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { cardFont } from "@/lib/fonts";

const TYPE_LABELS: Record<string, string> = {
  series: "Phim Bộ",
  single: "Phim Lẻ",
  anime: "Hoạt Hình",
  tvshows: "TV Shows",
};

const TYPE_APIS: Record<string, (page: number) => Promise<any>> = {
  series: (p) => movieApi.getSeries(p),
  single: (p) => movieApi.getSingle(p),
  anime: (p) => movieApi.getAnime(p),
  tvshows: (p) => movieApi.getTvShows(p),
};

export default function FilmsTypePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = params.type as string;
  const page = Number(searchParams.get("page") || 1);

  const label = TYPE_LABELS[type] || "Danh Sách Phim";
  const apiFn = TYPE_APIS[type] || movieApi.getLatest;

  const { data, isLoading } = useQuery({
    queryKey: ["films-type", type, page],
    queryFn: () => apiFn(page).then((r) => r.data),
  });

  const films: FilmItem[] = data?.data?.items || data?.items || [];

  // Robust totalPages extraction from API response
  const rawTotal =
    data?.data?.params?.pagination?.totalPages ||
    data?.params?.pagination?.totalPages ||
    data?.pagination?.totalPages ||
    data?.paginate?.total_page ||
    data?.data?.paginate?.total_page ||
    (data?.data?.params?.pagination?.totalItems
      ? Math.ceil(
          data.data.params.pagination.totalItems /
            (data.data.params.pagination.totalItemsPerPage || 36),
        )
      : undefined);

  const totalPages =
    rawTotal && rawTotal > 1 ? rawTotal : films.length > 0 ? 50 : 1;
  const totalItems =
    data?.data?.params?.pagination?.totalItems || data?.pagination?.totalItems;

  const handlePageChange = (newPage: number) => {
    router.push(`/films/${type}?page=${newPage}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`${cardFont.className} min-h-screen w-full bg-background pb-20 pl-4 pr-4 pt-20 text-foreground sm:pt-24 md:pr-10 lg:pl-24`}>
      {/* Page Header — Centered */}
      <div className="flex flex-col items-center justify-center text-center mb-10 pb-6 border-b border-white/10 gap-2.5 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          {label}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 font-medium">
          Khám phá kho phim chọn lọc cập nhật liên tục hàng ngày
        </p>
        <div className="mt-1 text-xs font-mono font-bold text-neutral-300 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
          Trang <span className="text-white font-extrabold">{page}</span> /{" "}
          {totalPages}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 md:gap-6 lg:grid-cols-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <FilmCardSkeleton key={i} />
          ))}
        </div>
      ) : films.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 md:gap-6 lg:grid-cols-6">
          {films.map((film, idx) => (
            <FilmCard key={`${film.slug || film._id || (film as any).id}-${idx}`} film={film} priority={idx < 8} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-neutral-500 font-semibold text-sm">
          Không tìm thấy bộ phim nào trong danh mục này.
        </div>
      )}

      {/* Pagination Controls */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
