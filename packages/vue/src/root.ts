import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  onMounted,
  onBeforeUnmount,
  provide,
  shallowRef,
  toValue,
  watch,
  withDirectives,
  type InjectionKey,
  type PropType,
  type Ref,
} from 'vue';

import {vFloating} from './directives';
import {
  createFloatingTopLayer,
  supportsFloatingTopLayer,
  type FloatingTopLayerController,
  type FloatingPlugin,
  type FloatingTopLayer,
  type ItemState,
} from '@floating-ui-plus/web';
import type {UseFloatingOptions, UseFloatingReturn} from './types';
import {useFloating} from './useFloating';
import {useFloatingPortalTopLayer} from './topLayerContext';

const FloatingRootKey: InjectionKey<UseFloatingReturn> = Symbol('FloatingRoot');
const FloatingRootOpenKey: InjectionKey<Readonly<Ref<boolean>>> =
  Symbol('FloatingRootOpen');
const FloatingRootTopLayerKey: InjectionKey<Readonly<Ref<FloatingTopLayer>>> =
  Symbol('FloatingRootTopLayer');
const FloatingRootTopLayerControllerKey: InjectionKey<FloatingTopLayerController> =
  Symbol('FloatingRootTopLayerController');
export interface FloatingRootHierarchy {
  floating: UseFloatingReturn;
  parent: FloatingRootHierarchy | null;
}
const FloatingRootHierarchyKey: InjectionKey<FloatingRootHierarchy> =
  Symbol('FloatingRootHierarchy');

export function useFloatingRoot(explicit?: UseFloatingReturn | null) {
  return explicit ?? inject(FloatingRootKey, null);
}

export function useFloatingRootOpen() {
  return inject(FloatingRootOpenKey, null);
}

export function useFloatingRootTopLayer() {
  return inject(FloatingRootTopLayerKey, null);
}

function useFloatingRootTopLayerController() {
  return inject(FloatingRootTopLayerControllerKey, null);
}

export function useFloatingRootHierarchy() {
  return inject(FloatingRootHierarchyKey, null);
}

/**
 * Declarative owner for a floating surface. It is the component counterpart to
 * `useFloating()`: descendants receive the controller through provide/inject.
 */
export const FloatingRoot = defineComponent({
  name: 'FloatingRoot',
  props: {
    open: {type: Boolean, default: true},
    options: {
      type: Object as PropType<Omit<UseFloatingOptions, 'open' | 'onOpenChange'>>,
      default: () => ({}),
    },
    plugins: {
      type: Array as PropType<FloatingPlugin[]>,
      default: () => [],
    },
    topLayer: {
      type: String as PropType<FloatingTopLayer>,
      default: 'none',
    },
  },
  emits: ['update:open', 'open-change'],
  setup(props, {emit, slots}) {
    const parentHierarchy = useFloatingRootHierarchy();
    const reference = shallowRef<HTMLElement | null>(null);
    const floating = shallowRef<HTMLElement | null>(null);
    const localOpen = shallowRef(props.open);
    watch(() => props.open, (open) => (localOpen.value = open));

    const api = useFloating(reference, floating, {
      placement: () => toValue(props.options.placement),
      strategy: () => toValue(props.options.strategy),
      middleware: () => toValue(props.options.middleware),
      transform: () => toValue(props.options.transform),
      open: localOpen,
      whileElementsMounted: props.options.whileElementsMounted,
      onBeforeClose: props.options.onBeforeClose,
      onOpenChange(open, event, reason) {
        localOpen.value = open;
        emit('update:open', open);
        emit('open-change', open, event, reason);
      },
    });
    const open = computed(() => localOpen.value);
    const topLayer = computed<FloatingTopLayer>(() => props.topLayer);
    const nativeTopLayer = createFloatingTopLayer({
      onOpenChange(open, event, reason) {
        if (
          !open &&
          props.options.onBeforeClose?.(event, reason) === false
        ) {
          return false;
        }
        localOpen.value = open;
        emit('update:open', open);
        emit('open-change', open, event, reason);
        return true;
      },
    });
    nativeTopLayer.connect();
    watch(
      [topLayer, open],
      ([kind, nextOpen]) => {
        // Surface declarations take precedence; this keeps the root prop as
        // a backwards-compatible default rather than a competing owner.
        if (kind !== 'none') nativeTopLayer.setKind(kind);
        nativeTopLayer.sync(nextOpen);
      },
      {flush: 'post', immediate: true},
    );
    let unregisterPlugins: (() => void) | undefined;
    watch(
      () => props.plugins,
      (plugins) => {
        unregisterPlugins?.();
        unregisterPlugins = api.registerPlugins(...plugins);
      },
      {immediate: true},
    );
    onBeforeUnmount(() => {
      unregisterPlugins?.();
      nativeTopLayer.destroy();
    });
    provide(FloatingRootKey, api);
    provide(FloatingRootOpenKey, open);
    provide(FloatingRootTopLayerKey, topLayer);
    provide(FloatingRootTopLayerControllerKey, nativeTopLayer);
    provide(FloatingRootHierarchyKey, {
      floating: api,
      parent: parentHierarchy,
    });

    return () =>
      slots.default?.({
        floating: api,
        open,
      });
  },
});

/** Binds an element to the nearest FloatingRoot reference and interaction attrs. */
export const FloatingReference = defineComponent({
  name: 'FloatingReference',
  inheritAttrs: false,
  props: {
    floating: Object as PropType<UseFloatingReturn>,
    as: {type: String, default: 'button'},
  },
  setup(props, {attrs, slots}) {
    const injected = useFloatingRoot();
    const floating = props.floating ?? injected;
    if (!floating) {
      throw new Error('FloatingReference requires a FloatingRoot or a floating prop.');
    }
    return () =>
      h(
        props.as,
        mergeProps(attrs, floating.referenceAttrs, {
          ref: (element: unknown) =>
            floating.controller.setReference(
              element instanceof Element ? element : null,
            ),
        }),
        slots.default?.({floating}),
      );
  },
});

