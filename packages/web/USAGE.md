# Using `@floating-ui-plus/web`

`@floating-ui-plus/web` is the framework-neutral layer. It manages the
positioning and interaction lifecycle; your application owns elements, markup,
styles, rendering, and application state.

## Install

```sh
bun add @floating-ui-plus/web
```

The package is safe to import during SSR. Create and connect controllers only
after the browser elements exist.

## Build a floating surface

Create one controller per reference/floating-surface pair. `pipe()` composes
interactions from left to right and cleans them up in reverse order.

```ts
import {
  autoUpdate,
  createFloating,
  dismiss,
  flip,
  offset,
  shift,
} from '@floating-ui-plus/web';

let open = false;

const popover = createFloating(() => ({
  open,
  onOpenChange(nextOpen) {
    open = nextOpen;
    render();
  },
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({padding: 12})],
  whileElementsMounted: autoUpdate,
})).pipe(dismiss());

popover.setReference(trigger);
popover.setFloating(panel);
popover.connect();
```

Use `popover.referenceAttrs`, `popover.floatingAttrs`, and the positioning
output in your renderer. Call `disconnect()` when the view is removed
temporarily, and `destroy()` when its owner is gone for good.

## Add interactions

Every `createFloating()` controller starts with the dialog ARIA relationship:
the reference receives `aria-expanded`, `aria-haspopup`, and `aria-controls`,
and the floating element receives a stable `id` and `role="dialog"`. Use
`role({role: 'tooltip' | 'menu' | 'select' | ...})` for a more specific
pattern, or `role({enabled: false})` for a purely presentational surface.
Provide dialog content's meaningful name from product context with `aria-label`
or `aria-labelledby`.

Pass interaction plugins to `.pipe()` according to the UI pattern.

| Pattern | Typical plugins |
| --- | --- |
| Tooltip | `hover()`, `focus()`, `dismiss()`, `role({role: 'tooltip'})` |
| Click popover | `click()`, `dismiss()`, `role({role: 'dialog'})` |
| Menu | `click()` or `hover()`, `dismiss()`, `role({role: 'menu'})`, `listNavigation()` |
| Select | `click()`, `dismiss()`, `role({role: 'select'})`, `listNavigation()` |

Keep the interactions that match the behavior you want. For example, a modal
also needs `focusManager()` and usually an overlay supplied by your renderer.

## Modal focus

Use `focusManager()` for focus trapping and `dismiss()` for Escape and outside
press behavior. Provide your dialog semantics and ensure the floating element
contains an accessible label.

```ts
const dialog = createFloating(dialogOptions)
  .pipe(dismiss(), focusManager({modal: true, returnFocus: true}));
```

## Search and comboboxes

`createSearch()` handles
debouncing, IME completion, cancellation, stale responses, cache TTL, and
cursor pagination. Compose it with `createCombobox()` to own input events,
IME wiring, active-option ARIA, Enter selection, and virtual list navigation.
Your UI still owns markup and result rendering.

```ts
import {createCombobox} from '@floating-ui-plus/web/combobox';
import {createAsyncSearchSource, createSearch} from '@floating-ui-plus/web/search';

const source = createAsyncSearchSource<Product>({
  async search({query, signal, limit, cursor}) {
    const url = new URL('/api/products/search', location.origin);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));
    if (cursor) url.searchParams.set('cursor', cursor);

    const response = await fetch(url, {signal});
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  },
});

const search = createSearch({
  source,
  getItemKey: (product) => product.id,
});

const combobox = createCombobox({
  search,
  getItemLabel: (product) => product.name,
  onOpenChange: setOpen,
});

// Framework adapters bind these objects to their input, options, and list.
const inputProps = combobox.getInputProps();
const optionProps = combobox.getOptionProps(search.items[0]!, 0);
const navigationOptions = combobox.getNavigationOptions({loop: true});

// Direct DOM consumers can use the equivalent imperative helpers.
combobox.bindInput(input);
floating.pipe(...combobox.interactions({loop: true}));
```

For data fetched by your application or a query library, use controlled state:

```ts
const search = createSearch({
  items: results,
  loading: isFetching,
  error,
  getItemKey: (product) => product.id,
  onQueryChange: setQuery,
});
```

Use `createFuzzySearchSource()` from `@floating-ui-plus/web/fuzzy` for local,
typo-tolerant search. Use `typeahead()` for non-editable menus and selects;
pass `findMatch` only when the default multilingual fuzzy matching is not right
for your data.

### Render search phases in direct DOM integrations

Use `createSearchRenderer()` when the consumer is native DOM or Custom
Elements. It subscribes to `SearchController`, chooses the renderer for
`idle`, `loading`, `error`, `empty`, or `results`, and replaces only the bound
container's children. Your application still supplies nodes, markup, and copy.

```ts
import {createSearchRenderer} from '@floating-ui-plus/web/search';

const renderer = createSearchRenderer({
  search,
  render: {
    idle: () => renderExamples(),
    loading: () => renderMessage('Searching…'),
    error: () => renderMessage('Search failed.'),
    empty: ({query}) => renderMessage(`No match for ${query}`),
    results: ({items}) => items.map(renderOption),
  },
});

const releasePortalContent = renderer.bind(optionsElement);
// Call releasePortalContent() when that portal clone is removed.
// Call renderer.destroy() when its owner is disposed.
```

## Collections, trees, and portals

Use a tree and nodes for nested menus, lists for ordered items, and composites
for roving keyboard focus. Create these services in the same lifecycle as the
controllers that consume them. Context scopes allow nested controllers and
portal targets to share live references without tying the kernel to a renderer.

`createPortalBridge()` attaches context to a target that may appear after a
render. It does not create or move DOM; the application owns that work. Call
`connect()`, then `refresh()` after a commit when the target was initially
unavailable.

## Imports

| Import | Use it for |
| --- | --- |
| `@floating-ui-plus/web` | controller, interactions, focus, collections, and middleware |
| `@floating-ui-plus/web/search` | generic request state without fuzzy matching |
| `@floating-ui-plus/web/fuzzy` | local Fuse-based fuzzy search |
| `@floating-ui-plus/web/utils` | shared utility exports |

`PLACEMENT` and `PLACEMENTS` provide the 12 typed placement values. Plain
Floating UI placement strings remain valid.
