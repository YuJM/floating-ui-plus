import {setupWorker} from 'msw/browser';

import {destinationHandlers} from './destination-handlers';

const worker = setupWorker(...destinationHandlers);
let ready: Promise<void> | undefined;

/**
 * Starts the browser-only demo API. The static demo uses the same deterministic
 * HTTP lifecycle by default; set the flag to `false` when a real API owns the
 * route.
 */
export function enableDemoMockServer() {
  const enabled = import.meta.env.PUBLIC_ENABLE_DEMO_MOCK_SERVER !== 'false';
  if (!enabled) return Promise.resolve();
  ready ??= worker
    .start({
      onUnhandledRequest: 'bypass',
      quiet: true,
      serviceWorker: {url: '/mockServiceWorker.js'},
    })
    .then(() => undefined);
  return ready;
}
