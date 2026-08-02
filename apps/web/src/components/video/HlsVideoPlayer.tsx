"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

export type HlsPlaybackError = {
  type: string;
  details?: unknown;
  message?: string;
};

type HlsVideoPlayerProps = {
  src: string;
  poster?: string;
  initialTime?: number;
  autoPlay?: boolean;
  onReady?: () => void;
  onPlaying?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError: (error: HlsPlaybackError) => void;
};

const READY_TIMEOUT_MS = 12_000;

/**
 * Small, native HLS surface used before the provider iframe fallback.
 *
 * It intentionally owns no player UI framework: browser media events give us
 * reliable manifest/segment/CORS failures and a readable currentTime so an
 * automatic source switch can retain the current episode and progress.
 */
export function HlsVideoPlayer({
  src,
  poster,
  initialTime = 0,
  autoPlay = false,
  onReady,
  onPlaying,
  onProgress,
  onEnded,
  onError,
}: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const initialTimeRef = useRef(initialTime);
  const callbacksRef = useRef({ onReady, onPlaying, onProgress, onEnded, onError });
  callbacksRef.current = { onReady, onPlaying, onProgress, onEnded, onError };

  useEffect(() => {
    initialTimeRef.current = initialTime;
  }, [initialTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls | null = null;
    let ready = false;
    let failed = false;
    let networkRecoveries = 0;
    let mediaRecoveries = 0;

    const fail = (error: HlsPlaybackError) => {
      if (failed) return;
      failed = true;
      window.clearTimeout(readyTimer);
      callbacksRef.current.onError(error);
    };

    const markReady = () => {
      if (ready || failed) return;
      ready = true;
      window.clearTimeout(readyTimer);
      callbacksRef.current.onReady?.();
    };

    const restorePosition = () => {
      const target = initialTimeRef.current;
      if (!Number.isFinite(target) || target <= 0) return;
      // Some streams expose a seekable range only after metadata is ready.
      try {
        video.currentTime = target;
      } catch {
        // A live/non-seekable stream simply starts at its available position.
      }
    };

    const handleNativeError = () => {
      const code = video.error?.code;
      fail({ type: code === 4 ? "media" : "unknown", message: String(code || "video-error") });
    };
    const handleTimeUpdate = () =>
      callbacksRef.current.onProgress?.(video.currentTime, video.duration);
    const handlePlaying = () => callbacksRef.current.onPlaying?.();
    const handleEnded = () => callbacksRef.current.onEnded?.();

    video.addEventListener("loadedmetadata", restorePosition);
    video.addEventListener("canplay", markReady);
    video.addEventListener("error", handleNativeError);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("ended", handleEnded);

    const readyTimer = window.setTimeout(
      () => fail({ type: "timeout", message: "HLS readiness timeout" }),
      READY_TIMEOUT_MS,
    );

    const proxiedSrc = `/api/hls-proxy?url=${encodeURIComponent(src)}`;
    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        backBufferLength: 90,
        maxBufferLength: 45,
        capLevelToPlayerSize: true,
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveries < 1) {
          networkRecoveries += 1;
          hls?.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 1) {
          mediaRecoveries += 1;
          hls?.recoverMediaError();
          return;
        }
        fail({ type: data.type || "unknown", details: data, message: data.details });
      });
      hls.loadSource(proxiedSrc);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = proxiedSrc;
    } else {
      fail({ type: "media", message: "HLS is not supported by this browser" });
    }

    return () => {
      window.clearTimeout(readyTimer);
      video.removeEventListener("loadedmetadata", restorePosition);
      video.removeEventListener("canplay", markReady);
      video.removeEventListener("error", handleNativeError);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("ended", handleEnded);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="h-full w-full bg-black object-contain"
      controls
      playsInline
      autoPlay={autoPlay}
      poster={poster}
      preload="metadata"
    />
  );
}
