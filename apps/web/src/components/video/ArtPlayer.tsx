'use client';
import { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

export interface ArtPlayerProps {
  url: string;
  type?: 'hls' | 'mp4' | 'auto';
  poster?: string;
  title?: string;
  subtitle?: string;
  autoplay?: boolean;
  /** slug + episode name combination — used as localStorage key for resume */
  progressKey?: string;
  /** Server-side progress fallback if localStorage is empty */
  dbProgress?: number;
  /** Called when video ends naturally — use for auto-next episode logic */
  onEnded?: () => void;
  /** Called periodically with progress — use for server-side watch history sync */
  onProgress?: (currentTime: number, duration: number) => void;
  onReady?: (player: Artplayer) => void;
  onError?: (error: unknown) => void;
}

export default function ArtPlayer({
  url,
  type = 'auto',
  poster,
  title,
  subtitle,
  autoplay = false,
  progressKey,
  dbProgress,
  onEnded,
  onProgress,
  onReady,
  onError,
}: ArtPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Artplayer | null>(null);
  // Keep latest callbacks in ref to avoid stale closures in event handlers
  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);
  const onErrorRef = useRef(onError);
  onEndedRef.current = onEnded;
  onProgressRef.current = onProgress;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!containerRef.current || !url) return;

    const isHls =
      type === 'hls' || url.includes('.m3u8') || (type === 'auto' && url.includes('.m3u8'));

    // -- HLS quality levels (populated after manifest load) --
    let hlsInstance: Hls | null = null;
    const qualityLevels: { default: boolean; html: string; url: string }[] = [];

    const player = new Artplayer({
      container: containerRef.current,
      url,
      poster,
      title,
      volume: 0.8,
      autoplay,
      autoSize: false,
      autoMini: true,
      screenshot: true,
      setting: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: true,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: true,
      theme: '#e5a93b',
      lang: 'vi',
      moreVideoAttr: { crossOrigin: 'anonymous' },

      // -- HLS support with quality selector --
      ...(isHls
        ? {
            customType: {
              m3u8: (video: HTMLMediaElement, streamUrl: string) => {
                if (Hls.isSupported()) {
                  const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                    // ABR tuning for faster start
                    startLevel: -1,    // auto ABR
                    abrEwmaFastLive: 3,
                    abrEwmaSlowLive: 9,
                  });
                  hlsInstance = hls;
                  hls.loadSource(streamUrl);
                  hls.attachMedia(video);

                  hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
                    // Build quality options from HLS levels
                    const levels = data.levels ?? [];
                    if (levels.length > 1) {
                      const built = levels.map((level, i) => ({
                        default: i === hls.currentLevel || (hls.currentLevel === -1 && i === 0),
                        html: level.height ? `${level.height}p` : `Level ${i + 1}`,
                        url: streamUrl,
                        level: i,
                      }));
                      // Add Auto option
                      qualityLevels.unshift({ default: hls.currentLevel === -1, html: 'Auto', url: streamUrl, level: -1 } as typeof qualityLevels[number]);
                      built.forEach(q => qualityLevels.push(q as typeof qualityLevels[number]));

                      player.setting.update({
                        name: 'quality',
                        html: 'Chất lượng',
                        tooltip: built.find(q => q.default)?.html ?? 'Auto',
                        selector: qualityLevels.map(q => ({
                          default: q.default,
                          html: q.html,
                          url: q.url,
                          level: (q as { level?: number }).level ?? -1,
                        })),
                        onSelect(item: { level: number; html: string }) {
                          hls.currentLevel = item.level ?? -1;
                          return item.html;
                        },
                      } as any);
                    }
                  });

                  hls.on(Hls.Events.ERROR, (_event, data) => {
                    if (data.fatal) {
                      switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                          hls.startLoad();
                          break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                          hls.recoverMediaError();
                          break;
                        default:
                          hls.destroy();
                          onErrorRef.current?.({ type: 'HLS_FATAL_ERROR', details: data });
                      }
                    }
                  });

                  (video as HTMLMediaElement & { hls: Hls }).hls = hls;
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                  video.src = streamUrl;
                }
              },
            },
          }
        : {}),

      // Hotkey settings
      hotkey: true,

      // Subtitle
      ...(subtitle
        ? {
            subtitle: {
              url: subtitle,
              type: 'vtt',
              style: { color: '#fff', fontSize: '20px' },
            },
          }
        : {}),

      layers: [],

      icons: {
        loading:
          '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"><animate attributeName="stroke-dasharray" dur="1.5s" repeatCount="indefinite" values="1,200;89,200;89,200" /><animate attributeName="stroke-dashoffset" dur="1.5s" repeatCount="indefinite" values="0;-35;-124" /></circle></svg>',
        play: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
        pause:
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
      },
    } as unknown as ConstructorParameters<typeof Artplayer>[0]);

    playerRef.current = player;

    // -- Ready callback --
    if (onReady) {
      player.on('ready', () => onReady(player));
    }

    // -- Resume: restore saved position using progressKey (slug+ep) or dbProgress --
    const savedKey = progressKey ? `wp_${progressKey}` : null;
    let startTime = 0;
    if (savedKey) {
      const saved = localStorage.getItem(savedKey);
      if (saved) {
        startTime = parseFloat(saved);
      }
    }
    if (startTime === 0 && dbProgress) {
      startTime = dbProgress;
    }

    if (startTime > 5) {
      player.on('ready', () => {
        if (startTime < player.duration - 10) {
          player.currentTime = startTime;
          player.notice.show = `Tiếp tục từ ${formatTime(startTime)}`;
        }
      });
    }

    // -- Save progress to localStorage (every timeupdate, throttled) --
    let lastSave = 0;
    player.on('video:timeupdate', () => {
      const now = Date.now();
      const ct = player.currentTime;
      const dur = player.duration;
      if (dur > 0) {
        // Throttle localStorage write to once per 5s
        if (now - lastSave > 5000) {
          lastSave = now;
          if (savedKey) localStorage.setItem(savedKey, ct.toString());
        }
        // Throttle onProgress callback to once per 30s for server sync
        onProgressRef.current?.(ct, dur);
      }
    });

    // -- Video ended → clear saved progress, fire callback --
    player.on('video:ended', () => {
      if (savedKey) localStorage.removeItem(savedKey);
      onEndedRef.current?.();
    });

    // -- Native error --
    player.on('video:error', (err) => {
      onErrorRef.current?.({ type: 'NATIVE_ERROR', details: err });
    });

    return () => {
      if (playerRef.current) {
        const video = playerRef.current.video;
        if (video && (video as any).hls) {
          (video as any).hls.destroy();
        }
        playerRef.current.destroy(false);
        playerRef.current = null;
      }
      hlsInstance?.destroy();
    };
  // Only re-run when url changes (the source). Other props use refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, progressKey]);

  return (
    <>
      <style jsx global>{`
        .art-video-player {
          --art-theme: #e5a93b;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .art-video-player .art-control-progress-inner { background: #e5a93b; }
        .art-video-player .art-icon:hover,
        .art-video-player .art-control:hover { color: #e5a93b; }
        .art-video-player .art-bottom {
          background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%);
        }
        .art-video-player .art-setting,
        .art-video-player .art-contextmenu {
          background: rgba(20,24,28,0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
        }
        .art-video-player .art-setting-item:hover,
        .art-video-player .art-contextmenu-item:hover {
          background: rgba(229,169,59,0.15);
          color: #e5a93b;
        }
        .art-video-player .art-notice {
          background: rgba(20,24,28,0.9);
          backdrop-filter: blur(8px);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 0.75rem 1.25rem;
          font-size: 0.875rem;
        }
        .art-video-player .art-loading { color: #e5a93b; }
      `}</style>

      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />
    </>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
