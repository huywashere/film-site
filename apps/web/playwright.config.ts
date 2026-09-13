import { defineConfig, devices } from '@playwright/test';

const playwrightPort = process.env.PLAYWRIGHT_PORT || '3000';
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: './e2e',
  // A Next development server compiles routes on demand and becomes
  // unresponsive when every desktop/mobile navigation cold-starts in
  // parallel. Keep local runs deterministic; CI may use two workers against
  // its prebuilt server.
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html'], ['github']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: process.env.CI
          ? 'pnpm start:standalone'
          : 'pnpm dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
