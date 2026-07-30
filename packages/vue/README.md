# `@floating-ui-plus/vue`

Vue 3 positioning, interactions, focus management, and floating components
powered by the framework-neutral `@floating-ui-plus/web` kernel.

The package starts from the upstream `@floating-ui/vue` API. Existing
`useFloating(reference, floating, options)` and reactive `arrow()` usage remain
valid, while the returned controller can also compose Plus interactions.

## Placement constants

`PLACEMENT` avoids repeating placement string literals, while `PLACEMENTS`
provides all 12 typed values in clockwise visual order:

```ts
import {PLACEMENT, PLACEMENTS, useFloating} from '@floating-ui-plus/vue';

const floating = useFloating(reference, panel, {
  placement: PLACEMENT.BOTTOM_START,
});

const choices = PLACEMENTS;
```

String literals such as `'bottom-start'` remain supported.

## Search state for custom Comboboxes

Vue does not ship a finished Combobox. `useSearch()` connects generic search
request state to Vue lifecycle; the application composes it with
`useFloating()`, `listNavigation()`, `role()`, and its own markup:

```ts
<script setup lang="ts">
import {
  createAsyncSearchSource,
  useSearch,
} from '@floating-ui-plus/vue';

const source = createAsyncSearchSource<Product>({
  async search({query, signal, limit, cursor}) {
    const response = await fetch(
      `/api/products/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {signal},
    );
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  },
});

const search = useSearch({
  source,
  getItemKey: (item: Product) => item.id,
});
</script>
```

The demo owns `open`, `activeIndex`, selection, `aria-activedescendant`,
Teleport, and option rendering. For controlled requests, pass application-owned
`items`, `loading`, and `error` to `useSearch()` or omit it entirely and bind
those values directly.

## Two Vue API styles

Both styles use the same Web controller and interaction kernel. Choose the
Composition API when the reference or floating element is owned by another
component, a virtual element, or bespoke rendering. Choose the declarative
component API for ordinary tooltips, popovers, menus, and dialogs.

```vue
<script setup lang="ts">
import {ref} from 'vue';
import {
  FloatingContent,
  FloatingFocusManager,
  FloatingPortal,
  FloatingReference,
  FloatingRoot,
  click,
  dismiss,
  offset,
  role,
} from '@floating-ui-plus/vue';

const open = ref(false);
</script>

<template>
  <FloatingRoot
    v-model:open="open"
    :options="{middleware: [offset(8)]}"
    :plugins="[click(), dismiss(), role({role: 'dialog'})]"
  >
    <FloatingReference>Open popover</FloatingReference>
    <FloatingPortal v-if="open">
      <FloatingFocusManager :options="{modal: false, initialFocus: -1}">
        <FloatingContent class="popover">Popover content</FloatingContent>
      </FloatingFocusManager>
    </FloatingPortal>
  </FloatingRoot>
</template>
```

`FloatingRoot` provides the `useFloating()` result to its descendants.
`FloatingReference`, `FloatingContent`, and `FloatingItem` bind refs,
positioning, and reactive interaction/ARIA attributes automatically. Every
component also accepts `:floating="useFloatingResult"` for composition across
component boundaries. `FloatingPortal`, `FloatingArrow`, and
`FloatingFocusManager` use the nearest root when their explicit `context` or
`contextScope` props are omitted.

## Tooltip

```vue
<script setup lang="ts">
import {ref} from 'vue';
import {
  autoUpdate,
  dismiss,
  focus,
  hover,
  offset,
  role,
  useFloating,
  vFloating,
} from '@floating-ui-plus/vue';

const open = ref(false);
const reference = ref<HTMLElement | null>(null);
const floating = ref<HTMLElement | null>(null);

const tooltip = useFloating(reference, floating, {
  open,
  onOpenChange: (nextOpen) => {
    open.value = nextOpen;
  },
  middleware: [offset(6)],
  whileElementsMounted: autoUpdate,
}).pipe(hover(), focus(), dismiss(), role({role: 'tooltip'}));
</script>

<template>
  <button ref="reference" v-bind="tooltip.referenceAttrs">Help</button>
  <div
    v-if="open"
    ref="floating"
    v-floating="tooltip"
    v-bind="tooltip.floatingAttrs"
  >
    Tooltip content
  </div>
</template>
```

`v-floating` applies the complete Web-owned positioning output and follows
position updates. `floatingStyles` remains available for upstream-compatible
manual binding when a template needs to merge its own positioning styles.

`referenceAttrs` and `floatingAttrs` are reactive plain objects intended for
`v-bind`. Consumer classes, styles, and Vue listeners remain owned by the
template; Plus installs native interaction listeners and only supplies its
ARIA attributes.

## Vue-native portal and modal

`FloatingPortal` uses Vue `Teleport`, so injection and logical component
parentage survive even when the floating DOM moves to `body`. Pass the
controller's Web-owned `contextScope` to bridge framework-neutral tree, list,
delay-group, and custom DOM context requests into the Teleport target.

```vue
<FloatingPortal
  v-if="open"
  :active="open"
  :context-scope="floating.contextScope"
>
  <FloatingOverlay lock-scroll>
    <FloatingFocusManager :context="floating.context">
      <section ref="floatingElement" v-bind="floating.floatingAttrs">
        <button @click="open = false">Done</button>
      </section>
    </FloatingFocusManager>
  </FloatingOverlay>
</FloatingPortal>
```

The default Teleport target is `body`. Pass `to="#overlay-root"` or a real
Element to select another target, or `disabled` to render in place. DOM access
is deferred until mount so importing the package during SSR is safe. Server
output and the initial hydration render stay inline; after mount, Vue Teleport
moves the content. Selector targets are refreshed after Vue mount and update
commits, and content remains inline while the target is unavailable.

## Declarative nested tree

`FloatingTree` mirrors the React provider shape while retaining Vue's
provide/inject relationship. `FloatingNode` accepts the complete `useFloating`
return value, so consumers do not need to reach into `.controller`.

```vue
<FloatingTree>
  <FloatingNode :controller="rootFloating" id="actions">
    <button ref="rootReference" v-bind="rootFloating.referenceAttrs">Actions</button>
    <FloatingNode :controller="childFloating" id="projects">
      <FloatingPortal v-if="childOpen" :context-scope="childFloating.contextScope">
        <div ref="childElement" v-floating="childFloating">Projects</div>
      </FloatingPortal>
    </FloatingNode>
  </FloatingNode>
</FloatingTree>
```

## Collections and transitions

- `FloatingNode` delegates registration and cleanup to Web `.node()` while
  Vue only discovers the parent provider and lifecycle boundary.
- `FloatingList`, `FloatingListItem`, `Composite`, and `CompositeItem` expose
  ordered collection and roving-focus services.
- `FloatingList` and `FloatingDelayGroup` accept a `controller` prop to
  delegate their service ownership to Web `.withList()` and `.delayGroup()`.
- `FloatingTransition` combines the Web transition state with Vue
  `<Transition>` slots.
- `FloatingArrow` and `FloatingOverlay` render Vue-owned markup while using
  shared positioning and scroll-lock kernels.

Explicit tree, list, or delay-group instances take precedence over injected
providers.

## Compatibility

- Vue `>=3.3`
- Existing upstream positioning composable and middleware exports
- Full non-deprecated React-parity interaction surface through the shared Web
  kernel
- SSR-safe imports; DOM behavior connects only when elements mount

The original upstream source and tests retain the Floating UI MIT license in
this package directory.
