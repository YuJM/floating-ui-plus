<script setup lang="ts">
import {
  FloatingContent,
  FloatingList,
  FloatingListItem,
  FloatingReference,
  FloatingRoot,
  click,
  createFuzzySearchSource,
  dismiss,
  role,
  useQuery,
  useSearch,
} from "@floating-ui-plus/vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import {
  commandGroups,
  commandItems,
  commandSearchKeys,
  type CommandItem,
} from "../../command-items";

const input = ref<HTMLInputElement>();
const selected = ref("Choose a command to continue.");
const source = createFuzzySearchSource(commandItems, {
  keys: commandSearchKeys,
  threshold: 0.35,
});
const search = useSearch<CommandItem>({
  source,
  getItemKey: (item) => item.id,
  debounceMs: 0,
});
const {
  open,
  activeIndex,
  inputProps,
  getItemId,
  getNavigationOptions,
  getOptionProps,
} = useQuery({
  search,
  semantics: "dialog",
  getItemKey: (item) => item.id,
  getItemLabel: (item) => item.label,
  optionIdPrefix: "vue-command-option",
  onActivate(item) {
    selected.value = `${item.label} selected.`;
  },
});
const groups = computed(() =>
  commandGroups
    .map((label) => ({
      label,
      items: search.items.value.filter((item) => item.group === label),
    }))
    .filter((group) => group.items.length),
);
const options = { strategy: "fixed", transform: false } as const;
const plugins = [click(), dismiss(), role({ role: "dialog" })];
const navigationOptions = getNavigationOptions({
  allowEscape: true,
  loop: true,
});
const activeId = computed(() =>
  activeIndex.value == null ? undefined : getItemId(activeIndex.value),
);
const shortcutLabel =
  typeof navigator !== "undefined" &&
  /Macintosh|Mac OS X|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? "⌘ K"
    : "Ctrl K";

function itemIndex(item: CommandItem) {
  return search.items.value.findIndex((candidate) => candidate.id === item.id);
}

function handleShortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    open.value = !open.value;
  }
}

async function focusOnOpen(value: boolean) {
  if (!value) return;
  await nextTick();
  input.value?.focus();
}

onMounted(() => document.addEventListener("keydown", handleShortcut));
onBeforeUnmount(() => document.removeEventListener("keydown", handleShortcut));
</script>

<template>
  <section
    class="command-demo vue-command-demo"
    aria-label="Command palette example"
  >
    <div class="command-demo-copy">
      <span class="panel-kicker">COMMAND / QUICK ACTIONS</span>
      <h3>Move at the speed of thought.</h3>
      <p>
        Search grouped actions, navigate with arrow keys, and press Enter to run
        the active command.
      </p>
      <FloatingRoot
        v-model:open="open"
        :options="options"
        :plugins="plugins"
        @update:open="focusOnOpen"
      >
        <FloatingReference class="command-trigger">
          Open command palette <kbd>{{ shortcutLabel }}</kbd>
        </FloatingReference>
        <FloatingContent
          as="dialog"
          class="command-dialog"
          aria-labelledby="vue-command-title"
        >
          <h4 id="vue-command-title" class="sr-only">Command palette</h4>
          <FloatingList
            v-model:active-index="activeIndex"
            navigation
            loop
            :navigation-options="navigationOptions"
          >
            <div class="command-shell" data-slot="command">
              <div class="command-input-row" data-slot="command-input-wrapper">
                <span aria-hidden="true">⌕</span>
                <input
                  ref="input"
                  class="command-input"
                  data-slot="command-input"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="Type a command or search…"
                  aria-label="Search commands"
                  aria-controls="vue-command-list"
                  :aria-activedescendant="activeId"
                  v-bind="inputProps"
                />
                <button
                  class="command-close"
                  type="button"
                  data-fup-close
                  aria-label="Close command palette"
                >
                  Esc
                </button>
              </div>
              <div
                v-if="search.items.value.length"
                id="vue-command-list"
                class="command-list"
                data-slot="command-list"
                role="listbox"
                aria-label="Commands"
              >
                <template
                  v-for="(group, groupIndex) in groups"
                  :key="group.label"
                >
                  <div
                    v-if="groupIndex"
                    class="command-separator"
                    data-slot="command-separator"
                    role="separator"
                  />
                  <section
                    class="command-group"
                    data-slot="command-group"
                    :aria-labelledby="`vue-command-group-${groupIndex}`"
                  >
                    <h5 :id="`vue-command-group-${groupIndex}`">
                      {{ group.label }}
                    </h5>
                    <FloatingListItem
                      v-for="item in group.items"
                      :key="item.id"
                      :label="item.label"
                      :value="item"
                      v-bind="getOptionProps(item, itemIndex(item))"
                    >
                      <div
                        class="command-item"
                        data-slot="command-item"
                        role="option"
                        :aria-selected="itemIndex(item) === activeIndex"
                      >
                        <span class="command-item-icon" aria-hidden="true">{{
                          item.icon
                        }}</span>
                        <span>{{ item.label }}</span>
                        <kbd
                          v-if="item.shortcut"
                          data-slot="command-shortcut"
                          >{{ item.shortcut }}</kbd
                        >
                      </div>
                    </FloatingListItem>
                  </section>
                </template>
              </div>
              <div v-else class="command-empty" data-slot="command-empty">
                No results found.
              </div>
            </div>
          </FloatingList>
        </FloatingContent>
      </FloatingRoot>
      <p class="command-result" aria-live="polite">{{ selected }}</p>
    </div>
  </section>
</template>
