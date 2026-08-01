<script setup lang="ts">
import {ref} from 'vue';
import type {ComboboxSource} from '../../i18n';
import ExampleAsyncCombobox from './ExampleAsyncCombobox.vue';
import ExampleFuzzyCombobox from './ExampleFuzzyCombobox.vue';

const props = withDefaults(defineProps<{source?: ComboboxSource}>(), {
  source: 'fuzzy',
});

const activeSource = ref<ComboboxSource>(
  new URLSearchParams(window.location.search).get('source') === 'server'
    ? 'server'
    : props.source,
);

function sourceHref(source: ComboboxSource) {
  const url = new URL(window.location.href);
  url.searchParams.set('source', source);
  return `${url.pathname}${url.search}`;
}

function navigateSource(event: KeyboardEvent, source: ComboboxSource) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  window.location.assign(sourceHref(source === 'fuzzy' ? 'server' : 'fuzzy'));
}
</script>

<template>
  <div class="vue-combobox-examples">
    <div class="vue-combobox-tabs vue-combobox-tabs--outside" role="tablist" aria-label="Combobox search source">
      <a
        id="vue-combobox-tab-fuzzy"
        :href="sourceHref('fuzzy')"
        role="tab"
        :aria-selected="activeSource === 'fuzzy'"
        aria-controls="vue-combobox-panel-fuzzy"
        :tabindex="activeSource === 'fuzzy' ? 0 : -1"
        @keydown="navigateSource($event, 'fuzzy')"
      >
        Fuzzy search
      </a>
      <a
        id="vue-combobox-tab-server"
        :href="sourceHref('server')"
        role="tab"
        :aria-selected="activeSource === 'server'"
        aria-controls="vue-combobox-panel-server"
        :tabindex="activeSource === 'server' ? 0 : -1"
        @keydown="navigateSource($event, 'server')"
      >
        Server search
      </a>
    </div>

    <div class="vue-combobox-source-panels">
      <div
        id="vue-combobox-panel-fuzzy"
        role="tabpanel"
        aria-labelledby="vue-combobox-tab-fuzzy"
        v-show="activeSource === 'fuzzy'"
      >
        <ExampleFuzzyCombobox />
      </div>
      <div
        id="vue-combobox-panel-server"
        role="tabpanel"
        aria-labelledby="vue-combobox-tab-server"
        v-show="activeSource === 'server'"
      >
        <ExampleAsyncCombobox />
      </div>
    </div>
  </div>
</template>
