import type Artplayer from 'artplayer';
import {
  ARTPLAYER_SEEK_BACKWARD_10_SVG,
  ARTPLAYER_SEEK_FORWARD_10_SVG,
} from './artplayer-editor-assets';

export interface MobileCenterControlsOptions {
  player: Artplayer;
  triggerSeekRipple?: (isLeft: boolean) => void;
}

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
      <span class="netphim-center-icon is-play" aria-hidden="true"></span>
      <span class="netphim-center-icon is-pause" aria-hidden="true"><i></i><i></i></span>
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

  const updatePlayState = () => {
    const isPlaying = player.playing;
    if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'inline-flex';
    if (pauseIcon) pauseIcon.style.display = isPlaying ? 'inline-flex' : 'none';
    playPauseBtn?.setAttribute('aria-label', isPlaying ? 'Tạm dừng' : 'Phát');
  };

  const showControls = () => {
    controls.classList.add('is-visible');
  };

  const hideControls = () => {
    if (player.playing) {
      controls.classList.remove('is-visible');
    }
  };

  const onPlayPause = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    player.toggle();
    updatePlayState();
    if (navigator.vibrate) navigator.vibrate(12);
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
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const onBackward = (event: Event) => seekByTenSeconds(true, event);
  const onForward = (event: Event) => seekByTenSeconds(false, event);

  playPauseBtn?.addEventListener('click', onPlayPause);
  backwardBtn?.addEventListener('click', onBackward);
  forwardBtn?.addEventListener('click', onForward);

  // Sync state with ArtPlayer events
  const onPlay = () => {
    updatePlayState();
  };

  const onPause = () => {
    updatePlayState();
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

  // Initialize
  updatePlayState();
  if (!player.playing) {
    showControls();
  }

  return () => {
    playPauseBtn?.removeEventListener('click', onPlayPause);
    backwardBtn?.removeEventListener('click', onBackward);
    forwardBtn?.removeEventListener('click', onForward);

    player.off('video:play', onPlay);
    player.off('video:pause', onPause);
    player.off('control', onControl);
    player.off('hover', onHover);

    if (controls.parentNode) {
      controls.parentNode.removeChild(controls);
    }
  };
}
