import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [tailwindcss()],
  define: {
    __DEV__: 'true',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: ['es2020', 'safari12'],
  },
});
