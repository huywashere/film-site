'use client';

/**
 * Web Audio API Night Mode & Dialogue Booster Pipeline
 *
 * Boosts speech clarity (2.5 kHz presence band), tames explosive rumbles (< 180 Hz),
 * and compresses wide dynamic range so quiet dialogue stays clearly audible while
 * sudden explosions/gunfire are capped at safe, comfortable levels for late-night viewing.
 */

const STORAGE_KEY = 'netphim_night_mode';

interface AudioEffectState {
  audioCtx: AudioContext;
  sourceNode: MediaElementAudioSourceNode;
  speechFilter: BiquadFilterNode;
  bassFilter: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  connected: boolean;
}

const videoAudioMap = new WeakMap<HTMLVideoElement, AudioEffectState>();
let activeAudioState: AudioEffectState | null = null;

export function isNightModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function attachNightModeAudio(video: HTMLVideoElement): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = videoAudioMap.get(video);
    if (existing) {
      activeAudioState = existing;
      applyNightModeState(existing, isNightModeEnabled());
      return;
    }

    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();

    // Avoid multiple createMediaElementSource calls on same video
    const sourceNode = audioCtx.createMediaElementSource(video);

    // 1. Dialogue presence boost (2.5 kHz peaking filter)
    const speechFilter = audioCtx.createBiquadFilter();
    speechFilter.type = 'peaking';
    speechFilter.frequency.value = 2500;
    speechFilter.Q.value = 1.2;

    // 2. Bass explosion tamer (< 180 Hz lowshelf)
    const bassFilter = audioCtx.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 180;

    // 3. Dynamic Range Compressor (smooths loud peaks while keeping whispers audible)
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.knee.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // Connect audio graph
    sourceNode.connect(speechFilter);
    speechFilter.connect(bassFilter);
    bassFilter.connect(compressor);
    compressor.connect(audioCtx.destination);

    const state: AudioEffectState = {
      audioCtx,
      sourceNode,
      speechFilter,
      bassFilter,
      compressor,
      connected: true,
    };

    videoAudioMap.set(video, state);
    activeAudioState = state;

    // Apply initial preference
    applyNightModeState(state, isNightModeEnabled());

    // Auto-resume AudioContext on playback to comply with browser autoplay policies
    const resumeOnPlay = () => {
      if (audioCtx.state === 'suspended') {
        void audioCtx.resume().catch(() => {});
      }
    };
    video.addEventListener('play', resumeOnPlay);
    video.addEventListener('playing', resumeOnPlay);
  } catch (err) {
    // Cross-origin restriction or browser security fallback
    console.warn('[AudioEffects] Web Audio pipeline initialization skipped:', err);
  }
}

function applyNightModeState(state: AudioEffectState, enabled: boolean): void {
  const { audioCtx, speechFilter, bassFilter, compressor } = state;
  const now = audioCtx.currentTime;

  if (enabled) {
    // Boost dialogue by +6 dB
    speechFilter.gain.setTargetAtTime(6.0, now, 0.05);
    // Tame sub-bass explosions by -5 dB
    bassFilter.gain.setTargetAtTime(-5.0, now, 0.05);
    // Active compression: cap high-amplitude peaks at -24 dB
    compressor.threshold.setTargetAtTime(-24, now, 0.05);
    compressor.ratio.setTargetAtTime(8, now, 0.05);
  } else {
    // Neutral pass-through
    speechFilter.gain.setTargetAtTime(0, now, 0.05);
    bassFilter.gain.setTargetAtTime(0, now, 0.05);
    compressor.threshold.setTargetAtTime(0, now, 0.05);
    compressor.ratio.setTargetAtTime(1, now, 0.05);
  }
}

export function setNightMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {}

  if (activeAudioState) {
    applyNightModeState(activeAudioState, enabled);
  }

  window.dispatchEvent(
    new CustomEvent('netphim_night_mode_changed', {
      detail: { enabled },
    }),
  );
}
