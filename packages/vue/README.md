# `@floating-ui-plus/vue`

Vue composables and components for positioned, interactive surfaces. It keeps
the familiar `@floating-ui/vue` positioning API and adds the shared Plus
interaction, focus, collection, search, and portal model.

## Why this package exists

Floating UI Plus uses Floating UI as its base and closes the gap between its
mature React experience and other frameworks. Vue receives the same reusable
interaction, focus, collection, portal, and search behavior while components
keep control of their own markup and accessibility semantics.

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

For menus, `FloatingList` can own active-index state, item refs, roving
`tabindex`, arrow navigation, and typeahead. `FloatingListItem` registers and
binds each rendered item:

```vue
<FloatingList navigation typeahead loop>
  <FloatingPortal v-if="open">
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

## Arrow defaults and customization

`FloatingArrow` supplies the default SVG triangle with its own `width`,
`height`, `staticOffset`, and `rotation` props. Replace its default slot to use your own
path while retaining the same positioning output. Its root SVG is marked with
the exported `FLOATING_UI_PLUS_ARROW_ATTRIBUTE`
(`data-fup-arrow`):

```vue
<FloatingArrow :floating="floating" :width="18" :height="9" :static-offset="-9">
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

## Search, collections, and portals

`useSearch()` connects the generic request controller to Vue lifecycle. It is
not a finished Combobox: your application owns selection, open state, markup,
and ARIA. Use `FloatingList navigation` for conventional listbox navigation,
or compose `listNavigation()` directly for custom virtual/grid behavior.

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
