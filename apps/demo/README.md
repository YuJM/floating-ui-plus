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

- `/`: integrated framework selector
- `/web-components`: complete Web Components gallery
- `/web-components/:primitive`: Web Components example routes
- `/vue`: complete Vue island gallery
- `/vue/examples/:primitive`: Vue component example routes
- `/vue/placement`
- `/vue/middleware`

Every gallery includes a working interaction, not just a static example.

## Verification

```sh
bun run --filter floating-ui-plus-demo typecheck
bun run --filter floating-ui-plus-demo build
bun run --filter floating-ui-plus-demo test
```

Playwright builds the packages, serves the production output, and runs the
hub, Web Components, and Vue suites in desktop and mobile Chrome.

## Cloudflare

The application deploys as a Cloudflare Worker with static assets.

```sh
bun run deploy:demo:dry-run
bun run deploy:demo
```
