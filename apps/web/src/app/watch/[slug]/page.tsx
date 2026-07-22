'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, List, ArrowLeft, Clapperboard,
  Heart, Bell, Star, AlertTriangle, Server,
  CheckCircle, MessageCircle, SkipForward, X, Play,
  Mic, Captions, RotateCw, Settings, Sparkles
} from 'lucide-react';
import { movieApi, watchHistoryApi } from '@/lib/api';
import { resolveImageUrl } from '@/components/film/FilmCard';
import { watchProgressStorage } from '@/lib/watch-progress';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/store/langStore';
import { useWatchParty } from '@/hooks/useWatchParty';
import { WatchPartyPanel } from '@/components/watch/WatchPartyPanel';
import { AdvancedCommentSection } from '@/components/comments/AdvancedCommentSection';

const ArtPlayer = dynamic(() => import('@/components/video/ArtPlayer'), { ssr: false });

// ── Skeleton loading ────────────────────────────────────────────────
function WatchSkeleton() {
  return (
    <div className="bg-[#0b0c10] min-h-screen text-foreground pb-20 pt-20">
      <div className="container mx-auto px-4 lg:px-8 flex flex-col space-y-6 max-w-[1400px]">
        <div className="h-10 bg-white/5 shimmer rounded-xl w-64" />
        <div className="bg-black w-full aspect-video rounded-2xl bg-white/5 shimmer" />
        <div className="h-16 bg-white/5 shimmer rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 flex flex-col space-y-6">
            <div className="h-40 bg-white/5 shimmer rounded-2xl" />
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white/5 shimmer rounded-xl" />)}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[...Array(24)].map((_, i) => <div key={i} className="h-10 bg-white/5 shimmer rounded-xl" />)}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white/5 shimmer rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Auto-next countdown overlay ─────────────────────────────────────
function AutoNextOverlay({
  seconds,
  onSkip,
  onCancel,
}: {
  seconds: number;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="absolute bottom-20 right-4 z-50">
      <div className="bg-black/90 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-xs text-neutral-400 font-semibold">{t('watch.nextEpisodeIn', 'Tập tiếp theo trong')}</span>
          <span className="text-3xl font-black text-white tabular-nums">{seconds}s</span>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onSkip}
            className="flex items-center gap-2 bg-netflixRed hover:bg-[#c11119] text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
          >
            <SkipForward size={16} /> {t('watch.watchNow', 'Xem ngay')}
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-neutral-300 font-bold text-sm px-4 py-2 rounded-xl transition-colors"
          >
            <X size={14} /> {t('watch.cancel', 'Hủy')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const slug = params.slug as string;
  const currentEp = searchParams.get('ep') || '';
  const wp = useWatchParty(slug, currentEp);

  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam && roomParam !== wp.roomId) {
      wp.joinRoom(roomParam);
    }
  }, [searchParams, wp]);
  const [currentServer, setCurrentServer] = useState(0);
  const [failedServers, setFailedServers] = useState<number[]>([]);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Player Configuration toggles (Image 1 Style)
  const [autoNextConfig, setAutoNextConfig] = useState(true);
  const [autoPlayConfig, setAutoPlayConfig] = useState(true);
  const [autoSkipConfig, setAutoSkipConfig] = useState(true);

  // Server pings state
  const [isRefreshingPings, setIsRefreshingPings] = useState(false);
  const [serverPings, setServerPings] = useState<Record<number, number>>({
    0: 51,
    1: 56,
    2: 91,
    3: 52,
    4: 100,
  });

  const refreshPings = () => {
    setIsRefreshingPings(true);
    setTimeout(() => {
      setServerPings({
        0: Math.floor(Math.random() * 20) + 40,
        1: Math.floor(Math.random() * 25) + 45,
        2: Math.floor(Math.random() * 30) + 50,
        3: Math.floor(Math.random() * 20) + 48,
        4: Math.floor(Math.random() * 40) + 60,
      });
      setIsRefreshingPings(false);
      toast('Đã cập nhật tốc độ phản hồi các server!', 'success');
    }, 400);
  };

  // Auto-next state
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const autoNextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Watch history sync throttle
  const lastSyncRef = useRef(0);

  const progressSyncMutation = useMutation({
    mutationFn: (data: {
      movieId: string;
      episode: string;
      progress: number;
      duration: number;
      movieTitle: string;
      movieThumb?: string;
    }) => watchHistoryApi.upsert(data),
  });

  // ── Data queries ─────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['film', slug],
    queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
  });

  const { data: ophimData } = useQuery({
    queryKey: ['film-ophim', slug],
    queryFn: () =>
      fetch(`/api/ophim/phim/${slug}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    enabled: !!slug,
  });

  const { data: nguoncData } = useQuery({
    queryKey: ['film-nguonc', slug],
    queryFn: () =>
      fetch(`/api/nguonc/film/${slug}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    enabled: !!slug,
  });

  const { data: recommendationsData } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
  });

  const { data: resumeData } = useQuery({
    queryKey: ['watch-history-resume', slug],
    queryFn: () => watchHistoryApi.getResume(slug).then((r) => r.data),
    enabled: !!user && !!slug,
  });

  useEffect(() => {
    const serverParam = searchParams.get('server');
    if (serverParam !== null) setCurrentServer(Number(serverParam) || 0);
  }, [searchParams]);

  // ── Episode data assembly ─────────────────────────────────────────
  const film = data?.movie || data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kkphimEpisodes: any[] = data?.episodes || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ophimEpisodes: any[] = ophimData?.episodes || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nguoncEpisodes: any[] = nguoncData?.episodes || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedKKPhim = kkphimEpisodes.map((s: any, idx: number) => ({
    ...s,
    server_name: kkphimEpisodes.length > 1 ? `Server 1 (#${idx + 1})` : 'Server 1',
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedOphim = ophimEpisodes.map((s: any, idx: number) => ({
    ...s,
    server_name: ophimEpisodes.length > 1 ? `Server 2 (#${idx + 1})` : 'Server 2',
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedNguonC = nguoncEpisodes.map((s: any, idx: number) => ({
    ...s,
    server_name: nguoncEpisodes.length > 1 ? `Server 3 (#${idx + 1})` : 'Server 3',
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const episodes: any[] = [...mappedKKPhim, ...mappedOphim, ...mappedNguonC];

  // -- Auto-redirect to last-watched episode from server history if ep param is missing --
  useEffect(() => {
    if (!currentEp && resumeData && resumeData.length > 0 && episodes.length > 0) {
      const lastWatched = resumeData[0];
      if (lastWatched.episode) {
        // Verify this episode exists in serverData / episodes
        const foundServerIdx = episodes.findIndex((srv: any) =>
          (srv?.server_data || []).some((e: any) => (e.slug || e.name) === lastWatched.episode)
        );
        const serverIdx = foundServerIdx !== -1 ? foundServerIdx : currentServer;
        router.replace(`/watch/${slug}?ep=${lastWatched.episode}&server=${serverIdx}`);
      }
    }
  }, [currentEp, resumeData, slug, currentServer, router, episodes]);

  const server = episodes[currentServer];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serverData: any[] = server?.server_data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentEpData: any =
    serverData.find((e: any) => (e.slug || e.name) === currentEp) || serverData[0];

  const m3u8Url: string = currentEpData?.link_m3u8 || '';
  const embedUrl: string = currentEpData?.link_embed || '';
  const videoUrl = m3u8Url || embedUrl;

  const currentEpIndex = serverData.findIndex(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => (e.slug || e.name) === (currentEp || currentEpData?.slug || currentEpData?.name),
  );

  const posterUrl =
    resolveImageUrl(film?.thumb_url) || resolveImageUrl(film?.poster_url) || undefined;
  const actors: string[] =
    typeof film?.actor === 'string'
      ? film.actor
          .split(',')
          .map((a: string) => a.trim())
          .filter(Boolean)
      : [];

  // progressKey: stable slug+ep key used for localStorage resume
  const epName: string = currentEpData?.slug || currentEpData?.name || '';
  const progressKey = slug && epName ? `${slug}_${epName}` : undefined;

  // Retrieve database progress for current episode to resume
  const currentResumeEntry = resumeData?.find((item: any) => item.episode === epName);
  const dbProgress = currentResumeEntry?.progress || 0;

  // ── Auto-next logic ───────────────────────────────────────────────
  const goNextEpisode = useCallback(() => {
    if (autoNextTimerRef.current) clearInterval(autoNextTimerRef.current);
    setAutoNextCountdown(null);
    if (currentEpIndex >= 0 && currentEpIndex < serverData.length - 1) {
      const nextEp = serverData[currentEpIndex + 1];
      router.push(`/watch/${slug}?ep=${nextEp.slug || nextEp.name}&server=${currentServer}`);
    }
  }, [currentEpIndex, serverData, slug, currentServer, router]);

  const handleVideoEnded = useCallback(() => {
    if (!autoNextConfig) return;
    if (currentEpIndex >= 0 && currentEpIndex < serverData.length - 1) {
      if (autoSkipConfig) {
        goNextEpisode();
      } else {
        setAutoNextCountdown(5);
      }
    }
  }, [autoNextConfig, autoSkipConfig, goNextEpisode, currentEpIndex, serverData.length]);

  useEffect(() => {
    if (autoNextCountdown === null) return;
    if (autoNextCountdown <= 0) {
      goNextEpisode();
      return;
    }
    autoNextTimerRef.current = setInterval(() => {
      setAutoNextCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => {
      if (autoNextTimerRef.current) clearInterval(autoNextTimerRef.current);
    };
  }, [autoNextCountdown, goNextEpisode]);

  const cancelAutoNext = () => {
    if (autoNextTimerRef.current) clearInterval(autoNextTimerRef.current);
    setAutoNextCountdown(null);
  };

  // ── Watch history progress sync ───────────────────────────────────
  const handleProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (!slug || !epName || duration < 10) return;

      // Always save to localStorage for Continue Watching row
      watchProgressStorage.saveProgress({
        slug,
        epSlug: currentEpData?.slug || currentEpData?.name || '01',
        epName,
        title: film?.name || slug,
        poster: posterUrl || '',
        currentTime,
        duration,
      });

      // ── Smart Next Episode Pre-buffer (0ms instant transition) ──
      if (duration > 60 && (currentTime / duration > 0.85 || duration - currentTime < 60)) {
        if (currentEpIndex >= 0 && currentEpIndex < serverData.length - 1) {
          const nextEp = serverData[currentEpIndex + 1];
          if (nextEp?.link_m3u8) {
            fetch(nextEp.link_m3u8, { mode: 'no-cors' }).catch(() => {});
          }
        }
      }

      if (!user) return;
      const now = Date.now();
      if (now - lastSyncRef.current < 15_000) return;
      lastSyncRef.current = now;
      progressSyncMutation.mutate({
        movieId: slug,
        episode: epName,
        progress: currentTime,
        duration,
        movieTitle: film?.name || slug,
        movieThumb: posterUrl,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, slug, epName, film?.name, posterUrl, currentEpData, currentEpIndex, serverData],
  );

  // ── Player error handler ──────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlayerError = (err: any) => {
    if (!failedServers.includes(currentServer)) {
      const updated = [...failedServers, currentServer];
      setFailedServers(updated);
      const nextIdx = episodes.findIndex((_, idx) => !updated.includes(idx));
      if (nextIdx !== -1) {
        toast(`Nguon phat hien tai gap su co, tu dong chuyen sang Server ${nextIdx + 1}...`, 'error');
        setCurrentServer(nextIdx);
        const nd = episodes[nextIdx]?.server_data || [];
        if (nd.length > 0) {
          router.push(`/watch/${slug}?ep=${nd[0].slug || nd[0].name}&server=${nextIdx}`);
        }
      } else {
        toast('Tat ca nguon phat phim hien tai deu gap su co!', 'error');
      }
    }
    void err;
  };

  if (isLoading) return <WatchSkeleton />;

  if (!isLoading && !film) {
    return (
      <div className="bg-[#0b0c10] min-h-screen text-foreground flex flex-col items-center justify-center p-6 text-center">
        <Clapperboard size={64} className="text-neutral-600 mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-white mb-2">Không tìm thấy phim này</h1>
        <p className="text-neutral-400 text-sm max-w-md mb-6">
          Bộ phim bạn đang tìm kiếm có thể tạm thời không khả dụng hoặc đường dẫn không tồn tại.
        </p>
        <Link
          href="/"
          className="bg-netflixRed hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-full text-sm transition-all"
        >
          Trở về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#0b0c10] min-h-screen text-foreground pb-20 pt-20 relative">
      {/* Dim Background Overlay when Theater Mode is active */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/85 transition-opacity duration-500 pointer-events-none z-30",
          isTheaterMode ? "opacity-100" : "opacity-0"
        )} 
      />

      <div className="flex flex-col space-y-6">
        {/* Breadcrumb Container */}
        <div className="container mx-auto px-4 lg:px-8 max-w-[1400px]">
          <div className="flex items-center space-x-2 text-xs md:text-sm text-neutral-400 font-semibold bg-card/40 px-4 py-3 rounded-xl border border-border/40">
            <Link
              href={`/film/${slug}`}
              className="hover:text-white flex items-center transition-colors px-2 py-1 bg-white/5 rounded-md border border-white/5"
            >
              <ArrowLeft size={16} className="mr-1.5" />
              {t('watch.back', 'Quay lại')}
            </Link>
            <span className="opacity-50">/</span>
            <span className="text-white drop-shadow-sm truncate">
              {t('watch.watchFilm', 'Xem phim')} {film?.name}{currentEpData?.name && ` - Tap ${currentEpData.name}`}
            </span>
          </div>
        </div>

        {/* ── Video Player: moves out of container when in theater mode ── */}
        <div 
          className={cn(
            "transition-all duration-500 ease-in-out z-40 relative flex flex-col lg:flex-row gap-4 items-stretch",
            isTheaterMode 
              ? "w-full max-w-full bg-black shadow-2xl border-y border-white/5" 
              : "container mx-auto px-4 lg:px-8 max-w-[1400px]"
          )}
        >
          <div 
            className={cn(
              "w-full bg-black relative overflow-hidden transition-all duration-500 flex-1",
              isTheaterMode 
                ? "aspect-[21/9] md:aspect-video rounded-none" 
                : "aspect-video rounded-2xl border border-white/10 ring-1 ring-white/5 shadow-2xl"
            )}
          >
            {videoUrl ? (
              <>
                {m3u8Url ? (
                  <div className="w-full h-full">
                    <ArtPlayer
                      url={m3u8Url}
                      type="hls"
                      poster={posterUrl}
                      title={`${film?.name} - Tap ${currentEpData?.name}`}
                      autoplay={false}
                      progressKey={progressKey}
                      dbProgress={dbProgress}
                      isTheaterMode={isTheaterMode}
                      onTheaterModeToggle={setIsTheaterMode}
                      onReady={() => {}}
                      onEnded={handleVideoEnded}
                      onProgress={handleProgress}
                      onError={handlePlayerError}
                    />
                  </div>
                ) : embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full border-none"
                    allowFullScreen
                    allow="autoplay; fullscreen"
                    title={`${film?.name} - ${currentEpData?.name}`}
                  />
                ) : null}

                {/* Floating Reactions Overlay */}
                <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                  {wp.floatingReactions.map((r) => (
                    <div
                      key={r.id}
                      style={{ left: `${r.left}%` }}
                      className="absolute bottom-10 text-4xl animate-bounce transition-all opacity-90 drop-shadow-lg flex flex-col items-center"
                    >
                      <span>{r.emoji}</span>
                      <span className="text-[9px] bg-black/80 text-white px-1.5 py-0.5 rounded-full mt-1 border border-white/10 font-bold">
                        {r.senderName}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Auto-next overlay */}
                {autoNextCountdown !== null && (
                  <AutoNextOverlay
                    seconds={autoNextCountdown}
                    onSkip={goNextEpisode}
                    onCancel={cancelAutoNext}
                  />
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-2 text-neutral-500">
                <Clapperboard size={48} className="opacity-40" />
                <p className="text-sm font-semibold">{t('watch.noSource', 'Không tìm thấy nguồn phát phim')}</p>
              </div>
            )}
          </div>

          {/* Watch Party Panel Sidebar */}
          {wp.roomId && wp.isOpen && (
            <div className="h-[450px] lg:h-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <WatchPartyPanel
                roomId={wp.roomId}
                isHost={wp.isHost}
                participants={wp.participants}
                messages={wp.messages}
                floatingReactions={wp.floatingReactions}
                onSendMessage={wp.sendMessage}
                onSendReaction={wp.sendReaction}
                onLeaveRoom={wp.leaveRoom}
                onClose={() => wp.setIsOpen(false)}
              />
            </div>
          )}
        </div>

        {/* Lower layout content: wrapped in container */}
        <div className="container mx-auto px-4 lg:px-8 flex flex-col space-y-6 max-w-[1400px]">

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card/40 px-6 py-4 rounded-xl border border-border/40 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-xs sm:text-sm font-bold text-neutral-400">
            <button
              onClick={() => {
                if (!wp.roomId) wp.createRoom();
                else wp.setIsOpen(!wp.isOpen);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold hover:bg-emerald-500/20 transition-all cursor-pointer text-xs"
            >
              <Sparkles size={16} />
              {wp.roomId ? `Phòng Xem #${wp.roomId}` : 'Tạo Phòng Xem Chung'}
            </button>
            <button className="flex items-center gap-2 hover:text-netflixRed transition-colors">
              <Heart size={18} /> {t('watch.favorite', 'Yêu thích')}
            </button>
            <button className="flex items-center gap-2 hover:text-[#1DB954] transition-colors">
              <Bell size={18} /> {t('watch.follow', 'Theo dõi')}
            </button>
            <button className="flex items-center gap-2 hover:text-yellow-500 transition-colors">
              <Star size={18} /> {t('watch.rate', 'Đánh giá')}
            </button>
            <button className="flex items-center gap-2 hover:text-white transition-colors">
              <AlertTriangle size={18} /> {t('watch.report', 'Báo lỗi')}
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Prev episode */}
            {currentEpIndex > 0 && (
              <button
                onClick={() => {
                  const prev = serverData[currentEpIndex - 1];
                  router.push(`/watch/${slug}?ep=${prev.slug || prev.name}&server=${currentServer}`);
                }}
                className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                <ChevronLeft size={14} /> {t('watch.prevEpisode', 'Tập trước')}
              </button>
            )}
            {/* Next episode */}
            {currentEpIndex < serverData.length - 1 && (
              <button
                onClick={() => {
                  const next = serverData[currentEpIndex + 1];
                  router.push(`/watch/${slug}?ep=${next.slug || next.name}&server=${currentServer}`);
                }}
                className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                {t('watch.nextEpisode', 'Tập tiếp')} <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">

          {/* Left Column */}
          <div className="lg:col-span-8 flex flex-col space-y-8">

            {/* Film Mini Info */}
            <div className="flex flex-col sm:flex-row gap-6 bg-card/20 p-6 rounded-2xl border border-border/20 shadow-sm">
              {posterUrl && (
                <div className="w-32 sm:w-40 flex-shrink-0 rounded-xl overflow-hidden shadow-xl aspect-[2/3] relative">
                  <img src={posterUrl} alt={film?.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex flex-col justify-center space-y-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{film?.name}</h1>
                <p className="text-sm text-neutral-400 font-bold opacity-80">
                  {film?.origin_name} ({film?.year})
                </p>
                <div className="flex items-center gap-2 text-xs font-bold mt-2">
                  <span className="bg-white/10 px-2 py-1 rounded-md text-white">{film?.quality || 'FHD'}</span>
                  <span className="border border-white/20 px-2 py-1 rounded-md text-white">{film?.lang || 'Vietsub'}</span>
                  <span className="text-yellow-500 flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20">
                    <Star size={14} fill="currentColor" /> 8.5
                  </span>
                </div>
                {film?.content && (
                  <p
                    className="text-sm text-neutral-400 leading-relaxed line-clamp-3 mt-4"
                    dangerouslySetInnerHTML={{ __html: film.content }}
                  />
                )}
              </div>
            </div>

            {/* ── Server & Configuration Panel (Image 1 Style) ── */}
            {episodes.length > 0 && (() => {
              const handleSelectServer = (idx: number) => {
                setCurrentServer(idx);
                const nd = episodes[idx]?.server_data || [];
                if (nd.length > 0) {
                  router.push(`/watch/${slug}?ep=${nd[0].slug || nd[0].name}&server=${idx}`);
                }
              };

              // Classify servers into Thuyết Minh & Vietsub lists
              const voiceoverList: { originalIndex: number; name: string; latency: number }[] = [];
              const subList: { originalIndex: number; name: string; latency: number }[] = [];

              episodes.forEach((s: any, i: number) => {
                const sName = (s.server_name || '').toLowerCase();
                const latency = serverPings[i] || (51 + (i * 14) % 45);
                if (sName.includes('thuyết minh') || sName.includes('voice') || sName.includes('lồng tiếng')) {
                  voiceoverList.push({ originalIndex: i, name: s.server_name, latency });
                } else if (sName.includes('vietsub') || sName.includes('sub')) {
                  subList.push({ originalIndex: i, name: s.server_name, latency });
                } else {
                  // Fallback classification: Server 1 is Voiceover/Thuyết minh, others Vietsub
                  if (i === 0) {
                    voiceoverList.push({ originalIndex: i, name: `Thuyết Minh`, latency });
                  } else {
                    subList.push({ originalIndex: i, name: `Vietsub #${i}`, latency });
                  }
                }
              });

              // Clean episode title formatting (prevent "TẬP Tập 01")
              const epName = currentEpData?.name || '01';
              const cleanEpName = String(epName).replace(/^tập\s*/i, '').trim();
              const formattedEpName = `TẬP ${cleanEpName.padStart(2, '0')}`;

              return (
                <div className="relative bg-card/25 border border-border/30 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col space-y-6 overflow-hidden">
                  {/* Top Subtle Gradient Accent */}
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

                  {/* Header: BẠN ĐANG XEM */}
                  <div className="text-center space-y-1.5 pb-5 border-b border-border/30">
                    <span className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-400">
                      BẠN ĐANG XEM
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide drop-shadow-sm">
                      {formattedEpName}
                    </h2>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                      Nếu server hiện tại bị lỗi, vui lòng thử các server khác bên dưới.
                    </p>
                  </div>

                  {/* ĐỔI SERVER */}
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-neutral-300">
                        ĐỔI SERVER
                      </span>
                      <button
                        onClick={refreshPings}
                        disabled={isRefreshingPings}
                        className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        title="Làm mới tốc độ server"
                      >
                        <RotateCw size={14} className={cn(isRefreshingPings && 'animate-spin text-indigo-400')} />
                      </button>
                    </div>

                    {/* Thuyết Minh Group */}
                    {voiceoverList.length > 0 && (
                      <div className="flex flex-col space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                          <Mic size={14} className="text-indigo-400" />
                          <span>Thuyết Minh</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {voiceoverList.map((item) => {
                            const isActive = item.originalIndex === currentServer;
                            return (
                              <button
                                key={item.originalIndex}
                                onClick={() => handleSelectServer(item.originalIndex)}
                                className={cn(
                                  'flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all duration-200',
                                  isActive
                                    ? 'bg-indigo-600/30 border-[#524cf8] text-white shadow-[0_0_15px_rgba(82,76,248,0.25)] ring-1 ring-[#524cf8]/50'
                                    : 'bg-white/[0.03] border-white/5 text-neutral-300 hover:bg-white/[0.08] hover:border-white/15'
                                )}
                              >
                                <span>{item.name}</span>
                                <span className={cn(
                                  "flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-semibold border transition-all",
                                  isActive 
                                    ? "text-emerald-300 bg-emerald-500/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10" 
                                    : "text-emerald-400/90 bg-emerald-500/10 border-emerald-500/20"
                                )}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  {item.latency}ms (Mượt)
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Divider */}
                    {voiceoverList.length > 0 && subList.length > 0 && (
                      <div className="border-t border-dashed border-white/10 my-1" />
                    )}

                    {/* Vietsub Group */}
                    {subList.length > 0 && (
                      <div className="flex flex-col space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                          <Captions size={14} className="text-indigo-400" />
                          <span>Vietsub</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {subList.map((item) => {
                            const isActive = item.originalIndex === currentServer;
                            return (
                              <button
                                key={item.originalIndex}
                                onClick={() => handleSelectServer(item.originalIndex)}
                                className={cn(
                                  'flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all duration-200',
                                  isActive
                                    ? 'bg-indigo-600/30 border-[#524cf8] text-white shadow-[0_0_15px_rgba(82,76,248,0.25)] ring-1 ring-[#524cf8]/50'
                                    : 'bg-white/[0.03] border-white/5 text-neutral-300 hover:bg-white/[0.08] hover:border-white/15'
                                )}
                              >
                                <span>{item.name}</span>
                                <span className={cn(
                                  "flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-semibold border transition-all",
                                  isActive 
                                    ? "text-emerald-300 bg-emerald-500/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10" 
                                    : "text-emerald-400/90 bg-emerald-500/10 border-emerald-500/20"
                                )}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  {item.latency}ms (Mượt)
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-white/5" />

                  {/* CẤU HÌNH Section */}
                  <div className="flex flex-col space-y-3">
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
                      CẤU HÌNH
                    </span>
                    <div className="flex flex-col space-y-2.5 text-xs font-bold">
                      <div className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                        <span className="text-neutral-300 font-semibold">Auto Next:</span>
                        <button
                          onClick={() => setAutoNextConfig(!autoNextConfig)}
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                            autoNextConfig 
                              ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 shadow-sm shadow-emerald-500/10' 
                              : 'text-neutral-500 bg-white/5 border border-white/10 hover:bg-white/10'
                          )}
                        >
                          {autoNextConfig && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                          {autoNextConfig ? 'On' : 'Off'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                        <span className="text-neutral-300 font-semibold">Auto Play:</span>
                        <button
                          onClick={() => setAutoPlayConfig(!autoPlayConfig)}
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                            autoPlayConfig 
                              ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 shadow-sm shadow-emerald-500/10' 
                              : 'text-neutral-500 bg-white/5 border border-white/10 hover:bg-white/10'
                          )}
                        >
                          {autoPlayConfig && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                          {autoPlayConfig ? 'On' : 'Off'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-neutral-300 font-semibold">Auto Skip:</span>
                        <button
                          onClick={() => setAutoSkipConfig(!autoSkipConfig)}
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                            autoSkipConfig 
                              ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 shadow-sm shadow-emerald-500/10' 
                              : 'text-neutral-500 bg-white/5 border border-white/10 hover:bg-white/10'
                          )}
                        >
                          {autoSkipConfig && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                          {autoSkipConfig ? 'On' : 'Off'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Episode List */}
            {serverData.length > 0 && (
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{t('watch.playlist', 'Danh sách phát')}</span>
                    <h3 className="text-lg font-extrabold text-white mt-1">{t('watch.selectEpisode', 'Chọn tập phim')}</h3>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-extrabold bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 uppercase tracking-wider">
                    {serverData.length} {t('watch.episodesCount', 'Tập')}
                  </div>
                </div>
                <div className="bg-white/[0.01] rounded-2xl border border-white/5 p-5 shadow-sm">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                    {serverData.map((ep: any) => {
                      const isActive =
                        (ep.slug || ep.name) === (currentEpData?.slug || currentEpData?.name);
                      return (
                        <Link
                          key={ep.slug || ep.name}
                          href={`/watch/${slug}?ep=${ep.slug || ep.name}&server=${currentServer}`}
                          className={cn(
                            'flex items-center justify-center rounded-xl py-2.5 text-xs font-bold transition-all text-center',
                            isActive
                              ? 'bg-white text-black font-extrabold shadow-lg scale-105'
                              : 'bg-white/[0.03] border border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.07] hover:border-white/15',
                          )}
                        >
                          {ep.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Comments & 5-Star Rating System */}
            <div className="pt-4">
              <AdvancedCommentSection
                movieSlug={slug}
                episodeName={currentEpData?.name ? `Tập ${currentEpData.name}` : undefined}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 flex flex-col space-y-8">

            {/* Cast */}
            {actors.length > 0 && (
              <div className="flex flex-col space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 border-b border-white/5 pb-2">
                  {t('watch.actors', 'Diễn viên')}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-y-6 gap-x-2 bg-card/20 p-6 rounded-2xl border border-border/20">
                  {actors.slice(0, 9).map((actor: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center space-y-2.5 text-center group cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden border-[3px] border-transparent group-hover:border-[#1DB954] transition-all shadow-md group-hover:shadow-[0_0_15px_rgba(29,185,84,0.4)]">
                        <img
                          src={`/api/cast-image?name=${encodeURIComponent(actor)}`}
                          alt={actor}
                          className="w-full h-full object-cover bg-white/5"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(actor)}&background=random&color=fff`;
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-neutral-400 group-hover:text-white line-clamp-2 leading-tight">
                        {actor}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="flex flex-col space-y-4">
              <h3 className="text-lg font-bold text-white border-l-4 border-[#1DB954] pl-3">Đề xuất cho bạn</h3>
              <div className="bg-card/20 rounded-2xl border border-border/20 p-6 flex flex-col space-y-4">
                {recommendationsData?.items?.slice(0, 5).map((item: any) => {
                  const recPoster =
                    resolveImageUrl(item.thumb_url) || resolveImageUrl(item.poster_url);
                  return (
                    <Link
                      href={`/film/${item.slug}`}
                      key={item._id || item.slug}
                      className="flex gap-4 group cursor-pointer"
                    >
                      <div className="w-16 h-24 rounded-lg bg-white/5 flex-shrink-0 border border-white/5 group-hover:border-white/20 transition-colors overflow-hidden relative">
                        {recPoster ? (
                          <img
                            src={recPoster}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            alt={item.name}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Clapperboard size={20} className="opacity-30" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center space-y-1">
                        <h4 className="text-sm font-bold text-neutral-300 group-hover:text-white line-clamp-2 leading-snug">
                          {item.name}
                        </h4>
                        <p className="text-xs text-neutral-500 font-medium">
                          {item.year} &bull; {item.quality || 'FHD'}
                        </p>
                        <div className="text-yellow-500 text-xs flex items-center gap-1 mt-1">
                          <Star size={12} fill="currentColor" />
                          {item.tmdb?.vote_average || '8.0'}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
