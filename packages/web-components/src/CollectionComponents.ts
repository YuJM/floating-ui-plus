import {
  ContextConsumer,
  ContextProvider,
} from '@lit/context';
import {css, html, LitElement, type PropertyValues} from 'lit';
import {
  CompositeController,
  DelayGroup,
  FloatingList,
  FloatingTree,
  NextDelayGroup,
  type CompositeOptions,
} from '@floating-ui-plus/web';

import {
  floatingCompositeContext,
  floatingContextScopeContext,
  floatingDelayGroupContext,
  floatingListContext,
  floatingParentNodeContext,
  floatingRootContext,
  floatingTreeContext,
  type FloatingCompositeContext,
} from './component-context';
import type {FloatingRootElement} from './FloatingRootElement';

const contentsStyles = css`
  :host,
  slot {
    display: contents;
  }
`;

let nodeId = 0;

/** Provides one FloatingTree service to descendant roots and nodes. */
export class FloatingTreeElement extends LitElement {
  static properties = {
    tree: {attribute: false},
  };

  static styles = contentsStyles;

  declare tree: FloatingTree;
  readonly #treeProvider: ContextProvider<
    typeof floatingTreeContext,
    FloatingTreeElement
  >;
  readonly #parentProvider = new ContextProvider(this, {
    context: floatingParentNodeContext,
    initialValue: null,
  });

  constructor() {
    super();
    this.tree = new FloatingTree();
    this.#treeProvider = new ContextProvider(this, {
      context: floatingTreeContext,
      initialValue: this.tree,
    });
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('tree')) this.#treeProvider.setValue(this.tree);
  }

  protected render() {
    return html`<slot></slot>`;
  }
}

/** Registers the nearest root controller as a node in a provided tree. */
export class FloatingNodeElement extends LitElement {
  static properties = {
    nodeId: {type: String, attribute: 'node-id'},
    parentId: {type: String, attribute: 'parent-id'},
    tree: {attribute: false},
  };

  static styles = contentsStyles;

  declare nodeId: string;
  declare parentId: string | null;
  declare tree: FloatingTree | undefined;

  #root?: FloatingRootElement;
  #inheritedTree?: FloatingTree;
  #inheritedParentId: string | null = null;
  #parentScope?: FloatingRootElement['controller']['contextScope'];
  readonly #nodeProvider: ContextProvider<
    typeof floatingParentNodeContext,
    FloatingNodeElement
  >;
  readonly #scopeProvider: ContextProvider<
    typeof floatingContextScopeContext,
    FloatingNodeElement
  >;

  readonly #rootConsumer = new ContextConsumer(this, {
    context: floatingRootContext,
    subscribe: true,
    callback: (root) => {
      this.#root = root;
      this.#scopeProvider.setValue(root.controller.contextScope);
      this.#syncNode();
    },
  });
  readonly #treeConsumer = new ContextConsumer(this, {
    context: floatingTreeContext,
    subscribe: true,
    callback: (tree) => {
      this.#inheritedTree = tree;
      this.#syncNode();
    },
  });
  readonly #parentConsumer = new ContextConsumer(this, {
    context: floatingParentNodeContext,
    subscribe: true,
    callback: (parentId) => {
      this.#inheritedParentId = parentId;
      this.#syncNode();
    },
  });
  readonly #scopeConsumer = new ContextConsumer(this, {
    context: floatingContextScopeContext,
    subscribe: true,
    callback: (scope) => {
      this.#parentScope = scope;
      this.#syncNode();
    },
  });

  constructor() {
    super();
    this.nodeId = `floating-node-${++nodeId}`;
    this.parentId = null;
    this.tree = undefined;
    this.#nodeProvider = new ContextProvider(this, {
      context: floatingParentNodeContext,
      initialValue: this.nodeId,
    });
    this.#scopeProvider = new ContextProvider(this, {
      context: floatingContextScopeContext,
    });
  }

  disconnectedCallback() {
    this.#root?.controller.node(null).setContextParent(null);
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('nodeId')) this.#nodeProvider.setValue(this.nodeId);
    this.#syncNode();
  }

  protected render() {
    return html`<slot></slot>`;
  }

  #syncNode() {
    const controller = this.#root?.controller;
    if (!controller || !this.isConnected) return;
    controller.setContextParent(this.#parentScope ?? null).node({
      ...(this.tree ?? this.#inheritedTree
        ? {tree: this.tree ?? this.#inheritedTree}
        : {}),
      id: this.nodeId,
      parentId: this.parentId ?? this.#inheritedParentId,
    });
  }
}

