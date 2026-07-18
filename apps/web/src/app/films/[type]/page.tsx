'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { movieApi } from '@/lib/api';
import { FilmCard, FilmItem, FilmCardSkeleton } from '@/components/film/FilmCard';
import { ChevronRight } from 'lucide-react';

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

  const label = TYPE_LABELS[type] || 'Phim';
  const apiFn = TYPE_APIS[type] || movieApi.getLatest;

  const { data, isLoading } = useQuery({
    queryKey: ['films-type', type, page],
    queryFn: () => apiFn(page).then((r) => r.data),
  });

  const films: FilmItem[] = data?.data?.items || data?.items || [];
  const totalPages = data?.data?.params?.pagination?.totalPages || data?.pagination?.totalPages || 1;

  return (
    <div className="container">
      <div className="section-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>{label}</h1>
        <p className="text-muted text-sm">Trang {page} / {totalPages}</p>
      </div>

      {isLoading ? (
        <div className="grid-films-lg">
          {Array.from({ length: 24 }).map((_, i) => <FilmCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid-films-lg">
          {films.map((film) => <FilmCard key={film.slug} film={film} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <button className="page-btn" onClick={() => router.push(`/films/${type}?page=${page - 1}`)}>‹</button>
          )}
          {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
            const p = Math.max(1, page - 3) + i;
            if (p > totalPages) return null;
            return (
              <button
                key={p}
                className={`page-btn ${p === page ? 'active' : ''}`}
                onClick={() => router.push(`/films/${type}?page=${p}`)}
              >
                {p}
              </button>
            );
          })}
          {page < totalPages && (
            <button className="page-btn" onClick={() => router.push(`/films/${type}?page=${page + 1}`)}>›</button>
          )}
        </div>
      )}
    </div>
  );
}
