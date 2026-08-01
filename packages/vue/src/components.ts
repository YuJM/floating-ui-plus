import {
  createPortalBridge,
  focusManager,
  getContextArrowStyles,
  registerFloatingArrow,
  lockScroll,
  FLOATING_UI_PLUS_ARROW_ATTRIBUTE,
  FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
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
  getCurrentInstance,
  h,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  onScopeDispose,
  onUpdated,
  provide,
  shallowRef,
  ssrContextKey,
  watch,
  type InjectionKey,
  type PropType,
  type ShallowRef,
} from 'vue';

import type {UseFloatingReturn} from './types';
import {useFloatingRoot, useFloatingRootOpen} from './root';

function resolveContext(
  context: FloatingContext | undefined,
  floating: UseFloatingReturn | undefined,
) {
  return context ?? floating?.context ?? useFloatingRoot()?.context;
}

const PortalRootKey: InjectionKey<ShallowRef<HTMLElement | null>> =
  Symbol('FloatingPortalRoot');

export const FloatingPortal = defineComponent({
  name: 'FloatingPortal',
  inheritAttrs: false,
  props: {
    to: {
      type: [String, Object] as PropType<string | Element | undefined>,
      default: undefined,
    },
    disabled: Boolean,
    active: {type: Boolean, default: undefined},
    contextScope: Object as PropType<FloatingContextScope | null>,
    floating: Object as PropType<UseFloatingReturn>,
  },
  setup(props, {attrs, slots}) {
    const injected = useFloatingRoot();
    const rootOpen = useFloatingRootOpen();
    const instance = getCurrentInstance();
    const parentPortalRoot = inject(PortalRootKey, null);
    const isServerRendering = inject(ssrContextKey, null) !== null;
    const mounted = shallowRef(false);
    const teleportTarget = shallowRef<Element | null>(null);
    const portalRoot = shallowRef<HTMLElement | null>(null);
    const portalBridge: PortalBridge = createPortalBridge({
      contextScope: props.contextScope,
      target: () => portalRoot.value,
    });
    provide(PortalRootKey, portalRoot);
    const isActive = computed(() => rootOpen?.value ?? true);

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
        props.to === undefined
          ? parentPortalRoot?.value ?? document.body
          : typeof props.to === 'string'
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
      [() => props.to, () => parentPortalRoot?.value],
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
      // A portal nested under FloatingRoot follows that root's open state by
      // default. Keep reading `active` so existing closed-over slot render
      // functions still receive an explicit reactive update signal.
      props.active;
      if (!isActive.value) return null;
      if (isServerRendering || typeof document === 'undefined') {
        return slots.default?.();
      }
      if (!mounted.value) {
        return instance?.vnode.el ? slots.default?.() : null;
      }
      const children = slots.default?.();
      const target = teleportTarget.value;
      const teleportProps = {
        to: target ?? document.body,
        disabled: props.disabled || !target,
        defer: true,
      };
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
  emits: ['element-change'],
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
    rotation: {
      type: String as PropType<'auto' | 'none'>,
      default: 'auto',
    },
  },
  setup(props, {attrs, emit, slots}) {
    const context = resolveContext(props.context, props.floating);
    if (!context) {
      throw new Error('FloatingArrow requires a FloatingRoot, floating, or context prop.');
    }
    const arrowContext: FloatingContext = context;
    const element = shallowRef<SVGSVGElement | null>(null);
    const revision = shallowRef(0);
    let unsubscribe: (() => void) | undefined;
    let unregisterArrow: (() => void) | undefined;

    onMounted(() => {
      unsubscribe = context.events.on('positionchange', () => {
        revision.value++;
      });
    });
    onBeforeUnmount(() => {
      unsubscribe?.();
      unregisterArrow?.();
      emit('element-change', null);
    });

    function syncArrowRegistration() {
      unregisterArrow?.();
      unregisterArrow = element.value
        ? registerFloatingArrow(arrowContext, {
            element: element.value as unknown as HTMLElement,
            height: props.height,
          })
        : undefined;
    }

    function setElement(value: unknown) {
      const next = value instanceof SVGSVGElement ? value : null;
      if (element.value === next) return;
      element.value = next;
      syncArrowRegistration();
      emit('element-change', next);
    }

    watch(() => props.height, syncArrowRegistration);

    const styles = computed(() => {
      revision.value;
      if (!element.value) return {position: 'absolute' as const};
      return getContextArrowStyles(context, {
        element: element.value as unknown as HTMLElement,
        staticOffset: props.staticOffset ?? -props.height,
        rotate: props.rotation !== 'none',
      });
    });

    return () =>
      h(
        'svg',
        mergeProps(
          {
            ref: setElement,
            'aria-hidden': 'true',
            [FLOATING_UI_PLUS_ARROW_ATTRIBUTE]: '',
            [FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE]: String(props.height),
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
    const portalRoot = inject(PortalRootKey, null);
    if (!context) {
      throw new Error('FloatingFocusManager requires a FloatingRoot, floating, or context prop.');
    }
    const plugin = focusManager(() => {
      const getInsideElements =
        portalRoot || props.options.getInsideElements
          ? () => [
              ...new Set([
                ...(props.options.getInsideElements?.() ?? []),
                ...Array.from(portalRoot?.value?.children ?? []).filter(
                  (element): element is HTMLElement =>
                    element instanceof HTMLElement &&
                    element.hasAttribute(
                      FLOATING_UI_PLUS_PORTAL_ATTRIBUTE,
                    ),
                ),
              ]),
            ]
          : undefined;
      return {
        ...props.options,
        enabled: props.enabled,
        ...(getInsideElements ? {getInsideElements} : {}),
      };
    });
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
