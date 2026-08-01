import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import vue from '@astrojs/vue';
import {defineConfig} from 'astro/config';
import {paraglideVitePlugin} from '@inlang/paraglide-js';
import starlightLinksValidator from 'starlight-links-validator';
import starlightTypeDoc, {typeDocSidebarGroup} from 'starlight-typedoc';
import {DEFAULT_SITE} from './src/seo';

const site = process.env.PUBLIC_SITE_URL ?? DEFAULT_SITE;

export default defineConfig({
  site,
  trailingSlash: 'never',
  i18n: {
    locales: ['en', 'ko', 'ja'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
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
  },
  integrations: [
    vue(),
    starlight({
      title: 'Floating UI Plus',
      description:
        'Framework-neutral floating UI primitives for Web, Web Components, and Vue.',
      disable404Route: true,
      sidebar: [
        {label: 'Introduction', items: [{slug: 'docs'}]},
        {
          label: 'Guides',
          items: [
            {autogenerate: {directory: 'docs/guides'}},
          ],
        },
        {
          label: 'Frameworks',
          items: [
            {autogenerate: {directory: 'docs/frameworks'}},
          ],
        },
        typeDocSidebarGroup,
      ],
      plugins: [
        starlightTypeDoc({
          entryPoints: [
            '../../packages/web/src/index.ts',
            '../../packages/web-components/src/index.ts',
            '../../packages/vue/src/index.ts',
          ],
          output: 'docs/api',
          tsconfig: './typedoc.json',
          sidebar: {
            label: 'API Reference',
            collapsed: true,
          },
          typeDoc: {
            excludeInternal: true,
            excludePrivate: true,
            excludeProtected: true,
            skipErrorChecking: true,
          },
        }),
        starlightLinksValidator({
          exclude: ({link}) => {
            const pathname = link.split(/[?#]/, 1)[0];

            // The demo routes are intentionally custom Astro pages. TypeDoc
            // pages are generated markdown and are validated separately by
            // TypeDoc, so keep the human-authored guide links strict here.
            return !/^\/(?:[^/]+\/)?docs(?:\/|$)/.test(pathname) ||
              pathname.includes('/docs/api');
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
