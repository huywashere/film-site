'use client';

/**
 * Headless Next Episode HLS Preloader
 *
 * Pre-caches the master/media playlist (.m3u8) and initial 2 video fragments (.ts)
 * of the upcoming episode during the final 3 minutes of current episode playback.
 * When the viewer transitions or Auto-Next fires, playback commences immediately
 * from local browser cache with zero buffering spinner.
 */

let activePreloader: any = null;
let lastPreloadedUrl = '';
let preloaderTimeout: ReturnType<typeof setTimeout> | null = null;

export function preloadNextEpisodeStream(streamUrl: string): void {
  if (typeof window === 'undefined' || !streamUrl || streamUrl === lastPreloadedUrl) {
    return;
  }

  // Clear previous preloader if still running
  clearPreloader();
  lastPreloadedUrl = streamUrl;

  // 1. Warm the manifest in standard browser HTTP cache
  try {
    fetch(streamUrl, { method: 'GET', mode: 'cors' }).catch(() => {});
  } catch {}

  // 2. Headless HLS Loader for initial media segments
  import('hls.js')
    .then(({ default: Hls }) => {
      if (!Hls.isSupported()) return;

      const preloader = new Hls({
        maxBufferLength: 6,
        maxMaxBufferLength: 10,
        startLevel: 0,
        enableWorker: true,
        testBandwidth: false,
        lowLatencyMode: false,
        manifestLoadingTimeOut: 4000,
        levelLoadingTimeOut: 4000,
        fragLoadingTimeOut: 8000,
      });

      activePreloader = preloader;

      let fragmentsLoaded = 0;
      preloader.on(Hls.Events.FRAG_LOADED, () => {
        fragmentsLoaded++;
        // Preload 2 fragments (~8-12 seconds of playback), then cleanly terminate to save bandwidth
        if (fragmentsLoaded >= 2) {
          clearPreloader();
        }
      });

      preloader.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          clearPreloader();
        }
      });

      preloader.loadSource(streamUrl);

      // Auto-cleanup after 15s max safeguard
      preloaderTimeout = setTimeout(() => {
        clearPreloader();
      }, 15000);
    })
    .catch(() => {});
}

export function clearPreloader(): void {
  if (preloaderTimeout) {
    clearTimeout(preloaderTimeout);
    preloaderTimeout = null;
  }
  if (activePreloader) {
    try {
      activePreloader.stopLoad();
      activePreloader.destroy();
    } catch {}
    activePreloader = null;
  }
}
