const isDev = process.env.NODE_ENV === "development";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep development manifests away from production output. Mixing both in
  // `.next` made the dev server listen successfully while every app route
  // resolved to Next's 404 page after a production build.
  distDir: isDev ? ".next-dev" : ".next",
  poweredByHeader: false,
  reactStrictMode: true,
};

module.exports = nextConfig;
