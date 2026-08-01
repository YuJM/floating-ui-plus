<script setup lang="ts">
import {
  FloatingContent,
  FloatingPortal,
  FloatingReference,
  FloatingRoot,
  autoUpdate,
  clientPoint,
  dismiss,
  flip,
  hover,
  offset,
  role,
  shift,
} from '@floating-ui-plus/vue';
import {ref} from 'vue';

const open = ref(false);
const label = ref('Awaiting pointer');
const options = {
  placement: 'top',
  middleware: [offset(16), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
} as const;
const plugins = [
  hover({move: true}),
  clientPoint(),
  dismiss(),
  role({role: 'tooltip'}),
];

function track(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  label.value = `${Math.round(event.clientX - rect.left)} × ${Math.round(event.clientY - rect.top)}`;
}
</script>

<template>
  <article class="vue-demo-card bg-vue-sand">
    <div class="vue-card-top"><span class="vue-number">D</span><span>virtual reference</span></div>
    <h3>Cursor signal</h3>
    <p>A virtual reference follows the pointer instead of anchoring the tooltip to the whole field.</p>
    <div class="mt-auto pt-7">
      <FloatingRoot v-model:open="open" :options="options" :plugins="plugins">
        <FloatingReference
          as="div"
          class="vue-cursor-field"
          tabindex="0"
          @mousemove="track"
        >
          <i /><i /><i /><span>{{ label }}</span>
        </FloatingReference>
        <FloatingPortal>
          <FloatingContent class="cursor-tooltip">
            Pointer is the <b>reference</b>
          </FloatingContent>
        </FloatingPortal>
      </FloatingRoot>
    </div>
    <code>FloatingReference → clientPoint()</code>
  </article>
</template>
