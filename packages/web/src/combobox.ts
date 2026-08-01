import {
  listNavigation,
  type ListNavigationOptions,
} from './interactions/listNavigation';
import {role} from './interactions/role';
import type {SearchController, SearchSnapshot} from './search';
import type {FloatingPlugin, OpenChangeReason} from './types';
import {createId} from './utils/common';

export type QuerySemantics = 'combobox' | 'dialog' | 'none';

export type QueryNavigationOptions = Omit<
  ListNavigationOptions,
  'activeIndex' | 'listRef' | 'onNavigate'
>;

export interface QueryOptions<T> {
  search: SearchController<T>;
  /**
   * Accessibility semantics applied by `rolePlugin()`.
   *
   * `combobox` is the default because an editable query with a selectable
   * result list is an ARIA combobox. Use `dialog` for query-driven dialogs
   * such as command palettes, or `none` when the consumer owns all ARIA.
   */
  semantics?: QuerySemantics | undefined;
  getItemKey?: ((item: T) => string | number) | undefined;
  /** Returns the visible label for a result item. */
  getItemLabel(item: T): string;
  optionIdPrefix?: string | undefined;
  openOnFocus?: boolean | undefined;
  openOnInput?: boolean | undefined;
  selectOnEnter?: boolean | undefined;
  refreshOnBind?: boolean | undefined;
  onOpenChange?:
    | ((open: boolean, event?: Event, reason?: OpenChangeReason) => void)
    | undefined;
  onActiveIndexChange?: ((index: number | null) => void) | undefined;
  onActivate?: ((item: T, event?: Event) => void) | undefined;
}

export interface QuerySnapshot<T> {
  activeIndex: number | null;
  search: SearchSnapshot<T>;
}

export interface QueryInputProps {
  value: string;
  /** Exposes an in-flight search to framework-native input bindings. */
  'aria-busy': 'true' | 'false';
  /** Styling hook matching the current search lifecycle. */
  'data-loading': 'true' | 'false';
  onFocus: (event: FocusEvent) => void;
  onInput: (event: Event) => void;
  onCompositionstart: () => void;
  onCompositionend: (event: CompositionEvent) => void;
  onKeydown: (event: KeyboardEvent) => void;
}

export interface QueryOptionProps {
  id: string;
  role?: 'option' | undefined;
  'aria-selected'?: 'true' | 'false' | undefined;
  'data-active': 'true' | 'false';
  onMousedown: (event: MouseEvent) => void;
  onClick: (event: MouseEvent) => void;
}

export interface QueryTriggerProps {
  onMousedown: (event: MouseEvent) => void;
  onClick: (event: MouseEvent) => void;
}

export interface QueryStatusContext<T> extends QuerySnapshot<T> {
  open: boolean;
}

export type QueryStatusFormatter<T> = (
  context: QueryStatusContext<T>,
) => string;

export type QueryStatusText<T> = string | QueryStatusFormatter<T>;

export interface QueryStatusMessages<T> {
  closed: QueryStatusText<T>;
  idle: QueryStatusText<T>;
  loading: QueryStatusText<T>;
  error: QueryStatusText<T>;
  empty: QueryStatusText<T>;
  results: QueryStatusText<T>;
}

function resolveStatusText<Context>(
  value: string | ((context: Context) => string),
  context: Context,
) {
  return typeof value === 'function' ? value(context) : value;
}

/**
 * Creates a phase-aware live-region formatter without owning any markup.
 *
 * A retained list remains in the `results` render phase while it refreshes,
 * but its live region still announces the in-flight `loading` state.
 */
export function createQueryStatusFormatter<T>(
  messages: QueryStatusMessages<T>,
): QueryStatusFormatter<T> {
  return (context) => {
    if (!context.open) {
      return resolveStatusText(messages.closed, context);
    }
    const phase =
      context.search.error != null
        ? 'error'
        : context.search.loading
          ? 'loading'
          : context.search.phase;
    return resolveStatusText(messages[phase], context);
  };
}

/** @deprecated Use `QueryNavigationOptions`. */
export type ComboboxNavigationOptions = QueryNavigationOptions;

/** @deprecated Use `QueryOptions`. */
export interface ComboboxOptions<T>
  extends Omit<QueryOptions<T>, 'onActivate' | 'semantics'> {
  /**
   * Returns the value submitted by a form for a selected item. It defaults to
   * `getItemKey`, so labels and submitted identifiers stay independent.
   */
  getItemValue?: ((item: T) => string) | undefined;
  initialSelectedItem?: T | null | undefined;
  onSelect?: ((item: T, event?: Event) => void) | undefined;
}

