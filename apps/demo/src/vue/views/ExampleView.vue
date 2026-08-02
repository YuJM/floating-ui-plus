<script setup lang="ts">
import {computed} from 'vue';
import ExampleClientPoint from '../components/ExampleClientPoint.vue';
import ExampleCombobox from '../components/ExampleCombobox.vue';
import ExampleMenu from '../components/ExampleMenu.vue';
import ExampleModal from '../components/ExampleModal.vue';
import ExampleSheet from '../components/ExampleSheet.vue';
import ExampleToast from '../components/ExampleToast.vue';
import ExampleCommand from '../components/ExampleCommand.vue';
import ExampleNestedMenu from '../components/ExampleNestedMenu.vue';
import ExamplePopover from '../components/ExamplePopover.vue';
import ExampleTooltip from '../components/ExampleTooltip.vue';
import MiddlewareView from './MiddlewareView.vue';
import PlacementView from './PlacementView.vue';
import type {Locale} from '../../i18n';
import type {ComboboxSource} from '../../i18n';

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
  sheet: ExampleSheet,
  toast: ExampleToast,
  command: ExampleCommand,
} as const;

const props = defineProps<{
  exampleName: keyof typeof examples;
  locale: Locale;
  source?: ComboboxSource;
}>();
const example = computed(() => examples[props.exampleName] ?? examples.tooltip);
</script>

<template>
  <ExampleCombobox
    v-if="props.exampleName === 'combobox'"
    :source="props.source"
  />
  <ExampleSheet v-else-if="props.exampleName === 'sheet'" :locale="props.locale" />
  <ExampleToast v-else-if="props.exampleName === 'toast'" :locale="props.locale" />
  <ExampleCommand v-else-if="props.exampleName === 'command'" />
  <component v-else :is="example" />
</template>
