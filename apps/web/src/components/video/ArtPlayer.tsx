'use client';
import { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import vi from 'artplayer/i18n/vi';
import Hls from 'hls.js';
import { useSettingsStore } from '@/store/settingsStore';
import { detectExplicitHlsAdRanges, inspectHlsAdRanges } from '@/lib/hls-ad-filter';
import {
  isTerminalHlsHttpStatus,
  selectInitialHlsTransport,
} from '@/lib/player-source-routing';
import {
  ARTPLAYER_EDITOR_LOADING_GIF,
  ARTPLAYER_SEEK_BACKWARD_10_SVG,
  ARTPLAYER_SEEK_FORWARD_10_SVG,
  ARTPLAYER_SCREENSHOT_SVG,
  ARTPLAYER_PIP_SVG,
} from './artplayer-editor-assets';

// Reduced from 8s → 6s for desktop. Mobile timeout is extended in the watchdog
// itself. Faster timeout = faster automatic fallback to an alternate server.
const HLS_STARTUP_TIMEOUT_MS = 5_000;

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
  autoSkipAds?: boolean;
  minAdStartTime?: number;
  adRanges?: Array<{ start: number; end: number; title?: string }>;
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
  autoSkipAds = true,
  minAdStartTime = 180,
  adRanges,
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
  const autoSkipAdsRef = useRef(autoSkipAds);
  const minAdStartTimeRef = useRef(minAdStartTime);
  const introAutoSkippedRef = useRef(false);
  const skippedAdIntervalsRef = useRef(new Set<string>());
  skipIntroStartRef.current = skipIntroStart;
  skipIntroEndRef.current = skipIntroEnd;
  autoSkipIntroRef.current = autoSkipIntro;
  autoSkipAdsRef.current = autoSkipAds;
  minAdStartTimeRef.current = minAdStartTime;

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
    // Stream directly from high-bandwidth provider CDNs by default across desktop & mobile.
    // The signed same-origin relay (/api/hls-proxy) is retained as an immediate fallback if direct fails.
    const hlsTransport = selectInitialHlsTransport(url, fallbackUrl, false);

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
      const minStart = Math.max(minAdStartTimeRef.current ?? 180, skipIntroEndRef.current ?? 0);
      for (const range of nextRanges) {
        // Chỉ ngắt quảng cáo ở các đoạn sau phim, bỏ qua đoạn đầu phim để tránh cắt nhầm cảnh/intro
        if (range.start < minStart) {
          continue;
        }
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
        startTimestamp: number,
        endTimestamp: number,
        title: string,
      ) => {
        const safeStart = Math.min(duration, Math.max(0, startTimestamp));
        const safeEnd = Math.min(duration, Math.max(safeStart, endTimestamp));
        const markerDuration = safeEnd - safeStart;
        const marker = document.createElement('div');
        marker.className = `netphim-timeline-marker netphim-timeline-marker-${kind}`;
        const startPercent = (safeStart / duration) * 100;
        const endPercent = (safeEnd / duration) * 100;

        marker.style.left = `${startPercent}%`;
        marker.style.width = `${Math.max(0, endPercent - startPercent)}%`;
        if (markerDuration < 1) marker.classList.add('is-point');
        marker.title = title;
        markerLayer?.appendChild(marker);
      };

      const introStart = skipIntroStartRef.current ?? 0;
      const introEnd = skipIntroEndRef.current ?? 85;
      if (duration > 120 && introEnd > introStart) {
        // Mark only the end point of the intro as a discrete, clean notch
        appendMarker('intro', introEnd, introEnd, 'Hết đoạn mở đầu');
      }

      const minStart = Math.max(minAdStartTimeRef.current ?? 180, skipIntroEndRef.current ?? 0);
      detectedAdRangesRef.current.forEach((range, index) => {
        if (range.start < minStart) return;
        appendMarker('ad', range.start, range.end, `Quảng cáo ${index + 1}`);
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
          // Start from the lowest quality level so the first segment arrives
          // as fast as possible, then ABR steps up automatically.
          startLevel: 0,
          testBandwidth: true,
          backBufferLength: 15,
          // Reduced from 30 → 15 so the player only needs ~15 s of buffer before
          // starting playback instead of waiting for 30 s worth of segments.
          maxBufferLength: 15,
          maxMaxBufferLength: 45,
          maxBufferSize: 30 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeMaxRetry: 3,
          nudgeOffset: 0.1,
          startFragPrefetch: true,
          progressive: true,
          lowLatencyMode: false,
          // Slightly more aggressive upscaling so quality rises quickly once
          // the connection is proven fast.
          abrBandWidthFactor: 0.9,
          abrBandWidthUpFactor: 0.8,
          // Reduced from 4 → 2 so a slow segment triggers a level drop sooner
          // rather than letting the spinner hang for 4 extra seconds.
          maxStarvationDelay: 2,
          maxLoadingDelay: 2,
          capLevelToPlayerSize: true,
          manifestLoadingTimeOut: 6_000,
          manifestLoadingMaxRetry: 1,
          levelLoadingTimeOut: 6_000,
          levelLoadingMaxRetry: 1,
          fragLoadingTimeOut: 10_000,
          fragLoadingMaxRetry: 1,
          pLoader: class ManifestFilterLoader extends (Hls.DefaultConfig.loader as any) {
            load(context: any, config: any, callbacks: any) {
              const originalOnSuccess = callbacks.onSuccess;
              callbacks.onSuccess = (response: any, stats: any, ctx: any, networkDetails: any) => {
                if (
                  typeof response.data === 'string' &&
                  (ctx.type === 'manifest' || ctx.type === 'level')
                ) {
                  try {
                    // Inspect the raw playlist so marker positions match the
                    // unmodified timeline being played by HLS.js.
                    mergeDetectedAdRanges(
                      inspectHlsAdRanges(response.data, ctx.url).map((range) => ({
                        ...range,
                        removed: false,
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
          const timeoutMs = isMobileDevice ? 7_000 : HLS_STARTUP_TIMEOUT_MS;

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
          const upstreamStatus =
            data.response?.code ||
            (data.networkDetails as { status?: number } | null)?.status;
          if (
            data.type === Hls.ErrorTypes.NETWORK_ERROR &&
            isTerminalHlsHttpStatus(upstreamStatus)
          ) {
            // KKPhim sometimes publishes metadata before the HLS object exists.
            // Proxying that same 404 only doubles startup time.
            hls.destroy();
            onErrorRef.current?.({
              type: 'HLS_MANIFEST_NOT_FOUND',
              details: data,
            });
            return;
          }
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && switchTransport()) {
            networkRecoveries += 1;
            return;
          }
          // Before metadata is available, retrying the same failed transport
          // only keeps the poster spinner alive. Escalate to the next provider
          // immediately after direct + proxy have both failed. During active
          // playback one same-source recovery is still useful for brief drops.
          const playbackAlreadyStarted =
            video.readyState >= HTMLMediaElement.HAVE_METADATA || video.currentTime > 0;
          if (
            data.type === Hls.ErrorTypes.NETWORK_ERROR &&
            playbackAlreadyStarted &&
            networkRecoveries < 2
          ) {
            networkRecoveries += 1;
            hls.startLoad(video.currentTime || -1);
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

        const armNativeStartupWatchdog = () => {
          clearStartupTimer();
          startupTimer = setTimeout(() => {
            if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return;
            if (video.paused && video.currentTime === 0) return;
            if (alternateUrl && alternateUrl !== streamUrl && video.src !== alternateUrl) {
              video.src = alternateUrl;
              video.load();
              return;
            }
            onErrorRef.current?.({ type: 'HLS_NATIVE_TIMEOUT' });
          }, 8_000);
        };
        armNativeStartupWatchdog();
        startupPlayHandler = armNativeStartupWatchdog;
        video.addEventListener('play', startupPlayHandler);

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
      screenshot: false,
      setting: true,
      pip: false,
      loop: true,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      controls: [
        {
          name: 'backward-10',
          position: 'left',
          index: 11,
          html: `<span class="art-icon" style="display:inline-flex;align-items:center;justify-content:center;">${ARTPLAYER_SEEK_BACKWARD_10_SVG}</span>`,
          tooltip: 'Tua lại 10s',
          click: function () {
            if (playerRef.current) {
              const art = playerRef.current;
              art.seek = Math.max(0, art.currentTime - 10);
              art.notice.show = 'Tua lại 10s';
            }
          },
        },
        {
          name: 'forward-10',
          position: 'left',
          index: 12,
          html: `<span class="art-icon" style="display:inline-flex;align-items:center;justify-content:center;">${ARTPLAYER_SEEK_FORWARD_10_SVG}</span>`,
          tooltip: 'Tua tới 10s',
          click: function () {
            if (playerRef.current) {
              const art = playerRef.current;
              art.seek = Math.min(art.duration || Infinity, art.currentTime + 10);
              art.notice.show = 'Tua tới 10s';
            }
          },
        },
        {
          name: 'screenshot',
          position: 'right',
          index: 20,
          html: `<span class="art-icon" style="display:inline-flex;align-items:center;justify-content:center;">${ARTPLAYER_SCREENSHOT_SVG}</span>`,
          tooltip: 'Chụp ảnh màn hình',
          click: function () {
            if (playerRef.current) {
              try {
                playerRef.current.screenshot();
              } catch {
                playerRef.current.notice.show = 'Không thể chụp ảnh';
              }
            }
          },
        },
        {
          name: 'pip',
          position: 'right',
          index: 40,
          html: `<span class="art-icon" style="display:inline-flex;align-items:center;justify-content:center;">${ARTPLAYER_PIP_SVG}</span>`,
          tooltip: 'Hình trong hình (PiP)',
          click: function () {
            if (playerRef.current) {
              const art = playerRef.current;
              try {
                if (typeof document !== 'undefined' && document.pictureInPictureElement) {
                  document.exitPictureInPicture();
                } else if (art.video && typeof art.video.requestPictureInPicture === 'function') {
                  art.video.requestPictureInPicture();
                } else {
                  art.pip = !art.pip;
                }
              } catch {
                art.notice.show = 'Trình duyệt không hỗ trợ PiP';
              }
            }
          },
        },
      ],
      subtitleOffset: true,
      // Keep the canvas completely clean while controls are idle. The regular
      // timeline still appears with the control layer after pointer/touch input.
      miniProgressBar: false,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: true,
      settings: [
        {
          html: 'Tự động bỏ qua quảng cáo',
          tooltip: autoSkipAds ? 'Bật' : 'Tắt',
          switch: autoSkipAds,
          onSwitch: function (item: any) {
            item.tooltip = item.switch ? 'Bật' : 'Tắt';
            autoSkipAdsRef.current = item.switch;
            useSettingsStore.getState().setAutoSkipAds(item.switch);
            return item.switch;
          },
        },
        {
          html: 'Tự động bỏ qua mở đầu',
          tooltip: autoSkipIntro ? 'Bật' : 'Tắt',
          switch: autoSkipIntro,
          onSwitch: function (item: any) {
            item.tooltip = item.switch ? 'Bật' : 'Tắt';
            autoSkipIntroRef.current = item.switch;
            return item.switch;
          },
        },
      ],
      // Use the default ArtPlayer Editor theme as specified in project rules.
      theme: '#23ade5',
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

    let lastStablePlaybackTime = 0;
    let seekOriginTime: number | null = null;

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
    const findActiveAd = (time: number) => {
      const minStart = Math.max(minAdStartTimeRef.current ?? 180, skipIntroEndRef.current ?? 0);
      return detectedAdRangesRef.current.find(
        (ad) =>
          ad.skippable === true &&
          !ad.removed &&
          ad.duration > 0 &&
          ad.duration <= 180 &&
          ad.start >= minStart &&
          time >= ad.start - 0.05 &&
          time < ad.end - 0.15,
      );
    };

    const syncSkipAdButton = () => {
      const activeAd = findActiveAd(player.currentTime);
      skipAdButton.hidden = !activeAd;
      if (!activeAd) return;
      const remaining = Math.max(1, Math.ceil(activeAd.end - player.currentTime));
      const countdown = skipAdButton.querySelector<HTMLElement>('.netphim-skip-ad-countdown');
      if (countdown) countdown.textContent = `${remaining}s`;
    };

    const handleSkipAd = (isAuto = false) => {
      const activeAd = findActiveAd(player.currentTime);
      if (!activeAd) return;
      const duration = Number.isFinite(player.duration) ? player.duration : 0;
      const target =
        duration > 0
          ? Math.min(Math.max(0, duration - 0.25), activeAd.end + 0.08)
          : activeAd.end + 0.08;
      if (target > player.currentTime && target - player.currentTime <= 181) {
        player.seek = target;
        if (isAuto) {
          player.notice.show = 'Đã tự động bỏ qua quảng cáo';
        }
      }
      syncSkipAdButton();
    };

    const onSkipButtonClick = () => handleSkipAd(false);
    skipAdButton.addEventListener('click', onSkipButtonClick);

    // =========================================================================
    // Mobile & Touch Double-Tap Seek (YouTube-style 10s ripple & badge)
    // =========================================================================
    (Artplayer as any).MOBILE_DBCLICK_PLAY = false;

    const seekOverlay = document.createElement('div');
    seekOverlay.className = 'netphim-mobile-seek-overlay';
    seekOverlay.setAttribute('aria-hidden', 'true');
    seekOverlay.innerHTML = `
      <div class="netphim-mobile-seek-side is-left">
        <div class="netphim-mobile-seek-badge">
          <div class="netphim-mobile-seek-icons">
            <svg class="chevron-1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            <svg class="chevron-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            <svg class="chevron-3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </div>
          <span class="netphim-mobile-seek-text" data-text-left>10 giây</span>
        </div>
      </div>
      <div class="netphim-mobile-seek-side is-right">
        <div class="netphim-mobile-seek-badge">
          <div class="netphim-mobile-seek-icons">
            <svg class="chevron-1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            <svg class="chevron-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            <svg class="chevron-3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
          <span class="netphim-mobile-seek-text" data-text-right>10 giây</span>
        </div>
      </div>
    `;

    const playerContainer = (player as any).template?.$player || containerRef.current;
    if (playerContainer) {
      playerContainer.appendChild(seekOverlay);
    }

    const leftSide = seekOverlay.querySelector<HTMLElement>('.is-left');
    const rightSide = seekOverlay.querySelector<HTMLElement>('.is-right');
    const leftText = seekOverlay.querySelector<HTMLElement>('[data-text-left]');
    const rightText = seekOverlay.querySelector<HTMLElement>('[data-text-right]');

    let accumulatedSeconds = 0;
    let activeDirection: 'left' | 'right' | null = null;
    let seekTimer: any = null;

    const triggerSeekRipple = (isLeft: boolean) => {
      const art = playerRef.current;
      if (!art) return;

      const direction = isLeft ? 'left' : 'right';
      if (activeDirection === direction) {
        accumulatedSeconds += 10;
      } else {
        accumulatedSeconds = 10;
        activeDirection = direction;
      }

      const label = `${accumulatedSeconds} giây`;
      if (isLeft) {
        if (leftText) leftText.textContent = label;
        rightSide?.classList.remove('is-active');
        leftSide?.classList.remove('is-active');
        void leftSide?.offsetWidth;
        leftSide?.classList.add('is-active');
        art.seek = Math.max(0, art.currentTime - 10);
      } else {
        if (rightText) rightText.textContent = label;
        leftSide?.classList.remove('is-active');
        rightSide?.classList.remove('is-active');
        void rightSide?.offsetWidth;
        rightSide?.classList.add('is-active');
        art.seek = Math.min(art.duration || Infinity, art.currentTime + 10);
      }

      clearTimeout(seekTimer);
      seekTimer = setTimeout(() => {
        leftSide?.classList.remove('is-active');
        rightSide?.classList.remove('is-active');
        accumulatedSeconds = 0;
        activeDirection = null;
      }, 700);
    };

    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const isInteractiveControl = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest(
          '.art-bottom, .art-controls, .art-control, .art-state, .art-settings, .art-contextmenu, .art-layer-auto-playback, .art-notice, .art-loading, .netphim-skip-ad, .netphim-skip-intro, .art-layer-lock'
        )
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (isInteractiveControl(e.target)) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      if (isInteractiveControl(e.target)) return;

      const touch = e.changedTouches[0];
      const now = Date.now();
      const pressDuration = now - touchStartTime;
      const moveDistance = Math.hypot(
        touch.clientX - touchStartX,
        touch.clientY - touchStartY
      );

      if (pressDuration > 300 || moveDistance > 25) return;

      const timeSinceLastTap = now - lastTapTime;
      const tapDistance = Math.hypot(
        touch.clientX - lastTapX,
        touch.clientY - lastTapY
      );

      const targetEl = (player as any).template?.$player || containerRef.current;
      const rect = targetEl?.getBoundingClientRect();
      if (!rect) return;

      if (timeSinceLastTap < 350 && tapDistance < 80) {
        lastTapTime = 0;
        const x = touch.clientX - rect.left;
        triggerSeekRipple(x < rect.width / 2);
        e.preventDefault();
        e.stopPropagation();
      } else {
        lastTapTime = now;
        lastTapX = touch.clientX;
        lastTapY = touch.clientY;
      }
    };

    const handleDblClick = (event: Event) => {
      if (Date.now() - touchStartTime < 500) return;
      if (!event || isInteractiveControl(event.target)) return;

      const targetEl = (player as any).template?.$player || containerRef.current;
      const rect = targetEl?.getBoundingClientRect();
      if (!rect) return;

      const mouseEvent = event as MouseEvent;
      const x = (typeof mouseEvent.clientX === 'number' ? mouseEvent.clientX : 0) - rect.left;
      const width = rect.width;
      const isMobile = window.innerWidth <= 1024 || ('ontouchstart' in window);

      if (isMobile) {
        triggerSeekRipple(x < width / 2);
      } else {
        if (x < width * 0.35) {
          triggerSeekRipple(true);
        } else if (x > width * 0.65) {
          triggerSeekRipple(false);
        }
      }
    };

    if (playerContainer) {
      playerContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
      playerContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
    player.on('dblclick', handleDblClick);

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
      const activeAd = findActiveAd(player.currentTime);
      if (activeAd) {
        const adKey = `${activeAd.start.toFixed(1)}-${activeAd.end.toFixed(1)}`;
        if (autoSkipAdsRef.current && !skippedAdIntervalsRef.current.has(adKey)) {
          skippedAdIntervalsRef.current.add(adKey);
          handleSkipAd(true);
          return;
        }
      }

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
          player.notice.show = 'Đã bỏ qua đoạn mở đầu';
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
    });

    player.on('video:loadedmetadata', syncTimelineMarkers);
    player.on('video:durationchange', syncTimelineMarkers);
    player.on('resize', syncTimelineMarkers);

    // Auto landscape rotation on mobile fullscreen
    const handleOrientationOnFullscreen = (isFull: boolean) => {
      if (isFull) {
        if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } else {
        if (typeof screen !== 'undefined' && screen.orientation && 'unlock' in screen.orientation) {
          try {
            screen.orientation.unlock();
          } catch {}
        }
      }
    };
    player.on('fullscreen', handleOrientationOnFullscreen);
    player.on('fullscreenWeb', handleOrientationOnFullscreen);

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
      if (stallRecoveryTimer) {
        clearInterval(stallRecoveryTimer);
      }
      skipAdButton.removeEventListener('click', onSkipButtonClick);
      if (playerContainer) {
        playerContainer.removeEventListener('touchstart', handleTouchStart);
        playerContainer.removeEventListener('touchend', handleTouchEnd);
      }
      seekOverlay.remove();
      clearTimeout(seekTimer);
    };
    // Recreate only when the primary/fallback transport changes. Other props use refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, fallbackUrl, type]);

  return (
    <div ref={containerRef} className="absolute inset-0 h-full min-h-0 w-full overflow-hidden" />
  );
}
