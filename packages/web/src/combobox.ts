import {
  listNavigation,
  type ListNavigationOptions,
} from './interactions/listNavigation';
import {role} from './interactions/role';
import type {SearchController, SearchSnapshot} from './search';
import type {FloatingPlugin, OpenChangeReason} from './types';
import {createId} from './utils/common';

export type ComboboxNavigationOptions = Omit<
  ListNavigationOptions,
  'activeIndex' | 'listRef' | 'onNavigate'
>;

export interface ComboboxOptions<T> {
  search: SearchController<T>;
  getItemKey?: ((item: T) => string | number) | undefined;
  /**
   * Returns the value submitted by a form for a selected item. It defaults to
   * `getItemKey`, so labels and submitted identifiers stay independent.
   */
  getItemValue?: ((item: T) => string) | undefined;
  getItemLabel(item: T): string;
  initialSelectedItem?: T | null | undefined;
  optionIdPrefix?: string | undefined;
  openOnFocus?: boolean | undefined;
  openOnInput?: boolean | undefined;
  selectOnEnter?: boolean | undefined;
  refreshOnBind?: boolean | undefined;
  onOpenChange?:
    | ((open: boolean, event?: Event, reason?: OpenChangeReason) => void)
    | undefined;
  onActiveIndexChange?: ((index: number | null) => void) | undefined;
  onSelect?: ((item: T, event?: Event) => void) | undefined;
}

export interface ComboboxSnapshot<T> {
  activeIndex: number | null;
  selectedItem: T | null;
  selectedValue: string | null;
  search: SearchSnapshot<T>;
}

export interface ComboboxInputProps {
  value: string;
  onFocus: (event: FocusEvent) => void;
  onInput: (event: Event) => void;
  onCompositionstart: () => void;
  onCompositionend: (event: CompositionEvent) => void;
  onKeydown: (event: KeyboardEvent) => void;
}

export interface ComboboxOptionProps {
  id: string;
  role: 'option';
  'aria-selected': 'true' | 'false';
  'data-active': 'true' | 'false';
  onMousedown: (event: MouseEvent) => void;
  onClick: (event: MouseEvent) => void;
}

/**
 * Framework-neutral input and selection behavior for an editable combobox.
 *
 * Rendering remains consumer-owned. Bind an input with `bindInput()` (or call
 * the public event handlers from a framework adapter), populate `listRef`, and
 * use `interactions()` with a floating controller.
 */
export class ComboboxController<T> {
  readonly search: SearchController<T>;
  readonly listRef = {current: [] as Array<HTMLElement | null>};

  #options: ComboboxOptions<T>;
  #listeners = new Set<(snapshot: ComboboxSnapshot<T>) => void>();
  #optionKeys = new WeakMap<HTMLElement, string | number>();
  #input: HTMLInputElement | null = null;
  #inputCleanup: (() => void) | null = null;
  #unsubscribeSearch: () => void;
  #destroyed = false;
  #optionIdPrefix: string;
  #refreshedOnBind = false;

  activeIndex: number | null = null;
  selectedItem: T | null;

