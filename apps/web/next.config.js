const isDev = process.env.NODE_ENV === "development";
const isProd = process.env.NODE_ENV === "production";
const isBuildVerification = process.env.NEXT_BUILD_VERIFY === "1";
const configuredApiOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_API_URL
      ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
      : "";
  } catch {
    return "";
  }
})();
const apiConnectSources = [
  configuredApiOrigin,
  ...(isDev ? ["http://localhost:3001", "http://127.0.0.1:3001"] : []),
]
  .filter(Boolean)
  .join(" ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use separate directories for dev and prod builds to prevent Windows file lock collisions
  distDir: isDev ? ".next-dev" : isBuildVerification ? ".next-verify" : ".next",
  // Standalone output for Docker production builds
  output: isProd ? "standalone" : undefined,
  poweredByHeader: false,
  // Playwright uses 127.0.0.1 while the local dev server is addressed as
  // localhost. Allow the test origin so client components hydrate normally.
  allowedDevOrigins: ["127.0.0.1"],

  typescript: {
    ignoreBuildErrors: false,
  },

  // ── PERFORMANCE OPTIMIZATIONS ──────────────────────────────────
  reactStrictMode: true,
  // SWC minification is enabled by default.

  // Optimize bundle splitting
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "swiper",
      "@tanstack/react-query",
    ],
  },

  images: {
    // Poster URLs are served through the app's guarded image proxy and always
    // include a dynamic `url` query parameter.
    remotePatterns: [
      // KKPhim
      { protocol: "https", hostname: "phimimg.com" },
      { protocol: "https", hostname: "img.phimapi.com" },
      { protocol: "https", hostname: "phimapi.com" },
      { protocol: "https", hostname: "**.phimapi.com" },
      { protocol: "https", hostname: "**.kkphim.vip" },
      // OPhim CDN — thumb_url/poster_url dùng prefix này
      { protocol: "https", hostname: "img.ophim.live" },
      { protocol: "https", hostname: "**.ophim.live" },
      { protocol: "https", hostname: "ophim1.com" },
      { protocol: "https", hostname: "ophim17.cc" },
      { protocol: "https", hostname: "**.ophim.cc" },
      // VSMov
      { protocol: "https", hostname: "vsmov.com" },
      { protocol: "https", hostname: "**.vsmov.com" },
      // NguonC
      { protocol: "https", hostname: "phim.nguonc.com" },
      { protocol: "https", hostname: "**.nguonc.com" },
      // Misc
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "motphim.net" },
      { protocol: "https", hostname: "**.motphim.net" },
      // TMDB
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
    localPatterns: [
      { pathname: "/api/image-proxy", search: "?*" },
      { pathname: "/**", search: "?*" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    unoptimized: false,
  },
  // Global XSS & Security Response Headers
  async headers() {
    // FIX #2: Removed 'unsafe-eval' which allowed arbitrary JS execution.
    // 'unsafe-inline' is still present for Next.js hydration compatibility.
    // For a full nonce-based CSP, see apps/web/src/middleware.ts
    const cspValue = [
      `default-src 'self'`,
      // In dev: 'unsafe-eval' is required by React for hot-reload & callstack reconstruction.
      // In prod: removed for security (FIX #2).
      `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://apis.google.com https://www.gstatic.com https://www.google.com https://*.firebaseapp.com https://challenges.cloudflare.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `img-src 'self' data: blob: https:`,
      `font-src 'self' data: https://fonts.gstatic.com`,
      `connect-src 'self' https: wss: ${apiConnectSources} https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com`,
      `frame-src 'self' https: https://accounts.google.com https://*.firebaseapp.com https://www.google.com https://challenges.cloudflare.com`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: cspValue,
          },
        ],
      },
      {
        // FIX #7: Restrict CORS to same-origin instead of wildcard *
        // The KKPhim proxy should only be called from our own frontend
        source: "/api/kkphim/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_APP_URL || "https://cineverse.app",
          },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

