import {
  CompositeController,
  DelayGroup,
  FloatingList as WebFloatingList,
  FloatingTree as WebFloatingTree,
  NextDelayGroup,
  listNavigation,
  typeahead,
  type CompositeOptions,
  type DelayGroupOptions,
  type FloatingController,
  type FloatingContextScope,
  type FloatingListItemOptions,
  type ListNavigationOptions,
  type TypeaheadOptions,
} from '@floating-ui-plus/web';
import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  watch,
  type ComputedRef,
  type InjectionKey,
  type PropType,
  type ShallowRef,
} from 'vue';

import type {UseFloatingReturn} from './types';
import {
  useFloatingRoot,
  useFloatingRootHierarchy,
} from './root';

const TreeKey: InjectionKey<WebFloatingTree> = Symbol('FloatingTree');
const ParentNodeKey: InjectionKey<string | null> = Symbol('FloatingNode');
const ListKey: InjectionKey<WebFloatingList<unknown>> = Symbol('FloatingList');
interface FloatingListContext {
  activeIndex: ShallowRef<number | null>;
  floating: UseFloatingReturn | null;
  navigation: ComputedRef<boolean>;
  revision: ShallowRef<number>;
  setActiveIndex(index: number | null): void;
  virtual: ComputedRef<boolean>;
}
const ListContextKey: InjectionKey<FloatingListContext> =
  Symbol('FloatingListContext');
const DelayGroupKey: InjectionKey<DelayGroup> = Symbol('FloatingDelayGroup');
const CompositeKey: InjectionKey<{
  controller: CompositeController;
  elements: Set<HTMLElement>;
  sync(): void;
}> = Symbol('FloatingComposite');
const ScopeKey: InjectionKey<FloatingContextScope> = Symbol(
  'FloatingContextScope',
);

let nodeId = 0;

type FloatingControllerInput = FloatingController | UseFloatingReturn;

function resolveController(
  input?: FloatingControllerInput | null,
  fallback?: UseFloatingReturn | null,
) {
  const controller = input ? ('controller' in input ? input.controller : input) : fallback?.controller;
  if (!controller) {
    throw new Error('FloatingNode, FloatingList, and FloatingDelayGroup require a FloatingRoot or controller prop.');
  }
  return controller;
}

export function useFloatingTree(explicit?: WebFloatingTree | null) {
  return explicit ?? inject(TreeKey, null);
}

export function useFloatingContextScope(
  explicit?: FloatingContextScope | null,
) {
  return explicit ?? inject(ScopeKey, null);
}

export const FloatingTree = defineComponent({
  name: 'FloatingTree',
  props: {
    tree: Object as PropType<WebFloatingTree>,
  },
  setup(props, {slots}) {
    const tree = props.tree ?? new WebFloatingTree();
    provide(TreeKey, tree);
    provide(ParentNodeKey, null);
    return () => slots.default?.({tree});
  },
});

export const FloatingNode = defineComponent({
  name: 'FloatingNode',
  props: {
    controller: {
      type: Object as PropType<FloatingControllerInput>,
    },
    id: String,
    parentId: {type: String as PropType<string | null>, default: undefined},
    tree: Object as PropType<WebFloatingTree>,
  },
  setup(props, {slots}) {
    const root = useFloatingRoot();
    const tree = useFloatingTree(props.tree);
    const controller = resolveController(props.controller, root);
    const injectedParentId = inject(ParentNodeKey, null);
    const parentScope = useFloatingContextScope();
    const id = props.id ?? `floating-vue-node-${++nodeId}`;
    provide(ParentNodeKey, id);
    provide(ScopeKey, controller.contextScope);

    onMounted(() => {
      controller
        .setContextParent(parentScope)
        .node({
          ...(tree ? {tree} : {}),
          id,
          parentId: props.parentId ?? injectedParentId,
        });
    });
    onBeforeUnmount(() => {
      controller.node(null).setContextParent(null);
    });

    return () => slots.default?.({id, tree});
  },
});

export function useFloatingList<T = unknown>(
  explicit?: WebFloatingList<T> | null,
) {
  return (
    explicit ??
    (inject(ListKey, null) as WebFloatingList<T> | null) ??
    new WebFloatingList<T>()
  );
}

