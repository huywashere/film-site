import { execSync } from 'node:child_process';

const isCloudflareWorkers =
  process.env.WORKERS_CI === '1' ||
  Boolean(process.env.WORKERS_CI_BUILD_UUID) ||
  Boolean(process.env.WORKERS_CI_COMMIT_SHA) ||
  process.env.CF_PAGES === '1' ||
  process.env.CLOUDFLARE_BUILD === '1';

if (isCloudflareWorkers) {
  console.log('[Cloudflare Workers CI] Detected Cloudflare Workers build environment.');
  console.log('[Cloudflare Workers CI] Standalone flexphim-media-worker is ready for deployment.');
  process.exit(0);
}

try {
  execSync('pnpm exec turbo run build', { stdio: 'inherit' });
} catch (error) {
  process.exit(error.status ?? 1);
}
