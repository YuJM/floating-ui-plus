<script setup lang="ts">
import MiddlewareCase from '../components/MiddlewareCase.vue';

const cases = [
  ['01', 'offset', 'Offset', 'https://floating-ui.com/docs/offset', 'Compare the default position with a 10px gutter on the main axis.'],
  ['02', 'shift', 'Shift', 'https://floating-ui.com/docs/shift', 'Scroll horizontally. The panel stays on top and shifts along the x-axis to remain visible.'],
  ['03', 'flip', 'Flip', 'https://floating-ui.com/docs/flip', 'Scroll up. The preferred bottom placement flips to top when bottom space disappears.'],
  ['04', 'arrow', 'Arrow', 'https://floating-ui.com/docs/arrow', 'Scroll horizontally. The square arrow keeps pointing toward the reference center.'],
  ['05', 'size', 'Size', 'https://floating-ui.com/docs/size', 'Scroll vertically. Available height constrains the panel, whose content remains scrollable.'],
  ['06', 'auto', 'Auto placement', 'https://floating-ui.com/docs/autoplacement', 'Scroll vertically. The panel continuously chooses the side with the most available space.'],
  ['07', 'hide', 'Hide', 'https://floating-ui.com/docs/hide', 'Scroll up. The panel dims after escaping, then hides when its reference is fully clipped.'],
  ['08', 'inline', 'Inline', 'https://floating-ui.com/docs/inline', 'Compare the detached bounding box with the relevant client rect of a wrapped inline anchor.'],
] as const;
</script>

<template>
  <section class="pb-24" aria-labelledby="middleware-title">
    <a class="vue-back-link" href="/vue">← All Vue examples</a>
    <div class="mt-10 max-w-xl">
      <span class="vue-kicker">middleware lab</span>
      <h2 id="middleware-title">Position with<br /><em>intent.</em></h2>
      <p class="mt-6 text-vue-muted">Each card keeps its Vue controller open so the middleware result remains inspectable while you scroll the boundary.</p>
    </div>
    <div class="vue-middleware-grid">
      <MiddlewareCase
        v-for="item in cases"
        :key="item[1]"
        :index="item[0]"
        :kind="item[1]"
        :title="item[2]"
        :doc-href="item[3]"
        :detail="item[4]"
      />
    </div>
  </section>
</template>