export const FloatingList = defineComponent({
  name: 'FloatingList',
  emits: ['update:activeIndex', 'active-index-change'],
  props: {
    list: Object as PropType<WebFloatingList<unknown>>,
    controller: Object as PropType<FloatingControllerInput>,
    activeIndex: {
      type: Number as PropType<number | null>,
      default: null,
    },
    navigation: Boolean,
    typeahead: Boolean,
    loop: Boolean,
    nested: Boolean,
    navigationOptions: {
      type: Object as PropType<Partial<ListNavigationOptions>>,
      default: () => ({}),
    },
    typeaheadOptions: {
      type: Object as PropType<Partial<TypeaheadOptions>>,
      default: () => ({}),
    },
  },
  setup(props, {emit, slots}) {
    const root = useFloatingRoot();
    const list = props.list ?? new WebFloatingList();
    provide(ListKey, list);
    const controller = resolveController(props.controller, root);
    const floating =
      props.controller && 'controller' in props.controller
        ? props.controller
        : root;
    if ((props.navigation || props.typeahead) && !floating) {
      throw new Error(
        'Declarative FloatingList navigation and typeahead require a FloatingRoot or UseFloatingReturn controller prop.',
      );
    }
    const activeIndex = shallowRef<number | null>(props.activeIndex);
    const revision = shallowRef(0);
    const elementRef = {current: [] as Array<HTMLElement | null>};
    const labelRef = {current: [] as Array<string | null>};
    const navigation = computed(() => props.navigation);
    const virtual = computed(
      () => Boolean(props.navigationOptions.virtual),
    );

    function setActiveIndex(index: number | null) {
      if (activeIndex.value === index) return;
      activeIndex.value = index;
      emit('update:activeIndex', index);
      emit('active-index-change', index);
    }

    function syncItems() {
      const items = list.items;
      elementRef.current = items.map((item) => item.element);
      labelRef.current = items.map((item) => item.label);
      if (
        activeIndex.value != null &&
        !elementRef.current[activeIndex.value]
      ) {
        setActiveIndex(null);
      }
      revision.value++;
    }

    watch(
      () => props.activeIndex,
      (index) => {
        if (index !== activeIndex.value) activeIndex.value = index;
      },
    );
    const unsubscribeList = list.subscribe(syncItems);
    syncItems();

    const unregisterPlugins = floating?.registerPlugins(
      listNavigation(() => ({
        ...props.navigationOptions,
        enabled:
          props.navigation &&
          props.navigationOptions.enabled !== false,
        listRef: elementRef,
        activeIndex: activeIndex.value,
        loop: props.loop || props.navigationOptions.loop,
        nested:
          props.nested ||
          props.navigationOptions.nested ||
          controller.context.nested,
        onNavigate(index) {
          setActiveIndex(index);
          props.navigationOptions.onNavigate?.(index);
        },
      })),
      typeahead(() => ({
        ...props.typeaheadOptions,
        enabled:
          props.typeahead &&
          props.typeaheadOptions.enabled !== false,
        listRef: labelRef,
        activeIndex: activeIndex.value,
        onMatch(index) {
          setActiveIndex(index);
          elementRef.current[index]?.focus({preventScroll: true});
          props.typeaheadOptions.onMatch?.(index);
        },
      })),
    );
    const unsubscribeOpen = controller.context.events.on(
      'openchange',
      ({open, reason}) => {
        if (open) return;
        setActiveIndex(null);
        if (
          (props.nested || controller.context.nested) &&
          (reason === 'escape-key' || reason === 'focus-out')
        ) {
          const reference = controller.elements.domReference;
          const view =
            reference instanceof Element
              ? reference.ownerDocument.defaultView
              : null;
          (view ?? globalThis).setTimeout(() => {
            if (reference instanceof HTMLElement && reference.isConnected) {
              reference.focus({preventScroll: true});
            }
          }, 0);
        }
      },
    );

    provide(ListContextKey, {
      activeIndex,
      floating,
      navigation,
      revision,
      setActiveIndex,
      virtual,
    });

    onMounted(() => controller.withList(list));
    onBeforeUnmount(() => {
      unsubscribeOpen();
      unsubscribeList();
      unregisterPlugins?.();
      if (controller.list === list) controller.withList();
    });
    return () =>
      slots.default?.({
        activeIndex: activeIndex.value,
        list,
        setActiveIndex,
      });
  },
});

