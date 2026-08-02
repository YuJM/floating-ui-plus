import type {SearchPhase, SearchSnapshot} from '@floating-ui-plus/web';
import {
  defineComponent,
  type PropType,
  type VNodeChild,
} from 'vue';

import type {UseSearchReturn} from './search';

type SearchSlot = (state: SearchSnapshot<unknown>) => VNodeChild;

/**
 * Vue-native result-phase renderer for `useSearch()`.
 *
 * It chooses a named phase slot only. Result markup, copy, ARIA, and list
 * composition stay in the consuming Vue template.
 */
export const FloatingResults = defineComponent({
  name: 'FloatingResults',
  props: {
    search: {
      type: Object as PropType<UseSearchReturn<unknown>>,
      required: true,
    },
  },
  setup(props, {slots}) {
    return () => {
      const state = props.search.state.value;
      const slot = slots[state.phase as SearchPhase] as SearchSlot | undefined;
      return slot?.(state) ?? slots.default?.(state);
    };
  },
});

/** @deprecated Use `FloatingResults`. */
export const FloatingSearch = FloatingResults;
