import {
  CompositeController,
  DelayGroup,
  FloatingList as WebFloatingList,
  FloatingTree as WebFloatingTree,
  NextDelayGroup,
  type CompositeOptions,
  type DelayGroupOptions,
  type FloatingController,
  type FloatingListItemOptions,
} from '@floating-ui-plus/web';
import {
  defineComponent,
  h,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  watch,
  type InjectionKey,
  type PropType,
} from 'vue';

const TreeKey: InjectionKey<WebFloatingTree> = Symbol('FloatingTree');
const ParentNodeKey: InjectionKey<string | null> = Symbol('FloatingNode');
const ListKey: InjectionKey<WebFloatingList<unknown>> = Symbol('FloatingList');
const DelayGroupKey: InjectionKey<DelayGroup> = Symbol('FloatingDelayGroup');
const CompositeKey: InjectionKey<{
  controller: CompositeController;
  elements: Set<HTMLElement>;
  sync(): void;
}> = Symbol('FloatingComposite');

let nodeId = 0;

export function useFloatingTree(explicit?: WebFloatingTree | null) {
  return explicit ?? inject(TreeKey, null);
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
      type: Object as PropType<FloatingController>,
      required: true,
    },
    id: String,
    parentId: {type: String as PropType<string | null>, default: undefined},
    tree: Object as PropType<WebFloatingTree>,
  },
  setup(props, {slots}) {
    const tree = useFloatingTree(props.tree);
    const injectedParentId = inject(ParentNodeKey, null);
    const id = props.id ?? `floating-vue-node-${++nodeId}`;
    provide(ParentNodeKey, id);
    let unregister: (() => void) | undefined;

    onMounted(() => {
      if (!tree) {
        if (__DEV__) {
          console.warn('FloatingNode requires a FloatingTree provider.');
        }
        return;
      }
      unregister = tree.register(props.controller, {
        id,
        parentId: props.parentId ?? injectedParentId,
      }).unregister;
    });
    onBeforeUnmount(() => unregister?.());

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
  props: {
    list: Object as PropType<WebFloatingList<unknown>>,
  },
  setup(props, {slots}) {
    const list = props.list ?? new WebFloatingList();
    provide(ListKey, list);
    return () => slots.default?.({list});
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
  },
  setup(props, {attrs, slots}) {
    const list = useFloatingList(props.list);
    const element = shallowRef<HTMLElement | null>(null);
    let itemId = props.id;
    let unregister: (() => void) | undefined;

    onMounted(() => {
      const options: FloatingListItemOptions<unknown> = {
        element: element.value,
        label: props.label,
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
            label: props.label,
            value: props.value,
          });
        }
      },
    );
    onBeforeUnmount(() => unregister?.());

    return () =>
      h(
        props.tag,
        mergeProps(attrs, {ref: element}),
        slots.default?.({item: list.items.find((item) => item.id === itemId)}),
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
      options: {
        type: Object as PropType<DelayGroupOptions>,
        default: () => ({}),
      },
    },
    setup(props, {slots}) {
      const group = props.group ?? new Group(props.options);
      provide(DelayGroupKey, group);
      onBeforeUnmount(() => {
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
