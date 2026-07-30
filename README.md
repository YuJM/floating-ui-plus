# Floating UI Plus

A positioning and interaction toolkit for the web. Choose a framework-neutral
controller, Custom Elements, or Vue components without changing the underlying
interaction model.

## Why Floating UI Plus

Floating UI Plus is built on the positioning engine and middleware of
[Floating UI](https://floating-ui.com/). Its React package offers a mature
composition experience, but other frameworks often need to assemble more of
the interaction layer themselves. We made Plus to bring that missing layer to
framework-neutral, Web Components, and Vue applications without turning the
core into a React-only abstraction.

Plus keeps Floating UI's placement model while adding reusable controllers for
open state, dismissal, focus management, nested collections, portals, and
multilingual fuzzy or asynchronous search. Applications still own their
markup, semantics, and rendering; Plus supplies the behavior that should work
the same in every framework.

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

Each example uses one public route and the `framework` query selects its
implementation: `/tooltip` defaults to Web Components, while
`/tooltip?framework=vue` shows the Vue version. Invalid or omitted query values
fall back to Web Components.

Run the complete development environment from the repository root:

```sh
bun run dev
```

It builds the package `dist` outputs once, then starts every package watcher
and the Astro demo. Open <http://127.0.0.1:5173>.

When package watchers are already running, start only the demo with:

```sh
bun run dev:demo
```

In a new checkout with no package `dist` outputs, build packages before
starting the demo alone:

```sh
bun run build:packages
bun run dev:demo
```

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
package. npm package releases are performed only from a maintainer's local
checkout. Cloudflare Pages deployment is a separate process and must not run
`npm publish` or `changeset publish`. The local release script uses Bun's
native `bun publish`, which resolves workspace dependency protocols to semver
ranges in the published manifest.

Prepare and publish a release:

```sh
bun run version
git add .changeset packages bun.lock
git commit -m "release: 패키지 버전 업데이트"
git push origin main
npm login
bun run release:packages:check
bun run release:packages
git push --follow-tags
```

The publish command requires a clean `main` checkout that matches
`origin/main`, verifies npm authentication, typechecks, runs package unit and
browser tests, builds every package, previews each package archive, and asks
for confirmation before publishing. `bun run release:packages:check` performs
the same validation without publishing anything.

See [`.changeset/README.md`](./.changeset/README.md) for the team workflow and
versioning rules.
