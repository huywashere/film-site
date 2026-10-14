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

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@netphim/shared-types"],
  // Use separate directories for dev and prod builds to prevent Windows file lock collisions
  distDir: isDev ? ".next-dev" : isBuildVerification ? ".next-verify" : ".next",
  // Standalone output for Docker production builds
  output: isProd ? "standalone" : undefined,
  poweredByHeader: false,
  // Playwright uses 127.0.0.1 while the local dev server is addressed as
  // localhost. Allow the test origin so client components hydrate normally.
  allowedDevOrigins: ["127.0.0.1"],

  // Allow more time for slow VPS CPU during static page generation
  staticPageGenerationTimeout: 180,

  typescript: {
    ignoreBuildErrors: false,
  },

  // ── SECURITY & PRODUCTION BUNDLE PROTECTION ─────────────────────
  // Disable browser source maps in production so original .tsx/.ts source code cannot be reconstructed
  productionBrowserSourceMaps: false,
  
  // SWC Compiler optimization: strip console logs in production builds
  compiler: {
    removeConsole: isProd ? { exclude: ["error", "warn"] } : false,
  },

  // ── PERFORMANCE OPTIMIZATIONS ──────────────────────────────────
  reactStrictMode: true,
  compress: true,
  httpAgentOptions: {
    keepAlive: true,
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "swiper",
      "@tanstack/react-query",
      "zustand",
      "clsx",
      "tailwind-merge",
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
      // Misc & Social Avatars
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "**.fbsbx.com" },
      { protocol: "https", hostname: "secure.gravatar.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "motphim.net" },
      { protocol: "https", hostname: "**.motphim.net" },
      // TMDB
      { protocol: "https", hostname: "image.tmdb.org" },
      // Global CDN Image Proxy (Cloudflare Edge)
      { protocol: "https", hostname: "wsrv.nl" },
      { protocol: "https", hostname: "**.wsrv.nl" },
      // Vietnamese news/media CDNs (ex-cdn.com)
      { protocol: "https", hostname: "**.ex-cdn.com" },
      { protocol: "https", hostname: "ex-cdn.com" },
    ],
    localPatterns: [
      { pathname: "/api/image-proxy" },
      // Curated first-party artwork (auth backgrounds, hero assets, logos).
      { pathname: "/images/**" },
      { pathname: "/avatars/**" },
      { pathname: "/artplayer/**" },
      { pathname: "/brand/**" },
      { pathname: "/*.png" },
      { pathname: "/*.jpg" },
      { pathname: "/flexphim-logo.png" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85, 90],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: false,
  },
  // Global XSS & Security Response Headers
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
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
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
      {
        source: "/api/kkphim/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_APP_URL || "https://netphim.app",
          },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
