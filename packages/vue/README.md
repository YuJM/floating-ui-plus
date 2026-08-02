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
<script setup lang="ts">
import {ref} from 'vue';
import {
  FloatingClose,
  FloatingContent,
  FloatingReference,
  FloatingRoot,
  autoUpdate,
  click,
  dismiss,
  flip,
  offset,
  role,
  shift,
  transformOrigin,
} from '@floating-ui-plus/vue';

const open = ref(false);
const options = {
  placement: 'bottom-start',
  middleware: [
    offset(8),
    flip({padding: 12}),
    shift({padding: 12}),
    transformOrigin({padding: 8}),
  ],
  whileElementsMounted: autoUpdate,
};
const plugins = [click(), dismiss(), role({role: 'dialog'})];
</script>

<template>
  <FloatingRoot
    v-model:open="open"
    :options="options"
    :plugins="plugins"
  >
    <FloatingReference>Open settings</FloatingReference>
    <FloatingContent class="popover">
      Settings
      <FloatingClose>Close</FloatingClose>
    </FloatingContent>
  </FloatingRoot>
</template>
```

`FloatingContent` uses the browser Popover API by default. Use
`top-layer="none"` for an intentionally positioned/custom surface and
`as="dialog"` for a native dialog. `role()` controls ARIA semantics only. Add
`FloatingPortal` only when the surface needs to escape its DOM ancestor;
native top-layer content stays in the same Vue tree and should not also be
teleported.

`as="dialog"` maps directly to the native `<dialog>` element. Floating UI Plus
coordinates the reference, positioning, and interactions without replacing
those platform behaviors.

Native dialogs also acquire a ref-counted document scroll lock while open.
The default uses CSS `overflow: hidden`; touch-event interception is not
installed. Add a touch guard in the host application only for legacy iOS or a
WebView that still requires it.

## Native entry and exit animation

Keep `<FloatingContent>` in the Vue tree and style the native surface states
directly. A non-zero `display` or `overlay` transition with `allow-discrete`
opts into CSS exit motion; without one, closed content receives `hidden`
immediately.

```css
.floating-panel {
  opacity: 0;
  translate: 0 -0.25rem;
  transform-origin: var(--floating-transform-origin, 50% 0%);
  transition:
    opacity 120ms cubic-bezier(0.23, 1, 0.32, 1),
    translate 120ms cubic-bezier(0.23, 1, 0.32, 1),
    display 120ms allow-discrete,
    overlay 120ms allow-discrete;
}

.floating-panel:popover-open {
  opacity: 1;
  translate: 0 0;
}

@starting-style {
  .floating-panel:popover-open {
    opacity: 0;
    translate: 0 -0.25rem;
  }
}
```

`transformOrigin()` writes the CSS variable from the final placement and
reference geometry. Keep it after placement-changing middleware; the CSS
fallback remains valid when it is omitted.

For a fixed placement, you may omit the middleware and define
`transform-origin` in CSS. CSS alone cannot observe `flip()` or `shift()`
results, so use `transformOrigin()` whenever the surface can move to another
side or alignment.

Do not wrap an animated native surface in `v-if`; removing it bypasses the CSS
exit. Reopening cancels a pending hide. For `top-layer="none"`, use
`FloatingTransition` or `useFloatingTransition` and keep the surface mounted
until its close state completes. See the
[entry and exit animation guide](https://fup.polcaneli.com/docs/guides/animation).

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
- [Entry and exit animation](https://fup.polcaneli.com/docs/guides/animation)

## Verify

```sh
bun run --filter '@floating-ui-plus/vue' typecheck
bun run --filter '@floating-ui-plus/vue' test
bun run --filter '@floating-ui-plus/vue' test:browser
```
