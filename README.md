# Floating UI Plus

A positioning and interaction toolkit for the web. Choose a framework-neutral
controller, Custom Elements, or Vue components without changing the underlying
interaction model.

## Packages

- [`@floating-ui-plus/web`](./packages/web): framework-neutral positioning,
  interactions, search, focus, and collection controllers
- [`@floating-ui-plus/web-components`](./packages/web-components): Custom
  Elements for HTML-first applications
- [`@floating-ui-plus/vue`](./packages/vue): Vue composables and declarative
  floating components

Read each package README for installation and framework-specific examples.

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

## Demo

The [demo](./apps/demo) lets you compare the Custom Elements and Vue APIs for
the same common UI patterns:

- tooltips, popovers, menus, cursor-following surfaces, and modals
- nested menus, lists, keyboard composites, and focus management
- multilingual search, all placements, and middleware examples

```sh
bun run dev:demo
```

Open <http://127.0.0.1:5173>.

Browser tests exercise both surfaces in desktop and mobile Chrome.

## Cloudflare deployment

```sh
bun run deploy:demo:dry-run
bun run deploy:demo
```

The deployment command publishes the demo as a Worker with static assets.

## Package releases

Published packages are versioned with [Changesets](https://github.com/changesets/changesets).
Add a changeset with `bun run changeset` whenever a change affects a published
package. Before publishing, run `bun run version` to apply the queued version
and changelog updates, then run `bun run build`, `bun run test`, and
`bun run release`.

See [`.changeset/README.md`](./.changeset/README.md) for the team workflow and
versioning rules.
