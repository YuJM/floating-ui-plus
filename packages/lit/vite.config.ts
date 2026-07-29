import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

const browserHeadless = process.env.PLAYWRIGHT_HEADLESS !== 'false';

export default defineConfig({
  optimizeDeps: {
    include: ['axe-core'],
  },
  test: {
    environment: 'jsdom',
    root: './test',
    include:
      process.env.TEST_ENV === 'browser'
        ? ['browser/**/*.test.ts']
        : ['**/*.test.ts'],
    browser: {
      provider: playwright({launchOptions: {channel: 'chrome'}}),
      enabled: process.env.TEST_ENV === 'browser',
      headless: browserHeadless,
      instances: [{browser: 'chromium'}],
      viewport: {width: 1280, height: 720},
    },
  },
  define: {
    __DEV__: true,
  },
});
