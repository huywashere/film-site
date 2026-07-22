const isDev = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use separate directories for dev and prod builds to prevent Windows file lock collisions
  distDir: isDev ? '.next-dev' : '.next',
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'phimimg.com' },
      { protocol: 'https', hostname: 'img.phimapi.com' },
      { protocol: 'https', hostname: 'phimapi.com' },
      { protocol: 'https', hostname: '**.phimapi.com' },
      { protocol: 'https', hostname: '**.kkphim.vip' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'motphim.net' },
      { protocol: 'https', hostname: '**.motphim.net' },
    ],
    // Bỏ qua domain validation (dùng unoptimized nếu cần)
    unoptimized: false,
  },
  // Cho phép CORS từ phimapi.com
  async headers() {
    return [
      {
        source: '/api/kkphim/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
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

