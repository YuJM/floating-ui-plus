import {
  SearchController as WebSearchController,
  type SearchOptions,
  type SearchSnapshot,
} from '@floating-ui-plus/web';
import {
  computed,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  watchEffect,
  type ComputedRef,
  type ShallowRef,
} from 'vue';

import type {MaybeReadonlyRefOrGetter} from './types';

export interface UseSearchReturn<T> {
  controller: WebSearchController<T>;
  state: Readonly<ShallowRef<SearchSnapshot<T>>>;
  query: ComputedRef<string>;
  items: ComputedRef<readonly T[]>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<unknown>;
}

/**
 * Vue lifecycle adapter for framework-neutral search request state.
 *
 * Consumers own the Combobox UI state, ARIA, selection, and floating surface.
 */
export function useSearch<T>(
  options: MaybeReadonlyRefOrGetter<SearchOptions<T>>,
): UseSearchReturn<T> {
  const controller = new WebSearchController(toValue(options));
  const state = shallowRef<SearchSnapshot<T>>(controller.snapshot);
  const unsubscribe = controller.subscribe((snapshot) => {
    state.value = snapshot;
  });

  watchEffect(() => {
    const current = toValue(options);
    controller.setOptions(current);
    if (current.items) {
      controller.setControlledState({
        items: current.items,
        loading: current.loading,
        error: current.error,
        total: current.total,
        nextCursor: current.nextCursor,
      });
    }
  });

  onMounted(() => {
    if (toValue(options).source) void controller.refresh();
  });
  onScopeDispose(() => {
    unsubscribe();
    controller.destroy();
  });

  return {
    controller,
    state,
    query: computed(() => state.value.query),
    items: computed(() => state.value.items),
    loading: computed(() => state.value.loading),
    error: computed(() => state.value.error),
  };
}
