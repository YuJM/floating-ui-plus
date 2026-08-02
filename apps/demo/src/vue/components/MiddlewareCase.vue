<script setup lang="ts">
import {
  autoPlacement,
  autoUpdate,
  arrow,
  flip,
  FloatingArrow,
  hide,
  inline,
  offset,
  shift,
  size,
  useFloating,
  vFloating,
  type Middleware,
  type Placement,
} from '@floating-ui-plus/vue';
import {
  computed,
  nextTick,
  onMounted,
  shallowRef,
} from 'vue';
import {MIDDLEWARE_ARROW} from '../../middleware-registry';

type MiddlewareKind =
  | 'offset'
  | 'shift'
  | 'flip'
  | 'arrow'
  | 'size'
  | 'auto'
  | 'hide'
  | 'inline';

const props = defineProps<{
  index: string;
  title: string;
  docHref: string;
  detail: string;
  kind: MiddlewareKind;
}>();

const stage = shallowRef<HTMLElement | null>(null);
const primaryReference = shallowRef<HTMLElement | null>(null);
const primaryFloating = shallowRef<HTMLElement | null>(null);
const secondaryReference = shallowRef<HTMLElement | null>(null);
const secondaryFloating = shallowRef<HTMLElement | null>(null);
const arrowElement = shallowRef<HTMLElement | null>(null);

function setArrowElement(element: SVGSVGElement | null) {
  arrowElement.value = element;
}

const boundary = () => stage.value ?? undefined;

const primaryMiddleware = computed<Middleware[]>(() => {
  switch (props.kind) {
    case 'offset':
      return [offset(0)];
    case 'shift':
      return [
        shift({
          boundary: boundary(),
          padding: 8,
          rootBoundary: 'document',
        }),
      ];
    case 'flip':
      return [
        offset(8),
        flip({
          boundary: boundary(),
          padding: 8,
          rootBoundary: 'document',
        }),
        shift({
          boundary: boundary(),
          padding: 8,
          rootBoundary: 'document',
        }),
      ];
    case 'arrow':
      return [
        offset(MIDDLEWARE_ARROW.gap),
        shift({
          boundary: boundary(),
          padding: 8,
          rootBoundary: 'document',
        }),
        ...(arrowElement.value
          ? [arrow({element: arrowElement.value, padding: 8})]
          : []),
      ];
    case 'size':
      return [
        offset(8),
        size({
          boundary: boundary(),
          padding: 8,
          rootBoundary: 'document',
          apply({availableWidth, availableHeight, elements}) {
            Object.assign(elements.floating.style, {
              maxWidth: `${Math.max(0, availableWidth)}px`,
              maxHeight: `${Math.max(0, availableHeight)}px`,
            });
          },
        }),
      ];
    case 'auto':
      return [
        autoPlacement({
          boundary: boundary(),
          padding: 8,
          rootBoundary: 'document',
        }),
        shift({
          boundary: boundary(),
          padding: 8,
          rootBoundary: 'document',
        }),
      ];
    case 'hide':
      return [
        offset(8),
        hide({
          boundary: boundary(),
          rootBoundary: 'document',
        }),
        hide({
          boundary: boundary(),
          strategy: 'escaped',
          rootBoundary: 'document',
        }),
      ];
    case 'inline':
      return [offset(8)];
  }
});

const secondaryMiddleware = computed<Middleware[]>(() =>
  props.kind === 'inline' ? [inline(), offset(8)] : [offset(10)],
);

const primaryPlacement = computed<Placement>(() =>
  props.kind === 'flip' || props.kind === 'size' || props.kind === 'hide'
    ? 'bottom'
    : 'top',
);

const primary = useFloating(primaryReference, primaryFloating, {
  open: true,
  placement: primaryPlacement,
  middleware: primaryMiddleware,
  whileElementsMounted: autoUpdate,
});

const secondary = useFloating(secondaryReference, secondaryFloating, {
  open: true,
  placement: 'top',
  middleware: secondaryMiddleware,
  whileElementsMounted: autoUpdate,
});

const hideData = computed(() => {
  return (primary.middlewareData.value.hide ?? {}) as {
    referenceHidden?: boolean;
    escaped?: boolean;
  };
});

const hideStatus = computed(() =>
  hideData.value.referenceHidden
    ? 'reference hidden'
    : hideData.value.escaped
      ? 'floating escaped'
      : 'attached',
);

const codeLabel = computed(() => {
  switch (props.kind) {
    case 'offset':
      return 'offset(0) / offset(10)';
    case 'shift':
      return 'shift({padding: 8})';
    case 'flip':
      return "placement: 'bottom', middleware: [flip(), shift()]";
    case 'arrow':
      return 'offset(GAP) → shift() → arrow({element})';
    case 'size':
      return 'size({apply: set maxWidth / maxHeight})';
    case 'auto':
      return 'autoPlacement({padding: 8}) → shift({padding: 8})';
    case 'hide':
      return "hide() + hide({strategy: 'escaped'})";
    case 'inline':
      return 'inline() → offset(8)';
  }
});

onMounted(async () => {
  await nextTick();
  requestAnimationFrame(() => {
    if (!stage.value) return;
    if (props.kind === 'shift' || props.kind === 'arrow') {
      stage.value.scrollLeft = props.kind === 'shift' ? 360 : 520;
    }
    if (
      props.kind === 'flip' ||
      props.kind === 'hide' ||
      props.kind === 'size' ||
      props.kind === 'auto'
    ) {
      stage.value.scrollTop =
        props.kind === 'size' ? 210 : props.kind === 'auto' ? 130 : 160;
    }
    void primary.update();
    if (props.kind === 'offset' || props.kind === 'inline') {
      void secondary.update();
    }
  });
});
</script>

