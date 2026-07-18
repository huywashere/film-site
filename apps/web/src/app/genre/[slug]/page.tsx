'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { movieApi } from '@/lib/api';
import { FilmCard, FilmItem, FilmCardSkeleton } from '@/components/film/FilmCard';

const GENRE_NAMES: Record<string, string> = {
  'hanh-dong': 'Hành Động', 'kinh-di': 'Kinh Dị', 'tinh-cam': 'Tình Cảm',
  'hai-huoc': 'Hài Hước', 'khoa-hoc-vien-tuong': 'Khoa Học Viễn Tưởng',
  'hoat-hinh': 'Hoạt Hình', 'co-trang': 'Cổ Trang', 'tam-ly': 'Tâm Lý',
  'vien-tuong': 'Viễn Tưởng', 'chien-tranh': 'Chiến Tranh',
  'the-thao': 'Thể Thao', 'am-nhac': 'Âm Nhạc',
};

export default function GenrePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const page = Number(searchParams.get('page') || 1);
  const label = GENRE_NAMES[slug] || slug;

  const { data, isLoading } = useQuery({
    queryKey: ['genre', slug, page],
    queryFn: () => movieApi.getByGenre(slug, page).then((r) => r.data),
  });

  const films: FilmItem[] = data?.data?.items || [];
  const totalPages = data?.data?.params?.pagination?.totalPages || 1;

  return (
    <div className="container">
      <div className="section-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>Thể Loại: {label}</h1>
        <p className="text-muted text-sm">Trang {page}</p>
      </div>

      {isLoading ? (
        <div className="grid-films-lg">
          {Array.from({ length: 24 }).map((_, i) => <FilmCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid-films-lg">
          {films.map((f) => <FilmCard key={f.slug} film={f} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <button className="page-btn" onClick={() => router.push(`/genre/${slug}?page=${page - 1}`)}>‹</button>
          )}
          {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
            const p = Math.max(1, page - 3) + i;
            if (p > totalPages) return null;
            return (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`}
                onClick={() => router.push(`/genre/${slug}?page=${p}`)}>
                {p}
              </button>
            );
          })}
          {page < totalPages && (
            <button className="page-btn" onClick={() => router.push(`/genre/${slug}?page=${page + 1}`)}>›</button>
          )}
        </div>
      )}
    </div>
  );
}
