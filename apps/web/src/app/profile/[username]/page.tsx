'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api, watchHistoryApi } from '@/lib/api';
import { FilmCard, FilmItem } from '@/components/film/FilmCard';
import { Calendar, BookOpen, Bookmark, Users, History, Play, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const user = useAuthStore((s) => s.user);
  const isOwnProfile = user?.username === username || user?.email === username;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => api.get(`/users/${username}`).then((r) => r.data),
  });

  const { data: activity } = useQuery({
    queryKey: ['activity', username],
    queryFn: () => api.get(`/users/${username}/activity`).then((r) => r.data),
  });

  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['watch-history', username],
    queryFn: () => watchHistoryApi.getHistory(1, 10).then((r) => r.data),
    enabled: isOwnProfile,
  });

  if (isLoading)
    return (
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

  if (!profile)
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p className="text-muted">Không tìm thấy người dùng</p>
      </div>
    );

  return (
    <div className="container">
      {/* Profile Header */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-2xl)',
          marginBottom: 'var(--space-2xl)',
          display: 'flex',
          gap: 'var(--space-xl)',
          alignItems: 'flex-start',
        }}
      >
        <img
          src={
            profile.avatarUrl ||
            `https://ui-avatars.com/api/?name=${profile.username}&background=14181c&color=00c030&size=100`
          }
          alt={profile.username}
          className="avatar"
          style={{ width: 96, height: 96 }}
        />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: 4 }}>
            {profile.displayName || profile.username}
          </h1>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-md)' }}>
            @{profile.username}
          </p>
          {profile.bio && (
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}
            >
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
            {[
              { icon: Bookmark, label: 'Watchlist', count: profile._count?.watchlist || 0 },
              { icon: BookOpen, label: 'Đánh giá', count: profile._count?.reviews || 0 },
              { icon: Users, label: 'Followers', count: profile._count?.followers || 0 },
              { icon: Users, label: 'Following', count: profile._count?.following || 0 },
            ].map(({ icon: Icon, label, count }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {count}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Icon size={11} /> {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Watch History (own profile only) ── */}
      {isOwnProfile && historyData?.items?.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2 border-l-4 border-netflixRed pl-3">
              <History size={20} className="text-netflixRed" /> Lich su xem
            </h2>
            <button
              onClick={async () => {
                await watchHistoryApi.clearAll();
                refetchHistory();
              }}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} /> Xoa tat ca
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {historyData.items.map((item: any) => {
              const pct = item.duration > 0 ? Math.min(100, (item.progress / item.duration) * 100) : 0;
              return (
                <Link
                  key={item.id}
                  href={`/watch/${item.movieId}${item.episode ? `?ep=${item.episode}` : ''}`}
                  className="flex gap-4 bg-card/30 hover:bg-card/60 border border-border/30 hover:border-white/20 rounded-xl p-3 transition-all group"
                >
                  {item.movieThumb ? (
                    <img
                      src={item.movieThumb}
                      alt={item.movieTitle}
                      className="w-16 h-24 object-cover rounded-lg flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-white/5 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <Play size={20} className="opacity-30" />
                    </div>
                  )}
                  <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0">
                    <p className="font-bold text-sm text-white line-clamp-2 leading-snug">{item.movieTitle}</p>
                    {item.episode && (
                      <p className="text-xs text-neutral-400">Tap {item.episode}</p>
                    )}
                    {/* Progress bar */}
                    <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-netflixRed rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-neutral-500">
                      {Math.round(pct)}% • {new Date(item.watchedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {activity?.length > 0 && (
        <section style={{ marginBottom: 'var(--space-2xl)' }}>
          <div className="section-header">
            <h2 className="section-title">Danh Gia Gan Day</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {activity.slice(0, 5).map((r: any) => (
              <div
                key={r.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-md)',
                  display: 'flex',
                  gap: 'var(--space-md)',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {r.movie?.title || r.movieId}
                    </span>
                    {r.rating && (
                      <span style={{ color: 'var(--star-color)', fontSize: '0.8rem' }}>
                        {'★'.repeat(Math.round(r.rating))}
                      </span>
                    )}
                  </div>
                  <p
                    style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}
                    className="line-clamp-3"
                  >
                    {r.content}
                  </p>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginTop: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
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
