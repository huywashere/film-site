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
      // Heavy packages — tree-shake aggressively
      "firebase",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "axios",
      "lucide",
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
      // Xink / VodPhim / OnflixCDN
      { protocol: "https", hostname: "**.onflixcdn.com" },
      { protocol: "https", hostname: "onflixcdn.com" },
      { protocol: "https", hostname: "**.xink.pro" },
      { protocol: "https", hostname: "xink.pro" },
      { protocol: "https", hostname: "**.vodphim.com" },
      { protocol: "https", hostname: "vodphim.com" },
      // ViCDN
      { protocol: "https", hostname: "vicdn.cc" },
      { protocol: "https", hostname: "**.vicdn.cc" },
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
      // Cloudflare R2 CDN
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "pub-47e070c7a48e4c1091d1f838e4270a38.r2.dev" },
    ],
    localPatterns: [
      { pathname: "/api/image-proxy" },
      // Curated first-party artwork (auth backgrounds, hero assets, logos).
      { pathname: "/images/**" },
      { pathname: "/avatars/**" },
      { pathname: "/artplayer/**" },
      { pathname: "/brand/**" },
      { pathname: "/img-backtop/**" },
      { pathname: "/img-cut/**" },
      { pathname: "/Folder-Background/**" },
      { pathname: "/mascots/**" },
      { pathname: "/og-img/**" },
      { pathname: "/*.png" },
      { pathname: "/*.jpg" },
      { pathname: "/*.webp" },
      { pathname: "/*.svg" },
      { pathname: "/*.ico" },
      { pathname: "/flexphim-logo.png" },
      { pathname: "/flexphim-logo.svg" },
    ],
    // WebP only: AVIF encoding is CPU-intensive on VPS (5-10x slower than WebP).
    // Browser support for WebP is 97%+ globally — sufficient without AVIF overhead.
    formats: ["image/webp"],
    qualities: [75, 85],
    // Remove 750 (non-standard) and 828 (only needed for older iPhones)
    deviceSizes: [640, 828, 1080, 1200, 1920, 2560],
    imageSizes: [16, 32, 64, 96, 128, 256, 384],
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
      // JS/CSS chunks are content-hashed by Next.js — safe to cache forever
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Next.js image optimizer output — cache 1 year (minimumCacheTTL handles server-side)
      {
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
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
            value: process.env.NEXT_PUBLIC_APP_URL || "https://film-site-web.vercel.app",
          },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
