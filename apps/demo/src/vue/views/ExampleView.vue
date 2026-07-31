<script setup lang="ts">
import {computed} from 'vue';
import ExampleClientPoint from '../components/ExampleClientPoint.vue';
import ExampleCombobox from '../components/ExampleCombobox.vue';
import ExampleMenu from '../components/ExampleMenu.vue';
import ExampleModal from '../components/ExampleModal.vue';
import ExampleNestedMenu from '../components/ExampleNestedMenu.vue';
import ExamplePopover from '../components/ExamplePopover.vue';
import ExampleTooltip from '../components/ExampleTooltip.vue';
import MiddlewareView from './MiddlewareView.vue';
import PlacementView from './PlacementView.vue';
import type {Locale} from '../../i18n';

const examples = {
  tooltip: ExampleTooltip,
  popover: ExamplePopover,
  menu: ExampleMenu,
  'nested-menu': ExampleNestedMenu,
  'client-point': ExampleClientPoint,
  combobox: ExampleCombobox,
  placement: PlacementView,
  middleware: MiddlewareView,
  modal: ExampleModal,
} as const;

const props = defineProps<{exampleName: keyof typeof examples; locale: Locale}>();
const example = computed(() => examples[props.exampleName] ?? examples.tooltip);
</script>

<template>
  <component :is="example" />
</template>
