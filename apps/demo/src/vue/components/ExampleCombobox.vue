<script setup lang="ts">
import {
  FloatingContent,
  FloatingList,
  FloatingListItem,
  FloatingPortal,
  FloatingReference,
  FloatingRoot,
  autoUpdate,
  createFuzzySearchSource,
  dismiss,
  flip,
  offset,
  shift,
  useCombobox,
  useSearch,
} from '@floating-ui-plus/vue';
import ExampleAsyncCombobox from './ExampleAsyncCombobox.vue';

import {
  multilingualDestinations,
  multilingualSearchKeys,
  multilingualSearchPrompts,
  type MultilingualDestination,
} from '../../multilingual-destinations';

const source = createFuzzySearchSource(multilingualDestinations, {
  keys: multilingualSearchKeys,
  threshold: 0.35,
});
const search = useSearch<MultilingualDestination>({
  source,
  getItemKey: (item) => item.id,
  debounceMs: 0,
});

const {
  open,
  activeIndex,
  selectedItem,
  inputProps,
  rolePlugin,
  setQuery,
  getOptionProps,
  getNavigationOptions,
} = useCombobox({
  search,
  getItemLabel: (item) => item.label,
  optionIdPrefix: 'vue-destination-option',
});

const options = {
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
} as const;
const plugins = [dismiss(), rolePlugin];
const navigationOptions = getNavigationOptions({
  allowEscape: true,
});

function applySearchSample(query: string, event: MouseEvent) {
  setQuery(query, event);
  const card = (event.currentTarget as HTMLElement | null)?.closest(
    '.vue-combobox-card',
  );
  card
    ?.querySelector<HTMLInputElement>('[data-floating-combobox-input]')
    ?.focus({preventScroll: true});
}
</script>

<template>
  <div class="vue-combobox-examples">
    <article class="vue-demo-card vue-combobox-card">
    <div class="vue-card-top">
      <span class="vue-number">F</span>
      <span>composed in Vue</span>
    </div>
    <h3>Multilingual combobox</h3>
    <p>Search by city, country, local script, alias, or forgiving typo.</p>

    <FloatingRoot v-model:open="open" :options="options" :plugins="plugins">
      <FloatingList
        v-model:active-index="activeIndex"
        navigation
        loop
        :navigation-options="navigationOptions"
      >
        <div class="vue-combobox-shell">
          <label class="vue-combobox-label" for="vue-destination-search">
            Destination
          </label>
          <span class="vue-combobox-icon" aria-hidden="true">⌕</span>
          <FloatingReference
            id="vue-destination-search"
            as="input"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="Search city or country…"
            aria-describedby="vue-combobox-hints vue-combobox-status"
            data-floating-combobox-input
            v-bind="inputProps"
          />
        </div>

        <FloatingPortal>
          <Transition name="vue-surface">
            <FloatingContent
              class="vue-combobox-popup"
              data-floating-combobox-popup
            >
              <div
                v-if="search.phase.value === 'loading'"
                class="vue-combobox-empty"
                role="option"
                aria-disabled="true"
              >
                Searching…
              </div>
              <div
                v-else-if="search.phase.value === 'error'"
                class="vue-combobox-empty"
                role="option"
                aria-disabled="true"
              >
                Search failed.
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
                  data-floating-combobox-option
                >
                  <span>
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.region }}</small>
                  </span>
                  <span class="vue-language-badge">
                    {{ item.language }}
                  </span>
                </FloatingListItem>
              </template>
              <div
                v-else-if="search.phase.value === 'empty'"
                class="vue-combobox-empty"
                role="option"
                aria-disabled="true"
              >
                No destination found for “{{ search.query.value }}”
              </div>
            </FloatingContent>
          </Transition>
        </FloatingPortal>
      </FloatingList>
    </FloatingRoot>

    <div id="vue-combobox-hints" class="vue-combobox-hints">
      <button
        v-for="[sample, destination] in multilingualSearchPrompts"
        :key="sample"
        type="button"
        :data-search-sample="sample"
        @mousedown.prevent
        @click="applySearchSample(sample, $event)"
      >
        <code>{{ sample }}</code><span>→ {{ destination }}</span>
      </button>
    </div>

    <p id="vue-combobox-status" class="sr-only" aria-live="polite">
      {{
        open
          ? search.phase.value === 'idle'
            ? 'Start typing to search'
            : search.phase.value === 'results'
              ? `${search.items.value.length} destinations available`
              : search.phase.value === 'empty'
                ? `No destinations found for ${search.query.value}`
                : search.phase.value === 'loading'
                  ? 'Searching destinations'
                  : 'Destination search failed'
          : selectedItem
            ? `${selectedItem.label} selected`
            : 'Destination suggestions closed'
      }}
    </p>

    <code>useSearch() + useCombobox() + &lt;FloatingList navigation&gt;</code>
    </article>
    <ExampleAsyncCombobox />
  </div>
</template>
