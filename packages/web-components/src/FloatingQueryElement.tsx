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
  QueryController,
  type QuerySnapshot,
  type QuerySemantics,
  SearchController,
} from '@floating-ui-plus/web';

import {
  createFloatingQueryStatusFormatter,
  type FloatingQueryConfiguration,
  type FloatingQueryStatusFormatter,
} from './query-types';
import type {FloatingListElement} from './CollectionComponents';
import {floatingComponentContext} from './component-context';
import {getFloatingRootRuntime} from './FloatingController';
import type {FloatingTemplateLifecycleDetail} from './FloatingRootElement';
import type {FloatingResultsElement} from './FloatingResultsElement';

const contentsStyles = `
  :host,
  slot {
    display: contents;
  }
`;

export interface FloatingQueryStateChangeDetail<T = unknown> {
  snapshot: QuerySnapshot<T>;
}

export interface FloatingQueryActivateDetail<T = unknown> {
  item: T;
  sourceEvent?: Event | undefined;
}

interface FloatingQueryHost extends HTMLElement {
  inputSelector: string;
  itemLabelKey: string;
  optionIdPrefix: string;
  queryTriggerSelector: string;
  statusSelector: string;
  semantics: QuerySemantics | '';
  search: SearchController<unknown> | undefined;
  getItemKey: ((item: unknown) => string | number) | undefined;
  getItemLabel: ((item: unknown) => string) | undefined;
  statusFormatter: FloatingQueryStatusFormatter<unknown> | undefined;
  ownsSearch: boolean;
  setController(controller: QueryController<unknown> | undefined): void;
}

function findInput(host: FloatingQueryHost) {
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

function getSearchViews(scope: Element) {
  return [
    ...(scope.matches('floating-results, floating-search')
      ? [scope as FloatingResultsElement]
      : []),
    ...Array.from(
      scope.querySelectorAll<FloatingResultsElement>(
        'floating-results, floating-search',
      ),
    ),
  ];
}

function getQueryTriggerValue(element: Element) {
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLOptionElement
  ) {
    return element.value;
  }
  return element.getAttribute('data-query') ?? element.textContent?.trim() ?? '';
}

function getQuerySemantics(host: FloatingQueryHost): QuerySemantics {
  if (host.semantics) return host.semantics;
  return host.closest('dialog') ? 'dialog' : 'combobox';
}

