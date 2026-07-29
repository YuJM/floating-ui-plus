# Lit interaction lab

This app is the browser fixture for `@floating-ui/lit`. The custom element
explicitly returns itself from `createRenderRoot()`, so every controller and
directive runs in Light DOM.

Run it from the repository root:

```sh
bun run dev
```

Try the examples with both a pointer and a keyboard. The modal demonstrates
the shared focus-trap stack and focus restoration; the command menu supports
Arrow-key navigation and typeahead.

Routes are handled by `@vaadin/router`: `/` and one lazy-loaded route per
example under `/examples/*`. Production hosting must rewrite unknown paths to
`index.html` so direct links keep working.