/** @deprecated Use `QuerySnapshot`. */
export interface ComboboxSnapshot<T> extends QuerySnapshot<T> {
  selectedItem: T | null;
  selectedValue: string | null;
}

/** @deprecated Use `QueryInputProps`. */
export type ComboboxInputProps = QueryInputProps;

/** @deprecated Use `QueryOptionProps`. */
export interface ComboboxOptionProps extends QueryOptionProps {
  role: 'option';
  'aria-selected': 'true' | 'false';
}

/** @deprecated Use `QueryTriggerProps`. */
export type ComboboxQueryTriggerProps = QueryTriggerProps;

/** @deprecated Use `QueryStatusContext`. */
export interface ComboboxStatusContext<T> extends ComboboxSnapshot<T> {
  open: boolean;
}

/** @deprecated Use `QueryStatusFormatter`. */
export type ComboboxStatusFormatter<T> = (
  context: ComboboxStatusContext<T>,
) => string;

/** @deprecated Use `QueryStatusText`. */
export type ComboboxStatusText<T> = string | ComboboxStatusFormatter<T>;

/** @deprecated Use `QueryStatusMessages`. */
export interface ComboboxStatusMessages<T> {
  closed: ComboboxStatusText<T>;
  selected?:
    | string
    | ((item: T, context: ComboboxStatusContext<T>) => string)
    | undefined;
  idle: ComboboxStatusText<T>;
  loading: ComboboxStatusText<T>;
  error: ComboboxStatusText<T>;
  empty: ComboboxStatusText<T>;
  results: ComboboxStatusText<T>;
}

/**
 * Framework-neutral input and selection behavior for an editable query.
 *
 * Rendering remains consumer-owned. By default, its interactions expose ARIA
 * combobox semantics. Set `semantics` to `dialog` or `none` when that contract
 * does not match the rendered UI.
 */
export class QueryController<T> {
  readonly search: SearchController<T>;
  readonly listRef = {current: [] as Array<HTMLElement | null>};

  #options: QueryOptions<T>;
  #listeners = new Set<(snapshot: QuerySnapshot<T>) => void>();
  #input: HTMLInputElement | null = null;
  #inputCleanup: (() => void) | null = null;
  #unsubscribeSearch: () => void;
  #destroyed = false;
  #optionIdPrefix: string;
  #refreshedOnBind = false;

  activeIndex: number | null = null;

