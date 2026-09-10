import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(path: string) {
  return readFileSync(path, 'utf8');
}

test('root layout renders a bounded splash without remote poster artwork', () => {
  const layout = source('src/app/layout.tsx');
  const splash = source('src/components/layout/LogoSplashIntro.tsx');

  assert.match(layout, /LogoSplashIntro/);
  assert.match(splash, /MAX_VISIBLE_MS = 1500/);
  assert.match(splash, /cinephim-logo\.svg/);
  assert.doesNotMatch(splash, /image\.tmdb\.org|wsrv\.nl|intro-poster|backgroundImage/);
});

test('service worker never serves stale cached HTML after a deployment', () => {
  const worker = source('public/sw.js');
  const config = source('next.config.js');

  assert.doesNotMatch(worker, /ASSETS_TO_CACHE\s*=\s*\[[^\]]*["']\/["']/);
  assert.match(worker, /event\.request\.mode === "navigate"/);
  assert.match(worker, /fetch\(event\.request\)\.catch/);
  assert.match(config, /source: "\/sw\.js"/);
  assert.match(config, /no-cache, no-store, must-revalidate/);
  assert.match(
    source('src/components/layout/RegisterSW.tsx'),
    /controllerchange/,
  );
});
