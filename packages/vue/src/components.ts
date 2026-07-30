import {
  createPortalBridge,
  focusManager,
  getContextArrowStyles,
  lockScroll,
  FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE,
  FLOATING_UI_PLUS_PORTAL_ATTRIBUTE,
  type FloatingContextScope,
  type PortalBridge,
  type FloatingContext,
  type FocusManagerOptions,
} from '@floating-ui-plus/web';
import {
  Teleport,
  computed,
  defineComponent,
  h,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  onScopeDispose,
  onUpdated,
  shallowRef,
  watch,
  type PropType,
} from 'vue';

import type {UseFloatingReturn} from './types';
import {useFloatingRoot} from './root';

function resolveContext(
  context: FloatingContext | undefined,
  floating: UseFloatingReturn | undefined,
) {
  return context ?? floating?.context ?? useFloatingRoot()?.context;
}

export const FloatingPortal = defineComponent({
  name: 'FloatingPortal',
  inheritAttrs: false,
  props: {
    to: {
      type: [String, Object] as PropType<string | Element>,
      default: 'body',
    },
    disabled: Boolean,
    active: Boolean,
    contextScope: Object as PropType<FloatingContextScope | null>,
    floating: Object as PropType<UseFloatingReturn>,
  },
  setup(props, {attrs, slots}) {
    const injected = useFloatingRoot();
    const mounted = shallowRef(false);
    const teleportTarget = shallowRef<Element | null>(null);
    const portalRoot = shallowRef<HTMLElement | null>(null);
    const portalBridge: PortalBridge = createPortalBridge({
      contextScope: props.contextScope,
      target: () => portalRoot.value,
    });

    function setPortalRoot(element: unknown) {
      portalRoot.value =
        typeof HTMLElement !== 'undefined' && element instanceof HTMLElement
          ? element
          : null;
      portalBridge.refresh();
    }

    function refreshTeleportTarget() {
      if (typeof document === 'undefined') {
        teleportTarget.value = null;
        return;
      }
      const nextTarget =
        typeof props.to === 'string'
          ? document.querySelector(props.to)
          : props.to;
      teleportTarget.value = nextTarget ?? null;
      portalBridge.refresh();
    }

    watch(
      () =>
        props.contextScope ??
        props.floating?.contextScope ??
        injected?.contextScope ??
        null,
      (scope) => portalBridge.setContextScope(scope),
      {immediate: true},
    );
    watch(
      () => props.to,
      () => refreshTeleportTarget(),
      {flush: 'post'},
    );
    onMounted(() => {
      refreshTeleportTarget();
      portalBridge.connect();
      mounted.value = true;
    });
    onUpdated(refreshTeleportTarget);
    onBeforeUnmount(() => {
      mounted.value = false;
      portalBridge.disconnect();
    });
    onScopeDispose(() => portalBridge.destroy());

    return () => {
      // Slot contents are often closed over by a parent render function. An
      // explicit state signal keeps the Teleport render effect reactive when
      // consumers conditionally render a floating surface inside the slot.
      props.active;
      const children = slots.default?.();
      if (!mounted.value || typeof document === 'undefined') return children;
      const target = teleportTarget.value;
      const teleportProps = {
        to: target ?? document.body,
        disabled: props.disabled || !target,
        defer: true,
      };
      const contextScope = props.contextScope ?? props.floating?.contextScope ?? injected?.contextScope;
      if (!contextScope) {
        return h(
          Teleport as any,
          teleportProps,
          children,
        );
      }
      return h(
        Teleport as any,
        teleportProps,
        [
          h(
            'div',
            mergeProps(attrs, {
              ref: setPortalRoot,
              [FLOATING_UI_PLUS_PORTAL_ATTRIBUTE]: '',
              style: {display: 'contents'},
            }),
            children,
          ),
        ],
      );
    };
  },
});

