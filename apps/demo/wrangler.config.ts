import {defineWranglerConfig} from 'wrangler/experimental-config';

export default defineWranglerConfig({
  build: {
    command: 'bun run build',
  },
  assetsDirectory: './dist',
  dev: {
    types: {
      generate: false,
    },
  },
});
