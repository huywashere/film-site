/**
 * Dual Subtitle & Encryption Engine (Song Ngữ)
 * Supports HUBPHIM_ENC (RC4) decoding, WebVTT/SRT cue parsing,
 * and high-precision time-slice alignment for simultaneous dual subtitle rendering.
 */

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export const HUBPHIM_DEFAULT_KEY = 'hubphim_sub_secret_key_2026';
export const HUBPHIM_ENC_PREFIX = 'HUBPHIM_ENC:';

/**
 * Decrypts RC4-encrypted subtitle or video payload if HUBPHIM_ENC: prefix is present.
 * If text is plain WebVTT or SRT, returns as-is.
 */
export function decryptSubtitle(
  content: string,
  secretKey: string = HUBPHIM_DEFAULT_KEY
): string {
  if (!content || typeof content !== 'string') return '';
  const trimmed = content.trim();
  if (!trimmed.startsWith(HUBPHIM_ENC_PREFIX)) {
    return content;
  }

  const hexCipher = trimmed.slice(HUBPHIM_ENC_PREFIX.length);
  let cipherText = '';
  for (let i = 0; i < hexCipher.length; i += 4) {
    const code = parseInt(hexCipher.slice(i, i + 4), 16);
    if (!Number.isNaN(code)) {
      cipherText += String.fromCharCode(code);
    }
  }

  // RC4 Key Scheduling Algorithm (KSA)
  const sBox: number[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    sBox[i] = i;
  }

  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + sBox[i] + secretKey.charCodeAt(i % secretKey.length)) % 256;
    const temp = sBox[i];
    sBox[i] = sBox[j];
    sBox[j] = temp;
  }

  // RC4 Pseudo-Random Generation Algorithm (PRGA)
  let i = 0;
  j = 0;
  let plainText = '';
  for (let k = 0; k < cipherText.length; k++) {
    i = (i + 1) % 256;
    j = (j + sBox[i]) % 256;
    const temp = sBox[i];
    sBox[i] = sBox[j];
    sBox[j] = temp;
    const rand = sBox[(sBox[i] + sBox[j]) % 256];
    plainText += String.fromCharCode(cipherText.charCodeAt(k) ^ rand);
  }

  return plainText;
}

/**
 * Parses timestamp string (HH:MM:SS.mmm or MM:SS.mmm) into seconds.
 */
export function parseTimestamp(timeStr: string): number {
  if (!timeStr) return 0;
  const normalized = timeStr.trim().replace(',', '.');
  const parts = normalized.split(':');
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseFloat(parts[0]) || 0;
    minutes = parseFloat(parts[1]) || 0;
    seconds = parseFloat(parts[2]) || 0;
  } else if (parts.length === 2) {
    minutes = parseFloat(parts[0]) || 0;
    seconds = parseFloat(parts[1]) || 0;
  } else if (parts.length === 1) {
    seconds = parseFloat(parts[0]) || 0;
  }

  return Math.max(0, hours * 3600 + minutes * 60 + seconds);
}

/**
 * Formats seconds into WebVTT timestamp format (HH:MM:SS.mmm).
 */
export function formatTimestamp(seconds: number): string {
  const safeSec = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalSeconds = Math.floor(safeSec);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ms = Math.min(999, Math.round((safeSec - totalSeconds) * 1000));

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Cleans unwanted HTML voice/color tags while preserving valid dialogue formatting.
 */
export function cleanCueText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/<v[^>]*>/gi, '')
    .replace(/<\/v>/gi, '')
    .replace(/<c[^>]*>/gi, '')
    .replace(/<\/c>/gi, '')
    .trim();
}

/**
 * Parses WebVTT or SRT content into an array of SubtitleCue objects.
 */
