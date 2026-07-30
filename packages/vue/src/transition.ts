import {
  FloatingTransition as WebFloatingTransition,
  type Placement,
  type TransitionStyles,
} from '@floating-ui-plus/web';
import {
  Transition,
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  toValue,
  watch,
  type PropType,
  type Ref,
} from 'vue';

import type {MaybeReadonlyRefOrGetter} from './types';

export function useFloatingTransition(
  open: MaybeReadonlyRefOrGetter<boolean>,
  placement: MaybeReadonlyRefOrGetter<Placement>,
  options: TransitionStyles = {},
) {
  const transition = new WebFloatingTransition(
    () => toValue(placement),
    options,
  );
  const revision = shallowRef(0);
  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    unsubscribe = transition.subscribe(() => revision.value++);
    transition.setOpen(toValue(open));
  });
  watch(
    () => toValue(open),
    (value) => transition.setOpen(value),
  );
  onBeforeUnmount(() => {
    unsubscribe?.();
    transition.destroy();
  });

  return {
    isMounted: computed(() => {
      revision.value;
      return transition.isMounted;
    }),
    status: computed(() => {
      revision.value;
      return transition.status;
    }),
    styles: computed(() => {
      revision.value;
      return transition.styles;
    }),
    transition,
  };
}

export const FloatingTransition = defineComponent({
  name: 'FloatingTransition',
  inheritAttrs: false,
  props: {
    open: {type: Boolean, required: true},
    placement: {
      type: String as PropType<Placement>,
      default: 'bottom',
    },
    styles: {
      type: Object as PropType<TransitionStyles>,
      default: () => ({}),
    },
  },
  setup(props, {attrs, slots}) {
    const open = computed(() => props.open) as Ref<boolean>;
    const placement = computed(() => props.placement) as Ref<Placement>;
    const state = useFloatingTransition(open, placement, props.styles);

    return () =>
      h(Transition, attrs, {
        default: () =>
          state.isMounted.value
            ? slots.default?.({
                status: state.status.value,
                style: state.styles.value,
              })
            : undefined,
      });
  },
});
