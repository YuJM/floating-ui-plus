# Using `@floating-ui-plus/web-components`

Build accessible floating interfaces with Custom Elements. The elements own
their controller lifecycle and composition; you own the visible HTML and CSS.

## Install and register

```sh
bun add @floating-ui-plus/web-components
```

```ts
import '@floating-ui-plus/web-components';
```

Import the package once on the client. It is safe to import during SSR; DOM
behavior starts when elements connect.

For imperative setup, query and configure a root through its typed API:

```ts
import {
  FloatingRootElement,
  dismiss,
  offset,
} from '@floating-ui-plus/web-components';

const root = FloatingRootElement.query(document, '[data-settings-root]');
root.configure({middleware: [offset(8)], plugins: [dismiss()]});
const unsubscribe = root.on('openchange', ({open, reason}) => {
  console.log(open, reason);
});

// Later, when the application no longer needs the subscription:
unsubscribe();
```

`<floating-root>` supplies the default dialog ARIA relationship for its
reference and floating slots. Set `floating-role` for a tooltip, menu, listbox,
or another supported pattern; name dialog content using `aria-label` or
`aria-labelledby` with product-specific copy.

## Tooltip

For normal floating content, use one root-owned native template:

```html
<floating-root placement="top" interactions="hover focus dismiss">
  <floating-reference><button>Help</button></floating-reference>
  <template slot="content">
    <div role="tooltip">
      Describes the control.
      <floating-arrow></floating-arrow>
    </div>
  </template>
</floating-root>
```

## Popover and menu

Use a `slot="content"` template by default. It stays inert before Custom
Element registration, then becomes a native Popover on supported browsers, so
a page refresh cannot briefly reveal a closed surface.

```html
<floating-root
  placement="bottom-start"
  interactions="click dismiss"
  floating-role="dialog"
>
  <floating-reference><button>Open settings</button></floating-reference>
  <template slot="content">
    <section aria-label="Settings">
      Settings
      <button data-fup-close>Close</button>
    </section>
  </template>
</floating-root>
```

Use `<dialog slot="floating">` for a modal. A closed native dialog is already
hidden by the browser and automatically enters the modal top layer when opened;
no `top-layer` attribute or template is needed.

```html
<floating-root
  placement="bottom-start"
  interactions="click dismiss"
  floating-role="menu"
>
  <floating-reference><button>Actions</button></floating-reference>
  <template slot="content">
      <floating-list
        navigation
        typeahead
        loop
        item-selector="[role=menuitem]"
      >
        <button role="menuitem" data-fup-close>Edit</button>
        <button role="menuitem" data-fup-close>Duplicate</button>
      </floating-list>
  </template>
</floating-root>
```

`item-selector` discovers matching descendants in DOM order and uses
`data-label`, `aria-label`, or text content for typeahead. For richer item
metadata, `floating-list-item` still registers its first child explicitly.
The `navigation` attribute owns arrow-key focus and roving `tabIndex`;
`typeahead` uses registered labels; and `loop` wraps at either end. The list
exposes `activeIndex` and emits a bubbling `activeindexchange` event with
`{activeIndex}` when application state needs to follow it. Add `nested` to a
submenu list, and wrap related roots in `floating-tree` and `floating-node`.

`data-fup-close` delegates closing to the nearest owning floating surface and
preserves the source click and `click` reason in `openchange`. It also works in
fresh native-template clones, so close controls do not need a mount listener.

### Native templates

Put a native `<template slot="content">` below the logical floating root for a
conditional floating surface. The root imports the template fragment when it
opens and removes the fresh clone when it closes. Supported browsers promote
the clone to a native Popover; older browsers use the positioned fallback.

```html
<template slot="content">
  <section>
    Conditional content
    <button data-fup-close>Close</button>
  </section>
</template>
```

The template emits bubbling, composed `floatingmount` and `floatingunmount`
events with `{root, template, element}`. Use them only for application-specific
initialization of each fresh clone; close controls and declarative lists do not
need mount listeners.

`root.on('floatingmount', ({element}) => {})` subscribes only to clones owned by
that root and returns its cleanup function. Nested roots do not leak their
`openchange` or content lifecycle events into this convenience subscription.

When a portal owns multiple templates, use `slot="content"` on exactly one.
`data-fup-content` remains a compatibility alias. Each content template must
contain exactly one top-level HTMLElement; whitespace and comments around it
are allowed. `floating-content` remains available only for advanced
always-mounted composition.

## Modal dialog

On current browsers, prefer the native dialog surface when a portal is not
required:

