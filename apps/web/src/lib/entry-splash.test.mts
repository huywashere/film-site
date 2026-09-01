import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(path: string) {
  return readFileSync(path, 'utf8');
}

test('entry splash is shown for each full document load without a stale session marker', () => {
  const layout = source('src/app/layout.tsx');
  const splash = source('src/components/layout/LogoSplashIntro.tsx');

  assert.match(layout, /dataset\.netphimIntro=\"show\"/);
  assert.doesNotMatch(layout, /sessionStorage/);
  assert.match(splash, /const WALL_TILE_COUNT = 18/);
});

test('service worker never serves stale cached HTML after a deployment', () => {
  const worker = source('public/sw.js');
  const config = source('next.config.js');

  assert.doesNotMatch(worker, /ASSETS_TO_CACHE\s*=\s*\[[^\]]*["']\/["']/);
  assert.match(worker, /event\.request\.mode === \"navigate\"/);
  assert.match(worker, /fetch\(event\.request\)\.catch/);
  assert.match(config, /source: \"\/sw\.js\"/);
  assert.match(config, /no-cache, no-store, must-revalidate/);
  assert.match(
    source('src/components/layout/RegisterSW.tsx'),
    /controllerchange/,
  );
});
