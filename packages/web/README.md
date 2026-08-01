# `@floating-ui-plus/web`

Framework-neutral controllers for floating interfaces in browser DOM. Use it
when you want Floating UI positioning plus coordinated open state,
interactions, focus management, collections, portals, or search—while keeping
your own framework, markup, ARIA, and rendering.

## Why this package exists

It builds on Floating UI's positioning primitives and fills the framework-neutral
interaction layer that is more readily available in its React integration:
coordinated open state, dismissal, focus, collections, portals, and robust
search. Your application continues to own UI semantics and rendering.

## How this differs from Floating UI

Floating UI remains the positioning engine: `computePosition()`, middleware,
`autoUpdate()`, and placement data still come from the upstream package. Plus
adds the state and interaction layer around that engine without introducing a
renderer or a design system.

| Concern | Floating UI primitives | Floating UI Plus |
| --- | --- | --- |
| Positioning | `computePosition()` and middleware | The same primitives, plus controller lifecycle and arrow offset coordination |
| Open state | Consumer-managed | `context.open`, `onOpenChange()`, presence, and controller refresh/update helpers |
| Interaction | Consumer wires events | Composable `click()`, `hover()`, `focus()`, `dismiss()`, `role()`, navigation, and typeahead plugins |
| Cross-surface behavior | Consumer composes it | Focus manager, portals, nested trees, lists, composites, delay groups, and scroll locking |
| Search | No query/data controller | `SearchController` for async or controlled search, cancellation, IME, caching, and pagination |

This package is intentionally headless. It does not render a combobox, menu, or
dialog and does not choose labels, selection rules, or ARIA names. It gives a
framework adapter the state and attributes needed to render those patterns.

## Install

```sh
npm install @floating-ui-plus/web
pnpm add @floating-ui-plus/web
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

## Controller API

`createFloating()` returns a `FloatingController`. It is the framework-neutral
owner of one reference/floating pair and can be shared with your renderer,
focus manager, list, or portal bridge.

| Member | Purpose |
| --- | --- |
| `context` | Read-only open state, elements, position, attributes, events, and `onOpenChange()` |
| `context.attributes.reference` / `context.attributes.floating` | ARIA and interaction attributes for your reference and surface elements |
| `floatingStyles` / `position` | Current `top`, `left`, `transform`, placement, and middleware data |
| `setReference()` / `setPositionReference()` / `setFloating()` | Bind DOM or virtual reference elements and the floating element |
| `pipe(...plugins)` | Compose interaction and behavior plugins; cleanup runs in reverse order |
| `node()` / `withList()` / `delayGroup()` | Attach nested-tree, ordered-list, and delay-group services |
| `connect()` / `disconnect()` | Start or pause event listeners, plugins, and positioning |
| `refresh()` / `update()` / `whenPositioned()` | Reconcile plugins or request a new position, including an awaitable positioned state |
| `destroy()` | Permanently release listeners, plugins, and controller resources |

Every controller starts with the dialog ARIA relationship from `role()`. Add a
pattern-specific role plugin when the surface is a tooltip, menu, listbox, or
select. Your renderer still owns the element type, label, class names, visual
state, and whether a closed surface is mounted.

## Interaction plugins

The root entry exports the interaction plugins used by most floating patterns:

| Plugin | Typical use |
| --- | --- |
| `click()` | Toggle a surface from a reference press |
| `hover()` / `safePolygon()` | Pointer intent and submenu corridors |
| `focus()` | Open from keyboard focus |
| `dismiss()` | Outside press, Escape, ancestor scroll, and focus-out dismissal |
| `clientPoint()` | Use pointer coordinates or a virtual reference |
| `listNavigation()` / `typeahead()` | Arrow-key movement and text matching in ordered items |
| `role()` | Replace the baseline dialog semantics with tooltip, menu, select, or another supported role |

Plugins accept a plain object or a getter, so options can follow application
state without rebuilding the controller. Use `focusManager()` alongside
`dismiss()` when the surface is a modal dialog, and `registerFloatingArrow()`
when a custom renderer owns an arrow element.

## Arrow spacing

Upstream `arrow()` positions an application-owned arrow without changing
`offset()`. Floating UI Plus composes the two when the Arrow renderer is marked
with `data-fup-arrow`: the number passed to `offset()` remains the visual gap,
and the Arrow height is added automatically.

```ts
import {
  arrow,
  offset,
  registerFloatingArrow,
  shift,
} from '@floating-ui-plus/web';