export function parseSubtitleCues(content: string): SubtitleCue[] {
  if (!content || typeof content !== 'string') return [];
  const lines = content.split(/\r?\n/);
  const cues: SubtitleCue[] = [];
  let current: Partial<SubtitleCue> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('-->')) {
      const parts = line.split('-->');
      const startStr = parts[0]?.trim();
      const endPart = parts[1]?.trim() || '';
      // WebVTT lines can have positioning properties like "00:01:00.000 line:0% align:middle"
      const endStr = endPart.split(/\s+/)[0];

      current.start = parseTimestamp(startStr);
      current.end = parseTimestamp(endStr);
      current.text = '';
    } else if (line && current.start !== undefined && current.end !== undefined) {
      // Skip pure numeric cue identifiers
      if (/^\d+$/.test(line) && !current.text) {
        continue;
      }
      current.text = current.text ? `${current.text}\n${line}` : line;
    } else if (!line && current.start !== undefined && current.end !== undefined) {
      if (current.text && current.end > current.start) {
        cues.push({
          start: current.start,
          end: current.end,
          text: cleanCueText(current.text),
        });
      }
      current = {};
    }
  }

  // Push final cue if file doesn't end with blank line
  if (
    current.start !== undefined &&
    current.end !== undefined &&
    current.text &&
    current.end > current.start
  ) {
    cues.push({
      start: current.start,
      end: current.end,
      text: cleanCueText(current.text),
    });
  }

  return cues;
}

/**
 * Merges two subtitle tracks (e.g. Primary Vietnamese + Secondary English)
 * into a single unified dual-subtitle track with synchronized time-slice intervals.
 */
export function mergeDualSubtitleCues(
  primaryCues: SubtitleCue[],
  secondaryCues: SubtitleCue[]
): SubtitleCue[] {
  if (!primaryCues.length && !secondaryCues.length) return [];
  if (!secondaryCues.length) return primaryCues;
  if (!primaryCues.length) return secondaryCues;

  // Collect all critical boundary timestamps
  const timestamps = new Set<number>();
  for (const cue of primaryCues) {
    timestamps.add(cue.start);
    timestamps.add(cue.end);
  }
  for (const cue of secondaryCues) {
    timestamps.add(cue.start);
    timestamps.add(cue.end);
  }

  const sortedPoints = Array.from(timestamps).sort((a, b) => a - b);
  const rawMerged: SubtitleCue[] = [];

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const tStart = sortedPoints[i];
    const tEnd = sortedPoints[i + 1];

    // Ignore microscopic slices under 50ms
    if (tEnd - tStart < 0.05) continue;

    const pri = primaryCues.find((c) => c.start <= tStart && c.end >= tEnd);
    const sec = secondaryCues.find((c) => c.start <= tStart && c.end >= tEnd);

    if (!pri && !sec) continue;

    const lines: string[] = [];
    if (sec?.text) {
      lines.push(`<span class="sub-sec">${sec.text}</span>`);
    }
    if (pri?.text) {
      lines.push(`<span class="sub-pri">${pri.text}</span>`);
    }

    if (lines.length > 0) {
      rawMerged.push({
        start: tStart,
        end: tEnd,
        text: lines.join('\n'),
      });
    }
  }

  // Smooth and concatenate adjacent cues with identical text
  const smoothed: SubtitleCue[] = [];
  for (const cue of rawMerged) {
    const last = smoothed[smoothed.length - 1];
    if (last && last.text === cue.text && Math.abs(last.end - cue.start) < 0.08) {
      last.end = cue.end;
    } else {
      smoothed.push({ ...cue });
    }
  }

  return smoothed;
}

/**
 * Converts an array of SubtitleCue into standard WebVTT text.
 */
export function buildWebVttString(cues: SubtitleCue[]): string {
  const lines: string[] = ['WEBVTT\n'];
  cues.forEach((cue, index) => {
    lines.push(
      `${index + 1}\n${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}\n${cue.text}\n`
    );
  });
  return lines.join('\n');
}

/**
 * Creates a Blob URL for WebVTT cues that can be directly passed to ArtPlayer or HTML5 <track>.
 */
export function createVttBlobUrl(vttContent: string): {
  url: string;
  revoke: () => void;
} {
  const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
}