<template>
  <article
    :class="['vue-middleware-card', `vue-middleware-card--${kind}`]"
    :id="kind === 'hide' ? 'hide' : undefined"
  >
    <div class="vue-middleware-title">
      <span>{{ index }}</span>
      <h3>{{ title }}</h3>
      <a
        :href="docHref"
        target="_blank"
        rel="noreferrer"
        :aria-label="`${title} middleware official documentation`"
      >
        (DOC)
      </a>
    </div>
    <p>{{ detail }}</p>

    <div
      v-if="kind === 'offset'"
      class="vue-mw-comparison"
      aria-label="Offset comparison"
    >
      <div class="vue-mw-static-stage">
        <span class="vue-mw-demo-label">0px</span>
        <button ref="primaryReference" class="vue-mw-reference vue-mw-reference-static">
          Reference
        </button>
        <div ref="primaryFloating" v-floating="primary" class="vue-mw-panel vue-mw-panel-green">
          Floating
        </div>
      </div>
      <div class="vue-mw-static-stage">
        <span class="vue-mw-demo-label">10px</span>
        <button ref="secondaryReference" class="vue-mw-reference vue-mw-reference-static">
          Reference
        </button>
        <div ref="secondaryFloating" v-floating="secondary" class="vue-mw-panel vue-mw-panel-green">
          Floating
        </div>
      </div>
    </div>

    <div
      v-else-if="kind === 'inline'"
      class="vue-mw-inline-comparison"
      aria-label="Inline middleware comparison"
    >
      <div class="vue-mw-inline-case">
        <span class="vue-mw-demo-label">without</span>
        <p>
          Text before
          <span ref="primaryReference" class="vue-mw-inline-reference">
            a reference that wraps over multiple lines
          </span>
          after.
        </p>
        <div ref="primaryFloating" v-floating="primary" class="vue-mw-panel vue-mw-panel-paper vue-mw-panel-inline">
          Bounding box
        </div>
      </div>
      <div class="vue-mw-inline-case">
        <span class="vue-mw-demo-label">with inline()</span>
        <p>
          Text before
          <span ref="secondaryReference" class="vue-mw-inline-reference">
            a reference that wraps over multiple lines
          </span>
          after.
        </p>
        <div ref="secondaryFloating" v-floating="secondary" class="vue-mw-panel vue-mw-panel-ink vue-mw-panel-inline">
          Client rect
        </div>
      </div>
    </div>

    <div
      v-else
      ref="stage"
      class="vue-mw-stage"
      :class="{
        'vue-mw-stage-scroll-x': kind === 'shift' || kind === 'arrow',
        'vue-mw-stage-scroll-y': kind !== 'shift' && kind !== 'arrow',
        [`vue-mw-stage-${kind}`]: true,
      }"
      tabindex="0"
      :aria-label="`${title} middleware demo`"
    >
      <span class="vue-mw-scroll-hint">
        {{ kind === 'shift' || kind === 'arrow' ? 'scroll horizontally' : kind === 'size' || kind === 'auto' ? 'scroll vertically' : 'scroll up' }}
      </span>
      <div
        class="vue-mw-track"
        :class="{
          'vue-mw-track-wide': kind === 'shift' || kind === 'arrow',
          'vue-mw-track-tall': kind === 'flip' || kind === 'auto' || kind === 'hide',
          'vue-mw-track-size': kind === 'size',
        }"
      >
        <button
          ref="primaryReference"
          class="vue-mw-reference"
          :class="`vue-mw-reference-${kind}`"
        >
          Reference
        </button>
        <div
          ref="primaryFloating"
          v-floating="primary"
          class="vue-mw-panel"
          :class="[
            `vue-mw-panel-${kind}`,
            {
              'vue-mw-panel-lime': kind === 'shift',
              'vue-mw-panel-coral': kind === 'flip',
              'vue-mw-panel-ink vue-mw-panel-arrow': kind === 'arrow',
              'vue-mw-panel-paper vue-mw-panel-size': kind === 'size',
              'vue-mw-panel-mint vue-mw-panel-auto': kind === 'auto',
              'vue-mw-panel-paper vue-mw-panel-hide': kind === 'hide',
            },
          ]"
          :data-placement="primary.placement.value"
          :data-reference-hidden="kind === 'hide' ? String(Boolean(hideData.referenceHidden)) : undefined"
          :data-escaped="kind === 'hide' ? String(Boolean(hideData.escaped)) : undefined"
        >
          <template v-if="kind === 'flip' || kind === 'auto'">
            Final: {{ primary.isPositioned.value ? primary.placement.value : 'measuring' }}
          </template>
          <template v-else-if="kind === 'size'">
            <strong>Floating content</strong>
            <span>One</span><span>Two</span><span>Three</span><span>Four</span><span>Five</span>
          </template>
          <template v-else>Floating</template>
          <FloatingArrow
            v-if="kind === 'arrow'"
            class="vue-mw-arrow"
            :floating="primary"
            :width="MIDDLEWARE_ARROW.width"
            :height="MIDDLEWARE_ARROW.height"
            :static-offset="MIDDLEWARE_ARROW.staticOffset"
            @element-change="setArrowElement"
          />
        </div>
      </div>
    </div>

    <div v-if="kind === 'hide'" class="vue-mw-state-readout" aria-live="polite">
      State: {{ hideStatus }}
    </div>
    <code>{{ codeLabel }}</code>
  </article>
</template>
