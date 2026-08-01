import {
  ComboboxController as WebComboboxController,
  createComboboxStatusFormatter,
  type ComboboxInputProps,
  type ComboboxNavigationOptions,
  type ComboboxOptionProps,
  type ComboboxOptions as WebComboboxOptions,
  type ComboboxQueryTriggerProps,
  type ComboboxStatusFormatter,
  type ComboboxStatusMessages,
  type FloatingPlugin,
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
  type ShallowRef,
  type VNode,
} from 'vue';

import type {UseSearchReturn} from './search';

type ComboboxSearch<T> = UseSearchReturn<T> | WebSearchController<T>;

/** @deprecated Use `UseQueryOptions` for a generic query input. */
export interface UseComboboxOptions<T>
  extends Omit<
    WebComboboxOptions<T>,
    | 'search'
    | 'initialSelectedItem'
    | 'onOpenChange'
    | 'onActiveIndexChange'
    | 'onSelect'
  > {
  search: ComboboxSearch<T>;
  open?: Ref<boolean> | undefined;
  activeIndex?: Ref<number | null> | undefined;
  selectedItem?: Ref<T | null> | undefined;
  initialSelectedItem?: T | null | undefined;
  onOpenChange?: WebComboboxOptions<T>['onOpenChange'];
  onActiveIndexChange?: WebComboboxOptions<T>['onActiveIndexChange'];
  onSelect?: WebComboboxOptions<T>['onSelect'];
  /** Shared phase-keyed status copy for a consumer-owned live region. */
  status?:
    | ComboboxStatusFormatter<T>
    | ComboboxStatusMessages<T>
    | undefined;
}

/** @deprecated Use `UseQueryReturn` for a generic query input. */
export interface UseComboboxReturn<T> {
  controller: WebComboboxController<T>;
  open: Ref<boolean>;
  activeIndex: Ref<number | null>;
  selectedItem: ShallowRef<T | null> | Ref<T | null>;
  /** Native-form friendly selected value. Bind it to a hidden input in Vue. */
  selectedValue: ComputedRef<string | null>;
  /** Reactive text resolved from the shared combobox status contract. */
  statusText: ComputedRef<string | undefined>;
  /** Mirrors the associated search lifecycle for combobox input UI. */
  loading: ComputedRef<boolean>;
  inputProps: ComputedRef<ComboboxInputProps & ComboboxInputLifecycleProps>;
  rolePlugin: FloatingPlugin;
  setQuery(query: string, event?: Event): void;
  select(item: T, event?: Event): void;
  getItemId(index: number): string;
  getOptionProps(item: T, index: number): ComboboxOptionProps;
  getQueryTriggerProps(query: string): ComboboxQueryTriggerProps;
  getNavigationOptions(
    options?: Partial<ComboboxNavigationOptions>,
  ): ComboboxNavigationOptions;
}

/**
 * Vue keeps input event handlers declarative, so this lifecycle bridge lets
 * the framework-neutral controller restore focus for query-trigger actions.
 *
 * @deprecated Use `QueryInputLifecycleProps` with `useQuery()`.
 */
export interface ComboboxInputLifecycleProps {
  onVnodeMounted: (vnode: VNode) => void;
  onVnodeUnmounted: () => void;
}

function getSearchController<T>(search: ComboboxSearch<T>) {
  return 'controller' in search ? search.controller : search;
}

/**
 * @deprecated Use `useQuery()` for a query interaction. Keep this API when
 * consumers rely on selected-item and form-value behavior.
 */
export function useCombobox<T>(
  options: UseComboboxOptions<T>,
): UseComboboxReturn<T> {
  const search = getSearchController(options.search);
  const open = options.open ?? ref(false);
  const activeIndex = options.activeIndex ?? ref<number | null>(null);
  const selectedItem =
    options.selectedItem ??
    shallowRef<T | null>(options.initialSelectedItem ?? null);
  const revision = shallowRef(0);

  const controller = new WebComboboxController<T>({
    ...options,
    search,
    initialSelectedItem: selectedItem.value,
    onOpenChange(value, event, reason) {
      open.value = value;
      options.onOpenChange?.(value, event, reason);
    },
    onActiveIndexChange(index) {
      activeIndex.value = index;
      options.onActiveIndexChange?.(index);
    },
    onSelect(item, event) {
      selectedItem.value = item;
      options.onSelect?.(item, event);
    },
  });
  const statusFormatter = options.status
    ? typeof options.status === 'function'
      ? options.status
      : createComboboxStatusFormatter(options.status)
    : undefined;
  controller.setActiveIndex(activeIndex.value);

  const unsubscribe = controller.subscribe((snapshot) => {
    revision.value++;
    if (activeIndex.value !== snapshot.activeIndex) {
      activeIndex.value = snapshot.activeIndex;
    }
    if (selectedItem.value !== snapshot.selectedItem) {
      selectedItem.value = snapshot.selectedItem;
    }
  });
  const stopActiveIndexWatch = watch(activeIndex, (index) => {
    if (controller.activeIndex !== index) controller.setActiveIndex(index);
  });
  const stopSelectedItemWatch = watch(selectedItem, (item) => {
    if (controller.selectedItem !== item) controller.setSelectedItem(item);
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
  const selectedValue = computed(() => {
    void revision.value;
    return controller.selectedItem == null
      ? null
      : controller.getItemValue(controller.selectedItem);
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
    stopSelectedItemWatch();
    unsubscribe();
    controller.destroy();
  });

  return {
    controller,
    open,
    activeIndex,
    selectedItem,
    selectedValue,
    statusText,
    loading,
    inputProps,
    rolePlugin,
    setQuery: (query, event) => controller.setQuery(query, event),
    select: (item, event) => controller.select(item, event),
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