  constructor(options: QueryOptions<T>) {
    this.#options = options;
    this.search = options.search;
    this.#optionIdPrefix =
      options.optionIdPrefix ?? createId('floating-ui-query-option');
    this.#unsubscribeSearch = this.search.subscribe(() => {
      this.#syncInputState();
      if (
        this.activeIndex != null &&
        this.activeIndex >= this.search.items.length
      ) {
        this.setActiveIndex(null);
        return;
      }
      this.emit();
    });
  }

  get snapshot(): QuerySnapshot<T> {
    return {
      activeIndex: this.activeIndex,
      search: this.search.snapshot,
    };
  }

  subscribe(listener: (snapshot: QuerySnapshot<T>) => void) {
    this.#listeners.add(listener);
    listener(this.snapshot);
    return () => this.#listeners.delete(listener);
  }

  setOptions(options: Partial<QueryOptions<T>>) {
    this.#options = {...this.#options, ...options};
  }

  getItemId(index: number) {
    const item = this.search.items[index];
    const key = item == null ? index : this.getItemKey(item);
    const encodedKey = encodeURIComponent(String(key)).replace(/%/g, '_');
    return `${this.#optionIdPrefix}-${encodedKey}`;
  }

  getItemLabel(item: T) {
    return this.#options.getItemLabel(item);
  }

  setListElements(elements: Array<HTMLElement | null>) {
    this.listRef.current = elements;
    this.#syncActiveState();
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
    this.emit();
  }

  setQuery(query: string, event?: Event) {
    this.setActiveIndex(null);
    this.setInputValue(query);
    this.requestOpen(true, event);
    this.search.setQuery(query);
  }

  /** Applies an external query preset and restores focus to the bound input. */
  activateQuery(query: string, event?: Event) {
    this.setQuery(query, event);
    this.focusInput();
  }

  activate(item: T, event?: Event) {
    this.setActiveIndex(null);
    this.requestOpen(false, event);
    this.#options.onActivate?.(item, event);
  }

  handleFocus = (event: FocusEvent) => {
    if (this.#options.openOnFocus ?? true) {
      this.requestOpen(true, event, 'focus');
    }
  };

  handleInput = (event: Event) => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    this.#input = input;
    this.setActiveIndex(null);
    if (this.#options.openOnInput ?? true) this.requestOpen(true, event);
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
    this.activate(item, event);
  };

  getInputProps(): QueryInputProps {
    return {
      value: this.search.query,
      'aria-busy': String(this.search.loading) as 'true' | 'false',
      'data-loading': String(this.search.loading) as 'true' | 'false',
      onFocus: this.handleFocus,
      onInput: this.handleInput,
      onCompositionstart: this.handleCompositionStart,
      onCompositionend: this.handleCompositionEnd,
      onKeydown: this.handleKeyDown,
    };
  }

  getQueryTriggerProps(query: string): QueryTriggerProps {
    return {
      onMousedown: (event) => event.preventDefault(),
      onClick: (event) => this.activateQuery(query, event),
    };
  }

  getOptionProps(item: T, index: number): QueryOptionProps {
    const semantics = this.#getSemantics();
    return {
      id: this.getItemId(index),
      'data-active': index === this.activeIndex ? 'true' : 'false',
      ...(semantics === 'combobox'
        ? {
            role: 'option' as const,
            'aria-selected': 'false' as const,
          }
        : {}),
      onMousedown: (event) => event.preventDefault(),
      onClick: (event) => this.activate(item, event),
    };
  }

  getNavigationOptions(
    options: Partial<QueryNavigationOptions> = {},
  ): QueryNavigationOptions {
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
    input.setAttribute('aria-busy', props['aria-busy']);
    input.dataset.loading = props['data-loading'];
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

  /**
   * Tracks an input whose framework adapter binds the public input props
   * itself. Unlike `bindInput()`, this does not add listeners.
   */
  setInputElement(input: HTMLInputElement | null) {
    this.#input = input;
    this.#syncInputState();
    this.#syncActiveState();
  }

  bindQueryTrigger(element: HTMLElement, query: string) {
    const props = this.getQueryTriggerProps(query);
    element.addEventListener('mousedown', props.onMousedown);
    element.addEventListener('click', props.onClick);
    return () => {
      element.removeEventListener('mousedown', props.onMousedown);
      element.removeEventListener('click', props.onClick);
    };
  }

  bindOption(element: HTMLElement, item: T, index: number) {
    const props = this.getOptionProps(item, index);
    element.id = props.id;
    if (props.role) {
      element.setAttribute('role', props.role);
    } else {
      element.removeAttribute('role');
    }
    element.dataset.active = props['data-active'];
    if (props['aria-selected']) {
      element.setAttribute('aria-selected', props['aria-selected']);
    } else {
      element.removeAttribute('aria-selected');
    }
    element.addEventListener('mousedown', props.onMousedown);
    element.addEventListener('click', props.onClick);
    return () => {
      element.removeEventListener('mousedown', props.onMousedown);
      element.removeEventListener('click', props.onClick);
    };
  }

  rolePlugin(): FloatingPlugin {
    return role(() => {
      const semantics = this.#getSemantics();
      if (semantics === 'none') return {enabled: false};
      return {
        role: semantics,
        ...(semantics === 'combobox'
          ? {
              activeIndex: this.activeIndex,
              getItemId: (index: number) => this.getItemId(index),
            }
          : {}),
      };
    });
  }

  navigationPlugin(
    options: Partial<QueryNavigationOptions> = {},
  ): FloatingPlugin {
    return listNavigation(() => ({
      ...this.getNavigationOptions(options),
      listRef: this.listRef,
      activeIndex: this.activeIndex,
      onNavigate: (index) => this.setActiveIndex(index),
    }));
  }

  interactions(
    navigation: Partial<QueryNavigationOptions> = {},
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

  protected requestOpen(
    open: boolean,
    event?: Event,
    reason?: OpenChangeReason,
  ) {
    this.#options.onOpenChange?.(open, event, reason);
  }

  protected setInputValue(value: string) {
    if (this.#input) this.#input.value = value;
  }

  protected focusInput() {
    this.#input?.focus({preventScroll: true});
  }

  protected getItemKey(item: T) {
    return this.#options.getItemKey?.(item) ?? this.search.getItemKey(item);
  }

  #getSemantics(): QuerySemantics {
    return this.#options.semantics ?? 'combobox';
  }

  #syncActiveState() {
    if (this.#input) {
      if (this.#getSemantics() !== 'combobox' || this.activeIndex == null) {
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

  #syncInputState() {
    if (!this.#input) return;
    const loading = String(this.search.loading);
    this.#input.setAttribute('aria-busy', loading);
    this.#input.dataset.loading = loading;
  }

  protected emit() {
    if (this.#destroyed) return;
    const snapshot = this.snapshot;
    this.#listeners.forEach((listener) => listener(snapshot));
  }
}

export function createQuery<T>(options: QueryOptions<T>) {
  return new QueryController(options);
}

/**
 * @deprecated Use `QueryController`. It keeps ARIA combobox semantics by
 * default, while `QueryController` can also represent dialog and unowned ARIA
 * query surfaces.
 */
export class ComboboxController<T> extends QueryController<T> {
  #options: ComboboxOptions<T>;
  #optionKeys = new WeakMap<HTMLElement, string | number>();

  selectedItem: T | null;

  constructor(options: ComboboxOptions<T>) {
    super({
      search: options.search,
      getItemKey: options.getItemKey,
      getItemLabel: options.getItemLabel,
      openOnFocus: options.openOnFocus,
      openOnInput: options.openOnInput,
      selectOnEnter: options.selectOnEnter,
      refreshOnBind: options.refreshOnBind,
      onOpenChange: options.onOpenChange,
      onActiveIndexChange: options.onActiveIndexChange,
      semantics: 'combobox',
      optionIdPrefix:
        options.optionIdPrefix ?? createId('floating-ui-combobox-option'),
    });
    this.#options = options;
    this.selectedItem = options.initialSelectedItem ?? null;
  }

  override get snapshot(): ComboboxSnapshot<T> {
    return {
      ...super.snapshot,
      selectedItem: this.selectedItem,
      selectedValue: this.selectedItem
        ? this.getItemValue(this.selectedItem)
        : null,
    };
  }

  override subscribe(listener: (snapshot: ComboboxSnapshot<T>) => void) {
    return super.subscribe(listener as (snapshot: QuerySnapshot<T>) => void);
  }

  override getOptionProps(item: T, index: number): ComboboxOptionProps {
    return {
      ...super.getOptionProps(item, index),
      role: 'option',
      'aria-selected':
        this.selectedItem != null &&
        this.getItemKey(this.selectedItem) === this.getItemKey(item)
          ? 'true'
          : 'false',
    };
  }

  override setListElements(elements: Array<HTMLElement | null>) {
    super.setListElements(elements);
    this.#syncSelectedState();
  }

  override bindOption(element: HTMLElement, item: T, index: number) {
    this.#optionKeys.set(element, this.getItemKey(item));
    const cleanup = super.bindOption(element, item, index);
    this.#syncSelectedState();
    return cleanup;
  }

  getItemValue(item: T) {
    return this.#options.getItemValue?.(item) ?? String(this.getItemKey(item));
  }

  setSelectedItem(item: T | null) {
    if (this.selectedItem === item) return;
    this.selectedItem = item;
    this.#syncSelectedState();
    this.emit();
  }

  select(item: T, event?: Event) {
    this.setSelectedItem(item);
    const label = this.getItemLabel(item);
    this.setInputValue(label);
    this.search.setQuery(label);
    this.setActiveIndex(null);
    this.requestOpen(false, event);
    this.#options.onSelect?.(item, event);
  }

  override activate(item: T, event?: Event) {
    this.select(item, event);
  }

  override setOptions(options: Partial<ComboboxOptions<T>>) {
    super.setOptions({...options, semantics: 'combobox'});
    this.#options = {...this.#options, ...options};
  }

  #syncSelectedState() {
    const selectedKey =
      this.selectedItem == null ? null : this.getItemKey(this.selectedItem);
    this.listRef.current.forEach((item) => {
      if (!item) return;
      const itemKey = this.#optionKeys.get(item);
      if (itemKey != null) {
        item.setAttribute('aria-selected', String(itemKey === selectedKey));
      }
    });
  }
}

/** @deprecated Use `createQuery`. */
export function createCombobox<T>(options: ComboboxOptions<T>) {
  return new ComboboxController(options);
}

/** @deprecated Use `createQueryStatusFormatter`. */
export function createComboboxStatusFormatter<T>(
  messages: ComboboxStatusMessages<T>,
): ComboboxStatusFormatter<T> {
  return (context) => {
    if (!context.open) {
      if (context.selectedItem != null && messages.selected) {
        return typeof messages.selected === 'function'
          ? messages.selected(context.selectedItem, context)
          : messages.selected;
      }
      return resolveStatusText(messages.closed, context);
    }
    const phase =
      context.search.error != null
        ? 'error'
        : context.search.loading
          ? 'loading'
          : context.search.phase;
    return resolveStatusText(messages[phase], context);
  };
}
