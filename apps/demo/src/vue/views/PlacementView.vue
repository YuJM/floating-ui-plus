<script setup lang="ts">
import {
  offset,
  useFloating,
  vFloating,
  type Placement,
} from '@floating-ui-plus/vue';
import {shallowRef} from 'vue';
import {DEFAULT_PLACEMENT, PLACEMENT_OPTIONS} from '../../example-data';

const selectedPlacement = shallowRef<Placement>(DEFAULT_PLACEMENT);
const reference = shallowRef<HTMLElement | null>(null);
const floating = shallowRef<HTMLElement | null>(null);
const positioning = useFloating(reference, floating, {
  placement: selectedPlacement,
  middleware: [offset(18)],
});
</script>

<template>
  <div class="vue-placement-stage" aria-label="Interactive placement selector">
      <button
        v-for="placement in PLACEMENT_OPTIONS"
        :key="placement"
        type="button"
        class="vue-placement-control"
        :class="{ 'is-selected': placement === selectedPlacement }"
        :data-placement-control="placement"
        :aria-pressed="placement === selectedPlacement"
        :aria-label="`Place floating element at ${placement}`"
        @click="selectedPlacement = placement"
      >
        <span aria-hidden="true"></span>
      </button>

      <div ref="reference" class="vue-placement-reference">Reference</div>
      <div
        ref="floating"
        v-floating="positioning"
        class="vue-placement-floating"
        :data-placement="positioning.placement.value"
        role="status"
      >
        {{ positioning.placement.value }}
      </div>
  </div>
</template>
