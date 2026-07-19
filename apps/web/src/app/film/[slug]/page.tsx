'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Bookmark, Share2, Clock, Calendar, Globe, Users, Loader2, Plus, Check } from 'lucide-react';
import { movieApi, watchlistApi, ratingsApi, reviewsApi } from '@/lib/api';
import { StarRating } from '@/components/film/StarRating';
import { resolveImageUrl } from '@/components/film/FilmCard';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/providers/ToastProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
    <div className="flex flex-col items-center text-center space-y-2 p-2 bg-card/60 rounded border border-border/40 shadow hover:border-netflixRed hover:scale-105 transition-all duration-300 w-28 md:w-32 flex-shrink-0" title={name}>
      <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border border-border/40 bg-muted flex items-center justify-center">
        {isLoading ? (
          <div className="w-full h-full bg-neutral-800 animate-pulse" />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-sm font-bold text-neutral-400">{initials || '?'}</span>
        )}
      </div>
      <span className="text-[11px] font-medium text-muted-foreground truncate w-full px-1">{name}</span>
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
    <div className="flex flex-col space-y-4 pt-6 pb-4">
      <h3 className="text-lg font-bold text-white tracking-wide border-l-4 border-netflixRed pl-2">
        Danh Sách Tập Phim
      </h3>

      {/* Server selection tabs */}
      {episodes.length > 1 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {episodes.map((s: any, i: number) => (
            <button
              key={i}
              className={cn(
                "px-4 py-1.5 rounded text-xs font-semibold border transition-all",
                i === serverIdx
                  ? "bg-netflixRed border-netflixRed text-white"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setServerIdx(i)}
            >
              {s.server_name}
            </button>
          ))}
        </div>
      )}

      {/* Episode grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-60 overflow-y-auto pr-1">
        {items.map((ep: any, i: number) => (
          <Link
            key={ep.slug || i}
            href={`/watch/${slug}?ep=${ep.slug || ep.name}`}
            className="flex items-center justify-center bg-card hover:bg-netflixRed border border-border hover:border-netflixRed text-muted-foreground hover:text-white rounded py-2 text-xs font-bold transition-all"
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
    <div className="p-4 bg-card/40 border border-border/40 rounded flex flex-col space-y-2.5">
      <div className="flex items-center space-x-3">
        <img
          src={
            review.user?.avatarUrl ||
            `https://ui-avatars.com/api/?name=${review.user?.username || 'U'}&background=E50914&color=ffffff&size=32`
          }
          alt=""
          className="w-8 h-8 rounded-full border border-border/40 object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {review.user?.displayName || review.user?.username}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
        {review.rating && (
          <div className="flex-shrink-0">
            <StarRating value={review.rating} readonly size={12} />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pl-11">{review.content}</p>
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
      <div className="p-4 bg-neutral-900/30 border border-white/5 rounded flex items-center justify-center space-x-2">
        <Link href="/login" className="bg-netflixRed hover:bg-[#C11119] text-white font-bold text-xs px-4 py-2 rounded transition-all">
          Đăng nhập
        </Link>
        <span className="text-neutral-400 text-xs"> để viết đánh giá</span>
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
    <form onSubmit={handleSubmit} className="flex flex-col space-y-3 p-4 bg-card/60 border border-border rounded">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center space-x-2">
          <img
            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=E50914&color=ffffff`}
            alt=""
            className="w-8 h-8 rounded-full border border-border/40 object-cover"
          />
          <span className="text-xs font-semibold text-foreground">{user.displayName || user.username}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[10px] text-muted-foreground mr-1.5">Đánh giá sao:</span>
          <StarRating value={rating} onChange={setRating} size={16} />
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Chia sẻ cảm nhận của bạn về bộ phim này..."
        className="w-full bg-background border border-border rounded p-3 text-xs text-foreground placeholder:text-neutral-500 focus:border-netflixRed transition-colors"
        rows={3}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="bg-netflixRed hover:bg-[#C11119] text-white font-bold text-xs px-4 py-2 rounded transition-colors disabled:opacity-50"
        >
          {submitting ? 'Đang đăng...' : 'Đăng Đánh Giá'}
        </button>
      </div>
    </form>
  );
}

// ── Main Detail Page ──────────────────────────────────────────
export default function FilmDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'EPISODES' | 'REVIEWS'>('DETAILS');

  // Fetch film detail — từ proxy
  const { data, isLoading, error } = useQuery({
    queryKey: ['film', slug],
    queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
  });

  // Fetch reviews — graceful fallback
  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', slug],
    queryFn: () =>
      reviewsApi
        .getByMovie(slug)
        .then((r) => r.data)
        .catch(() => ({ reviews: [], total: 0 })),
    retry: false,
  });

  // Fetch rating — graceful fallback
  const { data: ratingData } = useQuery({
    queryKey: ['rating', slug],
    queryFn: () =>
      ratingsApi
        .getAverage(slug)
        .then((r) => r.data)
        .catch(() => ({ average: 0, count: 0 })),
    retry: false,
  });

  const prefetchWatchData = () => {
    queryClient.prefetchQuery({
      queryKey: ['film-ophim', slug],
      queryFn: () =>
        fetch(`/api/ophim/phim/${slug}`)
          .then((res) => {
            if (!res.ok) return null;
            return res.json();
          })
          .catch(() => null),
      staleTime: 5 * 60 * 1000,
    });
  };

  if (isLoading) return <FilmDetailSkeleton />;
  if (error || !data)
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <p className="text-neutral-400">Không tìm thấy phim</p>
      </div>
    );

  const film = data.movie || data;
  const episodes = data.episodes || [];

  const posterUrl =
    resolveImageUrl(film.poster_url) || resolveImageUrl(film.thumb_url) || undefined;

  const { cleanContent, directors, actors } = useMemo(() => {
    const parseList = (val: any) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.filter((v: any) => v && v.trim() !== '');
      if (typeof val === 'string') return val.split(',').map((v: string) => v.trim()).filter(Boolean);
      return [];
    };

    const d = parseList(film?.director);
    const a = parseList(film?.actor);

    let content = film?.content || '';
    // Fast check for subtitle pattern to avoid massive regex freezing the browser
    if (content.includes('-->') && content.length > 1000) {
      return { cleanContent: 'Đang cập nhật nội dung mô tả cho phim này...', directors: d, actors: a };
    }

    content = content.replace(/<[^>]*>/g, '');
    return { cleanContent: content, directors: d, actors: a };
  }, [film]);

  const handleWatchlist = async () => {
    if (!user) {
      toast('Bạn cần đăng nhập', 'error');
      return;
    }
    try {
      if (inWatchlist) {
        await watchlistApi.remove(slug);
        setInWatchlist(false);
        toast('Đã xóa khỏi watchlist');
      } else {
        await watchlistApi.add(slug, {
          title: film.name,
          thumbUrl: posterUrl,
          type: film.type,
          year: film.year,
        });
        setInWatchlist(true);
        toast('Đã thêm vào watchlist!', 'success');
      }
    } catch {
      toast('Có lỗi xảy ra', 'error');
    }
  };

  const handleRate = async (score: number) => {
    if (!user) {
      toast('Bạn cần đăng nhập để đánh giá', 'error');
      return;
    }
    try {
      await ratingsApi.rate(slug, score);
      setMyRating(score);
      toast(`Đã đánh giá ${score} sao!`, 'success');
    } catch {
      toast('Không thể đánh giá', 'error');
    }
  };

  const reviews = reviewsData?.reviews || [];
  const avgRating = ratingData?.average || 0;
  const ratingCount = ratingData?.count || 0;

  const firstEp = episodes?.[0]?.server_data?.[0];
  const watchLink = firstEp
    ? `/watch/${slug}?ep=${firstEp.slug || firstEp.name}`
    : `/watch/${slug}`;

  return (
    <div className="bg-[#060814] min-h-screen text-foreground pb-24">
      {/* Full Screen Backdrop */}
      {posterUrl && (
        <div className="absolute top-0 left-0 right-0 h-[60vh] md:h-[75vh] w-full z-0 overflow-hidden">
          <NextImage src={posterUrl} alt="" fill sizes="100vw" className="object-cover object-top opacity-70" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060814] via-[#060814]/80 to-transparent w-full md:w-[60%]" />
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#060814] to-transparent" />
        </div>
      )}

      {/* Content Container */}
      <div className="relative z-10 container mx-auto px-6 md:px-12 pt-[18vh] md:pt-[22vh]">
        <div className="max-w-3xl flex flex-col space-y-3 md:space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-widest font-sans drop-shadow-2xl">
            {film.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-bold text-white/90">
            {film.quality && <span className="bg-white/10 px-2 py-0.5 rounded shadow-sm backdrop-blur-md">{film.quality}</span>}
            {film.lang && <span className="border border-white/40 px-2 py-0.5 rounded shadow-sm">{film.lang}</span>}
            <span className="text-white/80">{film.year} • {film.time} • {film.category?.map((c: any) => c.name).join(', ')}</span>
          </div>

          {cleanContent && (
            <div className="mt-2 text-sm md:text-base text-white/90 leading-relaxed max-w-2xl drop-shadow-md line-clamp-4">
              <p>{cleanContent}</p>
            </div>
          )}

          <div className="flex items-center space-x-4 pt-6">
            <Link
              href={watchLink}
              className="bg-white text-black hover:bg-neutral-200 px-8 py-3.5 rounded font-black tracking-wider uppercase text-sm shadow-xl flex items-center space-x-2 transition-transform hover:scale-105"
              onMouseEnter={prefetchWatchData}
            >
              <Play size={16} fill="currentColor" />
              <span>Continue</span>
            </Link>
            
            <button className="bg-black/40 hover:bg-white/20 text-white px-8 py-3.5 rounded font-black tracking-wider uppercase text-sm border border-white/20 backdrop-blur-md transition-colors">
              Trailer
            </button>
            
            <button 
              onClick={handleWatchlist} 
              className={cn("w-12 h-12 rounded-full border border-white/30 flex items-center justify-center backdrop-blur-md transition-colors text-white", inWatchlist ? "bg-white/30 text-white" : "bg-black/40 hover:bg-white/20")}
            >
              {inWatchlist ? <Check size={20} /> : <Plus size={20} />}
            </button>

            <button className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center bg-black/40 hover:bg-white/20 backdrop-blur-md transition-colors text-white">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-10 flex items-center space-x-8 border-b border-white/10 pb-0">
          {['DETAILS', 'EPISODES', 'REVIEWS'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn("pb-4 text-sm font-bold tracking-widest uppercase transition-colors relative", activeTab === tab ? "text-white" : "text-neutral-500 hover:text-white")}
            >
              {tab === 'DETAILS' ? 'Details' : tab === 'EPISODES' ? 'Episodes' : 'Reviews'}
              {activeTab === tab && (
                <motion.div 
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-t-sm" 
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-10 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
          {activeTab === 'DETAILS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-sm text-neutral-300">
              <div className="flex flex-col space-y-6">
                <div>
                  <h3 className="text-white font-bold text-xl mb-3">{film.name}</h3>
                  <p className="leading-relaxed whitespace-pre-wrap">{cleanContent}</p>
                </div>
                {film.origin_name && (
                  <p className="text-neutral-500 italic">Tên gốc: {film.origin_name}</p>
                )}
                
                {actors.length > 0 && (
                  <div className="mt-6">
                    <span className="block text-white font-bold mb-3 uppercase tracking-wider text-xs">Diễn viên</span>
                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                      {actors.map((actor, idx) => (
                        <CastCard key={idx} name={actor} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col space-y-4 border-t border-white/5 md:border-none pt-6 md:pt-0">
                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <span className="block text-neutral-500 mb-1.5">Thời lượng:</span>
                    <span className="text-white font-semibold">{film.time || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-500 mb-1.5">Năm phát hành:</span>
                    <span className="text-white font-semibold">{film.year || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-neutral-500 mb-1.5">Thể loại:</span>
                    <span className="text-white font-semibold">{film.category?.map((c: any) => c.name).join(', ')}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-neutral-500 mb-1.5">Độ tuổi:</span>
                    <span className="inline-block border border-white/40 px-2.5 py-1 rounded-sm font-bold text-white text-xs tracking-wider">
                      {film.type === 'series' ? 'TV-MA' : 'PG-13'}
                    </span>
                  </div>
                  
                  {directors.length > 0 && (
                    <div className="col-span-2 mt-4">
                      <span className="block text-neutral-500 mb-1.5">Đạo diễn:</span>
                      <span className="text-white font-semibold">{directors.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'EPISODES' && (
            <div className="bg-card/30 border border-border rounded-lg p-6">
              <EpisodeList episodes={episodes} slug={slug} />
            </div>
          )}

          {activeTab === 'REVIEWS' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 flex flex-col space-y-8">
                <WriteReview movieId={slug} />
                <div className="flex flex-col space-y-4">
                  {reviews.map((r: any) => (
                    <ReviewItem key={r.id} review={r} />
                  ))}
                  {reviews.length === 0 && (
                    <div className="text-neutral-500 text-sm">Chưa có đánh giá nào.</div>
                  )}
                </div>
              </div>
              <div className="lg:col-span-1 bg-card/30 border border-border rounded-lg p-8 h-fit flex flex-col items-center text-center">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Đánh giá trung bình</h3>
                <StarRating value={myRating || avgRating} onChange={handleRate} size={32} />
                {avgRating > 0 && (
                  <p className="text-sm text-neutral-400 mt-3">
                    <span className="text-white font-bold text-2xl">{avgRating.toFixed(1)} ★</span> <br /> ({ratingCount} lượt)
                  </p>
                )}
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function FilmDetailSkeleton() {
  return (
    <div className="bg-[#060814] min-h-screen text-white pb-24">
      <div className="w-full h-[85vh] md:h-screen bg-neutral-900 animate-pulse" />
      <div className="container mx-auto px-6 md:px-12 relative -mt-[40vh] md:-mt-[50vh] z-20">
        <div className="max-w-3xl flex flex-col space-y-6">
          <div className="h-16 md:h-24 bg-neutral-800 animate-pulse rounded w-3/4" />
          <div className="h-6 bg-neutral-800 animate-pulse rounded w-1/2" />
          <div className="h-20 bg-neutral-800 animate-pulse rounded w-full max-w-2xl mt-4" />
          <div className="flex space-x-4 mt-8">
            <div className="h-12 bg-neutral-800 animate-pulse rounded w-40" />
            <div className="h-12 bg-neutral-800 animate-pulse rounded w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
