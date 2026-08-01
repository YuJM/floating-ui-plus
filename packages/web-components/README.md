# `@floating-ui-plus/web-components`

Custom Elements for accessible floating interfaces. Use this package when your
application is HTML-first or needs framework-independent UI primitives.
The elements are implemented with Atomico while exposing standard Custom
Element APIs to consumers.

## Why this package exists

Floating UI Plus builds on Floating UI's positioning engine and brings the
interaction layer—dismissal, focus, trees, collections, portals, and search—to
Custom Elements. It offers comparable behavior outside React while keeping the
HTML and ARIA structure in your application.

## How this differs from Floating UI

`@floating-ui/dom` gives you geometry and middleware. This package keeps that
engine underneath, then adds a Custom Element composition layer around it:

| Concern | Floating UI primitives | Floating UI Plus Web Components |
| --- | --- | --- |
| Positioning | `computePosition()` and middleware | `<floating-root>` attributes plus the same middleware and positioning data |
| Interaction | Consumer-managed event wiring | `interactions="click dismiss"`, roles, focus management, lists, and nested trees |
| Portals and modal behavior | Consumer-managed DOM and focus | `<floating-portal>`, `<floating-overlay>`, and `<floating-focus-manager>` preserve context across layers |
| Search | No query/data controller | `SearchController`, fuzzy sources, and declarative `<floating-combobox>` composition |
| Rendering | No elements | Native Custom Elements that keep your light-DOM markup, classes, labels, and ARIA |

This is not a pre-styled component library. The elements coordinate behavior;
your HTML remains the visual and semantic contract. `<floating-combobox>` is a
renderless behavior element: it automates input, search, navigation, selection,
and ARIA while the application keeps control of result markup.

## Install

```sh
npm install @floating-ui-plus/web-components
pnpm add @floating-ui-plus/web-components
bun add @floating-ui-plus/web-components
```

Import once to register the elements:

```ts
import '@floating-ui-plus/web-components';
```

For complete templates and programmatic configuration, see the
[usage guide](./USAGE.md).

## Start with a popover

```html
<floating-root
  placement="bottom-start"
  interactions="click dismiss"
  floating-role="dialog"
>
  <floating-reference>
    <button>Open settings</button>
  </floating-reference>

  <template slot="content">
    <section aria-label="Settings">
      Popover content
      <button data-fup-close>Close</button>
    </section>
  </template>
</floating-root>
```

Use a root-owned `<template slot="content">` for normal floating surfaces. The
browser keeps it inert before Custom Element registration, and the root creates
a fresh native Popover only while it is open. Use a real `<dialog slot="floating">`
for a modal: a closed native dialog is already hidden by the browser and
automatically provides modal focus and inertness.

`open` reflects to an attribute. User actions emit a bubbling, composed
`openchange` event whose detail contains `open` and `reason`.
`data-fup-close` closes the surface that owns the marked control, including
fresh clones created from a native template.

For imperative code, call the root method instead of adding
`data-fup-close`:

```ts
import type {FloatingRootElement} from '@floating-ui-plus/web-components';

const root = document.querySelector<FloatingRootElement>('floating-root');
root?.close();
```

`root.close(event, reason)` uses the same controller path as the attribute,
including `openchange` and focus restoration. Keep a user event when one is
available (`root.close(event, 'click')`) so consumers can inspect its source;
do not call a native dialog's `.close()` directly because that bypasses the
Floating UI Plus controller state.

Every close request emits a cancelable `floatingbeforeclose` event first. Use
it for synchronous validation or analytics before the surface closes:

```ts
root.addEventListener('floatingbeforeclose', (event) => {
  if (!canClose()) event.preventDefault();
  sendCloseMetric(event.detail.reason);
});
```

Its detail contains `reason` and `sourceEvent`. A canceled event keeps the
surface open and suppresses `openchange`; asynchronous approval is not built
in, so finish the async work and call `root.close()` afterward.

For an anchored non-modal surface, a `floating-root` with a `dialog`, `menu`,
or `listbox` role promotes its root-owned content template to the native
Popover API where supported. Keep that template as a child of the root; no
`floating-portal` is required for the normal case. For a modal, use a real
`<dialog>` as the content surface so the browser owns `showModal()`, focus, and
inertness. Reserve `floating-portal` for a body-level layer that is explicitly
needed, such as a nested surface escaping a clipping ancestor.

## Component API

The elements are headless composition pieces. They preserve your light-DOM
markup and classes while binding the nearest `floating-root` controller.

