# Floating UI Plus · integrated demo

One Astro 7 application for both `@floating-ui-plus/web-components` and
`@floating-ui-plus/vue`.

Astro owns the document, layout, and file-based routes. Web Components are
composed directly in `.astro` markup. Vue examples are browser-only Astro
islands because the Floating UI interaction pipeline connects to `window`
during component setup.

## Run

```sh
bun run --filter floating-ui-plus-demo dev
```

Open <http://127.0.0.1:5173>.

The app pins Astro `7.1.4`, uses `@astrojs/vue`, and builds one static output
directory containing both frameworks.

## Routes

- `/`: integrated framework selector
- `/web-components`: complete Web Components gallery
- `/web-components/:primitive`: Web Components example routes
- `/vue`: complete Vue island gallery
- `/vue/examples/:primitive`: Vue component example routes
- `/vue/placement`
- `/vue/middleware`

Both surfaces include tooltip, popover, menu, nested menu, client-point,
multilingual combobox, all 12 placements, eight middleware fixtures, and a
focus-managed modal.

## Verification

```sh
bun run --filter floating-ui-plus-demo typecheck
bun run --filter floating-ui-plus-demo build
bun run --filter floating-ui-plus-demo test
```

Playwright builds the packages and Astro app, serves the production output,
and runs the hub, Web Components, and Vue suites in desktop and mobile Chrome.

## Cloudflare

The application is deployed as a Cloudflare Worker with static assets.
`cloudflare.config.ts` and `wrangler.config.ts` describe the Build Output API
contract consumed by the standalone `cf` CLI.

```sh
bun run deploy:demo:dry-run
bun run deploy:demo
```
