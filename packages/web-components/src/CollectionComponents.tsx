import {
  c,
  type as atomicoType,
  useContext,
  useEffect,
  useHost,
  useLayoutEffect,
  useMemo,
  useProvider,
  useRef,
  useSlot,
} from 'atomico';
import {
  CompositeController,
  DelayGroup,
  FloatingList,
  FloatingTree,
  NextDelayGroup,
  type QueryController,
  listNavigation,
  typeahead,
  type CompositeOptions,
  type FloatingPlugin,
} from '@floating-ui-plus/web';

import {getFloatingRootRuntime} from './FloatingController';
import {
  floatingComponentContext,
  type FloatingCompositeContext,
} from './component-context';

const contentsStyles = `
  :host,
  slot {
    display: contents;
  }
`;

let nodeId = 0;
let discoveredListItemId = 0;

interface FloatingTreeHost extends HTMLElement {
  tree: FloatingTree;
}

const FloatingTreeBase = c(() => {
  const host = useHost<FloatingTreeHost>().current;
  const inheritedContext = useContext(floatingComponentContext);
  const contextValue = useMemo(
    () => ({
      ...inheritedContext,
      tree: host.tree,
      parentNodeId: null,
    }),
    [inheritedContext, host.tree],
  );
  useProvider(floatingComponentContext, contextValue);
  return (
    <host shadowDom>
      <style>{contentsStyles}</style>
      <slot />
    </host>
  );
});

/** Provides one FloatingTree service to descendant roots and nodes. */
export class FloatingTreeElement extends FloatingTreeBase {
  #tree = new FloatingTree();

  get updateComplete() {
    return this.updated;
  }

  get tree() {
    return this.#tree;
  }

  set tree(value: FloatingTree) {
    if (value === this.#tree) return;
    this.#tree = value;
    void this.update();
  }
}

interface FloatingNodeHost extends HTMLElement {
  nodeId: string;
  parentId: string | null;
  tree: FloatingTree | undefined;
}

const FloatingNodeBase = c(
  () => {
    const host = useHost<FloatingNodeHost>().current;
    const inheritedContext = useContext(floatingComponentContext);
    const root = inheritedContext.root;
    const inheritedTree = inheritedContext.tree;
    const inheritedParentId = inheritedContext.parentNodeId;
    const parentScope = inheritedContext.contextScope;
    const contextValue = useMemo(
      () => ({
        ...inheritedContext,
        parentNodeId: host.nodeId,
        contextScope: root?.controller.contextScope,
      }),
      [inheritedContext, host.nodeId, root],
    );

    useProvider(floatingComponentContext, contextValue);

    useLayoutEffect(() => {
      if (!root) return;
      root.controller
        .setContextParent(parentScope ?? null)
        .node({
          ...(host.tree ?? inheritedTree
            ? {tree: host.tree ?? inheritedTree}
            : {}),
          id: host.nodeId,
          parentId: host.parentId ?? inheritedParentId,
        });
      return () => {
        root.controller.node(null).setContextParent(null);
      };
    }, [
      root,
      host.tree,
      inheritedTree,
      host.nodeId,
      host.parentId,
      inheritedParentId,
      parentScope,
    ]);

    return (
      <host shadowDom>
        <style>{contentsStyles}</style>
        <slot />
      </host>
    );
  },
  {
    props: {
      nodeId: {
        type: String,
        value: (): string => `floating-node-${++nodeId}`,
        attr: 'node-id',
      },
      parentId: {
        type: atomicoType<string | null>(String),
        value: (): string | null => null,
        attr: 'parent-id',
      },
    },
  },
);

/** Registers the nearest root controller as a node in a provided tree. */
export class FloatingNodeElement extends FloatingNodeBase {
  #tree: FloatingTree | undefined;

  get updateComplete() {
    return this.updated;
  }

  get tree() {
    return this.#tree;
  }

