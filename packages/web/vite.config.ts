import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    root: './test',
    include:
      process.env.TEST_ENV === 'browser'
        ? ['browser/**/*.test.ts']
        : ['**/*.test.ts'],
    // The copied upstream parity test intentionally reads ../react/src/index.ts.
    // This standalone Web/Lit monorepo does not ship a React workspace.
    exclude: ['parity.test.ts'],
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
