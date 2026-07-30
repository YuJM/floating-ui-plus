<script setup lang="ts">
import {
  FloatingPortal,
  autoUpdate,
  createFuzzySearchSource,
  dismiss,
  flip,
  listNavigation,
  offset,
  role,
  shift,
  useFloating,
  useSearch,
  vFloating,
} from '@floating-ui-plus/vue';
import {ref, watch} from 'vue';

import {
  multilingualDestinations,
  multilingualSearchKeys,
  multilingualSearchPrompts,
  type MultilingualDestination,
} from '../../../../shared/multilingual-destinations';

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
const reference = ref<HTMLInputElement | null>(null);
const floatingElement = ref<HTMLElement | null>(null);
const itemElements = {
  current: [] as Array<HTMLElement | null>,
};

const optionId = (index: number) =>
  `vue-destination-option-${search.items.value[index]?.id ?? index}`;

const floating = useFloating(reference, floatingElement, {
  open,
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
  onOpenChange(next) {
    open.value = next;
    if (!next) activeIndex.value = null;
  },
}).pipe(
  dismiss(),
  role(() => ({
    role: 'combobox',
    activeIndex: activeIndex.value,
    getItemId: optionId,
  })),
  listNavigation(() => ({
    listRef: itemElements,
    activeIndex: activeIndex.value,
    virtual: true,
    loop: true,
    allowEscape: true,
    focusItemOnOpen: false,
    onNavigate: (index) => (activeIndex.value = index),
  })),
);

watch(search.items, (items) => {
  if (activeIndex.value != null && activeIndex.value >= items.length) {
    activeIndex.value = null;
  }
});

function bindItem(index: number, element: Element | null) {
  itemElements.current[index] = element as HTMLElement | null;
}

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

    <div class="vue-combobox-shell">
      <label class="vue-combobox-label" for="vue-destination-search">
        Destination
      </label>
      <span class="vue-combobox-icon" aria-hidden="true">⌕</span>
      <input
        id="vue-destination-search"
        ref="reference"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="Search city or country…"
        aria-describedby="vue-combobox-hints vue-combobox-status"
        data-floating-combobox-input
        :value="search.query.value"
        v-bind="floating.referenceAttrs"
        :aria-activedescendant="
          activeIndex == null ? undefined : optionId(activeIndex)
        "
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

    <FloatingPortal
      v-if="open"
      :active="open"
      :context-scope="floating.contextScope"
    >
      <Transition name="vue-surface">
        <div
          ref="floatingElement"
          v-floating="floating"
          class="vue-combobox-popup"
          data-floating-combobox-popup
          v-bind="floating.floatingAttrs"
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
            <div
              v-for="(item, index) in search.items.value"
              :id="optionId(index)"
              :key="item.id"
              :ref="(element) => bindItem(index, element as Element | null)"
              class="vue-combobox-option"
              data-floating-combobox-option
              :data-active="activeIndex === index"
              v-bind="
                floating.getItemAttrs({
                  active: activeIndex === index,
                  selected: selectedItem?.id === item.id,
                  index,
                })
              "
              @mousedown.prevent
              @click="select(item)"
            >
              <span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.region }}</small>
              </span>
              <span class="vue-language-badge">{{ item.language }}</span>
            </div>
          </template>
          <div
            v-else
            class="vue-combobox-empty"
            role="option"
            aria-disabled="true"
          >
            No destination found for “{{ search.query.value }}”
          </div>
        </div>
      </Transition>
    </FloatingPortal>

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

    <code>useSearch() + useFloating() + listNavigation()</code>
  </article>
</template>