  set tree(value: FloatingTree | undefined) {
    if (value === this.#tree) return;
    this.#tree = value;
    void this.update();
  }
}

interface FloatingListHost extends HTMLElement {
  list: FloatingList<unknown>;
  itemSelector: string;
  navigation: boolean;
  typeahead: boolean;
  loop: boolean;
  nested: boolean;
  virtual: boolean;
  allowEscape: boolean;
  activeIndex: number | null;
  commitActiveIndex(index: number | null): void;
}

export interface FloatingListActiveIndexChangeDetail {
  activeIndex: number | null;
}

const FloatingListBase = c(
  () => {
    const host = useHost<FloatingListHost>().current;
    const inheritedContext = useContext(floatingComponentContext);
    const root = inheritedContext.root;
    const contextValue = useMemo(
      () => ({...inheritedContext, list: host.list}),
      [inheritedContext, host.list],
    );
    const elementRef = useMemo(
      () => ({current: [] as Array<HTMLElement | null>}),
      [],
    );
    const labelRef = useMemo(
      () => ({current: [] as Array<string | null>}),
      [],
    );
    const originalItemState = useMemo(
      () =>
        new Map<
          HTMLElement,
          {tabIndex: string | null; active: string | null}
        >(),
      [],
    );
    const discoveredItems = useMemo(
      () =>
        new Map<
          HTMLElement,
          {id: string; label: string | null; unregister: () => void}
        >(),
      [],
    );
    useProvider(floatingComponentContext, contextValue);

    useLayoutEffect(() => {
      const clearDiscoveredItems = (
        except = new Set<HTMLElement>(),
      ) => {
        for (const [element, item] of discoveredItems) {
          if (except.has(element)) continue;
          item.unregister();
          discoveredItems.delete(element);
        }
      };
      const syncDiscoveredItems = () => {
        if (!host.itemSelector) {
          clearDiscoveredItems();
          return;
        }
        let elements: HTMLElement[];
        try {
          elements = Array.from(
            host.querySelectorAll<HTMLElement>(host.itemSelector),
          ).filter(
            (element) => element.closest('floating-list') === host,
          );
        } catch {
          clearDiscoveredItems();
          return;
        }
        const currentElements = new Set(elements);
        clearDiscoveredItems(currentElements);
        for (const element of elements) {
          const label =
            element.getAttribute('aria-label') ??
            element.textContent;
          const existing = discoveredItems.get(element);
          if (existing) {
            if (existing.label !== label) {
              existing.label = label;
              host.list.update(existing.id, {label});
            }
            continue;
          }
          const id = `floating-list-discovered-${++discoveredListItemId}`;
          discoveredItems.set(element, {
            id,
            label,
            unregister: host.list.register({
              id,
              element,
              label,
              value: element,
            }),
          });
        }
      };

      syncDiscoveredItems();
      const observer = new MutationObserver(syncDiscoveredItems);
      observer.observe(host, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-label'],
      });
      return () => {
        observer.disconnect();
        clearDiscoveredItems();
      };
    }, [host.list, host.itemSelector, discoveredItems]);

    const restoreItems = (except = new Set<HTMLElement>()) => {
      for (const [element, original] of originalItemState) {
        if (except.has(element)) continue;
        if (original.tabIndex == null) {
          element.removeAttribute('tabindex');
        } else {
          element.setAttribute('tabindex', original.tabIndex);
        }
        if (original.active == null) {
          delete element.dataset.active;
        } else {
          element.dataset.active = original.active;
        }
        originalItemState.delete(element);
      }
    };

    const syncItems = () => {
      const items = host.list.items;
      elementRef.current = items.map((item) => item.element);
      labelRef.current = items.map((item) => item.label);
      const currentElements = new Set(
        elementRef.current.filter(
          (element): element is HTMLElement => element != null,
        ),
      );
      restoreItems(currentElements);
      if (!host.navigation && !host.typeahead) {
        restoreItems();
        root?.controller.refresh();
        return;
      }
      if (
        host.activeIndex != null &&
        !elementRef.current[host.activeIndex]
      ) {
        host.commitActiveIndex(null);
      }
      if (host.virtual) restoreItems();
      items.forEach(({element}, index) => {
        if (!element) return;
        if (!host.virtual && !originalItemState.has(element)) {
          originalItemState.set(element, {
            tabIndex: element.getAttribute('tabindex'),
            active: element.getAttribute('data-active'),
          });
        }
        if (!host.virtual) {
          element.tabIndex = index === host.activeIndex ? 0 : -1;
        }
        element.dataset.active = String(index === host.activeIndex);
      });
      root?.controller.refresh();
    };

    useLayoutEffect(() => {
      if (!root) return;
      root.controller.withList(host.list);
      syncItems();
      const unsubscribe = host.list.subscribe(syncItems);
      return () => {
        unsubscribe();
        restoreItems();
        if (root.controller.list === host.list) {
          root.controller.withList();
        }
      };
    }, [
      root,
      host.list,
      host.navigation,
      host.typeahead,
      host.activeIndex,
      host.virtual,
      originalItemState,
    ]);

    useLayoutEffect(() => {
      if (!root || (!host.navigation && !host.typeahead)) return;
      const plugins: FloatingPlugin[] = [];
      if (host.navigation) {
        plugins.push(
          listNavigation(() => ({
            listRef: elementRef,
            activeIndex: host.activeIndex,
            loop: host.loop,
            nested: host.nested || root.controller.context.nested,
            virtual: host.virtual,
            allowEscape: host.allowEscape,
            focusItemOnOpen: host.virtual ? false : 'auto',
            onNavigate: (index) => host.commitActiveIndex(index),
          })),
        );
      }
      if (host.typeahead) {
        plugins.push(
          typeahead(() => ({
            listRef: labelRef,
            activeIndex: host.activeIndex,
            onMatch: (index) => {
              host.commitActiveIndex(index);
              if (!host.virtual) {
                elementRef.current[index]?.focus({preventScroll: true});
              }
            },
          })),
        );
      }
      return getFloatingRootRuntime(root).registerComponentPlugins(
        host,
        plugins,
      );
    }, [
      root,
      host.navigation,
      host.typeahead,
      host.loop,
      host.nested,
      host.virtual,
      host.allowEscape,
      elementRef,
      labelRef,
    ]);

    useEffect(() => {
      if (!root) return;
      return root.controller.context.events.on('openchange', ({open}) => {
        if (!open) host.commitActiveIndex(null);
      });
    }, [root]);

    return (
      <host shadowDom>
        <style>{contentsStyles}</style>
        <slot />
      </host>
    );
  },
  {
    props: {
      itemSelector: {
        type: String,
        value: (): string => '',
        attr: 'item-selector',
      },
      navigation: {type: Boolean, value: (): boolean => false, reflect: true},
      typeahead: {type: Boolean, value: (): boolean => false, reflect: true},
      loop: {type: Boolean, value: (): boolean => false, reflect: true},
      nested: {type: Boolean, value: (): boolean => false, reflect: true},
      virtual: {type: Boolean, value: (): boolean => false, reflect: true},
      allowEscape: {
        type: Boolean,
        value: (): boolean => false,
        reflect: true,
        attr: 'allow-escape',
      },
    },
  },
);

/** Provides a shared ordered list to a descendant root and list items. */
export class FloatingListElement extends FloatingListBase {
  #list: FloatingList<unknown> = new FloatingList();
  #activeIndex: number | null = null;

