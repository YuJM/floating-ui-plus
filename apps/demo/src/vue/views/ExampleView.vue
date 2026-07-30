<script setup lang="ts">
import {computed} from 'vue';
import ExampleClientPoint from '../components/ExampleClientPoint.vue';
import ExampleCombobox from '../components/ExampleCombobox.vue';
import ExampleMenu from '../components/ExampleMenu.vue';
import ExampleModal from '../components/ExampleModal.vue';
import ExampleNestedMenu from '../components/ExampleNestedMenu.vue';
import ExamplePopover from '../components/ExamplePopover.vue';
import ExampleTooltip from '../components/ExampleTooltip.vue';

const examples = {
  tooltip: {component: ExampleTooltip, kicker: 'tooltip route', title: 'Pointer and\nkeyboard intent.'},
  popover: {component: ExamplePopover, kicker: 'popover route', title: 'Teleported,\nstill reactive.'},
  menu: {component: ExampleMenu, kicker: 'menu route', title: 'Roving focus,\none registry.'},
  'nested-menu': {component: ExampleNestedMenu, kicker: 'tree route', title: 'Menus that know\ntheir descendants.'},
  'client-point': {component: ExampleClientPoint, kicker: 'client point route', title: 'A reference\nwithout an element.'},
  combobox: {component: ExampleCombobox, kicker: 'combobox route', title: 'Search across\nwriting systems.'},
  modal: {component: ExampleModal, kicker: 'modal route', title: 'Focus has\na boundary.'},
} as const;
type ExampleName = keyof typeof examples;
const props = defineProps<{exampleName: ExampleName}>();
const example = computed(() => examples[props.exampleName] ?? examples.tooltip);
</script>

<template>
  <section class="vue-route-view">
    <a class="vue-back-link" href="/vue">← All Vue examples</a>
    <div>
      <span class="vue-kicker">{{ example.kicker }}</span>
      <h2 v-for="line in example.title.split('\n')" :key="line">{{ line }}</h2>
    </div>
    <component :is="example.component" />
  </section>
</template>
