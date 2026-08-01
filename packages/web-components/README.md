# `@floating-ui-plus/web-components`

Headless Custom Elements for floating interfaces, including positioning,
interactions, native surfaces, focus, collections, and editable queries. Your application keeps the HTML, classes, and result markup.

## Install and register

```sh
npm install @floating-ui-plus/web-components
# or: pnpm add @floating-ui-plus/web-components
# or: bun add @floating-ui-plus/web-components
```

Import once to register all elements. The package also re-exports the
framework-neutral APIs from `@floating-ui-plus/web`.

```ts
import '@floating-ui-plus/web-components';
```

## Popover with a native template

Use a root-owned `<template slot="content">` for an anchored, conditional
surface. The root creates a fresh native Popover while it is open; a portal is
not needed for the usual case.

```html
<floating-root
  placement="bottom-start"
  interactions="click dismiss"
  floating-role="dialog"
>
  <floating-reference>
    <button type="button">Open settings</button>
  </floating-reference>

  <template slot="content">
    <section aria-label="Settings">
      Popover content
      <button type="button" data-fup-close>Close</button>
    </section>
  </template>
</floating-root>
```

The root-owned `template[slot="content"]` is the explicit native Popover
composition. A direct `<dialog slot="floating">` (or a top-level dialog in
the template) uses native dialog behavior. Direct slotted non-dialog surfaces
also use the Popover API by default; set `top-layer="none"` for an intentionally
positioned/custom surface. `floating-role` only sets ARIA semantics.

These are browser Web Standards APIs—the Popover API for anchored non-modal
surfaces and the native `<dialog>` element for modal surfaces—not a portal
emulation. The browser owns the corresponding top-layer behavior.

Use a real `<dialog slot="floating">` for a modal. The browser then owns the
top layer, focus, and inertness. Reserve `<floating-portal>` for a surface that
explicitly must escape a clipping ancestor or render at a custom target.

Configure function values as properties, rather than attributes:

```ts
import {flip, offset, shift, type FloatingRootElement} from '@floating-ui-plus/web-components';

const root = document.querySelector<FloatingRootElement>('floating-root')!;
root.middleware = [offset(8), flip(), shift({padding: 12})];
```

## Editable query

`<floating-query>` is the general searchable-result primitive. Its default
`semantics="combobox"` supplies ARIA combobox/listbox/option behavior and
virtual focus. Use `semantics="dialog"` for a command palette or
`semantics="none"` when the application owns ARIA itself. It does not own a
selected value or participate in form submission.

```html
<floating-root placement="bottom-start" interactions="click dismiss">
  <floating-list navigation loop allow-escape>
    <floating-query data-query option-id-prefix="destination-option">
      <floating-reference>
        <input aria-label="Destination" autocomplete="off" />
      </floating-reference>

      <template slot="content">
        <floating-search>
          <template data-search-idle><p>Start typing.</p></template>
          <template data-search-empty><p>No results.</p></template>
          <template data-search-result>
            <floating-list-item>
              <button type="button" data-search-text="label"></button>
            </floating-list-item>
          </template>
        </floating-search>
      </template>
    </floating-query>
  </floating-list>
</floating-root>
```

```ts
import {
  createFuzzySearchSource,
  type FloatingQueryElement,
} from '@floating-ui-plus/web-components';

const query = document.querySelector<FloatingQueryElement>('[data-query]')!;

query.configure({
  search: {
    source: createFuzzySearchSource(destinations, {keys: ['label']}),
    getItemKey: (item) => item.id,
  },
  getItemLabel: (item) => item.label,
});

query.addEventListener('queryactivate', (event) => {
  const {item, sourceEvent} = event.detail;
  chooseDestination(item, sourceEvent);
});
```

`configure()` accepts either `SearchOptions` (the element owns the resulting
`SearchController`) or an existing `SearchController`. For server search,
provide an application-owned async `source`; the package does not choose your
transport or cache library. Use `query.setQuery()` for programmatic changes and
`query.search?.loadMore()` for cursor pagination.

## Closing contract

`data-fup-close` remains a convenient declarative close control. For
imperative closing, call the owning root:

```ts
root.close(event, 'click');
```

Every close path—`close()`, `data-fup-close`, dismiss interactions, and native
Popover/dialog close events—first emits the cancelable, bubbling and composed
`floatingbeforeclose` event. Its detail is `{sourceEvent, reason}`.

```ts
root.addEventListener('floatingbeforeclose', (event) => {
  sendCloseMetric(event.detail.reason);
  if (!canClose()) event.preventDefault();
});
```

When prevented, the surface stays open and `openchange` is not emitted.
`openchange` only represents approved state changes and carries
`{open, sourceEvent, reason}`. Asynchronous approval is application-owned:
complete the work, then call `root.close()`.

## Elements

| Element | Purpose |
| --- | --- |
| `floating-root`, `floating-reference`, `floating-item` | Reference, surface, placement, and interaction controller |
| `floating-content`, `floating-portal`, `floating-overlay` | Surface mounting, custom targets, and overlay/scroll lock |
| `floating-focus-manager`, `floating-transition`, `floating-arrow` | Focus behavior, presence state, and arrow geometry |
| `floating-tree`, `floating-node` | Nested floating surfaces and parent focus restoration |
| `floating-list`, `floating-list-item` | Ordered items, typeahead, roving or virtual focus |
| `floating-query`, `floating-search` | Query input, search phases, generated result markup |
| `floating-composite`, `floating-composite-item` | Composite/grid roving focus |
| `floating-delay-group`, `next-floating-delay-group` | Shared hover/focus delays |

### `floating-combobox` compatibility

`<floating-combobox>` is deprecated but fully supported for existing native
form workflows. Unlike `<floating-query>`, it owns `selectedItem`, input-label
replacement, `getItemValue()`, `name`, `required`, and form reset behavior.
Use it only when those form-associated selected-value semantics are required.

## Documentation

- [Installation](https://fup.polcaneli.com/docs/guides/installation/web-components)
- [Getting started](https://fup.polcaneli.com/docs/guides/getting-started)
- [Popover and dialog](https://fup.polcaneli.com/docs/guides/popover)
- [Query demos: fuzzy and server search](https://fup.polcaneli.com/docs/guides/demo/combobox/fuzzy)
- [Dismiss and before-close](https://fup.polcaneli.com/docs/guides/dismiss)
- [Usage recipes](https://fup.polcaneli.com/docs/guides/usage)
