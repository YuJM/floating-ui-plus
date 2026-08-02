<script setup lang="ts">
import {FloatingClose, FloatingContent, FloatingReference, FloatingRoot, click, dismiss} from '@floating-ui-plus/vue';
import {ref} from 'vue';
import * as m from '../../paraglide/messages';
import type {Locale} from '../../i18n';
const open = ref(false);
const side = ref<'top' | 'right' | 'bottom' | 'left'>('right');
const sides = ['top', 'right', 'bottom', 'left'] as const;
const props = defineProps<{locale: Locale}>();
const plugins = [click(), dismiss()];
</script>

<template>
  <section class="sheet-demo vue-sheet-demo" aria-label="Sheet example">
    <div class="sheet-demo-copy"><span class="panel-kicker">SHEET / DIALOG</span><h3>{{ m.pattern_sheet_heading(undefined, {locale: props.locale}) }}</h3><p>{{ m.pattern_sheet_description(undefined, {locale: props.locale}) }}</p>
      <div class="sheet-side-picker" role="group" aria-label="Sheet side"><button v-for="option in sides" :key="option" type="button" :aria-pressed="side === option" @click="side = option">{{ option }}</button></div>
      <FloatingRoot v-model:open="open" :plugins="plugins">
        <FloatingReference class="sheet-trigger">Open activity sheet <span aria-hidden="true">→</span></FloatingReference>
        <FloatingContent as="dialog" class="sheet-panel" :data-side="side" aria-labelledby="vue-sheet-heading" aria-describedby="vue-sheet-description">
          <header class="sheet-header"><div><span class="panel-kicker">TODAY / 08:42</span><h4 id="vue-sheet-heading">Activity digest</h4></div><FloatingClose class="sheet-close" aria-label="Close sheet">×</FloatingClose></header>
          <p id="vue-sheet-description" class="sheet-description">Review the latest changes before returning to your workspace.</p>
          <div class="sheet-scroll-body"><article class="sheet-item"><span class="sheet-item-mark sheet-item-mark--mint" aria-hidden="true">✓</span><div><strong>Design review completed</strong><p>Spacing and focus states are ready for handoff.</p></div></article><article class="sheet-item"><span class="sheet-item-mark sheet-item-mark--cyan" aria-hidden="true">↗</span><div><strong>Three notes were linked</strong><p>The workspace graph now has a clearer next action.</p></div></article><article class="sheet-item"><span class="sheet-item-mark sheet-item-mark--coral" aria-hidden="true">!</span><div><strong>One review is waiting</strong><p>Give the launch checklist a final look.</p></div></article></div>
          <footer class="sheet-footer"><FloatingClose class="sheet-secondary">Not now</FloatingClose><FloatingClose class="sheet-primary">Open checklist</FloatingClose></footer>
        </FloatingContent>
      </FloatingRoot>
    </div><div class="sheet-demo-art" aria-hidden="true"><div class="sheet-art-orbit"></div><span class="sheet-art-label">FOCUS / CONTEXT / RETURN</span></div>
  </section>
</template>
