import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  onBeforeUnmount,
  provide,
  shallowRef,
  toValue,
  watch,
  withDirectives,
  type InjectionKey,
  type PropType,
} from 'vue';

import {vFloating} from './directives';
import type {FloatingPlugin, ItemState} from '@floating-ui-plus/web';
import type {UseFloatingOptions, UseFloatingReturn} from './types';
import {useFloating} from './useFloating';

const FloatingRootKey: InjectionKey<UseFloatingReturn> = Symbol('FloatingRoot');
export interface FloatingRootHierarchy {
  floating: UseFloatingReturn;
  parent: FloatingRootHierarchy | null;
}
const FloatingRootHierarchyKey: InjectionKey<FloatingRootHierarchy> =
  Symbol('FloatingRootHierarchy');

export function useFloatingRoot(explicit?: UseFloatingReturn | null) {
  return explicit ?? inject(FloatingRootKey, null);
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
      onOpenChange(open, event, reason) {
        localOpen.value = open;
        emit('update:open', open);
        emit('open-change', open, event, reason);
      },
    });
    let unregisterPlugins: (() => void) | undefined;
    watch(
      () => props.plugins,
      (plugins) => {
        unregisterPlugins?.();
        unregisterPlugins = api.registerPlugins(...plugins);
      },
      {immediate: true},
    );
    onBeforeUnmount(() => unregisterPlugins?.());
    provide(FloatingRootKey, api);
    provide(FloatingRootHierarchyKey, {
      floating: api,
      parent: parentHierarchy,
    });

    return () =>
      slots.default?.({
        floating: api,
        open: computed(() => localOpen.value),
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
  },
  setup(props, {attrs, slots}) {
    const injected = useFloatingRoot();
    const floating = props.floating ?? injected;
    if (!floating) {
      throw new Error('FloatingContent requires a FloatingRoot or a floating prop.');
    }
    return () =>
      withDirectives(
        h(
          props.as,
          mergeProps(attrs, floating.floatingAttrs, {
            ref: (element: unknown) =>
              floating.controller.setFloating(
                element instanceof HTMLElement ? element : null,
              ),
          }),
          slots.default?.({floating}),
        ),
        [[vFloating, floating]],
      );
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
