const CACHE_NAME = "netphim-cache-v8";
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
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
  self.clients.claim();
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

  // Exclude hot-reloading dev urls and auth api calls
  if (
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/api/v1/auth") ||
    url.pathname.startsWith("/api/kkphim")
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
  event.respondWith(
    (isNextAsset ? fetch(event.request) : caches.match(event.request))
      .then((response) => {
        if (response) return response;
        return fetch(event.request);
      })
      .then((networkResponse) => {
        if (
          networkResponse.status === 200 &&
          (isNextAsset || url.pathname.startsWith("/fonts/"))
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
