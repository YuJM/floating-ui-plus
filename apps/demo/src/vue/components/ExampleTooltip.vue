<script setup lang="ts">
import {
  FloatingPortal,
  autoUpdate,
  dismiss,
  flip,
  focus,
  hover,
  offset,
  role,
  safePolygon,
  shift,
  useFloating,
  vFloating,
} from '@floating-ui-plus/vue';
import {ref} from 'vue';

const open = ref(false);
const reference = ref<HTMLElement | null>(null);
const floatingElement = ref<HTMLElement | null>(null);
const floating = useFloating(reference, floatingElement, {
  open,
  placement: 'top',
  middleware: [offset(14), flip(), shift({padding: 12})],
  whileElementsMounted: autoUpdate,
  onOpenChange: (next) => (open.value = next),
}).pipe(
  hover({handleClose: safePolygon({buffer: 4})}),
  focus(),
  dismiss(),
  role({role: 'tooltip'}),
);
</script>

<template>
  <article class="vue-demo-card bg-vue-mint">
    <div class="vue-card-top"><span class="vue-number">A</span><span>hover + focus</span></div>
    <h3>Signal tooltip</h3>
    <p>Pointer intent, keyboard focus, safe polygon, dismissal, and ARIA in one reactive pipeline.</p>
    <div class="mt-auto pt-7">
      <button ref="reference" class="vue-button" v-bind="floating.referenceAttrs">Inspect signal <span>↗</span></button>
      <FloatingPortal v-if="open" :active="open" :context-scope="floating.contextScope">
        <Transition name="vue-surface">
          <div
            ref="floatingElement"
            class="vue-tooltip"
            v-floating="floating"
            v-bind="floating.floatingAttrs"
          >
            Positioned by <b>autoUpdate</b>
          </div>
        </Transition>
      </FloatingPortal>
    </div>
    <code>hover(safePolygon()) → focus() → dismiss()</code>
  </article>
</template>
