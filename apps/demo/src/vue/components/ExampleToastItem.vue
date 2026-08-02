<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {useFloatingTopLayer, useFloatingTransition} from '@floating-ui-plus/vue';

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
const surface = ref<HTMLElement | null>(null);
const {isMounted, status} = useFloatingTransition(
  computed(() => props.open),
  'top-end',
  {duration: {close: 180}},
);
useFloatingTopLayer(surface, computed(() => props.open), {
  kind: 'popover',
  onOpenChange(open) {
    if (!open && props.open) emit('close', props.id);
  },
});
const itemStyle = computed(() => ({
  '--floating-presence-index': String(props.index),
}));

watch(isMounted, (mounted, previous) => {
  if (!mounted && previous) emit('remove', props.id);
});
</script>

<template>
  <article
    v-if="isMounted"
    ref="surface"
    class="toast-item"
    popover="manual"
    :data-status="status"
    :data-presence-index="props.index"
    :data-behind="props.index > 0 ? '' : undefined"
    :data-limited="props.limited ? '' : undefined"
    :inert="props.limited"
    :style="itemStyle"
    role="status"
  >
    <span class="toast-icon" aria-hidden="true">✓</span>
    <div class="toast-content">
      <strong>{{ props.title }}</strong>
      <p>{{ props.description }}</p>
    </div>
    <button
      class="toast-close"
      type="button"
      :aria-label="`Dismiss notification ${props.id}`"
      @click="emit('close', props.id)"
    >×</button>
  </article>
</template>
