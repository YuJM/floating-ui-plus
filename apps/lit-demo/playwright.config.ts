import {defineConfig, devices} from 'playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: {width: 1280, height: 900},
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: {width: 390, height: 844},
      },
    },
  ],
  webServer: {
    command:
      "bun run --filter '@floating-ui-plus/web' build && bun run --filter '@floating-ui-plus/lit' build && bun run --filter floating-ui-plus-lit-demo dev",
    cwd: '../..',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    gracefulShutdown: {signal: 'SIGTERM', timeout: 1_000},
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