/** Provides a shared ordered list to a descendant root and list items. */
export class FloatingListElement extends LitElement {
  static properties = {
    list: {attribute: false},
  };

  static styles = contentsStyles;

  declare list: FloatingList<unknown>;
  #root?: FloatingRootElement;
  readonly #provider: ContextProvider<
    typeof floatingListContext,
    FloatingListElement
  >;
  readonly #rootConsumer = new ContextConsumer(this, {
    context: floatingRootContext,
    subscribe: true,
    callback: (root) => {
      this.#root = root;
      root.controller.withList(this.list);
    },
  });

  constructor() {
    super();
    this.list = new FloatingList();
    this.#provider = new ContextProvider(this, {
      context: floatingListContext,
      initialValue: this.list,
    });
  }

  protected updated(changed: PropertyValues<this>) {
    if (!changed.has('list')) return;
    this.#provider.setValue(this.list);
    this.#root?.controller.withList(this.list);
  }

  protected render() {
    return html`<slot></slot>`;
  }
}

/** Registers its first child with the nearest FloatingList. */
export class FloatingListItemElement extends LitElement {
  static properties = {
    itemId: {type: String, attribute: 'item-id'},
    label: {type: String},
    value: {attribute: false},
    list: {attribute: false},
  };

  static styles = contentsStyles;

  declare itemId: string;
  declare label: string | null;
  declare value: unknown;
  declare list: FloatingList<unknown> | undefined;

  #inheritedList?: FloatingList<unknown>;
  #element: HTMLElement | null = null;
  #unregister: (() => void) | undefined;
  readonly #listConsumer = new ContextConsumer(this, {
    context: floatingListContext,
    subscribe: true,
    callback: (list) => {
      this.#inheritedList = list;
      this.#register();
    },
  });

  constructor() {
    super();
    this.itemId = '';
    this.label = null;
    this.value = undefined;
    this.list = undefined;
  }

  disconnectedCallback() {
    this.#unregister?.();
    this.#unregister = undefined;
    super.disconnectedCallback();
  }

  protected firstUpdated() {
    this.#syncElement();
  }

  protected updated() {
    this.#register();
  }

  protected render() {
    return html`<slot @slotchange=${this.#syncElement}></slot>`;
  }

  #syncElement = () => {
    const element =
      this.renderRoot
        .querySelector('slot')
        ?.assignedElements({flatten: true})[0] ?? null;
    this.#element = element instanceof HTMLElement ? element : null;
    this.#register();
  };

  #register() {
    const list = this.list ?? this.#inheritedList;
    if (!list || !this.#element || !this.isConnected) return;
    this.#unregister?.();
    this.#unregister = list.register({
      ...(this.itemId ? {id: this.itemId} : {}),
      element: this.#element,
      label: this.label ?? this.#element.textContent,
      value: this.value ?? this.#element,
    });
  }
}

abstract class FloatingDelayGroupElementBase extends LitElement {
  static properties = {
    delay: {type: Number},
    timeoutMs: {type: Number, attribute: 'timeout-ms'},
    group: {attribute: false},
  };

  static styles = contentsStyles;

  declare delay: number;
  declare timeoutMs: number;
  declare group: DelayGroup;

  protected abstract createGroup(): DelayGroup;

