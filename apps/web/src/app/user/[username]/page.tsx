'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api, watchHistoryApi, watchlistApi } from '@/lib/api';
import { useState, useEffect } from 'react';
import { Play, Settings, Award, Users, Calendar, Eye, FileText, Heart, BarChart3, Activity } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/store/langStore';
import { resolveImageUrl } from '@/components/film/FilmCard';
import { useToast } from '@/providers/ToastProvider';

const translations = {
  vi: {
    profile: "Hồ sơ",
    activity: "Hoạt động",
    films: "Phim đã xem",
    diary: "Nhật ký",
    reviews: "Đánh giá",
    watchlist: "Watchlist",
    favoriteFilms: "Phim yêu thích",
    followers: "Người theo dõi",
    following: "Đang theo dõi",
    activityFeed: "Nhật ký hoạt động",
    stats: "Thống kê",
    editProfile: "CHỈNH SỬA HỒ SƠ",
    upgradeAd: "CẦN NÂNG CẤP?",
    getPro: "LÊN PRO",
    needUpgrade: "Thống kê hồ sơ chi tiết, lọc theo dịch vụ phát trực tuyến yêu thích, nhận cảnh báo phim mới và tắt hoàn toàn quảng cáo!",
    filmsLabel: "Phim",
    followingLabel: "Đang theo dõi",
    followersLabel: "Người theo dõi",
    noRecentActivity: "Chưa có hoạt động gần đây",
    noWatched: "Chưa xem phim nào",
    noWatchlist: "Chưa có phim nào trong danh sách muốn xem",
    noReviews: "Chưa có bài đánh giá nào",
    ratingsDist: "Phân bố đánh giá",
    totalWatchTime: "Tổng thời gian xem",
    hours: "giờ",
    favoritesDesc: "Đừng quên chọn những bộ phim yêu thích của bạn!",
    addFavoritesBtn: "Thêm phim yêu thích",
    network: "Mạng lưới",
  },
  en: {
    profile: "Profile",
    activity: "Activity",
    films: "Films",
    diary: "Diary",
    reviews: "Reviews",
    watchlist: "Watchlist",
    favoriteFilms: "Favorite Films",
    followers: "Followers",
    following: "Following",
    activityFeed: "Activity Feed",
    stats: "Stats",
    editProfile: "EDIT PROFILE",
    upgradeAd: "NEED AN UPGRADE?",
    getPro: "GET PRO",
    needUpgrade: "Detailed profile stats, filtering by favorite streaming services, watchlist alerts and no ads!",
    filmsLabel: "Films",
    followingLabel: "Following",
    followersLabel: "Followers",
    noRecentActivity: "No recent activity",
    noWatched: "No films watched yet",
    noWatchlist: "No films added to watchlist yet",
    noReviews: "No reviews created yet",
    ratingsDist: "Ratings distribution",
    totalWatchTime: "Total Watch Time",
    hours: "hours",
    favoritesDesc: "Don't forget to select your favorite films!",
    addFavoritesBtn: "Add favorite films",
    network: "Network",
  }
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const username = params.username as string;

  const user = useAuthStore((s) => s.user);
  const isOwnProfile = user?.username === username || user?.email === username;

  // Retrieve current language (en / vi) from langStore
  const { lang } = useTranslation();
  const currentLang = (lang === 'en' || lang === 'vi') ? lang : 'vi';
  const text = translations[currentLang];

  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'films' | 'diary' | 'reviews' | 'watchlist' | 'network' | 'stats'>('profile');

  // Queries
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', username],
    queryFn: () => api.get(`/users/${username}`).then((r) => r.data),
  });

  const { data: activity } = useQuery({
    queryKey: ['user-activity', username],
    queryFn: () => api.get(`/users/${username}/activity`).then((r) => r.data),
    enabled: !!profile,
  });

  const { data: historyData } = useQuery({
    queryKey: ['user-history', username],
    queryFn: () => watchHistoryApi.getHistory(1, 24).then((r) => r.data),
    enabled: !!profile,
  });

  const { data: watchlistData } = useQuery({
    queryKey: ['user-watchlist', username],
    queryFn: () => watchlistApi.get(1).then((r) => r.data),
    enabled: !!profile,
  });

  if (profileLoading) {
    return <UserProfileSkeleton />;
  }

  if (!profile) {
    return (
      <div className="bg-[#14181c] min-h-screen text-neutral-300 pt-28 pb-12 text-center">
        <p className="text-neutral-500">Không tìm thấy người dùng / User not found</p>
      </div>
    );
  }

  const watchedCount = historyData?.total || 0;
  const watchlistCount = profile._count?.watchlist || 0;
  const reviewsCount = profile._count?.reviews || 0;

  // Calculate stats watch time
  const totalWatchMinutes = historyData?.items?.reduce((acc: number, curr: any) => acc + (curr.progress || 0), 0) || 0;
  const totalWatchHours = Math.round(totalWatchMinutes / 3600);

  return (
    <div className="bg-[#14181c] min-h-screen text-neutral-300 pb-16 font-sans relative">
      
      {/* ── Banner cover ── */}
      <div className="h-64 md:h-80 w-full relative overflow-hidden bg-neutral-950">
        <div 
          className="absolute inset-0 bg-cover bg-center brightness-[0.4] filter blur-sm scale-105"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#14181c] via-[#14181c]/30 to-transparent" />
      </div>

      <div className="container mx-auto px-4 md:px-8 max-w-5xl relative -mt-20 z-20">
        
        {/* ── Header overlapping the banner ── */}
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 pb-8 border-b border-neutral-800">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
            {/* Avatar lớn */}
            <div className="relative group">
              <img
                src={
                  profile.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${profile.username}&background=182027&color=00e054&size=120`
                }
                alt={profile.username}
                className="w-28 h-28 md:w-36 h-36 rounded-full object-cover border-4 border-[#14181c] shadow-2xl bg-[#182027]"
              />
            </div>
            
            <div className="flex flex-col justify-center mb-2">
              <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide drop-shadow-md">
                  {profile.displayName || profile.username}
                </h1>
                
                {isOwnProfile && (
                  <Link
                    href="/settings/security"
                    className="flex items-center gap-1.5 bg-[#2c3440] hover:bg-[#343c48] text-neutral-300 text-xs font-bold px-3 py-1.5 rounded transition-colors shadow-md border border-neutral-700"
                  >
                    <Settings size={12} />
                    <span>{text.editProfile}</span>
                  </Link>
                )}
              </div>
              <p className="text-neutral-400 text-sm mt-1 font-semibold">@{profile.username}</p>
              {profile.bio && <p className="text-neutral-400 text-xs mt-3 max-w-md bg-black/30 backdrop-blur-sm p-3 rounded-lg border border-white/5">{profile.bio}</p>}
            </div>
          </div>

          {/* Stats on Header */}
          <div className="flex gap-8 text-center md:text-right mb-2 bg-[#182027]/80 backdrop-blur-md px-5 py-3 rounded-xl border border-neutral-800 shadow-lg">
            <div>
              <div className="text-xl md:text-2xl font-black text-white">{watchedCount}</div>
              <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">{text.filmsLabel}</div>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black text-white">{profile._count?.following || 0}</div>
              <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">{text.followingLabel}</div>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black text-white">{profile._count?.followers || 0}</div>
              <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">{text.followersLabel}</div>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="bg-[#1c252d] border-b border-neutral-800 flex items-center justify-between px-2 md:px-4 mt-6 rounded-t-lg overflow-x-auto scrollbar-none">
          <div className="flex space-x-6 md:space-x-8 text-xs font-bold uppercase tracking-wider">
            {(['profile', 'activity', 'films', 'diary', 'reviews', 'watchlist', 'network', 'stats'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === tab
                    ? 'border-emerald-500 text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>{text[tab]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Main Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          
          {/* ── Left Column (Main Info) ── */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <>
                {/* Favorite Films (Phim yêu thích) */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800 pb-2 mb-4">
                    {text.favoriteFilms}
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {watchlistData?.items?.slice(0, 4).map((item: any) => {
                      const movie = item.movieData || item.movie;
                      const thumb = resolveImageUrl(movie?.thumb_url) || resolveImageUrl(movie?.poster_url);
                      return (
                        <Link
                          key={item.id}
                          href={`/film/${movie?.slug || item.movieId}`}
                          className="aspect-[2/3] bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden group relative hover:border-emerald-500/50 transition-all shadow-md"
                        >
                          {thumb ? (
                            <img src={thumb} alt={movie?.title || item.movieId} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">
                              No image
                            </div>
                          )}
                        </Link>
                      );
                    })}
                    {/* Fill up remaining slots (up to 4) */}
                    {Array.from({ length: Math.max(0, 4 - (watchlistData?.items?.slice(0, 4).length || 0)) }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="aspect-[2/3] rounded-lg border-2 border-dashed border-neutral-800 flex flex-col items-center justify-center text-center p-3 text-neutral-600 text-[10px] hover:border-emerald-500/40 hover:text-neutral-400 cursor-pointer select-none transition-all"
                        onClick={() => router.push('/')}
                      >
                        <Heart size={14} className="mb-1 text-neutral-600" />
                        {text.addFavoritesBtn}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity (Nhật ký hoạt động) */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800 pb-2 mb-4">
                    {text.activityFeed}
                  </h3>
                  {historyData?.items && historyData.items.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {historyData.items.slice(0, 4).map((item: any) => {
                        const pct = item.duration > 0 ? Math.min(100, (item.progress / item.duration) * 100) : 0;
                        return (
                          <div
                            key={item.id}
                            className="bg-[#182027] border border-neutral-800/80 rounded-xl p-4 flex gap-4 items-center justify-between shadow-sm"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              {item.movieThumb ? (
                                <img src={item.movieThumb} alt={item.movieTitle} className="w-10 h-14 object-cover rounded-md flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-14 bg-neutral-800 rounded-md flex-shrink-0 flex items-center justify-center"><Play size={16} /></div>
                              )}
                              <div className="min-w-0">
                                <Link href={`/watch/${item.movieId}${item.episode ? `?ep=${item.episode}` : ''}`} className="font-bold text-white text-sm hover:text-emerald-500 transition-colors line-clamp-1 block">
                                  {item.movieTitle}
                                </Link>
                                <p className="text-xs text-neutral-500 mt-1">
                                  {item.episode ? `Tập ${item.episode}` : 'Bản đầy đủ'} &bull; Đã xem {Math.round(pct)}%
                                </p>
                              </div>
                            </div>
                            <div className="text-[10px] text-neutral-500 font-semibold flex-shrink-0">
                              {new Date(item.watchedAt).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-neutral-600 text-xs py-4">{text.noRecentActivity}</p>
                  )}
                </div>
              </>
            )}

            {/* TAB: ACTIVITY */}
            {activeTab === 'activity' && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800 pb-2 mb-4">
                  {text.activityFeed}
                </h3>
                {activity && activity.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {activity.map((r: any) => (
                      <div
                        key={r.id}
                        className="bg-[#182027] border border-neutral-800 rounded-xl p-5 flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <Link href={`/film/${r.movie?.slug || r.movieId}`} className="font-bold text-white hover:text-emerald-500 transition-colors text-sm">
                              {r.movie?.title || r.movieId}
                            </Link>
                            {r.rating && (
                              <div className="flex items-center gap-1 text-[#00c030] text-xs mt-1">
                                {'★'.repeat(Math.round(r.rating))}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-500">
                            {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-neutral-400 text-xs leading-relaxed">{r.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-600 text-xs py-4">{text.noRecentActivity}</p>
                )}
              </div>
            )}

            {/* TAB: WATCHED FILMS */}
            {activeTab === 'films' && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800 pb-2 mb-4">
                  {text.films} ({watchedCount})
                </h3>
                {historyData?.items && historyData.items.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {historyData.items.map((item: any) => (
                      <Link
                        key={item.id}
                        href={`/watch/${item.movieId}${item.episode ? `?ep=${item.episode}` : ''}`}
                        className="flex flex-col bg-[#182027] border border-neutral-850 rounded-lg overflow-hidden group hover:border-emerald-500/50 transition-all shadow-sm"
                      >
                        <div className="aspect-[2/3] bg-neutral-900 overflow-hidden relative">
                          {item.movieThumb ? (
                            <img src={item.movieThumb} alt={item.movieTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">No Image</div>
                          )}
                        </div>
                        <div className="p-2 text-center min-w-0">
                          <p className="font-bold text-[10px] text-white line-clamp-1 group-hover:text-emerald-500 transition-colors">
                            {item.movieTitle}
                          </p>
                          {item.episode && <p className="text-[9px] text-neutral-500">Tập {item.episode}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-600 text-xs py-4">{text.noWatched}</p>
                )}
              </div>
            )}

            {/* TAB: DIARY (Nhật ký xem phim dạng bảng) */}
            {activeTab === 'diary' && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800 pb-2 mb-4">
                  {text.diary}
                </h3>
                {historyData?.items && historyData.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-850 text-neutral-500 uppercase tracking-wider font-bold">
                          <th className="py-3 px-2">Ngày xem</th>
                          <th className="py-3 px-2">Tên Phim</th>
                          <th className="py-3 px-2">Tập</th>
                          <th className="py-3 px-2">Tiến trình</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.items.map((item: any) => {
                          const pct = item.duration > 0 ? Math.min(100, (item.progress / item.duration) * 100) : 0;
                          return (
                            <tr key={item.id} className="border-b border-neutral-850/50 hover:bg-white/[0.02] transition-colors">
                              <td className="py-4.5 px-2 text-neutral-400 font-semibold">
                                {new Date(item.watchedAt).toLocaleDateString('vi-VN')}
                              </td>
                              <td className="py-4.5 px-2 font-bold text-white">
                                <Link href={`/watch/${item.movieId}${item.episode ? `?ep=${item.episode}` : ''}`} className="hover:text-emerald-500 transition-colors">
                                  {item.movieTitle}
                                </Link>
                              </td>
                              <td className="py-4.5 px-2 text-neutral-400">
                                {item.episode ? `Tập ${item.episode}` : 'Bản đầy đủ'}
                              </td>
                              <td className="py-4.5 px-2 text-neutral-400">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span>{Math.round(pct)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-neutral-600 text-xs py-4">{text.noWatched}</p>
                )}
              </div>
            )}

            {/* TAB: REVIEWS */}
            {activeTab === 'reviews' && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800 pb-2 mb-4">
                  {text.reviews} ({reviewsCount})
                </h3>
                {activity && activity.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {activity.map((r: any) => (
                      <div
                        key={r.id}
                        className="bg-[#182027] border border-neutral-800 rounded-xl p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <Link href={`/film/${r.movie?.slug || r.movieId}`} className="font-bold text-white hover:text-emerald-500 transition-colors text-sm">
                              {r.movie?.title || r.movieId}
                            </Link>
                            {r.rating && (
                              <div className="flex items-center gap-1 text-[#00c030] text-xs mt-1">
                                {'★'.repeat(Math.round(r.rating))}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-500">
                            {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-neutral-400 text-xs leading-relaxed">{r.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-600 text-xs py-4">{text.noReviews}</p>
                )}
              </div>
            )}

            {/* TAB: WATCHLIST */}
            {activeTab === 'watchlist' && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800 pb-2 mb-4">
                  {text.watchlist} ({watchlistCount})
                </h3>
                {watchlistData?.items && watchlistData.items.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {watchlistData.items.map((item: any) => {
                      const movie = item.movieData || item.movie;
                      const thumb = resolveImageUrl(movie?.thumb_url) || resolveImageUrl(movie?.poster_url);
                      return (
                        <Link
                          key={item.id}
                          href={`/film/${movie?.slug || item.movieId}`}
                          className="flex flex-col bg-[#182027] border border-neutral-850 rounded-lg overflow-hidden group hover:border-emerald-500/50 transition-all shadow-sm"
                        >
                          <div className="aspect-[2/3] bg-neutral-900 overflow-hidden relative">
                            {thumb ? (
                              <img src={thumb} alt={movie?.title || item.movieId} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">No Image</div>
                            )}
                          </div>
                          <div className="p-2 text-center min-w-0">
                            <p className="font-bold text-[10px] text-white line-clamp-1 group-hover:text-emerald-500 transition-colors">
                              {movie?.title || item.movieId}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-neutral-600 text-xs py-4">{text.noWatchlist}</p>
                )}
              </div>
            )}

            {/* TAB: NETWORK */}
            {activeTab === 'network' && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800 pb-2 mb-4">
                  {text.network}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#182027] border border-neutral-800 rounded-xl p-5 shadow-sm">
                    <h4 className="text-white font-bold text-xs mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Users size={14} className="text-emerald-500" />
                      <span>{text.followers} (0)</span>
                    </h4>
                    <p className="text-neutral-500 text-xs">Chưa có người theo dõi nào / No followers yet</p>
                  </div>
                  <div className="bg-[#182027] border border-neutral-800 rounded-xl p-5 shadow-sm">
                    <h4 className="text-white font-bold text-xs mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Users size={14} className="text-emerald-500" />
                      <span>{text.following} (0)</span>
                    </h4>
                    <p className="text-neutral-500 text-xs">Chưa theo dõi người dùng nào / Not following anyone yet</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: STATS */}
            {activeTab === 'stats' && (
              <div className="flex flex-col gap-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800 pb-2 mb-4">
                  {text.stats}
                </h3>
                
                {/* Watch time and Ratings Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#182027] border border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col justify-center items-center text-center">
                    <BarChart3 size={32} className="text-emerald-500 mb-3" />
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">{text.totalWatchTime}</span>
                    <span className="text-3xl font-black text-white mt-1">{totalWatchHours}</span>
                    <span className="text-[11px] text-neutral-400 mt-1">{text.hours}</span>
                  </div>

                  {/* Distribution mock chart */}
                  <div className="bg-[#182027] border border-neutral-800 rounded-xl p-5 shadow-sm">
                    <h4 className="text-white font-bold text-xs mb-4 uppercase tracking-wide">{text.ratingsDist}</h4>
                    <div className="flex items-end justify-between h-24 pt-4 px-2">
                      {[10, 30, 45, 80, 60].map((height, index) => (
                        <div key={index} className="flex flex-col items-center gap-1.5 w-8">
                          <div className="w-full bg-[#1c252d] h-full rounded flex items-end">
                            <div className="bg-emerald-500 w-full rounded-b transition-all duration-500" style={{ height: `${height}%` }} />
                          </div>
                          <span className="text-[9px] text-neutral-500 font-bold">{index + 1}★</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ── Right Column (Sidebar & Ad Upgrade) ── */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Premium Upgrade Ad Banner (Letterboxd replica style!) */}
            <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-neutral-800/80 group shadow-2xl flex flex-col justify-end bg-gradient-to-t from-black via-black/40 to-transparent">
              <div 
                className="absolute inset-0 bg-cover bg-center brightness-[0.7] group-hover:scale-105 transition-transform duration-500"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop')`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14181c] via-[#14181c]/20 to-transparent" />
              
              <div className="relative z-10 p-5 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Award size={16} className="text-amber-400" />
                  <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">{text.upgradeAd}</span>
                </div>
                <h4 className="text-base font-black text-white leading-tight uppercase tracking-wide">
                  {text.upgradeAd}
                </h4>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  {text.needUpgrade}
                </p>
                <button 
                  onClick={() => toast('Chức năng nâng cấp Pro sẽ sớm khả dụng!', 'info')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] tracking-wider uppercase py-2 px-4 rounded-md transition-colors mt-2 text-center"
                >
                  {text.getPro}
                </button>
              </div>
            </div>

            {/* Sidebar Activity Widget */}
            <div className="bg-[#182027]/50 border border-neutral-800 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800 pb-2 mb-3">
                {text.activity}
              </h4>
              <p className="text-neutral-500 text-xs py-2">{text.noRecentActivity}</p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

// ── User Profile Skeleton Loader ──────────────────────────
function UserProfileSkeleton() {
  return (
    <div className="bg-[#14181c] min-h-screen text-neutral-350 pb-16 font-sans relative">
      {/* Banner Skeleton */}
      <div className="h-64 md:h-80 w-full relative overflow-hidden bg-neutral-950/60 animate-pulse" />

      <div className="container mx-auto px-4 md:px-8 max-w-5xl relative -mt-20 z-20">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 pb-8 border-b border-neutral-800">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
            {/* Avatar */}
            <div className="w-28 h-28 md:w-36 h-36 rounded-full bg-neutral-800 animate-pulse border-4 border-[#14181c]" />
            <div className="flex flex-col justify-center mb-2 space-y-3">
              <div className="h-8 bg-neutral-800 animate-pulse rounded w-48 mx-auto md:mx-0" />
              <div className="h-4 bg-neutral-800/80 animate-pulse rounded w-24 mx-auto md:mx-0" />
            </div>
          </div>
          {/* Stats */}
          <div className="flex gap-6 px-5 py-3 rounded-xl bg-[#182027]/40 border border-neutral-800/40 w-52 justify-around">
            <div className="h-8 w-8 bg-neutral-800 animate-pulse rounded" />
            <div className="h-8 w-8 bg-neutral-800 animate-pulse rounded" />
            <div className="h-8 w-8 bg-neutral-800 animate-pulse rounded" />
          </div>
        </div>

        {/* Navigation Tab Skeleton */}
        <div className="bg-[#1c252d]/40 border-b border-neutral-800/50 flex items-center px-4 mt-6 rounded-t-lg h-14 animate-pulse">
          <div className="flex space-x-8">
            <div className="h-4 w-12 bg-neutral-800 rounded" />
            <div className="h-4 w-16 bg-neutral-800 rounded" />
            <div className="h-4 w-10 bg-neutral-800 rounded" />
            <div className="h-4 w-14 bg-neutral-800 rounded" />
          </div>
        </div>

        {/* Content Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* Favorites Section */}
            <div className="space-y-4">
              <div className="h-4 w-32 bg-neutral-800 animate-pulse rounded" />
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-lg bg-neutral-800/60 animate-pulse" />
                ))}
              </div>
            </div>
            {/* Activity Section */}
            <div className="space-y-4">
              <div className="h-4 w-40 bg-neutral-800 animate-pulse rounded" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-neutral-800/40 animate-pulse rounded-xl" />
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="aspect-square w-full rounded-xl bg-neutral-800/60 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
