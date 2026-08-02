<script setup lang="ts">
import {
  FloatingContent,
  FloatingList,
  FloatingListItem,
  FloatingNode,
  FloatingReference,
  FloatingRoot,
  FloatingTree,
  autoUpdate,
  click,
  dismiss,
  flip,
  hover,
  offset,
  role,
  safePolygon,
  size,
  shift,
  transformOrigin,
} from '@floating-ui-plus/vue';
import {ref, watch} from 'vue';
import {
  NESTED_MENU_PROJECT_LABELS,
  NESTED_MENU_ROOT_LABELS,
} from '../../example-data';

const rootLabels = NESTED_MENU_ROOT_LABELS;
const projectLabels = NESTED_MENU_PROJECT_LABELS;
const rootOpen = ref(false);
const projectsOpen = ref(false);

const rootOptions = {
  placement: 'bottom-start',
  middleware: [
    offset(8),
    flip({padding: 18}),
    shift({padding: 18}),
    size({
      padding: 18,
      rootBoundary: 'viewport',
      apply({availableHeight, elements}) {
        elements.floating.style.setProperty(
          '--menu-panel-max-height',
          `${Math.max(0, availableHeight)}px`,
        );
      },
    }),
    transformOrigin({padding: 12}),
  ],
  whileElementsMounted: autoUpdate,
} as const;
const rootPlugins = [
  click(),
  dismiss({
    outsidePress: (event) =>
      !(event.target instanceof Element) ||
      !event.target.closest('.vue-submenu'),
  }),
  role({role: 'menu'}),
];

const projectOptions = {
  placement: 'right-start',
  middleware: [
    offset({mainAxis: 6, alignmentAxis: -6}),
    flip({padding: 18}),
    shift({padding: 18}),
    size({
      padding: 18,
      rootBoundary: 'viewport',
      apply({availableHeight, elements}) {
        elements.floating.style.setProperty(
          '--menu-panel-max-height',
          `${Math.max(0, availableHeight)}px`,
        );
      },
    }),
    transformOrigin({padding: 12}),
  ],
  whileElementsMounted: autoUpdate,
} as const;
const projectPlugins = [
  click(),
  hover({
    move: false,
    delay: {open: 80, close: 120},
    handleClose: safePolygon(),
  }),
  dismiss(),
  role({role: 'menu'}),
];

function handleRootNavigate(index: number | null) {
  if (index !== 1) projectsOpen.value = false;
}

watch(rootOpen, (open) => {
  if (!open) projectsOpen.value = false;
});
</script>

<template>
  <FloatingTree>
    <FloatingRoot
      v-model:open="rootOpen"
      :options="rootOptions"
      :plugins="rootPlugins"
    >
      <FloatingNode id="vue-nested-root">
        <article class="vue-demo-card bg-vue-leaf">
          <div class="vue-card-top">
            <span class="vue-number">T</span><span>tree + teleport</span>
          </div>
          <h3>Nested command tree</h3>
          <p>
            ArrowRight opens the child menu. Escape returns focus to the
            parent action.
          </p>
          <div class="mt-auto pt-7">
            <FloatingReference class="vue-button vue-button-ink">
              Open actions <span>⌄</span>
            </FloatingReference>
            <FloatingList
              navigation
              typeahead
              loop
              @update:active-index="handleRootNavigate"
            >
              <Transition name="vue-surface">
                <FloatingContent
                  class="menu-panel"
                  id="vue-actions-menu"
                >
                  <div class="menu-heading">Tree coordinated actions</div>
                  <FloatingListItem
                    tag="button"
                    :label="rootLabels[0]"
                    class="menu-item"
                    role="menuitem"
                    close-on-click
                  >
                    <span>{{ rootLabels[0] }}</span>
                    <kbd>{{ rootLabels[0].slice(0, 1).toUpperCase() }}</kbd>
                  </FloatingListItem>

                  <FloatingRoot
                    v-model:open="projectsOpen"
                    :options="projectOptions"
                    :plugins="projectPlugins"
                  >
                    <FloatingNode id="vue-nested-projects">
                      <FloatingListItem
                        reference
                        tag="button"
                        :label="rootLabels[1]"
                        class="menu-item"
                        role="menuitem"
                        aria-haspopup="menu"
                        :aria-expanded="projectsOpen"
                      >
                        <span>{{ rootLabels[1] }}</span>
                        <span class="menu-item-shortcuts">
                          <kbd>{{ rootLabels[1].slice(0, 1).toUpperCase() }}</kbd>
                          <kbd aria-hidden="true">→</kbd>
                        </span>
                      </FloatingListItem>
                      <FloatingList navigation typeahead loop nested>
                        <Transition name="vue-surface">
                          <FloatingContent
                            class="menu-panel nested-menu-submenu"
                            id="vue-project-menu"
                          >
                            <div class="menu-heading">Choose a project</div>
                            <FloatingListItem
                              v-for="label in projectLabels"
                              :key="label"
                              tag="button"
                              :label="label"
                              class="menu-item"
                              role="menuitem"
                              close-on-click="all"
                            >
                              <span>{{ label }}</span>
                              <kbd>{{ label.slice(0, 1).toUpperCase() }}</kbd>
                            </FloatingListItem>
                          </FloatingContent>
                        </Transition>
                      </FloatingList>
                    </FloatingNode>
                  </FloatingRoot>

                  <FloatingListItem
                    tag="button"
                    :label="rootLabels[2]"
                    class="menu-item"
                    role="menuitem"
                    close-on-click
                  >
                    <span>{{ rootLabels[2] }}</span>
                    <kbd>{{ rootLabels[2].slice(0, 1).toUpperCase() }}</kbd>
                  </FloatingListItem>
                </FloatingContent>
              </Transition>
            </FloatingList>
          </div>
          <code>FloatingList navigation typeahead nested</code>
        </article>
      </FloatingNode>
    </FloatingRoot>
  </FloatingTree>
</template>
