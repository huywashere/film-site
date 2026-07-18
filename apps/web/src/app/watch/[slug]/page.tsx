'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef, Suspense } from 'react';
import { ChevronLeft, ChevronRight, List, ArrowLeft, Play, Tv, Clapperboard, X } from 'lucide-react';
import { movieApi } from '@/lib/api';
import { resolveImageUrl } from '@/components/film/FilmCard';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

// Dynamic import để tránh SSR issues với Artplayer
const ArtPlayer = dynamic(() => import('@/components/video/ArtPlayer'), { ssr: false });

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const currentEp = searchParams.get('ep') || '';
  const [currentServer, setCurrentServer] = useState(0);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [useIframe, setUseIframe] = useState(false);

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

  useEffect(() => {
    const serverParam = searchParams.get('server');
    if (serverParam !== null) {
      setCurrentServer(Number(serverParam) || 0);
    }
  }, [searchParams]);

  const film = data?.movie || data;
  
  const kkphimEpisodes: any[] = data?.episodes || [];
  const ophimEpisodes: any[] = ophimData?.episodes || [];

  const mappedKKPhim = kkphimEpisodes.map((s: any) => ({
    ...s,
    server_name: `Server 1 (KKPhim) - ${s.server_name}`,
  }));
  const mappedOphim = ophimEpisodes.map((s: any) => ({
    ...s,
    server_name: `Server 2 (Ophim) - ${s.server_name}`,
  }));

  const episodes = [...mappedKKPhim, ...mappedOphim];

  // Find current episode URL
  const server = episodes[currentServer];
  const serverData: any[] = server?.server_data || [];
  const currentEpData = serverData.find((e: any) => (e.slug || e.name) === currentEp) || serverData[0];
  
  // Ưu tiên link_m3u8 cho Artplayer, fallback về link_embed cho iframe
  const m3u8Url = currentEpData?.link_m3u8 || '';
  const embedUrl = currentEpData?.link_embed || '';
  const videoUrl = m3u8Url || embedUrl;

  const currentEpIndex = serverData.findIndex((e: any) => (e.slug || e.name) === (currentEp || currentEpData?.slug || currentEpData?.name));
  const prevEp = currentEpIndex > 0 ? serverData[currentEpIndex - 1] : null;
  const nextEp = currentEpIndex < serverData.length - 1 ? serverData[currentEpIndex + 1] : null;

  const posterUrl = resolveImageUrl(film?.thumb_url) || resolveImageUrl(film?.poster_url) || undefined;

  // Listen for episode toggle event from Artplayer and handle footer visibility
  useEffect(() => {
    const handleToggle = () => setShowEpisodes(prev => !prev);
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
    <div className={styles.watchPage}>
      {/* Top bar */}
      <div className={styles.watchTopBar}>
        <Link href={`/film/${slug}`} className="btn btn-ghost btn-sm">
          <ArrowLeft size={15} /> Quay Lại
        </Link>
        <h1 className={styles.watchTitle}>
          {film?.name}
          {currentEpData?.name && <span className={styles.watchEpLabel}> — Tập {currentEpData.name}</span>}
        </h1>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowEpisodes(!showEpisodes)}
        >
          <List size={15} /> Danh sách tập
        </button>
      </div>

      <div className={styles.watchLayout}>
        {/* Player */}
        <div className={styles.playerCol}>
          <div className={styles.playerWrapper}>
            {isLoading ? (
              <div className={`skeleton ${styles.playerSkeleton}`} />
            ) : videoUrl ? (
              <>
                {/* Nếu có m3u8, dùng Artplayer; nếu chỉ có embed hoặc user force iframe, dùng iframe */}
                {m3u8Url && !useIframe ? (
                  <ArtPlayer
                    url={m3u8Url}
                    type="hls"
                    poster={posterUrl}
                    title={`${film?.name} - Tập ${currentEpData?.name}`}
                    autoplay={false}
                    onReady={(player) => {
                      console.log('🎬 Artplayer ready:', player);
                    }}
                  />
                ) : embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className={styles.player}
                    allowFullScreen
                    allow="autoplay; fullscreen"
                    title={`${film?.name} - ${currentEpData?.name}`}
                  />
                ) : (
                  <div className={styles.noVideo}>
                    <Clapperboard size={36} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                    <p>Không tìm thấy nguồn phim</p>
                  </div>
                )}

                {/* Toggle between Artplayer and iframe */}
                {m3u8Url && embedUrl && (
                  <button
                    className={`btn btn-ghost btn-sm ${styles.playerToggle}`}
                    onClick={() => setUseIframe(!useIframe)}
                    title={useIframe ? 'Chuyển sang Artplayer' : 'Chuyển sang Iframe'}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {useIframe ? <><Play size={12} fill="currentColor" /> Artplayer</> : <><Tv size={12} /> Iframe</>}
                  </button>
                )}
              </>
            ) : (
              <div className={styles.noVideo}>
                <Clapperboard size={36} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                <p>Không tìm thấy nguồn phim</p>
              </div>
            )}
          </div>

          {/* Episode Navigation */}
          <div className={styles.epNav}>
            {prevEp ? (
              <Link
                href={`/watch/${slug}?ep=${prevEp.slug || prevEp.name}&server=${currentServer}`}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={15} /> Tập trước
              </Link>
            ) : <div />}

            <span className={styles.epNavInfo}>
              Tập {currentEpIndex + 1} / {serverData.length}
            </span>

            {nextEp ? (
              <Link
                href={`/watch/${slug}?ep=${nextEp.slug || nextEp.name}&server=${currentServer}`}
                className="btn btn-secondary btn-sm"
              >
                Tập tiếp <ChevronRight size={15} />
              </Link>
            ) : <div />}
          </div>

          {/* Server selection */}
          {episodes.length > 1 && (
            <div className={styles.serverSelect}>
              <span className={styles.serverLabel}>Nguồn:</span>
              {episodes.map((s: any, i: number) => (
                <button
                  key={i}
                  className={`btn btn-sm ${i === currentServer ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCurrentServer(i)}
                >
                  {s.server_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Episode Sidebar */}
        <aside className={`${styles.epSidebar} ${showEpisodes ? styles.epSidebarOpen : ''}`}>
          <div className={styles.epSidebarHeader}>
            <h3>Danh Sách Tập</h3>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowEpisodes(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.epList}>
            {serverData.map((ep: any) => {
              const isActive = (ep.slug || ep.name) === (currentEpData?.slug || currentEpData?.name);
              return (
                <Link
                  key={ep.slug || ep.name}
                  href={`/watch/${slug}?ep=${ep.slug || ep.name}&server=${currentServer}`}
                  className={`${styles.epListItem} ${isActive ? styles.epListItemActive : ''}`}
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
