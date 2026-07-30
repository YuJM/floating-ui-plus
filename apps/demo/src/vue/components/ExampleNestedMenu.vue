<script setup lang="ts">
import {
  FloatingPortal,
  FloatingNode,
  FloatingTree,
  autoUpdate,
  click,
  dismiss,
  flip,
  listNavigation,
  offset,
  role,
  shift,
  typeahead,
  useFloating,
  vFloating,
} from '@floating-ui-plus/vue';
import {nextTick, ref} from 'vue';

const rootLabels = ['New note', 'Move to project', 'Archive'];
const projectLabels = ['Atlas', 'Field research', 'Signals'];
const rootOpen = ref(false);
const projectsOpen = ref(false);
const rootActive = ref<number | null>(null);
const projectActive = ref<number | null>(null);
const rootReference = ref<HTMLElement | null>(null);
const rootFloating = ref<HTMLElement | null>(null);
const projectReference = ref<HTMLElement | null>(null);
const projectFloating = ref<HTMLElement | null>(null);
const rootItems = {current: [] as Array<HTMLElement | null>};
const projectItems = {current: [] as Array<HTMLElement | null>};
const rootText = {current: rootLabels as Array<string | null>};
const projectText = {current: projectLabels as Array<string | null>};

const root = useFloating(rootReference, rootFloating, {
  open: rootOpen,
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
  onOpenChange: (next) => {
    rootOpen.value = next;
    if (!next) {
      projectsOpen.value = false;
      rootActive.value = null;
    }
  },
}).pipe(
  click(),
  dismiss({outsidePress: (event) => !(event.target instanceof Element) || !event.target.closest('.vue-submenu')}),
  role({role: 'menu'}),
  listNavigation(() => ({
    listRef: rootItems,
    activeIndex: rootActive.value,
    loop: true,
    onNavigate: (index) => {
      rootActive.value = index;
      if (index !== 1) projectsOpen.value = false;
    },
  })),
  typeahead(() => ({
    listRef: rootText,
    activeIndex: rootActive.value,
    onMatch: (index) => rootItems.current[index]?.focus({preventScroll: true}),
  })),
);

const projects = useFloating(projectReference, projectFloating, {
  open: projectsOpen,
  placement: 'right-start',
  middleware: [offset({mainAxis: 6, alignmentAxis: -6}), flip(), shift({padding: 18})],
  whileElementsMounted: autoUpdate,
  onOpenChange: (next, _event, reason) => {
    projectsOpen.value = next;
    if (!next && (reason === 'escape-key' || reason === 'focus-out')) {
      nextTick(() => rootItems.current[1]?.focus({preventScroll: true}));
    }
  },
}).pipe(
  click(),
  dismiss(),
  role({role: 'menu'}),
  listNavigation(() => ({
    listRef: projectItems,
    activeIndex: projectActive.value,
    nested: true,
    loop: true,
    onNavigate: (index) => (projectActive.value = index),
  })),
  typeahead(() => ({
    listRef: projectText,
    activeIndex: projectActive.value,
    onMatch: (index) => projectItems.current[index]?.focus({preventScroll: true}),
  })),
);

function openProjects(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    projectsOpen.value = true;
    nextTick(() => projectItems.current[0]?.focus({preventScroll: true}));
  }
}

function bindRootItem(index: number, element: unknown) {
  const item = element as HTMLElement | null;
  rootItems.current[index] = item;
  if (index === 1) projectReference.value = item;
}
</script>

<template>
  <FloatingTree>
    <FloatingNode :controller="root" id="vue-nested-root">
      <article class="vue-demo-card bg-vue-leaf">
    <div class="vue-card-top"><span class="vue-number">T</span><span>tree + teleport</span></div>
    <h3>Nested command tree</h3>
    <p>ArrowRight opens the child menu. Escape returns focus to the parent action.</p>
    <div class="mt-auto pt-7">
      <div>
          <button ref="rootReference" class="vue-button vue-button-ink" v-bind="root.referenceAttrs">Open actions <span>⌄</span></button>
          <FloatingPortal v-if="rootOpen" :active="rootOpen" :context-scope="root.contextScope">
            <Transition name="vue-surface">
              <div ref="rootFloating" v-floating="root" class="vue-menu" data-testid="actions-menu" v-bind="root.floatingAttrs">
                <div class="vue-menu-heading">Tree coordinated actions</div>
                <button
                  v-for="(label, index) in rootLabels"
                  :key="label"
                  :ref="(element) => bindRootItem(index, element)"
                  class="vue-menu-item"
                  role="menuitem"
                  :data-active="rootActive === index"
                  :tabindex="rootActive === index ? 0 : -1"
                  :aria-haspopup="index === 1 ? 'menu' : undefined"
                  :aria-expanded="index === 1 ? projectsOpen : undefined"
                  v-bind="root.getItemAttrs({active: rootActive === index, index})"
                  @keydown="index === 1 && openProjects($event)"
                  @click="index === 1 ? (projectsOpen = !projectsOpen) : (rootOpen = false)"
                >
                  <span>{{ label }}</span><kbd>{{ index === 1 ? '→' : index + 1 }}</kbd>
                </button>
              </div>
            </Transition>
          </FloatingPortal>
        <FloatingNode :controller="projects" id="vue-nested-projects">
          <FloatingPortal v-if="projectsOpen" :active="projectsOpen" :context-scope="projects.contextScope">
            <Transition name="vue-surface">
              <div ref="projectFloating" v-floating="projects" class="vue-menu vue-submenu" data-testid="project-menu" v-bind="projects.floatingAttrs">
                <div class="vue-menu-heading">Choose a project</div>
                <button v-for="(label, index) in projectLabels" :key="label" :ref="(element) => (projectItems.current[index] = element as HTMLElement | null)" class="vue-menu-item" role="menuitem" :data-active="projectActive === index" :tabindex="projectActive === index ? 0 : -1" v-bind="projects.getItemAttrs({active: projectActive === index, index})" @click="projectsOpen = false">
                  <span>{{ label }}</span><kbd>{{ index + 1 }}</kbd>
                </button>
              </div>
            </Transition>
          </FloatingPortal>
        </FloatingNode>
      </div>
    </div>
    <code>FloatingTree + FloatingNode + FloatingPortal</code>
      </article>
    </FloatingNode>
  </FloatingTree>
</template>
