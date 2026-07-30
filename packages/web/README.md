# `@floating-ui-plus/web`

Framework-neutral controllers for floating interfaces in browser DOM. Use it
when you want Floating UI positioning plus coordinated open state,
interactions, focus management, collections, portals, or search—while keeping
your own framework, markup, ARIA, and rendering.

## Install

```sh
bun add @floating-ui-plus/web
```

For complete patterns—menus, dialogs, search, collections, and portals—see the
[usage guide](./USAGE.md).

## Start with a tooltip

```ts
import {
  autoUpdate,
  createFloating,
  dismiss,
  focus,
  hover,
  offset,
  role,
} from '@floating-ui-plus/web';

let open = false;

const tooltip = createFloating(() => ({
  open,
  onOpenChange(nextOpen) {
    open = nextOpen;
  },
  middleware: [offset(6)],
  whileElementsMounted: autoUpdate,
}))
  .pipe(hover(), focus(), dismiss(), role({role: 'tooltip'}));

tooltip.setReference(button);
tooltip.setFloating(panel);
tooltip.connect();
```

Your renderer applies the reactive attributes and positioning output from the
controller. Call `disconnect()` when the surface is temporarily removed and
`destroy()` when its owner is disposed.

## Choose the right primitive

| Need | Use |
| --- | --- |
| Positioning and interaction lifecycle | `createFloating()` with `.pipe()` |
| Standard placement values | `PLACEMENT` and `PLACEMENTS` |
| Async or controlled search requests | `createSearch()` from `/search` |
| Local typo-tolerant search | `createFuzzySearchSource()` from `/fuzzy` |
| Nested menus and ordered items | tree, list, and composite controllers |
| Modal focus | `focusManager()` with `dismiss()` |
| A DOM target outside the current renderer | `createPortalBridge()` |

## Search is state, not UI

`createSearch()` handles debounce, IME completion, cancellation, stale
responses, caching, and pagination. The application keeps ownership of the
combobox markup, open state, selection, focus, and ARIA.

```ts
import {createAsyncSearchSource, createSearch} from '@floating-ui-plus/web/search';

const source = createAsyncSearchSource<Product>({
  async search({query, signal}) {
    const response = await fetch(`/api/products?q=${encodeURIComponent(query)}`, {
      signal,
    });
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  },
});

const search = createSearch({
  source,
  getItemKey: (product) => product.id,
});
```

For application-owned fetching, pass `items`, `loading`, `error`, and
`onQueryChange` instead. `typeahead()` is for non-editable menus and selects;
it supports multilingual fuzzy matching by default and accepts `findMatch` for
custom matching.

## Imports and compatibility

The package is safe to import during SSR; DOM work begins when a controller is
connected. Use `/search` when fuzzy search is unnecessary, `/fuzzy` when it
is needed, and `/utils` for shared utility exports. The root entry also
re-exports them for convenience.

Run the package checks from the workspace root:

```sh
bun run --filter '@floating-ui-plus/web' typecheck
bun run --filter '@floating-ui-plus/web' test
bun run --filter '@floating-ui-plus/web' test:browser
```