| Element | Main attributes / properties | Role |
| --- | --- | --- |
| `floating-root` | `open`, `placement`, `strategy`, `transform`, `interactions`, `floating-role`; properties `middleware`, `plugins`; methods `configure()`, `on()`, `close()`, static `query()` | Owns one reference/surface controller |
| `floating-reference` | First light-DOM child | Binds the child to the root reference and interaction attributes |
| `floating-item` | `active`, `selected`, `index` | Applies interaction attributes to its first child |
| `floating-portal` | `to`, `disabled`; property `target` | Moves non-native children to `body`, a selector target, or a nested portal target while preserving context |
| `floating-content` | optional `top-layer` escape hatch | Advanced always-mounted floating surface; use a root-owned content template for the default conditional surface |
| `floating-overlay` | `lock-scroll` | Provides a fixed overlay and optional document scroll lock |
| `floating-focus-manager` | `enabled`, `modal`, `initial-focus`, `return-focus`, `outside-elements-inert` | Connects focus trapping, focus restoration, and inert outside elements |
| `floating-arrow` | `width`, `height`, `static-offset`, `rotation` | Registers arrow geometry and renders the default or slotted SVG |
| `floating-transition` | No required attributes | Reflects the nearest root's open/close state as `data-status` for CSS |
| `floating-combobox` | `name`, `required`, `disabled`, `input-selector`, `item-label-key`, `option-id-prefix`, `query-trigger-selector`, `status-selector`; properties `search`, `getItemKey`, `getItemValue`, `getItemLabel`, `selectedItem`, `configure()` | Form-associated editable combobox with search, virtual focus, selection, status, query presets, and combobox ARIA |
| `floating-search` | Native phase templates and `data-search-text` bindings | Repeats result templates and automatically supplies list-item labels and values |

`floating-combobox` is form-associated. Give it a `name` and configure
`getItemValue()` when the submitted identifier differs from the visible label.
With `required`, an empty selection participates in native constraint
validation; form reset restores the `selectedItem` given to `configure()`, its
input label, and submitted value. This happens on the Custom Element itself,
so no hidden input or form-event listener is needed.

`floating-root` also exposes `controller`, `referenceElement`,
`floatingElement`, and `contentTemplate` properties for imperative integration.
Use `root.configure({middleware, plugins})` to set application-owned function
values together, or `root.use(...plugins)` to append long-lived plugins.
Use `FloatingRootElement.query(scope, selector)` for a checked, typed lookup,
`root.on(type, listener)` for an own-root subscription with cleanup, and
`root.close(event, reason)` to dismiss through the controller contract.
`openchange` has the shape `{open, reason, sourceEvent}` and is composed across
shadow boundaries.

The collection elements form a second layer of the API:

| Element | Main attributes / properties | Role |
| --- | --- | --- |
| `floating-tree` / `floating-node` | `node-id`, optional `parent-id` | Coordinate nested roots and restore parent focus |
| `floating-list` | `navigation`, `typeahead`, `loop`, `nested`, `virtual`, `allow-escape`, `item-selector`; property `activeIndex` | Register ordered items and own keyboard navigation or virtual-focus navigation |
| `floating-list-item` | `item-id`, `label`; properties `value`, `list` | Register a first child with a list and automatically bind option behavior inside a combobox |
| `floating-composite` | `orientation`, `loop`, `cols`, `rtl` | Own roving focus for grids and composite widgets |
| `floating-delay-group` / `next-floating-delay-group` | `delay`, `timeout-ms`; property `group` | Share hover/focus delays across related roots |

`floating-list` emits `activeindexchange` with `{activeIndex}`. Portal content
templates emit `floatingmount` and `floatingunmount` with `{root, template,
element}` when a fresh clone is created or removed.

## Components

| Need | Elements |
| --- | --- |
| Reference and floating surface | `floating-root`, `floating-reference`, native `<template slot="content">` |
| Portal, arrow, overlay, and focus | `floating-portal`, `floating-arrow`, `floating-overlay`, `floating-focus-manager` |
| Nested menus and collections | `floating-tree`, `floating-node`, `floating-list`, `floating-list-item` |
| Editable fuzzy-search combobox | `floating-combobox`, `floating-search`, `floating-list`, `floating-list-item` |
| Roving keyboard focus | `floating-composite`, `floating-composite-item` |
| Coordinated hover delays and presence | `floating-delay-group`, `floating-transition` |

For a small tooltip, `floating-root` also supports `reference` and `floating`
named slots.

## Declarative menu navigation

`floating-list` can own its registered items' active index, roving tab index,
arrow-key navigation, and typeahead:

```html
<floating-list
  navigation
  typeahead
  loop
  item-selector="[role=menuitem]"
>
  <button role="menuitem" data-fup-close>Edit</button>
  <button role="menuitem" data-fup-close>Duplicate</button>
</floating-list>
```

`item-selector` discovers matching descendants in DOM order and uses
`data-label`, `aria-label`, or text content for typeahead. Use explicit
`floating-list-item` wrappers instead when items need custom labels, values,
or list instances.

Read `activeIndex` or listen for the bubbling `activeindexchange` event only
when the application needs to mirror navigation state. Set `virtual` when DOM
focus must stay on an input and `aria-activedescendant` represents the active
item, as in an editable combobox. `allow-escape` lets arrow navigation return
to no active item at the list boundary.

## Search and combobox behavior with Custom Elements

`@floating-ui-plus/web-components` re-exports the framework-neutral search
types and fuzzy source. Local fuzzy search uses `createFuzzySearchSource()`;
server search receives an application-owned async request function directly,
so the package does not choose the network client or protocol.
`<floating-combobox>` binds the input, IME composition, active option, Enter
selection, and ARIA through the shared Web binding contract. It automatically
puts the nearest `<floating-list>` into virtual-focus mode, so arrow navigation
does not move DOM focus. Each `<floating-list-item>` registers and binds its
first child as an option. `<floating-search>` renders native templates for the
five search phases, repeats the result template, binds text fields, and assigns
each generated list item's label and value. The application only supplies
search data, status copy, and markup.

When a request starts with existing items, `floating-search` keeps rendering
its result template, sets `data-phase="results"` and `data-loading="true"`,
and lets the associated combobox/input expose the same busy state. The
standalone loading template is only used while the result set is empty.

```html
<floating-root data-root placement="bottom-start">
  <floating-list navigation loop allow-escape>
    <floating-combobox data-combobox option-id-prefix="destination-option">
      <floating-reference>
        <input aria-label="Destination" autocomplete="off" />
      </floating-reference>

      <template slot="content">
          <div aria-label="Destination suggestions">
            <floating-search>
              <template data-search-loading><p>Searching…</p></template>
              <template data-search-error><p>Search failed.</p></template>
              <template data-search-empty>
                <p>No match for <span data-search-text="$query"></span></p>
              </template>
              <template data-search-result>
                <floating-list-item>
                  <div>
                    <strong data-search-text="label"></strong>
                    <small data-search-text="region"></small>
                  </div>
                </floating-list-item>
              </template>
            </floating-search>
          </div>
      </template>
      <p data-combobox-status aria-live="polite"></p>
    </floating-combobox>
  </floating-list>
</floating-root>
```

```ts
import {
  createFuzzySearchSource,
  dismiss,
  flip,
  offset,
  shift,
  type FloatingComboboxElement,
  type FloatingRootElement,
} from '@floating-ui-plus/web-components';

const root = document.querySelector<FloatingRootElement>('[data-root]')!;
const combobox = document.querySelector<FloatingComboboxElement>('[data-combobox]')!;
combobox.configure<MultilingualDestination>({
  search: {
    source: createFuzzySearchSource(multilingualDestinations, {
      keys: multilingualSearchKeys,
      threshold: 0.35,
    }),
    getItemKey: (item) => item.id,
    debounceMs: 0,
  },
  getItemLabel: (item) => item.label,
  status: {
    closed: 'Suggestions closed',
    idle: 'Start typing to search',
    loading: 'Searching',
    error: 'Search failed',
    empty: ({search}) => `No match for ${search.query}`,
    results: ({search}) => `${search.items.length} options`,
  },
});

root.configure({
  middleware: [offset(8), flip(), shift({padding: 18})],
  plugins: [dismiss()],
});
```

When `configure()` receives search options, the element creates and owns the
`SearchController`. To use server-side search, only replace the source:

```ts
combobox.configure<MultilingualDestination>({
  search: {
    source: async ({query, signal, limit, cursor}) => {
      const url = new URL('/api/destinations', location.origin);
      url.searchParams.set('q', query);
      url.searchParams.set('limit', String(limit));
      if (cursor) url.searchParams.set('cursor', cursor);
      const response = await fetch(url, {signal});
      return response.json();
    },
    getItemKey: (item) => item.id,
    debounceMs: 200,
  },
  getItemLabel: (item) => item.label,
});
```

Pass an existing `SearchController` instead when the application needs to
share it or own its lifecycle. `SearchController` provides debounce, IME-safe
queries, cancellation of stale
requests, TTL caching, de-duplication, and cursor pagination. Its `phase`
distinguishes `idle`, `loading`, `error`, `empty`, and `results`, while the
application owns the matching markup and copy. It also exposes `items`, `hits`,
`loading`, `error`, `hasMore`, `total`, and `nextCursor`; use `hits` when you
need fuzzy scores or match ranges for highlighting. For a server-owned query
library, omit `source` and push results through `setControlledState()`.