  #root?: FloatingRootElement;
  #ownsGroup = true;
  #provider?: ContextProvider<
    typeof floatingDelayGroupContext,
    FloatingDelayGroupElementBase
  >;
  readonly #rootConsumer = new ContextConsumer(this, {
    context: floatingRootContext,
    subscribe: true,
    callback: (root) => {
      this.#root = root;
      root.controller.delayGroup({group: this.group});
    },
  });

  constructor() {
    super();
    this.delay = 0;
    this.timeoutMs = 0;
    this.group = undefined as unknown as DelayGroup;
  }

  connectedCallback() {
    if (!this.group) {
      this.group = this.createGroup();
      this.#ownsGroup = true;
    }
    if (!this.#provider) {
      this.#provider = new ContextProvider(this, {
        context: floatingDelayGroupContext,
        initialValue: this.group,
      });
    }
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.#root?.controller.delayGroup(null);
    if (this.#ownsGroup) this.group.destroy();
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('delay') || changed.has('timeoutMs')) {
      this.group.options = {delay: this.delay, timeoutMs: this.timeoutMs};
    }
    if (changed.has('group')) {
      this.#provider?.setValue(this.group);
      this.#root?.controller.delayGroup({group: this.group});
    }
  }

  protected render() {
    return html`<slot></slot>`;
  }
}

export class FloatingDelayGroupElement extends FloatingDelayGroupElementBase {
  protected createGroup() {
    return new DelayGroup({delay: this.delay, timeoutMs: this.timeoutMs});
  }
}

export class NextFloatingDelayGroupElement extends FloatingDelayGroupElementBase {
  protected createGroup() {
    return new NextDelayGroup({delay: this.delay, timeoutMs: this.timeoutMs});
  }
}

/** Keyboard navigation owner for a group of composite items. */
export class FloatingCompositeElement extends LitElement {
  static properties = {
    orientation: {type: String},
    loop: {type: Boolean, reflect: true},
    cols: {type: Number},
    rtl: {type: Boolean, reflect: true},
  };

  static styles = contentsStyles;

  declare orientation: CompositeOptions['orientation'];
  declare loop: boolean;
  declare cols: number;
  declare rtl: boolean;

  controller: CompositeController;
  readonly #elements = new Set<HTMLElement>();
  readonly #context: FloatingCompositeContext;
  readonly #provider: ContextProvider<
    typeof floatingCompositeContext,
    FloatingCompositeElement
  >;

  constructor() {
    super();
    this.orientation = 'both';
    this.loop = false;
    this.cols = 1;
    this.rtl = false;
    this.controller = this.#createController();
    this.#context = {
      controller: this.controller,
      elements: this.#elements,
      sync: () => this.controller.setItems(this.#elements),
    };
    this.#provider = new ContextProvider(this, {
      context: floatingCompositeContext,
      initialValue: this.#context,
    });
    this.addEventListener('keydown', (event) => {
      this.controller.keydown(event);
    });
  }

  protected updated(changed: PropertyValues<this>) {
    if (
      changed.has('orientation') ||
      changed.has('loop') ||
      changed.has('cols') ||
      changed.has('rtl')
    ) {
      this.controller = this.#createController();
      this.#context.controller = this.controller;
      this.#context.sync();
      this.#provider.setValue(this.#context, true);
    }
  }

  protected render() {
    return html`<slot></slot>`;
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

/** Registers its first child with the nearest composite owner. */
export class FloatingCompositeItemElement extends LitElement {
  static styles = contentsStyles;

  #composite?: FloatingCompositeContext;
  #element: HTMLElement | null = null;
  readonly #consumer = new ContextConsumer(this, {
    context: floatingCompositeContext,
    subscribe: true,
    callback: (composite) => {
      this.#remove();
      this.#composite = composite;
      this.#add();
    },
  });

  disconnectedCallback() {
    this.#remove();
    super.disconnectedCallback();
  }

  protected firstUpdated() {
    this.#syncElement();
  }

  protected render() {
    return html`<slot @slotchange=${this.#syncElement}></slot>`;
  }

  #syncElement = () => {
    this.#remove();
    const element =
      this.renderRoot
        .querySelector('slot')
        ?.assignedElements({flatten: true})[0] ?? null;
    this.#element = element instanceof HTMLElement ? element : null;
    this.#add();
  };

  #add() {
    if (!this.#composite || !this.#element) return;
    this.#composite.elements.add(this.#element);
    this.#composite.sync();
  }

  #remove() {
    if (!this.#composite || !this.#element) return;
    this.#composite.elements.delete(this.#element);
    this.#composite.sync();
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
}
