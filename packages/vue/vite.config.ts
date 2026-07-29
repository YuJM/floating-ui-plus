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
  test: {
    globals: true,
    environment: 'jsdom',
    root: './test',
    setupFiles:
      process.env.TEST_ENV === 'browser' ? [] : ['./setupTests.ts'],
    include:
      process.env.TEST_ENV === 'browser'
        ? ['browser/**/*.test.ts']
        : ['*.test.ts', 'unit/**/*.test.ts'],
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
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
});
