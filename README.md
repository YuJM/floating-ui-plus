# Floating UI Plus

A Bun workspace containing framework-neutral Floating UI interactions,
Lit-powered Web Components, and Vue-native bindings.

## Packages

- `@floating-ui-plus/web`: DOM interaction pipeline, positioning, search,
  focus, tree, list, portal, and transition services
- `@floating-ui-plus/web-components`: Custom Elements for root/reference/content
  composition, portals, overlays, focus, collections, trees, and composites
- `@floating-ui-plus/vue`: Vue positioning, Teleport, focus, collection, and
  interaction adapters

`@floating-ui-plus/web-components` uses Lit internally but exposes HTML
attributes, JavaScript properties, DOM events, slots, and Custom Element
methods. It does not publish Lit directives or reactive controllers.

## Development

```sh
bun install
bun run typecheck
bun run build
bun run test
bun run test:browser
```

All packages are built with [tsdown](https://tsdown.dev/). Package `dev`
scripts run `tsdown --watch --no-clean`.

`test:browser` runs the Web, Web Components, and Vue Vitest Browser suites,
then the integrated demo E2E suite. Playwright uses the installed Chrome browser and
exercises native layout, focus, pointer, and keyboard behavior.

## Integrated Astro demo

`apps/demo` uses Astro 7.1.4 and `@astrojs/vue` to demonstrate both package
surfaces in one application:

- `/web-components/*`: Lit-powered Custom Elements composed in `.astro`
- `/vue/*`: Vue-native components hydrated as Astro islands
- tooltip, popover, menus, client point, multilingual search, modal, all 12
  placements, and all eight middleware examples on both surfaces

```sh
bun run dev:demo
```

Open <http://127.0.0.1:5173>.

Production browser tests build Astro, serve it with `astro preview`, and run
the integrated hub and both framework surfaces in desktop and mobile Chrome.

## Cloudflare deployment

```sh
bun run deploy:demo:dry-run
bun run deploy:demo
```

The standalone `cf` CLI builds the app into Cloudflare Build Output and deploys
one Worker with the Astro static assets.
