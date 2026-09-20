export interface ScrubberSpriteCue {
  start: number;
  end: number;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_WIDTH = 176;
const DEFAULT_HEIGHT = 99;

function parseTimestamp(value: string): number | null {
  const parts = value.trim().replace(',', '.').split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

export function parseScrubberVtt(source: string, manifestUrl: string): ScrubberSpriteCue[] {
  const cues: ScrubberSpriteCue[] = [];
  const blocks = source.replace(/^\uFEFF/, '').split(/\r?\n\s*\r?\n/);

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0 || !lines[timingIndex + 1]) continue;

    const [rawStart, rawEndWithSettings] = lines[timingIndex].split('-->');
    const rawEnd = rawEndWithSettings?.trim().split(/\s+/)[0];
    const start = parseTimestamp(rawStart);
    const end = rawEnd ? parseTimestamp(rawEnd) : null;
    if (start === null || end === null || end <= start) continue;

    const rawImage = lines[timingIndex + 1];
    const fragmentMatch = rawImage.match(/#xywh=(\d+),(\d+),(\d+),(\d+)$/i);
    const imagePath = fragmentMatch ? rawImage.slice(0, fragmentMatch.index) : rawImage;

    try {
      cues.push({
        start,
        end,
        imageUrl: new URL(imagePath, manifestUrl).toString(),
        x: fragmentMatch ? Number(fragmentMatch[1]) : 0,
        y: fragmentMatch ? Number(fragmentMatch[2]) : 0,
        width: fragmentMatch ? Number(fragmentMatch[3]) : DEFAULT_WIDTH,
        height: fragmentMatch ? Number(fragmentMatch[4]) : DEFAULT_HEIGHT,
      });
    } catch {
      // Ignore malformed or unsupported sprite URLs.
    }
  }

  return cues.sort((left, right) => left.start - right.start);
}

export function findScrubberSpriteCue(
  cues: ScrubberSpriteCue[],
  seconds: number,
): ScrubberSpriteCue | null {
  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const middle = (low + high) >>> 1;
    const cue = cues[middle];
    if (seconds < cue.start) high = middle - 1;
    else if (seconds >= cue.end) low = middle + 1;
    else return cue;
  }

  return null;
}

export async function configuredScrubberVttUrl(streamUrl: string): Promise<string | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SCRUBBER_PREVIEW_BASE_URL?.trim();
  if (!baseUrl || !streamUrl || !globalThis.crypto?.subtle) return null;

  let stableStreamUrl = streamUrl;
  try {
    const parsed = new URL(streamUrl);
    parsed.search = '';
    parsed.hash = '';
    stableStreamUrl = parsed.toString();
  } catch {
    // Hash the raw provider value when it is not an absolute URL.
  }

  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(stableStreamUrl),
  );
  const key = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${baseUrl.replace(/\/$/, '')}/${key}/index.vtt`;
}
