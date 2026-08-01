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
- `?framework=wc` (default) or `?framework=vue`: implementation switch

For example, use `/tooltip`, `/tooltip?framework=vue`, or
`/middleware?framework=wc`.

Every gallery includes a working interaction, not just a static example.

## Documentation

The demo also hosts the Starlight documentation site at `/docs`. It combines
human-written guides with generated API reference pages for the Web,
Web Components, and Vue packages.

- `/docs`: latest documentation
- `/docs/api/readme`: TypeDoc-generated API reference

The Astro integration uses `starlight-typedoc`, `starlight-links-validator`,
and `starlight-package-managers`. TypeDoc output is generated during
`typecheck`/`build` and is ignored by Git; edit the guides under
`src/content/docs/docs` instead. Versioned archives will be introduced when a
stable major release needs them; until then the site intentionally exposes only
the latest English documentation. The demo routes keep their English, Korean,
and Japanese playground pages separately.

Each demo guide under `src/content/docs/docs/guides/demo` imports its executable
Astro example with Vite's `?raw` suffix and renders it with Starlight's built-in
`Code` component. Update the file in `src/components/examples` once; the guide
source block is updated automatically on the next typecheck or build. The same
guides embed the live demo route with a Web Components/Vue switch, so readers
can try the behavior without leaving the documentation.

## Mock server for the async combobox

The async combobox calls `/api/demo/destinations` with `q`, `limit`, and
`cursor` just as it would call a remote API. In development, MSW starts in the
browser and serves 480 deterministic fake records in cursor pages. For a
Cloudflare Pages build, set `PUBLIC_ENABLE_DEMO_MOCK_SERVER=true` to publish
the same browser-only mock API; Pages only needs to serve the generated
`public/mockServiceWorker.js` asset. Leave the flag unset when a real API owns
that route.

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
