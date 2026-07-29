const isDev = process.env.NODE_ENV === "development";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use separate directories for dev and prod builds to prevent Windows file lock collisions
  distDir: isDev ? ".next-dev" : ".next",
  poweredByHeader: false,

  // eslint is no longer configured here in Next.js 16 — use eslint.config.js instead
  typescript: {
    ignoreBuildErrors: true,
  },

  // ── PERFORMANCE OPTIMIZATIONS ──────────────────────────────────
  reactStrictMode: true,
  // swcMinify removed — enabled by default in Next.js 16

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

  // Turbopack config (required in Next.js 16 when not using webpack)
  // Empty object silences the "webpack config with no turbopack config" error
  turbopack: {},

  images: {
    // Poster URLs are served through the app's guarded image proxy and always
    // include a dynamic `url` query parameter.
    localPatterns: [{ pathname: "/api/image-proxy" }],
    remotePatterns: [
      { protocol: "https", hostname: "phimimg.com" },
      { protocol: "https", hostname: "img.phimapi.com" },
      { protocol: "https", hostname: "phimapi.com" },
      { protocol: "https", hostname: "**.phimapi.com" },
      { protocol: "https", hostname: "**.kkphim.vip" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "motphim.net" },
      { protocol: "https", hostname: "**.motphim.net" },
      // TMDB
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    unoptimized: false,
  },
  // Global XSS & Security Response Headers
  async headers() {
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
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.google.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss: https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com; frame-src 'self' https: https://accounts.google.com https://*.firebaseapp.com https://www.google.com; object-src 'none';`,
          },
        ],
      },
      {
        source: "/api/kkphim/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

module.exports = nextConfig;
