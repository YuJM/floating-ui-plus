# Floating UI Plus demo

Explore the same floating-interface patterns with
`@floating-ui-plus/web-components` and `@floating-ui-plus/vue`.

Use it to compare tooltips, popovers, menus, cursor-following surfaces,
search, placements, middleware, and modal focus management.

## Run

```sh
bun run --filter floating-ui-plus-demo dev
```

Open <http://127.0.0.1:5173>.

## Routes

- `/`: integrated example selector
- `/:example`: one floating-interface example
- `?framework=web-components` (default) or `?framework=vue`: implementation switch

For example, use `/tooltip`, `/tooltip?framework=vue`, or
`/middleware?framework=web-components`.

Every gallery includes a working interaction, not just a static example.

## Verification

```sh
bun run --filter floating-ui-plus-demo typecheck
bun run --filter floating-ui-plus-demo build
bun run --filter floating-ui-plus-demo test
```

Playwright builds the packages, serves the production output, and runs the
hub, Web Components, and Vue suites in desktop and mobile Chrome.

## Cloudflare Pages

The demo deploys through the connected Cloudflare Pages project. Pages runs the
repository build command and publishes `apps/demo/dist`. The root `functions/`
directory provides the `/api/npm-packages` Pages Function.
