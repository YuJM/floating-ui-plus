<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, reactive, ref} from 'vue';
import * as m from '../../paraglide/messages';
import type {Locale} from '../../i18n';
import ExampleToastItem from './ExampleToastItem.vue';

const props = defineProps<{locale: Locale}>();
const TIMEOUT = 5000;
const LIMIT = 3;
const sequence = ref(0);
const pointerPaused = ref(false);
const focusPaused = ref(false);
const viewport = ref<HTMLOListElement>();
const records = reactive(new Map<number, {
  open: boolean;
  remaining: number;
  startedAt: number;
  timer: number;
  limited: boolean;
}>());
const visible = computed(() => [...records.entries()].filter(([, record]) => record.open).reverse());
const rendered = computed(() => [...records.entries()].reverse());
const paused = computed(() => pointerPaused.value || focusPaused.value);

function schedule(id: number) {
  const record = records.get(id);
  if (!record || !record.open || paused.value) return;
  record.startedAt = performance.now();
  record.timer = window.setTimeout(() => closeToast(id), record.remaining);
}

function closeToast(id: number, limited = false) {
  const record = records.get(id);
  if (!record || !record.open) return;
  window.clearTimeout(record.timer);
  record.limited = limited;
  record.open = false;
}

function createToast() {
  const openRecords = [...records.entries()].filter(([, record]) => record.open);
  if (openRecords.length >= LIMIT) closeToast(openRecords[0][0], true);
  const id = ++sequence.value;
  records.set(id, {open: true, remaining: TIMEOUT, startedAt: performance.now(), timer: -1, limited: false});
  nextTick(() => schedule(id));
}

function pause(kind: 'pointer' | 'focus') {
  if (paused.value) {
    if (kind === 'pointer') pointerPaused.value = true;
    else focusPaused.value = true;
    return;
  }
  if (kind === 'pointer') pointerPaused.value = true;
  else focusPaused.value = true;
  const now = performance.now();
  records.forEach((record) => {
    if (!record.open) return;
    window.clearTimeout(record.timer);
    record.remaining = Math.max(0, record.remaining - (now - record.startedAt));
  });
}

function resume(kind: 'pointer' | 'focus') {
  if (kind === 'pointer') pointerPaused.value = false;
  else focusPaused.value = false;
  if (!paused.value) records.forEach((_, id) => schedule(id));
}

function handleFocusOut() {
  queueMicrotask(() => {
    if (!viewport.value?.contains(document.activeElement)) resume('focus');
  });
}

function handleF6(event: KeyboardEvent) {
  if (event.key === 'F6' && records.size > 0) {
    event.preventDefault();
    viewport.value?.focus();
  }
}

onMounted(() => document.addEventListener('keydown', handleF6));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleF6);
  records.forEach((record) => window.clearTimeout(record.timer));
});
</script>

<template>
  <section class="toast-demo vue-toast-demo" aria-label="Toast example">
    <div class="toast-demo-copy">
      <span class="panel-kicker">TOAST / NON-MODAL</span>
      <h3>{{ m.pattern_toast_heading(undefined, {locale: props.locale}) }}</h3>
      <p>{{ m.pattern_toast_description(undefined, {locale: props.locale}) }}</p>
      <button class="toast-create" type="button" @click="createToast">Create notification <span aria-hidden="true">＋</span></button>
    </div>
    <ol
        ref="viewport"
        class="toast-viewport"
        :data-expanded="paused ? '' : undefined"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-relevant="additions"
        tabindex="-1"
        @pointerenter="pause('pointer')"
        @pointerleave="resume('pointer')"
        @focusin="pause('focus')"
        @focusout="handleFocusOut"
      >
        <ExampleToastItem
          v-for="([id, record], index) in rendered"
          :id="id"
          :key="id"
          :open="record.open"
          :index="record.open ? visible.findIndex(([visibleId]) => visibleId === id) : index"
          :limited="record.limited"
          @close="closeToast"
          @remove="records.delete($event)"
        />
    </ol>
  </section>
</template>
