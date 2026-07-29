# Floating UI Plus

A Bun workspace monorepo containing framework-neutral Floating UI interactions
and Light DOM bindings for Lit.

## Packages

- `@floating-ui-plus/web`: DOM interaction pipeline and web-standard utilities
- `@floating-ui-plus/lit`: Light DOM Lit controllers and directives

`@floating-ui/dom` and `@floating-ui/utils` are peer dependencies of
`@floating-ui-plus/web`. Applications choose and install compatible versions.

## Development

```sh
bun install
bun run typecheck
bun run build
bun run test
bun run test:browser
```

`test:browser` runs the Web and Lit suites through Vitest Browser Mode's
Playwright provider, then runs the demo E2E suite. All Playwright-backed tests
are headless by default and use the installed Chrome browser. They exercise the
native DOM, CSS layout engine, focus, pointer, and keyboard behavior rather than
JSDOM geometry.

For local visual debugging only:

```sh
bun run test:browser:headed
```

Both packages are built with [tsdown](https://tsdown.dev/). Their `dev` scripts
run `tsdown --watch`.

## Lit demo app

`apps/lit-demo` is a real Light DOM Lit app that exercises every interaction
plugin in a browser: tooltip hover/focus/safe polygon, a portaled popover,
cursor-following virtual references, hide/clipping middleware strategies, a
modal focus trap, and a roving-focus / typeahead menu.

The demo uses Tailwind CSS v4's CSS-first configuration. Semantic color,
typography, radius, shadow, and motion tokens live in
`apps/lit-demo/src/styles.css` under `@theme`; reusable visual primitives live
in `@layer components`. Playwright checks the generated tokens, responsive
layout, middleware fixtures, and full nested-menu keyboard path in desktop and
mobile Chrome.

The `/examples/middleware` route demonstrates every DOM positioning middleware
from the Floating UI middleware navigation.

```sh
bun run dev
```

Open <http://127.0.0.1:5173>. The root `dev` script first builds
`@floating-ui-plus/web` and `@floating-ui-plus/lit`, then runs Vite together with both
`tsdown --watch --no-clean` processes. The initial build creates complete
package output, while disabling watcher cleanup prevents Vite from resolving a
package through a temporarily empty `dist`; later source changes rebuild
automatically.

To run only the package watchers or only the demo server, use `bun run
dev:packages` or `bun run dev:demo` respectively.
