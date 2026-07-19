'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, List, ArrowLeft, Play, Tv, Clapperboard, X, Loader2 } from 'lucide-react';
import { movieApi } from '@/lib/api';
import { resolveImageUrl } from '@/components/film/FilmCard';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/providers/ToastProvider';

// Dynamic import to avoid SSR issues with Artplayer
const ArtPlayer = dynamic(() => import('@/components/video/ArtPlayer'), { ssr: false });

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const slug = params.slug as string;
  const currentEp = searchParams.get('ep') || '';
  const [currentServer, setCurrentServer] = useState(0);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [useIframe, setUseIframe] = useState(false);
  const [failedServers, setFailedServers] = useState<number[]>([]);

  const handlePlayerError = (err: any) => {
    console.warn('⚠️ Player error on server index:', currentServer, err);
    if (!failedServers.includes(currentServer)) {
      const updated = [...failedServers, currentServer];
      setFailedServers(updated);
      
      const nextServerIdx = episodes.findIndex((_, idx) => !updated.includes(idx));
      if (nextServerIdx !== -1) {
        toast(`Nguồn phát hiện tại gặp sự cố, đang tự động chuyển sang Server ${nextServerIdx + 1}...`, 'error');
        setCurrentServer(nextServerIdx);
        const nextServerData = episodes[nextServerIdx]?.server_data || [];
        if (nextServerData.length > 0) {
          const firstEpName = nextServerData[0].slug || nextServerData[0].name;
          router.push(`/watch/${slug}?ep=${firstEpName}&server=${nextServerIdx}`);
        }
      } else {
        toast('Tất cả nguồn phát phim hiện tại đều gặp sự cố. Vui lòng tải lại hoặc thử lại sau!', 'error');
      }
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['film', slug],
    queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
  });

  const { data: ophimData } = useQuery({
    queryKey: ['film-ophim', slug],
    queryFn: () => fetch(`/api/ophim/phim/${slug}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .catch(() => null),
    enabled: !!slug,
  });

  const { data: nguoncData } = useQuery({
    queryKey: ['film-nguonc', slug],
    queryFn: () => fetch(`/api/nguonc/film/${slug}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .catch(() => null),
    enabled: !!slug,
  });

  useEffect(() => {
    const serverParam = searchParams.get('server');
    if (serverParam !== null) {
      setCurrentServer(Number(serverParam) || 0);
    }
  }, [searchParams]);

  const film = data?.movie || data;
  
  const kkphimEpisodes: any[] = data?.episodes || [];
  const ophimEpisodes: any[] = ophimData?.episodes || [];
  const nguoncEpisodes: any[] = nguoncData?.episodes || [];

  const mappedKKPhim = kkphimEpisodes.map((s: any, idx: number) => ({
    ...s,
    server_name: kkphimEpisodes.length > 1 ? `Server 1 (#${idx + 1})` : `Server 1`,
  }));
  const mappedOphim = ophimEpisodes.map((s: any, idx: number) => ({
    ...s,
    server_name: ophimEpisodes.length > 1 ? `Server 2 (#${idx + 1})` : `Server 2`,
  }));
  const mappedNguonC = nguoncEpisodes.map((s: any, idx: number) => ({
    ...s,
    server_name: nguoncEpisodes.length > 1 ? `Server 3 (#${idx + 1})` : `Server 3`,
  }));

  const episodes = [...mappedKKPhim, ...mappedOphim, ...mappedNguonC];

  // Find current episode URL
  const server = episodes[currentServer];
  const serverData: any[] = server?.server_data || [];
  const currentEpData = serverData.find((e: any) => (e.slug || e.name) === currentEp) || serverData[0];
  
  const m3u8Url = currentEpData?.link_m3u8 || '';
  const embedUrl = currentEpData?.link_embed || '';
  const videoUrl = m3u8Url || embedUrl;

  const currentEpIndex = serverData.findIndex(
    (e: any) => (e.slug || e.name) === (currentEp || currentEpData?.slug || currentEpData?.name),
  );
  const prevEp = currentEpIndex > 0 ? serverData[currentEpIndex - 1] : null;
  const nextEp = currentEpIndex < serverData.length - 1 ? serverData[currentEpIndex + 1] : null;

  const posterUrl = resolveImageUrl(film?.thumb_url) || resolveImageUrl(film?.poster_url) || undefined;

  // Listen for episode toggle event from Artplayer and handle footer visibility
  useEffect(() => {
    const handleToggle = () => setShowEpisodes((prev) => !prev);
    window.addEventListener('artplayer-toggle-episodes', handleToggle);

    const footer = document.querySelector('footer');
    if (footer) {
      footer.style.display = 'none';
    }

    return () => {
      window.removeEventListener('artplayer-toggle-episodes', handleToggle);
      if (footer) {
        footer.style.display = '';
      }
    };
  }, []);

  return (
    <div className="bg-background min-h-screen text-foreground flex flex-col pt-16">
      {/* Cinematic Top Control Bar */}
      <div className="bg-card/90 border-b border-border h-14 flex items-center justify-between px-4 md:px-8 backdrop-blur z-30">
        <Link
          href={`/film/${slug}`}
          className="inline-flex items-center space-x-1.5 text-muted-foreground hover:text-foreground font-semibold text-xs transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Quay Lại</span>
        </Link>
        <h1 className="text-sm md:text-base font-bold text-foreground max-w-md md:max-w-xl truncate">
          <span>Đang xem: {film?.name}</span>
          {currentEpData?.name && (
            <span className="text-netflixRed"> — Tập {currentEpData.name}</span>
          )}
        </h1>
        <button
          onClick={() => setShowEpisodes(!showEpisodes)}
          className="inline-flex items-center space-x-1 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs px-3 py-1.5 rounded transition-all"
        >
          <List size={14} />
          <span>Chọn Tập</span>
        </button>
      </div>

      {/* Main Player Area & Sidebar */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Column: Player Screen */}
        <div className="flex-1 flex flex-col justify-between bg-black relative p-2 md:p-4">
          <div className="flex-1 flex items-center justify-center relative rounded overflow-hidden shadow-2xl border border-white/5 min-h-[50vh] md:min-h-[65vh]">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-950">
                <Loader2 className="animate-spin text-netflixRed" size={32} />
              </div>
            ) : videoUrl ? (
              <>
                {/* Artplayer (HLS/m3u8) vs Frame embed fallback */}
                {m3u8Url && !useIframe ? (
                  <ArtPlayer
                    url={m3u8Url}
                    type="hls"
                    poster={posterUrl}
                    title={`${film?.name} - Tập ${currentEpData?.name}`}
                    autoplay={false}
                    onReady={(player) => {
                      // Player is ready
                    }}
                    onError={(err) => {
                      handlePlayerError(err);
                    }}
                  />
                ) : embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full absolute inset-0"
                    allowFullScreen
                    allow="autoplay; fullscreen"
                    title={`${film?.name} - ${currentEpData?.name}`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 text-neutral-500">
                    <Clapperboard size={48} className="opacity-40" />
                    <p className="text-sm font-semibold">Không tìm thấy nguồn phát phim này</p>
                  </div>
                )}

                {/* Toggle player source */}
                {m3u8Url && embedUrl && (
                  <button
                    className="absolute bottom-4 right-4 bg-black/80 hover:bg-black border border-white/15 px-3 py-1.5 rounded text-xs font-bold text-neutral-300 hover:text-white flex items-center space-x-1.5 transition-all z-20"
                    onClick={() => setUseIframe(!useIframe)}
                    title={useIframe ? 'Chuyển sang Artplayer' : 'Chuyển sang Iframe'}
                  >
                    {useIframe ? (
                      <>
                        <Play size={12} fill="currentColor" />
                        <span>Artplayer</span>
                      </>
                    ) : (
                      <>
                        <Tv size={12} />
                        <span>Iframe</span>
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 text-neutral-500">
                <Clapperboard size={48} className="opacity-40" />
                <p className="text-sm font-semibold">Không tìm thấy nguồn phát phim</p>
              </div>
            )}
          </div>

          {/* Bottom controls: Episode navigation & Server selection */}
          <div className="mt-4 flex flex-col space-y-4">
            {/* Episode quick navigation buttons */}
            <div className="flex items-center justify-between text-xs bg-card border border-border rounded px-4 py-3 shadow">
              {prevEp ? (
                <Link
                  href={`/watch/${slug}?ep=${prevEp.slug || prevEp.name}&server=${currentServer}`}
                  className="inline-flex items-center space-x-1 bg-secondary hover:bg-secondary/80 text-foreground font-bold px-3 py-1.5 rounded transition-all"
                >
                  <ChevronLeft size={14} />
                  <span>Tập trước</span>
                </Link>
              ) : (
                <div />
              )}

              <span className="text-neutral-400 font-semibold">
                Tập {currentEpIndex + 1} / {serverData.length}
              </span>

              {nextEp ? (
                <Link
                  href={`/watch/${slug}?ep=${nextEp.slug || nextEp.name}&server=${currentServer}`}
                  className="inline-flex items-center space-x-1 bg-secondary hover:bg-secondary/80 text-foreground font-bold px-3 py-1.5 rounded transition-all"
                >
                  <span>Tập tiếp</span>
                  <ChevronRight size={14} />
                </Link>
              ) : (
                <div />
              )}
            </div>

            {/* Server switching controls */}
            {episodes.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 text-xs bg-card border border-border rounded p-4 shadow">
                <span className="text-neutral-400 font-extrabold uppercase tracking-wider mr-2">Chọn Server:</span>
                {episodes.map((s: any, i: number) => (
                  <button
                    key={i}
                    className={cn(
                      "px-3 py-1.5 rounded font-bold transition-all",
                      i === currentServer
                        ? "bg-netflixRed text-white"
                        : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => {
                      setCurrentServer(i);
                      // Reset episode index to 0 for the new server
                      const nextServerData = episodes[i]?.server_data || [];
                      if (nextServerData.length > 0) {
                        const firstEpName = nextServerData[0].slug || nextServerData[0].name;
                        router.push(`/watch/${slug}?ep=${firstEpName}&server=${i}`);
                      }
                    }}
                  >
                    {s.server_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Drawer: Episode selection */}
        <aside
          className={cn(
            "fixed md:relative top-0 right-0 bottom-0 z-40 w-72 md:w-80 bg-card border-l border-border flex flex-col transition-transform duration-300 transform h-full shadow-2xl",
            showEpisodes ? "translate-x-0" : "translate-x-full md:hidden"
          )}
        >
          {/* Sidebar Header */}
          <div className="h-14 flex items-center justify-between border-b border-border px-4 flex-shrink-0 bg-secondary/60">
            <h3 className="text-sm font-bold text-foreground tracking-wide border-l-4 border-netflixRed pl-2">Chọn Tập Phim</h3>
            <button
              onClick={() => setShowEpisodes(false)}
              className="text-muted-foreground hover:text-foreground p-1 focus:outline-none"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable list of episodes */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2 max-h-[calc(100vh-120px)]">
            {serverData.map((ep: any) => {
              const isActive = (ep.slug || ep.name) === (currentEpData?.slug || currentEpData?.name);
              return (
                <Link
                  key={ep.slug || ep.name}
                  href={`/watch/${slug}?ep=${ep.slug || ep.name}&server=${currentServer}`}
                  className={cn(
                    "flex items-center justify-center rounded py-2.5 text-xs font-bold border transition-all text-center",
                    isActive
                      ? "bg-netflixRed border-netflixRed text-white"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setShowEpisodes(false)}
                >
                  Tập {ep.name}
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
