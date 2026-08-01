<script setup lang="ts">
import {
  FloatingContent,
  FloatingList,
  FloatingListItem,
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
import {MENU_LABELS} from '../../example-data';

const labels = MENU_LABELS;
const open = ref(false);
const options = {
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
} as const;
const plugins = [
  click(),
  dismiss(),
  role({role: 'menu'}),
];
</script>

<template>
  <article class="vue-demo-card bg-vue-cream">
    <div class="vue-card-top"><span class="vue-number">C</span><span>roving focus</span></div>
    <h3>Command menu</h3>
    <p>Arrow keys, looping and typeahead share one list registry. Type “signal” after opening.</p>
    <div class="mt-auto pt-7">
      <FloatingRoot v-model:open="open" :options="options" :plugins="plugins">
        <FloatingReference class="vue-button vue-button-ink">
          Open navigator <span>⌄</span>
        </FloatingReference>
        <FloatingList navigation typeahead loop>
          <Transition name="vue-surface">
              <FloatingContent class="menu-panel">
                <div class="menu-heading">
                  <span>Jump to a field</span>
                  <span class="menu-shortcuts" aria-label="Arrow keys to navigate, Enter to select, Escape to close">
                    <kbd>↑</kbd><kbd>↓</kbd><kbd>↵</kbd><kbd>Esc</kbd>
                  </span>
                </div>
                <FloatingListItem
                  v-for="label in labels"
                  :key="label"
                  tag="button"
                  :label="label"
                  class="menu-item"
                  role="menuitem"
                  close-on-click
                >
                  <span>{{ label }}</span><kbd>{{ label.slice(0, 1).toUpperCase() }}</kbd>
                </FloatingListItem>
              </FloatingContent>
          </Transition>
        </FloatingList>
      </FloatingRoot>
    </div>
    <code>&lt;FloatingList navigation typeahead loop&gt;</code>
  </article>
</template>
