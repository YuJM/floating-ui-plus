import {
  c,
  useContext,
  useEffect,
  useHost,
  useLayoutEffect,
  useMemo,
  useProvider,
} from 'atomico';
import {
  ComboboxController,
  type ComboboxSnapshot,
  type SearchController,
} from '@floating-ui-plus/web';

import type {FloatingListElement} from './CollectionComponents';
import {floatingComponentContext} from './component-context';
import {getFloatingRootRuntime} from './FloatingController';

const contentsStyles = `
  :host,
  slot {
    display: contents;
  }
`;

export interface FloatingComboboxStateChangeDetail<T = unknown> {
  snapshot: ComboboxSnapshot<T>;
}

export interface FloatingComboboxSelectDetail<T = unknown> {
  item: T;
  sourceEvent?: Event | undefined;
}

interface FloatingComboboxHost extends HTMLElement {
  inputSelector: string;
  itemLabelKey: string;
  optionIdPrefix: string;
  search: SearchController<unknown> | undefined;
  getItemKey: ((item: unknown) => string | number) | undefined;
  getItemLabel: ((item: unknown) => string) | undefined;
  selectedItem: unknown | null;
  setController(controller: ComboboxController<unknown> | undefined): void;
}

function findInput(host: FloatingComboboxHost) {
  try {
    const element = host.querySelector(host.inputSelector);
    return element instanceof HTMLInputElement ? element : null;
  } catch {
    return null;
  }
}

function getDefaultItemLabel(item: unknown, key: string) {
  if (item != null && typeof item === 'object' && key && key in item) {
    return String((item as Record<string, unknown>)[key] ?? '');
  }
  return String(item ?? '');
}

const FloatingComboboxBase = c(
  () => {
    const host = useHost<FloatingComboboxHost>().current;
    const inheritedContext = useContext(floatingComponentContext);
    const root = inheritedContext.root;
    const listElement = host.closest(
      'floating-list',
    ) as FloatingListElement | null;
    const input = findInput(host);
    const controller = useMemo(() => {
      if (!root || !host.search) return undefined;
      return new ComboboxController<unknown>({
        search: host.search,
        getItemLabel: (item) =>
          host.getItemLabel?.(item) ??
          getDefaultItemLabel(item, host.itemLabelKey),
        ...(host.getItemKey ? {getItemKey: host.getItemKey} : {}),
        ...(host.optionIdPrefix
          ? {optionIdPrefix: host.optionIdPrefix}
          : {}),
        initialSelectedItem: host.selectedItem,
        onOpenChange: (open, event, reason) =>
          root.controller.context.onOpenChange(open, event, reason),
        onActiveIndexChange: (index) => {
          if (listElement) listElement.activeIndex = index;
          root.controller.refresh();
        },
        onSelect: (item, sourceEvent) => {
          host.dispatchEvent(
            new CustomEvent<FloatingComboboxSelectDetail>('comboboxselect', {
              bubbles: true,
              composed: true,
              detail: {item, sourceEvent},
            }),
          );
        },
      });
    }, [
      root,
      listElement,
      host.search,
      host.getItemKey,
      host.getItemLabel,
      host.itemLabelKey,
      host.optionIdPrefix,
    ]);
    const contextValue = useMemo(
      () => ({...inheritedContext, combobox: controller}),
      [inheritedContext, controller],
    );
    useProvider(floatingComponentContext, contextValue);

    useLayoutEffect(() => {
      host.setController(controller);
      return () => host.setController(undefined);
    }, [host, controller]);

    useLayoutEffect(() => {
      if (!root || !controller || !input) return;
      const previousVirtual = listElement?.virtual;
      if (listElement) {
        listElement.virtual =
          controller.getNavigationOptions().virtual === true;
      }
      const unbindInput = controller.bindInput(input);
      const unregisterRole = getFloatingRootRuntime(
        root,
      ).registerComponentPlugins(host, [controller.rolePlugin()]);
      const syncList = () => {
        controller.setListElements(
          listElement?.list.items.map((item) => item.element) ?? [],
        );
      };
      const unsubscribeList = listElement?.list.subscribe(syncList);
      const onActiveIndexChange = (event: Event) => {
        const detail = (
          event as CustomEvent<{activeIndex: number | null}>
        ).detail;
        controller.setActiveIndex(detail.activeIndex);
      };
      listElement?.addEventListener(
        'activeindexchange',
        onActiveIndexChange,
      );
      const unsubscribeController = controller.subscribe((snapshot) => {
        host.dispatchEvent(
          new CustomEvent<FloatingComboboxStateChangeDetail>(
            'comboboxstatechange',
            {
              bubbles: true,
              composed: true,
              detail: {snapshot},
            },
          ),
        );
      });
      syncList();
      root.controller.refresh();
      return () => {
        unsubscribeController();
        listElement?.removeEventListener(
          'activeindexchange',
          onActiveIndexChange,
        );
        unsubscribeList?.();
        unregisterRole();
        unbindInput();
        if (listElement && previousVirtual != null) {
          listElement.virtual = previousVirtual;
        }
      };
    }, [host, root, listElement, controller, input]);

    useEffect(() => {
      if (!controller) return;
      return () => controller.destroy();
    }, [controller]);

    useEffect(() => {
      const observer = new MutationObserver(
        () => void (host as FloatingComboboxElement).update(),
      );
      observer.observe(host, {childList: true, subtree: true});
      return () => observer.disconnect();
    }, [host]);

    return (
      <host shadowDom>
        <style>{contentsStyles}</style>
        <slot />
      </host>
    );
  },
  {
    props: {
      inputSelector: {
        type: String,
        value: (): string => 'input',
        attr: 'input-selector',
      },
      itemLabelKey: {
        type: String,
        value: (): string => 'label',
        attr: 'item-label-key',
      },
      optionIdPrefix: {
        type: String,
        value: (): string => '',
        attr: 'option-id-prefix',
      },
    },
  },
);

