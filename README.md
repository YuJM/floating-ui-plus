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

Both packages are built with [tsdown](https://tsdown.dev/).

## Lit demo app

`apps/lit-demo` is a real Light DOM Lit app that exercises the package in a
browser: tooltip hover/focus, a portaled popover, a modal focus trap, and a
roving-focus/typeahead menu.

```sh
bun run dev
```

Open <http://localhost:5173>. The root `dev` script builds the workspace
packages first, then starts Vite for the demo app.
