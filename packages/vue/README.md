# `@floating-ui-plus/vue`

Vue composables and components for positioned, interactive surfaces. It keeps
the familiar `@floating-ui/vue` positioning API and adds the shared Plus
interaction, focus, collection, search, and portal model.

## Why this package exists

Floating UI Plus uses Floating UI as its base and closes the gap between its
mature React experience and other frameworks. Vue receives the same reusable
interaction, focus, collection, portal, and search behavior while components
keep control of their own markup and accessibility semantics.

## How this differs from Floating UI

`@floating-ui/vue` is the upstream positioning adapter. This package keeps its
familiar `useFloating()` shape and adds a shared Plus controller underneath:

| Concern | Upstream Floating UI | Floating UI Plus for Vue |
| --- | --- | --- |
| Positioning | Vue refs, `floatingStyles`, middleware | The same positioning model plus a shared controller/context scope |
| Interaction | Consumer composes the supported interaction hooks | `.pipe()`/`registerPlugins()` with click, hover, focus, dismiss, roles, navigation, and typeahead |
| Declarative surfaces | Consumer builds each surface | `FloatingRoot`, `FloatingReference`, `FloatingContent`, `FloatingPortal`, overlay, focus, arrow, and transition components |
| Nested and modal behavior | Consumer wires focus/portal coordination | Trees, lists, delay groups, focus manager, inert neighbors, scroll locking, and context-preserving Teleport |
| Search and combobox behavior | No generic query/data controller | `useSearch()` for data and `useCombobox()` for editable input, active option, ARIA, and selection |

Plus is still headless: it supplies a default combobox selection lifecycle but
does not decide labels, result markup, visual language, or accessible names.
Those product decisions remain in the Vue component.

## Install

```sh
npm install @floating-ui-plus/vue
pnpm add @floating-ui-plus/vue
bun add @floating-ui-plus/vue
```

Vue `3.3` or later is required.

For composition and component patterns in more detail, see the
[usage guide](./USAGE.md).

## Start with a tooltip

Use `useFloating()` when your component owns its markup:

```vue
<script setup lang="ts">
import {ref} from 'vue';
import {
  autoUpdate, dismiss, focus, hover, offset, role, useFloating, vFloating,
} from '@floating-ui-plus/vue';

const open = ref(false);
const reference = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);

const tooltip = useFloating(reference, panel, {
  open,
  onOpenChange: (nextOpen) => { open.value = nextOpen; },
  middleware: [offset(6)],
  whileElementsMounted: autoUpdate,
}).pipe(hover(), focus(), dismiss(), role({role: 'tooltip'}));
</script>

<template>
  <button ref="reference" v-bind="tooltip.referenceAttrs">Help</button>
  <div v-if="open" ref="panel" v-floating="tooltip" v-bind="tooltip.floatingAttrs">
    Helpful text
  </div>
</template>
```

`v-floating` applies the positioning output. Use `floatingStyles` for the
upstream-compatible manual style binding when needed.

## Declarative components

Use the component layer for ordinary popovers, menus, and dialogs:

```vue
<FloatingRoot v-model:open="open" :plugins="[click(), dismiss(), role({role: 'dialog'})]">
  <FloatingReference>Open settings</FloatingReference>
  <FloatingPortal>
    <FloatingFocusManager :options="{modal: false, initialFocus: -1}">
      <FloatingContent class="popover">
        Settings
        <FloatingClose>Close</FloatingClose>
      </FloatingContent>
    </FloatingFocusManager>
  </FloatingPortal>
</FloatingRoot>
```

`FloatingRoot` provides the controller to its descendants. Pass a `floating`
prop when an element belongs to a controller owned elsewhere.

### Native top-layer mode

`FloatingContent` automatically uses the browser Popover API for dialog, menu,
and listbox roles without a Teleport.
The surface stays in the Vue component tree, so provide/inject remains direct.

