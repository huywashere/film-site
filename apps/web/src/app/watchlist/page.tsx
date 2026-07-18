'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, Trash2 } from 'lucide-react';
import { watchlistApi } from '@/lib/api';
import { FilmCard, FilmItem } from '@/components/film/FilmCard';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { Suspense } from 'react';

function WatchlistContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page') || 1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['watchlist', page],
    queryFn: () => watchlistApi.get(page).then((r) => r.data),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <Bookmark size={48} style={{ margin: '0 auto var(--space-md)', opacity: 0.3 }} />
        <h2 style={{ marginBottom: 'var(--space-md)' }}>Bạn chưa đăng nhập</h2>
        <Link href="/login" className="btn btn-primary">Đăng nhập</Link>
      </div>
    );
  }

  const items = data?.items || [];
  const totalPages = data?.pages || 1;

  return (
    <div className="container">
      <div className="section-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bookmark size={28} style={{ color: 'var(--accent)' }} /> Watchlist của tôi
        </h1>
        {data?.total > 0 && (
          <span className="badge badge-muted">{data.total} phim</span>
        )}
      </div>

      {isLoading ? (
        <div className="grid-films-lg">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 280, borderRadius: 12 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📭</p>
          <p className="text-muted">Watchlist của bạn đang trống</p>
          <Link href="/films" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)', display: 'inline-flex' }}>
            Khám phá phim
          </Link>
        </div>
      ) : (
        <>
          <div className="grid-films-lg">
            {items.map((item: any) => {
              const film: FilmItem = {
                slug: item.movie.id,
                name: item.movie.title,
                thumb_url: item.movie.thumbUrl || item.movie.posterUrl,
                year: item.movie.year,
                type: item.movie.type,
              };
              return <FilmCard key={item.id} film={film} />;
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => router.push(`/watchlist?page=${p}`)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function WatchlistPage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <Bookmark size={48} style={{ margin: '0 auto var(--space-md)', opacity: 0.3 }} />
        <h2 style={{ marginBottom: 'var(--space-md)' }}>Đang tải watchlist...</h2>
      </div>
    }>
      <WatchlistContent />
    </Suspense>
  );
}
