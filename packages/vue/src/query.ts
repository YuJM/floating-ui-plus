import {
  QueryController as WebQueryController,
  createQueryStatusFormatter,
  type FloatingPlugin,
  type QueryInputProps,
  type QueryNavigationOptions,
  type QueryOptionProps,
  type QueryOptions as WebQueryOptions,
  type QueryStatusFormatter,
  type QueryStatusMessages,
  type QueryTriggerProps,
  type SearchController as WebSearchController,
} from '@floating-ui-plus/web';
import {
  computed,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
  type VNode,
} from 'vue';

import type {UseSearchReturn} from './search';

type QuerySearch<T> = UseSearchReturn<T> | WebSearchController<T>;

/**
 * Options for an editable query input backed by search results.
 *
 * The default `semantics` value is `combobox`: an input controls a listbox,
 * retains virtual focus with `aria-activedescendant`, and activates its active
 * result with Enter. Use `dialog` or `none` when the rendered surface owns a
 * different accessibility contract.
 */
export interface UseQueryOptions<T>
  extends Omit<
    WebQueryOptions<T>,
    'search' | 'onOpenChange' | 'onActiveIndexChange' | 'onActivate'
  > {
  search: QuerySearch<T>;
  open?: Ref<boolean> | undefined;
  activeIndex?: Ref<number | null> | undefined;
  onOpenChange?: WebQueryOptions<T>['onOpenChange'];
  onActiveIndexChange?: WebQueryOptions<T>['onActiveIndexChange'];
  onActivate?: WebQueryOptions<T>['onActivate'];
  /** Shared phase-keyed status copy for a consumer-owned live region. */
  status?: QueryStatusFormatter<T> | QueryStatusMessages<T> | undefined;
}

export interface UseQueryReturn<T> {
  controller: WebQueryController<T>;
  open: Ref<boolean>;
  activeIndex: Ref<number | null>;
  /** Reactive text resolved from the shared query status contract. */
  statusText: ComputedRef<string | undefined>;
  /** Mirrors the associated search lifecycle for query input UI. */
  loading: ComputedRef<boolean>;
  inputProps: ComputedRef<QueryInputProps & QueryInputLifecycleProps>;
  rolePlugin: FloatingPlugin;
  setQuery(query: string, event?: Event): void;
  activate(item: T, event?: Event): void;
  getItemId(index: number): string;
  getOptionProps(item: T, index: number): QueryOptionProps;
  getQueryTriggerProps(query: string): QueryTriggerProps;
  getNavigationOptions(
    options?: Partial<QueryNavigationOptions>,
  ): QueryNavigationOptions;
}

/**
 * Vue keeps input event handlers declarative, so this lifecycle bridge lets
 * the framework-neutral controller restore focus for query-trigger actions.
 */
export interface QueryInputLifecycleProps {
  onVnodeMounted: (vnode: VNode) => void;
  onVnodeUnmounted: () => void;
}

function getSearchController<T>(search: QuerySearch<T>) {
  return 'controller' in search ? search.controller : search;
}

/** Vue lifecycle and reactive-state adapter for `QueryController`. */
export function useQuery<T>(options: UseQueryOptions<T>): UseQueryReturn<T> {
  const search = getSearchController(options.search);
  const open = options.open ?? ref(false);
  const activeIndex = options.activeIndex ?? ref<number | null>(null);
  const revision = shallowRef(0);

  const controller = new WebQueryController<T>({
    ...options,
    search,
    onOpenChange(value, event, reason) {
      open.value = value;
      options.onOpenChange?.(value, event, reason);
    },
    onActiveIndexChange(index) {
      activeIndex.value = index;
      options.onActiveIndexChange?.(index);
    },
    onActivate(item, event) {
      options.onActivate?.(item, event);
    },
  });
  const statusFormatter = options.status
    ? typeof options.status === 'function'
      ? options.status
      : createQueryStatusFormatter(options.status)
    : undefined;
  controller.setActiveIndex(activeIndex.value);

  const unsubscribe = controller.subscribe((snapshot) => {
    revision.value++;
    if (activeIndex.value !== snapshot.activeIndex) {
      activeIndex.value = snapshot.activeIndex;
    }
  });
  const stopActiveIndexWatch = watch(activeIndex, (index) => {
    if (controller.activeIndex !== index) controller.setActiveIndex(index);
  });

  const rolePlugin = controller.rolePlugin();
  const inputProps = computed(() => {
    void revision.value;
    return {
      ...controller.getInputProps(),
      onVnodeMounted(vnode: VNode) {
        controller.setInputElement(
          vnode.el instanceof HTMLInputElement ? vnode.el : null,
        );
      },
      onVnodeUnmounted() {
        controller.setInputElement(null);
      },
    };
  });
  const statusText = computed(() => {
    void revision.value;
    if (!statusFormatter) return undefined;
    return statusFormatter({...controller.snapshot, open: open.value});
  });
  const loading = computed(() => {
    void revision.value;
    return controller.search.loading;
  });

  onScopeDispose(() => {
    stopActiveIndexWatch();
    unsubscribe();
    controller.destroy();
  });

  return {
    controller,
    open,
    activeIndex,
    statusText,
    loading,
    inputProps,
    rolePlugin,
    setQuery: (query, event) => controller.setQuery(query, event),
    activate: (item, event) => controller.activate(item, event),
    getItemId: (index) => controller.getItemId(index),
    getOptionProps: (item, index) => {
      void revision.value;
      return controller.getOptionProps(item, index);
    },
    getQueryTriggerProps: (query) => controller.getQueryTriggerProps(query),
    getNavigationOptions: (navigationOptions) =>
      controller.getNavigationOptions(navigationOptions),
  };
}
