import {setupWorker} from 'msw/browser';

import {destinationHandlers} from './destination-handlers';

const worker = setupWorker(...destinationHandlers);
let ready: Promise<void> | undefined;

/**
 * Starts the browser-only demo API. Production builds opt in explicitly so a
 * deployed static demo can show the same HTTP lifecycle without a Pages
 * Function; a real API can take over by leaving the flag unset.
 */
export function enableDemoMockServer() {
  const enabled =
    import.meta.env.DEV ||
    import.meta.env.PUBLIC_ENABLE_DEMO_MOCK_SERVER === 'true';
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
