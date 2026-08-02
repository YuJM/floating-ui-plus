# `@floating-ui-plus/web`

Framework-neutral browser controllers for Floating UI: positioning lifecycle,
interactions, focus, portals, collections, and query inputs. It is headless—your
application owns markup, styling, labels, and rendering.

Floating UI remains the positioning engine. This package adds the state and
interaction layer around it without choosing a framework or design system.

## Install

```sh
npm install @floating-ui-plus/web
# pnpm add @floating-ui-plus/web
# bun add @floating-ui-plus/web
```

Use this package directly for a custom DOM renderer. For Vue or Custom
Elements, install the matching adapter instead; it already includes this shared
runtime.

- [Installation guide](https://fup.polcaneli.com/docs/guides/installation)
- [Web usage guide](https://fup.polcaneli.com/docs/guides/usage)
- [Query demo](https://fup.polcaneli.com/docs/guides/demo/combobox/fuzzy)

## Tooltip quick start

```ts
import {
  autoUpdate,
  createFloating,
  dismiss,
  focus,
  hover,
  offset,
  role,
  transformOrigin,
} from "@floating-ui-plus/web";

let open = false;

const tooltip = createFloating(() => ({
  open,
  onOpenChange(nextOpen) {
    open = nextOpen;
    render();
  },
  middleware: [offset(6), transformOrigin({ padding: 8 })],
  whileElementsMounted: autoUpdate,
})).pipe(hover(), focus(), dismiss(), role({ role: "tooltip" }));

tooltip.setReference(button);
tooltip.setFloating(panel);
tooltip.connect();

// Apply `tooltip.floatingStyles` and `tooltip.context.attributes` in render().
// Call tooltip.destroy() when the owning UI is disposed.
```

`createFloating()` owns one reference/floating pair. Compose behavior with
`.pipe()`—for example `click()`, `hover()`, `focus()`, `dismiss()`, `role()`,
`listNavigation()`, and `typeahead()`—then apply the controller's positioning
styles and attributes in your renderer.

`transformOrigin()` writes `--floating-transform-origin` to the floating
element from its final placement and reference geometry. Put it after `flip()`,
`shift()`, and `size()`, then consume it with
`transform-origin: var(--floating-transform-origin, 50% 0%)`. The fallback
keeps the surface styled when the middleware is omitted.

For a fixed placement, middleware is optional: set `transform-origin` (or a
CSS variable such as `--surface-motion-origin`) directly in your stylesheet.
CSS cannot detect a placement change caused by `flip()` or the final offset
from `shift()`, so use `transformOrigin()` when the surface can move.

## Query quick start

`createQuery()` connects an editable input to a `SearchController`. Its default
`semantics: 'combobox'` supplies the ARIA combobox/listbox relationship, option
roles, active descendant, virtual list navigation, and Enter activation.

```ts
import {
  createFloating,
  createFuzzySearchSource,
  createQuery,
  createSearch,
  dismiss,
} from "@floating-ui-plus/web";

let open = false;

const floating = createFloating(() => ({
  open,
  onOpenChange(nextOpen) {
    open = nextOpen;
    render();
  },
}));

const search = createSearch({
  source: createFuzzySearchSource(destinations, {keys: ['name']}),
  getItemKey: (item) => item.id,
});

const query = createQuery({
  search,
  getItemLabel: (item) => item.name,
  onOpenChange: (nextOpen, event, reason) =>
    floating.context.onOpenChange(nextOpen, event, reason),
  onActivate: (item) => navigateTo(item),
});

floating.pipe(dismiss(), ...query.interactions({ loop: true }));

query.bindInput(input);
const renderResults = () => {
  const optionElements = renderOptions(search.items);
  query.setListElements(optionElements);
  optionElements.forEach((element, index) => {
    query.bindOption(element, search.items[index]!, index);
  });
};
const unsubscribe = search.subscribe(renderResults);

// Dispose both owners when the rendered surface is removed.
unsubscribe();
query.destroy();
search.destroy();
floating.destroy();
```

For a command palette, use `semantics: 'dialog'`. For an input whose ARIA is
entirely owned by the application, use `semantics: 'none'`. Both retain query,
IME, active-item, keyboard-navigation, and activation behavior without adding
combobox option semantics.

The `onActivate` callback is deliberately not a selected value. It lets search,
autocomplete, filters, and command palettes decide what activation means.

`createSearch()` is a state controller, not a renderer. Subscribe it to render
the current `search.items`, then replace the query's list elements after each
render. Use `createFuzzySearchSource()` for local matching or provide an async
`source` for a server-backed query. If the application already owns its result
state, use `items` instead of `source` and update that state in response to the
input lifecycle.

## Essential API

- `createFloating()` — positioning, open-state, and composable interactions.
- `createSearch()` — local, async, or controlled search state with IME,
  cancellation, stale-response protection, and pagination.
- `createQuery()` — input binding, active results, keyboard navigation, ARIA
  semantics, and result activation.
- `createFloatingTopLayer()` — state synchronization for native Popover and
  `<dialog>` surfaces.
- `createPortalBridge()` — move a surface only when a body-level DOM target is
  actually needed.

Import focused modules when useful:

```ts
import { createQuery } from "@floating-ui-plus/web/query";
import { createSearch } from "@floating-ui-plus/web/search";
import { createFuzzySearchSource } from "@floating-ui-plus/web/fuzzy";
```

## Native entry and exit animation

`createFloatingTopLayer()` keeps instant closing as the default. When a native
Popover or `<dialog>` surface explicitly transitions `display` or `overlay`
with `allow-discrete`, it leaves the closed surface unhidden until that CSS
transition finishes. No animation option or JavaScript duration is required.

```css
.floating-panel {
  opacity: 0;
  translate: 0 -0.25rem;
  transition:
    opacity 120ms cubic-bezier(0.23, 1, 0.32, 1),
    translate 120ms cubic-bezier(0.23, 1, 0.32, 1),
    display 120ms allow-discrete,
    overlay 120ms allow-discrete;
}

.floating-panel:popover-open {
  opacity: 1;
  translate: 0 0;
}

@starting-style {
  .floating-panel:popover-open {
    opacity: 0;
    translate: 0 -0.25rem;
  }
}
```

Without the explicit discrete transition, the controller applies `hidden`
immediately. Reopening cancels a pending hide. For non-native surfaces, keep
presence in your renderer and use `FloatingTransition` instead. See the
[entry and exit animation guide](https://fup.polcaneli.com/docs/guides/animation).

## Compatibility

`createCombobox()` and `ComboboxController` remain available from the root and
`@floating-ui-plus/web/combobox` for existing form-associated selected-value
flows. They are deprecated in favor of `createQuery()` for new work. Unlike
`createQuery()`, they retain `selectedItem`, `selectedValue`, `select()`, and
`onSelect`.

See the [full documentation](https://fup.polcaneli.com/docs) for menus,
dialogs, native top-layer surfaces, focus management, portals, middleware, and
adapter-specific examples.