```vue
<FloatingRoot
  v-model:open="open"
  :options="{strategy: 'fixed', placement: 'bottom-start'}"
  :plugins="[click(), dismiss(), role({role: 'dialog'})]"
>
  <FloatingReference>Open settings</FloatingReference>
  <FloatingContent class="popover">
    Settings
    <FloatingClose>Close</FloatingClose>
  </FloatingContent>
</FloatingRoot>
```

For a modal, render `<FloatingContent as="dialog">`. The native dialog supplies modal focus and
inertness. `FloatingPortal` automatically stays in place for either native
top-layer mode; use the normal Teleport composition as the fallback for older
browsers.

For menus, `FloatingList` can own active-index state, item refs, roving
`tabindex`, arrow navigation, and typeahead. `FloatingListItem` registers and
binds each rendered item:

```vue
<FloatingList navigation typeahead loop>
  <FloatingPortal>
    <FloatingContent>
      <FloatingListItem
        v-for="action in actions"
        :key="action.id"
        tag="button"
        :label="action.label"
        role="menuitem"
        close-on-click
      >
        {{ action.label }}
      </FloatingListItem>
    </FloatingContent>
  </FloatingPortal>
</FloatingList>
```

Use `v-model:active-index` only when application state needs the current item.
Add `nested` to a submenu list; it opens from the parent reference with
ArrowRight, closes with ArrowLeft, and restores focus after dismissal. Set a
leaf item to `close-on-click="all"` when selecting it should close every
ancestor root in the nested menu.

## Component API

The declarative components provide Vue-native bindings around the same
framework-neutral controller. They forward attributes and slots, so your
application still owns markup, classes, labels, and ARIA names.

| Component | Props / model | Purpose |
| --- | --- | --- |
| `FloatingRoot` | `v-model:open`, `options`, `plugins` | Owns a controller and provides it to descendants |
| `FloatingReference` | `as`, optional `floating` | Binds its rendered element as the reference and forwards reference attributes |
| `FloatingContent` | `as`, optional `floating` | Binds its rendered element as the floating surface; native `<dialog>` and popup roles use browser top layers automatically |
| `FloatingItem` | `as`, `state`, optional `floating` | Applies the controller's item attributes for active/selected collection items |
| `FloatingPortal` | `to`, `disabled`, optional `active` signal | Teleports to `body` or a target; under `FloatingRoot` it follows that root's `open` state automatically |
| `FloatingClose` | `as`, optional `floating` | Closes the nearest root while preserving the source event and reason |
| `FloatingOverlay` | `tag`, `lockScroll` | Renders a fixed overlay and optionally locks document scrolling |
| `FloatingFocusManager` | `context`/`floating`, `options`, `enabled` | Connects modal focus trapping, restoration, and nested portal awareness |
| `FloatingArrow` | `context`/`floating`, `width`, `height`, `staticOffset`, `rotation` | Renders and registers an arrow; emits `element-change` when its SVG changes |
| `FloatingTransition` | required `open`, `placement`, `styles` | Provides presence-aware transition slot props `{status, style}` |

Collections use `FloatingTree` and `FloatingNode` for nested roots,
`FloatingList` for ordered items, `FloatingListItem` for registration and
roving attributes, `Composite` / `CompositeItem` for general keyboard
collections, and `FloatingDelayGroup` / `NextFloatingDelayGroup` for shared
open/close delays. `FloatingList` accepts `navigation`, `typeahead`, `loop`,
`nested`, `navigation-options`, and `typeahead-options`, and emits
`update:active-index` plus `active-index-change`. A `FloatingListItem` can use
`close-on-click="all"` to close its full nested root chain.

`FloatingPortal` no longer needs a repeated `v-if="open"` in the common case.
Its optional `active` prop remains a reactive signal for advanced closed-over
slot render functions; it is not required when the portal is under
`FloatingRoot`.

## Arrow defaults and customization

`FloatingArrow` supplies the default SVG triangle with its own `width`,
`height`, `staticOffset`, and `rotation` props. Replace its default slot to use your own
path while retaining the same positioning output. Its root SVG is marked with
the exported `FLOATING_UI_PLUS_ARROW_ATTRIBUTE`
(`data-fup-arrow`):

