# `@floating-ui-plus/vue`

Vue composables and components for positioned, interactive surfaces. It keeps
the familiar `@floating-ui/vue` positioning API and adds the shared Plus
interaction, focus, collection, search, and portal model.

## Install

```sh
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
  <FloatingPortal v-if="open">
    <FloatingFocusManager :options="{modal: false, initialFocus: -1}">
      <FloatingContent class="popover">Settings</FloatingContent>
    </FloatingFocusManager>
  </FloatingPortal>
</FloatingRoot>
```

`FloatingRoot` provides the controller to its descendants. Pass a `floating`
prop when an element belongs to a controller owned elsewhere.

## Search, collections, and portals

`useSearch()` connects the generic request controller to Vue lifecycle. It is
not a finished Combobox: your application owns selection, open state,
navigation, markup, and ARIA. Pair it with `useFloating()`, `listNavigation()`,
and `role()`.

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
