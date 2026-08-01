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

  <floating-portal>
    <template>
      <section aria-label="Settings">
        Popover content
        <button data-fup-close>Close</button>
      </section>
    </template>
  </floating-portal>
</floating-root>
```

`open` reflects to an attribute. User actions emit a bubbling, composed
`openchange` event whose detail contains `open` and `reason`.
`data-fup-close` closes the surface that owns the marked control, including
fresh clones created from a native template.

## Component API

The elements are headless composition pieces. They preserve your light-DOM
markup and classes while binding the nearest `floating-root` controller.

| Element | Main attributes / properties | Role |
| --- | --- | --- |
| `floating-root` | `open`, `placement`, `strategy`, `transform`, `interactions`, `floating-role`; properties `middleware`, `plugins` | Owns one reference/surface controller and the baseline dialog ARIA relationship |
| `floating-reference` | First light-DOM child | Binds the child to the root reference and interaction attributes |
| `floating-portal` | `to`, `disabled`; property `target` | Moves children to `body`, a selector target, or a nested portal target while preserving context |
| `floating-overlay` | `lock-scroll` | Provides a fixed overlay and optional document scroll lock |
| `floating-focus-manager` | `enabled`, `modal`, `initial-focus`, `return-focus`, `outside-elements-inert` | Connects focus trapping, focus restoration, and inert outside elements |
| `floating-arrow` | `width`, `height`, `static-offset`, `rotation` | Registers arrow geometry and renders the default or slotted SVG |
| `floating-transition` | No required attributes | Reflects the nearest root's open/close state as `data-status` for CSS |
| `floating-combobox` | `input-selector`, `item-label-key`, `option-id-prefix`; properties `search`, `getItemKey`, `getItemLabel`, `selectedItem` | Connects an editable input, search state, virtual-focus list, selection, and combobox ARIA |

`floating-root` also exposes `controller`, `referenceElement`,
`floatingElement`, and `contentTemplate` properties for imperative integration.
Use `root.use(...plugins)` for long-lived plugins, or assign `root.plugins` and
`root.middleware` when the application owns those values. `openchange` has the
shape `{open, reason, sourceEvent}` and is composed across shadow boundaries.

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
| Reference and floating surface | `floating-root`, `floating-reference`, native `template` |
| Portal, arrow, overlay, and focus | `floating-portal`, `floating-arrow`, `floating-overlay`, `floating-focus-manager` |
| Nested menus and collections | `floating-tree`, `floating-node`, `floating-list`, `floating-list-item` |
| Editable fuzzy-search combobox | `floating-combobox`, `floating-list`, `floating-list-item` |
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

`@floating-ui-plus/web-components` re-exports `SearchController` and
`createFuzzySearchSource()` from the framework-neutral package.
`<floating-combobox>` binds the input, IME composition, active option, Enter
selection, and ARIA through the shared Web binding contract. It automatically
puts the nearest `<floating-list>` into virtual-focus mode, so arrow navigation
does not move DOM focus. Each `<floating-list-item>` registers and binds its
first child as an option. The application only supplies search data and result
markup.

```html
<floating-root data-root placement="bottom-start">
  <floating-list navigation loop allow-escape>
    <floating-combobox data-combobox option-id-prefix="destination-option">
      <floating-reference>
        <input aria-label="Destination" autocomplete="off" />
      </floating-reference>

      <floating-portal>
        <template data-options-template>
          <div aria-label="Destination suggestions"></div>
        </template>
      </floating-portal>
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
  SearchController,
  type FloatingComboboxElement,
  type FloatingRootElement,
} from '@floating-ui-plus/web-components';

const source = createFuzzySearchSource(multilingualDestinations, {
  keys: multilingualSearchKeys,
  threshold: 0.35,
});
const search = new SearchController<MultilingualDestination>({
  source,
  getItemKey: (item) => item.id,
  debounceMs: 0,
});

const root = document.querySelector<FloatingRootElement>('[data-root]')!;
const combobox = document.querySelector<FloatingComboboxElement>(
  '[data-combobox]',
)!;
combobox.search = search as SearchController<unknown>;

root.middleware = [offset(8), flip(), shift({padding: 18})];
root.plugins = [dismiss()];

function render(items: MultilingualDestination[], container: HTMLElement) {
  container.replaceChildren(
    ...items.map((item) => {
      const listItem = document.createElement('floating-list-item');
      listItem.label = item.label;
      listItem.value = item;

      const option = document.createElement('div');
      option.textContent = item.label;
      listItem.append(option);
      return listItem;
    }),
  );
}

let options: HTMLElement | null = null;
document
  .querySelector<HTMLTemplateElement>('[data-options-template]')!
  .addEventListener('floatingmount', (event) => {
    options = (event as CustomEvent<{element: HTMLElement}>).detail.element;
    render(search.items, options);
  });
combobox.addEventListener('comboboxstatechange', () => {
  if (options) render(search.items, options);
});
```

`SearchController` provides debounce, IME-safe queries, cancellation of stale
requests, TTL caching, de-duplication, and cursor pagination. It exposes
`items`, `hits`, `loading`, `error`, `hasMore`, `total`, and `nextCursor`; use
`hits` when you need fuzzy scores or match ranges for highlighting. For a
server-owned query library, omit `source` and push results through
`setControlledState()`.

Use `combobox.setQuery()` for programmatic query changes and
`search.loadMore()` for cursor pagination. The element performs the initial
refresh and releases its internal bindings when disconnected. The editable
input intentionally stays outside `<floating-focus-manager>`: virtual focus
keeps keyboard focus on the input while `aria-activedescendant` identifies the
active option. `<floating-root>` still owns placement and the application still
decides how every result looks.

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

Wrap dialog content with an overlay and focus manager:

```html
<floating-portal>
  <floating-overlay lock-scroll>
    <floating-focus-manager modal return-focus outside-elements-inert>
      <template><section aria-label="Account settings">…</section></template>
    </floating-focus-manager>
  </floating-overlay>
</floating-portal>
```

`floating-portal` automatically marks its single owned template with
`data-fup-content`. Mark a template explicitly when a portal owns more than one
template, or when conditional content is used without a portal.

Imports are SSR-safe. Positioning, portals, observers, and focus management
start only after the corresponding elements connect.
