import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function argument(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function run(binary, args) {
  const result = spawnSync(binary, args, { stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} exited with code ${result.status}`);
}

function probeDuration(input) {
  const result = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', input],
    { encoding: 'utf8', windowsHide: true },
  );
  if (result.error) throw result.error;
  const duration = Number(result.stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('ffprobe could not determine the media duration');
  }
  return duration;
}

function timestamp(seconds) {
  const milliseconds = Math.max(0, Math.round(seconds * 1_000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1_000);
  const millis = milliseconds % 1_000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

const input = argument('input');
if (!input) {
  throw new Error('Usage: pnpm preview:sprites -- --input <video-or-hls-url> [--output <dir>]');
}

const interval = Math.max(5, Number(argument('interval', '10')) || 10);
const width = 176;
const height = 99;
const columns = 10;
const rows = 10;
const framesPerSprite = columns * rows;
function stableSource(value) {
  try {
    const parsed = new URL(value);
    const nestedSource = parsed.searchParams.get('url') || parsed.searchParams.get('source');
    if (nestedSource && /^https?:\/\//i.test(nestedSource)) return stableSource(nestedSource);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return value;
  }
}
const stableInput = stableSource(input);
const key = argument('key') || createHash('sha256').update(stableInput).digest('hex');
const outputRoot = resolve(argument('output', 'apps/web/public/scrubber-previews'));
const outputDir = resolve(outputRoot, key);
const duration = probeDuration(input);

await mkdir(outputDir, { recursive: true });

run('ffmpeg', [
  '-hide_banner',
  '-loglevel',
  'warning',
  '-y',
  '-i',
  input,
  '-an',
  '-vf',
  `fps=1/${interval},scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},tile=${columns}x${rows}:padding=0:margin=0`,
  '-fps_mode',
  'vfr',
  '-c:v',
  'libwebp',
  '-quality',
  '72',
  '-compression_level',
  '6',
  resolve(outputDir, 'sprite-%03d.webp'),
]);

const cueCount = Math.ceil(duration / interval);
const cues = ['WEBVTT', ''];
for (let index = 0; index < cueCount; index += 1) {
  const start = index * interval;
  const end = Math.min(duration, start + interval);
  const sprite = Math.floor(index / framesPerSprite) + 1;
  const cell = index % framesPerSprite;
  const x = (cell % columns) * width;
  const y = Math.floor(cell / columns) * height;
  cues.push(
    `${timestamp(start)} --> ${timestamp(end)}`,
    `sprite-${String(sprite).padStart(3, '0')}.webp#xywh=${x},${y},${width},${height}`,
    '',
  );
}

await writeFile(resolve(outputDir, 'index.vtt'), cues.join('\n'), 'utf8');
process.stdout.write(`Generated ${cueCount} cues in ${outputDir}\n`);