  constructor(options: ComboboxOptions<T>) {
    this.#options = options;
    this.search = options.search;
    this.selectedItem = options.initialSelectedItem ?? null;
    this.#optionIdPrefix =
      options.optionIdPrefix ?? createId('floating-ui-combobox-option');
    this.#unsubscribeSearch = this.search.subscribe(() => {
      if (
        this.activeIndex != null &&
        this.activeIndex >= this.search.items.length
      ) {
        this.setActiveIndex(null);
        return;
      }
      this.#emit();
    });
  }

  get snapshot(): ComboboxSnapshot<T> {
    return {
      activeIndex: this.activeIndex,
      selectedItem: this.selectedItem,
      selectedValue: this.selectedItem
        ? this.getItemValue(this.selectedItem)
        : null,
      search: this.search.snapshot,
    };
  }

  subscribe(listener: (snapshot: ComboboxSnapshot<T>) => void) {
    this.#listeners.add(listener);
    listener(this.snapshot);
    return () => this.#listeners.delete(listener);
  }

  setOptions(options: Partial<ComboboxOptions<T>>) {
    this.#options = {...this.#options, ...options};
  }

  getItemId(index: number) {
    const item = this.search.items[index];
    const key = item == null ? index : this.#getItemKey(item);
    const encodedKey = encodeURIComponent(String(key)).replace(/%/g, '_');
    return `${this.#optionIdPrefix}-${encodedKey}`;
  }

  getItemLabel(item: T) {
    return this.#options.getItemLabel(item);
  }

  getItemValue(item: T) {
    return this.#options.getItemValue?.(item) ?? String(this.#getItemKey(item));
  }

  setListElements(elements: Array<HTMLElement | null>) {
    this.listRef.current = elements;
    this.#syncActiveState();
    this.#syncSelectedState();
  }

  setActiveIndex(index: number | null) {
    const next =
      index == null || index < 0 || index >= this.search.items.length
        ? null
        : index;
    if (next === this.activeIndex) return;
    this.activeIndex = next;
    this.#syncActiveState();
    this.#options.onActiveIndexChange?.(next);
    this.#emit();
  }

  setQuery(query: string, event?: Event) {
    this.setActiveIndex(null);
    if (this.#input) this.#input.value = query;
    this.#requestOpen(true, event);
    this.search.setQuery(query);
  }

  select(item: T, event?: Event) {
    this.setSelectedItem(item);
    const label = this.#options.getItemLabel(item);
    if (this.#input) this.#input.value = label;
    this.search.setQuery(label);
    this.setActiveIndex(null);
    this.#requestOpen(false, event);
    this.#options.onSelect?.(item, event);
  }

  setSelectedItem(item: T | null) {
    if (this.selectedItem === item) return;
    this.selectedItem = item;
    this.#syncSelectedState();
    this.#emit();
  }

  handleFocus = (event: FocusEvent) => {
    if (this.#options.openOnFocus ?? true) {
      this.#requestOpen(true, event, 'focus');
    }
  };

  handleInput = (event: Event) => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    this.#input = input;
    this.setActiveIndex(null);
    if (this.#options.openOnInput ?? true) this.#requestOpen(true, event);
    this.search.setQuery(input.value);
  };

  handleCompositionStart = () => {
    this.search.startComposition();
  };

  handleCompositionEnd = (event: CompositionEvent) => {
    const input = event.currentTarget;
    this.search.endComposition(
      input instanceof HTMLInputElement ? input.value : this.search.query,
    );
  };

  handleKeyDown = (event: KeyboardEvent) => {
    if (
      !(this.#options.selectOnEnter ?? true) ||
      event.key !== 'Enter' ||
      this.activeIndex == null
    ) {
      return;
    }
    const item = this.search.items[this.activeIndex];
    if (!item) return;
    event.preventDefault();
    this.select(item, event);
  };

  getInputProps(): ComboboxInputProps {
    return {
      value: this.search.query,
      onFocus: this.handleFocus,
      onInput: this.handleInput,
      onCompositionstart: this.handleCompositionStart,
      onCompositionend: this.handleCompositionEnd,
      onKeydown: this.handleKeyDown,
    };
  }

  getOptionProps(item: T, index: number): ComboboxOptionProps {
    const itemKey = this.#getItemKey(item);
    return {
      id: this.getItemId(index),
      role: 'option',
      'data-active': index === this.activeIndex ? 'true' : 'false',
      'aria-selected':
        this.selectedItem != null &&
        this.#getItemKey(this.selectedItem) === itemKey
          ? 'true'
          : 'false',
      onMousedown: (event) => event.preventDefault(),
      onClick: (event) => this.select(item, event),
    };
  }

  getNavigationOptions(
    options: Partial<ComboboxNavigationOptions> = {},
  ): ComboboxNavigationOptions {
    return {
      virtual: true,
      focusItemOnOpen: false,
      ...options,
    };
  }

  bindInput(input: HTMLInputElement) {
    this.#inputCleanup?.();
    this.#input = input;
    const props = this.getInputProps();
    input.value = props.value;
    input.addEventListener('focus', props.onFocus);
    input.addEventListener('input', props.onInput);
    input.addEventListener('compositionstart', props.onCompositionstart);
    input.addEventListener('compositionend', props.onCompositionend);
    input.addEventListener('keydown', props.onKeydown);
    this.#syncActiveState();
    if (!this.#refreshedOnBind && (this.#options.refreshOnBind ?? true)) {
      this.#refreshedOnBind = true;
      void this.search.refresh();
    }

    const cleanup = () => {
      input.removeEventListener('focus', props.onFocus);
      input.removeEventListener('input', props.onInput);
      input.removeEventListener('compositionstart', props.onCompositionstart);
      input.removeEventListener('compositionend', props.onCompositionend);
      input.removeEventListener('keydown', props.onKeydown);
      if (this.#input === input) this.#input = null;
      if (this.#inputCleanup === cleanup) this.#inputCleanup = null;
    };
    this.#inputCleanup = cleanup;
    return cleanup;
  }

  bindOption(element: HTMLElement, item: T, index: number) {
    const itemKey = this.#getItemKey(item);
    this.#optionKeys.set(element, itemKey);
    const props = this.getOptionProps(item, index);
    element.id = props.id;
    element.setAttribute('role', props.role);
    element.dataset.active = props['data-active'];
    element.setAttribute('aria-selected', props['aria-selected']);
    element.addEventListener('mousedown', props.onMousedown);
    element.addEventListener('click', props.onClick);
    return () => {
      element.removeEventListener('mousedown', props.onMousedown);
      element.removeEventListener('click', props.onClick);
    };
  }

  rolePlugin(): FloatingPlugin {
    return role(() => ({
      role: 'combobox',
      activeIndex: this.activeIndex,
      getItemId: (index) => this.getItemId(index),
    }));
  }

  navigationPlugin(
    options: Partial<ComboboxNavigationOptions> = {},
  ): FloatingPlugin {
    return listNavigation(() => ({
      ...this.getNavigationOptions(options),
      listRef: this.listRef,
      activeIndex: this.activeIndex,
      onNavigate: (index) => this.setActiveIndex(index),
    }));
  }

  interactions(
    navigation: Partial<ComboboxNavigationOptions> = {},
  ): readonly FloatingPlugin[] {
    return [this.rolePlugin(), this.navigationPlugin(navigation)];
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#inputCleanup?.();
    this.#unsubscribeSearch();
    this.#listeners.clear();
    this.listRef.current = [];
  }

  #requestOpen(
    open: boolean,
    event?: Event,
    reason?: OpenChangeReason,
  ) {
    this.#options.onOpenChange?.(open, event, reason);
  }

  #getItemKey(item: T) {
    return this.#options.getItemKey?.(item) ?? this.search.getItemKey(item);
  }

  #syncActiveState() {
    if (this.#input) {
      if (this.activeIndex == null) {
        this.#input.removeAttribute('aria-activedescendant');
      } else {
        this.#input.setAttribute(
          'aria-activedescendant',
          this.getItemId(this.activeIndex),
        );
      }
    }
    this.listRef.current.forEach((item, index) => {
      if (item) item.dataset.active = String(index === this.activeIndex);
    });
  }

  #syncSelectedState() {
    const selectedKey =
      this.selectedItem == null
        ? null
        : this.#getItemKey(this.selectedItem);
    this.listRef.current.forEach((item) => {
      if (!item) return;
      const itemKey = this.#optionKeys.get(item);
      if (itemKey != null) {
        item.setAttribute('aria-selected', String(itemKey === selectedKey));
      }
    });
  }

  #emit() {
    if (this.#destroyed) return;
    const snapshot = this.snapshot;
    this.#listeners.forEach((listener) => listener(snapshot));
  }
}

export function createCombobox<T>(options: ComboboxOptions<T>) {
  return new ComboboxController(options);
}