```vue
<FloatingArrow :width="18" :height="9" :static-offset="-9">
  <path d="M0 9L9 0L18 9Z" fill="rebeccapurple" />
</FloatingArrow>
```

`FloatingArrow` publishes its height to the Plus controller. The number passed
to `offset()` is therefore the desired visual gap; the Arrow height is added
automatically:

```ts
const GAP = 3;

const middleware = computed(() => [
  offset(GAP),
  shift({padding: 8}),
  ...(arrowElement.value ? [arrow({element: arrowElement.value})] : []),
]);
```

Pass `rotation="none"` when the custom path already points in its final direction.

For a fully custom element, keep rendering and styling in your component and
apply the framework-neutral `getArrowStyles(placement, middlewareData,
{element})` result to that element. This is the headless path; the arrow's
shape, color, and markup remain application-owned.

When the default component is used with `arrow({element})`, listen for
`@element-change` to receive its SVG element for that middleware option.

## SearchController, `useSearch()`, and `useCombobox()`

`useSearch()` is the Vue lifecycle adapter for the same framework-neutral
`SearchController` used by the Web and Web Components packages. It handles
debounce, minimum query length, IME composition, `AbortSignal` cancellation,
stale-response protection, TTL caching, de-duplication, and cursor pagination;
`useCombobox()` adds Vue refs and input bindings for open state, active option,
IME, ARIA, Enter selection, and the combobox role. `<FloatingSearch>` selects
the matching `idle`, `loading`, `error`, `empty`, or `results` slot from
`search.phase`; your component still owns the result markup and copy.

```vue
<script setup lang="ts">
import {
  FloatingContent,
  FloatingList,
  FloatingListItem,
  FloatingPortal,
  FloatingReference,
  FloatingRoot,
  FloatingSearch,
  autoUpdate,
  createFuzzySearchSource,
  dismiss,
  flip,
  offset,
  shift,
  useCombobox,
  useSearch,
} from '@floating-ui-plus/vue';
import {
  multilingualDestinations,
  multilingualSearchKeys,
  type MultilingualDestination,
} from './multilingual-destinations';

const source = createFuzzySearchSource(multilingualDestinations, {
  keys: multilingualSearchKeys,
  threshold: 0.35,
});
const search = useSearch<MultilingualDestination>({
  source,
  getItemKey: (item) => item.id,
  debounceMs: 0,
});

const {
  open,
  activeIndex,
  selectedItem,
  selectedValue,
  statusText,
  inputProps,
  rolePlugin,
  getOptionProps,
  getQueryTriggerProps,
  getNavigationOptions,
} = useCombobox({
  search,
  getItemLabel: (item) => item.label,
  status: {
    closed: 'Destination suggestions closed',
    selected: (item) => `${item.label} selected`,
    idle: 'Start typing to search',
    loading: 'Searching destinations',
    error: 'Destination search failed',
    empty: ({search}) => `No destinations found for ${search.query}`,
    results: ({search}) => `${search.items.length} destinations available`,
  },
});
const options = {
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
} as const;
const plugins = [dismiss(), rolePlugin];
const navigationOptions = getNavigationOptions({
  allowEscape: true,
});
</script>

<template>
  <input type="hidden" name="destination" :value="selectedValue ?? ''" />
  <FloatingRoot v-model:open="open" :options="options" :plugins="plugins">
    <FloatingList
      v-model:active-index="activeIndex"
      navigation
      loop
      :navigation-options="navigationOptions"
    >
      <FloatingReference
        as="input"
        v-bind="inputProps"
      />
      <FloatingPortal>
        <FloatingContent>
          <FloatingSearch :search="search">
            <template #loading><p>Searching…</p></template>
            <template #error><p>Search failed.</p></template>
            <template #empty><p>No destination found.</p></template>
            <template #results>
              <FloatingListItem
                v-for="(item, index) in search.items"
                :key="item.id"
                tag="button"
                :label="item.label"
                :value="item"
                v-bind="getOptionProps(item, index)"
              >
                {{ item.label }}
              </FloatingListItem>
            </template>
          </FloatingSearch>
        </FloatingContent>
      </FloatingPortal>
    </FloatingList>
  </FloatingRoot>
</template>
```

