'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { movieApi } from '@/lib/api';
import { FilmCard, FilmItem, FilmCardSkeleton } from '@/components/film/FilmCard';

const COUNTRY_NAMES: Record<string, string> = {
  'trung-quoc': 'Trung Quốc',
  'han-quoc': 'Hàn Quốc',
  'nhat-ban': 'Nhật Bản',
  'thai-lan': 'Thái Lan',
  'au-my': 'Âu Mỹ',
  'viet-nam': 'Việt Nam',
  'hong-kong': 'Hồng Kông',
  'dai-loan': 'Đài Loan',
  'an-do': 'Ấn Độ',
  'anh': 'Anh',
  'phap': 'Pháp',
  'duc': 'Đức',
  'tay-ban-nha': 'Tây Ban Nha',
  'y': 'Ý',
  'canada': 'Canada',
  'uc': 'Úc',
  'nga': 'Nga',
  'mexico': 'Mexico',
  'brazil': 'Brazil',
  'philippines': 'Philippines',
  'indonesia': 'Indonesia',
  'malaysia': 'Malaysia',
};

export default function CountryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const page = Number(searchParams.get('page') || 1);
  const label = COUNTRY_NAMES[slug] || slug;

  const { data, isLoading } = useQuery({
    queryKey: ['country', slug, page],
    queryFn: () => movieApi.getByCountry(slug, page).then((r) => r.data),
  });

  const films: FilmItem[] = data?.data?.items || [];
  const totalPages = data?.data?.params?.pagination?.totalPages || 1;

  return (
    <div className="container">
      <div className="section-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>Quốc Gia: {label}</h1>
        <p className="text-muted text-sm">Trang {page}</p>
      </div>

      {isLoading ? (
        <div className="grid-films-lg">
          {Array.from({ length: 24 }).map((_, i) => <FilmCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid-films-lg">
          {films.length > 0 ? (
            films.map((f) => <FilmCard key={f.slug} film={f} />)
          ) : (
            <div style={{ padding: '4rem 1rem', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>
              Không có bộ phim nào thuộc quốc gia này.
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <button className="page-btn" onClick={() => router.push(`/country/${slug}?page=${page - 1}`)}>‹</button>
          )}
          {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
            const p = Math.max(1, page - 3) + i;
            if (p > totalPages) return null;
            return (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`}
                onClick={() => router.push(`/country/${slug}?page=${p}`)}>
                {p}
              </button>
            );
          })}
          {page < totalPages && (
            <button className="page-btn" onClick={() => router.push(`/country/${slug}?page=${page + 1}`)}>›</button>
          )}
        </div>
      )}
    </div>
  );
}
