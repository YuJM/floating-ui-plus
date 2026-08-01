# `@floating-ui-plus/vue`

Vue composables and declarative components for positioned, interactive surfaces.
It adds interactions, focus management, portals, collections, search, and native top layers.

The package includes `@floating-ui-plus/web`; installing this package is sufficient.

## Install

```sh
npm install @floating-ui-plus/vue
# pnpm add @floating-ui-plus/vue
# bun add @floating-ui-plus/vue
```

Vue `3.3` or later is required.

## Tooltip quick start

Use `useFloating()` when your component owns its elements and markup.

```vue
<script setup lang="ts">
import {ref} from 'vue';
import {autoUpdate, dismiss, focus, hover, offset, role, useFloating, vFloating} from '@floating-ui-plus/vue';

const open = ref(false);
const reference = ref<HTMLElement | null>(null), floating = ref<HTMLElement | null>(null);
const tooltip = useFloating(reference, floating, {
  open,
  onOpenChange: (nextOpen) => (open.value = nextOpen),
  middleware: [offset(6)],
  whileElementsMounted: autoUpdate,
}).pipe(hover(), focus(), dismiss(), role({role: 'tooltip'}));
</script>

<template>
  <button ref="reference" v-bind="tooltip.referenceAttrs">Help</button>
  <div v-if="open" ref="floating" v-floating="tooltip" v-bind="tooltip.floatingAttrs">Helpful text</div>
</template>
```

`v-floating` applies the positioning output; bind `floatingStyles` for the upstream-compatible manual path.

## Declarative surfaces

Use the component layer for ordinary popovers, menus, and dialogs. The root
owns one controller and its descendants receive the corresponding bindings.

```vue
<template>
  <FloatingRoot
    v-model:open="open"
    :plugins="[click(), dismiss(), role({role: 'dialog'})]"
  >
    <FloatingReference>Open settings</FloatingReference>
    <FloatingContent class="popover">
      Settings
      <FloatingClose>Close</FloatingClose>
    </FloatingContent>
  </FloatingRoot>
</template>
```

`FloatingContent` uses the native Popover API for supported popup roles. Use
`as="dialog"` for a modal native dialog. Add `FloatingPortal` only when the
surface needs to escape its DOM ancestor; native top-layer content stays in the
same Vue tree and should not also be teleported.

## Search and `useQuery()`

`useSearch()` owns request state: debouncing, IME composition, cancellation,
stale-response protection, caching, and cursor pagination. `useQuery()` binds
that state to an editable input, active result, Enter activation, and floating
list navigation.

Its default `semantics` is `"combobox"`: the input controls a listbox and
uses virtual focus with `aria-activedescendant`. Use `semantics: "dialog"` for
a command palette, or `"none"` when the rendered UI owns all ARIA.

```vue
<script setup lang="ts">
import {FloatingContent, FloatingList, FloatingReference, FloatingRoot,
  createFuzzySearchSource, dismiss, useQuery, useSearch} from '@floating-ui-plus/vue';

const search = useSearch({
  source: createFuzzySearchSource(cities, {keys: ['name']}),
  getItemKey: (city) => city.id,
});
const query = useQuery({
  search,
  getItemLabel: (city) => city.name,
  onActivate: (city) => chooseCity(city),
});
</script>

<template>
  <FloatingRoot v-model:open="query.open" :plugins="[dismiss(), query.rolePlugin]">
    <FloatingList
      v-model:active-index="query.activeIndex"
      navigation
      :navigation-options="query.getNavigationOptions({allowEscape: true})"
    >
      <FloatingReference as="input" v-bind="query.inputProps" />
      <FloatingContent>
        <!-- Render search.items.value with query.getOptionProps(city, index). -->
      </FloatingContent>
    </FloatingList>
  </FloatingRoot>
</template>
```

Provide `loading`, `error`, `empty`, and `results` slots on `FloatingSearch`
as needed. `getQueryTriggerProps(query)` binds focus-preserving preset buttons.

### `useCombobox()` compatibility

`useCombobox()` is deprecated. It remains available when a form-like selected
value is required: it retains `selectedItem`, `selectedValue`, `getItemValue()`,
and the legacy select-on-activation lifecycle. Prefer `useQuery()` for new
query surfaces and keep selection or submitted values in application state.

## Guarding close requests

Pass `onBeforeClose` through `FloatingRoot` options to synchronously perform a
final check or send information. Return `false` to keep the surface open.

```vue
<FloatingRoot
  v-model:open="open"
  :options="{
    onBeforeClose: (event, reason) => {
      reportClose(reason);
      return canClose();
    },
  }"
>
  <!-- reference and content -->
</FloatingRoot>
```

The same callback covers `FloatingClose`, `dismiss()` interactions, and native
Popover/`dialog` dismissal. It is synchronous: finish async saving or
confirmation first, then set `open.value = false`.

## Main API

| API | Use it for |
| --- | --- |
| `useFloating()` / `v-floating` | Renderless positioning with application-owned elements |
| `FloatingRoot`, `FloatingReference`, `FloatingContent` | Vue-native surface composition |
| `FloatingPortal`, `FloatingOverlay`, `FloatingFocusManager` | Teleport and custom modal composition |
| `FloatingList`, `FloatingListItem`, `FloatingTree` | Keyboard collections and nested menus |
| `useSearch()`, `FloatingSearch`, `useQuery()` | Search lifecycle, result rendering, and query interaction |
| `click`, `hover`, `focus`, `dismiss`, `role` | Composable interaction plugins |

## Documentation

- [Home](https://fup.polcaneli.com/docs) · [Getting started](https://fup.polcaneli.com/docs/guides/getting-started) · [Vue guide](https://fup.polcaneli.com/docs/frameworks)
- [Usage recipes](https://fup.polcaneli.com/docs/guides/usage) · [Combobox demos](https://fup.polcaneli.com/docs/guides/demo/combobox/fuzzy) · [Dismiss and closing](https://fup.polcaneli.com/docs/guides/dismiss)

## Verify

```sh
bun run --filter '@floating-ui-plus/vue' typecheck
bun run --filter '@floating-ui-plus/vue' test
bun run --filter '@floating-ui-plus/vue' test:browser
```
