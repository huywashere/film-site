const isDev = process.env.NODE_ENV === "development";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use separate directories for dev and prod builds to prevent Windows file lock collisions
  distDir: isDev ? ".next-dev" : ".next",
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // ── PERFORMANCE OPTIMIZATIONS ──────────────────────────────────
  reactStrictMode: true,
  swcMinify: true,

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
    remotePatterns: [
      { protocol: "https", hostname: "phimimg.com" },
      { protocol: "https", hostname: "img.phimapi.com" },
      { protocol: "https", hostname: "phimapi.com" },
      { protocol: "https", hostname: "**.phimapi.com" },
      { protocol: "https", hostname: "**.kkphim.vip" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "motphim.net" },
      { protocol: "https", hostname: "**.motphim.net" },
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
  // Prevent Windows file sync cache lockups
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
