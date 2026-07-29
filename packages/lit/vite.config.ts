import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

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
      provider: playwright(),
      enabled: process.env.TEST_ENV === 'browser',
      instances: [{browser: 'chromium'}],
    },
  },
  define: {
    __DEV__: true,
  },
});
