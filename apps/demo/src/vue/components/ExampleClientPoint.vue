<script setup lang="ts">
import {
  FloatingPortal,
  autoUpdate,
  clientPoint,
  dismiss,
  flip,
  hover,
  offset,
  role,
  shift,
  useFloating,
  vFloating,
} from '@floating-ui-plus/vue';
import {ref} from 'vue';

const open = ref(false);
const label = ref('Awaiting pointer');
const reference = ref<HTMLElement | null>(null);
const floatingElement = ref<HTMLElement | null>(null);
const floating = useFloating(reference, floatingElement, {
  open,
  placement: 'top',
  middleware: [offset(16), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
  onOpenChange: (next) => (open.value = next),
}).pipe(hover({move: true}), clientPoint(), dismiss(), role({role: 'tooltip'}));

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
      <div ref="reference" class="vue-cursor-field" tabindex="0" v-bind="floating.referenceAttrs" @mousemove="track"><i /><i /><i /><span>{{ label }}</span></div>
      <FloatingPortal v-if="open" :active="open" :context-scope="floating.contextScope">
        <div ref="floatingElement" v-floating="floating" class="vue-tooltip" v-bind="floating.floatingAttrs">Pointer is the <b>reference</b></div>
      </FloatingPortal>
    </div>
    <code>hover() → clientPoint() → dismiss()</code>
  </article>
</template>
