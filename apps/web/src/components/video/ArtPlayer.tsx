"use client";
import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import vi from "artplayer/i18n/vi";
import Hls from "hls.js";
import { useSettingsStore } from "@/store/settingsStore";
import {
  detectExplicitHlsAdRanges,
  filterHlsManifest,
} from "@/lib/hls-ad-filter";
import { selectInitialHlsTransport } from "@/lib/player-source-routing";
import { ARTPLAYER_EDITOR_LOADING_GIF } from "./artplayer-editor-assets";

const HLS_STARTUP_TIMEOUT_MS = 8_000;

export interface ArtPlayerProps {
  url: string;
  fallbackUrl?: string;
  type?: "hls" | "mp4" | "auto";
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
    action: "play" | "pause" | "seek";
    currentTime: number;
  }) => void;
  isTheaterMode?: boolean;
  onTheaterModeToggle?: (active: boolean) => void;
  // Skip intro/outro timestamps (giây)
  skipIntroStart?: number;
  skipIntroEnd?: number;
  skipOutroStart?: number;
}

export default function ArtPlayer({
  url,
  fallbackUrl,
  type = "auto",
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
  skipIntroStartRef.current = skipIntroStart;
  skipIntroEndRef.current = skipIntroEnd;

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
      type === "hls" ||
      url.includes(".m3u8") ||
      (type === "auto" && url.includes(".m3u8"));
    // Direct CDN streaming ensures maximum bandwidth, 0 proxy bottlenecks, and instant loading on both mobile and desktop
    const prefersSameOriginHls = false;
    const hlsTransport = selectInitialHlsTransport(
      url,
      fallbackUrl,
      prefersSameOriginHls,
    );

    // -- HLS quality levels (populated after manifest load) --
    let hlsInstance: Hls | null = null;
    let networkRecoveries = 0;
    let mediaRecoveries = 0;
    let stallRecoveryTimer: ReturnType<typeof setInterval> | null = null;
    let startupTimer: ReturnType<typeof setTimeout> | null = null;
    let startupVideo: HTMLVideoElement | null = null;
    let startupReadyHandler: (() => void) | null = null;
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
        ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
        : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
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
        if (
          !Number.isFinite(range.start) ||
          range.start < 0 ||
          detectedAdRangesRef.current.some(
            (current) => Math.abs(current.start - range.start) < 0.75,
          )
        ) {
          continue;
        }
        detectedAdRangesRef.current.push(range);
      }
      detectedAdRangesRef.current.sort(
        (left, right) => left.start - right.start,
      );
    };

    const syncTimelineMarkers = () => {
      const player = playerRef.current;
      const duration = player?.duration || 0;
      const progress = player?.template.$progress?.querySelector(
        ".art-control-progress-inner",
      );
      if (
        !(progress instanceof HTMLElement) ||
        !Number.isFinite(duration) ||
        duration <= 0
      ) {
        return;
      }

      let markerLayer = progress.querySelector<HTMLElement>(
        ".netphim-timeline-markers",
      );
      if (!markerLayer) {
        markerLayer = document.createElement("div");
        markerLayer.className = "netphim-timeline-markers";
        progress.appendChild(markerLayer);
      }
      markerLayer.replaceChildren();

      const appendMarker = (
        kind: "intro" | "ad",
        start: number,
        end: number,
        label: string,
        pointOnly = false,
      ) => {
        const safeStart = Math.min(duration, Math.max(0, start));
        const safeEnd = Math.min(duration, Math.max(safeStart, end));
        const marker = document.createElement("span");
        marker.className = `netphim-timeline-marker netphim-timeline-marker-${kind}${pointOnly ? " is-point" : ""}`;
        const startPercent = (safeStart / duration) * 100;
        marker.style.left = `${startPercent}%`;
        if (startPercent <= 12) marker.classList.add("is-near-start");
        if (startPercent >= 88) marker.classList.add("is-near-end");
        if (!pointOnly) {
          marker.style.width = `${Math.max(
            0.22,
            ((safeEnd - safeStart) / duration) * 100,
          )}%`;
        }
        marker.dataset.label = label;
        marker.title = label;
        marker.setAttribute("role", "img");
        marker.setAttribute("aria-label", label);
        marker.tabIndex = 0;
        markerLayer?.appendChild(marker);
      };

      const introStart = skipIntroStartRef.current;
      const introEnd = skipIntroEndRef.current;
      if (
        duration > 120 &&
        introStart != null &&
        introEnd != null &&
        introEnd > introStart
      ) {
        appendMarker(
          "intro",
          introStart,
          introEnd,
          `Intro · ${formatTimelineTime(introStart)}–${formatTimelineTime(introEnd)}`,
        );
      }

      detectedAdRangesRef.current.forEach((range, index) => {
        appendMarker(
          "ad",
          range.start,
          range.end,
          `Quảng cáo ${index + 1} · ${formatTimelineTime(range.start)}`,
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
    const attachHls = (
      video: HTMLVideoElement,
      streamUrl: string,
      alternateUrl?: string,
    ) => {
      startupVideo = video;
      startupReadyHandler = clearStartupTimer;
      video.addEventListener("loadedmetadata", startupReadyHandler);
      video.addEventListener("canplay", startupReadyHandler);

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          backBufferLength: 30,
          maxBufferLength: 10,
          maxMaxBufferLength: 20,
          maxBufferSize: 30 * 1000 * 1000,
          maxBufferHole: 0.8,
          highBufferWatchdogPeriod: 2,
          nudgeMaxRetry: 6,
          nudgeOffset: 0.1,
          startFragPrefetch: true,
          progressive: true,
          lowLatencyMode: false,
          abrBandWidthFactor: 0.9,
          abrBandWidthUpFactor: 0.8,
          capLevelToPlayerSize: true,
          manifestLoadingTimeOut: 8_000,
          manifestLoadingMaxRetry: 3,
          levelLoadingTimeOut: 8_000,
          levelLoadingMaxRetry: 3,
          fragLoadingTimeOut: 10_000,
          fragLoadingMaxRetry: 3,
          pLoader: class ManifestFilterLoader extends (Hls.DefaultConfig
            .loader as any) {
            load(context: any, config: any, callbacks: any) {
              const originalOnSuccess = callbacks.onSuccess;
              callbacks.onSuccess = (
                response: any,
                stats: any,
                ctx: any,
                networkDetails: any,
              ) => {
                if (
                  typeof response.data === "string" &&
                  (ctx.type === "manifest" || ctx.type === "level")
                ) {
                  try {
                    const filtered = filterHlsManifest(response.data, ctx.url);
                    response.data = filtered.manifest;
                    mergeDetectedAdRanges(
                      filtered.stats.adMarkers.map((marker) => ({
                        start: marker.start,
                        end: marker.start,
                        duration: marker.duration,
                        removed: true,
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
            typeof navigator !== "undefined" &&
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
              navigator.userAgent,
            );
          const timeoutMs = isMobileDevice ? 20_000 : HLS_STARTUP_TIMEOUT_MS;

          startupTimer = setTimeout(() => {
            if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return;
            if (isMobileDevice && video.paused) return;

            if (
              alternateUrl &&
              alternateUrl !== activeStreamUrl &&
              !transportFallbackUsed
            ) {
              transportFallbackUsed = true;
              activeStreamUrl = alternateUrl;
              hls.stopLoad();
              hls.loadSource(activeStreamUrl);
              hls.startLoad(-1);
              armStartupWatchdog();
              return;
            }

            onErrorRef.current?.({
              type: "HLS_STARTUP_TIMEOUT",
              details: { streamUrl: activeStreamUrl },
            });
          }, timeoutMs);
        };

        const switchTransport = () => {
          if (
            !alternateUrl ||
            alternateUrl === activeStreamUrl ||
            transportFallbackUsed
          ) {
            return false;
          }
          transportFallbackUsed = true;
          activeStreamUrl = alternateUrl;
          hls.stopLoad();
          hls.loadSource(activeStreamUrl);
          hls.startLoad(-1);
          armStartupWatchdog();
          return true;
        };

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
            built.find((quality) => quality.default)?.html ??
            built[0]?.html ??
            "HD";

          player.setting.update({
            name: "quality",
            html: "Chất lượng",
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
            prefQuality !== "auto"
              ? levels.findIndex(
                  (level) =>
                    level.height &&
                    `${level.height}p`.toLowerCase() ===
                      prefQuality.toLowerCase(),
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
          if (
            data.type === Hls.ErrorTypes.NETWORK_ERROR &&
            networkRecoveries < 2
          ) {
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
          onErrorRef.current?.({ type: "HLS_FATAL_ERROR", details: data });
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
          } else if (stalledFor >= 7_000 && stallRecoveries === 1) {
            stallRecoveries = 2;
            hls.recoverMediaError();
          } else if (stalledFor >= 14_000 && stallRecoveries === 2) {
            stallRecoveries = 3;
            onErrorRef.current?.({
              type: "HLS_STALL_TIMEOUT",
              details: { currentTime: video.currentTime },
            });
          }
        }, 1_000);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.setAttribute("x5-playsinline", "true");
        video.removeAttribute("crossorigin");
        video.src = streamUrl;
        video.load();

        const handleNativeError = () => {
          if (
            alternateUrl &&
            alternateUrl !== streamUrl &&
            video.src !== alternateUrl
          ) {
            video.src = alternateUrl;
            video.load();
            return;
          }
          onErrorRef.current?.({ type: "HLS_NATIVE_ERROR" });
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

        video.addEventListener("error", handleNativeError, { once: true });
        video.addEventListener("loadedmetadata", handleNativeLoaded, {
          once: true,
        });
        video.addEventListener("canplay", handleNativeLoaded, { once: true });
        video.addEventListener("loadeddata", handleNativeLoaded, {
          once: true,
        });
      } else {
        onErrorRef.current?.({ type: "HLS_UNSUPPORTED" });
      }
    };

    const seekControls = [
      {
        name: "backward-10",
        position: "left" as const,
        index: 25,
        html: `<span class="netphim-seek-glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <g class="netphim-seek-arrow">
              <path d="M8.2 4.7 4.8 8.1l3.4 3.4"/>
              <path d="M5.2 8.1h6.6a7.6 7.6 0 1 1-7 10.6"/>
            </g>
            <text x="12" y="12" text-anchor="middle" dominant-baseline="central">10</text>
          </svg>
        </span>`,
        tooltip: "Lùi 10 giây",
        mounted(element: HTMLElement) {
          element.setAttribute("aria-label", "Lùi 10 giây");
          element.setAttribute("role", "button");
        },
        click: function (this: Artplayer) {
          this.seek = Math.max(0, this.currentTime - 10);
        },
      },
      {
        name: "forward-10",
        position: "left" as const,
        index: 26,
        html: `<span class="netphim-seek-glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <g class="netphim-seek-arrow" transform="translate(24 0) scale(-1 1)">
              <path d="M8.2 4.7 4.8 8.1l3.4 3.4"/>
              <path d="M5.2 8.1h6.6a7.6 7.6 0 1 1-7 10.6"/>
            </g>
            <text x="12" y="12" text-anchor="middle" dominant-baseline="central">10</text>
          </svg>
        </span>`,
        tooltip: "Tua 10 giây",
        mounted(element: HTMLElement) {
          element.setAttribute("aria-label", "Tua 10 giây");
          element.setAttribute("role", "button");
        },
        click: function (this: Artplayer) {
          const targetTime = this.currentTime + 10;
          this.seek = Number.isFinite(this.duration)
            ? Math.min(this.duration, targetTime)
            : targetTime;
        },
      },
    ];

    const player = new Artplayer({
      container: containerRef.current,
      url: isHls ? hlsTransport.primary : url,
      type: isHls ? "m3u8" : "auto",
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
      fastForward: true,
      lock: true,
      screenshot:
        typeof navigator !== "undefined"
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
      theme: "#8b5cf6",
      lang: "vi",
      i18n: { vi },
      icons: {
        loading: `<img src="${ARTPLAYER_EDITOR_LOADING_GIF}" alt="" aria-hidden="true">`,
        state:
          '<img width="150" height="150" src="/artplayer/state.svg" alt="" aria-hidden="true">',
        indicator:
          '<img width="16" height="16" src="/artplayer/indicator.svg" alt="" aria-hidden="true">',
      },
      moreVideoAttr: {
        playsInline: "true",
        "webkit-playsinline": "true",
        "x5-playsinline": "true",
        "x5-video-player-type": "h5",
        "x5-video-player-fullscreen": "false",
      },
      controls: seekControls,
      // Use ArtPlayer's native focus-scoped keyboard controls.
      hotkey: true,

      // Keep the movie subtitle source, but let ArtPlayer render and position it.
      ...(subtitle
        ? {
            subtitle: {
              url: subtitle,
              type: "vtt",
            },
          }
        : {}),
    } as unknown as ConstructorParameters<typeof Artplayer>[0]);

    playerRef.current = player;

    // ArtPlayer can rebuild its control tree while initializing a custom HLS
    // source. Restore the seek buttons if that happens so they are always
    // present on desktop and mobile layouts.
    const ensureSeekControls = () => {
      for (const control of seekControls) {
        const selector = `.art-control-${control.name}`;
        if (!player.template.$controls.querySelector(selector)) {
          player.controls.add(control);
        }
      }
    };
    ensureSeekControls();
    player.on("ready", () => {
      ensureSeekControls();
      syncTimelineMarkers();
    });
    player.on("video:durationchange", syncTimelineMarkers);

    player.on("video:play", () => {
      onPlaybackStateChangeRef.current?.({
        action: "play",
        currentTime: player.currentTime,
      });
    });
    player.on("video:pause", () => {
      onPlaybackStateChangeRef.current?.({
        action: "pause",
        currentTime: player.currentTime,
      });
    });
    player.on("video:seeked", () => {
      onPlaybackStateChangeRef.current?.({
        action: "seek",
        currentTime: player.currentTime,
      });
    });
    let didStartPlayback = false;
    let bufferingStartedAt = 0;
    player.on("video:waiting", () => {
      if (!bufferingStartedAt) bufferingStartedAt = Date.now();
    });
    player.on("video:stalled", () => {
      if (!bufferingStartedAt) bufferingStartedAt = Date.now();
    });
    player.on("video:playing", () => {
      if (bufferingStartedAt) {
        onBufferingRef.current?.(Date.now() - bufferingStartedAt);
        bufferingStartedAt = 0;
      }
      if (!didStartPlayback) {
        didStartPlayback = true;
        onPlaybackStartRef.current?.(player);
      }
    });

    // Skip only ranges backed by an explicit ad URL. Marker-only ranges and
    // removed manifest segments must never mutate currentTime.
    const checkAndSkipAd = (time: number): boolean => {
      const activeAd = detectedAdRangesRef.current.find(
        (ad) =>
          ad.skippable === true &&
          !ad.removed &&
          ad.duration > 0 &&
          ad.duration <= 180 &&
          time >= ad.start - 0.05 &&
          time < ad.end - 0.15,
      );
      if (activeAd) {
        const duration = Number.isFinite(player.duration) ? player.duration : 0;
        const target = duration > 0
          ? Math.min(Math.max(0, duration - 0.25), activeAd.end + 0.15)
          : activeAd.end + 0.15;
        if (target <= time || target - time > 181) return false;
        if (Math.abs(player.currentTime - target) > 0.2) {
          player.currentTime = target;
          return true;
        }
      }
      return false;
    };

    player.on("video:timeupdate", () => {
      checkAndSkipAd(player.currentTime);
    });

    player.on("video:seeking", () => {
      checkAndSkipAd(player.currentTime);
    });

    player.on("video:seeked", () => {
      checkAndSkipAd(player.currentTime);
    });

    player.on("seek", (time: number) => {
      checkAndSkipAd(time);
    });

    // Keep business callbacks around ArtPlayer's native UI lifecycle.
    player.on("ready", () => {
      onReadyRef.current?.(player);
      if (player.loading) {
        player.loading.show = false;
      }
      if (player.mask) {
        player.mask.show = true;
      }
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
      player.on("ready", () => {
        if (startTime < player.duration - 10) {
          player.currentTime = startTime;
        }
      });
    }

    // -- Save progress + Skip Intro/Outro detection --
    let lastSave = 0;
    let didAutoSkipIntro = false;
    player.on("video:timeupdate", () => {
      const now = Date.now();
      const ct = player.currentTime;
      const dur = player.duration;
      if (dur > 0) {
        if (now - lastSave > 5000) {
          lastSave = now;
          if (savedKey) localStorage.setItem(savedKey, ct.toString());
        }
        onProgressRef.current?.(ct, dur);

        // Auto-skip Intro if setting enabled and starting from beginning
        const isAutoSkipEnabled =
          useSettingsStore.getState().autoSkipIntro ||
          (typeof window !== "undefined" &&
            localStorage.getItem("cineverse_auto_skip_intro") === "true");

        if (!didAutoSkipIntro && isAutoSkipEnabled && dur > 120) {
          if (ct >= 0 && ct < 3 && startTime < 5) {
            didAutoSkipIntro = true;
            const targetIntro = skipIntroEndRef.current ?? 85;
            player.currentTime = targetIntro;
          }
        }
      }
    });

    // -- Video ended → clear saved progress, fire callback --
    player.on("video:ended", () => {
      if (savedKey) localStorage.removeItem(savedKey);
      onEndedRef.current?.();
    });

    // -- Native error --
    player.on("video:error", (err) => {
      onErrorRef.current?.({ type: "NATIVE_ERROR", details: err });
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
        startupVideo.removeEventListener("loadedmetadata", startupReadyHandler);
        startupVideo.removeEventListener("canplay", startupReadyHandler);
      }
      if (stallRecoveryTimer) {
        clearInterval(stallRecoveryTimer);
      }
    };
    // Recreate only when the primary/fallback transport changes. Other props use refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, fallbackUrl, type]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full min-h-0 w-full overflow-hidden"
    />
  );
}
