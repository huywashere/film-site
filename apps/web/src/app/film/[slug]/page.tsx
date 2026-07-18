'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import { useState } from 'react';
import {
  Play, Bookmark, Share2, Clock, Calendar,
  Globe, Users
} from 'lucide-react';
import { movieApi, watchlistApi, ratingsApi, reviewsApi } from '@/lib/api';
import { StarRating } from '@/components/film/StarRating';
import { resolveImageUrl } from '@/components/film/FilmCard';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/providers/ToastProvider';
import styles from './page.module.css';

// ── Cast Card ────────────────────────────────────────────────
function CastCard({ name }: { name: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['cast-image', name],
    queryFn: async () => {
      const res = await fetch(`/api/cast-image?name=${encodeURIComponent(name)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.url;
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const imageUrl = data && data !== 'placeholder' ? data : null;

  return (
    <div className={styles.castCard} title={name}>
      <div className={styles.castAvatarWrapper}>
        {isLoading ? (
          <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className={styles.castAvatar}
            loading="lazy"
          />
        ) : (
          <div className={styles.castInitials}>{initials || '?'}</div>
        )}
      </div>
      <span className={styles.castName}>{name}</span>
    </div>
  );
}

// ── Episode List ─────────────────────────────────────────────
function EpisodeList({ episodes, slug }: { episodes: any[]; slug: string }) {
  const [serverIdx, setServerIdx] = useState(0);
  if (!episodes?.length) return null;

  const server = episodes[serverIdx];
  const items = server?.server_data || [];

  return (
    <div className={styles.episodeSection}>
      <h3 className={styles.episodeTitle}>Danh Sách Tập</h3>

      {/* Server tabs */}
      {episodes.length > 1 && (
        <div className={styles.serverTabs}>
          {episodes.map((s: any, i: number) => (
            <button
              key={i}
              className={`${styles.serverTab} ${i === serverIdx ? styles.serverTabActive : ''}`}
              onClick={() => setServerIdx(i)}
            >
              {s.server_name}
            </button>
          ))}
        </div>
      )}

      {/* Episode grid */}
      <div className={styles.episodeGrid}>
        {items.map((ep: any, i: number) => (
          <Link
            key={ep.slug || i}
            href={`/watch/${slug}?ep=${ep.slug || ep.name}`}
            className={styles.episodeBtn}
          >
            {ep.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Review Item ──────────────────────────────────────────────
function ReviewItem({ review }: { review: any }) {
  return (
    <div className={styles.reviewItem}>
      <div className={styles.reviewHeader}>
        <img
          src={review.user?.avatarUrl || `https://ui-avatars.com/api/?name=${review.user?.username || 'U'}&background=14181c&color=00c030&size=32`}
          alt=""
          className="avatar avatar-sm"
        />
        <div>
          <p className={styles.reviewUsername}>{review.user?.displayName || review.user?.username}</p>
          <p className="text-xs text-muted">
            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
        {review.rating && (
          <div style={{ marginLeft: 'auto' }}>
            <StarRating value={review.rating} readonly size={14} />
          </div>
        )}
      </div>
      <p className={styles.reviewText}>{review.content}</p>
    </div>
  );
}

// ── Write Review ─────────────────────────────────────────────
function WriteReview({ movieId }: { movieId: string }) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className={styles.reviewLoginPrompt}>
        <Link href="/login" className="btn btn-primary btn-sm">Đăng nhập</Link>
        <span className="text-muted text-sm"> để viết đánh giá</span>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await reviewsApi.create({ movieId, content: content.trim(), rating: rating || undefined });
      setContent('');
      setRating(0);
      toast('Đã đăng đánh giá!', 'success');
    } catch {
      toast('Không thể đăng đánh giá', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.writeReview}>
      <div className={styles.writeReviewHeader}>
        <img
          src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=14181c&color=00c030`}
          alt=""
          className="avatar avatar-sm"
        />
        <StarRating value={rating} onChange={setRating} size={18} />
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Chia sẻ cảm nhận của bạn về bộ phim này..."
        className={`input ${styles.reviewTextarea}`}
        rows={3}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="btn btn-primary btn-sm"
        >
          {submitting ? 'Đang đăng...' : 'Đăng Đánh Giá'}
        </button>
      </div>
    </form>
  );
}

export default function FilmDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [myRating, setMyRating] = useState(0);

  // Fetch film detail — từ KKPhim (không cần backend)
  const { data, isLoading, error } = useQuery({
    queryKey: ['film', slug],
    queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
  });

  // Fetch reviews — cần backend, graceful fallback
  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', slug],
    queryFn: () => reviewsApi.getByMovie(slug).then((r) => r.data).catch(() => ({ reviews: [], total: 0 })),
    retry: false,
  });

  // Fetch rating — cần backend, graceful fallback
  const { data: ratingData } = useQuery({
    queryKey: ['rating', slug],
    queryFn: () => ratingsApi.getAverage(slug).then((r) => r.data).catch(() => ({ average: 0, count: 0 })),
    retry: false,
  });

  const prefetchWatchData = () => {
    queryClient.prefetchQuery({
      queryKey: ['film-ophim', slug],
      queryFn: () => fetch(`/api/ophim/phim/${slug}`)
        .then((res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .catch(() => null),
      staleTime: 5 * 60 * 1000,
    });
  };

  if (isLoading) return <FilmDetailSkeleton />;
  if (error || !data) return (
    <div className="container" style={{ paddingTop: 40, textAlign: 'center' }}>
      <p className="text-muted">Không tìm thấy phim</p>
    </div>
  );

  const film = data.movie || data;
  const episodes = data.episodes || [];

  const posterUrl = resolveImageUrl(film.thumb_url) || resolveImageUrl(film.poster_url) || undefined;

  const handleWatchlist = async () => {
    if (!user) { toast('Bạn cần đăng nhập', 'error'); return; }
    try {
      if (inWatchlist) {
        await watchlistApi.remove(slug);
        setInWatchlist(false);
        toast('Đã xóa khỏi watchlist');
      } else {
        await watchlistApi.add(slug, { title: film.name, thumbUrl: posterUrl, type: film.type, year: film.year });
        setInWatchlist(true);
        toast('Đã thêm vào watchlist!', 'success');
      }
    } catch { toast('Có lỗi xảy ra', 'error'); }
  };

  const handleRate = async (score: number) => {
    if (!user) { toast('Bạn cần đăng nhập để đánh giá', 'error'); return; }
    try {
      await ratingsApi.rate(slug, score);
      setMyRating(score);
      toast(`Đã đánh giá ${score} sao!`, 'success');
    } catch { toast('Không thể đánh giá', 'error'); }
  };

  const reviews = reviewsData?.reviews || [];
  const avgRating = ratingData?.average || 0;
  const ratingCount = ratingData?.count || 0;

  const firstEp = episodes?.[0]?.server_data?.[0];
  const watchLink = firstEp
    ? `/watch/${slug}?ep=${firstEp.slug || firstEp.name}`
    : `/watch/${slug}`;

  return (
    <div>
      {/* Backdrop */}
      {posterUrl && (
        <div className={styles.backdrop}>
          <NextImage src={posterUrl} alt="" fill sizes="100vw" style={{ objectFit: 'cover', objectPosition: 'center top' }} unoptimized />
          <div className={styles.backdropGradient} />
        </div>
      )}

      <div className="container">
        <div className={styles.filmLayout}>
          {/* Left: Poster */}
          <aside className={styles.posterCol}>
            <div className={styles.posterWrapper}>
              {posterUrl ? (
                <NextImage src={posterUrl} alt={film.name} fill sizes="300px" style={{ objectFit: 'cover' }} unoptimized />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '4rem' }}>
                  🎬
                </div>
              )}
            </div>

            {/* Rating */}
            <div className={styles.ratingBox}>
              <p className={styles.ratingLabel}>Đánh giá của bạn</p>
              <StarRating value={myRating} onChange={handleRate} size={22} />
              {avgRating > 0 && (
                <p className="text-xs text-muted" style={{ marginTop: 6 }}>
                  TB: {avgRating.toFixed(1)} ★ ({ratingCount} lượt)
                </p>
              )}
            </div>

            {/* Actions */}
            <div className={styles.sideActions}>
              <Link 
                href={watchLink} 
                className="btn btn-primary w-full" 
                style={{ justifyContent: 'center' }}
                onMouseEnter={prefetchWatchData}
              >
                <Play size={16} fill="currentColor" /> Xem Ngay
              </Link>
              <button
                className={`btn ${inWatchlist ? 'btn-secondary' : 'btn-secondary'} w-full`}
                onClick={handleWatchlist}
                style={{
                  justifyContent: 'center',
                  color: inWatchlist ? 'var(--accent)' : undefined,
                  borderColor: inWatchlist ? 'var(--accent)' : undefined,
                }}
              >
                <Bookmark size={16} fill={inWatchlist ? 'currentColor' : 'none'} />
                {inWatchlist ? 'Đã lưu' : 'Watchlist'}
              </button>
              <button className="btn btn-ghost w-full" style={{ justifyContent: 'center' }}>
                <Share2 size={16} /> Chia sẻ
              </button>
            </div>
          </aside>

          {/* Right: Info */}
          <div className={styles.infoCol}>
            {/* Title */}
            <div className={styles.filmTitleBlock}>
              <h1 className={styles.filmTitle}>{film.name}</h1>
              {film.origin_name && (
                <p className={styles.filmOriginTitle}>{film.origin_name}</p>
              )}

              {/* Meta badges */}
              <div className={styles.metaBadges}>
                {film.year && <span className="badge badge-muted"><Calendar size={11} /> {film.year}</span>}
                {film.quality && <span className="badge badge-accent">{film.quality}</span>}
                {film.lang && <span className="badge badge-muted"><Globe size={11} /> {film.lang}</span>}
                {film.time && <span className="badge badge-muted"><Clock size={11} /> {film.time}</span>}
                {film.episode_current && (
                  <span className="badge badge-gold">
                    {film.episode_current === 'Full' ? 'Hoàn Tất' : `Tập ${film.episode_current}`}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {film.content && (
              <div className={styles.description}>
                <p dangerouslySetInnerHTML={{ __html: film.content.replace(/<[^>]*>/g, '') }} />
              </div>
            )}

            {/* Cast Section */}
            {film.director?.length > 0 && (
              <div className={styles.castSection}>
                <h3 className={styles.castSectionTitle}>Đạo diễn</h3>
                <div className={styles.castGrid}>
                  {film.director.map((name: string) => (
                    <CastCard key={name} name={name} />
                  ))}
                </div>
              </div>
            )}

            {film.actor?.length > 0 && (
              <div className={styles.castSection}>
                <h3 className={styles.castSectionTitle}>Diễn viên</h3>
                <div className={styles.castGrid}>
                  {film.actor.slice(0, 10).map((name: string) => (
                    <CastCard key={name} name={name} />
                  ))}
                </div>
              </div>
            )}

            {/* Film Info Table */}
            <div className={styles.filmMeta}>
              {film.category?.length > 0 && (
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>Thể loại</span>
                  <span className={styles.metaValue}>
                    {film.category.map((c: any) => (
                      <Link key={c.id} href={`/genre/${c.slug}`} className={styles.metaTag}>
                        {c.name}
                      </Link>
                    ))}
                  </span>
                </div>
              )}
              {film.country?.length > 0 && (
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>Quốc gia</span>
                  <span className={styles.metaValue}>
                    {film.country.map((c: any) => (
                      <Link key={c.id} href={`/country/${c.slug}`} className={styles.metaTag}>
                        {c.name}
                      </Link>
                    ))}
                  </span>
                </div>
              )}
            </div>

            {/* Episodes */}
            <EpisodeList episodes={episodes} slug={slug} />

            {/* Reviews */}
            <div className={styles.reviewsSection}>
              <div className="section-header">
                <h2 className="section-title">
                  <Users size={14} /> Đánh Giá ({reviewsData?.total || 0})
                </h2>
              </div>

              <WriteReview movieId={slug} />

              <div className={styles.reviewsList}>
                {reviews.map((r: any) => <ReviewItem key={r.id} review={r} />)}
                {reviews.length === 0 && (
                  <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '2rem 0' }}>
                    Chưa có đánh giá nào. Hãy là người đầu tiên!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilmDetailSkeleton() {
  return (
    <div className="container">
      <div style={{ display: 'flex', gap: '2rem', paddingTop: '4rem' }}>
        <div className="skeleton" style={{ width: 240, height: 360, borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton" style={{ height: 40, width: '60%' }} />
          <div className="skeleton" style={{ height: 20, width: '40%' }} />
          <div className="skeleton" style={{ height: 100 }} />
        </div>
      </div>
    </div>
  );
}
