<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import * as m from '../../paraglide/messages';
import type {Locale} from '../../i18n';
import ExampleToastItem from './ExampleToastItem.vue';
import {useFloatingPresenceStack} from '@floating-ui-plus/vue';

const props = defineProps<{locale: Locale}>();
interface ToastContent {
  title: string;
  description: string;
}

const sequence = ref(0);
const viewport = ref<HTMLElement>();
const presence = useFloatingPresenceStack<ToastContent>({limit: 3, timeout: 5000});
const snapshot = presence.snapshot;
const visible = computed(() => snapshot.value.records.filter((record) => record.open).reverse());
const rendered = computed(() => [...snapshot.value.records].reverse());
const paused = presence.paused;

function closeToast(id: string) {
  presence.close(id);
}

function createToast() {
  const id = ++sequence.value;
  presence.add({
    title: `Notification ${id} created`,
    description: 'Your changes have been saved successfully.',
  }, {id: String(id)});
}

function pause(kind: 'pointer' | 'focus') {
  presence.pause(kind);
}

function resume(kind: 'pointer' | 'focus') {
  presence.resume(kind);
}

function handleFocusOut() {
  queueMicrotask(() => {
    if (!viewport.value?.contains(document.activeElement)) resume('focus');
  });
}

function handleF6(event: KeyboardEvent) {
  if (event.key === 'F6' && snapshot.value.records.some((record) => record.open)) {
    const latestClose = viewport.value?.querySelector<HTMLButtonElement>(
      '.toast-item[data-presence-index="0"] .toast-close',
    );
    if (!latestClose) return;
    event.preventDefault();
    latestClose.focus();
  }
}

onMounted(() => document.addEventListener('keydown', handleF6));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleF6);
});
</script>

<template>
  <section ref="viewport" class="toast-demo vue-toast-demo" aria-label="Toast example">
    <div class="toast-demo-copy">
      <span class="panel-kicker">TOAST / NON-MODAL</span>
      <h3>{{ m.pattern_toast_heading(undefined, {locale: props.locale}) }}</h3>
      <p>{{ m.pattern_toast_description(undefined, {locale: props.locale}) }}</p>
      <button class="toast-create" type="button" @click="createToast">Create notification <span aria-hidden="true">＋</span></button>
    </div>
    <div
      class="toast-viewport"
      :data-presence-paused="paused ? '' : undefined"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-relevant="additions"
      aria-atomic="false"
      @pointerenter="pause('pointer')"
      @pointerleave="resume('pointer')"
      @focusin="pause('focus')"
      @focusout="handleFocusOut"
    >
        <ExampleToastItem
          v-for="(record, index) in rendered"
          :id="record.id"
          :key="record.id"
          :open="record.open"
          :index="record.open ? visible.findIndex((visibleRecord) => visibleRecord.id === record.id) : index"
          :limited="record.overflowed"
          :title="record.value.title"
          :description="record.value.description"
          @close="closeToast"
          @remove="presence.remove($event)"
        />
    </div>
  </section>
</template>
