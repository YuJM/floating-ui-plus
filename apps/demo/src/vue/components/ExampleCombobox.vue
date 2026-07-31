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
  role,
  shift,
  useSearch,
} from '@floating-ui-plus/vue';
import {ref, watch} from 'vue';

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

const open = ref(false);
const activeIndex = ref<number | null>(null);
const selectedItem = ref<MultilingualDestination | null>(null);

const optionId = (index: number) =>
  `vue-destination-option-${search.items.value[index]?.id ?? index}`;

const options = {
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
} as const;
const plugins = [
  dismiss(),
  role(() => ({
    role: 'combobox',
    activeIndex: activeIndex.value,
    getItemId: optionId,
  })),
];
const navigationOptions = {
  virtual: true,
  allowEscape: true,
  focusItemOnOpen: false,
};

watch(search.items, (items) => {
  if (activeIndex.value != null && activeIndex.value >= items.length) {
    activeIndex.value = null;
  }
});

function setQuery(query: string) {
  activeIndex.value = null;
  open.value = true;
  search.controller.setQuery(query);
}

function handleInput(event: Event) {
  setQuery((event.currentTarget as HTMLInputElement).value);
}

function select(item: MultilingualDestination) {
  selectedItem.value = item;
  search.controller.setQuery(item.label);
  activeIndex.value = null;
  open.value = false;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || activeIndex.value == null) return;
  const item = search.items.value[activeIndex.value];
  if (!item) return;
  event.preventDefault();
  select(item);
}
</script>

<template>
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
            :value="search.query.value"
            @focus="open = true"
            @input="handleInput"
            @compositionstart="search.controller.startComposition()"
            @compositionend="
              search.controller.endComposition(
                ($event.currentTarget as HTMLInputElement).value,
              )
            "
            @keydown="handleKeydown"
          />
        </div>

        <FloatingPortal v-if="open" :active="open">
          <Transition name="vue-surface">
            <FloatingContent
              class="vue-combobox-popup"
              data-floating-combobox-popup
            >
              <div
                v-if="search.loading.value"
                class="vue-combobox-empty"
                role="option"
                aria-disabled="true"
              >
                Searching…
              </div>
              <div
                v-else-if="search.error.value"
                class="vue-combobox-empty"
                role="option"
                aria-disabled="true"
              >
                Search failed.
              </div>
              <template v-else-if="search.items.value.length">
                <FloatingListItem
                  v-for="item in search.items.value"
                  :key="item.id"
                  tag="div"
                  :label="item.label"
                  :value="item"
                  :selected="selectedItem?.id === item.id"
                  class="vue-combobox-option"
                  data-floating-combobox-option
                  @mousedown.prevent
                  @click="select(item)"
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
                v-else
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
        @click="setQuery(sample)"
      >
        <code>{{ sample }}</code><span>→ {{ destination }}</span>
      </button>
    </div>
    <p id="vue-combobox-status" class="sr-only" aria-live="polite">
      {{
        open
          ? search.items.value.length
            ? `${search.items.value.length} destinations available`
            : `No destinations found for ${search.query.value}`
          : selectedItem
            ? `${selectedItem.label} selected`
            : 'Destination suggestions closed'
      }}
    </p>

    <code>useSearch() + &lt;FloatingList navigation&gt;</code>
  </article>
</template>
