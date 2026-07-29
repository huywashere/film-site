"use client";
import { useState, useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";

export interface ArtPlayerProps {
  url: string;
  type?: "hls" | "mp4" | "auto";
  poster?: string;
  title?: string;
  subtitle?: string;
  autoplay?: boolean;
  progressKey?: string;
  dbProgress?: number;
  onEnded?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onReady?: (player: Artplayer) => void;
  onError?: (error: unknown) => void;
  isTheaterMode?: boolean;
  onTheaterModeToggle?: (active: boolean) => void;
  // Skip intro/outro timestamps (giây)
  skipIntroStart?: number;
  skipIntroEnd?: number;
  skipOutroStart?: number;
}

export default function ArtPlayer({
  url,
  type = "auto",
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
  skipIntroStart,
  skipIntroEnd,
  skipOutroStart,
}: ArtPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Artplayer | null>(null);

  const [isFloating, setIsFloating] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
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

  // Keep latest callbacks in ref to avoid stale closures in event handlers
  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);
  const onErrorRef = useRef(onError);
  onEndedRef.current = onEnded;
  onProgressRef.current = onProgress;
  onErrorRef.current = onError;

  // ── Scroll Observer for Floating Mini-Player ──────────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Auto-dock into Floating Mini-Player when main player scrolls out of view
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          setIsFloating(true);
        } else {
          setIsFloating(false);
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !url) return;

    const isHls =
      type === "hls" ||
      url.includes(".m3u8") ||
      (type === "auto" && url.includes(".m3u8"));

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
      theme: "#e5a93b",
      lang: "vi",

      // -- HLS support with ABR & quality selector --
      ...(isHls
        ? {
            customType: {
              m3u8: (video: HTMLMediaElement, streamUrl: string) => {
                if (Hls.isSupported()) {
                  const hls = new Hls({
                    enableWorker: true,
                    backBufferLength: 90,
                    maxBufferLength: 60,
                    capLevelToPlayerSize: true, // Auto ABR tuning
                    startLevel: -1, // Auto level selection based on bandwidth
                  });
                  hlsInstance = hls;
                  hls.loadSource(streamUrl);
                  hls.attachMedia(video);

                  hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
                    // Build quality options from HLS levels
                    const levels = data.levels ?? [];
                    if (levels.length > 1) {
                      // Apply user default quality setting if not "auto"
                      const prefQuality =
                        useSettingsStore.getState().defaultQuality;
                      if (prefQuality !== "auto") {
                        const targetIdx = levels.findIndex(
                          (l) =>
                            l.height &&
                            `${l.height}p`.toLowerCase() ===
                              prefQuality.toLowerCase(),
                        );
                        if (targetIdx !== -1) {
                          hls.currentLevel = targetIdx;
                        }
                      }
                      const built = levels.map((level, i) => ({
                        default:
                          i === hls.currentLevel ||
                          (hls.currentLevel === -1 && i === 0),
                        html: level.height
                          ? `${level.height}p`
                          : `Level ${i + 1}`,
                        url: streamUrl,
                        level: i,
                      }));
                      // Add Auto option
                      qualityLevels.unshift({
                        default: hls.currentLevel === -1,
                        html: "Tự động (ABR)",
                        url: streamUrl,
                        level: -1,
                      } as (typeof qualityLevels)[number]);
                      built.forEach((q) =>
                        qualityLevels.push(q as (typeof qualityLevels)[number]),
                      );

                      player.setting.update({
                        name: "quality",
                        html: "Chất lượng",
                        tooltip: built.find((q) => q.default)?.html ?? "Auto",
                        selector: qualityLevels.map((q) => ({
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
                          onErrorRef.current?.({
                            type: "HLS_FATAL_ERROR",
                            details: data,
                          });
                      }
                    }
                  });

                  (video as HTMLMediaElement & { hls: Hls }).hls = hls;
                } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                  video.src = streamUrl;
                }
              },
            },
          }
        : {}),

      // Hotkey settings
      hotkey: true,

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
              player.subtitle.offset = item.offset;
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

      layers: [],

      controls: [
        {
          name: "pip-btn",
          position: "right",
          html: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="cursor:pointer"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="12" y="10" width="9" height="7" rx="1" fill="currentColor" stroke="none"/></svg>`,
          tooltip: "Picture-in-Picture (P)",
          click: function () {
            const video = player.video;
            if (!video) return;
            if (document.pictureInPictureElement) {
              document.exitPictureInPicture().catch(() => {});
              setPipActive(false);
            } else if (video.requestPictureInPicture) {
              video
                .requestPictureInPicture()
                .then(() => setPipActive(true))
                .catch(() => {
                  player.notice.show = "Trình duyệt không hỗ trợ PiP";
                });
            }
          },
        },
        {
          name: "theater-mode",
          position: "right",
          html: `
            <svg class="art-icon art-icon-theater" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer; display: flex; align-items: center; justify-content: center; height: 100%;">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <line x1="7" y1="4" x2="7" y2="20"></line>
              <line x1="17" y1="4" x2="17" y2="20"></line>
            </svg>
          `,
          tooltip: isTheaterModeRef.current
            ? "Chế độ mặc định"
            : "Chế độ rạp chiếu",
          click: function () {
            onTheaterModeToggleRef.current?.(!isTheaterModeRef.current);
          },
        },
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
      const ignoreTags = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"];
      if (ignoreTags.includes(target.tagName) || target.isContentEditable)
        return;

      const video = player.video;
      if (!video) return;

      switch (e.key) {
        // Space / K — Play/Pause
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          video.paused ? video.play().catch(() => {}) : video.pause();
          player.notice.show = video.paused ? "▶ Phát" : "⏸ Tạm dừng";
          break;

        // ← / J — Tua lùi 10s
        case "ArrowLeft":
        case "j":
        case "J":
          e.preventDefault();
          player.currentTime = Math.max(0, player.currentTime - 10);
          player.notice.show = "⏪ -10 giây";
          break;

        // → / L — Tua tới 10s
        case "ArrowRight":
        case "l":
        case "L":
          e.preventDefault();
          player.currentTime = Math.min(
            player.duration,
            player.currentTime + 10,
          );
          player.notice.show = "⏩ +10 giây";
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

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    // -- Ready callback & Ambilight canvas draw loop --
    let drawInterval: NodeJS.Timeout | null = null;

    player.on("ready", () => {
      if (onReady) onReady(player);

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
      player.on("ready", () => {
        if (startTime < player.duration - 10) {
          player.currentTime = startTime;
          player.notice.show = `Tiếp tục từ ${formatTime(startTime)}`;
        }
      });
    }

    // -- Save progress + Skip Intro/Outro detection --
    let lastSave = 0;
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

        // Skip Intro detection
        if (skipIntroStart !== undefined && skipIntroEnd !== undefined) {
          setShowSkipIntro(ct >= skipIntroStart && ct < skipIntroEnd);
        }
        // Skip Outro detection (30s cuối)
        if (skipOutroStart !== undefined) {
          setShowSkipOutro(ct >= skipOutroStart);
        } else if (dur > 60) {
          setShowSkipOutro(ct >= dur - 90 && ct < dur - 5);
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
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
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
        player.notice.show = "⏪ -10 giây";
        setTimeout(() => setDoubleTapHud(null), 800);
      } else if (clickX > width * 0.55) {
        player.currentTime = Math.min(player.duration, player.currentTime + 10);
        setDoubleTapHud("forward");
        player.notice.show = "⏩ +10 giây";
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

      <style jsx global>{`
        .art-video-player {
          --art-theme: #e5a93b;
          font-family: "Inter", system-ui, sans-serif;
        }
        .art-video-player .art-control-progress-inner {
          background: #e5a93b;
        }
        .art-video-player .art-icon:hover,
        .art-video-player .art-control:hover,
        .art-video-player .art-control-theater-mode:hover {
          color: #e5a93b;
        }
        .art-video-player .art-bottom {
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.9) 0%,
            transparent 100%
          );
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
        ref={wrapperRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={cn(
          "relative w-full h-full min-h-[400px] select-none",
          isFloating
            ? "fixed bottom-6 right-6 z-50 w-80 md:w-[380px] h-[215px] min-h-0 rounded-2xl shadow-2xl border border-white/20 overflow-hidden backdrop-blur-xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-5"
            : "",
        )}
      >
        {/* ── Holding 2x Speed Boost Top HUD Banner ── */}
        {isSpeedBoosted && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-black/85 border border-amber-500/40 text-amber-400 font-extrabold text-xs px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>⏩ Tua Nhanh 2X (Đang Giữ)</span>
          </div>
        )}

        {/* ── Double Tap Rewind HUD (-10s) ── */}
        {doubleTapHud === "rewind" && (
          <div className="absolute left-10 top-1/2 -translate-y-1/2 z-40 bg-black/80 text-white font-black text-sm px-5 py-3 rounded-full border border-white/20 backdrop-blur-md animate-in zoom-in-50 duration-200 flex items-center gap-2">
            <span>⏪</span> -10s
          </div>
        )}

        {/* ── Double Tap Fast-Forward HUD (+10s) ── */}
        {doubleTapHud === "forward" && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 z-40 bg-black/80 text-white font-black text-sm px-5 py-3 rounded-full border border-white/20 backdrop-blur-md animate-in zoom-in-50 duration-200 flex items-center gap-2">
            +10s <span>⏩</span>
          </div>
        )}
        {/* Floating Mini-player Header Bar */}
        {isFloating && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md px-3 py-1.5 flex items-center justify-between text-white text-xs border-b border-white/10">
            <span className="font-bold truncate max-w-[200px]">
              {title || "Đang phát"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="hover:text-amber-400 text-neutral-300 transition-colors p-1 font-bold"
                title="Quay lại trình phát chính"
              >
                ↑
              </button>
              <button
                onClick={() => setIsFloating(false)}
                className="hover:text-red-400 text-neutral-300 transition-colors p-1 font-bold"
                title="Đóng mini player"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {/* ── Skip Intro button ── */}
        {showSkipIntro && (
          <button
            onClick={() => {
              if (playerRef.current && skipIntroEnd !== undefined) {
                playerRef.current.currentTime = skipIntroEnd;
                playerRef.current.notice.show = "⏩ Đã bỏ qua intro";
                setShowSkipIntro(false);
              }
            }}
            className="absolute bottom-16 right-4 z-30 flex items-center gap-2 bg-black/80 hover:bg-black/95 text-white border border-white/30 hover:border-white/60 px-4 py-2 rounded-xl text-xs font-bold transition-all backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M5.5 5C5.5 4.17 6.42 3.68 7.1 4.15l10.5 7c.6.4.6 1.3 0 1.7l-10.5 7C6.42 20.32 5.5 19.83 5.5 19V5z" />
              <rect x="17" y="4" width="2" height="16" rx="1" />
            </svg>
            Bỏ qua intro
          </button>
        )}

        {/* ── Skip Outro button ── */}
        {showSkipOutro && (
          <button
            onClick={() => {
              if (playerRef.current) {
                playerRef.current.currentTime = playerRef.current.duration - 2;
                setShowSkipOutro(false);
              }
            }}
            className="absolute bottom-16 right-4 z-30 flex items-center gap-2 bg-black/80 hover:bg-black/95 text-white border border-white/30 hover:border-white/60 px-4 py-2 rounded-xl text-xs font-bold transition-all backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M5.5 5C5.5 4.17 6.42 3.68 7.1 4.15l10.5 7c.6.4.6 1.3 0 1.7l-10.5 7C6.42 20.32 5.5 19.83 5.5 19V5z" />
              <rect x="17" y="4" width="2" height="16" rx="1" />
            </svg>
            Bỏ qua outro
          </button>
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
        <div ref={containerRef} className="w-full h-full" />
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
