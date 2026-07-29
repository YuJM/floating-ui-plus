# Lit interaction lab

This app is the browser fixture for `@floating-ui/lit`. The custom element
explicitly returns itself from `createRenderRoot()`, so every controller and
directive runs in Light DOM.

Run it from the repository root:

```sh
bun run dev
```

Try the examples with both a pointer and a keyboard. Every Web interaction has
a live demo:

- Tooltip: `hover`, `focus`, `dismiss`, `role`, and `safePolygon`
- Popover: `click`, `dismiss`, and dialog `role`
- Command menu: `click`, `dismiss`, menu `role`, `listNavigation`, and `typeahead`
- Cursor signal: `hover`, `clientPoint`, `dismiss`, and tooltip `role`
- Modal: `click`, `dismiss`, dialog `role`, and `focusManager`
- Clipping signal: `hide()` with both `referenceHidden` and `escaped` strategies

Routes are handled by the Lit `Router` controller from `@lit-labs/router`.
Each `/examples/*` route lazy-loads its corresponding view. Production hosting
must rewrite unknown paths to `index.html` so direct links keep working.

`/examples/middleware` is a dedicated gallery for all DOM middleware shown in
the Floating UI navigation: `offset`, `shift`, `flip`, `arrow`, `size`,
`autoPlacement`, `hide`, and `inline`.
