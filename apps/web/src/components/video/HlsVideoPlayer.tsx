"use client";

import ArtPlayer from "@/components/video/ArtPlayer";

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

/**
 * Modern ArtPlayer HLS Surface
 * Renders feature-rich ArtPlayer for M3U8 streams with full playback controls,
 * speed toggles, quality selection, and HLS error recovery.
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
  return (
    <div className="w-full h-full relative">
      <ArtPlayer
        url={src}
        type="hls"
        poster={poster}
        initialTime={initialTime}
        autoplay={autoPlay}
        onReady={() => {
          onReady?.();
        }}
        onPlaybackStart={() => {
          onPlaying?.();
        }}
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
}
