'use client';
import { useQuery } from '@tanstack/react-query';
import { movieApi } from '@/lib/api';

export default function TestPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['test-latest'],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
  });

  const films = data?.items || [];

  if (error) {
    return <div>Error: {String(error)}</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Test API - Phim Mới</h1>
      <p>Tổng số phim: {films.length}</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '1rem',
        }}
      >
        {films.slice(0, 12).map((film: any) => (
          <div key={film.slug} style={{ border: '1px solid #333', padding: '1rem' }}>
            <img
              src={film.thumb_url}
              alt={film.name}
              style={{ width: '100%', height: '200px', objectFit: 'cover' }}
            />
            <h3 style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{film.name}</h3>
            <p style={{ fontSize: '0.8rem', color: '#888' }}>{film.year}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
