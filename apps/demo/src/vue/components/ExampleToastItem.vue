<script setup lang="ts">
import {computed, watch} from 'vue';
import {useFloatingTransition} from '@floating-ui-plus/vue';

const props = defineProps<{
  id: number;
  open: boolean;
  index: number;
  limited: boolean;
}>();
const emit = defineEmits<{
  close: [id: number];
  remove: [id: number];
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
      <strong>Notification {{ props.id }} created</strong>
      <p>Your changes have been saved successfully.</p>
    </div>
    <button class="toast-close" type="button" :aria-label="`Dismiss notification ${props.id}`" @click="emit('close', props.id)">×</button>
  </li>
</template>