```html
<floating-root interactions="click" floating-role="dialog">
  <floating-reference><button>Open settings</button></floating-reference>
  <dialog slot="floating" aria-label="Account settings">
    …
    <button data-fup-close>Close</button>
  </dialog>
</floating-root>
```

Combine a portal, overlay, and focus manager. `modal`, `return-focus`, and
`outside-elements-inert` make focus behavior explicit; `lock-scroll` controls
the document scroll lock.

```html
<floating-root interactions="click dismiss" floating-role="dialog">
  <floating-reference><button>Open settings</button></floating-reference>
  <floating-portal>
    <floating-overlay lock-scroll>
      <floating-focus-manager modal return-focus outside-elements-inert>
        <template slot="content">
          <section aria-label="Account settings">
            …
            <button data-fup-close>Close</button>
          </section>
        </template>
      </floating-focus-manager>
    </floating-overlay>
  </floating-portal>
</floating-root>
```

## Editable fuzzy-search combobox

The combobox creates and owns a `SearchController` from search options. It
exposes a neutral `phase` of `idle`, `loading`, `error`, `empty`, or `results`.
`<floating-combobox>` owns
editable-input ARIA, virtual focus, Enter selection, and status updates.
`<floating-search>` renders application-owned native templates.

External query presets can stay outside the option list. Set
`query-trigger-selector` on `<floating-combobox>` and give each matching button
a `value`; the component applies the query and restores input focus without
requiring application event listeners.

```html
<floating-root placement="bottom-start">
  <floating-list navigation loop allow-escape>
    <floating-combobox name="destination" data-destination-combobox>
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
  type FloatingComboboxElement,
} from '@floating-ui-plus/web-components';

const combobox = document.querySelector<FloatingComboboxElement>(
  '[data-destination-combobox]',
)!;
combobox.configure({
  search: {
    source: createFuzzySearchSource(destinations, {keys: searchKeys}),
    getItemKey: (destination) => destination.id,
  },
  getItemLabel: (item) => item.label,
  // Submitted as FormData `destination`, independently from the visible label.
  getItemValue: (item) => item.id,
  status: {
    closed: 'Suggestions closed',
    idle: 'Search examples available',
    loading: 'Searching',
    error: 'Search failed',
    empty: ({search}) => `No match for ${search.query}`,
    results: ({search}) => `${search.items.length} options`,
  },
});
```

`floating-combobox` is form-associated. Put `name`, `required`, or `disabled`
on the element itself, not the text input: the selected item's
`getItemValue()` is submitted with `new FormData(form)`, constraint validation
uses the selection, and `form.reset()` restores `selectedItem`.

For server-side search, replace only the source with the async adapter:

```ts
import {createAsyncSearchSource} from '@floating-ui-plus/web-components';

combobox.configure({
  search: {
    source: createAsyncSearchSource({
      async search({query, signal, limit, cursor}) {
        return fetchDestinationPage({query, signal, limit, cursor});
      },
    }),
    getItemKey: (destination) => destination.id,
    debounceMs: 200,
  },
  getItemLabel: (destination) => destination.label,
});
```

Both source factories implement `SearchSource<T>`. Pass an existing
`SearchController` to `configure()` only when its state or lifecycle must be
shared outside the element.

The result template is repeated once per search item. Every generated
`floating-list-item` receives its `label` and `value` automatically.
`data-search-text="label"` reads an item field; `$query`, `$index`, `$count`,
and `$error` read search metadata.

Use the lower-level re-exported `createSearchRenderer()` when native templates
are not appropriate for a direct DOM integration.

## Configure values in JavaScript

Use attributes for strings and booleans. Assign middleware, plugins, virtual
references, service objects, and item values as element properties.

```ts
import {
  dismiss,
  flip,
  offset,
  shift,
  type FloatingRootElement,
} from '@floating-ui-plus/web-components';

const root = document.querySelector<FloatingRootElement>('floating-root')!;
root.configure({
  middleware: [offset(8), flip(), shift({padding: 12})],
  plugins: [dismiss()],
});
root.addEventListener('openchange', ({detail}) => {
  console.log(detail.open, detail.reason);
});
```

The `openchange` event bubbles across shadow boundaries. Bind it when the
application needs to mirror the component's open state.

## Keyboard collections

Use `floating-composite` and `floating-composite-item` for roving focus among
visible controls. Use `floating-list` for ordered-item metadata and
`floating-tree` / `floating-node` for nested relationships. They can be
combined within a `floating-root` according to the interaction you are
building.

## Framework-neutral APIs

This package re-exports the public APIs from `@floating-ui-plus/web`, including
positioning middleware and interaction plugins. Import them from this package
when configuring Custom Elements; no separate framework dependency is needed.
