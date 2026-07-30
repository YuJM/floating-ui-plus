<script setup lang="ts">
import ExampleClientPoint from '../components/ExampleClientPoint.vue';
import ExampleCombobox from '../components/ExampleCombobox.vue';
import ExampleMenu from '../components/ExampleMenu.vue';
import ExampleModal from '../components/ExampleModal.vue';
import ExampleNestedMenu from '../components/ExampleNestedMenu.vue';
import ExamplePopover from '../components/ExamplePopover.vue';
import ExampleTooltip from '../components/ExampleTooltip.vue';
</script>

<template>
  <section class="vue-hero" aria-labelledby="vue-stage-title">
    <div class="vue-hero-grid" />
    <div class="relative z-10 max-w-md">
      <span class="vue-kicker text-vue-green">01 / compose</span>
      <h2 id="vue-stage-title">State flows<br /><em>into space.</em></h2>
      <p>Every card is a Composition API example: refs stay local, the Web kernel stays shared, and Vue owns rendering.</p>
    </div>
    <div class="vue-orbit" aria-hidden="true"><i /><i /><i /><b /></div>
    <div class="relative z-10 self-end justify-self-end font-mono text-[10px] uppercase tracking-[.08em] text-slate-300">ROUTE MAP<br /><strong class="text-vue-green">/vue/examples/:primitive</strong></div>
  </section>
  <section class="vue-demo-grid" aria-label="Vue interaction examples">
    <ExampleTooltip />
    <ExamplePopover />
    <ExampleMenu />
    <ExampleNestedMenu />
    <ExampleClientPoint />
    <ExampleCombobox />
    <article class="vue-demo-card vue-placement-card">
      <div class="vue-card-top">
        <span class="vue-number">P</span>
        <span>12 typed directions</span>
      </div>
      <h3>Placement constants</h3>
      <p>Choose every side and alignment without repeating string literals.</p>
      <div class="mt-auto pt-7">
        <a class="vue-button vue-button-outline no-underline" href="/vue/placement">
          Open placement lab <span>↗</span>
        </a>
      </div>
      <code>PLACEMENT.BOTTOM_START</code>
    </article>
  </section>
  <ExampleModal />
</template>
