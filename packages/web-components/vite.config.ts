import {fileURLToPath} from 'node:url';
import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

const browserHeadless = process.env.PLAYWRIGHT_HEADLESS !== 'false';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@floating-ui-plus\/web$/,
        replacement: fileURLToPath(
          new URL('../web/src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@floating-ui-plus\/web\/utils$/,
        replacement: fileURLToPath(
          new URL('../web/src/utils.ts', import.meta.url),
        ),
      },
    ],
  },
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
    exclude:
      process.env.TEST_ENV === 'browser'
        ? []
        : ['browser/FloatingRootElement.test.ts'],
    browser: {
      provider: playwright(),
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
