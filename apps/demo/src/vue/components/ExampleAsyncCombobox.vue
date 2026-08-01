<script setup lang="ts">
import {
  FloatingContent,
  FloatingList,
  FloatingListItem,
  FloatingPortal,
  FloatingReference,
  FloatingRoot,
  FloatingSearch,
  autoUpdate,
  createAsyncSearchSource,
  dismiss,
  flip,
  offset,
  shift,
  useCombobox,
  useSearch,
} from '@floating-ui-plus/vue';
import type {MultilingualDestination} from '../../multilingual-destinations';
import {searchDestinationsOnServer} from '../../server-destination-search';

const search = useSearch<MultilingualDestination>({
  source: createAsyncSearchSource({search: searchDestinationsOnServer}),
  getItemKey: (item) => item.id,
  debounceMs: 180,
  cacheTtlMs: 5_000,
});
const {
  open,
  activeIndex,
  statusText,
  inputProps,
  rolePlugin,
  getOptionProps,
  getNavigationOptions,
} = useCombobox({
  search,
  getItemLabel: (item) => item.label,
  optionIdPrefix: 'vue-remote-destination-option',
  status: {
    closed: 'Remote destination suggestions closed',
    selected: (item) => `${item.label} selected from the server`,
    idle: 'Remote destination search is idle',
    loading: 'Querying remote destinations',
    error: 'Remote destination search failed',
    empty: ({search: state}) => `No remote matches for ${state.query}`,
    results: ({search: state}) =>
      `${state.items.length} remote destinations available`,
  },
});
const options = {
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
} as const;
const plugins = [dismiss(), rolePlugin];
const navigationOptions = getNavigationOptions({allowEscape: true});
</script>

<template>
  <article class="vue-demo-card vue-combobox-card vue-server-combobox-card">
    <div class="vue-card-top">
      <span class="vue-number">A</span>
      <span>async server source</span>
    </div>
    <h3>Server-side search</h3>
    <p>
      A simulated endpoint demonstrates debounce, cancellation, and remote
      result states.
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
            placeholder="Try seoul, japan, china…"
            aria-describedby="vue-remote-combobox-status"
            v-bind="inputProps"
          />
        </div>

        <FloatingPortal>
          <Transition name="vue-surface">
            <FloatingContent class="vue-combobox-popup vue-async-combobox-popup">
              <FloatingSearch :search="search">
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
                </template>
                <template #empty>
                  <div class="vue-combobox-empty" role="option" aria-disabled="true">
                    The server found no match for “{{ search.query.value }}”
                  </div>
                </template>
              </FloatingSearch>
            </FloatingContent>
          </Transition>
        </FloatingPortal>
      </FloatingList>
    </FloatingRoot>

    <div class="vue-combobox-server-meta" aria-label="Server search behavior">
      <code>320ms latency</code>
      <span>AbortSignal</span>
      <span>5s cache</span>
    </div>

    <p id="vue-remote-combobox-status" class="sr-only" aria-live="polite">
      {{ statusText }}
    </p>

    <code>createAsyncSearchSource() + useCombobox()</code>
  </article>
</template>
