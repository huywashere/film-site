/**
 * YouTube-style precise scrubber preview for ArtPlayer.
 * Features:
 * 1. Video frame preview card positioned right above the progress bar.
 * 2. "Kéo lên để tua chính xác" header text with vertical drag detection.
 * 3. Exact timestamp badge and subtitle cue preview (e.g. [âm nhạc]).
 * 4. High-performance multi-tier frame caching (real-time sampling + nearest-frame projection + offscreen seeker).
 */
import type Artplayer from 'artplayer';
import Hls from 'hls.js';
import {
  configuredScrubberVttUrl,
  findScrubberSpriteCue,
  parseScrubberVtt,
  type ScrubberSpriteCue,
} from './scrubber-sprite';

export interface ScrubberPreviewOptions {
  player: Artplayer;
  streamUrl: string;
  isHls: boolean;
  subtitleUrl?: string;
  thumbnailVttUrl?: string;
}

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

const spriteImageCache = new Map<string, Promise<HTMLImageElement>>();
const MAX_SPRITE_IMAGES = 24;

function loadSpriteImage(url: string): Promise<HTMLImageElement> {
  const cached = spriteImageCache.get(url);
  if (cached) {
    spriteImageCache.delete(url);
    spriteImageCache.set(url, cached);
    return cached;
  }

  const request = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Scrubber sprite failed to load'));
    image.src = url;
  }).catch((error) => {
    spriteImageCache.delete(url);
    throw error;
  });

  spriteImageCache.set(url, request);
  while (spriteImageCache.size > MAX_SPRITE_IMAGES) {
    const oldest = spriteImageCache.keys().next().value;
    if (!oldest) break;
    spriteImageCache.delete(oldest);
  }
  return request;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${mins}:${pad(secs)}`;
}

export function setupScrubberPreview({
  player,
  streamUrl,
  isHls,
  subtitleUrl,
  thumbnailVttUrl,
}: ScrubberPreviewOptions): () => void {
  const container = (player as any).template?.$player || (player as any).container;
  const progressEl = (player as any).template?.$progress;
  if (!container || !progressEl) return () => {};

  // ── Build Preview Card DOM ──
  const previewCard = document.createElement('div');
  previewCard.className = 'netphim-scrubber-preview';
  previewCard.setAttribute('aria-hidden', 'true');
  previewCard.innerHTML = `
    <div class="netphim-scrubber-box">
      <canvas class="netphim-scrubber-canvas" width="176" height="99"></canvas>
      <video class="netphim-scrubber-video" muted playsinline></video>
      <div class="netphim-scrubber-placeholder">
        <div class="netphim-scrubber-shimmer"></div>
      </div>
    </div>
    <div class="netphim-scrubber-meta">
      <span class="netphim-scrubber-time">0:00</span>
      <span class="netphim-scrubber-sub" style="display:none;"></span>
    </div>
    <div class="netphim-scrubber-notch"></div>
  `;

  container.appendChild(previewCard);

  const canvas = previewCard.querySelector<HTMLCanvasElement>('.netphim-scrubber-canvas')!;
  const seekerVideo = previewCard.querySelector<HTMLVideoElement>('.netphim-scrubber-video')!;
  const placeholder = previewCard.querySelector<HTMLElement>('.netphim-scrubber-placeholder')!;
  const timeBadge = previewCard.querySelector<HTMLElement>('.netphim-scrubber-time')!;
  const subBadge = previewCard.querySelector<HTMLElement>('.netphim-scrubber-sub')!;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  let destroyed = false;
  let spriteCues: ScrubberSpriteCue[] = [];
  let spriteRenderId = 0;
  const failedSpriteImages = new Set<string>();

  // ── Multi-Tier In-Memory Frame Cache ──
  const frameCache = new Map<number, ImageBitmap | string>();
  const MAX_CACHE_SIZE = 240;

  const saveFrame = (seconds: number, source: CanvasImageSource) => {
    const key = Math.floor(seconds / 2);
    if (frameCache.has(key)) return;
    try {
      if (typeof createImageBitmap === 'function') {
        createImageBitmap(source, { resizeWidth: 176, resizeHeight: 99 }).then((bmp) => {
          if (frameCache.size > MAX_CACHE_SIZE) {
            const firstKey = frameCache.keys().next().value;
            if (firstKey !== undefined) {
              const old = frameCache.get(firstKey);
              if (old && typeof (old as any).close === 'function') (old as any).close();
              frameCache.delete(firstKey);
            }
          }
          frameCache.set(key, bmp);
        }).catch(() => {});
      }
    } catch {
      // safe fallback
    }
  };

  let lastRenderedFrame: ImageBitmap | string | null = null;

  const getClosestFrame = (seconds: number): ImageBitmap | string | null => {
    const key = Math.floor(seconds / 2);
    if (frameCache.has(key)) return frameCache.get(key)!;

    let closestKey: number | null = null;
    let minDiff = 25; // 50s window for instant visual continuity
    for (const cachedKey of frameCache.keys()) {
      const diff = Math.abs(cachedKey - key);
      if (diff < minDiff) {
        minDiff = diff;
        closestKey = cachedKey;
      }
    }
    return closestKey !== null ? frameCache.get(closestKey)! : null;
  };

  // ── High-efficiency sampling from active playback (0ms cost) ──
  let lastSampleTime = -1;
  const onMainTimeUpdate = () => {
    const mainVideo = player.video;
    if (!mainVideo || mainVideo.paused || mainVideo.readyState < 2) return;
    if (Math.abs(mainVideo.currentTime - lastSampleTime) >= 1.8) {
      lastSampleTime = mainVideo.currentTime;
      saveFrame(mainVideo.currentTime, mainVideo);
    }
  };
  player.on('video:timeupdate', onMainTimeUpdate);

  // ── Offscreen Seeker Video for Unbuffered Timestamps ──
  let seekerHls: Hls | null = null;
  let canUseCanvas = true;
  let seekerInitialized = false;

  const setupSeeker = (force = false) => {
    if (!streamUrl || seekerInitialized || (!force && spriteCues.length > 0)) return;
    seekerInitialized = true;
    seekerVideo.crossOrigin = 'anonymous';
    seekerVideo.preload = 'auto';

    if (isHls && Hls.isSupported()) {
      seekerHls = new Hls({
        enableWorker: true,
        startLevel: 0, // Lock to lowest resolution level (360p) for fastest segment fetch
        capLevelToPlayerSize: true,
        maxBufferLength: 2,
        maxMaxBufferLength: 4,
        backBufferLength: 0,
        lowLatencyMode: false,
      });
      seekerHls.autoLevelCapping = 0;
      seekerHls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (seekerHls) {
          seekerHls.currentLevel = 0;
          seekerHls.loadLevel = 0;
        }
      });
      seekerHls.loadSource(streamUrl);
      seekerHls.attachMedia(seekerVideo);
    } else {
      seekerVideo.src = streamUrl;
    }
  };

  const configuredSpriteSource = Boolean(
    thumbnailVttUrl || process.env.NEXT_PUBLIC_SCRUBBER_PREVIEW_BASE_URL,
  );
  if (!configuredSpriteSource) setupSeeker();

  const renderFrameOnCanvas = (source: CanvasImageSource) => {
    if (!ctx) return;
    try {
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      canvas.style.display = 'block';
      seekerVideo.style.display = 'none';
      placeholder.style.display = 'none';
    } catch {
      // CORS tainted canvas fallback: show native video tag directly
      canUseCanvas = false;
      canvas.style.display = 'none';
      seekerVideo.style.display = 'block';
      placeholder.style.display = 'none';
    }
  };

  const renderSpriteFrame = (targetTime: number): boolean => {
    const cue = findScrubberSpriteCue(spriteCues, targetTime);
    if (!cue || !ctx || failedSpriteImages.has(cue.imageUrl)) return false;

    const requestId = ++spriteRenderId;
    void loadSpriteImage(cue.imageUrl)
      .then((image) => {
        if (destroyed || requestId !== spriteRenderId) return;
        ctx.drawImage(
          image,
          cue.x,
          cue.y,
          cue.width,
          cue.height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        canvas.style.display = 'block';
        seekerVideo.style.display = 'none';
        placeholder.style.display = 'none';
      })
      .catch(() => {
        failedSpriteImages.add(cue.imageUrl);
        if (!destroyed) setupSeeker(true);
      });
    return true;
  };

  void (async () => {
    const manifestUrl = thumbnailVttUrl || (await configuredScrubberVttUrl(streamUrl));
    if (!manifestUrl || destroyed) {
      if (configuredSpriteSource) setupSeeker();
      return;
    }

    try {
      const response = await fetch(manifestUrl, {
        cache: 'force-cache',
        credentials: 'omit',
      });
      if (!response.ok) throw new Error(`Scrubber VTT returned ${response.status}`);
      spriteCues = parseScrubberVtt(await response.text(), response.url || manifestUrl);
      if (spriteCues.length === 0) throw new Error('Scrubber VTT has no valid cues');

      const uniqueImages = [...new Set(spriteCues.map((cue) => cue.imageUrl))];
      const currentCue = findScrubberSpriteCue(spriteCues, player.currentTime || 0);
      if (currentCue) void loadSpriteImage(currentCue.imageUrl).catch(() => {});

      const connection = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }).connection;
      const canWarmAll =
        !connection?.saveData &&
        connection?.effectiveType !== 'slow-2g' &&
        connection?.effectiveType !== '2g';
      if (canWarmAll) {
        const warm = () => {
          for (const imageUrl of uniqueImages.slice(0, MAX_SPRITE_IMAGES)) {
            void loadSpriteImage(imageUrl).catch(() => {});
          }
        };
        const idleCallback = window.requestIdleCallback;
        if (typeof idleCallback === 'function') {
          idleCallback(warm, { timeout: 2_500 });
        } else {
          globalThis.setTimeout(warm, 1_000);
        }
      }
    } catch {
      spriteCues = [];
      setupSeeker();
    }
  })();

  const performSeek = (targetTime: number) => {
    if (typeof (seekerVideo as any).fastSeek === 'function') {
      try {
        (seekerVideo as any).fastSeek(targetTime);
        return;
      } catch {
        // fallback
      }
    }
    seekerVideo.currentTime = targetTime;
  };

  let pendingSeekTime: number | null = null;
  let isSeeking = false;
  let seekDebounceTimer: any = null;
  let seekWatchdogTimer: any = null;

  const requestSeekerFrame = (targetTime: number) => {
    if (!seekerInitialized) return;
    pendingSeekTime = targetTime;
    if (seekDebounceTimer) clearTimeout(seekDebounceTimer);

    // Rapid 25ms trigger for near-instant responsiveness
    seekDebounceTimer = setTimeout(() => {
      if (isSeeking || pendingSeekTime === null) return;
      if (Math.abs(seekerVideo.currentTime - pendingSeekTime) < 0.5) return;

      isSeeking = true;
      try {
        performSeek(pendingSeekTime);
        // Watchdog unlock if network stalls
        clearTimeout(seekWatchdogTimer);
        seekWatchdogTimer = setTimeout(() => {
          isSeeking = false;
          if (pendingSeekTime !== null && Math.abs(seekerVideo.currentTime - pendingSeekTime) > 0.8) {
            requestSeekerFrame(pendingSeekTime);
          }
        }, 280);
      } catch {
        isSeeking = false;
      }
    }, 25);
  };

  const onSeekerSeeked = () => {
    isSeeking = false;
    clearTimeout(seekWatchdogTimer);
    if (seekerVideo.readyState >= 2) {
      if (canUseCanvas) {
        renderFrameOnCanvas(seekerVideo);
      }
      saveFrame(seekerVideo.currentTime, seekerVideo);
    }
    if (pendingSeekTime !== null && Math.abs(seekerVideo.currentTime - pendingSeekTime) > 0.8) {
      const next = pendingSeekTime;
      pendingSeekTime = null;
      requestSeekerFrame(next);
    }
  };

  seekerVideo.addEventListener('seeked', onSeekerSeeked);

  // ── Subtitle Cues Parser ──
  const subtitleCues: SubtitleCue[] = [];
  if (subtitleUrl) {
    fetch(subtitleUrl)
      .then((res) => (res.ok ? res.text() : ''))
      .then((vtt) => {
        if (!vtt) return;
        const blocks = vtt.split(/\r?\n\r?\n/);
        for (const block of blocks) {
          const match = block.match(/(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})/);
          if (!match) continue;
          const parseSecs = (str: string) => {
            const parts = str.split(':').map(Number);
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            return parts[0] * 60 + parts[1];
          };
          const rawMatch = match[0].split('-->');
          const start = parseSecs(rawMatch[0].trim());
          const end = parseSecs(rawMatch[1].trim());
          const lines = block.split(/\r?\n/).slice(match.index ? 1 : 1).join(' ');
          const cleanText = lines.replace(/<[^>]+>/g, '').trim();
          if (cleanText) {
            subtitleCues.push({ start, end, text: cleanText });
          }
        }
      })
      .catch(() => {});
  }

  const findActiveSubtitle = (time: number): string | null => {
    const cue = subtitleCues.find((c) => time >= c.start && time <= c.end);
    if (!cue) return null;
    return cue.text.length > 32 ? `${cue.text.slice(0, 30)}...` : cue.text;
  };

  // ── Scrubber Visibility, Position & YouTube "Kéo lên để tua chính xác" ──
  let isDragging = false;
  let isFineScrubbing = false;
  let dragStartY = 0;
  let dragStartHoverTime = 0;
  let currentTargetTime = 0;

  const showPreview = () => {
    previewCard.classList.add('is-visible');
  };

  const hidePreview = () => {
    if (isDragging) return;
    previewCard.classList.remove('is-visible', 'is-fine-scrubbing');
    isFineScrubbing = false;
  };

  const updatePreview = (clientX: number, clientY: number, forceTime?: number) => {
    const duration = player.duration || 0;
    if (!Number.isFinite(duration) || duration <= 0) return;

    const rect = progressEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    let targetTime = 0;
    let visualX = clientX;

    if (isFineScrubbing && typeof forceTime === 'number') {
      targetTime = Math.max(0, Math.min(duration, forceTime));
      const pct = targetTime / duration;
      visualX = rect.left + pct * rect.width;
    } else {
      const clampedX = Math.max(rect.left, Math.min(rect.right, clientX));
      const percentage = (clampedX - rect.left) / rect.width;
      targetTime = percentage * duration;
      visualX = clampedX;
    }

    currentTargetTime = targetTime;

    // Detect vertical pull up for fine-scrubbing precision
    const verticalDelta = clientY - rect.top;
    const shouldBeFine = isDragging && verticalDelta < -24;

    if (shouldBeFine !== isFineScrubbing) {
      isFineScrubbing = shouldBeFine;
      if (isFineScrubbing) {
        previewCard.classList.add('is-fine-scrubbing');
        if (navigator.vibrate) navigator.vibrate(10);
      } else {
        previewCard.classList.remove('is-fine-scrubbing');
      }
    }

    // Clamp preview horizontal position inside container
    const previewWidth = 192;
    const halfWidth = previewWidth / 2;
    const relativeX = visualX - containerRect.left;
    const clampedCenter = Math.max(halfWidth + 8, Math.min(containerRect.width - halfWidth - 8, relativeX));

    previewCard.style.left = `${clampedCenter}px`;

    // Update timestamp
    timeBadge.textContent = formatTime(targetTime);

    // Update subtitle preview
    const subText = findActiveSubtitle(targetTime);
    if (subText) {
      subBadge.textContent = subText;
      subBadge.style.display = 'inline-block';
    } else {
      subBadge.style.display = 'none';
    }

    // Tier 0: pre-generated WebVTT sprite. It does not seek or decode the HLS
    // stream, so cached frames paint within the same interaction frame.
    const renderedFromSprite = renderSpriteFrame(targetTime);

    // Tier 1: Check instant in-memory frame cache
    const cached = renderedFromSprite ? null : getClosestFrame(targetTime);
    if (cached) {
      lastRenderedFrame = cached;
      if (typeof cached === 'string') {
        const img = new Image();
        img.src = cached;
        img.onload = () => renderFrameOnCanvas(img);
      } else {
        renderFrameOnCanvas(cached);
      }
    } else if (player.video && player.video.readyState >= 2 && Math.abs(player.video.currentTime - targetTime) < 8) {
      // Tier 2: Use current main video frame if within 8s
      renderFrameOnCanvas(player.video);
    } else if (lastRenderedFrame) {
      // Tier 3: Visually retain previous frame during travel for 0ms visual gap
      if (typeof lastRenderedFrame === 'string') {
        const img = new Image();
        img.src = lastRenderedFrame;
        img.onload = () => renderFrameOnCanvas(img);
      } else {
        renderFrameOnCanvas(lastRenderedFrame);
      }
    } else {
      // Tier 4: Show shimmer placeholder only on cold start
      if (placeholder.style.display !== 'block' && canvas.style.display === 'none') {
        placeholder.style.display = 'block';
      }
    }

    // Request offscreen seeker frame
    if (!renderedFromSprite) requestSeekerFrame(targetTime);
  };

  // ── Event Handlers ──
  const onMouseMove = (e: MouseEvent) => {
    showPreview();
    updatePreview(e.clientX, e.clientY);
  };

  const onMouseLeave = () => {
    hidePreview();
  };

  const onMouseDown = (e: MouseEvent) => {
    isDragging = true;
    dragStartY = e.clientY;
    dragStartHoverTime = currentTargetTime;
    showPreview();
    updatePreview(e.clientX, e.clientY);

    const onWindowMouseMove = (we: MouseEvent) => {
      let finalTargetTime = currentTargetTime;
      if (isFineScrubbing) {
        // Fine scrubbing sensitivity: 0.35x horizontal travel
        const deltaX = we.clientX - e.clientX;
        const fineSecondsDelta = (deltaX / 100) * 12;
        finalTargetTime = Math.max(0, Math.min(player.duration || 0, dragStartHoverTime + fineSecondsDelta));
      }
      updatePreview(we.clientX, we.clientY, isFineScrubbing ? finalTargetTime : undefined);
    };

    const onWindowMouseUp = () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      isDragging = false;
      if (isFineScrubbing) {
        player.seek = currentTargetTime;
      }
      hidePreview();
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
  };

  // Touch handlers for mobile / tablets
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    isDragging = true;
    dragStartY = touch.clientY;
    dragStartHoverTime = currentTargetTime;
    showPreview();
    updatePreview(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    let finalTargetTime = currentTargetTime;
    if (isFineScrubbing) {
      const deltaX = touch.clientX - e.touches[0].clientX;
      const fineSecondsDelta = (deltaX / 100) * 12;
      finalTargetTime = Math.max(0, Math.min(player.duration || 0, dragStartHoverTime + fineSecondsDelta));
    }
    updatePreview(touch.clientX, touch.clientY, isFineScrubbing ? finalTargetTime : undefined);
  };

  const onTouchEnd = () => {
    isDragging = false;
    if (isFineScrubbing) {
      player.seek = currentTargetTime;
    }
    hidePreview();
  };

  progressEl.addEventListener('mousemove', onMouseMove);
  progressEl.addEventListener('mouseleave', onMouseLeave);
  progressEl.addEventListener('mousedown', onMouseDown);
  progressEl.addEventListener('touchstart', onTouchStart, { passive: true });
  progressEl.addEventListener('touchmove', onTouchMove, { passive: true });
  progressEl.addEventListener('touchend', onTouchEnd);

  // ── Teardown / Cleanup ──
  return () => {
    destroyed = true;
    spriteRenderId += 1;
    player.off('video:timeupdate', onMainTimeUpdate);
    if (seekDebounceTimer) clearTimeout(seekDebounceTimer);
    if (seekWatchdogTimer) clearTimeout(seekWatchdogTimer);

    progressEl.removeEventListener('mousemove', onMouseMove);
    progressEl.removeEventListener('mouseleave', onMouseLeave);
    progressEl.removeEventListener('mousedown', onMouseDown);
    progressEl.removeEventListener('touchstart', onTouchStart);
    progressEl.removeEventListener('touchmove', onTouchMove);
    progressEl.removeEventListener('touchend', onTouchEnd);

    seekerVideo.removeEventListener('seeked', onSeekerSeeked);
    if (seekerHls) {
      seekerHls.destroy();
      seekerHls = null;
    }
    seekerVideo.src = '';

    for (const item of frameCache.values()) {
      if (item && typeof (item as any).close === 'function') {
        (item as any).close();
      }
    }
    frameCache.clear();

    if (previewCard.parentNode) {
      previewCard.parentNode.removeChild(previewCard);
    }
  };
}
