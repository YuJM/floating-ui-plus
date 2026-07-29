<script setup lang="ts">
import {
  FloatingFocusManager,
  FloatingNode,
  FloatingOverlay,
  FloatingPortal,
  FloatingTree,
  autoUpdate,
  click,
  clientPoint,
  dismiss,
  flip,
  focus,
  hover,
  offset,
  role,
  shift,
  useFloating,
} from '@floating-ui-plus/vue';
import {ref} from 'vue';

const menuOpen = ref(false);
const menuReference = ref<HTMLElement | null>(null);
const menuFloating = ref<HTMLElement | null>(null);
const menu = useFloating(menuReference, menuFloating, {
  open: menuOpen,
  onOpenChange: (open) => {
    menuOpen.value = open;
    if (!open) submenuOpen.value = false;
  },
  placement: 'bottom-start',
  middleware: [offset(10), flip(), shift({padding: 12})],
  whileElementsMounted: autoUpdate,
}).pipe(click(), dismiss(), role({role: 'menu'}));
const menuStyles = menu.floatingStyles;

const submenuOpen = ref(false);
const submenuReference = ref<HTMLElement | null>(null);
const submenuFloating = ref<HTMLElement | null>(null);
const submenu = useFloating(submenuReference, submenuFloating, {
  open: submenuOpen,
  onOpenChange: (open) => {
    submenuOpen.value = open;
  },
  placement: 'right-start',
  middleware: [offset(8), flip(), shift({padding: 12})],
  whileElementsMounted: autoUpdate,
}).pipe(click(), dismiss(), role({role: 'menu'}));
const submenuStyles = submenu.floatingStyles;

const modalOpen = ref(false);
const modalReference = ref<HTMLElement | null>(null);
const modalFloating = ref<HTMLElement | null>(null);
const modal = useFloating(modalReference, modalFloating, {
  open: modalOpen,
  onOpenChange: (open) => {
    modalOpen.value = open;
  },
}).pipe(click(), dismiss(), role({role: 'dialog'}));
const modalStyles = modal.floatingStyles;

const pointOpen = ref(false);
const pointReference = ref<HTMLElement | null>(null);
const pointFloating = ref<HTMLElement | null>(null);
const point = useFloating(pointReference, pointFloating, {
  open: pointOpen,
  onOpenChange: (open) => {
    pointOpen.value = open;
  },
  placement: 'top',
  middleware: [offset(14), flip(), shift({padding: 12})],
  whileElementsMounted: autoUpdate,
}).pipe(
  hover({move: true}),
  focus(),
  clientPoint(),
  dismiss(),
  role({role: 'tooltip'}),
);
const pointStyles = point.floatingStyles;

function openSubmenuFromKeyboard(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    submenuOpen.value = true;
  }
}
</script>

<template>
  <main>
    <header>
      <p class="eyebrow">FLOATING UI PLUS / VUE</p>
      <h1>Vue-native floating surfaces.</h1>
      <p>
        Positioning and interaction state come from the shared Web kernel.
        Teleport, lifecycle, slots, and context stay native to Vue.
      </p>
    </header>

    <section class="grid">
      <article class="card menu-card">
        <span class="step">01 / TELEPORT + TREE</span>
        <h2>Nested actions</h2>
        <p>Click the trigger, then “Move to project”. ArrowRight also opens the child.</p>

        <FloatingTree>
          <FloatingNode :controller="menu.controller">
            <button
              ref="menuReference"
              class="trigger"
              v-bind="menu.referenceAttrs"
            >
              Open actions <span>⌄</span>
            </button>

            <FloatingPortal>
              <div
                v-if="menuOpen"
                ref="menuFloating"
                class="surface menu"
                data-testid="actions-menu"
                v-bind="menu.floatingAttrs"
                :style="menuStyles"
              >
                <span class="surface-label">TREE COORDINATED ACTIONS</span>
                <button role="menuitem">New note <kbd>1</kbd></button>

                <FloatingNode :controller="submenu.controller">
                  <button
                    ref="submenuReference"
                    role="menuitem"
                    aria-haspopup="menu"
                    :aria-expanded="submenuOpen"
                    @keydown="openSubmenuFromKeyboard"
                  >
                    Move to project <kbd>→</kbd>
                  </button>

                  <FloatingPortal>
                    <div
                      v-if="submenuOpen"
                      ref="submenuFloating"
                      class="surface menu submenu"
                      data-testid="project-menu"
                      v-bind="submenu.floatingAttrs"
                      :style="submenuStyles"
                    >
                      <span class="surface-label">CHOOSE A PROJECT</span>
                      <button role="menuitem">Atlas <kbd>1</kbd></button>
                      <button role="menuitem">Field research <kbd>2</kbd></button>
                      <button role="menuitem">Signals <kbd>3</kbd></button>
                    </div>
                  </FloatingPortal>
                </FloatingNode>

                <button role="menuitem">Archive <kbd>3</kbd></button>
              </div>
            </FloatingPortal>
          </FloatingNode>
        </FloatingTree>
      </article>

      <article class="card point-card">
        <span class="step">02 / CLIENT POINT</span>
        <h2>Pointer-aware tooltip</h2>
        <div
          ref="pointReference"
          class="pointer-zone"
          tabindex="0"
          v-bind="point.referenceAttrs"
        >
          <span class="dot" />
          {{ pointOpen ? 'Tracking pointer' : 'Awaiting pointer' }}
        </div>
        <FloatingPortal>
          <div
            v-if="pointOpen"
            ref="pointFloating"
            class="surface tooltip"
            v-bind="point.floatingAttrs"
            :style="pointStyles"
          >
            hover() → clientPoint() → dismiss()
          </div>
        </FloatingPortal>
      </article>

      <article class="card modal-card">
        <span class="step">03 / FOCUS</span>
        <h2>A modal should feel inevitable.</h2>
        <button
          ref="modalReference"
          class="trigger"
          v-bind="modal.referenceAttrs"
        >
          Open modal
        </button>

        <FloatingPortal>
          <FloatingOverlay v-if="modalOpen" lock-scroll class="backdrop">
            <FloatingFocusManager :context="modal.context">
              <section
                ref="modalFloating"
                class="surface modal"
                v-bind="modal.floatingAttrs"
                :style="modalStyles"
                aria-modal="true"
                aria-label="Vue modal example"
              >
                <span class="surface-label">FOCUS MANAGED</span>
                <h3>Shared behavior, Vue lifecycle.</h3>
                <p>Tab stays inside. Escape closes and returns focus.</p>
                <button @click="modalOpen = false">Done</button>
              </section>
            </FloatingFocusManager>
          </FloatingOverlay>
        </FloatingPortal>
      </article>
    </section>
  </main>
</template>
