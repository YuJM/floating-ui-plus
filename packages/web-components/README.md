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

The root's baseline accessibility contract uses `dialog` for an interactive
floating surface. Set `floating-role` only when selecting a different supported
semantic role, such as `menu` or `tooltip`. `region` is a landmark role, not a
role supported by the package's public floating-role contract.

The root-owned `template[slot="content"]` is the explicit native Popover
composition. A direct `<dialog slot="floating">` uses native dialog behavior.
Direct slotted non-dialog surfaces
also use the Popover API by default; set `top-layer="none"` for an intentionally
positioned/custom surface. `floating-role` only sets ARIA semantics.

These are browser Web Standards APIs—the Popover API for anchored non-modal
surfaces and the native `<dialog>` element for modal surfaces—not a portal
emulation. The browser owns the corresponding top-layer behavior.

Opening a native dialog also applies a ref-counted document scroll lock using
CSS `overflow: hidden`. No touch-event interception is installed by default;
add an application-specific touch guard only when targeting a legacy iOS or
WebView environment that needs one.

Native dialogs also receive `data-fup-safe-area` and the CSS variables
`--fup-safe-area-inset-top`, `--fup-safe-area-inset-right`,
`--fup-safe-area-inset-bottom`, and `--fup-safe-area-inset-left`. Consume these
variables in surface CSS where a notch or home indicator needs extra space; the
package does not force a padding policy on custom dialog layouts.

Use a real `<dialog slot="floating">` for a modal. The browser then owns the
top layer, focus, and inertness. Reserve `<floating-portal>` for a surface that
explicitly must escape a clipping ancestor or render at a custom target.

Configure function values as properties, rather than attributes. `configure()`
keeps root middleware, plugins, and an optional explicit `topLayer` together;
use it when more than one setting changes. Attribute values remain useful only
for declarative strings such as `placement` and `interactions`.

### Attribute policy

Use an `id` for a unique application element that setup code needs to find,
and classes for repeated presentational parts. The package reserves `data-*`
for declarative component APIs and runtime state: `data-fup-close`,
`data-search-*`, `data-active`, and `data-placement` are examples. Avoid
application-specific `data-*` attributes that exist only as selector hooks.

```ts
import {
  flip,
  offset,
  shift,
  transformOrigin,
  type FloatingRootElement,
} from '@floating-ui-plus/web-components';

const root = document.querySelector<FloatingRootElement>('floating-root')!;
root.configure({
  middleware: [
    offset(8),
    flip({padding: 12}),
    shift({padding: 12}),
    transformOrigin({padding: 8}),
  ],
});
```

Use `root.close(event, 'click')` for an imperative approved close. The root's
cancelable `floatingbeforeclose` event is the synchronous guard point; an
application with asynchronous confirmation should finish that work first and
then call `close()`.

## Native entry and exit animation

Native Popover and `<dialog>` surfaces close instantly unless their own CSS
explicitly includes a non-zero `display` or `overlay` transition with
`allow-discrete`. With that CSS present, the element remains mounted and
unhidden through the exit transition and is hidden after `transitionend`.

```css
.floating-panel {
  opacity: 0;
  translate: 0 -0.25rem;
  transform-origin: var(--floating-transform-origin, 50% 0%);
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

`transformOrigin()` writes the CSS variable from the final placement and
reference geometry. Keep it after placement-changing middleware; the CSS
fallback remains valid when it is omitted.

For a fixed placement, you may omit the middleware and define
`transform-origin` in CSS. CSS alone cannot observe `flip()` or `shift()`
results, so use `transformOrigin()` whenever the surface can move to another
side or alignment.

Template content stays mounted only while the native exit is running, and a
reopen cancels the pending unmount. Use `<floating-transition>` for a custom
surface with `top-layer="none"`. See the
[entry and exit animation guide](https://fup.polcaneli.com/docs/guides/animation)
for Popover, dialog, reduced-motion, and presence examples.

## Editable query

`<floating-query>` is the general searchable-result primitive. It supplies ARIA
combobox/listbox/option behavior and virtual focus by default. Inside a native
`<dialog>`, it automatically uses dialog semantics, so a Command palette does
not need `semantics="dialog"`. Set `semantics="dialog"` for a non-native
dialog surface or `semantics="none"` when the application owns ARIA itself.
It does not own a selected value or participate in form submission. Omit
`option-id-prefix` unless an application needs deterministic option IDs: unique
IDs are generated by default.

```html
<floating-root placement="bottom-start" interactions="click dismiss">
  <floating-list navigation loop allow-escape>
    <floating-query id="destination-query">
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

const query = document.querySelector<FloatingQueryElement>('#destination-query')!;

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

Place a standard `aria-live` region inside `<floating-query>` when status copy
is needed; it is discovered automatically. `status-selector` remains available
for an intentionally different target.

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
- [Entry and exit animation](https://fup.polcaneli.com/docs/guides/animation)
- [Query demos: fuzzy and server search](https://fup.polcaneli.com/docs/guides/demo/combobox/fuzzy)
- [Dismiss and before-close](https://fup.polcaneli.com/docs/guides/dismiss)
- [Usage recipes](https://fup.polcaneli.com/docs/guides/usage)
