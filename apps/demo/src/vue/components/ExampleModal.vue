<script setup lang="ts">
import {
  FloatingFocusManager,
  FloatingNode,
  FloatingOverlay,
  FloatingPortal,
  FloatingTree,
  click,
  dismiss,
  flip,
  focus,
  hover,
  offset,
  role,
  shift,
  useFloating,
  vFloating,
} from '@floating-ui-plus/vue';
import {nextTick, ref} from 'vue';

const open = ref(false);
const tooltipOpen = ref(false);
const popoverOpen = ref(false);
const nestedOpen = ref(false);
const reference = ref<HTMLElement | null>(null);
const floatingElement = ref<HTMLElement | null>(null);
const tooltipReference = ref<HTMLElement | null>(null);
const tooltipElement = ref<HTMLElement | null>(null);
const popoverReference = ref<HTMLElement | null>(null);
const popoverElement = ref<HTMLElement | null>(null);
const nestedReference = ref<HTMLElement | null>(null);
const nestedElement = ref<HTMLElement | null>(null);

const floating = useFloating(reference, floatingElement, {
  open,
  middleware: [offset(20), shift({padding: 24})],
  onOpenChange: (next) => {
    open.value = next;
    if (!next) {
      tooltipOpen.value = false;
      popoverOpen.value = false;
      nestedOpen.value = false;
    }
  },
}).pipe(click(), dismiss({outsidePress: false}), role({role: 'dialog'}));

const tooltip = useFloating(tooltipReference, tooltipElement, {
  open: tooltipOpen,
  placement: 'top',
  middleware: [offset(12), flip(), shift({padding: 12})],
  onOpenChange: (next) => (tooltipOpen.value = next),
}).pipe(hover(), focus(), dismiss(), role({role: 'tooltip'}));

const popover = useFloating(popoverReference, popoverElement, {
  open: popoverOpen,
  placement: 'bottom-start',
  middleware: [offset(12), flip(), shift({padding: 18})],
  onOpenChange: (next) => (popoverOpen.value = next),
}).pipe(click(), dismiss(), role({role: 'dialog'}));

const nested = useFloating(nestedReference, nestedElement, {
  open: nestedOpen,
  middleware: [offset(20), shift({padding: 24})],
  onOpenChange: (next) => (nestedOpen.value = next),
}).pipe(click(), dismiss({outsidePress: false}), role({role: 'dialog'}));

function closeRoom() {
  open.value = false;
  nextTick(() => reference.value?.focus({preventScroll: true}));
}

function closeNested() {
  nestedOpen.value = false;
  nextTick(() => nestedReference.value?.focus({preventScroll: true}));
}
</script>

<template>
  <FloatingTree>
    <FloatingNode :controller="floating" id="vue-focus-room">
      <section class="vue-modal-demo" aria-label="Modal focus management example">
        <p>Open the focus room to test focus trapping, inert neighbors, and layered Escape dismissal.</p>
        <button ref="reference" class="vue-button vue-button-outline" v-bind="floating.referenceAttrs">Enter focus room <span>→</span></button>
        <FloatingPortal v-if="open" :active="open" :context-scope="floating.contextScope">
          <FloatingOverlay lock-scroll class="demo-overlay">
            <FloatingFocusManager :context="floating.context" :options="{modal: true, initialFocus: 0, returnFocus: true, outsideElementsInert: true}">
              <div class="modal-anchor">
                <section ref="floatingElement" class="modal-panel vue-modal" aria-labelledby="vue-modal-heading" aria-modal="true" v-bind="floating.floatingAttrs">
                  <span class="panel-kicker">FOCUS ROOM / PRIVATE</span>
                  <h3 id="vue-modal-heading">You are inside<br />the focus trap.</h3>
                  <p>Nested surfaces keep their own dismissal step. Escape closes the topmost surface before this room.</p>
                  <div class="modal-nested-actions">
                    <FloatingNode :controller="tooltip" id="vue-focus-room-tooltip">
                      <button ref="tooltipReference" class="text-button" v-bind="tooltip.referenceAttrs">Show placement hint</button>
                      <FloatingPortal v-if="tooltipOpen" :active="tooltipOpen" :context-scope="tooltip.contextScope">
                        <div ref="tooltipElement" class="tooltip" v-floating="tooltip" v-bind="tooltip.floatingAttrs">This tooltip stays inside the dialog.</div>
                      </FloatingPortal>
                    </FloatingNode>
                    <FloatingNode :controller="popover" id="vue-focus-room-popover">
                      <button ref="popoverReference" class="text-button" v-bind="popover.referenceAttrs">Open room details</button>
                      <FloatingPortal v-if="popoverOpen" :active="popoverOpen" :context-scope="popover.contextScope">
                        <section ref="popoverElement" class="popover-panel" aria-label="Room details" v-floating="popover" v-bind="popover.floatingAttrs">
                          <span class="panel-kicker">NESTED PORTAL</span>
                          <strong>Details stay above the dialog.</strong>
                          <p>Escape and outside press dismiss only this panel first.</p>
                          <button class="text-button" @click="popoverOpen = false">Close details</button>
                        </section>
                      </FloatingPortal>
                    </FloatingNode>
                    <FloatingNode :controller="nested" id="vue-focus-room-child-dialog">
                      <button ref="nestedReference" class="text-button" v-bind="nested.referenceAttrs">Open nested dialog</button>
                      <FloatingPortal v-if="nestedOpen" :active="nestedOpen" :context-scope="nested.contextScope">
                        <FloatingOverlay lock-scroll class="demo-overlay">
                          <FloatingFocusManager :context="nested.context" :options="{modal: true, initialFocus: 0, returnFocus: true}">
                            <div class="modal-anchor">
                              <section ref="nestedElement" class="modal-panel nested-modal-panel vue-modal" aria-label="Nested dialog" aria-modal="true" v-bind="nested.floatingAttrs">
                                <span class="panel-kicker">SECOND LAYER</span>
                                <h3>One more<br />focus boundary.</h3>
                                <p>Close this layer to resume the parent dialog.</p>
                                <button class="vue-button" @click="closeNested">Return to focus room</button>
                              </section>
                            </div>
                          </FloatingFocusManager>
                        </FloatingOverlay>
                      </FloatingPortal>
                    </FloatingNode>
                  </div>
                  <div class="modal-actions">
                    <button class="vue-button" @click="closeRoom">Leave room</button>
                    <span class="modal-hint">ESC closes the top layer</span>
                  </div>
                </section>
              </div>
            </FloatingFocusManager>
          </FloatingOverlay>
        </FloatingPortal>
      </section>
    </FloatingNode>
  </FloatingTree>
</template>
