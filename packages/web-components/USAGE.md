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

`<floating-root>` supplies the default dialog ARIA relationship for its
reference and floating slots. Set `floating-role` for a tooltip, menu, listbox,
or another supported pattern; name dialog content using `aria-label` or
`aria-labelledby` with product-specific copy.

## Tooltip

For a compact template, use the named slots on `floating-root`:

```html
<floating-root placement="top" interactions="hover focus dismiss">
  <button slot="reference">Help</button>
  <div slot="floating" role="tooltip">
    Describes the control.
    <floating-arrow></floating-arrow>
  </div>
</floating-root>
```

## Popover and menu

Use explicit child elements when the floating surface needs a portal, focus
manager, overlay, list, or other composition.

```html
<floating-root placement="bottom-start" interactions="click dismiss" floating-role="menu">
  <floating-reference><button>Actions</button></floating-reference>
  <floating-portal>
    <floating-content>
      <template>
        <floating-list>
          <floating-list-item label="Edit"><button role="menuitem">Edit</button></floating-list-item>
          <floating-list-item label="Duplicate"><button role="menuitem">Duplicate</button></floating-list-item>
        </floating-list>
      </template>
    </floating-content>
  </floating-portal>
</floating-root>
```

`floating-list-item` registers its first child with the nearest
`floating-list`. Add `floating-tree` and `floating-node` around related roots
when menus can nest.

### Conditional native templates

Put a direct native `<template>` inside `floating-content` when closed content
must not be parsed into the live document, upgraded, or painted. The template
remains an inert blueprint. `floating-content` clones its `content` into Light
DOM when the nearest root opens and removes that clone when it closes.

```ts
import type {FloatingContentElement} from '@floating-ui-plus/web-components';

const content = document.querySelector<FloatingContentElement>(
  'floating-content',
)!;

// The inert blueprint remains available while the rendered clone is mounted.
const blueprint = content.content;

// Delegate events from fresh clones through the stable component host.
content.addEventListener('click', (event) => {
  if (
    event.target instanceof Element &&
    event.target.closest('[data-close]')
  ) {
    // Close the floating root.
  }
});
```

Listeners attached directly to nodes inside `content` are not copied by
`cloneNode()`. Delegate them from `floating-content`, or initialize each
rendered clone when it mounts. Direct, non-template children remain supported;
after the component upgrades they are slotted and bound only while open. Use a
native template when preventing pre-upgrade paint is required.

## Modal dialog

Combine a portal, overlay, and focus manager. `modal`, `return-focus`, and
`outside-elements-inert` make focus behavior explicit; `lock-scroll` controls
the document scroll lock.

```html
<floating-root interactions="click dismiss" floating-role="dialog">
  <floating-reference><button>Open settings</button></floating-reference>
  <floating-portal>
    <floating-overlay lock-scroll>
      <floating-focus-manager modal return-focus outside-elements-inert>
        <floating-content>
          <template>
            <section aria-label="Account settings">…</section>
          </template>
        </floating-content>
      </floating-focus-manager>
    </floating-overlay>
  </floating-portal>
</floating-root>
```

## Configure values in JavaScript

Use attributes for strings and booleans. Assign middleware, plugins, virtual
references, service objects, and item values as element properties.

```ts
import {
  flip,
  offset,
  shift,
  type FloatingRootElement,
} from '@floating-ui-plus/web-components';

const root = document.querySelector<FloatingRootElement>('floating-root')!;
root.middleware = [offset(8), flip(), shift({padding: 12})];
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
