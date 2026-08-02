<script setup lang="ts">
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
} from '@floating-ui-plus/vue';
import {ref} from 'vue';

const open = ref(false);
const options = {
  placement: 'bottom-start',
  strategy: 'fixed',
  middleware: [offset(12), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
} as const;
const plugins = [click(), dismiss(), role({role: 'dialog'})];
</script>

<template>
  <article class="vue-demo-card bg-vue-sky">
    <div class="vue-card-top">
      <span class="vue-number">B</span><span>native top layer</span>
    </div>
    <h3>Anchored popover</h3>
    <p>
      The browser lifts the panel above the page while Vue keeps its normal
      component tree.
    </p>
    <div class="mt-auto pt-7">
      <FloatingRoot
        v-model:open="open"
        v-slot="{floating}"
        :options="options"
        :plugins="plugins"
      >
        <FloatingReference class="vue-button vue-button-sky">
          Open coordinates <span>＋</span>
        </FloatingReference>
        <FloatingContent
          as="section"
          class="popover-panel"
          :data-placement="floating.placement.value"
        >
          <span class="panel-kicker">NATIVE TOP LAYER / 42.8°</span>
          <strong>Popover, still connected.</strong>
          <p>Outside press and ARIA work without a Teleport.</p>
          <FloatingClose class="text-button">Close panel</FloatingClose>
        </FloatingContent>
      </FloatingRoot>
    </div>
    <code>FloatingContent → native popover</code>
  </article>
</template>
