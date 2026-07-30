# `@floating-ui-plus/web-components`

Lit-powered, headless Custom Elements for `@floating-ui-plus/web`.

The package exposes components rather than Lit directives or reactive
controllers. Importing the package registers every element; all constructors
are also exported for scoped registries and testing.

## Component API

| Composition | Custom Elements |
| --- | --- |
| Positioning root | `floating-root`, `floating-reference`, `floating-content`, `floating-item` |
| Surfaces | `floating-portal`, `floating-overlay`, `floating-arrow`, `floating-focus-manager`, `floating-transition` |
| Collections | `floating-tree`, `floating-node`, `floating-list`, `floating-list-item` |
| Coordination | `floating-delay-group`, `next-floating-delay-group` |
| Keyboard composites | `floating-composite`, `floating-composite-item` |

These components correspond to the component layer in
`@floating-ui-plus/vue`: `FloatingRoot`, `FloatingReference`,
`FloatingContent`, `FloatingPortal`, `FloatingFocusManager`, collections, and
transitions.

## Popover

```html
<floating-root
  placement="bottom-start"
  interactions="click dismiss"
  floating-role="dialog"
>
  <floating-reference>
    <button>Open</button>
  </floating-reference>

  <floating-portal>
    <floating-content>
      <section>Popover content</section>
    </floating-content>
  </floating-portal>
</floating-root>

<script type="module">
  import '@floating-ui-plus/web-components';
  import {
    flip,
    offset,
    shift,
  } from '@floating-ui-plus/web-components';

  const root = document.querySelector('floating-root');
  root.middleware = [offset(8), flip(), shift({padding: 12})];
  root.addEventListener('openchange', ({detail}) => {
    console.log(detail.open, detail.reason);
  });
</script>
```

`open` reflects to an attribute. User-driven changes dispatch the bubbling and
composed `openchange` event. Simple interactions can be listed in the
`interactions` attribute; configured or application-specific plugins use the
`plugins` property.

## Modal

```html
<floating-root interactions="click dismiss" floating-role="dialog">
  <floating-reference>
    <button>Open modal</button>
  </floating-reference>

  <floating-portal>
    <floating-overlay lock-scroll>
      <floating-focus-manager
        modal
        return-focus
        outside-elements-inert
      >
        <floating-content>
          <section aria-label="Account settings">...</section>
        </floating-content>
      </floating-focus-manager>
    </floating-overlay>
  </floating-portal>
</floating-root>
```

## Lists and trees

`floating-list-item` registers its first child with the nearest
`floating-list`. `floating-tree` and `floating-node` coordinate nested roots.
`floating-composite` provides roving keyboard focus for
`floating-composite-item` children.

```html
<floating-root>
  <floating-list>
    <floating-list-item label="First">
      <button>First</button>
    </floating-list-item>
    <floating-list-item label="Second">
      <button>Second</button>
    </floating-list-item>
  </floating-list>
</floating-root>
```

The components use Lit Context internally so composition survives component
boundaries and portals. Consumers do not depend on Lit APIs.

## Concise named-slot form

For small templates, `floating-root` also accepts direct named slots:

```html
<floating-root placement="top" interactions="hover focus dismiss">
  <button slot="reference">Help</button>
  <div slot="floating" role="tooltip">
    Help text
    <floating-arrow></floating-arrow>
  </div>
</floating-root>
```

## Programmatic values

HTML attributes cover strings and booleans. Middleware, plugins, virtual
references, service objects, and item values are properties:

```ts
import {
  clientPoint,
  hover,
  offset,
  type FloatingRootElement,
} from '@floating-ui-plus/web-components';

const root = document.querySelector<FloatingRootElement>('floating-root')!;
root.middleware = [offset(16)];
root.plugins = [hover({move: true}), clientPoint()];
await root.updatePosition();
```

The framework-neutral Web exports—positioning middleware, interactions,
search, focus, lists, trees, and portal utilities—are re-exported. The former
Lit `FloatingController`, `SearchController` adapter, and directive helpers are
not part of the package export map.

Runtime browser support follows Lit 3. Initial rendering is SSR-safe; DOM
connection, positioning, observers, portals, and focus management begin after
the elements connect.
