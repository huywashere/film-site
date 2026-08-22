"use client";
import { useState, useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import { isLikelyAdUrl, filterHlsManifest } from "@/lib/hls-ad-filter";
import { selectInitialHlsTransport } from "@/lib/player-source-routing";

const HLS_STARTUP_TIMEOUT_MS = 8_000;

const ART_PLAY_ICON = `
  <div class="art-icon art-icon-custom-play" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M7.35 4.82a1.35 1.35 0 0 1 2.02-1.17l9.15 5.72a3.08 3.08 0 0 1 0 5.26l-9.15 5.72a1.35 1.35 0 0 1-2.02-1.17V4.82Z" />
    </svg>
  </div>`;

const ART_PAUSE_ICON = `
  <div class="art-icon art-icon-custom-pause" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <rect x="6.25" y="4" width="4.25" height="16" rx="1.35" />
      <rect x="13.5" y="4" width="4.25" height="16" rx="1.35" />
    </svg>
  </div>`;

const ART_STATE_ICON = `
  <div class="art-icon art-icon-custom-state" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M8.15 5.42a1.18 1.18 0 0 1 1.77-1.02l8.08 5.05a2.98 2.98 0 0 1 0 5.1L9.92 19.6a1.18 1.18 0 0 1-1.77-1.02V5.42Z" />
    </svg>
  </div>`;

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
  isTheaterMode = false,
  onTheaterModeToggle,
  skipIntroStart,
  skipIntroEnd,
  skipOutroStart,
}: ArtPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Artplayer | null>(null);

  const [isDimmed, setIsDimmed] = useState(false); // Chế độ rạp tắt đèn
  const [pipActive, setPipActive] = useState(false); // Picture-in-Picture

  // Gestures state
  const [isSpeedBoosted, setIsSpeedBoosted] = useState(false);
  const [doubleTapHud, setDoubleTapHud] = useState<"rewind" | "forward" | null>(
    null,
  );
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);
  const previousSpeedRef = useRef<number>(1);

  const isTheaterModeRef = useRef(isTheaterMode);
  const onTheaterModeToggleRef = useRef(onTheaterModeToggle);
  isTheaterModeRef.current = isTheaterMode;
  onTheaterModeToggleRef.current = onTheaterModeToggle;

  const detectedAdRangesRef = useRef<
    Array<{ start: number; end: number; duration: number }>
  >([]);

  const initialTimeRef = useRef(initialTime);
  const progressKeyRef = useRef(progressKey);
  const dbProgressRef = useRef(dbProgress);
  const skipIntroStartRef = useRef(skipIntroStart);
  const skipIntroEndRef = useRef(skipIntroEnd);
  const skipOutroStartRef = useRef(skipOutroStart);
  skipIntroStartRef.current = skipIntroStart;
  skipIntroEndRef.current = skipIntroEnd;
  skipOutroStartRef.current = skipOutroStart;

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

    const isHls =
      type === "hls" ||
      url.includes(".m3u8") ||
      (type === "auto" && url.includes(".m3u8"));
    const prefersSameOriginHls =
      isHls &&
      (window.matchMedia("(max-width: 1024px), (pointer: coarse)").matches ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
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
    const qualityLevels: { default: boolean; html: string; url: string }[] = [];

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
          backBufferLength: 60,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 120 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 1,
          nudgeMaxRetry: 5,
          nudgeOffset: 0.15,
          abrBandWidthFactor: 0.8,
          abrBandWidthUpFactor: 0.6,
          capLevelToPlayerSize: true,
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
          startupTimer = setTimeout(() => {
            if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return;

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
          }, HLS_STARTUP_TIMEOUT_MS);
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

        // Auto-detect spliced ad blocks (EXT-X-DISCONTINUITY) and betting/casino ad segments
        hls.on(Hls.Events.LEVEL_LOADED, (_e, data) => {
          const frags = data.details?.fragments || [];
          if (!frags.length) return;

          const adRanges: Array<{
            start: number;
            end: number;
            duration: number;
          }> = [];

          type Block = {
            cc: number;
            start: number;
            end: number;
            duration: number;
            hasAdUrl: boolean;
          };
          const blocks: Block[] = [];
          let currentBlock: Block = {
            cc: frags[0].cc ?? 0,
            start: frags[0].start,
            end: frags[0].start + frags[0].duration,
            duration: frags[0].duration,
            hasAdUrl: isLikelyAdUrl(frags[0].url || ""),
          };

          for (let i = 1; i < frags.length; i++) {
            const f = frags[i];
            const isAd = isLikelyAdUrl(f.url || "");
            if (f.cc === currentBlock.cc) {
              currentBlock.end = f.start + f.duration;
              currentBlock.duration = currentBlock.end - currentBlock.start;
              if (isAd) currentBlock.hasAdUrl = true;
            } else {
              blocks.push(currentBlock);
              currentBlock = {
                cc: f.cc,
                start: f.start,
                end: f.start + f.duration,
                duration: f.duration,
                hasAdUrl: isAd,
              };
            }
          }
          blocks.push(currentBlock);

          for (const b of blocks) {
            const isShortAdDuration = b.duration >= 4 && b.duration <= 95;
            if (b.hasAdUrl || (isShortAdDuration && blocks.length > 1)) {
              const alreadyAdded = adRanges.some(
                (r) =>
                  Math.abs(r.start - b.start) < 1 &&
                  Math.abs(r.end - b.end) < 1,
              );
              if (!alreadyAdded) {
                adRanges.push({
                  start: b.start,
                  end: b.end,
                  duration: b.duration,
                });
              }
            }
          }

          detectedAdRangesRef.current = adRanges;
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          const levels = data.levels ?? [];
          if (levels.length <= 1) return;

          const prefQuality = useSettingsStore.getState().defaultQuality;
          if (prefQuality !== "auto") {
            const targetIdx = levels.findIndex(
              (level) =>
                level.height &&
                `${level.height}p`.toLowerCase() === prefQuality.toLowerCase(),
            );
            if (targetIdx !== -1) hls.currentLevel = targetIdx;
          }

          const built = levels.map((level, i) => ({
            default:
              i === hls.currentLevel || (hls.currentLevel === -1 && i === 0),
            html: level.height ? `${level.height}p` : `Level ${i + 1}`,
            url: streamUrl,
            level: i,
          }));
          qualityLevels.unshift({
            default: hls.currentLevel === -1,
            html: "Tự động (ABR)",
            url: streamUrl,
            level: -1,
          } as (typeof qualityLevels)[number]);
          built.forEach((quality) =>
            qualityLevels.push(quality as (typeof qualityLevels)[number]),
          );

          player.setting.update({
            name: "quality",
            html: "Chất lượng",
            tooltip: built.find((quality) => quality.default)?.html ?? "Auto",
            selector: qualityLevels.map((quality) => ({
              default: quality.default,
              html: quality.html,
              url: quality.url,
              level: (quality as { level?: number }).level ?? -1,
            })),
            onSelect(item: { level: number; html: string }) {
              hls.currentLevel = item.level ?? -1;
              return item.html;
            },
          } as any);
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

          if (stalledFor >= 5_000 && stallRecoveries === 0) {
            stallRecoveries = 1;
            if (hls.autoLevelEnabled && hls.loadLevel > 0) {
              hls.nextAutoLevel = hls.loadLevel - 1;
            }
            hls.startLoad(video.currentTime);
          } else if (stalledFor >= 12_000 && stallRecoveries === 1) {
            stallRecoveries = 2;
            hls.recoverMediaError();
          } else if (stalledFor >= 20_000 && stallRecoveries === 2) {
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
        video.src = streamUrl;
        video.load();

        const handleNativeError = () => {
          if (alternateUrl && alternateUrl !== streamUrl && video.src !== alternateUrl) {
            video.src = alternateUrl;
            video.load();
            return;
          }
          onErrorRef.current?.({ type: "HLS_NATIVE_ERROR" });
        };

        video.addEventListener("error", handleNativeError, { once: true });
      } else {
        onErrorRef.current?.({ type: "HLS_UNSUPPORTED" });
      }
    };

    const player = new Artplayer({
      container: containerRef.current,
      url: isHls ? hlsTransport.primary : url,
      type: isHls ? "m3u8" : "auto",
      customType: {
        m3u8: function (video: HTMLVideoElement, streamUrl: string) {
          attachHls(video, streamUrl, hlsTransport.fallback);
        },
      },
      poster,
      title,
      volume: 0.8,
      autoplay,
      autoSize: false,
      autoMini: false,
      screenshot: true,
      setting: true,
      pip: true,
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
      theme: "#20b9e8",
      cssVar: {
        "--art-progress-height": "4px",
        "--art-progress-color": "rgba(255, 255, 255, 0.24)",
        "--art-loaded-color": "rgba(255, 255, 255, 0.42)",
        "--art-indicator-size": "18px",
      },
      lang: "vi",
      icons: {
        play: ART_PLAY_ICON,
        pause: ART_PAUSE_ICON,
        state: ART_STATE_ICON,
      },
      moreVideoAttr: {
        crossOrigin: "anonymous",
        playsInline: "true",
        "webkit-playsinline": "true",
        "x5-playsinline": "true",
        "x5-video-player-type": "h5",
        "x5-video-player-fullscreen": "false",
      },

      // Hotkey settings (handing via custom event listener)
      hotkey: false,

      // Subtitle with style customization & Subtitle Offset Sync
      ...(subtitle
        ? {
            subtitle: {
              url: subtitle,
              type: "vtt",
              style: {
                color: "#ffffff",
                fontSize: "22px",
                textShadow: "0 2px 4px rgba(0,0,0,0.8)",
              },
            },
          }
        : {}),

      // Settings menu additions: Subtitle Sync Offset (+/- 0.5s) and Custom Subtitle Colors
      settings: [
        {
          html: "Tốc độ phát",
          tooltip: "1x",
          selector: [
            { html: "0.25x", value: 0.25 },
            { html: "0.5x", value: 0.5 },
            { html: "0.75x", value: 0.75 },
            { default: true, html: "1x (Bình thường)", value: 1 },
            { html: "1.25x", value: 1.25 },
            { html: "1.5x", value: 1.5 },
            { html: "1.75x", value: 1.75 },
            { html: "2x", value: 2 },
          ],
          onSelect(item: { value: number; html: string }) {
            player.playbackRate = item.value;
            player.notice.show = `Tốc độ: ${item.html}`;
            return item.html;
          },
        },
        {
          html: "Độ lệch phụ đề (Sync)",
          tooltip: "0.0s",
          selector: [
            { html: "-2.0s", offset: -2 },
            { html: "-1.0s", offset: -1 },
            { html: "-0.5s", offset: -0.5 },
            { default: true, html: "0.0s (Chuẩn)", offset: 0 },
            { html: "+0.5s", offset: 0.5 },
            { html: "+1.0s", offset: 1 },
            { html: "+2.0s", offset: 2 },
          ],
          onSelect(item: { offset: number; html: string }) {
            if (player.subtitle) {
              (
                player.subtitle as typeof player.subtitle & { offset?: number }
              ).offset = item.offset;
              player.notice.show = `Phụ đề: ${item.html}`;
            }
            return item.html;
          },
        },
        {
          html: "Màu phụ đề",
          tooltip: "Trắng",
          selector: [
            { default: true, html: "Trắng", color: "#ffffff" },
            { html: "Vàng", color: "#ffea00" },
            { html: "Xanh Lá", color: "#00e054" },
            { html: "Xanh Lam", color: "#00e5ff" },
          ],
          onSelect(item: { color: string; html: string }) {
            if (player.subtitle) {
              player.subtitle.style("color", item.color);
              player.notice.show = `Màu phụ đề: ${item.html}`;
            }
            return item.html;
          },
        },
      ],
    } as unknown as ConstructorParameters<typeof Artplayer>[0]);

    playerRef.current = player;

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

    // Continuous ad skipping engine: works during normal playback, seeking, and replaying
    const checkAndSkipAd = (time: number): boolean => {
      const activeAd = detectedAdRangesRef.current.find(
        (ad) => time >= ad.start - 0.05 && time < ad.end - 0.15,
      );
      if (activeAd) {
        const target = activeAd.end + 0.15;
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

    const handlePlayerHotkeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const ignoreTags = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"];
      if (ignoreTags.includes(target.tagName) || target.isContentEditable)
        return;

      const video = player.video;
      if (!video) return;

      // Space / K — Play/Pause Toggle
      if (
        e.code === "Space" ||
        e.key === " " ||
        e.key === "Spacebar" ||
        e.key === "k" ||
        e.key === "K"
      ) {
        e.preventDefault();
        e.stopPropagation();
        player.toggle();
        return;
      }

      switch (e.key) {
        // ← / J — Tua lùi 10s (không hiện popup thông báo)
        case "ArrowLeft":
        case "j":
        case "J":
          e.preventDefault();
          player.currentTime = Math.max(0, player.currentTime - 10);
          break;

        // → / L — Tua tới 10s (không hiện popup thông báo)
        case "ArrowRight":
        case "l":
        case "L":
          e.preventDefault();
          player.currentTime = Math.min(
            player.duration,
            player.currentTime + 10,
          );
          break;

        // ↑ — Tăng âm lượng
        case "ArrowUp":
          e.preventDefault();
          player.volume = Math.min(1, player.volume + 0.1);
          player.notice.show = `🔊 ${Math.round(player.volume * 100)}%`;
          break;

        // ↓ — Giảm âm lượng
        case "ArrowDown":
          e.preventDefault();
          player.volume = Math.max(0, player.volume - 0.1);
          player.notice.show = `🔉 ${Math.round(player.volume * 100)}%`;
          break;
          e.preventDefault();
          player.volume = Math.max(0, player.volume - 0.1);
          player.notice.show = `🔉 ${Math.round(player.volume * 100)}%`;
          break;

        // M — Mute/Unmute
        case "m":
        case "M":
          e.preventDefault();
          player.muted = !player.muted;
          player.notice.show = player.muted ? "🔇 Tắt tiếng" : "🔊 Bật tiếng";
          break;

        // F — Fullscreen
        case "f":
        case "F": {
          e.preventDefault();
          const el = containerRef.current;
          if (!el) break;
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            el.requestFullscreen?.().catch(() => {});
          }
          break;
        }

        // P — Picture-in-Picture
        case "p":
        case "P":
          e.preventDefault();
          if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
            setPipActive(false);
          } else if (video.requestPictureInPicture) {
            video
              .requestPictureInPicture()
              .then(() => setPipActive(true))
              .catch(() => {});
          }
          break;

        // D — Dimming (tắt đèn)
        case "d":
        case "D":
          e.preventDefault();
          setIsDimmed((prev) => {
            player.notice.show = !prev ? "🌙 Đã tắt đèn" : "💡 Đã bật đèn";
            return !prev;
          });
          break;

        // 0-9 — Seek theo %
        default:
          if (e.key >= "0" && e.key <= "9") {
            e.preventDefault();
            const pct = parseInt(e.key) / 10;
            player.currentTime = player.duration * pct;
            player.notice.show = `⏱ ${e.key}0%`;
          }
          // , / . — Tốc độ phát
          if (e.key === ",") {
            e.preventDefault();
            const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
            const cur = rates.indexOf(player.playbackRate);
            const next = rates[Math.max(0, cur - 1)];
            player.playbackRate = next;
            player.notice.show = `🐢 ${next}x`;
          }
          if (e.key === ".") {
            e.preventDefault();
            const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
            const cur = rates.indexOf(player.playbackRate);
            const next = rates[Math.min(rates.length - 1, cur + 1)];
            player.playbackRate = next;
            player.notice.show = `🐇 ${next}x`;
          }
      }
    };

    window.addEventListener("keydown", handlePlayerHotkeys, true);

    // -- Ready callback & Ambilight canvas draw loop --
    let drawInterval: NodeJS.Timeout | null = null;

    player.on("ready", () => {
      onReadyRef.current?.(player);

      const video = player.video;
      const canvas = canvasRef.current;
      if (canvas && video) {
        const ctx = canvas.getContext("2d");
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

        player.on("video:play", startLoop);
        player.on("video:pause", stopLoop);
        player.on("destroy", stopLoop);

        if (!video.paused) {
          startLoop();
        }
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
          player.notice.show = `Tiếp tục từ ${formatTime(startTime)}`;
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
            player.notice.show = `⚡ Đã tự động bỏ qua Intro (+${Math.round(targetIntro)}s)`;
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
      window.removeEventListener("keydown", handlePlayerHotkeys, true);
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
      if (drawInterval) {
        clearInterval(drawInterval);
      }
    };
    // Recreate only when the primary/fallback transport changes. Other props use refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, fallbackUrl, type]);

  // Dynamically update the Theater Mode button UI in the player controls
  useEffect(() => {
    if (playerRef.current) {
      const btn = playerRef.current.template.$controls.querySelector(
        ".art-control-theater-mode",
      );
      if (btn) {
        btn.setAttribute(
          "data-tip",
          isTheaterMode ? "Chế độ mặc định" : "Chế độ rạp chiếu",
        );
        const svg = btn.querySelector("svg");
        if (svg) {
          if (isTheaterMode) {
            svg.style.color = "#e5a93b";
            svg.style.filter = "drop-shadow(0 0 4px rgba(229,169,59,0.5))";
          } else {
            svg.style.color = "";
            svg.style.filter = "";
          }
        }
      }
    }
  }, [isTheaterMode]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const player = playerRef.current;
    if (!player) return;

    const target = e.target as HTMLElement;
    if (
      target.closest(".art-controls") ||
      target.closest(".art-setting") ||
      target.closest(".art-contextmenu") ||
      target.closest("button")
    ) {
      return;
    }

    const now = Date.now();
    const rect =
      containerRef.current?.getBoundingClientRect() ||
      e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (now - lastTapRef.current < 300) {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      if (clickX < width * 0.45) {
        player.currentTime = Math.max(0, player.currentTime - 10);
        setDoubleTapHud("rewind");
        setTimeout(() => setDoubleTapHud(null), 800);
      } else if (clickX > width * 0.55) {
        player.currentTime = Math.min(player.duration, player.currentTime + 10);
        setDoubleTapHud("forward");
        setTimeout(() => setDoubleTapHud(null), 800);
      }
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    pressTimerRef.current = setTimeout(() => {
      previousSpeedRef.current = player.playbackRate;
      player.playbackRate = 2.0;
      setIsSpeedBoosted(true);
      player.notice.show = "⏩ Đang tua x2 (Đang giữ)";
    }, 280);
  };

  const handlePointerUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    const player = playerRef.current;
    if (isSpeedBoosted && player) {
      player.playbackRate = previousSpeedRef.current || 1.0;
      setIsSpeedBoosted(false);
      player.notice.show = "▶ Tốc độ 1x";
    }
  };

  return (
    <>
      {/* ── Dimming overlay (tắt đèn) ── */}
      {isDimmed && (
        <div
          className="fixed inset-0 bg-black/80 z-40 pointer-events-none"
          style={{ backdropFilter: "none" }}
        />
      )}

      <div
        ref={wrapperRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="absolute inset-0 h-full min-h-0 w-full select-none overflow-hidden"
      >
        {/* ── Holding 2x Speed Boost Top HUD Banner ── */}
        {isSpeedBoosted && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-black/90 border border-[#23ade5]/50 text-[#23ade5] font-extrabold text-xs px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#23ade5] animate-ping" />
            <span>⏩ Tua Nhanh 2X (Đang Giữ)</span>
          </div>
        )}

        {/* ── Double Tap Rewind HUD (-10s) ── */}
        {doubleTapHud === "rewind" && (
          <div className="absolute left-10 top-1/2 -translate-y-1/2 z-40 bg-black/85 text-white font-black text-sm px-5 py-3 rounded-full border border-white/20 backdrop-blur-md animate-in zoom-in-50 duration-200 flex items-center gap-2 shadow-2xl">
            <span>⏪</span> -10s
          </div>
        )}

        {/* ── Double Tap Fast-Forward HUD (+10s) ── */}
        {doubleTapHud === "forward" && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 z-40 bg-black/85 text-white font-black text-sm px-5 py-3 rounded-full border border-white/20 backdrop-blur-md animate-in zoom-in-50 duration-200 flex items-center gap-2 shadow-2xl">
            +10s <span>⏩</span>
          </div>
        )}

        {/* ── PiP active indicator ── */}
        {pipActive && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center text-white">
              <div className="text-4xl mb-2">📺</div>
              <p className="text-sm font-bold">Đang phát Picture-in-Picture</p>
              <button
                onClick={() => {
                  document.exitPictureInPicture().catch(() => {});
                  setPipActive(false);
                }}
                className="mt-3 px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold transition-colors"
              >
                Quay lại
              </button>
            </div>
          </div>
        )}

        {/* Dynamic ambient backglow canvas */}
        <canvas
          ref={canvasRef}
          className="absolute -inset-4 w-[calc(100%+32px)] h-[calc(100%+32px)] -z-10 opacity-70 blur-[60px] pointer-events-none scale-[1.03] transition-all duration-700 ease-out"
          style={{ mixBlendMode: "normal" }}
        />
        <div
          ref={containerRef}
          className="absolute inset-0 h-full min-h-0 w-full"
        />
      </div>
    </>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
