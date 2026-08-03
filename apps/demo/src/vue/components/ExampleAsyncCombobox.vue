<script setup lang="ts">
import {
  FloatingContent,
  FloatingList,
  FloatingListItem,
  FloatingReference,
  FloatingRoot,
  FloatingResults,
  autoUpdate,
  dismiss,
  flip,
  offset,
  size,
  shift,
  useQuery,
  useSearch,
} from '@floating-ui-plus/vue';
import {shallowRef, watch} from 'vue';
import type {MultilingualDestination} from '../../multilingual-destinations';
import {
  FAKE_SERVER_DESTINATION_PAGE_SIZE,
  FAKE_SERVER_DESTINATION_TOTAL,
} from '../../fake-server-destinations';
import {searchDestinationsOnServer} from '../../server-destination-search';

const SERVER_QUERY_MAX_HEIGHT = 24 * 16;
let floatingElement: HTMLElement | null = null;

const search = useSearch<MultilingualDestination>({
  source: searchDestinationsOnServer,
  getItemKey: (item) => item.id,
  debounceMs: 180,
  cacheTtlMs: 5_000,
  limit: FAKE_SERVER_DESTINATION_PAGE_SIZE,
});
const selectedDestination = shallowRef<MultilingualDestination | null>(null);
const {
  open,
  activeIndex,
  statusText,
  loading,
  inputProps,
  rolePlugin,
  getOptionProps,
  getNavigationOptions,
} = useQuery({
  search,
  getItemLabel: (item) => item.label,
  onActivate(item) {
    selectedDestination.value = item;
    // QueryController leaves result presentation to the application. Preserve
    // the selected label in this destination field without reopening it.
    search.controller.setQuery(item.label);
  },
  status: {
    closed: () =>
      selectedDestination.value
        ? `${selectedDestination.value.label} selected from the server`
        : 'Remote destination suggestions closed',
    idle: 'Remote destination search is idle',
    loading: 'Querying remote destinations',
    error: 'Remote destination search failed',
    empty: ({search: state}) => `No remote matches for ${state.query}`,
    results: ({search: state}) =>
      `${state.items.length} remote destinations available`,
  },
});
// Vue keeps FloatingContent mounted while closed. Clear a stale viewport cap
// so the next open can let flip measure the surface before size constrains it.
watch(
  open,
  (isOpen) => {
    if (isOpen || !floatingElement) return;
    floatingElement.style.removeProperty('max-height');
    floatingElement.style.removeProperty(
      '--vue-async-combobox-popup-max-height',
    );
  },
  {flush: 'sync'},
);
const options = {
  placement: 'bottom-start',
  middleware: [
    offset(8),
    flip({padding: 18}),
    shift({padding: 18}),
    size({
      padding: 18,
      rootBoundary: 'viewport',
      apply({availableHeight, elements}) {
        floatingElement = elements.floating;
        // autoUpdate can still run while the retained surface is closed.
        if (!open.value) {
          elements.floating.style.removeProperty('max-height');
          elements.floating.style.removeProperty(
            '--vue-async-combobox-popup-max-height',
          );
          return;
        }
        const maxHeight = `${Math.max(
          0,
          Math.min(availableHeight, SERVER_QUERY_MAX_HEIGHT),
        )}px`;
        elements.floating.style.setProperty(
          '--vue-async-combobox-popup-max-height',
          maxHeight,
        );
        elements.floating.style.maxHeight = maxHeight;
      },
    }),
  ],
  whileElementsMounted: autoUpdate,
} as const;
const plugins = [dismiss(), rolePlugin];
const navigationOptions = getNavigationOptions({allowEscape: true});
const loadMore = () => void search.controller.loadMore();
</script>

<template>
  <article class="vue-demo-card vue-combobox-card">
    <div class="vue-card-top">
      <span class="vue-number">F</span>
      <span>search sources</span>
    </div>
    <section class="vue-combobox-panel vue-server-combobox-panel">
    <h3>Server-side search</h3>
    <p>
      MSW simulates a cursor API over {{ FAKE_SERVER_DESTINATION_TOTAL }} distinct countries with debounce,
      cancellation, and page loading.
  </p>

    <FloatingRoot v-model:open="open" :options="options" :plugins="plugins">
      <FloatingList
        v-model:active-index="activeIndex"
        navigation
        loop
        :navigation-options="navigationOptions"
      >
        <div class="vue-combobox-shell">
          <label class="vue-combobox-label" for="vue-remote-search">
            Remote destination
          </label>
          <span class="vue-combobox-icon" aria-hidden="true">⌕</span>
          <FloatingReference
            id="vue-remote-search"
            as="input"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="Try korea, japan, china…"
            aria-describedby="vue-remote-query-status"
            class="vue-combobox-input"
            v-bind="inputProps"
          />
          <span
            v-if="loading"
            class="vue-combobox-loading-indicator"
            aria-hidden="true"
          ></span>
        </div>

        <FloatingContent class="vue-combobox-popup vue-async-combobox-popup">
          <div class="vue-async-combobox-scroll">
            <FloatingResults :search="search">
                  <template #loading>
                    <div class="vue-combobox-empty" role="option" aria-disabled="true">
                      Querying remote endpoint…
                    </div>
                  </template>
                  <template #error>
                    <div class="vue-combobox-empty" role="option" aria-disabled="true">
                      Remote search failed.
                    </div>
                  </template>
                  <template #results>
                    <FloatingListItem
                      v-for="(item, index) in search.items.value"
                      :key="item.id"
                      tag="div"
                      :label="item.label"
                      :value="item"
                      v-bind="getOptionProps(item, index)"
                      class="vue-combobox-option"
                    >
                      <span>
                        <strong>{{ item.label }}</strong>
                        <small>{{ item.region }}</small>
                      </span>
                      <span class="vue-language-badge">API</span>
                    </FloatingListItem>
                    <div
                      v-if="search.state.value.hasMore"
                      class="vue-combobox-pagination"
                      role="status"
                    >
                      <span class="vue-combobox-pagination-progress">
                        <strong>{{ search.items.value.length }}</strong> of
                        {{ search.state.value.total }} loaded
                      </span>
                      <button
                        class="vue-combobox-load-more"
                        type="button"
                        :disabled="loading"
                        @mousedown.prevent
                        @click="loadMore"
                      >
                        <span v-if="!loading">Show next 8</span>
                        <span v-else>Loading…</span>
                      </button>
                    </div>
                  </template>
                  <template #empty>
                    <div class="vue-combobox-empty" role="option" aria-disabled="true">
                      The server found no match for “{{ search.query.value }}”
                    </div>
                  </template>
            </FloatingResults>
          </div>
        </FloatingContent>
      </FloatingList>
    </FloatingRoot>

    <div class="vue-combobox-server-meta" aria-label="Server search behavior">
      <code>MSW Service Worker</code>
      <span>{{ FAKE_SERVER_DESTINATION_TOTAL }} countries</span>
      <span>8 / page</span>
      <span>AbortSignal</span>
      <span>cursor API</span>
    </div>

    <p id="vue-remote-query-status" class="sr-only" aria-live="polite">
      {{ statusText }}
    </p>

    <code>application source + useQuery()</code>
    </section>
  </article>
</template>
