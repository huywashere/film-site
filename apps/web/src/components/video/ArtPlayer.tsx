'use client';
import { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import vi from 'artplayer/i18n/vi';
import Hls from 'hls.js';
import { useSettingsStore } from '@/store/settingsStore';
import { detectExplicitHlsAdRanges, filterHlsManifest } from '@/lib/hls-ad-filter';
import { selectInitialHlsTransport } from '@/lib/player-source-routing';
import { ARTPLAYER_EDITOR_LOADING_GIF } from './artplayer-editor-assets';

const HLS_STARTUP_TIMEOUT_MS = 8_000;

export interface ArtPlayerProps {
  url: string;
  fallbackUrl?: string;
  type?: 'hls' | 'mp4' | 'auto';
  poster?: string;
  title?: string;
  subtitle?: string;
  autoplay?: boolean;
  progressKey?: string;
  dbProgress?: number;
  initialTime?: number;
  onEnded?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onReady?: (player: Artplayer) => void;
  onPlaybackStart?: (player: Artplayer) => void;
  onBuffering?: (durationMs: number) => void;
  onError?: (error: unknown) => void;
  onPlaybackStateChange?: (state: {
    action: 'play' | 'pause' | 'seek';
    currentTime: number;
  }) => void;
  isTheaterMode?: boolean;
  onTheaterModeToggle?: (active: boolean) => void;
  // Skip intro/outro timestamps (giây)
  skipIntroStart?: number;
  skipIntroEnd?: number;
  skipOutroStart?: number;
  autoSkipIntro?: boolean;
}

export default function ArtPlayer({
  url,
  fallbackUrl,
  type = 'auto',
  poster,
  title,
  subtitle,
  autoplay = false,
  progressKey,
  dbProgress,
  initialTime,
  onEnded,
  onProgress,
  onReady,
  onPlaybackStart,
  onBuffering,
  onError,
  onPlaybackStateChange,
  skipIntroStart = 0,
  skipIntroEnd = 85,
  autoSkipIntro = true,
}: ArtPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Artplayer | null>(null);

  const detectedAdRangesRef = useRef<
    Array<{
      start: number;
      end: number;
      duration: number;
      removed?: boolean;
      skippable?: boolean;
    }>
  >([]);

  const initialTimeRef = useRef(initialTime);
  const progressKeyRef = useRef(progressKey);
  const dbProgressRef = useRef(dbProgress);
  const skipIntroStartRef = useRef(skipIntroStart);
  const skipIntroEndRef = useRef(skipIntroEnd);
  const autoSkipIntroRef = useRef(autoSkipIntro);
  const introAutoSkippedRef = useRef(false);
  skipIntroStartRef.current = skipIntroStart;
  skipIntroEndRef.current = skipIntroEnd;
  autoSkipIntroRef.current = autoSkipIntro;

  const onReadyRef = useRef(onReady);
  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);
  const onErrorRef = useRef(onError);
  const onPlaybackStartRef = useRef(onPlaybackStart);
  const onBufferingRef = useRef(onBuffering);
  const onPlaybackStateChangeRef = useRef(onPlaybackStateChange);
  onReadyRef.current = onReady;
  onEndedRef.current = onEnded;
  onProgressRef.current = onProgress;
  onErrorRef.current = onError;
  onPlaybackStartRef.current = onPlaybackStart;
  onBufferingRef.current = onBuffering;
  onPlaybackStateChangeRef.current = onPlaybackStateChange;

  useEffect(() => {
    if (!containerRef.current || !url) return;
    detectedAdRangesRef.current = [];

    const isHls =
      type === 'hls' || url.includes('.m3u8') || (type === 'auto' && url.includes('.m3u8'));
    // Direct CDN streaming ensures maximum bandwidth, 0 proxy bottlenecks, and instant loading on both mobile and desktop
    const prefersSameOriginHls = false;
    const hlsTransport = selectInitialHlsTransport(url, fallbackUrl, prefersSameOriginHls);

    // -- HLS quality levels (populated after manifest load) --
    let hlsInstance: Hls | null = null;
    let networkRecoveries = 0;
    let mediaRecoveries = 0;
    let stallRecoveryTimer: ReturnType<typeof setInterval> | null = null;
    let startupTimer: ReturnType<typeof setTimeout> | null = null;
    let startupVideo: HTMLVideoElement | null = null;
    let startupReadyHandler: (() => void) | null = null;
    let startupPlayHandler: (() => void) | null = null;
    const qualityLevels: Array<{
      default: boolean;
      html: string;
      url: string;
      level: number;
    }> = [];

    const formatTimelineTime = (seconds: number) => {
      const safeSeconds = Math.max(0, Math.floor(seconds));
      const hours = Math.floor(safeSeconds / 3600);
      const minutes = Math.floor((safeSeconds % 3600) / 60);
      const remainingSeconds = safeSeconds % 60;
      return hours > 0
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
        : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    const mergeDetectedAdRanges = (
      nextRanges: Array<{
        start: number;
        end: number;
        duration: number;
        removed?: boolean;
        skippable?: boolean;
      }>,
    ) => {
      for (const range of nextRanges) {
        const existingRange = detectedAdRangesRef.current.find(
          (current) => Math.abs(current.start - range.start) < 0.75,
        );
        if (existingRange) {
          existingRange.end = Math.max(existingRange.end, range.end);
          existingRange.duration = Math.max(existingRange.duration, range.duration);
          existingRange.skippable = existingRange.skippable === true || range.skippable === true;
          existingRange.removed = existingRange.removed === true && range.removed === true;
          continue;
        }
        if (!Number.isFinite(range.start) || range.start < 0) {
          continue;
        }
        detectedAdRangesRef.current.push(range);
      }
      detectedAdRangesRef.current.sort((left, right) => left.start - right.start);
    };

    const syncTimelineMarkers = () => {
      const player = playerRef.current;
      const duration = player?.duration || 0;
      const progress = player?.template.$progress?.querySelector('.art-control-progress-inner');
      if (!(progress instanceof HTMLElement) || !Number.isFinite(duration) || duration <= 0) {
        return;
      }

      let markerLayer = progress.querySelector<HTMLElement>('.netphim-timeline-markers');
      if (!markerLayer) {
        markerLayer = document.createElement('div');
        markerLayer.className = 'netphim-timeline-markers';
        progress.appendChild(markerLayer);
      }
      markerLayer.replaceChildren();

      const appendMarker = (
        kind: 'intro' | 'ad',
        start: number,
        end: number,
        title: string,
        badge: string,
        seekTarget?: number,
        pointOnly = false,
      ) => {
        const safeStart = Math.min(duration, Math.max(0, start));
        const safeEnd = Math.min(duration, Math.max(safeStart, end));
        const marker = document.createElement('div');
        marker.className = `netphim-timeline-marker netphim-timeline-marker-${kind}${pointOnly ? ' is-point' : ''}`;
        const startPercent = (safeStart / duration) * 100;
        marker.style.left = `${startPercent}%`;
        if (startPercent <= 12) marker.classList.add('is-near-start');
        if (startPercent >= 88) marker.classList.add('is-near-end');
        if (!pointOnly) {
          marker.style.width = `${Math.max(0.35, ((safeEnd - safeStart) / duration) * 100)}%`;
        }
        marker.dataset.title = title;
        marker.dataset.badge = badge;
        marker.dataset.label = `${title} • ${badge}`;
        marker.title = `${title} (${badge})`;
        marker.setAttribute('role', 'button');
        marker.setAttribute('aria-label', `${title} ${badge}`);
        marker.tabIndex = 0;

        if (seekTarget !== undefined) {
          marker.addEventListener('click', (e) => {
            e.stopPropagation();
            if (player) {
              player.seek = Math.min(duration, seekTarget);
            }
          });
        }

        markerLayer?.appendChild(marker);
      };

      const introStart = skipIntroStartRef.current ?? 0;
      const introEnd = skipIntroEndRef.current ?? 85;
      if (duration > 120 && introEnd > introStart) {
        appendMarker(
          'intro',
          introStart,
          introEnd,
          '🎬 Đoạn Mở Đầu (Intro)',
          `${formatTimelineTime(introStart)} – ${formatTimelineTime(introEnd)}`,
          introEnd + 0.1,
        );
      }

      detectedAdRangesRef.current.forEach((range, index) => {
        appendMarker(
          'ad',
          range.start,
          range.end,
          `📢 Điểm Quảng Cáo ${index + 1}`,
          `${formatTimelineTime(range.start)}`,
          range.end + 0.1,
          range.removed,
        );
      });
    };

    const clearStartupTimer = () => {
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }
    };

    // HLS.js is attached directly to ArtPlayer's video element. The playback
    // URL is a proxy route with query parameters, so extension-based custom
    // type dispatch is not a dependable place to initialize HLS.
    const attachHls = (video: HTMLVideoElement, streamUrl: string, alternateUrl?: string) => {
      startupVideo = video;
      startupReadyHandler = clearStartupTimer;
      video.addEventListener('loadedmetadata', startupReadyHandler);
      video.addEventListener('canplay', startupReadyHandler);

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          startLevel: -1,
          testBandwidth: true,
          backBufferLength: 30,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeMaxRetry: 3,
          nudgeOffset: 0.1,
          startFragPrefetch: true,
          progressive: true,
          lowLatencyMode: false,
          abrBandWidthFactor: 0.85,
          abrBandWidthUpFactor: 0.7,
          maxStarvationDelay: 4,
          maxLoadingDelay: 4,
          capLevelToPlayerSize: true,
          manifestLoadingTimeOut: 8_000,
          manifestLoadingMaxRetry: 2,
          levelLoadingTimeOut: 8_000,
          levelLoadingMaxRetry: 2,
          fragLoadingTimeOut: 12_000,
          fragLoadingMaxRetry: 2,
          pLoader: class ManifestFilterLoader extends (Hls.DefaultConfig.loader as any) {
            load(context: any, config: any, callbacks: any) {
              const originalOnSuccess = callbacks.onSuccess;
              callbacks.onSuccess = (response: any, stats: any, ctx: any, networkDetails: any) => {
                if (
                  typeof response.data === 'string' &&
                  (ctx.type === 'manifest' || ctx.type === 'level')
                ) {
                  try {
                    const filtered = filterHlsManifest(response.data, ctx.url);
                    // Keep the original timeline intact. Filtering segments and
                    // seeking the resulting timestamps again can move playback
                    // to the wrong position. We only inspect the manifest here;
                    // skipping is always an explicit viewer action.
                    mergeDetectedAdRanges(
                      filtered.stats.adMarkers.map((marker) => ({
                        start: marker.start,
                        end: marker.start + marker.duration,
                        duration: marker.duration,
                        removed: false,
                        skippable: false,
                      })),
                    );
                    queueMicrotask(syncTimelineMarkers);
                  } catch (e) {
                    // Fallback to raw response if filtering errors
                  }
                }
                originalOnSuccess(response, stats, ctx, networkDetails);
              };
              super.load(context, config, callbacks);
            }
          } as any,
        });
        hlsInstance = hls;
        let activeStreamUrl = streamUrl;
        let transportFallbackUsed = false;

        const armStartupWatchdog = () => {
          clearStartupTimer();
          const isMobileDevice =
            typeof navigator !== 'undefined' &&
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
              navigator.userAgent,
            );
          const timeoutMs = isMobileDevice ? 10_000 : HLS_STARTUP_TIMEOUT_MS;

          startupTimer = setTimeout(() => {
            if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return;
            // Autoplay is intentionally disabled for many mobile browsers.
            // Arm a fresh watchdog on the first real play attempt instead of
            // reporting a source failure while the viewer has not pressed play.
            if (video.paused && video.currentTime === 0) return;

            if (alternateUrl && alternateUrl !== activeStreamUrl && !transportFallbackUsed) {
              transportFallbackUsed = true;
              activeStreamUrl = alternateUrl;
              hls.stopLoad();
              hls.loadSource(activeStreamUrl);
              hls.startLoad(video.currentTime || -1);
              armStartupWatchdog();
              return;
            }

            onErrorRef.current?.({
              type: 'HLS_STARTUP_TIMEOUT',
              details: { streamUrl: activeStreamUrl },
            });
          }, timeoutMs);
        };

        const switchTransport = () => {
          if (!alternateUrl || alternateUrl === activeStreamUrl || transportFallbackUsed) {
            return false;
          }
          transportFallbackUsed = true;
          activeStreamUrl = alternateUrl;
          const resumeAt = video.currentTime;
          hls.stopLoad();
          hls.loadSource(activeStreamUrl);
          hls.startLoad(resumeAt || -1);
          armStartupWatchdog();
          return true;
        };

        startupPlayHandler = armStartupWatchdog;
        video.addEventListener('play', startupPlayHandler);

        // A discontinuity can be a normal codec/source boundary. Only an
        // explicit ad URL is strong enough evidence to make a range skippable.
        hls.on(Hls.Events.LEVEL_LOADED, (_e, data) => {
          const frags = data.details?.fragments || [];
          if (!frags.length) return;
          mergeDetectedAdRanges(detectExplicitHlsAdRanges(frags));
          syncTimelineMarkers();
        });

        const syncQualityControls = (activeLevel: number) => {
          const levels = hls.levels ?? [];
          if (!levels.length) return;

          const built = levels.map((level, i) => ({
            default: i === activeLevel,
            html: level.height ? `${level.height}P` : `Mức ${i + 1}`,
            url: activeStreamUrl,
            level: i,
          }));
          qualityLevels.splice(0, qualityLevels.length, ...built);

          const currentQualityHtml =
            built.find((quality) => quality.default)?.html ?? built[0]?.html ?? 'HD';

          player.setting.update({
            name: 'quality',
            html: 'Chất lượng',
            tooltip: currentQualityHtml,
            selector: qualityLevels.map((quality) => ({
              default: quality.default,
              html: quality.html,
              url: quality.url,
              level: quality.level,
            })),
            onSelect(item: { level: number; html: string }) {
              hls.currentLevel = item.level;
              return item.html;
            },
          } as any);
        };

        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          const levels = data.levels ?? [];

          if (playerRef.current?.loading) {
            playerRef.current.loading.show = false;
          }
          if (playerRef.current?.mask) {
            playerRef.current.mask.show = true;
          }

          const prefQuality = useSettingsStore.getState().defaultQuality;
          const preferredLevel =
            prefQuality !== 'auto'
              ? levels.findIndex(
                  (level) =>
                    level.height && `${level.height}p`.toLowerCase() === prefQuality.toLowerCase(),
                )
              : -1;

          if (preferredLevel >= 0) hls.currentLevel = preferredLevel;

          const displayedLevel =
            preferredLevel >= 0
              ? preferredLevel
              : Math.max(0, hls.loadLevel, hls.nextAutoLevel, hls.firstLevel);
          syncQualityControls(displayedLevel);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          syncQualityControls(data.level);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && switchTransport()) {
            networkRecoveries += 1;
            return;
          }
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveries < 2) {
            networkRecoveries += 1;
            hls.startLoad(-1);
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 1) {
            mediaRecoveries += 1;
            hls.recoverMediaError();
            return;
          }
          hls.destroy();
          onErrorRef.current?.({ type: 'HLS_FATAL_ERROR', details: data });
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        armStartupWatchdog();
        (video as HTMLVideoElement & { hls: Hls }).hls = hls;

        // Non-fatal HLS stalls do not reach the page-level fallback handler.
        // Recover an empty buffer in stages and only switch provider after a
        // sustained stall, avoiding both endless spinners and premature jumps.
        let stalledSince = 0;
        let stallRecoveries = 0;
        stallRecoveryTimer = setInterval(() => {
          if (
            video.paused ||
            video.ended ||
            video.seeking ||
            video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
          ) {
            stalledSince = 0;
            stallRecoveries = 0;
            return;
          }

          const now = Date.now();
          if (!stalledSince) stalledSince = now;
          const stalledFor = now - stalledSince;

          if (stalledFor >= 3_000 && stallRecoveries === 0) {
            stallRecoveries = 1;
            if (hls.autoLevelEnabled && hls.loadLevel > 0) {
              hls.nextAutoLevel = hls.loadLevel - 1;
            }
            hls.startLoad(video.currentTime);
          } else if (stalledFor >= 6_000 && stallRecoveries === 1) {
            stallRecoveries = 2;
            if (!switchTransport()) {
              hls.recoverMediaError();
            }
          } else if (stalledFor >= 10_000 && stallRecoveries === 2) {
            stallRecoveries = 3;
            onErrorRef.current?.({
              type: 'HLS_STALL_TIMEOUT',
              details: { currentTime: video.currentTime },
            });
          }
        }, 1_000);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x5-playsinline', 'true');
        video.removeAttribute('crossorigin');
        video.src = streamUrl;
        video.load();

        const handleNativeError = () => {
          if (alternateUrl && alternateUrl !== streamUrl && video.src !== alternateUrl) {
            video.src = alternateUrl;
            video.load();
            return;
          }
          onErrorRef.current?.({ type: 'HLS_NATIVE_ERROR' });
        };

        const handleNativeLoaded = () => {
          clearStartupTimer();
          if (playerRef.current?.loading) {
            playerRef.current.loading.show = false;
          }
          if (playerRef.current?.mask) {
            playerRef.current.mask.show = true;
          }
        };

        video.addEventListener('error', handleNativeError, { once: true });
        video.addEventListener('loadedmetadata', handleNativeLoaded, {
          once: true,
        });
        video.addEventListener('canplay', handleNativeLoaded, { once: true });
        video.addEventListener('loadeddata', handleNativeLoaded, {
          once: true,
        });
      } else {
        onErrorRef.current?.({ type: 'HLS_UNSUPPORTED' });
      }
    };

    const seekControls = [
      {
        name: 'backward-10',
        position: 'left' as const,
        index: 25,
        html: `<span class="netphim-seek-glyph netphim-seek-glyph-backward" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4.5v5h5" />
            <path d="M4.5 9A8.5 8.5 0 1 1 3.5 12" />
            <text x="12" y="15.2" text-anchor="middle" font-size="7.5" font-weight="900" font-family="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="currentColor" stroke="none">10</text>
          </svg>
        </span>`,
        tooltip: 'Lùi 10 giây',
        mounted(element: HTMLElement) {
          element.setAttribute('aria-label', 'Lùi 10 giây');
          element.setAttribute('role', 'button');
        },
        click: function (this: Artplayer) {
          const target = Math.max(0, this.currentTime - 10);
          showSeekFeedback('backward', 10, target);
          this.seek = target;
        },
      },
      {
        name: 'forward-10',
        position: 'left' as const,
        index: 26,
        html: `<span class="netphim-seek-glyph netphim-seek-glyph-forward" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 4.5v5h-5" />
            <path d="M19.5 9A8.5 8.5 0 1 0 20.5 12" />
            <text x="12" y="15.2" text-anchor="middle" font-size="7.5" font-weight="900" font-family="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="currentColor" stroke="none">10</text>
          </svg>
        </span>`,
        tooltip: 'Tua 10 giây',
        mounted(element: HTMLElement) {
          element.setAttribute('aria-label', 'Tua 10 giây');
          element.setAttribute('role', 'button');
        },
        click: function (this: Artplayer) {
          const targetTime = this.currentTime + 10;
          const target = Number.isFinite(this.duration)
            ? Math.min(this.duration, targetTime)
            : targetTime;
          showSeekFeedback('forward', 10, target);
          this.seek = target;
        },
      },
    ];

    const player = new Artplayer({
      container: containerRef.current,
      url: isHls ? hlsTransport.primary : url,
      type: isHls ? 'm3u8' : 'auto',
      customType: {
        m3u8: function (video: HTMLVideoElement, streamUrl: string) {
          attachHls(video, streamUrl, hlsTransport.fallback);
        },
        hls: function (video: HTMLVideoElement, streamUrl: string) {
          attachHls(video, streamUrl, hlsTransport.fallback);
        },
      },
      poster,
      title,
      volume: 0.8,
      autoplay,
      autoSize: false,
      autoMini: false,
      autoOrientation: true,
      // WatchPage owns double-tap and press-and-hold gestures. Keeping the
      // built-in gesture enabled makes a single double tap seek twice.
      fastForward: false,
      lock: true,
      screenshot:
        typeof navigator !== 'undefined'
          ? !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
          : false,
      setting: true,
      pip: true,
      loop: true,
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
      theme: '#8b5cf6',
      lang: 'vi',
      i18n: { vi },
      icons: {
        loading: `<img src="${ARTPLAYER_EDITOR_LOADING_GIF}" alt="" aria-hidden="true">`,
        state:
          '<img width="150" height="150" src="/artplayer/state.svg" alt="" aria-hidden="true">',
        indicator:
          '<img width="16" height="16" src="/artplayer/indicator.svg" alt="" aria-hidden="true">',
      },
      moreVideoAttr: {
        playsInline: 'true',
        'webkit-playsinline': 'true',
        'x5-playsinline': 'true',
        'x5-video-player-type': 'h5',
        'x5-video-player-fullscreen': 'false',
      },
      controls: seekControls,
      // Use ArtPlayer's native focus-scoped keyboard controls.
      hotkey: true,

      // Keep the movie subtitle source, but let ArtPlayer render and position it.
      ...(subtitle
        ? {
            subtitle: {
              url: subtitle,
              type: 'vtt',
            },
          }
        : {}),
    } as unknown as ConstructorParameters<typeof Artplayer>[0]);

    playerRef.current = player;

    const seekFeedback = document.createElement('div');
    seekFeedback.className = 'netphim-seek-feedback';
    seekFeedback.setAttribute('role', 'status');
    seekFeedback.setAttribute('aria-live', 'polite');
    seekFeedback.innerHTML = `
      <span class="netphim-seek-feedback-orbit" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <path class="netphim-seek-feedback-track" d="M13 14.5A17 17 0 1 1 8.5 26" />
          <path class="netphim-seek-feedback-arrow" d="M7.5 13.5v11h11" />
        </svg>
        <strong class="netphim-seek-feedback-number">10</strong>
      </span>
      <span class="netphim-seek-feedback-copy">
        <strong class="netphim-seek-feedback-label">Lùi 10 giây</strong>
        <span class="netphim-seek-feedback-time">0:00</span>
      </span>
    `;
    player.template.$player.appendChild(seekFeedback);
    let seekFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSeekFeedbackAt = 0;
    let lastStablePlaybackTime = 0;
    let seekOriginTime: number | null = null;

    function showSeekFeedback(
      direction: 'backward' | 'forward',
      seconds: number,
      targetTime: number,
    ) {
      const roundedSeconds = Math.max(1, Math.round(seconds));
      const label = direction === 'backward' ? 'Lùi' : 'Tới';
      seekFeedback.classList.remove('is-backward', 'is-forward', 'is-visible');
      // Restart the compact entrance animation for repeated taps.
      void seekFeedback.offsetWidth;
      seekFeedback.classList.add(`is-${direction}`, 'is-visible');
      const number = seekFeedback.querySelector<HTMLElement>('.netphim-seek-feedback-number');
      const labelElement = seekFeedback.querySelector<HTMLElement>('.netphim-seek-feedback-label');
      const time = seekFeedback.querySelector<HTMLElement>('.netphim-seek-feedback-time');
      if (number) number.textContent = String(roundedSeconds);
      if (labelElement) {
        labelElement.textContent = `${label} ${roundedSeconds} giây`;
      }
      if (time) time.textContent = formatTimelineTime(targetTime);
      seekFeedback.setAttribute(
        'aria-label',
        `${label} ${roundedSeconds} giây, đến ${formatTimelineTime(targetTime)}`,
      );
      lastSeekFeedbackAt = Date.now();
      if (seekFeedbackTimer) clearTimeout(seekFeedbackTimer);
      seekFeedbackTimer = setTimeout(() => {
        seekFeedback.classList.remove('is-visible');
      }, 720);
    }

    const skipAdButton = document.createElement('button');
    skipAdButton.type = 'button';
    skipAdButton.className = 'netphim-skip-ad';
    skipAdButton.hidden = true;
    skipAdButton.setAttribute('aria-live', 'polite');
    skipAdButton.innerHTML = `
      <span class="netphim-skip-ad-label">Bỏ qua quảng cáo</span>
      <span class="netphim-skip-ad-countdown" aria-hidden="true"></span>
      <span class="netphim-skip-ad-arrow" aria-hidden="true">›</span>
    `;
    const findActiveAd = (time: number) =>
      detectedAdRangesRef.current.find(
        (ad) =>
          ad.skippable === true &&
          !ad.removed &&
          ad.duration > 0 &&
          ad.duration <= 180 &&
          time >= ad.start - 0.05 &&
          time < ad.end - 0.15,
      );

    const syncSkipAdButton = () => {
      const activeAd = findActiveAd(player.currentTime);
      skipAdButton.hidden = !activeAd;
      if (!activeAd) return;
      const remaining = Math.max(1, Math.ceil(activeAd.end - player.currentTime));
      const countdown = skipAdButton.querySelector<HTMLElement>('.netphim-skip-ad-countdown');
      if (countdown) countdown.textContent = `${remaining}s`;
    };

    const handleSkipAd = () => {
      const activeAd = findActiveAd(player.currentTime);
      if (!activeAd) return;
      const duration = Number.isFinite(player.duration) ? player.duration : 0;
      const target =
        duration > 0
          ? Math.min(Math.max(0, duration - 0.25), activeAd.end + 0.08)
          : activeAd.end + 0.08;
      if (target > player.currentTime && target - player.currentTime <= 181) {
        player.seek = target;
      }
      syncSkipAdButton();
    };

    skipAdButton.addEventListener('click', handleSkipAd);

    // ArtPlayer can rebuild its control tree while initializing a custom HLS
    // source. Restore the seek buttons if that happens so they are always
    // present on desktop and mobile layouts.
    const ensureSeekControls = () => {
      for (const control of seekControls) {
        const selector = `.art-control-${control.name}`;
        const existing = player.template.$controls?.querySelector(selector);
        if (existing) continue;

        try {
          player.controls.add({
            name: control.name,
            position: control.position,
            index: control.index,
            html: control.html,
            tooltip: control.tooltip,
            mounted: control.mounted,
            click: control.click,
          });
        } catch {
          // Ignore if control cannot be added
        }
      }
    };

    let didStartPlayback = false;
    let bufferingStartedAt = 0;
    player.on('video:waiting', () => {
      if (!bufferingStartedAt) bufferingStartedAt = Date.now();
    });
    player.on('video:stalled', () => {
      if (!bufferingStartedAt) bufferingStartedAt = Date.now();
    });
    player.on('video:playing', () => {
      if (bufferingStartedAt) {
        onBufferingRef.current?.(Date.now() - bufferingStartedAt);
        bufferingStartedAt = 0;
      }
      if (!didStartPlayback) {
        didStartPlayback = true;
        onPlaybackStartRef.current?.(player);
      }
    });

    // Advertisement & Auto Skip Intro listeners
    player.on('video:timeupdate', () => {
      syncSkipAdButton();
      if (autoSkipIntroRef.current && !introAutoSkippedRef.current) {
        const start = skipIntroStartRef.current ?? 0;
        const end = skipIntroEndRef.current ?? 85;
        const duration = Number.isFinite(player.duration) ? player.duration : 0;
        if (
          duration > 120 &&
          end > start &&
          player.currentTime >= start &&
          player.currentTime < end - 0.5
        ) {
          introAutoSkippedRef.current = true;
          player.seek = end + 0.1;
        }
      }
    });
    player.on('video:seeking', () => {
      if (seekOriginTime === null) seekOriginTime = lastStablePlaybackTime;
      syncSkipAdButton();
    });
    player.on('video:seeked', syncSkipAdButton);
    player.on('seek', syncSkipAdButton);

    // Keep business callbacks around ArtPlayer's native UI lifecycle.
    player.on('ready', () => {
      onReadyRef.current?.(player);
      if (player.loading) {
        player.loading.show = false;
      }
      if (player.mask) {
        player.mask.show = true;
      }
      syncTimelineMarkers();
      ensureSeekControls();
    });

    player.on('video:loadedmetadata', syncTimelineMarkers);
    player.on('video:durationchange', syncTimelineMarkers);
    player.on('resize', syncTimelineMarkers);

    player.on('video:play', () => {
      onPlaybackStateChangeRef.current?.({
        action: 'play',
        currentTime: player.currentTime,
      });
    });
    player.on('video:pause', () => {
      onPlaybackStateChangeRef.current?.({
        action: 'pause',
        currentTime: player.currentTime,
      });
    });
    player.on('video:seeked', () => {
      const delta = player.currentTime - (seekOriginTime ?? lastStablePlaybackTime);
      if (Math.abs(delta) >= 1 && Date.now() - lastSeekFeedbackAt > 180) {
        showSeekFeedback(delta < 0 ? 'backward' : 'forward', Math.abs(delta), player.currentTime);
      }
      seekOriginTime = null;
      lastStablePlaybackTime = player.currentTime;
      onPlaybackStateChangeRef.current?.({
        action: 'seek',
        currentTime: player.currentTime,
      });
    });

    // -- Resume: restore saved position using progressKey (slug+ep) or dbProgress --
    const currentProgressKey = progressKeyRef.current;
    const savedKey = currentProgressKey ? `wp_${currentProgressKey}` : null;
    let startTime = initialTimeRef.current || 0;
    if (savedKey) {
      const saved = localStorage.getItem(savedKey);
      if (saved) {
        startTime = parseFloat(saved);
      }
    }
    if (startTime === 0 && dbProgressRef.current) {
      startTime = dbProgressRef.current;
    }

    if (startTime > 5) {
      player.on('ready', () => {
        if (startTime < player.duration - 10) {
          // Restoring a previous session is not a viewer seek gesture, so keep
          // the HUD quiet and establish the restored point as the baseline.
          lastStablePlaybackTime = startTime;
          seekOriginTime = startTime;
          player.currentTime = startTime;
        }
      });
    }

    // -- Save progress --
    let lastSave = 0;
    player.on('video:timeupdate', () => {
      const now = Date.now();
      const ct = player.currentTime;
      const dur = player.duration;
      if (dur > 0) {
        if (!player.video.seeking) lastStablePlaybackTime = ct;
        if (now - lastSave > 5000) {
          lastSave = now;
          if (savedKey) localStorage.setItem(savedKey, ct.toString());
        }
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
      clearStartupTimer();
      if (startupVideo && startupReadyHandler) {
        startupVideo.removeEventListener('loadedmetadata', startupReadyHandler);
        startupVideo.removeEventListener('canplay', startupReadyHandler);
      }
      if (startupVideo && startupPlayHandler) {
        startupVideo.removeEventListener('play', startupPlayHandler);
      }
      if (seekFeedbackTimer) clearTimeout(seekFeedbackTimer);
      if (stallRecoveryTimer) {
        clearInterval(stallRecoveryTimer);
      }
      skipAdButton.removeEventListener('click', handleSkipAd);
    };
    // Recreate only when the primary/fallback transport changes. Other props use refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, fallbackUrl, type]);

  return (
    <div ref={containerRef} className="absolute inset-0 h-full min-h-0 w-full overflow-hidden" />
  );
}
