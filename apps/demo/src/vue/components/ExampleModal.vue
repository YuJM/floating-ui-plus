<script setup lang="ts">
import {
  FloatingClose,
  FloatingContent,
  FloatingFocusManager,
  FloatingNode,
  FloatingOverlay,
  FloatingPortal,
  FloatingReference,
  FloatingRoot,
  FloatingTree,
  click,
  dismiss,
  flip,
  focus,
  hover,
  offset,
  role,
  shift,
} from '@floating-ui-plus/vue';
import {ref, watch} from 'vue';

const open = ref(false);
const tooltipOpen = ref(false);
const popoverOpen = ref(false);
const nestedOpen = ref(false);

const roomOptions = {
  middleware: [offset(20), shift({padding: 24})],
};
const roomPlugins = [
  click(),
  dismiss({outsidePress: false}),
  role({role: 'dialog'}),
];
const roomFocusOptions = {
  modal: true,
  initialFocus: 0,
  returnFocus: true,
  outsideElementsInert: true,
};

const tooltipOptions = {
  placement: 'top',
  middleware: [offset(12), flip(), shift({padding: 12})],
} as const;
const tooltipPlugins = [
  hover(),
  focus(),
  dismiss(),
  role({role: 'tooltip'}),
];

const popoverOptions = {
  placement: 'bottom-start',
  middleware: [offset(12), flip(), shift({padding: 18})],
} as const;
const popoverPlugins = [
  click(),
  dismiss(),
  role({role: 'dialog'}),
];

const nestedOptions = {
  middleware: [offset(20), shift({padding: 24})],
};
const nestedPlugins = [
  click(),
  dismiss({outsidePress: false}),
  role({role: 'dialog'}),
];
const nestedFocusOptions = {
  modal: true,
  initialFocus: 0,
  returnFocus: true,
};

watch(open, (next) => {
  if (next) return;
  tooltipOpen.value = false;
  popoverOpen.value = false;
  nestedOpen.value = false;
});
</script>

<template>
  <FloatingTree>
    <FloatingRoot
      v-model:open="open"
      :options="roomOptions"
      :plugins="roomPlugins"
    >
      <FloatingNode id="vue-focus-room">
        <section
          class="vue-modal-demo"
          aria-label="Modal focus management example"
        >
          <p>
            Open the focus room to test focus trapping, inert neighbors, and
            layered Escape dismissal.
          </p>
          <FloatingReference class="vue-button vue-button-outline">
            Enter focus room <span>→</span>
          </FloatingReference>

          <FloatingPortal>
            <FloatingOverlay lock-scroll class="demo-overlay">
              <FloatingFocusManager :options="roomFocusOptions">
                <div class="modal-anchor">
                  <FloatingContent
                    as="section"
                    class="modal-panel vue-modal"
                    aria-labelledby="vue-modal-heading"
                    aria-modal="true"
                  >
                    <span class="panel-kicker">FOCUS ROOM / PRIVATE</span>
                    <h3 id="vue-modal-heading">
                      You are inside<br />the focus trap.
                    </h3>
                    <p>
                      Nested surfaces keep their own dismissal step. Escape
                      closes the topmost surface before this room.
                    </p>

                    <div class="modal-nested-actions">
                      <FloatingRoot
                        v-model:open="tooltipOpen"
                        :options="tooltipOptions"
                        :plugins="tooltipPlugins"
                      >
                        <FloatingNode id="vue-focus-room-tooltip">
                          <FloatingReference class="text-button">
                            Show placement hint
                          </FloatingReference>
                          <FloatingPortal>
                            <FloatingContent class="tooltip">
                              This tooltip stays inside the dialog.
                            </FloatingContent>
                          </FloatingPortal>
                        </FloatingNode>
                      </FloatingRoot>

                      <FloatingRoot
                        v-model:open="popoverOpen"
                        :options="popoverOptions"
                        :plugins="popoverPlugins"
                      >
                        <FloatingNode id="vue-focus-room-popover">
                          <FloatingReference class="text-button">
                            Open room details
                          </FloatingReference>
                          <FloatingPortal>
                            <FloatingContent
                              as="section"
                              class="popover-panel"
                              aria-label="Room details"
                            >
                              <span class="panel-kicker">NESTED PORTAL</span>
                              <strong>
                                Details stay above the dialog.
                              </strong>
                              <p>
                                Escape and outside press dismiss only this
                                panel first.
                              </p>
                              <FloatingClose class="text-button">
                                Close details
                              </FloatingClose>
                            </FloatingContent>
                          </FloatingPortal>
                        </FloatingNode>
                      </FloatingRoot>

                      <FloatingRoot
                        v-model:open="nestedOpen"
                        :options="nestedOptions"
                        :plugins="nestedPlugins"
                      >
                        <FloatingNode id="vue-focus-room-child-dialog">
                          <FloatingReference class="text-button">
                            Open nested dialog
                          </FloatingReference>
                          <FloatingPortal>
                            <FloatingOverlay
                              lock-scroll
                              class="demo-overlay"
                            >
                              <FloatingFocusManager
                                :options="nestedFocusOptions"
                              >
                                <div class="modal-anchor">
                                  <FloatingContent
                                    as="section"
                                    class="modal-panel nested-modal-panel vue-modal"
                                    aria-label="Nested dialog"
                                    aria-modal="true"
                                  >
                                    <span class="panel-kicker">
                                      SECOND LAYER
                                    </span>
                                    <h3>
                                      One more<br />focus boundary.
                                    </h3>
                                    <p>
                                      Close this layer to resume the parent
                                      dialog.
                                    </p>
                                    <FloatingClose class="vue-button">
                                      Return to focus room
                                    </FloatingClose>
                                  </FloatingContent>
                                </div>
                              </FloatingFocusManager>
                            </FloatingOverlay>
                          </FloatingPortal>
                        </FloatingNode>
                      </FloatingRoot>
                    </div>

                    <div class="modal-actions">
                      <FloatingClose class="vue-button">
                        Leave room
                      </FloatingClose>
                      <span class="modal-hint">
                        ESC closes the top layer
                      </span>
                    </div>
                  </FloatingContent>
                </div>
              </FloatingFocusManager>
            </FloatingOverlay>
          </FloatingPortal>
        </section>
      </FloatingNode>
    </FloatingRoot>
  </FloatingTree>
</template>
