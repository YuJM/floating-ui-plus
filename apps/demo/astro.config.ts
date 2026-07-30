import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';
import {defineConfig} from 'astro/config';
import {DEFAULT_SITE} from './src/seo';

const site = process.env.PUBLIC_SITE_URL ?? DEFAULT_SITE;

export default defineConfig({
  site,
  trailingSlash: 'never',
  integrations: [
    vue(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return pathname !== '/404' && pathname !== '/web-components/hide';
      },
    }),
  ],
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
