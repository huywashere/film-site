'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { movieApi } from '@/lib/api';
import { FilmCard, FilmItem, FilmCardSkeleton } from '@/components/film/FilmCard';
import { Pagination } from '@/components/film/Pagination';

const TYPE_LABELS: Record<string, string> = {
  series: 'Phim Bộ',
  single: 'Phim Lẻ',
  anime: 'Hoạt Hình',
  tvshows: 'TV Shows',
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
  const page = Number(searchParams.get('page') || 1);

  const label = TYPE_LABELS[type] || 'Danh Sách Phim';
  const apiFn = TYPE_APIS[type] || movieApi.getLatest;

  const { data, isLoading } = useQuery({
    queryKey: ['films-type', type, page],
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
      ? Math.ceil(data.data.params.pagination.totalItems / (data.data.params.pagination.totalItemsPerPage || 24))
      : undefined);

  const totalPages = rawTotal && rawTotal > 1 ? rawTotal : (films.length > 0 ? 50 : 1);
  const totalItems = data?.data?.params?.pagination?.totalItems || data?.pagination?.totalItems;

  const handlePageChange = (newPage: number) => {
    router.push(`/films/${type}?page=${newPage}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto px-4 md:px-8 max-w-7xl pt-24 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-white/10 gap-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-wide uppercase font-sans">
            {label}
          </h1>
          <p className="text-xs text-neutral-400 font-semibold mt-1">
            Khám phá kho phim chọn lọc cập nhật liên tục hàng ngày
          </p>
        </div>
        <div className="text-xs font-bold text-neutral-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 self-start md:self-auto">
          Trang <span className="text-white font-extrabold">{page}</span> / {totalPages}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <FilmCardSkeleton key={i} />
          ))}
        </div>
      ) : films.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {films.map((film) => (
            <FilmCard key={film.slug} film={film} />
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
