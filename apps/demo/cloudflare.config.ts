import {bindings, defineWorker} from 'wrangler/experimental-config';

export default defineWorker({
  name: 'floating-ui-plus-demo',
  compatibilityDate: '2026-07-30',
  entrypoint: './src/worker.ts',
  assets: {
    notFoundHandling: '404-page',
    runWorkerFirst: true,
  },
  env: {
    ASSETS: bindings.assets(),
  },
  workersDev: true,
});
