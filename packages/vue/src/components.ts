import {
  focusManager,
  getContextArrowStyles,
  lockScroll,
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
  ref,
  shallowRef,
  watch,
  type PropType,
} from 'vue';

export const FloatingPortal = defineComponent({
  name: 'FloatingPortal',
  props: {
    to: {
      type: [String, Object] as PropType<string | Element>,
      default: 'body',
    },
    disabled: Boolean,
  },
  setup(props, {slots}) {
    const mounted = ref(false);
    onMounted(() => {
      mounted.value = true;
    });

    return () => {
      const children = slots.default?.();
      if (!mounted.value) return children;
      return h(
        Teleport,
        {to: props.to, disabled: props.disabled},
        {default: () => children},
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
            'data-floating-ui-overlay': '',
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
      required: true,
    },
    width: {type: Number, default: 14},
    height: {type: Number, default: 7},
    staticOffset: {
      type: [String, Number] as PropType<string | number | null>,
      default: null,
    },
  },
  setup(props, {attrs, slots}) {
    const element = shallowRef<SVGSVGElement | null>(null);
    const revision = shallowRef(0);
    let unsubscribe: (() => void) | undefined;

    onMounted(() => {
      unsubscribe = props.context.events.on('positionchange', () => {
        revision.value++;
      });
    });
    onBeforeUnmount(() => unsubscribe?.());

    const styles = computed(() => {
      revision.value;
      if (!element.value) return {position: 'absolute' as const};
      return getContextArrowStyles(props.context, {
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
      required: true,
    },
    options: {
      type: Object as PropType<FocusManagerOptions>,
      default: () => ({}),
    },
    enabled: {type: Boolean, default: true},
  },
  setup(props, {slots}) {
    const plugin = focusManager(() => ({
      ...props.options,
      enabled: props.enabled,
    }));
    let cleanup: (() => void) | undefined;

    onMounted(() => {
      cleanup = plugin.connect(props.context) || undefined;
    });
    watch(
      [() => props.enabled, () => props.options],
      () => plugin.update?.(props.context),
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
