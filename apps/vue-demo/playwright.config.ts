import {defineConfig} from 'playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    channel: 'chrome',
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  },
  webServer: {
    command: 'bun run dev',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: true,
  },
});
