import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(path: string) {
  return readFileSync(path, 'utf8');
}

test('production image configuration does not allow arbitrary remote hosts', () => {
  const config = source('next.config.js');
  assert.doesNotMatch(config, /hostname:\s*["']\*\*["']/);
  assert.doesNotMatch(config, /protocol:\s*["']http["']/);
  assert.doesNotMatch(config, /pathname:\s*["']\/\*\*["']/);
});

test('CSP does not allow arbitrary frame, media or connection origins', () => {
  const proxy = source('src/proxy.ts');
  assert.doesNotMatch(proxy, /frame-src[^\n]*\shttps:\s/);
  assert.doesNotMatch(proxy, /frame-src[^\n]*\shttp:\s/);
  assert.doesNotMatch(proxy, /connect-src[^\n]*\shttps:\s/);
  assert.doesNotMatch(proxy, /media-src[^\n]*\shttps:\s/);
});

test('server metadata routes contain no committed provider-key fallback', () => {
  for (const path of [
    'src/app/api/omdb/route.ts',
    'src/app/api/tmdb/[...path]/route.ts',
    'src/app/api/trailer/resolve/route.ts',
  ]) {
    const route = source(path);
    assert.doesNotMatch(
      route,
      /process\.env\.(?:OMDB_API_KEY|TMDB_API_KEY|TMDB_ACCESS_TOKEN)[^\n]*(?:\?\?|\|\|)\s*["'][^"']+["']/,
    );
  }
});

test('third-party watch iframe is sandboxed and sends strict origin referrer', () => {
  const watchPage = source('src/app/watch/[slug]/WatchPageClient.tsx');
  assert.match(watchPage, /allow-scripts allow-same-origin/);
  assert.doesNotMatch(watchPage, /allow-popups|allow-top-navigation|allow-downloads/);
  assert.match(watchPage, /referrerPolicy="strict-origin-when-cross-origin"/);
});

test('custom advertisement HTML uses DOMPurify before rendering', () => {
  const banner = source('src/components/ads/AdBanner.tsx');
  assert.match(banner, /DOMPurify\.sanitize/);
  assert.match(banner, /dangerouslySetInnerHTML=\{\{ __html: sanitizedHtml \}\}/);
});

test('learning demo API is unavailable in production', () => {
  const route = source('src/app/api/learning-demo/[...path]/route.ts');
  assert.match(route, /process\.env\.NODE_ENV === ["']production["']/);
  assert.match(route, /status:\s*404/);
});

test('authentication remains server-authoritative and refreshes through a first-party proxy', () => {
  const api = source('src/lib/api.ts');
  const session = source('src/lib/auth-session.ts');
  const bridge = source('src/components/auth/AuthSessionBridge.tsx');
  const proxy = source('src/app/api/v1/[...path]/route.ts');
  const controller = source('../api/src/auth/auth.controller.ts');

  assert.match(api, /NODE_ENV === 'production' \? '\/api\/v1'/);
  assert.match(api, /refreshInFlight/);
  assert.doesNotMatch(api, /\(\?:me\|login\|register/);
  assert.doesNotMatch(session, /fallbackUser|browser-only app login/);
  assert.match(session, /Never expose a browser-only authenticated state/);
  assert.match(bridge, /useAuthStore\.getState\(\)\.user/);
  assert.match(proxy, /firstPartyCookie/);
  assert.match(proxy, /getSetCookie/);
  assert.match(controller, /NODE_ENV === "production" \? "none" : "lax"/);
});
