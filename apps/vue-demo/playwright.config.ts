import {defineConfig} from 'playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    channel: 'chrome',
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  },
  webServer: {
    command:
      "bun run --filter '@floating-ui-plus/web' build && bun run --filter '@floating-ui-plus/vue' build && bun run --filter floating-ui-plus-vue-demo dev",
    cwd: '../..',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: true,
  },
});