export const FloatingListItem = defineComponent({
  name: 'FloatingListItem',
  inheritAttrs: false,
  props: {
    tag: {type: String, default: 'div'},
    id: String,
    label: {type: String as PropType<string | null>, default: null},
    value: {type: null, default: undefined},
    list: Object as PropType<WebFloatingList<unknown>>,
    selected: Boolean,
    closeOnClick: {
      type: [Boolean, String] as PropType<boolean | 'all'>,
      default: false,
    },
    reference: Boolean,
  },
  setup(props, {attrs, slots}) {
    const list = useFloatingList(props.list);
    const listContext = inject(ListContextKey, null);
    const root = useFloatingRoot();
    const rootHierarchy = useFloatingRootHierarchy();
    const element = shallowRef<HTMLElement | null>(null);
    let itemId = props.id;
    let unregister: (() => void) | undefined;
    const index = computed(() => {
      listContext?.revision.value;
      return list.items.find((item) => item.id === itemId)?.index ?? -1;
    });
    const active = computed(
      () =>
        index.value >= 0 &&
        listContext?.activeIndex.value === index.value,
    );
    const itemAttrs = listContext?.floating?.getItemAttrs(() => ({
      active: active.value,
      selected: props.selected,
      index: index.value,
    }));

    function getLabel() {
      return props.label ?? element.value?.textContent ?? null;
    }

    watch(
      element,
      (next, previous) => {
        if (!props.reference || !root) return;
        if (
          previous &&
          root.controller.elements.domReference === previous
        ) {
          root.controller.setReference(null);
        }
        root.controller.setReference(next);
      },
      {flush: 'sync'},
    );

    onMounted(() => {
      const options: FloatingListItemOptions<unknown> = {
        element: element.value,
        label: getLabel(),
        value: props.value,
        ...(itemId ? {id: itemId} : {}),
      };
      unregister = list.register(options);
      itemId = itemId ?? list.items.find((item) => item.element === element.value)?.id;
    });
    watch(
      [element, () => props.label, () => props.value],
      () => {
        if (itemId) {
          list.update(itemId, {
            element: element.value,
            label: getLabel(),
            value: props.value,
          });
        }
      },
    );
    onBeforeUnmount(() => {
      unregister?.();
      if (
        props.reference &&
        root &&
        root.controller.elements.domReference === element.value
      ) {
        root.controller.setReference(null);
      }
    });

    return () =>
      h(
        props.tag,
        mergeProps(
          attrs,
          itemAttrs ?? {},
          {
            ref: element,
            ...(listContext?.navigation.value &&
            !listContext.virtual.value
              ? {tabindex: active.value ? 0 : -1}
              : {}),
            ...(listContext?.navigation.value
              ? {'data-active': String(active.value)}
              : {}),
            ...(props.closeOnClick && listContext?.floating
              ? {
                  onClick: (event: MouseEvent) => {
                    listContext.floating!.context.onOpenChange(
                      false,
                      event,
                      'click',
                    );
                    if (props.closeOnClick !== 'all') return;
                    let current = rootHierarchy;
                    while (current) {
                      if (
                        current.floating !== listContext.floating
                      ) {
                        current.floating.context.onOpenChange(
                          false,
                          event,
                          'click',
                        );
                      }
                      current = current.parent;
                    }
                  },
                }
              : {}),
          },
        ),
        slots.default?.({
          active: active.value,
          index: index.value,
          item: list.items.find((item) => item.id === itemId),
        }),
      );
  },
});

export function useDelayGroup(explicit?: DelayGroup | null) {
  return explicit ?? inject(DelayGroupKey, null);
}

function createDelayGroupComponent(
  name: string,
  Group: typeof DelayGroup,
) {
  return defineComponent({
    name,
    props: {
      group: Object as PropType<DelayGroup>,
      controller: Object as PropType<FloatingControllerInput>,
      options: {
        type: Object as PropType<DelayGroupOptions>,
        default: () => ({}),
      },
    },
    setup(props, {slots}) {
      const root = useFloatingRoot();
      const group = props.group ?? new Group(props.options);
      const controller = resolveController(props.controller, root);
      provide(DelayGroupKey, group);
      onMounted(() => controller.delayGroup({group}));
      onBeforeUnmount(() => {
        controller.delayGroup(null);
        if (!props.group) group.destroy();
      });
      return () => slots.default?.({group});
    },
  });
}

export const FloatingDelayGroup = createDelayGroupComponent(
  'FloatingDelayGroup',
  DelayGroup,
);
export const NextFloatingDelayGroup = createDelayGroupComponent(
  'NextFloatingDelayGroup',
  NextDelayGroup,
);

export const Composite = defineComponent({
  name: 'Composite',
  inheritAttrs: false,
  props: {
    tag: {type: String, default: 'div'},
    options: {
      type: Object as PropType<CompositeOptions>,
      default: () => ({}),
    },
  },
  setup(props, {attrs, slots}) {
    const controller = new CompositeController(props.options);
    const elements = new Set<HTMLElement>();
    const context = {
      controller,
      elements,
      sync() {
        controller.setItems(elements);
      },
    };
    provide(CompositeKey, context);
    return () =>
      h(
        props.tag,
        mergeProps(attrs, {onKeydown: (event: KeyboardEvent) => controller.keydown(event)}),
        slots.default?.({controller}),
      );
  },
});

export const CompositeItem = defineComponent({
  name: 'CompositeItem',
  inheritAttrs: false,
  props: {
    tag: {type: String, default: 'div'},
  },
  setup(props, {attrs, slots}) {
    const composite = inject(CompositeKey, null);
    const element = shallowRef<HTMLElement | null>(null);
    onMounted(() => {
      if (element.value) composite?.elements.add(element.value);
      composite?.sync();
    });
    onBeforeUnmount(() => {
      if (element.value) composite?.elements.delete(element.value);
      composite?.sync();
    });
    return () =>
      h(
        props.tag,
        mergeProps(attrs, {ref: element, tabindex: -1}),
        slots.default?.(),
      );
  },
});

export {
  CompositeController,
  DelayGroup,
  NextDelayGroup,
  WebFloatingList,
  WebFloatingTree,
};
