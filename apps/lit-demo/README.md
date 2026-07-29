# Lit interaction lab

This app is the browser fixture for `@floating-ui/lit`. The custom element
explicitly returns itself from `createRenderRoot()`, so every controller and
directive runs in Light DOM.

Run it from the repository root:

```sh
bun run dev
```

This first builds the dependent Web and Lit workspace packages, then starts
Vite together with both `tsdown --watch` processes. The initial build keeps
Vite from resolving incomplete package output, and the watchers use
`--no-clean` so `dist` never disappears underneath a live Vite request. Later
source changes are rebuilt automatically.

Try the examples with both a pointer and a keyboard. Every Web interaction has
a live demo:

- Tooltip: `hover`, `focus`, `dismiss`, `role`, and `safePolygon`
- Popover: `click`, `dismiss`, and dialog `role`
- Command menu: `click`, `dismiss`, menu `role`, `listNavigation`, and `typeahead`
- Nested menu: `FloatingTree`, descendant closing, nested navigation, hover, and typeahead
- Cursor signal: `hover`, `clientPoint`, `dismiss`, and tooltip `role`
- Modal: `click`, `dismiss`, dialog `role`, and `focusManager`
- Clipping signal: `hide()` with both `referenceHidden` and `escaped` strategies

Routes are handled by the Lit `Router` controller from `@lit-labs/router`.
Each `/examples/*` route lazy-loads its corresponding view. Production hosting
must rewrite unknown paths to `index.html` so direct links keep working.

`/examples/middleware` is a dedicated gallery for all DOM middleware shown in
the Floating UI navigation: `offset`, `shift`, `flip`, `arrow`, `size`,
`autoPlacement`, `hide`, and `inline`. Its fixtures mirror the observable
behavior in the official middleware documentation:

- `offset`: compare a `0px` and `10px` main-axis gutter
- `shift`: scroll horizontally while the placement side stays unchanged
- `flip`: scroll up to change the final placement from `bottom` to `top`
- `arrow`: keep a square arrow aimed at the reference while scrolling
- `size`: constrain a scrollable panel to its changing available height
- `autoPlacement`: choose whichever side currently has the most room
- `hide`: dim an escaped panel, then hide it once its reference is clipped
- `inline`: compare a bounding box with the matching multiline client rect

The controller follows Lit's Reactive Controller lifecycle, while its element
directives bind the reference, floating, and arrow elements from the template.
