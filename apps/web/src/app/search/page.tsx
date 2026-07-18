'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Search, X } from 'lucide-react';
import { movieApi } from '@/lib/api';
import { FilmCard, FilmItem, FilmCardSkeleton } from '@/components/film/FilmCard';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [input, setInput] = useState(searchParams.get('q') || '');
  const query = searchParams.get('q') || '';
  const page = Number(searchParams.get('page') || 1);

  const { data, isLoading } = useQuery({
    queryKey: ['search', query, page],
    queryFn: () => movieApi.search(query, page).then((r) => r.data),
    enabled: !!query,
  });

  const films: FilmItem[] = data?.data?.items || [];
  const totalPages: number = data?.data?.params?.pagination?.totalPages || 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      router.push(`/search?q=${encodeURIComponent(input.trim())}`);
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: 640, margin: '0 auto var(--space-2xl)' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
          Tìm kiếm phim
        </h1>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tên phim, diễn viên, đạo diễn..."
              className="input"
              style={{ paddingLeft: 40 }}
            />
          </div>
          <button type="submit" className="btn btn-primary">Tìm</button>
        </form>
      </div>

      {query && (
        <>
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <p className="text-muted text-sm">
              {isLoading ? 'Đang tìm...' : `Kết quả cho "${query}" — ${films.length} phim`}
            </p>
          </div>

          {isLoading ? (
            <div className="grid-films-lg">
              {Array.from({ length: 12 }).map((_, i) => <FilmCardSkeleton key={i} />)}
            </div>
          ) : films.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0' }}>
              <p style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🎬</p>
              <p className="text-muted">Không tìm thấy phim nào cho "{query}"</p>
            </div>
          ) : (
            <>
              <div className="grid-films-lg">
                {films.map((film) => (
                  <FilmCard key={film.slug} film={film} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={`page-btn ${p === page ? 'active' : ''}`}
                      onClick={() => router.push(`/search?q=${encodeURIComponent(query)}&page=${p}`)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {!query && (
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0', color: 'var(--text-muted)' }}>
          <Search size={48} style={{ margin: '0 auto var(--space-md)', opacity: 0.3 }} />
          <p>Nhập từ khóa để tìm phim bạn muốn xem</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ textAlign: 'center', padding: 'var(--space-3xl) 0' }}>
        <p className="text-muted">Đang tải trang tìm kiếm...</p>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
