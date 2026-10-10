import type Artplayer from 'artplayer';
import {
  ARTPLAYER_SEEK_BACKWARD_10_SVG,
  ARTPLAYER_SEEK_FORWARD_10_SVG,
} from './artplayer-editor-assets';

export interface MobileCenterControlsOptions {
  player: Artplayer;
  triggerSeekRipple?: (isLeft: boolean) => void;
}

const PLAY_CENTER_ICON_SVG = `
<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style="margin-left: 2px;" xmlns="http://www.w3.org/2000/svg">
  <path d="M7 4.5C7 3.65 7.95 3.14 8.66 3.61L20.2 11.11C20.87 11.55 20.87 12.45 20.2 12.89L8.66 20.39C7.95 20.86 7 20.35 7 19.5V4.5Z" />
</svg>
`;

const PAUSE_CENTER_ICON_SVG = `
<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="4" width="4" height="16" rx="2" />
  <rect x="14" y="4" width="4" height="16" rx="2" />
</svg>
`;

export function setupMobileCenterControls({
  player,
  triggerSeekRipple,
}: MobileCenterControlsOptions): () => void {
  const container = (player as any).template?.$player || (player as any).container;
  if (!container) return () => {};

  const controls = document.createElement('div');
  controls.className = 'netphim-mobile-center-controls';
  controls.setAttribute('aria-label', 'Điều khiển nhanh di động');
  controls.innerHTML = `
    <button type="button" class="netphim-mobile-center-btn is-seek is-backward" aria-label="Tua lại 10 giây">
      <span class="netphim-center-icon" aria-hidden="true">${ARTPLAYER_SEEK_BACKWARD_10_SVG}</span>
    </button>
    <button type="button" class="netphim-mobile-center-btn is-play-pause" aria-label="Phát hoặc Tạm dừng">
      <span class="netphim-center-icon is-play" aria-hidden="true">${PLAY_CENTER_ICON_SVG}</span>
      <span class="netphim-center-icon is-pause" aria-hidden="true">${PAUSE_CENTER_ICON_SVG}</span>
    </button>
    <button type="button" class="netphim-mobile-center-btn is-seek is-forward" aria-label="Tua tới 10 giây">
      <span class="netphim-center-icon" aria-hidden="true">${ARTPLAYER_SEEK_FORWARD_10_SVG}</span>
    </button>
  `;

  container.appendChild(controls);

  const playPauseBtn = controls.querySelector<HTMLButtonElement>('.is-play-pause');
  const backwardBtn = controls.querySelector<HTMLButtonElement>('.is-backward');
  const forwardBtn = controls.querySelector<HTMLButtonElement>('.is-forward');
  const playIcon = controls.querySelector<HTMLElement>('.is-play');
  const pauseIcon = controls.querySelector<HTMLElement>('.is-pause');

  let autoHideTimer: ReturnType<typeof setTimeout> | null = null;

  const clearAutoHide = () => {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      autoHideTimer = null;
    }
  };

  const scheduleAutoHide = (delayMs = 3000) => {
    clearAutoHide();
    if (player.playing) {
      autoHideTimer = setTimeout(() => {
        if (player.playing) {
          hideControls();
          if ((player as any).control) {
            (player as any).control.show = false;
          }
        }
      }, delayMs);
    }
  };

  const updatePlayState = (isPlayingState?: boolean) => {
    const isPlaying = typeof isPlayingState === 'boolean' ? isPlayingState : Boolean(player.playing);
    if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'inline-flex';
    if (pauseIcon) pauseIcon.style.display = isPlaying ? 'inline-flex' : 'none';
    const label = isPlaying ? 'Tạm dừng' : 'Phát';
    playPauseBtn?.setAttribute('aria-label', label);
    playPauseBtn?.setAttribute('title', label);
  };

  const showControls = () => {
    controls.classList.add('is-visible');
    if (player.playing) {
      scheduleAutoHide(3000);
    } else {
      clearAutoHide();
    }
  };

  const hideControls = () => {
    if (player.playing) {
      controls.classList.remove('is-visible');
    }
  };

  const onPlayPause = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    if (player.playing) {
      player.pause();
      updatePlayState(false);
      clearAutoHide();
      showControls();
    } else {
      player.play();
      updatePlayState(true);
      scheduleAutoHide(2500);
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
  };

  const seekByTenSeconds = (backward: boolean, event: Event) => {
    event.stopPropagation();
    event.preventDefault();
    if (triggerSeekRipple) {
      triggerSeekRipple(backward);
    } else {
      const nextTime = player.currentTime + (backward ? -10 : 10);
      player.seek = Math.min(Math.max(0, nextTime), player.duration || Infinity);
    }
    scheduleAutoHide(3000);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  const onBackward = (event: Event) => seekByTenSeconds(true, event);
  const onForward = (event: Event) => seekByTenSeconds(false, event);

  // Fast-touch listener: eliminates 300ms mobile touch delay and prevents duplicate clicks
  const bindFastTap = (btn: HTMLElement | null, handler: (e: Event) => void): (() => void) => {
    if (!btn) return () => {};
    let lastTapTimestamp = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.isPrimary === false || (e.button !== undefined && e.button !== 0)) return;
      lastTapTimestamp = Date.now();
      e.stopPropagation();
      e.preventDefault();
      handler(e);
    };

    const onClick = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (Date.now() - lastTapTimestamp < 450) {
        return;
      }
      handler(e);
    };

    btn.addEventListener('pointerdown', onPointerDown as EventListener, { passive: false });
    btn.addEventListener('click', onClick as EventListener);

    return () => {
      btn.removeEventListener('pointerdown', onPointerDown as EventListener);
      btn.removeEventListener('click', onClick as EventListener);
    };
  };

  const unbindPlayPause = bindFastTap(playPauseBtn, onPlayPause);
  const unbindBackward = bindFastTap(backwardBtn, onBackward);
  const unbindForward = bindFastTap(forwardBtn, onForward);

  // Sync state with ArtPlayer events
  const onPlay = () => {
    updatePlayState(true);
    scheduleAutoHide(2500);
  };

  const onPause = () => {
    updatePlayState(false);
    clearAutoHide();
    showControls();
  };

  const onControl = (visible: boolean) => {
    if (visible || !player.playing) {
      showControls();
    } else {
      hideControls();
    }
  };

  const onHover = (hovering: boolean) => {
    if (hovering || !player.playing) {
      showControls();
    } else {
      hideControls();
    }
  };

  player.on('video:play', onPlay);
  player.on('video:pause', onPause);
  player.on('control', onControl);
  player.on('hover', onHover);

  // Expose showControls on player instance for direct trigger by touch handler
  (player as any).showMobileCenterControls = showControls;
  (player as any).hideMobileCenterControls = hideControls;

  // Initialize
  updatePlayState();
  if (!player.playing) {
    showControls();
  }

  return () => {
    clearAutoHide();
    unbindPlayPause();
    unbindBackward();
    unbindForward();

    (player as any).showMobileCenterControls = null;
    (player as any).hideMobileCenterControls = null;

    player.off('video:play', onPlay);
    player.off('video:pause', onPause);
    player.off('control', onControl);
    player.off('hover', onHover);

    if (controls.parentNode) {
      controls.parentNode.removeChild(controls);
    }
  };
}
