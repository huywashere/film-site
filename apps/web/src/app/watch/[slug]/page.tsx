'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, List, ArrowLeft, Clapperboard,
  Heart, Bell, Star, AlertTriangle, Eye, Server,
  CheckCircle, MessageCircle, SkipForward, X,
} from 'lucide-react';
import { movieApi, watchHistoryApi } from '@/lib/api';
import { resolveImageUrl } from '@/components/film/FilmCard';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/authStore';

const ArtPlayer = dynamic(() => import('@/components/video/ArtPlayer'), { ssr: false });

// ── Skeleton loading ────────────────────────────────────────────────
function WatchSkeleton() {
  return (
    <div className="bg-[#0b0c10] min-h-screen text-foreground pb-20 pt-20 animate-pulse">
      <div className="container mx-auto px-4 lg:px-8 flex flex-col space-y-6 max-w-[1400px]">
        <div className="h-10 bg-white/5 rounded-xl w-64" />
        <div className="bg-black w-full aspect-video rounded-2xl bg-white/5" />
        <div className="h-16 bg-white/5 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 flex flex-col space-y-6">
            <div className="h-40 bg-white/5 rounded-2xl" />
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[...Array(24)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded-xl" />)}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-xl" />)}
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
  return (
    <div className="absolute bottom-20 right-4 z-50">
      <div className="bg-black/90 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-xs text-neutral-400 font-semibold">Tap tiep theo trong</span>
          <span className="text-3xl font-black text-white tabular-nums">{seconds}s</span>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onSkip}
            className="flex items-center gap-2 bg-netflixRed hover:bg-[#c11119] text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
          >
            <SkipForward size={16} /> Xem ngay
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-neutral-300 font-bold text-sm px-4 py-2 rounded-xl transition-colors"
          >
            <X size={14} /> Huy
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

  const slug = params.slug as string;
  const currentEp = searchParams.get('ep') || '';
  const [currentServer, setCurrentServer] = useState(0);
  const [failedServers, setFailedServers] = useState<number[]>([]);

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
    if (currentEpIndex >= 0 && currentEpIndex < serverData.length - 1) {
      setAutoNextCountdown(5);
    }
  }, [currentEpIndex, serverData.length]);

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
      if (!user || !slug || !epName || duration < 10) return;
      const now = Date.now();
      if (now - lastSyncRef.current < 30_000) return;
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
    [user, slug, epName, film?.name, posterUrl],
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

  return (
    <div className="bg-[#0b0c10] min-h-screen text-foreground pb-20 pt-20">
      <div className="container mx-auto px-4 lg:px-8 flex flex-col space-y-6 max-w-[1400px]">

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs md:text-sm text-neutral-400 font-semibold bg-card/40 px-4 py-3 rounded-xl border border-border/40">
          <Link
            href={`/film/${slug}`}
            className="hover:text-white flex items-center transition-colors px-2 py-1 bg-white/5 rounded-md border border-white/5"
          >
            <ArrowLeft size={16} className="mr-1.5" />
            Quay lai
          </Link>
          <span className="opacity-50">/</span>
          <span className="text-white drop-shadow-sm truncate">
            Xem phim {film?.name}{currentEpData?.name && ` - Tap ${currentEpData.name}`}
          </span>
        </div>

        {/* ── Video Player ── */}
        <div className="bg-black w-full aspect-video relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/5">
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
              <p className="text-sm font-semibold">Khong tim thay nguon phat phim</p>
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card/40 px-6 py-4 rounded-xl border border-border/40 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-xs sm:text-sm font-bold text-neutral-400">
            <button className="flex items-center gap-2 hover:text-netflixRed transition-colors">
              <Heart size={18} /> Yeu thich
            </button>
            <button className="flex items-center gap-2 hover:text-[#1DB954] transition-colors">
              <Bell size={18} /> Theo doi
            </button>
            <button className="flex items-center gap-2 hover:text-yellow-500 transition-colors">
              <Star size={18} /> Danh gia
            </button>
            <button className="flex items-center gap-2 hover:text-white transition-colors">
              <AlertTriangle size={18} /> Bao loi
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
                <ChevronLeft size={14} /> Tap truoc
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
                Tap tiep <ChevronRight size={14} />
              </button>
            )}
            <div className="text-sm font-bold text-neutral-500 flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg">
              <Eye size={18} />
              {film?.view ? `${(film.view as number).toLocaleString('vi-VN')} Luot xem` : 'Luot xem'}
            </div>
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

            {/* Server Selection */}
            {episodes.length > 0 && (
              <div className="flex flex-col space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 border-l-4 border-netflixRed pl-3">
                  <Server size={20} className="text-netflixRed" /> Cac ban chieu
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {episodes.map((s: any, i: number) => (
                    <button
                      key={i}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border transition-all text-left group',
                        i === currentServer
                          ? 'bg-gradient-to-r from-[#1DB954]/20 to-[#1DB954]/5 border-[#1DB954] shadow-[0_0_15px_rgba(29,185,84,0.15)]'
                          : 'bg-card/40 border-border/40 hover:bg-card/80 hover:border-white/20 text-neutral-400',
                      )}
                      onClick={() => {
                        setCurrentServer(i);
                        const nd = episodes[i]?.server_data || [];
                        if (nd.length > 0) {
                          router.push(`/watch/${slug}?ep=${nd[0].slug || nd[0].name}&server=${i}`);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-black text-xs',
                            i === currentServer
                              ? 'bg-[#1DB954] text-black'
                              : 'bg-white/10 text-white group-hover:bg-white/20',
                          )}
                        >
                          #{i + 1}
                        </div>
                        <div>
                          <p className={cn('font-bold text-sm', i === currentServer ? 'text-white' : '')}>
                            {s.server_name}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider opacity-60 mt-0.5">Nguon Server</p>
                        </div>
                      </div>
                      {i === currentServer && <CheckCircle size={18} className="text-[#1DB954]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Episode List */}
            {serverData.length > 0 && (
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 border-l-4 border-netflixRed pl-3">
                    <List size={20} className="text-netflixRed" /> Danh sach tap
                  </h3>
                  <div className="text-xs text-neutral-500 font-bold bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                    {serverData.length} Tap
                  </div>
                </div>
                <div className="bg-card/30 rounded-2xl border border-border/30 p-4 shadow-sm">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                    {serverData.map((ep: any) => {
                      const isActive =
                        (ep.slug || ep.name) === (currentEpData?.slug || currentEpData?.name);
                      return (
                        <Link
                          key={ep.slug || ep.name}
                          href={`/watch/${slug}?ep=${ep.slug || ep.name}&server=${currentServer}`}
                          className={cn(
                            'flex items-center justify-center rounded-xl py-3 text-xs font-bold transition-all text-center',
                            isActive
                              ? 'bg-netflixRed text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]'
                              : 'bg-background border border-border text-neutral-400 hover:text-white hover:bg-white/10 hover:border-white/30',
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

            {/* Comments */}
            <div className="flex flex-col space-y-4 pt-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 border-l-4 border-netflixRed pl-3">
                <MessageCircle size={20} className="text-netflixRed" /> Binh luan
              </h3>
              <div className="bg-card/20 rounded-2xl border border-border/20 p-6 flex flex-col space-y-4 min-h-[200px]">
                <textarea
                  placeholder="Viet binh luan cua ban..."
                  className="w-full bg-background border border-border rounded-xl p-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30 transition-colors"
                  rows={3}
                />
                <div className="flex justify-end">
                  <button className="bg-netflixRed hover:bg-[#c11119] text-white font-bold text-sm px-6 py-2 rounded-lg transition-colors">
                    Gui binh luan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 flex flex-col space-y-8">

            {/* Cast */}
            {actors.length > 0 && (
              <div className="flex flex-col space-y-4">
                <h3 className="text-lg font-bold text-white border-l-4 border-[#1DB954] pl-3">Dien vien</h3>
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
              <h3 className="text-lg font-bold text-white border-l-4 border-[#1DB954] pl-3">De xuat cho ban</h3>
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
  );
}
