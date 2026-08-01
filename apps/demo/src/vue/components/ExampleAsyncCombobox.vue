<script setup lang="ts">
import {
  FloatingContent,
  FloatingList,
  FloatingListItem,
  FloatingPortal,
  FloatingReference,
  FloatingRoot,
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
  selectedItem,
  inputProps,
  rolePlugin,
  getOptionProps,
  getNavigationOptions,
} = useCombobox({
  search,
  getItemLabel: (item) => item.label,
  optionIdPrefix: 'vue-remote-destination-option',
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
              <div
                v-if="search.phase.value === 'loading'"
                class="vue-combobox-empty"
                role="option"
                aria-disabled="true"
              >
                Querying remote endpoint…
              </div>
              <div
                v-else-if="search.phase.value === 'error'"
                class="vue-combobox-empty"
                role="option"
                aria-disabled="true"
              >
                Remote search failed.
              </div>
              <template v-else-if="search.phase.value === 'results'">
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
              <div
                v-else-if="search.phase.value === 'empty'"
                class="vue-combobox-empty"
                role="option"
                aria-disabled="true"
              >
                The server found no match for “{{ search.query.value }}”
              </div>
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
      {{
        open
          ? search.phase.value === 'results'
            ? `${search.items.value.length} remote destinations available`
            : search.phase.value === 'empty'
              ? `No remote matches for ${search.query.value}`
              : search.phase.value === 'loading'
                ? 'Querying remote destinations'
                : search.phase.value === 'error'
                  ? 'Remote destination search failed'
                  : 'Remote destination search is idle'
          : selectedItem
            ? `${selectedItem.label} selected from the server`
            : 'Remote destination suggestions closed'
      }}
    </p>

    <code>createAsyncSearchSource() + useCombobox()</code>
  </article>
</template>
