import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(path: string) {
  return readFileSync(path, 'utf8');
}

test('root layout renders content without a blocking poster splash', () => {
  const layout = source('src/app/layout.tsx');
  const styles = source('src/app/globals.css');

  assert.doesNotMatch(layout, /LogoSplashIntro|netphimIntro|intro-poster/);
  assert.doesNotMatch(styles, /netphim-intro|intro-poster/);
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
