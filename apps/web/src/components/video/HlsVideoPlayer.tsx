"use client";

import { memo } from "react";
import ArtPlayer, { type SubtitleTrack, type PlayerServerItem } from "@/components/video/ArtPlayer";

export type { PlayerServerItem };

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
  subtitles?: SubtitleTrack[];
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
  skipIntroStart?: number;
  skipIntroEnd?: number;
  skipOutroStart?: number;
  autoSkipIntro?: boolean;
  autoSkipAds?: boolean;
  minAdStartTime?: number;
  onStallSuggestServer?: () => void;
  servers?: PlayerServerItem[];
  currentServerIndex?: number;
  onSwitchServer?: (index: number) => void;
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
  subtitles,
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
  skipIntroStart,
  skipIntroEnd,
  skipOutroStart,
  autoSkipIntro = false,
  autoSkipAds = true,
  minAdStartTime = 360,
  onStallSuggestServer,
  servers,
  currentServerIndex,
  onSwitchServer,
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
        subtitles={subtitles}
        initialTime={initialTime}
        autoplay={autoPlay}
        skipIntroStart={skipIntroStart}
        skipIntroEnd={skipIntroEnd}
        skipOutroStart={skipOutroStart}
        autoSkipIntro={autoSkipIntro}
        autoSkipAds={autoSkipAds}
        minAdStartTime={minAdStartTime}
        onStallSuggestServer={onStallSuggestServer}
        servers={servers}
        currentServerIndex={currentServerIndex}
        onSwitchServer={onSwitchServer}
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
