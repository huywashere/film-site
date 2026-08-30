const CACHE_NAME = "netphim-cache-v5";
const OFFLINE_URL = "/offline";

const ASSETS_TO_CACHE = ["/", "/offline", "/manifest.json"];

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

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch new version in background (Stale-While-Revalidate) for same-origin pages
        if (
          !url.pathname.includes("/_next/static/") &&
          url.origin === self.location.origin
        ) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                caches
                  .open(CACHE_NAME)
                  .then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {
              /* Ignore network errors */
            });
        }
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Cache static JS/CSS assets
          if (
            networkResponse.status === 200 &&
            (url.pathname.includes("/_next/static/") ||
              url.pathname.includes("/fonts/"))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and navigating to a page, serve the offline page
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return Promise.reject("Offline");
        });
    }),
  );
});