/** Binds an element to the nearest FloatingRoot floating surface, attrs, and styles. */
export const FloatingContent = defineComponent({
  name: 'FloatingContent',
  inheritAttrs: false,
  props: {
    floating: Object as PropType<UseFloatingReturn>,
    as: {type: String, default: 'div'},
    topLayer: String as PropType<FloatingTopLayer | undefined>,
  },
  setup(props, {attrs, slots}) {
    const injected = useFloatingRoot();
    const topLayer = useFloatingRootTopLayer();
    const portalTopLayer = useFloatingPortalTopLayer();
    const topLayerController = useFloatingRootTopLayerController();
    const rootOpen = useFloatingRootOpen();
    const floating = props.floating ?? injected;
    if (!floating) {
      throw new Error('FloatingContent requires a FloatingRoot or a floating prop.');
    }
    const surfaceTopLayer = (): FloatingTopLayer => {
      if (props.topLayer) return props.topLayer;
      // A native dialog is an explicit surface contract. ARIA roles describe
      // semantics only and must not promote an ordinary positioned element.
      if (props.as === 'dialog') return 'dialog';
      // A portal explicitly owns the surface policy. Its default `none`
      // keeps custom portal/overlay compositions out of the native top layer.
      if (portalTopLayer) return portalTopLayer.value;
      if (topLayer?.value && topLayer.value !== 'none') return topLayer.value;
      // Vue declarative content mirrors Web Components template content:
      // ordinary surfaces use the browser Popover API by default.
      return 'popover';
    };
    const usesNativeDialog = () =>
      surfaceTopLayer() === 'dialog' && supportsFloatingTopLayer('dialog');
    let surfaceElement: HTMLElement | null = null;
    const syncNativeTopLayer = () => {
      if (!topLayerController || !rootOpen) return;
      topLayerController.setKind(surfaceTopLayer());
      if (surfaceElement && !surfaceElement.isConnected) return;
      topLayerController.sync(rootOpen.value);
    };
    onMounted(syncNativeTopLayer);
    watch(
      [rootOpen ?? shallowRef(false), surfaceTopLayer],
      syncNativeTopLayer,
      {flush: 'post'},
    );
    const setFloatingElement = (element: unknown) => {
      const floatingElement =
        element instanceof HTMLElement ? element : null;
      surfaceElement = floatingElement;
      floating.controller.setFloating(floatingElement);
      topLayerController?.setKind(surfaceTopLayer());
      topLayerController?.setElement(floatingElement);
      if (topLayerController && rootOpen) {
        const syncTopLayer = () => syncNativeTopLayer();
        // Vue invokes template refs before the containing portal wrapper is
        // inserted. Native `showModal()` rejects disconnected dialogs, so
        // retry once the same render turn has committed the DOM.
        if (floatingElement?.isConnected || floatingElement == null) {
          syncTopLayer();
        } else {
          queueMicrotask(syncTopLayer);
        }
      }
      // `vFloating` normally owns presence. Native dialogs deliberately skip
      // that directive because the browser owns their position, so retain the
      // same mount lifecycle here.
      if (usesNativeDialog()) {
        floating.controller.presence.set(
          floatingElement ? 'mounted' : 'unmounted',
        );
      }
    };
    return () => {
      const content = h(
        props.as,
        mergeProps(
          {
            // Portals used to remove closed content from the render tree. A
            // direct surface keeps its DOM ownership, so it needs the same
            // closed-state visibility contract without requiring Teleport.
            hidden: rootOpen ? !rootOpen.value : undefined,
          },
          attrs,
          floating.floatingAttrs,
          {
            ref: setFloatingElement,
          },
        ),
        slots.default?.({floating}),
      );
      return usesNativeDialog()
        ? content
        : withDirectives(content, [[vFloating, floating]]);
    };
  },
});

/** Binds item interaction attrs without requiring manual `getItemAttrs()` calls. */
export const FloatingItem = defineComponent({
  name: 'FloatingItem',
  inheritAttrs: false,
  props: {
    floating: Object as PropType<UseFloatingReturn>,
    state: {type: Object as PropType<ItemState>, default: () => ({})},
    as: {type: String, default: 'div'},
  },
  setup(props, {attrs, slots}) {
    const injected = useFloatingRoot();
    const floating = props.floating ?? injected;
    if (!floating) {
      throw new Error('FloatingItem requires a FloatingRoot or a floating prop.');
    }
    const itemAttrs = floating.getItemAttrs(() => props.state);
    return () =>
      h(
        props.as,
        mergeProps(attrs, itemAttrs),
        slots.default?.({floating, itemAttrs}),
      );
  },
});

/** Renders a control that closes its nearest FloatingRoot on click. */
export const FloatingClose = defineComponent({
  name: 'FloatingClose',
  inheritAttrs: false,
  props: {
    floating: Object as PropType<UseFloatingReturn>,
    as: {type: String, default: 'button'},
  },
  setup(props, {attrs, slots}) {
    const injected = useFloatingRoot();
    const floating = props.floating ?? injected;
    if (!floating) {
      throw new Error(
        'FloatingClose requires a FloatingRoot or a floating prop.',
      );
    }
    return () =>
      h(
        props.as,
        mergeProps(
          props.as === 'button' ? {type: 'button'} : {},
          attrs,
          {
            onClick: (event: MouseEvent) =>
              floating.context.onOpenChange(false, event, 'click'),
          },
        ),
        slots.default?.({floating}),
      );
  },
});