Local fuzzy indexing supplies results, `useCombobox()` supplies editable-input
and selection behavior, and `FloatingList` supplies virtual keyboard
navigation. `FloatingSearch` keeps the phase branch declarative without
switching to a DOM renderer. Bind `statusText` to a live region when the
combobox needs status announcements. `getQueryTriggerProps(query)` binds a
focus-preserving preset button without application event handlers.
For native form submission, bind `selectedValue` (not the display input) to a
hidden input with the desired `name`; it comes from `getItemValue()` and
therefore defaults to the stable item key rather than the visible label.
`createSearchRenderer()` is also re-exported for direct DOM islands, but Vue
templates should prefer `search.phase` with `v-if` / `v-for` rather than a DOM
renderer.

`createFuzzySearchSource()` normalizes compatibility forms and diacritics,
then returns exact/prefix/fuzzy scores and match ranges through `hits`. For a
remote API, replace it with `createAsyncSearchSource()` while keeping the same
`useSearch()` and template composition. Call
`search.controller.loadMore()` when `search.state.hasMore` is true. For data
owned by TanStack Query or another request library, omit `source` and call
`search.controller.setControlledState({items, loading, error, ...})`.

`useSearch()` destroys its controller with the Vue scope. Use `createSearch()`
directly when a longer-lived service owns the controller lifecycle.

`useCombobox()` also destroys its framework-neutral controller with the Vue
scope. Pass optional writable `open`, `activeIndex`, or `selectedItem` refs when
their state is owned elsewhere.

| `useSearch()` value | Purpose |
| --- | --- |
| `query`, `items`, `phase`, `loading`, `error` | Reactive projections for template rendering |
| `state` | Full snapshot, including `phase`, `hits`, `composing`, `hasMore`, `total`, and `nextCursor` |
| `controller.setQuery()` | Update the query from an input or custom event |
| `controller.refresh()` / `loadMore()` | Re-run the current request or append the next page |
| `controller.setControlledState()` | Bridge data owned by another request/cache library |

| `useCombobox()` value | Purpose |
| --- | --- |
| `open`, `activeIndex`, `selectedItem` | Writable refs for root, list, and selected-result state |
| `inputProps` | Reactive value plus focus, input, IME, and Enter handlers from the Web binding contract |
| `getOptionProps(item, index)` | Option ID, active/selected ARIA, blur prevention, and selection handlers from the same Web contract |
| `getQueryTriggerProps(query)` | Blur prevention, query activation, and input focus restoration for a preset button |
| `statusText` | Reactive live-region text from a shared phase-keyed `status` map or formatter |
| `getNavigationOptions(options)` | Virtual-focus combobox defaults merged with list navigation overrides |
| `rolePlugin` | Combobox ARIA plugin for `FloatingRoot` |
| `setQuery()` / `select()` | Programmatic query and selection operations |

## Collections and portals

Use `FloatingList navigation` for conventional listbox navigation, or compose
`listNavigation()` directly for custom virtual/grid behavior.

`FloatingTree`, `FloatingNode`, `FloatingList`, `FloatingListItem`,
`Composite`, `CompositeItem`, and `FloatingDelayGroup` provide nested-menu and
keyboard-collection structure. `FloatingPortal` uses Vue Teleport and defaults
to `body`; pass `to` to choose a target or `disabled` to render in place.

Imports are SSR-safe and DOM work begins after mount. The package re-exports
the upstream positioning composable, middleware, and typed `PLACEMENT` /
`PLACEMENTS` constants.

## Verify

```sh
bun run --filter '@floating-ui-plus/vue' typecheck
bun run --filter '@floating-ui-plus/vue' test
bun run --filter '@floating-ui-plus/vue' test:browser
```
