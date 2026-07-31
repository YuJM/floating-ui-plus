import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';
import {defineConfig} from 'astro/config';
import {paraglideVitePlugin} from '@inlang/paraglide-js';
import {DEFAULT_SITE} from './src/seo';

const site = process.env.PUBLIC_SITE_URL ?? DEFAULT_SITE;

export default defineConfig({
  site,
  trailingSlash: 'never',
  i18n: {
    locales: ['en', 'ko', 'ja'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  redirects: {
    '/tooltip': '/en/tooltip',
    '/popover': '/en/popover',
    '/menu': '/en/menu',
    '/nested-menu': '/en/nested-menu',
    '/client-point': '/en/client-point',
    '/combobox': '/en/combobox',
    '/placement': '/en/placement',
    '/middleware': '/en/middleware',
    '/modal': '/en/modal',
  },
  integrations: [
    vue(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return pathname !== '/404';
      },
    }),
  ],
  vite: {
    define: {
      __DEV__: 'true',
    },
    plugins: [
      paraglideVitePlugin({
        project: './project.inlang',
        outdir: './src/paraglide',
        emitTsDeclarations: true,
        strategy: ['url', 'baseLocale'],
      }),
      tailwindcss(),
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
