<script setup lang="ts">
import {
  FloatingContent,
  FloatingList,
  FloatingListItem,
  FloatingReference,
  FloatingResults,
  FloatingRoot,
  click,
  createFuzzySearchSource,
  dismiss,
  useQuery,
  useSearch,
} from "@floating-ui-plus/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
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
const command = useQuery({
  search,
  semantics: "dialog",
  getItemLabel: (item) => item.label,
  status: {
    closed: "Command palette closed",
    idle: "Start typing to search commands",
    loading: "Searching commands",
    error: "Command search failed",
    empty: ({ search: state }) => `No commands found for ${state.query}`,
    results: ({ search: state }) => `${state.items.length} commands available`,
  },
  onActivate(item) {
    selected.value = `${item.label} selected.`;
    open.value = false;
  },
});
const {
  open,
  activeIndex,
  inputProps,
  getItemId,
  getNavigationOptions,
  getOptionProps,
  statusText,
} = command;
const plugins = [click(), dismiss(), command.rolePlugin];
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

function handleShortcut(event: KeyboardEvent) {
  const usesPrimaryModifier =
    shortcutLabel === "⌘ K" ? event.metaKey : event.ctrlKey;
  if (usesPrimaryModifier && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (open.value) {
      input.value?.focus();
    } else {
      open.value = true;
    }
  }
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
      <FloatingRoot v-model:open="open" :plugins="plugins">
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
            <div class="command-shell">
              <div class="command-input-row">
                <span aria-hidden="true">⌕</span>
                <input
                  ref="input"
                  class="command-input"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="Type a command or search…"
                  aria-label="Search commands"
                  aria-controls="vue-command-list"
                  :aria-activedescendant="activeId"
                  autofocus
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
                id="vue-command-list"
                class="command-list"
                role="listbox"
                aria-label="Commands"
              >
                <FloatingResults :search="search">
                  <template #idle>
                    <div class="command-empty">Start typing to search commands.</div>
                  </template>
                  <template #loading>
                    <div class="command-empty">Searching commands…</div>
                  </template>
                  <template #error>
                    <div class="command-empty">Command search failed.</div>
                  </template>
                  <template #empty>
                    <div class="command-empty">
                      No commands found for “{{ search.query.value }}”.
                    </div>
                  </template>
                  <template #results>
                    <FloatingListItem
                      v-for="(item, index) in search.items.value"
                      :key="item.id"
                      :label="item.label"
                      :value="item"
                      v-bind="getOptionProps(item, index)"
                    >
                      <div class="command-item">
                        <span class="command-item-icon" aria-hidden="true">{{ item.icon }}</span>
                        <span class="command-item-label">
                          <strong>{{ item.label }}</strong>
                          <small>{{ item.group }}</small>
                        </span>
                        <kbd v-if="item.shortcut">{{ item.shortcut }}</kbd>
                      </div>
                    </FloatingListItem>
                  </template>
                </FloatingResults>
              </div>
              <p class="sr-only" aria-live="polite">
                {{ statusText }}
              </p>
            </div>
          </FloatingList>
        </FloatingContent>
      </FloatingRoot>
      <p class="command-result" aria-live="polite">{{ selected }}</p>
    </div>
  </section>
</template>
