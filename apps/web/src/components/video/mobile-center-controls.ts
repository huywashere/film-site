import type Artplayer from 'artplayer';

export interface MobileCenterControlsOptions {
  player: Artplayer;
  triggerSeekRipple?: (isLeft: boolean) => void;
}

export function setupMobileCenterControls({
  player,
}: MobileCenterControlsOptions): () => void {
  const container = (player as any).template?.$player || (player as any).container;
  if (!container) return () => {};

  const controls = document.createElement('div');
  controls.className = 'netphim-mobile-center-controls';
  controls.setAttribute('aria-label', 'Điều khiển nhanh di động');
  controls.innerHTML = `
    <button type="button" class="netphim-mobile-center-btn is-play-pause" aria-label="Phát hoặc Tạm dừng">
      <span class="netphim-center-icon is-play">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><polygon points="7 4 20 12 7 20 7 4"/></svg>
      </span>
      <span class="netphim-center-icon is-pause" style="display:none;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
      </span>
    </button>
  `;

  container.appendChild(controls);

  const playPauseBtn = controls.querySelector<HTMLButtonElement>('.is-play-pause');
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

  playPauseBtn?.addEventListener('click', onPlayPause);

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

  player.on('play', onPlay);
  player.on('pause', onPause);
  player.on('control', onControl);
  player.on('hover', onHover);

  // Initialize
  updatePlayState();
  if (!player.playing) {
    showControls();
  }

  return () => {
    playPauseBtn?.removeEventListener('click', onPlayPause);

    player.off('play', onPlay);
    player.off('pause', onPause);
    player.off('control', onControl);
    player.off('hover', onHover);

    if (controls.parentNode) {
      controls.parentNode.removeChild(controls);
    }
  };
}
