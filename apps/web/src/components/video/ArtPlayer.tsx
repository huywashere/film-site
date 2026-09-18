'use client';
import { useEffect, useRef, useState } from 'react';
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
  ARTPLAYER_SERVER_ROUTER_SVG,
} from './artplayer-editor-assets';
import { attachNightModeAudio, isNightModeEnabled, setNightMode } from '@/lib/audio-effects';
import { setupScrubberPreview } from './scrubber-preview';
import { setupMobileCenterControls } from './mobile-center-controls';
import PlayerServerHealthPanel, { type PlayerServerItem } from './PlayerServerHealthPanel';

export type { PlayerServerItem } from './PlayerServerHealthPanel';

// Reduced from 8s → 6s for desktop. Mobile timeout is extended in the watchdog
// itself. Faster timeout = faster automatic fallback to an alternate server.
const HLS_STARTUP_TIMEOUT_MS = 5_000;

export interface SubtitleTrack {
  label: string;
  url: string;
  language?: string;
  default?: boolean;
}

export interface ArtPlayerProps {
  url: string;
  fallbackUrl?: string;
  type?: 'hls' | 'mp4' | 'auto';
  poster?: string;
  title?: string;
  subtitle?: string;
  subtitles?: SubtitleTrack[];
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
  onStallSuggestServer?: () => void;
  servers?: PlayerServerItem[];
  currentServerIndex?: number;
  onSwitchServer?: (index: number) => void;
}

