<script setup lang="ts">
import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  click,
  dismiss,
  role,
  useFloating,
} from '@floating-ui-plus/vue';
import {nextTick, ref} from 'vue';

const open = ref(false);
const reference = ref<HTMLElement | null>(null);
const floatingElement = ref<HTMLElement | null>(null);
const floating = useFloating(reference, floatingElement, {
  open,
  onOpenChange: (next) => (open.value = next),
}).pipe(click(), dismiss(), role({role: 'dialog'}));

function close() {
  open.value = false;
  nextTick(() => reference.value?.focus({preventScroll: true}));
}
</script>

<template>
  <section class="vue-modal-strip" aria-labelledby="vue-modal-title">
    <div>
      <span class="vue-kicker">03 / contain</span>
      <h2 id="vue-modal-title">A modal has<br /><em>its own world.</em></h2>
    </div>
    <p>Vue Teleport owns the overlay while the shared focus manager traps, restores, and coordinates the surface.</p>
    <button ref="reference" class="vue-button vue-button-outline" v-bind="floating.referenceAttrs">Enter focus room <span>→</span></button>
    <FloatingPortal v-if="open" :active="open" :context-scope="floating.contextScope">
      <FloatingOverlay lock-scroll class="vue-overlay">
        <FloatingFocusManager :context="floating.context" :options="{modal: true, initialFocus: 0, returnFocus: true, outsideElementsInert: true}">
          <section ref="floatingElement" class="vue-modal" aria-labelledby="vue-modal-heading" aria-modal="true" v-bind="floating.floatingAttrs">
            <span class="vue-panel-label">FOCUS ROOM / PRIVATE</span>
            <h3 id="vue-modal-heading">You are inside<br />the focus trap.</h3>
            <p>Escape or the action below closes this surface and returns focus to its trigger.</p>
            <button class="vue-button" @click="close">Leave room</button>
          </section>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  </section>
</template>
