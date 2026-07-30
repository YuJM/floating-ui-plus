import tailwindcss from '@tailwindcss/vite';
import vue from '@astrojs/vue';
import {defineConfig} from 'astro/config';

export default defineConfig({
  integrations: [vue()],
  vite: {
    define: {
      __DEV__: 'true',
    },
    plugins: [tailwindcss()],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
