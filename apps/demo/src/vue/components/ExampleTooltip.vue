<script setup lang="ts">
import {
  FloatingArrow,
  FloatingContent,
  FloatingReference,
  FloatingRoot,
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
} from '@floating-ui-plus/vue';
import type {Middleware} from '@floating-ui-plus/vue';
import {computed, ref, shallowRef} from 'vue';
import {TOOLTIP_ARROW} from '../../example-config';

const open = ref(false);
const arrowElement = shallowRef<SVGSVGElement | null>(null);
const middleware = computed<Middleware[]>(() => [
  offset(TOOLTIP_ARROW.gap),
  flip(),
  shift({padding: 12}),
  ...(arrowElement.value ? [arrow({element: arrowElement.value})] : []),
]);
const options = {
  placement: 'top',
  middleware,
  whileElementsMounted: autoUpdate,
} as const;
const plugins = [
  hover({handleClose: safePolygon({buffer: 4})}),
  focus(),
  dismiss(),
  role({role: 'tooltip'}),
];
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
      <FloatingRoot
        v-model:open="open"
        v-slot="{floating}"
        :options="options"
        :plugins="plugins"
      >
        <FloatingReference class="ink-button">
          Inspect signal <span aria-hidden="true">↗</span>
        </FloatingReference>
        <FloatingContent
          class="tooltip"
          :data-placement="floating.placement.value"
        >
          Positioned by <b>autoUpdate</b>
          <FloatingArrow
            class="tooltip-arrow"
            :width="TOOLTIP_ARROW.width"
            :height="TOOLTIP_ARROW.height"
            @element-change="arrowElement = $event"
          />
        </FloatingContent>
      </FloatingRoot>
    </div>
    <code>hover() → focus() → dismiss()</code>
  </article>
</template>
