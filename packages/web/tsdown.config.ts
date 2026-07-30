import {defineConfig} from 'tsdown';

export default defineConfig({
  entry: {
    fuzzy: 'src/fuzzy.ts',
    index: 'src/index.ts',
    search: 'src/search.ts',
    utils: 'src/utils.ts',
  },
  format: ['esm', 'cjs'],
  platform: 'browser',
  target: ['chrome73', 'firefox78', 'edge79', 'safari12', 'ios12'],
  deps: {
    neverBundle: true,
  },
  dts: true,
  sourcemap: true,
});
