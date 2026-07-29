# Floating UI Plus

A Bun workspace monorepo containing framework-neutral Floating UI interactions
and Light DOM bindings for Lit.

## Packages

- `@floating-ui/web`: DOM interaction pipeline and web-standard utilities
- `@floating-ui/lit`: Light DOM Lit controllers and directives

`@floating-ui/dom` and `@floating-ui/utils` are peer dependencies of
`@floating-ui/web`. Applications choose and install compatible versions.

## Development

```sh
bun install
bun run typecheck
bun run build
bun run test
```

Both packages are built with [tsdown](https://tsdown.dev/). Their `dev` scripts
run `tsdown --watch`.

## Lit demo app

`apps/lit-demo` is a real Light DOM Lit app that exercises every interaction
plugin in a browser: tooltip hover/focus/safe polygon, a portaled popover,
cursor-following virtual references, hide/clipping middleware strategies, a
modal focus trap, and a roving-focus / typeahead menu.

The `/examples/middleware` route demonstrates every DOM positioning middleware
from the Floating UI middleware navigation.

```sh
bun run dev
```

Open <http://127.0.0.1:5173>. The root `dev` script runs every workspace
`dev` script concurrently: Vite for the demo and `tsdown --watch` for
`@floating-ui/web` and `@floating-ui/lit`. Package changes therefore rebuild
their `dist` output automatically; no manual package build is needed while
developing the demo.

To run only the package watchers or only the demo server, use `bun run
dev:packages` or `bun run dev:demo` respectively.
