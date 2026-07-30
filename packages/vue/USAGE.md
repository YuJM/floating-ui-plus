# Using `@floating-ui-plus/vue`

Use `@floating-ui-plus/vue` for Vue-owned markup with Floating UI positioning,
interactions, portals, focus management, collections, and search state.

## Install

```sh
bun add @floating-ui-plus/vue
```

Vue `3.3` or later is a peer dependency. Imports are SSR-safe; positioning and
native event listeners connect after mount.

`useFloating()` and `FloatingRoot` supply the default dialog ARIA relationship.
Bind `referenceAttrs` and `floatingAttrs` (or use `FloatingReference` and
`FloatingContent`) to receive it. Override the pattern with
`role({role: 'tooltip' | 'menu' | 'select' | ...})`, and give dialog content a
product-specific accessible name with `aria-label` or `aria-labelledby`.

## Composition API: tooltip

Use `useFloating()` when you control the elements directly, need a virtual
reference, or are composing a bespoke surface.

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
    Describes the control.
  </div>
</template>
```

`referenceAttrs` and `floatingAttrs` are meant for `v-bind`. Your template
keeps ownership of classes, styles, markup, and Vue event handlers.

## Declarative components: popover

Use components for conventional tooltips, popovers, menus, and dialogs.

```vue
<script setup lang="ts">
import {ref} from 'vue';
import {
  FloatingContent, FloatingFocusManager, FloatingPortal, FloatingReference,
  FloatingRoot, click, dismiss, offset, role,
} from '@floating-ui-plus/vue';

const open = ref(false);
</script>

<template>
  <FloatingRoot
    v-model:open="open"
    :options="{middleware: [offset(8)]}"
    :plugins="[click(), dismiss(), role({role: 'dialog'})]"
  >
    <FloatingReference>Open settings</FloatingReference>
    <FloatingPortal v-if="open">
      <FloatingFocusManager :options="{modal: false, initialFocus: -1}">
        <FloatingContent class="popover">Settings</FloatingContent>
      </FloatingFocusManager>
    </FloatingPortal>
  </FloatingRoot>
</template>
```

`FloatingRoot` provides its controller to descendants. Pass a `floating` prop
to connect a component to a controller created elsewhere.

## Portals and modal dialogs

`FloatingPortal` uses Vue Teleport and targets `body` by default. Pass `to` for
another target or `disabled` to keep the content in place. For a modal dialog,
wrap `FloatingContent` with `FloatingOverlay` and `FloatingFocusManager` using
modal focus options. Keep an accessible name on the dialog content.

## Combobox search

`useSearch()` connects generic request state to Vue lifecycle. It does not
render a Combobox. The application owns the input, menu, selection,
`aria-activedescendant`, and active index.

```ts
import {createAsyncSearchSource, useSearch} from '@floating-ui-plus/vue';

const source = createAsyncSearchSource<Product>({
  async search({query, signal}) {
    const response = await fetch(`/api/products?q=${encodeURIComponent(query)}`, {
      signal,
    });
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  },
});

const search = useSearch({
  source,
  getItemKey: (product) => product.id,
});
```

Pair search with `useFloating()`, `listNavigation()`, and `role()` as needed.
For data owned by a query library, pass controlled `items`, `loading`, and
`error` values to `useSearch()`.

## Nested menus and keyboard collections

Use `FloatingTree` and `FloatingNode` for nested roots. Use `FloatingList`,
`FloatingListItem`, `Composite`, and `CompositeItem` for ordered items and
roving keyboard focus. `FloatingDelayGroup` coordinates delays across related
surfaces. Explicit tree, list, and delay-group instances take precedence over
injected providers.

## Placement values

Use `PLACEMENT` for named constants and `PLACEMENTS` for all 12 typed values.
Ordinary values such as `'bottom-start'` remain valid.