  get updateComplete() {
    return this.updated;
  }

  get list() {
    return this.#list;
  }

  set list(value: FloatingList<unknown>) {
    if (value === this.#list) return;
    this.#list = value;
    void this.update();
  }

  get activeIndex() {
    return this.#activeIndex;
  }

  set activeIndex(value: number | null) {
    this.#setActiveIndex(value, false);
  }

  commitActiveIndex(index: number | null) {
    this.#setActiveIndex(index, true);
  }

  #setActiveIndex(index: number | null, emit: boolean) {
    if (index === this.#activeIndex) return;
    this.#activeIndex = index;
    void this.update();
    if (!emit) return;
    this.dispatchEvent(
      new CustomEvent<FloatingListActiveIndexChangeDetail>(
        'activeindexchange',
        {
          bubbles: true,
          composed: true,
          detail: {activeIndex: index},
        },
      ),
    );
  }
}

interface FloatingListItemHost extends HTMLElement {
  itemId: string;
  label: string | null;
  value: unknown;
  list: FloatingList<unknown> | undefined;
  query: FloatingOptionBinder | undefined;
}

type FloatingOptionBinder = Pick<QueryController<unknown>, 'bindOption'>;

const FloatingListItemBase = c(
  () => {
    const host = useHost<FloatingListItemHost>().current;
    const componentContext = useContext(floatingComponentContext);
    const inheritedList = componentContext.list;
    // Search result templates are cloned after their owning query has rendered,
    // so their Atomico context can be absent. Fall back to the nearest query
    // element to retain its option ARIA and activation bindings.
    const owningQuery = host.closest(
      'floating-query, floating-combobox',
    ) as (HTMLElement & {controller?: FloatingOptionBinder}) | null;
    const query =
      host.query ??
      componentContext.query ??
      componentContext.combobox ??
      owningQuery?.controller;
    const slot = useRef<HTMLSlotElement>();
    const children = useSlot<HTMLElement>(
      slot,
      (node) => node instanceof HTMLElement,
    );
    const element = children[0] ?? null;
    const list = host.list ?? inheritedList;

    useLayoutEffect(() => {
      if (!list || !element) return;
      const unregister = list.register({
        ...(host.itemId ? {id: host.itemId} : {}),
        element,
        label: host.label ?? element.textContent,
        value: host.value ?? element,
      });
      let unbindOption: (() => void) | undefined;
      const syncQueryOption = () => {
        unbindOption?.();
        unbindOption = undefined;
        if (!query) return;
        const item = list.items.find((current) => current.element === element);
        if (!item) return;
        unbindOption = query.bindOption(
          element,
          item.value,
          item.index,
        );
      };
      const unsubscribe = list.subscribe(syncQueryOption);
      syncQueryOption();
      return () => {
        unsubscribe();
        unbindOption?.();
        unregister();
      };
    }, [
      list,
      element,
      host.itemId,
      host.label,
      host.value,
      query,
    ]);

    return (
      <host shadowDom>
        <style>{contentsStyles}</style>
        <slot ref={slot} />
      </host>
    );
  },
  {
    props: {
      itemId: {
        type: String,
        value: (): string => '',
        attr: 'item-id',
      },
      label: {
        type: atomicoType<string | null>(String),
        value: (): string | null => null,
      },
    },
  },
);

/** Registers its first child with the nearest FloatingList. */
export class FloatingListItemElement extends FloatingListItemBase {
  #value: unknown;
  #list: FloatingList<unknown> | undefined;
  #query: FloatingOptionBinder | undefined;

