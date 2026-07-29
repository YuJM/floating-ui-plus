import {defineConfig} from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
  platform: 'browser',
  target: ['chrome73', 'firefox78', 'edge79', 'safari12', 'ios12'],
  deps: {
    neverBundle: true,
  },
  dts: true,
  sourcemap: true,
});
