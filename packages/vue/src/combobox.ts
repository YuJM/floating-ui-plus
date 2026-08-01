import {
  ComboboxController as WebComboboxController,
  type ComboboxInputProps,
  type ComboboxNavigationOptions,
  type ComboboxOptionProps,
  type ComboboxOptions as WebComboboxOptions,
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
} from 'vue';

import type {UseSearchReturn} from './search';

type ComboboxSearch<T> = UseSearchReturn<T> | WebSearchController<T>;

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
}

export interface UseComboboxReturn<T> {
  controller: WebComboboxController<T>;
  open: Ref<boolean>;
  activeIndex: Ref<number | null>;
  selectedItem: ShallowRef<T | null> | Ref<T | null>;
  inputProps: ComputedRef<ComboboxInputProps>;
  rolePlugin: FloatingPlugin;
  setQuery(query: string, event?: Event): void;
  select(item: T, event?: Event): void;
  getItemId(index: number): string;
  getOptionProps(item: T, index: number): ComboboxOptionProps;
  getNavigationOptions(
    options?: Partial<ComboboxNavigationOptions>,
  ): ComboboxNavigationOptions;
}

function getSearchController<T>(search: ComboboxSearch<T>) {
  return 'controller' in search ? search.controller : search;
}

/** Vue lifecycle and reactive-state adapter for `ComboboxController`. */
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
    return controller.getInputProps();
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
    inputProps,
    rolePlugin,
    setQuery: (query, event) => controller.setQuery(query, event),
    select: (item, event) => controller.select(item, event),
    getItemId: (index) => controller.getItemId(index),
    getOptionProps: (item, index) => {
      void revision.value;
      return controller.getOptionProps(item, index);
    },
    getNavigationOptions: (navigationOptions) =>
      controller.getNavigationOptions(navigationOptions),
  };
}