const GAP = 3;

const middleware = [
  offset(GAP),
  shift({padding: 8}),
  arrow({element: arrowElement}),
];
```

The supplied Web Components and Vue Arrow components register their element and
height with the shared `FloatingContext`. A custom renderer can do the same:

```ts
const unregisterArrow = registerFloatingArrow(controller.context, {
  element: arrowElement,
  height: 7,
});
```

Call `unregisterArrow()` when the renderer unmounts. Without a registered Arrow
slot, upstream `offset()` semantics remain unchanged.

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

## SearchController: search state, not a combobox

`createSearch()` (or `new SearchController(...)`) returns the framework-neutral
`SearchController`. It handles
debounce, minimum query length, IME composition, `AbortSignal` cancellation,
stale-response protection, TTL caching, de-duplication by `getItemKey`, and
cursor pagination through `loadMore()`. The application still owns combobox
markup, open state, active option, selection, focus, and ARIA.

The demo's multilingual combobox is the concrete composition to copy. Its core
wiring is:

```ts
import {createFloating} from '@floating-ui-plus/web';
import {dismiss, listNavigation, role} from '@floating-ui-plus/web';
import {createFuzzySearchSource} from '@floating-ui-plus/web/fuzzy';
import {SearchController} from '@floating-ui-plus/web/search';

const source = createFuzzySearchSource(destinations, {
  keys: destinationSearchKeys,
  threshold: 0.35,
});
const search = new SearchController({
  source,
  getItemKey: (destination) => destination.id,
  debounceMs: 0,
});

let activeIndex: number | null = null;
const listRef = {current: [] as Array<HTMLElement | null>};
const optionId = (index: number) =>
  `destination-option-${search.items[index]?.id ?? index}`;

const floating = createFloating(() => ({open, onOpenChange: setOpen}))
  .pipe(
    dismiss(),
    role(() => ({role: 'combobox', activeIndex, getItemId: optionId})),
    listNavigation(() => ({
      listRef,
      activeIndex,
      virtual: true,
      loop: true,
      allowEscape: true,
      focusItemOnOpen: false,
      onNavigate(index) {
        activeIndex = index;
        render();
      },
    })),
  );

const unsubscribe = search.subscribe(render);

input.addEventListener('input', () => search.setQuery(input.value));
input.addEventListener('compositionstart', () => search.startComposition());
input.addEventListener('compositionend', () =>
  search.endComposition(input.value),
);
void search.refresh();

// Call this when the results viewport reaches the end.
const loadMore = () => void search.loadMore();

// On unmount:
unsubscribe();
search.destroy();
```

The controller's small lifecycle surface is deliberate:

| API | Use |
| --- | --- |
| `setQuery(query)` | Update the query and schedule a debounced source request |
| `subscribe(listener)` | Receive the initial and every subsequent `SearchSnapshot` |
| `refresh()` | Re-run the current query immediately |
| `loadMore()` | Request the next `nextCursor` page and append de-duplicated items |
| `setControlledState(state)` | Feed results owned by another data-fetching library |
| `connect()` / `disconnect()` / `destroy()` | Pause requests or release the controller lifecycle |

`createFuzzySearchSource()` normalizes compatibility forms and diacritics,
ranks exact/prefix/fuzzy matches, and exposes match ranges for highlighting.
For application-owned fetching, replace it with `createAsyncSearchSource()` or
omit `source` and call `setControlledState()` as the query library updates.
`typeahead()` is for non-editable menus and selects; it supports multilingual
fuzzy matching by default and accepts `findMatch` for custom matching.

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
