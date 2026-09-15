import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';

function source(path: string) {
  return readFileSync(path, 'utf8');
}

test('root layout renders a bounded splash without remote poster artwork', () => {
  const layout = source('src/app/layout.tsx');
  const splash = source('src/components/layout/LogoSplashIntro.tsx');

  assert.match(layout, /LogoSplashIntro/);
  assert.match(splash, /MAX_VISIBLE_MS = 1500/);
  assert.match(splash, /flexphim-logo\.svg/);
  assert.match(splash, /poster-grid-mobile\.webp/);
  assert.match(splash, /poster-grid-desktop\.webp/);
  assert.doesNotMatch(splash, /image\.tmdb\.org|wsrv\.nl|intro-poster|backgroundImage/);
  assert.doesNotMatch(splash, /blur-\[2px\]|netphim-splash-shell--leaving/);

  assert.ok(statSync('public/images/splash/poster-grid-mobile.webp').size < 400 * 1024);
  assert.ok(statSync('public/images/splash/poster-grid-desktop.webp').size < 500 * 1024);
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

test('FlexPhim branding is consistent while legacy client keys stay compatible', () => {
  const layout = source('src/app/layout.tsx');
  const navbar = source('src/components/layout/Navbar.tsx');
  const footer = source('src/components/layout/Footer.tsx');
  const splash = source('src/components/layout/LogoSplashIntro.tsx');
  const auth = source('src/components/auth/AuthModal.tsx');
  const manifest = JSON.parse(source('public/manifest.json'));

  for (const brandedSource of [layout, navbar, footer, splash, auth]) {
    assert.match(brandedSource, /FlexPhim/);
    assert.doesNotMatch(brandedSource, /NetPhim/);
    assert.doesNotMatch(brandedSource, /Net\s*<span[^>]*>Phim/);
    assert.doesNotMatch(brandedSource, /cinephim-logo/);
  }

  assert.equal(manifest.name, 'FlexPhim — Xem Phim Online');
  assert.equal(manifest.short_name, 'FlexPhim');
  assert.ok(manifest.icons.some((icon: { src?: string }) => icon.src === '/flexphim-logo.png'));
  assert.ok(statSync('public/flexphim-logo.svg').size > 0);
  assert.ok(statSync('public/flexphim-logo.png').size > 0);

  // These persisted names intentionally remain stable so an upgrade does not
  // sign users out or discard their local preferences.
  assert.match(source('src/store/authStore.ts'), /netphim-auth/);
  assert.match(source('src/store/settingsStore.ts'), /netphim_user_settings/);
  assert.match(source('src/app/api/hls-proxy/route.ts'), /X-NetPhim-Ad-Filtered/);
});
