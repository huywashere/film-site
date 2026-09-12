"use client";

import { memo } from "react";
import ArtPlayer from "@/components/video/ArtPlayer";

export type HlsPlaybackError = {
  type: string;
  details?: unknown;
  message?: string;
};

type HlsVideoPlayerProps = {
  src: string;
  proxySrc?: string;
  poster?: string;
  title?: string;
  subtitle?: string;
  initialTime?: number;
  autoPlay?: boolean;
  onReady?: (player: any) => void;
  onPlaying?: () => void;
  onBuffering?: (durationMs: number) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError: (error: HlsPlaybackError) => void;
  isTheaterMode?: boolean;
  onTheaterModeToggle?: (active: boolean) => void;
  autoSkipIntro?: boolean;
  autoSkipAds?: boolean;
  minAdStartTime?: number;
};

/**
 * Modern ArtPlayer HLS Surface
 * Renders feature-rich ArtPlayer for M3U8 streams with full playback controls,
 * speed toggles, quality selection, and HLS error recovery.
 */
export const HlsVideoPlayer = memo(function HlsVideoPlayer({
  src,
  proxySrc,
  poster,
  title,
  subtitle,
  initialTime = 0,
  autoPlay = false,
  onReady,
  onPlaying,
  onBuffering,
  onProgress,
  onEnded,
  onError,
  isTheaterMode = false,
  onTheaterModeToggle,
  autoSkipIntro = true,
  autoSkipAds = true,
  minAdStartTime = 360,
}: HlsVideoPlayerProps) {
  return (
    <div className="w-full h-full relative">
      <ArtPlayer
        url={src}
        fallbackUrl={proxySrc}
        type="hls"
        poster={poster}
        title={title}
        subtitle={subtitle}
        initialTime={initialTime}
        autoplay={autoPlay}
        autoSkipIntro={autoSkipIntro}
        autoSkipAds={autoSkipAds}
        minAdStartTime={minAdStartTime}
        isTheaterMode={isTheaterMode}
        onTheaterModeToggle={onTheaterModeToggle}
        onReady={(player) => {
          onReady?.(player);
        }}
        onPlaybackStart={(player) => {
          onPlaying?.();
        }}
        onBuffering={onBuffering}
        onProgress={onProgress}
        onEnded={onEnded}
        onError={(err) => {
          onError({
            type: typeof err === "string" ? err : "hls_playback_error",
            details: err,
          });
        }}
      />
    </div>
  );
});
