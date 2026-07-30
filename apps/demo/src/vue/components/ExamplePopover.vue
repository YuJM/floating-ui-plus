<script setup lang="ts">
import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  click,
  dismiss,
  flip,
  offset,
  role,
  shift,
  useFloating,
  vFloating,
} from '@floating-ui-plus/vue';
import {ref} from 'vue';

const open = ref(false);
const reference = ref<HTMLElement | null>(null);
const floatingElement = ref<HTMLElement | null>(null);
const floating = useFloating(reference, floatingElement, {
  open,
  placement: 'bottom-start',
  middleware: [offset(12), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
  onOpenChange: (next) => (open.value = next),
}).pipe(click(), dismiss(), role({role: 'dialog'}));
</script>

<template>
  <article class="vue-demo-card bg-vue-sky">
    <div class="vue-card-top"><span class="vue-number">B</span><span>teleport + focus</span></div>
    <h3>Anchored popover</h3>
    <p>Teleport moves the panel to body without severing its controller and focus relationship.</p>
    <div class="mt-auto pt-7">
      <button ref="reference" class="vue-button vue-button-sky" v-bind="floating.referenceAttrs">Open coordinates <span>＋</span></button>
      <FloatingPortal v-if="open" :active="open" :context-scope="floating.contextScope">
        <Transition name="vue-surface">
          <FloatingFocusManager :context="floating.context" :options="{modal: false, initialFocus: -1}">
            <section ref="floatingElement" v-floating="floating" class="vue-popover" v-bind="floating.floatingAttrs">
              <span class="vue-panel-label">REFERENCE / 42.8°</span>
              <strong>Teleport, still connected.</strong>
              <p>Outside press and ARIA keep working after the DOM move.</p>
              <button class="vue-text-button" @click="open = false">Close panel</button>
            </section>
          </FloatingFocusManager>
        </Transition>
      </FloatingPortal>
    </div>
    <code>click() → dismiss() → FloatingPortal</code>
  </article>
</template>
