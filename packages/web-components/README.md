# `@floating-ui-plus/web-components`

Custom Elements for accessible floating interfaces. Use this package when your
application is HTML-first or needs framework-independent UI primitives.

## Install

```sh
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

  <floating-portal>
    <floating-content>
      <section aria-label="Settings">Popover content</section>
    </floating-content>
  </floating-portal>
</floating-root>
```

`open` reflects to an attribute. User actions emit a bubbling, composed
`openchange` event whose detail contains `open` and `reason`.

## Components

| Need | Elements |
| --- | --- |
| Reference and floating surface | `floating-root`, `floating-reference`, `floating-content` |
| Portal, arrow, overlay, and focus | `floating-portal`, `floating-arrow`, `floating-overlay`, `floating-focus-manager` |
| Nested menus and collections | `floating-tree`, `floating-node`, `floating-list`, `floating-list-item` |
| Roving keyboard focus | `floating-composite`, `floating-composite-item` |
| Coordinated hover delays and presence | `floating-delay-group`, `floating-transition` |

For a small tooltip, `floating-root` also supports `reference` and `floating`
named slots.

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

Wrap dialog content with an overlay and focus manager:

```html
<floating-portal>
  <floating-overlay lock-scroll>
    <floating-focus-manager modal return-focus outside-elements-inert>
      <floating-content><section aria-label="Account settings">…</section></floating-content>
    </floating-focus-manager>
  </floating-overlay>
</floating-portal>
```

Imports are SSR-safe. Positioning, portals, observers, and focus management
start only after the corresponding elements connect.