  get updateComplete() {
    return this.updated;
  }

  get value() {
    return this.#value;
  }

  set value(value: unknown) {
    if (value === this.#value) return;
    this.#value = value;
    void this.update();
  }

  get list() {
    return this.#list;
  }

  set list(value: FloatingList<unknown> | undefined) {
    if (value === this.#list) return;
    this.#list = value;
    void this.update();
  }

  get query() {
    return this.#query;
  }

  set query(value: FloatingOptionBinder | undefined) {
    if (value === this.#query) return;
    this.#query = value;
    void this.update();
  }
}

interface DelayGroupHost extends HTMLElement {
  delay: number;
  timeoutMs: number;
  group: DelayGroup;
  destroyOwnedGroup(): void;
}

function delayGroupView() {
  return () => {
    const host = useHost<DelayGroupHost>().current;
    const inheritedContext = useContext(floatingComponentContext);
    const root = inheritedContext.root;
    const contextValue = useMemo(
      () => ({...inheritedContext, delayGroup: host.group}),
      [inheritedContext, host.group],
    );
    useProvider(floatingComponentContext, contextValue);

    useLayoutEffect(() => {
      host.group.options = {
        delay: host.delay,
        timeoutMs: host.timeoutMs,
      };
      root?.controller.delayGroup({group: host.group});
      return () => root?.controller.delayGroup(null);
    }, [root, host.group, host.delay, host.timeoutMs]);
    useEffect(
      () => () => {
        host.destroyOwnedGroup();
      },
      [host],
    );

    return (
      <host shadowDom>
        <style>{contentsStyles}</style>
        <slot />
      </host>
    );
  };
}

const delayGroupProps = {
  delay: {type: Number, value: (): number => 0},
  timeoutMs: {
    type: Number,
    value: (): number => 0,
    attr: 'timeout-ms',
  },
} as const;

const FloatingDelayGroupBase = c(
  delayGroupView(),
  {props: delayGroupProps},
);

export class FloatingDelayGroupElement extends FloatingDelayGroupBase {
  #group = new DelayGroup({delay: 0, timeoutMs: 0});
  #ownsGroup = true;

  get updateComplete() {
    return this.updated;
  }

  get group() {
    return this.#group;
  }

  set group(value: DelayGroup) {
    if (value === this.#group) return;
    if (this.#ownsGroup) this.#group.destroy();
    this.#group = value;
    this.#ownsGroup = false;
    void this.update();
  }

  destroyOwnedGroup() {
    if (this.#ownsGroup) this.#group.destroy();
  }
}

const NextFloatingDelayGroupBase = c(
  delayGroupView(),
  {props: delayGroupProps},
);

export class NextFloatingDelayGroupElement extends NextFloatingDelayGroupBase {
  #group = new NextDelayGroup({delay: 0, timeoutMs: 0});
  #ownsGroup = true;

  get updateComplete() {
    return this.updated;
  }

  get group() {
    return this.#group;
  }

  set group(value: DelayGroup) {
    if (value === this.#group) return;
    if (this.#ownsGroup) this.#group.destroy();
    this.#group = value;
    this.#ownsGroup = false;
    void this.update();
  }

  destroyOwnedGroup() {
    if (this.#ownsGroup) this.#group.destroy();
  }
}

interface FloatingCompositeHost extends HTMLElement {
  orientation: CompositeOptions['orientation'];
  loop: boolean;
  cols: number;
  rtl: boolean;
  controller: CompositeController;
  syncController(): {
    controller: CompositeController;
    elements: Set<HTMLElement>;
    sync(): void;
  };
}

const FloatingCompositeBase = c(
  () => {
    const host = useHost<FloatingCompositeHost>().current;
    const contextValue = host.syncController();
    const inheritedContext = useContext(floatingComponentContext);
    const providedContext = useMemo(
      () => ({...inheritedContext, composite: contextValue}),
      [inheritedContext, contextValue],
    );
    useProvider(floatingComponentContext, providedContext);

    return (
      <host
        shadowDom
        onkeydown={(event: KeyboardEvent) => {
          host.controller.keydown(event);
        }}
      >
        <style>{contentsStyles}</style>
        <slot />
      </host>
    );
  },
  {
    props: {
      orientation: {
        type: atomicoType<CompositeOptions['orientation']>(String),
        value: (): CompositeOptions['orientation'] => 'both',
      },
      loop: {type: Boolean, value: (): boolean => false, reflect: true},
      cols: {type: Number, value: (): number => 1},
      rtl: {type: Boolean, value: (): boolean => false, reflect: true},
    },
  },
);

/** Keyboard navigation owner for a group of composite items. */
export class FloatingCompositeElement extends FloatingCompositeBase {
  #controller = this.#createController();
  readonly #elements = new Set<HTMLElement>();
  #optionsKey = '';
  readonly #context = {
    controller: this.#controller,
    elements: this.#elements,
    sync: () => this.#controller.setItems(this.#elements),
  };

  get updateComplete() {
    return this.updated;
  }

  get controller() {
    return this.#controller;
  }

  syncController() {
    const key = [
      this.orientation,
      String(this.loop),
      String(this.cols),
      String(this.rtl),
    ].join(':');
    if (key !== this.#optionsKey) {
      this.#optionsKey = key;
      this.#controller = this.#createController();
      this.#context.controller = this.#controller;
      this.#context.sync();
    }
    return this.#context;
  }

  #createController() {
    return new CompositeController({
      orientation: this.orientation,
      loop: this.loop,
      cols: this.cols,
      rtl: this.rtl,
    });
  }
}

const FloatingCompositeItemBase = c(() => {
  const context = useContext(floatingComponentContext).composite;
  const slot = useRef<HTMLSlotElement>();
  const children = useSlot<HTMLElement>(
    slot,
    (node) => node instanceof HTMLElement,
  );
  const element = children[0] ?? null;

  useLayoutEffect(() => {
    if (!context || !element) return;
    context.elements.add(element);
    context.sync();
    return () => {
      context.elements.delete(element);
      context.sync();
    };
  }, [context, element]);

  return (
    <host shadowDom>
      <style>{contentsStyles}</style>
      <slot ref={slot} />
    </host>
  );
});

/** Registers its first child with the nearest composite owner. */
export class FloatingCompositeItemElement extends FloatingCompositeItemBase {
  get updateComplete() {
    return this.updated;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-tree': FloatingTreeElement;
    'floating-node': FloatingNodeElement;
    'floating-list': FloatingListElement;
    'floating-list-item': FloatingListItemElement;
    'floating-delay-group': FloatingDelayGroupElement;
    'next-floating-delay-group': NextFloatingDelayGroupElement;
    'floating-composite': FloatingCompositeElement;
    'floating-composite-item': FloatingCompositeItemElement;
  }

  interface HTMLElementEventMap {
    activeindexchange: CustomEvent<FloatingListActiveIndexChangeDetail>;
  }
}