const FloatingQueryBase = c(
  () => {
    const host = useHost<FloatingQueryHost>().current;
    const inheritedContext = useContext(floatingComponentContext);
    const root = inheritedContext.root;
    const listElement = host.closest(
      'floating-list',
    ) as FloatingListElement | null;
    const input = findInput(host);
    const semantics = getQuerySemantics(host);
    const controller = useMemo(() => {
      if (!root || !host.search) return undefined;
      return new QueryController<unknown>({
        search: host.search,
        semantics,
        getItemLabel: (item) =>
          host.getItemLabel?.(item) ??
          getDefaultItemLabel(item, host.itemLabelKey),
        ...(host.getItemKey ? {getItemKey: host.getItemKey} : {}),
        ...(host.optionIdPrefix
          ? {optionIdPrefix: host.optionIdPrefix}
          : {}),
        onOpenChange: (open, event, reason) =>
          root.controller.context.onOpenChange(open, event, reason),
        onActiveIndexChange: (index) => {
          if (listElement) listElement.activeIndex = index;
          root.controller.refresh();
        },
        onActivate: (item, sourceEvent) => {
          host.dispatchEvent(
            new CustomEvent<FloatingQueryActivateDetail>('queryactivate', {
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
      semantics,
      host.getItemKey,
      host.getItemLabel,
      host.itemLabelKey,
      host.optionIdPrefix,
    ]);
    const contextValue = useMemo(
      () => ({...inheritedContext, query: controller}),
      [inheritedContext, controller],
    );
    useProvider(floatingComponentContext, contextValue);

    useEffect(() => {
      const search = host.search;
      if (!search || !host.ownsSearch) return;
      search.connect();
      return () => search.disconnect();
    }, [host, host.search, host.ownsSearch]);

    useLayoutEffect(() => {
      host.setController(controller);
      return () => host.setController(undefined);
    }, [host, controller]);

    useLayoutEffect(() => {
      const search = host.search;
      if (!search) return;
      const boundViews = new Set<FloatingResultsElement>();
      const getItemLabel = (item: unknown) =>
        host.getItemLabel?.(item) ??
        getDefaultItemLabel(item, host.itemLabelKey);
      const bindViews = (scope: Element) => {
        for (const view of getSearchViews(scope)) {
          const owningQuery = view.closest('floating-query, floating-combobox');
          if (owningQuery && owningQuery !== host) continue;
          view.getItemLabel = getItemLabel;
          view.onRender = () => root?.controller.refresh();
          view.search = search;
          view.query = controller;
          boundViews.add(view);
        }
      };
      const handleMount = (event: Event) => {
        const {root: mountedRoot, element} = (
          event as CustomEvent<FloatingTemplateLifecycleDetail>
        ).detail;
        if (mountedRoot !== root) return;
        bindViews(element);
      };

      bindViews(host);
      if (root?.floatingElement) bindViews(root.floatingElement);
      host.addEventListener('floatingmount', handleMount);
      return () => {
        host.removeEventListener('floatingmount', handleMount);
        for (const view of boundViews) {
          if (view.search === search) {
            view.search = undefined;
            view.query = undefined;
            view.onRender = undefined;
          }
        }
      };
    }, [
      host,
      root,
      controller,
      host.search,
      host.getItemLabel,
      host.itemLabelKey,
    ]);

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
      listElement?.addEventListener('activeindexchange', onActiveIndexChange);
      const syncStatus = (snapshot = controller.snapshot) => {
        const status = host.querySelector<HTMLElement>(host.statusSelector);
        if (!status || !host.statusFormatter) return;
        status.textContent = host.statusFormatter({...snapshot, open: root.open});
      };
      const unsubscribeController = controller.subscribe((snapshot) => {
        const loading = String(snapshot.search.loading);
        host.dataset.loading = loading;
        host.setAttribute('aria-busy', loading);
        host.dispatchEvent(
          new CustomEvent<FloatingQueryStateChangeDetail>('querystatechange', {
            bubbles: true,
            composed: true,
            detail: {snapshot},
          }),
        );
        syncStatus(snapshot);
      });
      const handleOpenChange = () => syncStatus();
      root.addEventListener('openchange', handleOpenChange);
      syncList();
      syncStatus();
      root.controller.refresh();
      return () => {
        unsubscribeController();
        root.removeEventListener('openchange', handleOpenChange);
        listElement?.removeEventListener('activeindexchange', onActiveIndexChange);
        unsubscribeList?.();
        unregisterRole();
        unbindInput();
        if (listElement && previousVirtual != null) {
          listElement.virtual = previousVirtual;
        }
      };
    }, [
      host,
      root,
      listElement,
      controller,
      input,
      host.statusSelector,
      host.statusFormatter,
    ]);

    useLayoutEffect(() => {
      const selector = host.queryTriggerSelector;
      if (!controller || !selector) return;
      const scope = host.getRootNode();
      if (!(scope instanceof Document || scope instanceof ShadowRoot)) return;
      try {
        scope.querySelector(selector);
      } catch {
        return;
      }
      const findTrigger = (event: Event) =>
        event
          .composedPath()
          .find(
            (target): target is Element =>
              target instanceof Element && target.matches(selector),
          );
      const handleMouseDown = (event: Event) => {
        if (findTrigger(event)) event.preventDefault();
      };
      const handleClick = (event: Event) => {
        const trigger = findTrigger(event);
        if (!trigger) return;
        controller.activateQuery(getQueryTriggerValue(trigger), event);
      };
      scope.addEventListener('mousedown', handleMouseDown);
      scope.addEventListener('click', handleClick);
      return () => {
        scope.removeEventListener('mousedown', handleMouseDown);
        scope.removeEventListener('click', handleClick);
      };
    }, [host, controller, host.queryTriggerSelector]);

    useEffect(() => {
      if (!controller) return;
      return () => controller.destroy();
    }, [controller]);

    useEffect(() => {
      const observer = new MutationObserver(
        () => void (host as FloatingQueryElement).update(),
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
      queryTriggerSelector: {
        type: String,
        value: (): string => '',
        attr: 'query-trigger-selector',
      },
      statusSelector: {
        type: String,
        value: (): string => ':is([aria-live], [data-query-status])',
        attr: 'status-selector',
      },
      semantics: {
        type: String,
        value: (): string => '',
        reflect: true,
      },
    },
  },
);

/**
 * Connects an editable query, result list, and configurable ARIA semantics.
 * It is not form-associated and does not own a selected value.
 */
export class FloatingQueryElement extends FloatingQueryBase {
  #search: SearchController<unknown> | undefined;
  #getItemKey: ((item: unknown) => string | number) | undefined;
  #getItemLabel: ((item: unknown) => string) | undefined;
  #controller: QueryController<unknown> | undefined;
  #statusFormatter: FloatingQueryStatusFormatter<unknown> | undefined;
  #ownsSearch = false;

  get updateComplete() {
    return this.updated;
  }

  get search() {
    return this.#search;
  }

  set search(value: SearchController<unknown> | undefined) {
    this.#setSearch(value, false);
  }

  get ownsSearch() {
    return this.#ownsSearch;
  }

  get getItemKey() {
    return this.#getItemKey;
  }

  set getItemKey(value: ((item: unknown) => string | number) | undefined) {
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

  get statusFormatter() {
    return this.#statusFormatter;
  }

  set statusFormatter(value: FloatingQueryStatusFormatter<unknown> | undefined) {
    if (value === this.#statusFormatter) return;
    this.#statusFormatter = value;
    void this.update();
  }

  configure<T>(configuration: FloatingQueryConfiguration<T>) {
    this.getItemLabel = configuration.getItemLabel as (item: unknown) => string;
    this.getItemKey = configuration.getItemKey as
      | ((item: unknown) => string | number)
      | undefined;
    if (configuration.semantics !== undefined) {
      this.semantics = configuration.semantics;
    }
    this.statusFormatter = configuration.status
      ? ((typeof configuration.status === 'function'
          ? configuration.status
          : createFloatingQueryStatusFormatter(configuration.status)) as
          FloatingQueryStatusFormatter<unknown>)
      : undefined;
    const ownsSearch = !(configuration.search instanceof SearchController);
    const search = ownsSearch
      ? new SearchController(configuration.search)
      : configuration.search;
    this.#setSearch(search as SearchController<unknown>, ownsSearch);
  }

  setController(controller: QueryController<unknown> | undefined) {
    this.#controller = controller;
  }

  setQuery(query: string, event?: Event) {
    this.#controller?.setQuery(query, event);
  }

  #setSearch(value: SearchController<unknown> | undefined, owned: boolean) {
    if (value === this.#search && owned === this.#ownsSearch) return;
    if (this.#ownsSearch && this.#search !== value) {
      this.#search?.destroy();
    }
    this.#search = value;
    this.#ownsSearch = owned;
    void this.update();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-query': FloatingQueryElement;
  }
}
