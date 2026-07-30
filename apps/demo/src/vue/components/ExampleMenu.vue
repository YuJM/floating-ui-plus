<script setup lang="ts">
import {
  FloatingPortal,
  autoUpdate,
  click,
  dismiss,
  flip,
  listNavigation,
  offset,
  role,
  shift,
  typeahead,
  useFloating,
  vFloating,
} from '@floating-ui-plus/vue';
import {ref} from 'vue';
import {MENU_LABELS} from '../../example-data';

const labels = MENU_LABELS;
const open = ref(false);
const activeIndex = ref<number | null>(null);
const reference = ref<HTMLElement | null>(null);
const floatingElement = ref<HTMLElement | null>(null);
const items = {current: [] as Array<HTMLElement | null>};
const text = {current: labels as Array<string | null>};
const floating = useFloating(reference, floatingElement, {
  open,
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
  onOpenChange: (next) => {
    open.value = next;
    if (!next) activeIndex.value = null;
  },
}).pipe(
  click(),
  dismiss(),
  role({role: 'menu'}),
  listNavigation(() => ({
    listRef: items,
    activeIndex: activeIndex.value,
    loop: true,
    onNavigate: (index) => (activeIndex.value = index),
  })),
  typeahead(() => ({
    listRef: text,
    activeIndex: activeIndex.value,
    onMatch: (index) => {
      activeIndex.value = index;
      items.current[index]?.focus({preventScroll: true});
    },
  })),
);

function bindItem(index: number, element: Element | null) {
  items.current[index] = element as HTMLElement | null;
}
</script>

<template>
  <article class="vue-demo-card bg-vue-cream">
    <div class="vue-card-top"><span class="vue-number">C</span><span>roving focus</span></div>
    <h3>Command menu</h3>
    <p>Arrow keys, looping and typeahead share one list registry. Type “signal” after opening.</p>
    <div class="mt-auto pt-7">
      <button ref="reference" class="vue-button vue-button-ink" v-bind="floating.referenceAttrs">Open navigator <span>⌄</span></button>
      <FloatingPortal v-if="open" :active="open" :context-scope="floating.contextScope">
        <Transition name="vue-surface">
          <div ref="floatingElement" v-floating="floating" class="vue-menu" v-bind="floating.floatingAttrs">
            <div class="vue-menu-heading">Jump to a field</div>
            <button
              v-for="(label, index) in labels"
              :key="label"
              :ref="(element) => bindItem(index, element as Element | null)"
              class="vue-menu-item"
              role="menuitem"
              :data-active="activeIndex === index"
              :tabindex="activeIndex === index ? 0 : -1"
              v-bind="floating.getItemAttrs({active: activeIndex === index, index})"
              @click="open = false"
            >
              <span>{{ label }}</span><kbd>{{ index + 1 }}</kbd>
            </button>
          </div>
        </Transition>
      </FloatingPortal>
    </div>
    <code>listNavigation() + typeahead()</code>
  </article>
</template>
