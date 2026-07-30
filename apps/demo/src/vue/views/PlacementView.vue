<script setup lang="ts">
import {
  PLACEMENT,
  PLACEMENTS,
  offset,
  useFloating,
  vFloating,
  type Placement,
} from '@floating-ui-plus/vue';
import {shallowRef} from 'vue';

const selectedPlacement = shallowRef<Placement>(PLACEMENT.TOP);
const reference = shallowRef<HTMLElement | null>(null);
const floating = shallowRef<HTMLElement | null>(null);
const positioning = useFloating(reference, floating, {
  placement: selectedPlacement,
  middleware: [offset(18)],
});
</script>

<template>
  <section class="vue-placement-view" aria-labelledby="vue-placement-title">
    <div class="vue-placement-copy">
      <a class="vue-back-link" href="/vue">← All Vue examples</a>
      <span class="vue-kicker">placement / 12 directions</span>
      <h2 id="vue-placement-title">Choose a constant.<br /><em>Watch it move.</em></h2>
      <p>
        Every control passes a typed value from <code>PLACEMENT</code> into the
        reactive Vue positioning pipeline.
      </p>
      <div class="vue-placement-readout" aria-live="polite">
        <span>Selected constant</span>
        <strong>
          PLACEMENT.{{
            selectedPlacement.toUpperCase().replace('-', '_')
          }}
        </strong>
        <code>{{ selectedPlacement }}</code>
      </div>
    </div>

    <div class="vue-placement-stage" aria-label="Interactive placement selector">
      <button
        v-for="placement in PLACEMENTS"
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
  </section>
</template>