export default function ArtPlayer({
  url,
  fallbackUrl,
  type = 'auto',
  poster,
  title,
  subtitle,
  subtitles,
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
  autoSkipIntro = false,
  autoSkipAds = true,
  minAdStartTime = 360,
  adRanges,
  onStallSuggestServer,
  servers,
  currentServerIndex,
  onSwitchServer,
}: ArtPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Artplayer | null>(null);
  const [isServerPanelOpen, setIsServerPanelOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const toggleServerPanelRef = useRef<() => void>(() => {});
  toggleServerPanelRef.current = () => {
    setIsServerPanelOpen((prev) => !prev);
  };
  const onSwitchServerRef = useRef(onSwitchServer);
  onSwitchServerRef.current = onSwitchServer;
  const onStallSuggestServerRef = useRef(onStallSuggestServer);
  onStallSuggestServerRef.current = onStallSuggestServer;
  const stallIncidentTimesRef = useRef<number[]>([]);

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

  const triggerSeekRippleRef = useRef<((isLeft: boolean) => void) | null>(null);
  const serializedSubtitles = JSON.stringify(subtitles || []);

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
      const minStart = Math.max(minAdStartTimeRef.current ?? 360, skipIntroEndRef.current ?? 0, 360);
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

      const minStart = Math.max(minAdStartTimeRef.current ?? 360, skipIntroEndRef.current ?? 0, 360);
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
      video.addEventListener('canplay', () => attachNightModeAudio(video), { once: true });

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

        // HLS Playback Watchdog: Chống đứng hình thông minh 2 tầng
        let lastPlaybackTime = -1;
        let freezeCounter = 0;
        let stalledSince = 0;
        let stallRecoveries = 0;

        stallRecoveryTimer = setInterval(() => {
          if (video.paused || video.ended || video.seeking) {
            lastPlaybackTime = video.currentTime;
            freezeCounter = 0;
            stalledSince = 0;
            stallRecoveries = 0;
            return;
          }

          // Case A: Playback stall detection (currentTime frozen while supposed to be playing)
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            if (Math.abs(video.currentTime - lastPlaybackTime) < 0.05) {
              freezeCounter++;

              // Giai đoạn 1: Soft stall (khựng >= 1s): nhích nhẹ currentTime += 0.1s vượt qua micro-gap
              if (freezeCounter === 2 || freezeCounter === 3) {
                const incidentNow = Date.now();
                stallIncidentTimesRef.current.push(incidentNow);
                stallIncidentTimesRef.current = stallIncidentTimesRef.current.filter((t) => incidentNow - t <= 60000);
                if (stallIncidentTimesRef.current.length >= 2) {
                  onStallSuggestServerRef.current?.();
                }

                try {
                  const targetTime = Math.min((video.duration || Infinity) - 0.1, video.currentTime + 0.1);
                  video.currentTime = targetTime;
                  void video.play().catch(() => {});
                } catch {}
              }

              // Giai đoạn 2: Hard stall (đứng >= 3.5s): tự phục hồi media error & tái khởi động tải luồng
              if (freezeCounter >= 7) {
                freezeCounter = 0;
                try {
                  const resumeTime = video.currentTime;
                  hls.recoverMediaError();
                  hls.startLoad(resumeTime);
                  video.currentTime = resumeTime;
                  void video.play().catch(() => {});
                } catch {}
              }
            } else {
              lastPlaybackTime = video.currentTime;
              freezeCounter = 0;
            }
          }

          // Case B: Buffer starvation (readyState < HAVE_FUTURE_DATA)
          if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
            const now = Date.now();
            if (!stalledSince) stalledSince = now;
            const stalledFor = now - stalledSince;

            if (stalledFor >= 3_000 && stallRecoveries === 0) {
              stallRecoveries = 1;
              const incidentNow = Date.now();
              stallIncidentTimesRef.current.push(incidentNow);
              stallIncidentTimesRef.current = stallIncidentTimesRef.current.filter((t) => incidentNow - t <= 60000);
              if (stallIncidentTimesRef.current.length >= 2) {
                onStallSuggestServerRef.current?.();
              }

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
          } else {
            stalledSince = 0;
            stallRecoveries = 0;
          }
        }, 500);
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

    const effectiveSubtitles: SubtitleTrack[] = (
      Array.isArray(subtitles) && subtitles.length > 0
        ? subtitles
        : typeof subtitle === 'string' &&
            (subtitle.startsWith('http') || subtitle.endsWith('.vtt') || subtitle.endsWith('.srt'))
          ? [{ label: 'Vietsub', url: subtitle, default: true }]
          : []
    ).filter((track) => Boolean(track.url));

    const defaultSubtitle = effectiveSubtitles.find((t) => t.default) || effectiveSubtitles[0];

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
            if (triggerSeekRippleRef.current) {
              triggerSeekRippleRef.current(true);
            } else if (playerRef.current) {
              const art = playerRef.current;
              art.seek = Math.max(0, art.currentTime - 10);
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
            if (triggerSeekRippleRef.current) {
              triggerSeekRippleRef.current(false);
            } else if (playerRef.current) {
              const art = playerRef.current;
              art.seek = Math.min(art.duration || Infinity, art.currentTime + 10);
            }
          },
        },
        ...(effectiveSubtitles.length > 0
          ? [
              {
                name: 'subtitle-toggle',
                position: 'right',
                index: 18,
                html: `<span class="art-icon" style="display:inline-flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3" ry="3"/><path d="M10 10.5a1.5 1.5 0 0 0-3 0v3a1.5 1.5 0 0 0 3 0"/><path d="M17 10.5a1.5 1.5 0 0 0-3 0v3a1.5 1.5 0 0 0 3 0"/></svg></span>`,
                tooltip: 'Bật/Tắt phụ đề',
                click: function () {
                  const art = playerRef.current;
                  if (!art) return;
                  if (!art.subtitle.url && defaultSubtitle) {
                    void art.subtitle.switch(defaultSubtitle.url, { name: defaultSubtitle.label });
                    art.subtitle.show = true;
                    art.notice.show = `Phụ đề: ${defaultSubtitle.label}`;
                  } else {
                    art.subtitle.show = !art.subtitle.show;
                    art.notice.show = art.subtitle.show ? 'Đã bật phụ đề' : 'Đã tắt phụ đề';
                  }
                },
              },
            ]
          : []),
        ...(servers && servers.length > 0
          ? [
              {
                name: 'server-health',
                position: 'right',
                index: 19,
                html: `<span class="art-icon netphim-server-health-btn" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer;">${ARTPLAYER_SERVER_ROUTER_SVG}</span>`,
                tooltip: 'Máy chủ & Sức khỏe',
                click: function () {
                  toggleServerPanelRef.current();
                },
              },
            ]
          : []),
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
        ...(effectiveSubtitles.length > 0
          ? [
              {
                html: 'Phụ đề',
                tooltip: defaultSubtitle ? defaultSubtitle.label : 'Tắt',
                selector: [
                  { html: 'Tắt', url: '', default: !defaultSubtitle },
                  ...effectiveSubtitles.map((track) => ({
                    html: track.label,
                    url: track.url,
                    default: defaultSubtitle?.url === track.url,
                  })),
                ],
                onSelect: function (item: any) {
                  const art = playerRef.current;
                  if (!art) return item.html;
                  if (!item.url) {
                    art.subtitle.show = false;
                    art.notice.show = 'Đã tắt phụ đề';
                    return 'Tắt';
                  }
                  art.subtitle.show = true;
                  void art.subtitle.switch(item.url, { name: item.html });
                  art.notice.show = `Phụ đề: ${item.html}`;
                  return item.html;
                },
              },
            ]
          : []),
        ...(servers && servers.length > 0
          ? [
              {
                html: 'Máy chủ',
                tooltip:
                  servers.find((s) => s.index === currentServerIndex)?.name ||
                  servers[0]?.name ||
                  'Mặc định',
                selector: servers.map((srv) => ({
                  html: `${srv.name} (${srv.episodesCount} tập)`,
                  index: srv.index,
                  default: srv.index === currentServerIndex,
                })),
                onSelect: function (item: any) {
                  onSwitchServerRef.current?.(item.index);
                  return item.html;
                },
              },
            ]
          : []),
        {
          html: 'Tự động bỏ qua quảng cáo',
          tooltip: autoSkipAds ? 'Bật' : 'Tắt',
          switch: autoSkipAds,
          onSwitch: function (item: any) {
            const next = !item.switch;
            item.tooltip = next ? 'Bật' : 'Tắt';
            autoSkipAdsRef.current = next;
            useSettingsStore.getState().setAutoSkipAds(next);
            return next;
          },
        },
        {
          html: 'Tự động bỏ qua mở đầu',
          tooltip: autoSkipIntroRef.current ? 'Bật' : 'Tắt',
          switch: autoSkipIntroRef.current,
          onSwitch: function (item: any) {
            const next = !item.switch;
            item.tooltip = next ? 'Bật' : 'Tắt';
            autoSkipIntroRef.current = next;
            if (typeof window !== 'undefined') {
              localStorage.setItem('netphim_auto_skip_intro', String(next));
              localStorage.setItem('netphim_skip_intro', String(next));
            }
            return next;
          },
        },
        {
          html: 'Chế độ Ban đêm (Kích thoại)',
          tooltip: isNightModeEnabled() ? 'Bật' : 'Tắt',
          switch: isNightModeEnabled(),
          onSwitch: function (item: any) {
            const nextState = !item.switch;
            item.tooltip = nextState ? 'Bật' : 'Tắt';
            setNightMode(nextState);
            if (playerRef.current) {
              playerRef.current.notice.show = nextState
                ? 'Đã bật Chế độ Ban đêm: Giọng thoại rõ nét, giảm âm nổ'
                : 'Đã tắt Chế độ Ban đêm';
            }
            return nextState;
          },
        },
      ],
      // Player seek & theme color set to purple per user customization request.
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
      // Use ArtPlayer's native focus-scoped keyboard controls.
      hotkey: true,

      ...(defaultSubtitle
        ? {
            subtitle: {
              url: defaultSubtitle.url,
              type: defaultSubtitle.url.endsWith('.srt') ? 'srt' : 'vtt',
              style: {
                color: '#ffffff',
                fontSize: '20px',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.9), 0 0 4px rgba(0, 0, 0, 0.7)',
                fontWeight: '500',
              },
              encoding: 'utf-8',
              escape: true,
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
      <span class="netphim-skip-ad-icon" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 4v16l11-8L5 4zm12 0h2.5v16H17V4z" fill="currentColor"></path>
        </svg>
      </span>
      <span class="netphim-skip-ad-label">Bỏ qua quảng cáo</span>
      <span class="netphim-skip-ad-countdown" aria-hidden="true"></span>
    `;
    const findActiveAd = (time: number) => {
      const minStart = Math.max(minAdStartTimeRef.current ?? 360, skipIntroEndRef.current ?? 0, 360);
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
    // Native ArtPlayer Skip Intro Button (Netflix Standard)
    // =========================================================================
    const skipIntroButton = document.createElement('button');
    skipIntroButton.type = 'button';
    skipIntroButton.className = 'netphim-skip-intro';
    skipIntroButton.hidden = true;
    skipIntroButton.setAttribute('aria-live', 'polite');
    skipIntroButton.innerHTML = `
      <span class="netphim-skip-intro-icon" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 4v16l11-8L5 4zm12 0h2.5v16H17V4z" fill="currentColor"></path>
        </svg>
      </span>
      <span class="netphim-skip-intro-label">Bỏ qua giới thiệu</span>
    `;

    const isIntroActive = (time: number) => {
      const start = skipIntroStartRef.current ?? 0;
      const end = skipIntroEndRef.current ?? 85;
      const duration = Number.isFinite(player.duration) ? player.duration : 0;
      return (
        duration > 120 &&
        end > start &&
        time >= start &&
        time < end - 0.5
      );
    };

    const syncSkipIntroButton = () => {
      const active = isIntroActive(player.currentTime);
      skipIntroButton.hidden = !active;
    };

    const handleSkipIntro = () => {
      const end = skipIntroEndRef.current ?? 85;
      const duration = Number.isFinite(player.duration) ? player.duration : 0;
      const target =
        duration > 0 ? Math.min(Math.max(0, duration - 1), end + 0.1) : end + 0.1;
      player.seek = target;
      player.notice.show = 'Đã bỏ qua phần giới thiệu';
      syncSkipIntroButton();
    };

    const onSkipIntroClick = () => handleSkipIntro();
    skipIntroButton.addEventListener('click', onSkipIntroClick);

    // =========================================================================
    // Mobile & Touch Double-Tap Seek (YouTube-style 10s ripple & badge)
    // =========================================================================
    (Artplayer as any).MOBILE_DBCLICK_PLAY = false;

    const seekOverlay = document.createElement('div');
    seekOverlay.className = 'netphim-mobile-seek-overlay';
    seekOverlay.setAttribute('aria-hidden', 'true');
    seekOverlay.innerHTML = `
      <div class="netphim-mobile-seek-side is-left">
        <div class="netphim-mobile-seek-content">
          <div class="netphim-mobile-seek-triangles">
            <svg class="seek-tri seek-tri-3" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 3 5 12 19 21 19 3"/></svg>
            <svg class="seek-tri seek-tri-2" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 3 5 12 19 21 19 3"/></svg>
            <svg class="seek-tri seek-tri-1" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 3 5 12 19 21 19 3"/></svg>
          </div>
          <span class="netphim-mobile-seek-text" data-text-left>10 giây</span>
        </div>
      </div>
      <div class="netphim-mobile-seek-side is-right">
        <div class="netphim-mobile-seek-content">
          <div class="netphim-mobile-seek-triangles">
            <svg class="seek-tri seek-tri-1" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <svg class="seek-tri seek-tri-2" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <svg class="seek-tri seek-tri-3" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <span class="netphim-mobile-seek-text" data-text-right>10 giây</span>
        </div>
      </div>
    `;

    const playerContainer = (player as any).template?.$player || containerRef.current;
    if (playerContainer) {
      playerContainer.appendChild(seekOverlay);
      playerContainer.appendChild(skipAdButton);
      playerContainer.appendChild(skipIntroButton);
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

    triggerSeekRippleRef.current = triggerSeekRipple;
    (player as any).triggerSeekRipple = triggerSeekRipple;
    (Artplayer as any).SEEK_STEP = 10;

    const teardownScrubberPreview = setupScrubberPreview({
      player,
      streamUrl: isHls ? hlsTransport.primary : url,
      isHls,
      subtitleUrl: subtitle,
    });

    const teardownMobileCenterControls = setupMobileCenterControls({
      player,
      triggerSeekRipple,
    });

    try {
      if ((player as any).hotkey) {
        let lastHotkeySeekTime = 0;
        const handleSeekKey = (isLeft: boolean, event: KeyboardEvent) => {
          event.preventDefault();
          (event as any)._artHandled = true;
          const now = Date.now();
          if (event.repeat && now - lastHotkeySeekTime < 220) {
            return;
          }
          lastHotkeySeekTime = now;
          triggerSeekRipple(isLeft);
        };

        const keys = (player as any).hotkey.keys || {};
        (player as any).hotkey.keys = keys;
        keys['ArrowLeft'] = [(event: KeyboardEvent) => handleSeekKey(true, event)];
        keys['ArrowRight'] = [(event: KeyboardEvent) => handleSeekKey(false, event)];
        keys['KeyJ'] = [(event: KeyboardEvent) => handleSeekKey(true, event)];
        keys['KeyL'] = [(event: KeyboardEvent) => handleSeekKey(false, event)];
      }
    } catch {
      // safe fallback
    }

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
          '.art-bottom, .art-controls, .art-control, .art-state, .art-settings, .art-contextmenu, .art-layer-auto-playback, .art-notice, .art-loading, .netphim-skip-ad, .netphim-skip-intro, .art-layer-lock, .netphim-mobile-center-controls, .netphim-mobile-center-btn'
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
      syncSkipIntroButton();
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
          player.notice.show = 'Đã tự động bỏ qua phần giới thiệu';
          syncSkipIntroButton();
        }
      }
    });
    player.on('video:seeking', () => {
      if (seekOriginTime === null) seekOriginTime = lastStablePlaybackTime;
      syncSkipAdButton();
      syncSkipIntroButton();
    });
    player.on('video:seeked', () => {
      syncSkipAdButton();
      syncSkipIntroButton();
    });
    player.on('seek', () => {
      syncSkipAdButton();
      syncSkipIntroButton();
    });

    // Keep business callbacks around ArtPlayer's native UI lifecycle.
    player.on('ready', () => {
      setPortalContainer((player as any).template?.$player || containerRef.current);
      if (player.video) {
        attachNightModeAudio(player.video);
      }
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
      skipAdButton.remove();
      skipIntroButton.removeEventListener('click', onSkipIntroClick);
      skipIntroButton.remove();
      if (playerContainer) {
        playerContainer.removeEventListener('touchstart', handleTouchStart);
        playerContainer.removeEventListener('touchend', handleTouchEnd);
      }
      seekOverlay.remove();
      clearTimeout(seekTimer);
      triggerSeekRippleRef.current = null;
      if (playerRef.current) {
        (playerRef.current as any).triggerSeekRipple = null;
      }
      teardownScrubberPreview();
      teardownMobileCenterControls();
      setPortalContainer(null);
    };
    // Recreate only when the primary/fallback transport or subtitles change. Other props use refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, fallbackUrl, type, serializedSubtitles]);

  useEffect(() => {
    if (isServerPanelOpen && playerRef.current) {
      playerRef.current.controls.show = true;
    }
  }, [isServerPanelOpen]);

  return (
    <div ref={containerRef} className="absolute inset-0 h-full min-h-0 w-full overflow-hidden">
      {servers && servers.length > 0 && (
        <PlayerServerHealthPanel
          isOpen={isServerPanelOpen}
          onClose={() => setIsServerPanelOpen(false)}
          servers={servers}
          currentServerIndex={currentServerIndex ?? 0}
          onSwitchServer={(idx) => {
            onSwitchServer?.(idx);
            setIsServerPanelOpen(false);
          }}
          portalContainer={portalContainer || containerRef.current}
        />
      )}
    </div>
  );
}
