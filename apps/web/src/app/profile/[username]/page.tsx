'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { FilmCard, FilmItem } from '@/components/film/FilmCard';
import { Calendar, BookOpen, Bookmark, Users } from 'lucide-react';

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => api.get(`/users/${username}`).then((r) => r.data),
  });

  const { data: activity } = useQuery({
    queryKey: ['activity', username],
    queryFn: () => api.get(`/users/${username}/activity`).then((r) => r.data),
  });

  if (isLoading) return (
    <div className="container" style={{ paddingTop: 40 }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div className="skeleton" style={{ width: 100, height: 100, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 28, width: 200, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 16, width: 300 }} />
        </div>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
      <p className="text-muted">Không tìm thấy người dùng</p>
    </div>
  );

  return (
    <div className="container">
      {/* Profile Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-2xl)',
        marginBottom: 'var(--space-2xl)',
        display: 'flex',
        gap: 'var(--space-xl)',
        alignItems: 'flex-start',
      }}>
        <img
          src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.username}&background=14181c&color=00c030&size=100`}
          alt={profile.username}
          className="avatar"
          style={{ width: 96, height: 96 }}
        />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: 4 }}>
            {profile.displayName || profile.username}
          </h1>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-md)' }}>@{profile.username}</p>
          {profile.bio && <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>{profile.bio}</p>}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
            {[
              { icon: Bookmark, label: 'Watchlist', count: profile._count?.watchlist || 0 },
              { icon: BookOpen, label: 'Đánh giá', count: profile._count?.reviews || 0 },
              { icon: Users, label: 'Followers', count: profile._count?.followers || 0 },
              { icon: Users, label: 'Following', count: profile._count?.following || 0 },
            ].map(({ icon: Icon, label, count }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{count}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon size={11} /> {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {activity?.length > 0 && (
        <section style={{ marginBottom: 'var(--space-2xl)' }}>
          <div className="section-header">
            <h2 className="section-title">Đánh Giá Gần Đây</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {activity.slice(0, 5).map((r: any) => (
              <div key={r.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                display: 'flex',
                gap: 'var(--space-md)',
                alignItems: 'flex-start',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{r.movie?.title || r.movieId}</span>
                    {r.rating && (
                      <span style={{ color: 'var(--star-color)', fontSize: '0.8rem' }}>{'★'.repeat(Math.round(r.rating))}</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }} className="line-clamp-3">
                    {r.content}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} /> {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
