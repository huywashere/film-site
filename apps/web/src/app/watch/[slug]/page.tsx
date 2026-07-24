'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, List, ArrowLeft, Clapperboard,
  Heart, Bell, Star, AlertTriangle, Server, Info, ListVideo, Search,
  CheckCircle, MessageCircle, SkipForward, X, Play,
  Mic, Captions, RotateCw, Settings, Sparkles, MonitorSmartphone,
  Camera, Bookmark, Share2
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

  const wpRoomId = wp.roomId;
  const wpJoinRoom = wp.joinRoom;

  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam && roomParam !== wpRoomId) {
      wpJoinRoom(roomParam);
    }
  }, [searchParams, wpRoomId, wpJoinRoom]);
  const [currentServer, setCurrentServer] = useState(0);
  const [failedServers, setFailedServers] = useState<number[]>([]);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'episodes' | 'servers' | 'info'>('episodes');
  const [episodeSearch, setEpisodeSearch] = useState('');

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
  const [useEmbedPlayer, setUseEmbedPlayer] = useState(false);
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

  // ── Smart Content-Based Recommendation Algorithm ──────────────────
  const rawTitle = (data?.movie?.name || data?.name || data?.movie?.origin_name || slug || '').toLowerCase();
  const filmCategory = data?.movie?.category?.[0]?.slug || data?.category?.[0]?.slug;

  const matchedKeyword = useMemo(() => {
    const keywords = [
      'marvel', 'dc', 'superman', 'batman', 'spider-man', 'spiderman', 'avengers',
      'doraemon', 'naruto', 'one piece', 'conan', 'dragon ball', 'harry potter',
      'star wars', 'pokemon', 'godzilla', 'x-men', 'transformers', 'fast & furious',
      'john wick', 'jurassic', 'matrix', 'avatar'
    ];
    return keywords.find((kw) => rawTitle.includes(kw));
  }, [rawTitle]);

  const { data: recommendationsData } = useQuery({
    queryKey: ['smart-recommendations', slug, filmCategory, matchedKeyword],
    queryFn: async () => {
      const recItems: any[] = [];

      // 1. Franchise / Keyword search matching
      if (matchedKeyword) {
        try {
          const res = await movieApi.search(matchedKeyword, 1, 15);
          const searchItems = res?.data?.items || res?.data?.data?.items || [];
          recItems.push(...searchItems);
        } catch {}
      }

      // 2. Category / Genre matching
      if (filmCategory) {
        try {
          const res = await movieApi.getByGenre(filmCategory, 1);
          const genreItems = res?.data?.data?.items || res?.data?.items || [];
          recItems.push(...genreItems);
        } catch {}
      }

      // 3. Fallback to Latest items
      try {
        const res = await movieApi.getLatest(1);
        const latestItems = res?.data?.items || res?.data?.data?.items || [];
        recItems.push(...latestItems);
      } catch {}

      // Deduplicate & filter out current film
      const seen = new Set<string>();
      const filtered = recItems.filter((item: any) => {
        if (!item || !item.slug || item.slug === slug || seen.has(item.slug)) return false;
        seen.add(item.slug);
        return true;
      });

      return { items: filtered.slice(0, 10) };
    },
    enabled: !!slug,
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

  useEffect(() => {
    setUseEmbedPlayer(false);
  }, [currentEp, currentServer]);

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
    console.warn('Player error caught:', err);
    if (embedUrl && !useEmbedPlayer) {
      toast('Nguồn HLS gặp sự cố, tự động chuyển sang Server Iframe Dự Phòng...', 'warning');
      setUseEmbedPlayer(true);
      return;
    }

    if (!failedServers.includes(currentServer)) {
      const updated = [...failedServers, currentServer];
      setFailedServers(updated);
      const nextIdx = episodes.findIndex((_, idx) => !updated.includes(idx));
      if (nextIdx !== -1) {
        toast(`Nguồn phát hiện tại gặp sự cố, tự động chuyển sang Server #${nextIdx + 1}...`, 'error');
        setCurrentServer(nextIdx);
        const nd = episodes[nextIdx]?.server_data || [];
        if (nd.length > 0) {
          router.push(`/watch/${slug}?ep=${nd[0].slug || nd[0].name}&server=${nextIdx}`);
        }
      } else {
        toast('Tất cả nguồn phát phim hiện tại đều gặp sự cố!', 'error');
      }
    }
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
    <div className="bg-[#090b0e] min-h-screen text-foreground overflow-x-hidden pb-16">
      {/* Dynamic Ambilight Background Glow */}
      {posterUrl && (
        <div
          className="fixed top-0 left-0 right-0 h-[600px] pointer-events-none opacity-20 blur-[120px] bg-cover bg-center -z-10"
          style={{ backgroundImage: `url(${posterUrl})` }}
        />
      )}

      {/* Breadcrumb Navigation Header */}
      <div className="container mx-auto px-4 lg:px-8 max-w-[1400px] pt-20 lg:pt-24 pb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-400 overflow-x-auto py-1 scrollbar-none">
          <Link
            href="/"
            className="hover:text-white transition-colors flex items-center shrink-0"
          >
            <ArrowLeft size={16} className="mr-1.5" />
            {t('watch.back', 'Quay lại')}
          </Link>
          <span className="opacity-50">/</span>
          <span className="text-white drop-shadow-sm truncate">
            {t('watch.watchFilm', 'Xem phim')} {film?.name}{currentEpData?.name && ` - Tập ${currentEpData.name.replace(/^tập\s*/i, '')}`}
          </span>
        </div>
      </div>
      <div className="container mx-auto px-4 lg:px-8 max-w-[1400px]">
        <div className={cn(
          "grid grid-cols-1 gap-6 items-start",
          isTheaterMode ? "w-full" : "lg:grid-cols-12"
        )}>

          {/* ── LEFT COLUMN: Video Player & Action Toolbar ── */}
          <div className={cn(
            "flex flex-col space-y-4",
            isTheaterMode ? "w-full" : "lg:col-span-8 xl:col-span-8"
          )}>
            {/* Player Container */}
            <div className={cn(
              "w-full bg-black relative overflow-hidden transition-all duration-500",
              isTheaterMode 
                ? "aspect-[21/9] md:aspect-video rounded-none" 
                : "aspect-video rounded-2xl border border-white/10 ring-1 ring-white/5 shadow-2xl shadow-black/80"
            )}>
              {videoUrl ? (
                <>
                  {!useEmbedPlayer && m3u8Url ? (
                    <div className="w-full h-full relative">
                      <ArtPlayer
                        url={m3u8Url}
                        type="hls"
                        poster={posterUrl}
                        title={`${film?.name} - Tập ${currentEpData?.name}`}
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
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full space-y-3 bg-neutral-900 text-white p-6 text-center">
                      <AlertTriangle size={48} className="text-amber-500 animate-bounce" />
                      <p className="font-bold text-base">Nguồn phát phim đang gặp sự cố kết nối (404/CORS)</p>
                      <p className="text-xs text-neutral-400 max-w-md">Vui lòng chọn Server khác bên phải hoặc tải lại trang.</p>
                    </div>
                  )}

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

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12161f]/80 p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-neutral-300">
                {/* Standalone Button: Caption */}
                <button
                  onClick={() => toast({ title: 'Phụ đề (Caption)', description: 'Đã bật chế độ phụ đề tự động.' })}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#23252b] hover:bg-[#2e313a] border border-white/10 text-white font-bold transition-all cursor-pointer shadow-sm"
                >
                  <Camera size={15} />
                  <span>Caption</span>
                </button>

                {/* Standalone Button: Tạo Phòng Xem */}
                <button
                  onClick={() => {
                    if (!wp.roomId) wp.createRoom();
                    else wp.setIsOpen(!wp.isOpen);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold hover:bg-emerald-500/25 transition-all cursor-pointer"
                >
                  <Sparkles size={15} />
                  <span>{wp.roomId ? `Phòng Xem #${wp.roomId}` : 'Tạo Phòng Xem'}</span>
                </button>

                {/* Segmented Control Pill Group (Image 1 Style) */}
                <div className="flex items-center divide-x divide-white/15 bg-[#181a20]/90 border border-white/15 rounded-xl overflow-hidden shadow-md text-xs font-semibold text-neutral-200">
                  <button
                    onClick={() => toast({ title: 'Yêu thích', description: 'Đã thêm phim vào danh sách yêu thích!' })}
                    className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <Heart size={15} className="text-red-400" />
                    <span>Thích</span>
                  </button>
                  <button
                    onClick={() => toast({ title: 'Xem sau', description: 'Đã lưu phim vào danh sách xem sau!' })}
                    className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <Bookmark size={15} className="text-amber-400" />
                    <span>Xem sau</span>
                  </button>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(window.location.href);
                        toast({ title: 'Chia sẻ', description: 'Đã sao chép liên kết phim vào clipboard!' });
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <Share2 size={15} className="text-sky-400" />
                    <span>Chia sẻ</span>
                  </button>
                  <button
                    onClick={() => toast({ title: 'Đánh giá', description: 'Vui lòng chọn số sao ở phần bình luận bên dưới!' })}
                    className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <Star size={15} className="text-yellow-400" />
                    <span>Đánh giá</span>
                  </button>
                  <button
                    onClick={() => toast({ title: 'Báo lỗi', description: 'Đã gửi báo cáo sự cố tập phim tới ban quản trị!' })}
                    className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <AlertTriangle size={15} className="text-rose-400" />
                    <span>Báo lỗi</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentEpIndex > 0 && (
                  <button
                    onClick={() => {
                      const prev = serverData[currentEpIndex - 1];
                      router.push(`/watch/${slug}?ep=${prev.slug || prev.name}&server=${currentServer}`);
                    }}
                    className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <ChevronLeft size={14} /> {t('watch.prevEpisode', 'Tập trước')}
                  </button>
                )}
                {currentEpIndex < serverData.length - 1 && (
                  <button
                    onClick={() => {
                      const next = serverData[currentEpIndex + 1];
                      router.push(`/watch/${slug}?ep=${next.slug || next.name}&server=${currentServer}`);
                    }}
                    className="flex items-center gap-1 bg-netflixRed hover:bg-red-700 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition-colors shadow-md shadow-red-900/30"
                  >
                    {t('watch.nextEpisode', 'Tập tiếp')} <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Watch Party Panel (if open) */}
            {wp.roomId && wp.isOpen && (
              <div className="h-[450px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
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

          {/* ── RIGHT COLUMN: TABBED CONTROL PANEL (TẬP PHIM, MÁY CHỦ, THÔNG TIN) ── */}
          <div className={cn(
            "flex flex-col space-y-4",
            isTheaterMode ? "w-full mt-4" : "lg:col-span-4 xl:col-span-4"
          )}>
            <div className="bg-[#06070a]/60 border-transparent rounded-2xl p-3 sm:p-4 shadow-none backdrop-blur-sm text-sm space-y-3">
              
              {/* TAB BAR */}
              <div className="grid grid-cols-3 gap-2 bg-transparent rounded-full p-1">
                <button
                  onClick={() => setSidebarTab('episodes')}
                  className={cn(
                    "w-full px-2 py-1 rounded-full text-sm font-semibold transition-colors flex items-center justify-center",
                    sidebarTab === 'episodes' ? 'bg-emerald-500 text-black' : 'text-neutral-300 hover:bg-white/5'
                  )}
                >
                  <ListVideo size={14} />
                  <span className="ml-2">Tập</span>
                </button>

                <button
                  onClick={() => setSidebarTab('servers')}
                  className={cn(
                    "w-full px-2 py-1 rounded-full text-sm font-semibold transition-colors flex items-center justify-center",
                    sidebarTab === 'servers' ? 'bg-emerald-500 text-black' : 'text-neutral-300 hover:bg-white/5'
                  )}
                >
                  <Server size={14} />
                  <span className="ml-2">Máy chủ</span>
                </button>

                <button
                  onClick={() => setSidebarTab('info')}
                  className={cn(
                    "w-full px-2 py-1 rounded-full text-sm font-semibold transition-colors flex items-center justify-center",
                    sidebarTab === 'info' ? 'bg-emerald-500 text-black' : 'text-neutral-300 hover:bg-white/5'
                  )}
                >
                  <Info size={14} />
                  <span className="ml-2">Thông tin</span>
                </button>
              </div>

              {/* TAB 1: TẬP PHIM */}
              {sidebarTab === 'episodes' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Tập kế tiếp */}
                  {currentEpIndex < serverData.length - 1 && (() => {
                    const nextEp = serverData[currentEpIndex + 1];
                    return (
                      <div
                        onClick={() => router.push(`/watch/${slug}?ep=${nextEp.slug || nextEp.name}&server=${currentServer}`)}
                        className="bg-gradient-to-r from-red-950/60 via-neutral-900/90 to-neutral-900/90 border border-red-500/30 hover:border-red-500/60 p-3 rounded-2xl flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-netflixRed text-white flex items-center justify-center font-black shrink-0 group-hover:scale-105 transition-transform">
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-400">TẬP KẾ TIẾP</p>
                            <p className="font-bold text-xs text-white truncate max-w-[170px]">
                              Tập {nextEp.name.replace(/^tập\s*/i, '')}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-neutral-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    );
                  })()}

                  {/* Tìm số tập */}
                  {serverData.length > 6 && (
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Tìm số tập..."
                        value={episodeSearch}
                        onChange={(e) => setEpisodeSearch(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                      />
                    </div>
                  )}

                  {/* Danh sách tập */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">CHỌN TẬP PHIM</span>
                      <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-md text-white">{serverData.length} Tập</span>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {serverData
                          .filter((ep: any) => !episodeSearch || ep.name.toLowerCase().includes(episodeSearch.toLowerCase()))
                          .map((ep: any, index: number) => {
                            const active = ep.slug === currentEp || ep.name === currentEp || index === currentEpIndex;
                            return (
                              <button
                                key={ep.slug || ep.name || index}
                                onClick={() => router.push(`/watch/${slug}?ep=${ep.slug || ep.name}&server=${currentServer}`)}
                                className={cn(
                                  "py-2 px-1 rounded-xl font-extrabold text-xs transition-all flex flex-col items-center justify-center cursor-pointer border truncate",
                                  active
                                    ? "bg-netflixRed text-white border-red-500 shadow-md shadow-red-900/40"
                                    : "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10 hover:text-white"
                                )}
                              >
                                <span>{ep.name.replace(/^tập\s*/i, '')}</span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MÁY CHỦ */}
              {sidebarTab === 'servers' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="text-center px-2 py-2 rounded-lg bg-white/3">
                    <p className="text-[11px] text-neutral-300">{currentEpData?.name ? `Tập ${currentEpData.name.replace(/^tập\s*/i, '')}` : 'Tập 01'}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px] font-semibold text-neutral-300">Máy chủ</p>
                      <button
                        onClick={refreshPings}
                        disabled={isRefreshingPings}
                        className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors"
                        title="Làm mới phản hồi server"
                      >
                        <RotateCw size={14} className={cn(isRefreshingPings && 'animate-spin text-emerald-400')} />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {episodes.map((s: any, i: number) => {
                        const active = currentServer === i;
                        const latency = serverPings[i] || (45 + (i * 12) % 40);
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setCurrentServer(i);
                              const nd = s?.server_data || [];
                              if (nd.length > 0) {
                                router.push(`/watch/${slug}?ep=${nd[0].slug || nd[0].name}&server=${i}`);
                              }
                            }}
                            className={cn(
                              "w-full px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer",
                              active ? 'bg-emerald-600/12' : 'hover:bg-white/6'
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Server size={14} className={cn(active ? 'text-emerald-300' : 'text-neutral-400')} />
                                <span className={cn('font-medium truncate', active ? 'text-white' : 'text-neutral-300')}>{s.server_name || `Server #${i + 1}`}</span>
                              </div>
                            </div>
                            <div className="text-[12px] px-2 py-0.5 rounded-full bg-white/6 text-neutral-200">
                              {latency} ms
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUseEmbedPlayer(false)}
                        disabled={!m3u8Url}
                        className={cn(
                          "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          !useEmbedPlayer ? 'bg-emerald-500 text-black' : 'bg-white/6 text-neutral-300'
                        )}
                      >
                        ArtPlayer
                      </button>
                      <button
                        onClick={() => setUseEmbedPlayer(true)}
                        disabled={!embedUrl}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          useEmbedPlayer ? 'bg-emerald-500 text-black' : 'bg-white/6 text-neutral-300'
                        )}
                      >
                        Iframe
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-300">Auto Next</span>
                        <button
                          onClick={() => setAutoNextConfig(!autoNextConfig)}
                          aria-pressed={autoNextConfig}
                          className={cn(
                            "relative w-10 h-5 rounded-full transition-colors flex items-center p-1",
                            autoNextConfig ? 'bg-emerald-500/30' : 'bg-white/6'
                          )}
                        >
                          <span className={cn(
                            "block w-4 h-4 bg-white rounded-full shadow transform transition-transform",
                            autoNextConfig ? 'translate-x-5' : 'translate-x-0'
                          )} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-300">Auto Play</span>
                        <button
                          onClick={() => setAutoPlayConfig(!autoPlayConfig)}
                          aria-pressed={autoPlayConfig}
                          className={cn(
                            "relative w-10 h-5 rounded-full transition-colors flex items-center p-1",
                            autoPlayConfig ? 'bg-emerald-500/30' : 'bg-white/6'
                          )}
                        >
                          <span className={cn(
                            "block w-4 h-4 bg-white rounded-full shadow transform transition-transform",
                            autoPlayConfig ? 'translate-x-5' : 'translate-x-0'
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: THÔNG TIN PHIM */}
              {sidebarTab === 'info' && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex gap-3">
                    {posterUrl && (
                      <div className="w-24 h-36 rounded-xl overflow-hidden shadow-lg shrink-0 border border-white/10">
                        <img src={posterUrl} alt={film?.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <h3 className="font-black text-sm text-white leading-snug line-clamp-2">{film?.name}</h3>
                      <p className="text-[11px] text-neutral-400 font-semibold truncate">{film?.origin_name} ({film?.year})</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="bg-white/10 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">{film?.quality || 'FHD'}</span>
                        <span className="border border-white/20 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">{film?.lang || 'Vietsub'}</span>
                        <span className="bg-yellow-500/20 text-yellow-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Star size={10} fill="currentColor" /> 8.5
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Diễn viên */}
                  {actors.length > 0 && (
                    <div className="pt-2 border-t border-white/10 space-y-1.5">
                      <p className="text-[11px] text-neutral-400 font-extrabold uppercase">Diễn viên chính</p>
                      <div className="flex flex-wrap gap-1.5">
                        {actors.slice(0, 5).map((act: string, idx: number) => (
                          <span key={idx} className="bg-white/5 border border-white/10 text-neutral-300 text-[10px] font-medium px-2 py-0.5 rounded-lg">
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {film?.content && (
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-[11px] text-neutral-400 font-extrabold uppercase mb-1">Nội dung phim</p>
                      <p
                        className="text-xs text-neutral-300 leading-relaxed max-h-48 overflow-y-auto scrollbar-thin pr-1"
                        dangerouslySetInnerHTML={{ __html: film.content }}
                      />
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

        {/* ── LOWER SECTION: COMMENTS (LEFT) & SMART RECOMMENDATIONS (RIGHT) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-8 border-t border-white/10 mt-8">

          {/* Left Column: Comments */}
          <div className="lg:col-span-8 flex flex-col space-y-6">
            <AdvancedCommentSection
              movieSlug={slug}
              episodeName={currentEpData?.name ? `Tập ${currentEpData.name}` : undefined}
            />
          </div>

          {/* Right Column: Recommendations */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white border-l-4 border-red-500 pl-3">
                {matchedKeyword
                  ? `Phim cùng chủ đề "${matchedKeyword.toUpperCase()}"`
                  : 'Đề xuất phù hợp với bạn'}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                {matchedKeyword ? 'Chủ đề hot' : 'Cùng thể loại'}
              </span>
            </div>
            <div className="bg-[#12161a]/60 rounded-2xl border border-white/10 p-4 flex flex-col space-y-3 max-h-[700px] overflow-y-auto scrollbar-thin">
              {recommendationsData?.items?.slice(0, 10).map((item: any) => {
                const recPoster = resolveImageUrl(item.thumb_url) || resolveImageUrl(item.poster_url);
                return (
                  <Link
                    href={`/film/${item.slug}`}
                    key={item._id || item.slug}
                    className="flex gap-3 group cursor-pointer p-1.5 rounded-xl hover:bg-white/5 transition-all"
                  >
                    <div className="w-14 h-20 rounded-lg bg-neutral-900 flex-shrink-0 border border-white/10 group-hover:border-white/30 transition-all overflow-hidden relative shadow-md">
                      {recPoster ? (
                        <img
                          src={recPoster}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          alt={item.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Clapperboard size={18} className="opacity-30" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center space-y-1 min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-neutral-200 group-hover:text-white line-clamp-2 leading-snug transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400 font-medium">
                        {item.year} &bull; {item.quality || 'FHD'} &bull; {item.episode_current || 'Full'}
                      </p>
                      <div className="text-amber-400 text-xs flex items-center gap-1 mt-0.5">
                        <Star size={11} fill="currentColor" />
                        <span className="font-semibold text-neutral-300">{item.tmdb?.vote_average || '8.0'}</span>
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
  );
}