export const FloatingOverlay = defineComponent({
  name: 'FloatingOverlay',
  inheritAttrs: false,
  props: {
    tag: {type: String, default: 'div'},
    lockScroll: Boolean,
  },
  setup(props, {attrs, slots}) {
    let unlock: (() => void) | undefined;

    function syncLock() {
      unlock?.();
      unlock = undefined;
      if (props.lockScroll && typeof document !== 'undefined') {
        unlock = lockScroll(document);
      }
    }

    onMounted(syncLock);
    watch(() => props.lockScroll, syncLock);
    onBeforeUnmount(() => unlock?.());

    return () =>
      h(
        props.tag,
        mergeProps(
          {
            [FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE]: '',
            style: {position: 'fixed', inset: '0'},
          },
          attrs,
        ),
        slots.default?.(),
      );
  },
});

export const FloatingArrow = defineComponent({
  name: 'FloatingArrow',
  inheritAttrs: false,
  props: {
    context: {
      type: Object as PropType<FloatingContext>,
    },
    floating: Object as PropType<UseFloatingReturn>,
    width: {type: Number, default: 14},
    height: {type: Number, default: 7},
    staticOffset: {
      type: [String, Number] as PropType<string | number | null>,
      default: null,
    },
  },
  setup(props, {attrs, slots}) {
    const context = resolveContext(props.context, props.floating);
    if (!context) {
      throw new Error('FloatingArrow requires a FloatingRoot, floating, or context prop.');
    }
    const element = shallowRef<SVGSVGElement | null>(null);
    const revision = shallowRef(0);
    let unsubscribe: (() => void) | undefined;

    onMounted(() => {
      unsubscribe = context.events.on('positionchange', () => {
        revision.value++;
      });
    });
    onBeforeUnmount(() => unsubscribe?.());

    const styles = computed(() => {
      revision.value;
      if (!element.value) return {position: 'absolute' as const};
      return getContextArrowStyles(context, {
        element: element.value as unknown as HTMLElement,
        staticOffset: props.staticOffset ?? -(props.width / 2),
      });
    });

    return () =>
      h(
        'svg',
        mergeProps(
          {
            ref: element,
            'aria-hidden': 'true',
            width: props.width,
            height: props.height,
            viewBox: `0 0 ${props.width} ${props.height}`,
            style: styles.value,
          },
          attrs,
        ),
        slots.default?.() ??
          h('path', {
            d: `M0 ${props.height}L${props.width / 2} 0L${props.width} ${props.height}Z`,
          }),
      );
  },
});

export const FloatingFocusManager = defineComponent({
  name: 'FloatingFocusManager',
  props: {
    context: {
      type: Object as PropType<FloatingContext>,
    },
    floating: Object as PropType<UseFloatingReturn>,
    options: {
      type: Object as PropType<FocusManagerOptions>,
      default: () => ({}),
    },
    enabled: {type: Boolean, default: true},
  },
  setup(props, {slots}) {
    const context = resolveContext(props.context, props.floating);
    if (!context) {
      throw new Error('FloatingFocusManager requires a FloatingRoot, floating, or context prop.');
    }
    const plugin = focusManager(() => ({
      ...props.options,
      enabled: props.enabled,
    }));
    let cleanup: (() => void) | undefined;

    onMounted(() => {
      cleanup = plugin.connect(context) || undefined;
    });
    watch(
      [() => props.enabled, () => props.options],
      () => plugin.update?.(context),
      {deep: true},
    );
    onBeforeUnmount(() => cleanup?.());

    return () => slots.default?.();
  },
});

export function useFloatingFocusManager(
  context: FloatingContext,
  options: () => FocusManagerOptions = () => ({}),
) {
  const plugin = focusManager(options);
  let cleanup: (() => void) | undefined;
  onMounted(() => {
    cleanup = plugin.connect(context) || undefined;
  });
  onBeforeUnmount(() => cleanup?.());
  return plugin;
}
