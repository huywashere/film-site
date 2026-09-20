import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  configuredScrubberVttUrl,
  findScrubberSpriteCue,
  parseScrubberVtt,
  stableScrubberSource,
} from '../components/video/scrubber-sprite.ts';

test('builds a stable CDN key without rotating source query parameters', async () => {
  process.env.NEXT_PUBLIC_SCRUBBER_PREVIEW_BASE_URL = 'https://preview.flexphim.test/';
  const stableSource = 'https://media.flexphim.test/movie/master.m3u8';
  const key = createHash('sha256').update(stableSource).digest('hex');

  assert.equal(
    await configuredScrubberVttUrl(`${stableSource}?token=rotating&expires=123`),
    `https://preview.flexphim.test/${key}/index.vtt`,
  );
  delete process.env.NEXT_PUBLIC_SCRUBBER_PREVIEW_BASE_URL;
});

test('derives preview identity from the upstream URL inside the HLS relay', () => {
  assert.equal(
    stableScrubberSource(
      '/api/hls-proxy?url=https%3A%2F%2Fmedia.flexphim.test%2Fmovie-a%2Fmaster.m3u8%3Ftoken%3Drotating',
    ),
    'https://media.flexphim.test/movie-a/master.m3u8',
  );
});

test('parses relative WebVTT sprite cues and xywh fragments', () => {
  const cues = parseScrubberVtt(
    `WEBVTT\n\n00:00.000 --> 00:10.000\nsprite-001.webp#xywh=176,99,176,99\n\n00:10.000 --> 00:20.000\nsprite-001.webp#xywh=352,99,176,99`,
    'https://cdn.flexphim.test/previews/movie/index.vtt',
  );

  assert.equal(cues.length, 2);
  assert.equal(cues[0].imageUrl, 'https://cdn.flexphim.test/previews/movie/sprite-001.webp');
  assert.deepEqual(
    { x: cues[0].x, y: cues[0].y, width: cues[0].width, height: cues[0].height },
    { x: 176, y: 99, width: 176, height: 99 },
  );
  assert.equal(findScrubberSpriteCue(cues, 12)?.x, 352);
  assert.equal(findScrubberSpriteCue(cues, 20), null);
});

test('ignores malformed cues without breaking valid entries', () => {
  const cues = parseScrubberVtt(
    `WEBVTT\n\ninvalid\nmissing.webp\n\n00:20.000 --> 00:30.000\nsprite.webp`,
    'https://cdn.flexphim.test/index.vtt',
  );

  assert.equal(cues.length, 1);
  assert.equal(cues[0].width, 176);
  assert.equal(cues[0].height, 99);
});
