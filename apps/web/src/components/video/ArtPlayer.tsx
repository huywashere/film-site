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
  isTheaterMode?: boolean;
  onTheaterModeToggle?: (active: boolean) => void;
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
  isTheaterMode = false,
  onTheaterModeToggle,
}: ArtPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Artplayer | null>(null);

  const isTheaterModeRef = useRef(isTheaterMode);
  const onTheaterModeToggleRef = useRef(onTheaterModeToggle);
  isTheaterModeRef.current = isTheaterMode;
  onTheaterModeToggleRef.current = onTheaterModeToggle;

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
      autoMini: false,
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

      controls: [
        {
          name: 'theater-mode',
          position: 'right',
          html: `
            <svg class="art-icon art-icon-theater" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer; display: flex; align-items: center; justify-content: center; height: 100%;">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <line x1="7" y1="4" x2="7" y2="20"></line>
              <line x1="17" y1="4" x2="17" y2="20"></line>
            </svg>
          `,
          tooltip: isTheaterModeRef.current ? 'Chế độ mặc định' : 'Chế độ rạp chiếu',
          click: function () {
            onTheaterModeToggleRef.current?.(!isTheaterModeRef.current);
          }
        }
      ],

      icons: {
        loading:
          '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"><animate attributeName="stroke-dasharray" dur="1.5s" repeatCount="indefinite" values="1,200;89,200;89,200" /><animate attributeName="stroke-dashoffset" dur="1.5s" repeatCount="indefinite" values="0;-35;-124" /></circle></svg>',
        play: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
        pause:
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
      },
    } as unknown as ConstructorParameters<typeof Artplayer>[0]);

    playerRef.current = player;

    const handlePlayerHotkeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const ignoreTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];
      if (ignoreTags.includes(target.tagName) || target.isContentEditable) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const el = containerRef.current;
        if (!el) return;

        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        } else if ((el as any).webkitRequestFullscreen) {
          (el as any).webkitRequestFullscreen();
        }
      }

      if (e.code === 'Space' || e.key === ' ') {
        const video = player.video;
        if (!video) return;
        e.preventDefault();
        if (video.paused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    };

    window.addEventListener('keydown', handlePlayerHotkeys, true);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const video = player.video;
        if (video && !video.paused) {
          video.pause();
        }
      }
    };

    const handleWindowBlur = () => {
      const video = player.video;
      if (video && !video.paused) {
        video.pause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    // -- Ready callback & Ambilight canvas draw loop --
    let drawInterval: NodeJS.Timeout | null = null;

    player.on('ready', () => {
      if (onReady) onReady(player);

      const video = player.video;
      const canvas = canvasRef.current;
      if (canvas && video) {
        const ctx = canvas.getContext('2d');
        canvas.width = 24;
        canvas.height = 14;

        const updateCanvas = () => {
          if (video.readyState >= 2 && !video.paused && !video.ended) {
            try {
              ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            } catch (e) {
              // Ignore tainted canvas errors
            }
          }
        };

        const startLoop = () => {
          if (drawInterval) clearInterval(drawInterval);
          drawInterval = setInterval(updateCanvas, 100); // 10 fps
        };

        const stopLoop = () => {
          if (drawInterval) {
            clearInterval(drawInterval);
            drawInterval = null;
          }
        };

        player.on('video:play', startLoop);
        player.on('video:pause', stopLoop);
        player.on('destroy', stopLoop);

        if (!video.paused) {
          startLoop();
        }
      }
    });

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
      window.removeEventListener('keydown', handlePlayerHotkeys, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      if (playerRef.current) {
        const video = playerRef.current.video;
        if (video && (video as any).hls) {
          (video as any).hls.destroy();
        }
        playerRef.current.destroy(false);
        playerRef.current = null;
      }
      hlsInstance?.destroy();
      if (drawInterval) {
        clearInterval(drawInterval);
      }
    };
  // Only re-run when url changes (the source). Other props use refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, progressKey]);

  // Dynamically update the Theater Mode button UI in the player controls
  useEffect(() => {
    if (playerRef.current) {
      const btn = playerRef.current.template.$controls.querySelector('.art-control-theater-mode');
      if (btn) {
        btn.setAttribute('data-tip', isTheaterMode ? 'Chế độ mặc định' : 'Chế độ rạp chiếu');
        const svg = btn.querySelector('svg');
        if (svg) {
          if (isTheaterMode) {
            svg.style.color = '#e5a93b';
            svg.style.filter = 'drop-shadow(0 0 4px rgba(229,169,59,0.5))';
          } else {
            svg.style.color = '';
            svg.style.filter = '';
          }
        }
      }
    }
  }, [isTheaterMode]);

  return (
    <>
      <style jsx global>{`
        .art-video-player {
          --art-theme: #e5a93b;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .art-video-player .art-control-progress-inner { background: #e5a93b; }
        .art-video-player .art-icon:hover,
        .art-video-player .art-control:hover,
        .art-video-player .art-control-theater-mode:hover { color: #e5a93b; }
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

      <div className="relative w-full h-full min-h-[400px]">
        {/* Dynamic ambient backglow canvas */}
        <canvas
          ref={canvasRef}
          className="absolute -inset-4 w-[calc(100%+32px)] h-[calc(100%+32px)] -z-10 opacity-70 blur-[60px] pointer-events-none scale-[1.03] transition-all duration-700 ease-out"
          style={{ mixBlendMode: 'normal' }}
        />
        <div ref={containerRef} className="w-full h-full" />
      </div>
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