Use `combobox.setQuery()` for programmatic query changes and
`combobox.search?.loadMore()` for cursor pagination. To render this declaratively,
add `template[data-search-more]` beside the result template and mark its page
button with `data-search-load-more`; it appears only while `hasMore` is true.
`$count` and `$total` bind the loaded and total record counts. The element attempts the initial
refresh (respecting `minQueryLength`) and releases its internal bindings when
disconnected. `<floating-combobox>` reflects the same lifecycle with
`data-loading` and `aria-busy`, and synchronizes those attributes on its bound
input. The editable input intentionally stays outside
`<floating-focus-manager>`: virtual focus
keeps keyboard focus on the input while `aria-activedescendant` identifies the
active option. `<floating-root>` still owns placement and the application still
decides how every result looks.

For declarative query presets outside the result list, set
`query-trigger-selector` to a selector in the same document or shadow root and
put the query in each matching button's `value`. Clicking a preset updates the
query, opens the results, and returns focus to the input. Do not wrap presets
in `<floating-list-item>`: list items are selectable result options.

`data-search-text="label"` reads an item field. `$query`, `$index`, `$count`,
`$total`, and `$error` expose search metadata. For lower-level direct DOM integrations,
the re-exported `createSearchRenderer()` remains available.

## Arrow defaults and customization

`floating-arrow` provides a default SVG triangle. Its sizing, separation, and
automatic placement rotation
from the floating surface are its own properties, rather than properties on
the parent surface. It is marked with the exported
`FLOATING_UI_PLUS_ARROW_ATTRIBUTE` (`data-fup-arrow`):

```html
<floating-arrow width="14" height="7" static-offset="-7"></floating-arrow>
```

`floating-arrow` publishes its height to the Plus controller. The number passed
to `offset()` is therefore the desired visual gap; the Arrow height is added
automatically:

```ts
const GAP = 3;

root.middleware = [
  offset(GAP),
  shift({padding: 8}),
  arrow({element: root.querySelector('floating-arrow')!}),
];
```

Use `width`, `height`, and `static-offset` as element properties when values
are dynamic. The default SVG exposes `svg` and `path` parts. The component's
default slot accepts a complete custom SVG, so applications can replace its
appearance without changing positioning:

```html
<floating-arrow width="18" height="9" static-offset="-9">
  <svg viewBox="0 0 18 9" aria-hidden="true">
    <path d="M0 9L9 0L18 9Z"></path>
  </svg>
</floating-arrow>
```

Set `rotation="none"` when a custom SVG already points in its final direction.

```css
floating-arrow::part(path) { fill: rebeccapurple; }
```

## Configure JavaScript values as properties

Attributes are ideal for strings and booleans. Assign middleware, plugins,
virtual references, and object values as properties:

```ts
import {flip, offset, shift, type FloatingRootElement} from '@floating-ui-plus/web-components';

const root = document.querySelector<FloatingRootElement>('floating-root')!;
root.middleware = [offset(8), flip(), shift({padding: 12})];
root.addEventListener('openchange', ({detail}) => {
  console.log(detail.open, detail.reason);
});
```

The framework-neutral exports from `@floating-ui-plus/web` are re-exported,
so positioning middleware and interaction plugins come from the same import.
All constructors are also exported for scoped registries and tests.

## Modal pattern

For the modal shown in the demo, keep the surface in the same root and use a
native dialog:

```html
<floating-root placement="bottom" strategy="fixed" interactions="click dismiss">
  <floating-reference>
    <button>Open account settings</button>
  </floating-reference>

  <dialog slot="floating" aria-labelledby="account-settings-title">
    <h2 id="account-settings-title">Account settings</h2>
    <p>The browser owns modal focus, inertness, Escape, and the top layer.</p>
    <button data-fup-close>Close</button>
  </dialog>
</floating-root>
```

Use a root-owned `<template slot="content">` for ordinary anchored popovers;
the demo intentionally does not wrap those surfaces in a portal. Add
`<floating-overlay>` and `<floating-focus-manager>` only when you need a
non-native or custom modal composition. Use `<floating-portal>` only when a
body-level target is explicitly needed, such as escaping a clipping ancestor;
it still accepts the `slot="content"` contract, and `data-fup-content` remains
a compatibility alias when a portal owns multiple templates.

Imports are SSR-safe. Positioning, portals, observers, and focus management
start only after the corresponding elements connect.
