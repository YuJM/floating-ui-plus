<script setup lang="ts">
import {
  FloatingArrow,
  FloatingPortal,
  arrow,
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
import type {Middleware} from '@floating-ui-plus/vue';
import {computed, ref, shallowRef} from 'vue';
import {TOOLTIP_ARROW} from '../../example-config';

const open = ref(false);
const reference = ref<HTMLElement | null>(null);
const floatingElement = ref<HTMLElement | null>(null);
const arrowElement = shallowRef<SVGSVGElement | null>(null);
const middleware = computed<Middleware[]>(() => [
  offset(TOOLTIP_ARROW.gap),
  flip(),
  shift({padding: 12}),
  ...(arrowElement.value ? [arrow({element: arrowElement.value})] : []),
]);
const floating = useFloating(reference, floatingElement, {
  open,
  placement: 'top',
  middleware,
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
  <article class="demo-card tooltip-card">
    <div class="card-top">
      <span class="number">A</span><span class="chip">hover + focus</span>
    </div>
    <h3>Signal tooltip</h3>
    <p>
      One floating surface wires pointer intent, keyboard focus, dismissal, and
      descriptive ARIA.
    </p>
    <div class="card-action">
      <button ref="reference" class="ink-button" v-bind="floating.referenceAttrs">
        Inspect signal <span aria-hidden="true">↗</span>
      </button>
      <FloatingPortal v-if="open" :active="open" :context-scope="floating.contextScope">
        <Transition name="vue-surface">
          <div
            ref="floatingElement"
            class="tooltip"
            v-floating="floating"
            v-bind="floating.floatingAttrs"
          >
            Positioned by <b>autoUpdate</b>
            <FloatingArrow
              class="tooltip-arrow"
              :floating="floating"
              :width="TOOLTIP_ARROW.width"
              :height="TOOLTIP_ARROW.height"
              @element-change="arrowElement = $event"
            />
          </div>
        </Transition>
      </FloatingPortal>
    </div>
    <code>hover() → focus() → dismiss()</code>
  </article>
</template>
