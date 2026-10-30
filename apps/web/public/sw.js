const CACHE_PREFIX = "netphim-cache-";
const CACHE_NAME = `${CACHE_PREFIX}v10`;
const OFFLINE_URL = "/offline";

// Never precache the homepage document. Serving cached HTML after a deploy can
// point at obsolete Next.js chunks and can hide newly shipped entry UI.
const ASSETS_TO_CACHE = [OFFLINE_URL, "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME,
          )
          .map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  // Disable service worker intercept during local development to prevent breaking Next.js dev assets / CSS HMR
  if (
    self.location.hostname === "localhost" ||
    self.location.hostname === "127.0.0.1" ||
    self.location.hostname.startsWith("192.168.")
  ) {
    return;
  }

  // We only cache GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Cross-origin images, APIs and CDN assets must use the browser's normal
  // network path. Intercepting them here can turn an otherwise valid response
  // into ERR_FAILED when the response is opaque or blocked from CacheStorage.
  if (url.origin !== self.location.origin) return;

  // Exclude hot-reloading dev urls, auth api calls, proxies, and media
  if (
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/api/v1/auth") ||
    url.pathname.startsWith("/api/kkphim") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/api/image-proxy") ||
    url.pathname.startsWith("/api/hls-proxy")
  ) {
    return;
  }

  // Never intercept Next.js client-side navigations (RSC flights), APIs, or prefetch requests.
  // Intercepting them here turns temporary network delays into ERR_FAILED or corrupts RSC JSON streams.
  if (
    url.searchParams.has("_rsc") ||
    event.request.headers.get("RSC") === "1" ||
    event.request.headers.get("Next-Router-State-Tree") ||
    url.pathname.startsWith("/_next/data/") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        return (await caches.match(OFFLINE_URL)) || Response.error();
      }),
    );
    return;
  }

  const isNextAsset = url.pathname.startsWith("/_next/static/");

  // Next build assets are content-hashed and already cached efficiently by
  // the browser/CDN. Let them bypass the service worker so a deployment can
  // never serve an obsolete chunk during client-side navigation.
  if (isNextAsset) return;

  // Only intercept font assets and precached offline assets. All other page navigations
  // and data fetches must bypass the Service Worker to prevent 502/504 errors on tab switches.
  if (!url.pathname.startsWith("/fonts/") && !ASSETS_TO_CACHE.includes(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        return fetch(event.request);
      })
      .then((networkResponse) => {
        if (
          networkResponse.status === 200 &&
          url.pathname.startsWith("/fonts/")
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        return (await caches.match(event.request)) || Response.error();
      }),
  );
});
