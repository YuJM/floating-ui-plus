import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import vue from '@astrojs/vue';
import {defineConfig} from 'astro/config';
import {paraglideVitePlugin} from '@inlang/paraglide-js';
import starlightLinksValidator from 'starlight-links-validator';
import {DEFAULT_SITE} from './src/seo';

const site = process.env.PUBLIC_SITE_URL ?? DEFAULT_SITE;

export default defineConfig({
  site,
  trailingSlash: 'never',
  redirects: {
    '/en': '/',
    '/en/tooltip': '/tooltip',
    '/en/popover': '/popover',
    '/en/menu': '/menu',
    '/en/nested-menu': '/nested-menu',
    '/en/client-point': '/client-point',
    '/en/combobox': '/combobox',
    '/en/placement': '/placement',
    '/en/middleware': '/middleware',
    '/en/modal': '/modal',
    '/en/sheet': '/sheet',
    '/docs/guides/combobox': '/docs/guides/demo/combobox/fuzzy',
    '/docs/guides/demo/combobox': '/docs/guides/demo/combobox/fuzzy',
  },
  integrations: [
    vue(),
    starlight({
      title: 'Floating UI Plus',
      description:
        'Framework-neutral floating UI primitives for Web, Web Components, and Vue.',
      disable404Route: true,
      customCss: ['./src/styles/docs.css'],
      sidebar: [
        {label: 'Introduction', items: [{slug: 'docs'}]},
        {
          label: 'Installation',
          items: [
            {slug: 'docs/guides/installation'},
            {slug: 'docs/guides/installation/web-components'},
            {slug: 'docs/guides/installation/vue'},
            {slug: 'docs/guides/installation/web'},
          ],
        },
        {
          label: 'Guides',
          items: [
            {
              label: 'Demo',
              items: [
                {slug: 'docs/guides/demo'},
                {slug: 'docs/guides/demo/client-point'},
                {
                  label: 'Combobox',
                  items: [
                    {slug: 'docs/guides/demo/combobox/fuzzy'},
                    {slug: 'docs/guides/demo/combobox/server'},
                  ],
                },
                {slug: 'docs/guides/demo/menu'},
                {slug: 'docs/guides/demo/middleware'},
                {slug: 'docs/guides/demo/modal'},
                {slug: 'docs/guides/demo/sheet'},
                {slug: 'docs/guides/demo/nested-menu'},
                {slug: 'docs/guides/demo/placement'},
                {slug: 'docs/guides/demo/popover'},
                {slug: 'docs/guides/demo/tooltip'},
              ],
            },
            {slug: 'docs/guides/dismiss'},
            {slug: 'docs/guides/getting-started'},
            {slug: 'docs/guides/popover'},
            {slug: 'docs/guides/usage'},
          ],
        },
        {
          label: 'Frameworks',
          items: [
            {autogenerate: {directory: 'docs/frameworks'}},
          ],
        },
      ],
      plugins: [
        starlightLinksValidator({
          exclude: ({link}) => {
            const pathname = link.split(/[?#]/, 1)[0];

            // Demo routes are intentionally custom Astro pages. Keep
            // human-authored documentation links strict while API generation
            // is temporarily disabled.
            return !/^\/(?:[^/]+\/)?docs(?:\/|$)/.test(pathname);
          },
        }),
      ],
    }),
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
    optimizeDeps: {
      exclude: [
        '@floating-ui-plus/web',
        '@floating-ui-plus/web-components',
        '@floating-ui-plus/vue',
      ],
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
