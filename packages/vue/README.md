# `@floating-ui-plus/vue`

Vue 3 positioning, interactions, focus management, and floating components
powered by the framework-neutral `@floating-ui-plus/web` kernel.

The package starts from the upstream `@floating-ui/vue` API. Existing
`useFloating(reference, floating, options)` and reactive `arrow()` usage remain
valid, while the returned controller can also compose Plus interactions.

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
const floatingStyles = tooltip.floatingStyles;
</script>

<template>
  <button ref="reference" v-bind="tooltip.referenceAttrs">Help</button>
  <div
    v-if="open"
    ref="floating"
    v-bind="tooltip.floatingAttrs"
    :style="floatingStyles"
  >
    Tooltip content
  </div>
</template>
```

`referenceAttrs` and `floatingAttrs` are reactive plain objects intended for
`v-bind`. Consumer classes, styles, and Vue listeners remain owned by the
template; Plus installs native interaction listeners and only supplies its
ARIA attributes.

## Vue-native portal and modal

`FloatingPortal` uses Vue `Teleport`, so injection and logical component
parentage survive even when the floating DOM moves to `body`.

```vue
<FloatingPortal>
  <FloatingOverlay v-if="open" lock-scroll>
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
is deferred until mount so importing the package during SSR is safe.

## Collections and transitions

- `FloatingTree` and `FloatingNode` coordinate nested menus through
  `provide`/`inject`, including across Teleports.
- `FloatingList`, `FloatingListItem`, `Composite`, and `CompositeItem` expose
  ordered collection and roving-focus services.
- `FloatingDelayGroup` and `NextFloatingDelayGroup` provide shared tooltip
  delay services.
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
