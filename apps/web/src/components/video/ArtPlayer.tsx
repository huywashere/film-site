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
  onReady?: (player: Artplayer) => void;
}

export default function ArtPlayer({
  url,
  type = 'auto',
  poster,
  title,
  subtitle,
  autoplay = false,
  onReady,
}: ArtPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Artplayer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !url) return;

    // Detect video type
    const isHls =
      type === 'hls' || url.includes('.m3u8') || (type === 'auto' && url.includes('.m3u8'));

    // Initialize Artplayer
    const player = new Artplayer({
      container: containerRef.current,
      url: url,
      poster: poster,
      title: title,
      volume: 0.8,
      autoplay: autoplay,
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
      moreVideoAttr: {
        crossOrigin: 'anonymous',
      },

      // HLS support
      ...(isHls
        ? {
            customType: {
              m3u8: (video: HTMLMediaElement, url: string) => {
                if (Hls.isSupported()) {
                  const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                  });
                  hls.loadSource(url);
                  hls.attachMedia(video);

                  // Optional: handle HLS events
                  hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log('🎬 HLS manifest loaded');
                  });

                  hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                      console.error('❌ Fatal HLS error:', data);
                      switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                          console.log('🔄 Network error, trying to recover...');
                          hls.startLoad();
                          break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                          console.log('🔄 Media error, trying to recover...');
                          hls.recoverMediaError();
                          break;
                        default:
                          console.log('💥 Cannot recover, destroying HLS');
                          hls.destroy();
                          break;
                      }
                    }
                  });

                  // Store hls instance for cleanup
                  (video as any).hls = hls;
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                  // Native HLS support (Safari)
                  video.src = url;
                } else {
                  console.error('❌ HLS not supported');
                }
              },
            },
          }
        : {}),

      // Quality selector (if available)
      quality: [],

      // Hotkey settings
      hotkey: true,

      // Subtitle settings
      ...(subtitle
        ? {
            subtitle: {
              url: subtitle,
              type: 'vtt',
              style: {
                color: '#fff',
                fontSize: '20px',
              },
            },
          }
        : {}),

      // Control bar settings
      controls: [
        {
          position: 'right',
          html: '🎬',
          tooltip: 'Danh sách tập',
          click: function () {
            // Emit custom event to toggle episode list
            const event = new CustomEvent('artplayer-toggle-episodes');
            window.dispatchEvent(event);
          },
        },
      ],

      // Layers (optional overlays)
      layers: [],

      // Icons
      icons: {
        loading:
          '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"><animate attributeName="stroke-dasharray" dur="1.5s" repeatCount="indefinite" values="1,200;89,200;89,200" /><animate attributeName="stroke-dashoffset" dur="1.5s" repeatCount="indefinite" values="0;-35;-124" /></circle></svg>',
        play: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
        pause:
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
      },
    } as any);

    // Save player instance
    playerRef.current = player;

    // Ready callback
    if (onReady) {
      player.on('ready', () => {
        onReady(player);
      });
    }

    // Auto-save progress
    player.on('video:timeupdate', () => {
      const currentTime = player.currentTime;
      const duration = player.duration;
      if (duration > 0) {
        localStorage.setItem(`artplayer_progress_${url}`, currentTime.toString());
      }
    });

    // Restore progress
    const savedTime = localStorage.getItem(`artplayer_progress_${url}`);
    if (savedTime) {
      player.on('ready', () => {
        const time = parseFloat(savedTime);
        if (time > 5 && time < player.duration - 10) {
          player.currentTime = time;
          player.notice.show = `Tiếp tục từ ${formatTime(time)}`;
        }
      });
    }

    // Cleanup
    return () => {
      if (playerRef.current) {
        // Cleanup HLS
        const video = playerRef.current.video;
        if (video && (video as any).hls) {
          (video as any).hls.destroy();
        }

        playerRef.current.destroy(false);
        playerRef.current = null;
      }
    };
  }, [url, poster, title, subtitle, type, autoplay, onReady]);

  return (
    <>
      <style jsx global>{`
        .art-video-player {
          --art-theme: #e5a93b;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .art-video-player .art-control-progress-inner {
          background: #e5a93b;
        }

        .art-video-player .art-icon:hover,
        .art-video-player .art-control:hover {
          color: #e5a93b;
        }

        .art-video-player .art-bottom {
          background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, transparent 100%);
        }

        .art-video-player .art-setting,
        .art-video-player .art-contextmenu {
          background: rgba(20, 24, 28, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
        }

        .art-video-player .art-setting-item:hover,
        .art-video-player .art-contextmenu-item:hover {
          background: rgba(229, 169, 59, 0.15);
          color: #e5a93b;
        }

        .art-video-player .art-notice {
          background: rgba(20, 24, 28, 0.9);
          backdrop-filter: blur(8px);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.75rem 1.25rem;
          font-size: 0.875rem;
        }

        .art-video-player .art-loading {
          color: #e5a93b;
        }
      `}</style>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
        }}
      />
    </>
  );
}

// Helper function to format time
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
