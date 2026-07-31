<script setup lang="ts">
import {
  FloatingClose,
  FloatingContent,
  FloatingFocusManager,
  FloatingPortal,
  FloatingReference,
  FloatingRoot,
  autoUpdate,
  click,
  dismiss,
  flip,
  offset,
  role,
  shift,
} from '@floating-ui-plus/vue';
import {ref} from 'vue';

const open = ref(false);
const options = {
  placement: 'bottom-start',
  middleware: [offset(12), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
} as const;
const plugins = [click(), dismiss(), role({role: 'dialog'})];
const focusOptions = {modal: false, initialFocus: -1};
</script>

<template>
  <article class="vue-demo-card bg-vue-sky">
    <div class="vue-card-top"><span class="vue-number">B</span><span>teleport + focus</span></div>
    <h3>Anchored popover</h3>
    <p>Teleport moves the panel to body without severing its controller and focus relationship.</p>
    <div class="mt-auto pt-7">
      <FloatingRoot v-model:open="open" :options="options" :plugins="plugins">
        <FloatingReference class="vue-button vue-button-sky">
          Open coordinates <span>＋</span>
        </FloatingReference>
        <FloatingPortal v-if="open" :active="open">
          <Transition name="vue-surface">
            <FloatingFocusManager :options="focusOptions">
              <FloatingContent as="section" class="popover-panel">
                <span class="panel-kicker">REFERENCE / 42.8°</span>
                <strong>Teleport, still connected.</strong>
                <p>Outside press and ARIA keep working after the DOM move.</p>
                <FloatingClose class="text-button">Close panel</FloatingClose>
              </FloatingContent>
            </FloatingFocusManager>
          </Transition>
        </FloatingPortal>
      </FloatingRoot>
    </div>
    <code>FloatingRoot → FloatingPortal → FloatingClose</code>
  </article>
</template>
