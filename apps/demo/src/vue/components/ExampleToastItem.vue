<script setup lang="ts">
import {computed, watch} from 'vue';
import {CompositeItem, useFloatingTransition} from '@floating-ui-plus/vue';

const props = defineProps<{
  id: string;
  open: boolean;
  index: number;
  limited: boolean;
  title: string;
  description: string;
}>();
const emit = defineEmits<{
  close: [id: string];
  remove: [id: string];
}>();
const {isMounted, status} = useFloatingTransition(
  computed(() => props.open),
  'top-end',
  {duration: {close: 180}},
);
const itemStyle = computed(() => ({
  '--toast-index': String(props.index),
  '--toast-offset-y': `${props.index * -84}px`,
}));

watch(isMounted, (mounted, previous) => {
  if (!mounted && previous) emit('remove', props.id);
});
</script>

<template>
  <li
    v-if="isMounted"
    class="toast-item"
    :data-status="status"
    :data-behind="props.index > 0 ? '' : undefined"
    :data-limited="props.limited ? '' : undefined"
    :inert="props.limited"
    :style="itemStyle"
  >
    <span class="toast-icon" aria-hidden="true">✓</span>
    <div class="toast-content">
      <strong>{{ props.title }}</strong>
      <p>{{ props.description }}</p>
    </div>
    <CompositeItem tag="button" class="toast-close" type="button" :aria-label="`Dismiss notification ${props.id}`" @click="emit('close', props.id)">×</CompositeItem>
  </li>
</template>