/** Connects search, editable input, list, selection, and combobox ARIA. */
export class FloatingComboboxElement extends FloatingComboboxBase {
  #search: SearchController<unknown> | undefined;
  #getItemKey: ((item: unknown) => string | number) | undefined;
  #getItemLabel: ((item: unknown) => string) | undefined;
  #controller: ComboboxController<unknown> | undefined;
  #selectedItem: unknown | null = null;

  get updateComplete() {
    return this.updated;
  }

  get search() {
    return this.#search;
  }

  set search(value: SearchController<unknown> | undefined) {
    if (value === this.#search) return;
    this.#search = value;
    void this.update();
  }

  get getItemKey() {
    return this.#getItemKey;
  }

  set getItemKey(
    value: ((item: unknown) => string | number) | undefined,
  ) {
    if (value === this.#getItemKey) return;
    this.#getItemKey = value;
    void this.update();
  }

  get getItemLabel() {
    return this.#getItemLabel;
  }

  set getItemLabel(value: ((item: unknown) => string) | undefined) {
    if (value === this.#getItemLabel) return;
    this.#getItemLabel = value;
    void this.update();
  }

  get controller() {
    return this.#controller;
  }

  get selectedItem() {
    return this.#controller?.selectedItem ?? this.#selectedItem;
  }

  set selectedItem(value: unknown | null) {
    this.#selectedItem = value;
    this.#controller?.setSelectedItem(value);
  }

  setController(controller: ComboboxController<unknown> | undefined) {
    this.#controller = controller;
    if (controller) controller.setSelectedItem(this.#selectedItem);
  }

  setQuery(query: string, event?: Event) {
    this.#controller?.setQuery(query, event);
  }

  select(item: unknown, event?: Event) {
    this.#controller?.select(item, event);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-combobox': FloatingComboboxElement;
  }
}
