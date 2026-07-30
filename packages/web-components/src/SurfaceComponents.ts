import {
  ContextConsumer,
  ContextProvider,
} from '@lit/context';
import {css, html, LitElement, type PropertyValues} from 'lit';
import {
  FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE,
  FLOATING_UI_PLUS_PORTAL_ATTRIBUTE,
  focusManager,
  lockScroll,
  type FloatingPlugin,
} from '@floating-ui-plus/web';

import {
  floatingContextScopeContext,
  floatingParentNodeContext,
  floatingRootContext,
  floatingTreeContext,
} from './component-context';
import type {FloatingRootElement} from './FloatingRootElement';

const contentsStyles = css`
  :host,
  slot {
    display: contents;
  }
`;

/** Moves itself to a DOM target while re-providing the nearest root context. */
export class FloatingPortalElement extends LitElement {
  static properties = {
    to: {type: String},
    disabled: {type: Boolean, reflect: true},
  };

  static styles = contentsStyles;

  declare to: string;
  declare disabled: boolean;

  target: Element | null = null;
  #marker: Comment | undefined;
  #moving = false;
  #root: FloatingRootElement | undefined;
  readonly #rootProvider = new ContextProvider(this, {
    context: floatingRootContext,
  });
  readonly #treeProvider = new ContextProvider(this, {
    context: floatingTreeContext,
  });
  readonly #parentNodeProvider = new ContextProvider(this, {
    context: floatingParentNodeContext,
  });
  readonly #scopeProvider = new ContextProvider(this, {
    context: floatingContextScopeContext,
  });
  readonly #rootConsumer = new ContextConsumer(this, {
    context: floatingRootContext,
    subscribe: true,
    callback: (root) => {
      this.#root = root;
      this.#rootProvider.setValue(root);
      this.#scopeProvider.setValue(root.controller.contextScope);
      const syncParentNode = () => {
        this.#parentNodeProvider.setValue(
          (root.controller.context.data.nodeId as string | undefined) ?? null,
        );
      };
      syncParentNode();
      queueMicrotask(syncParentNode);
    },
  });
  readonly #treeConsumer = new ContextConsumer(this, {
    context: floatingTreeContext,
    subscribe: true,
    callback: (tree) => {
      this.#treeProvider.setValue(tree);
    },
  });
  constructor() {
    super();
    this.to = 'body';
    this.disabled = false;
    this.setAttribute(FLOATING_UI_PLUS_PORTAL_ATTRIBUTE, '');
  }

  protected firstUpdated() {
    this.#syncTarget();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('to') || changed.has('disabled')) this.#syncTarget();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.#moving) return;
    queueMicrotask(() => {
      if (!this.isConnected && this.#marker?.parentNode) {
        this.#marker.parentNode.insertBefore(this, this.#marker.nextSibling);
        this.#marker.remove();
        this.#marker = undefined;
      }
    });
  }

  protected render() {
    return html`<slot></slot>`;
  }

  #syncTarget() {
    if (this.disabled) {
      this.#restore();
      return;
    }
    const target =
      this.target ??
      (this.to ? this.ownerDocument.querySelector(this.to) : null) ??
      this.ownerDocument.body;
    if (!target || this.parentElement === target) return;
    if (!this.#marker) {
      this.#marker = this.ownerDocument.createComment('floating-portal');
      this.parentNode?.insertBefore(this.#marker, this);
    }
    this.#moving = true;
    target.append(this);
    this.#moving = false;
  }

  #restore() {
    if (!this.#marker?.parentNode) return;
    this.#moving = true;
    this.#marker.parentNode.insertBefore(this, this.#marker.nextSibling);
    this.#marker.remove();
    this.#marker = undefined;
    this.#moving = false;
  }
}

/** Fixed overlay surface with optional document scroll locking. */
export class FloatingOverlayElement extends LitElement {
  static properties = {
    lockScroll: {type: Boolean, attribute: 'lock-scroll', reflect: true},
  };

  static styles = css`
    :host {
      display: block;
      position: fixed;
      inset: 0;
    }

    :host([hidden]) {
      display: none;
    }
  `;

  declare lockScroll: boolean;
  #unlock: (() => void) | undefined;
  #rootUnsubscribe: (() => void) | undefined;
  readonly #rootConsumer = new ContextConsumer(this, {
    context: floatingRootContext,
    subscribe: true,
    callback: (root) => {
      this.#rootUnsubscribe?.();
      this.hidden = !root.open;
      this.#syncLock();
      this.#rootUnsubscribe = root.controller.context.events.on(
        'openchange',
        ({open}) => {
          this.hidden = !open;
          this.#syncLock();
        },
      );
    },
  });

  constructor() {
    super();
    this.lockScroll = false;
    this.setAttribute(FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE, '');
  }

  connectedCallback() {
    super.connectedCallback();
    this.#syncLock();
  }

  disconnectedCallback() {
    this.#unlock?.();
    this.#unlock = undefined;
    this.#rootUnsubscribe?.();
    this.#rootUnsubscribe = undefined;
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('lockScroll')) this.#syncLock();
  }

  protected render() {
    return html`<slot></slot>`;
  }

  #syncLock() {
    this.#unlock?.();
    this.#unlock = undefined;
    if (this.lockScroll && this.isConnected && !this.hidden) {
      this.#unlock = lockScroll(this.ownerDocument);
    }
  }
}

/** Connects the Web focus-manager plugin to the nearest floating root. */
export class FloatingFocusManagerElement extends LitElement {
  static properties = {
    enabled: {type: Boolean, reflect: true},
    modal: {type: Boolean, reflect: true},
    initialFocus: {type: Number, attribute: 'initial-focus'},
    returnFocus: {type: Boolean, attribute: 'return-focus'},
    outsideElementsInert: {
      type: Boolean,
      attribute: 'outside-elements-inert',
    },
  };

  static styles = contentsStyles;

  declare enabled: boolean;
  declare modal: boolean;
  declare initialFocus: number;
  declare returnFocus: boolean;
  declare outsideElementsInert: boolean;

  #root: FloatingRootElement | undefined;
  #plugin: FloatingPlugin | undefined;
  #cleanup: (() => void) | undefined;
  readonly #rootConsumer = new ContextConsumer(this, {
    context: floatingRootContext,
    subscribe: true,
    callback: (root) => {
      if (root === this.#root) return;
      this.#disconnectPlugin();
      this.#root = root;
      this.#connectPlugin();
    },
  });

  constructor() {
    super();
    this.enabled = true;
    this.modal = true;
    this.initialFocus = 0;
    this.returnFocus = true;
    this.outsideElementsInert = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#connectPlugin();
  }

  disconnectedCallback() {
    this.#disconnectPlugin();
    super.disconnectedCallback();
  }

  protected updated() {
    if (this.#root && this.#plugin) {
      this.#plugin.update?.(this.#root.controller.context);
    }
  }

  protected render() {
    return html`<slot></slot>`;
  }

  #connectPlugin() {
    if (!this.isConnected || !this.#root || this.#plugin) return;
    this.#plugin = focusManager(() => ({
      enabled: this.enabled,
      modal: this.modal,
      initialFocus: this.initialFocus,
      returnFocus: this.returnFocus,
      outsideElementsInert: this.outsideElementsInert,
    }));
    this.#cleanup =
      this.#plugin.connect(this.#root.controller.context) || undefined;
  }

  #disconnectPlugin() {
    this.#cleanup?.();
    this.#cleanup = undefined;
    this.#plugin = undefined;
  }
}

/** Reflects root open/close state as a small CSS transition state machine. */
export class FloatingTransitionElement extends LitElement {
  static styles = contentsStyles;

  #unsubscribe: (() => void) | undefined;
  readonly #rootConsumer = new ContextConsumer(this, {
    context: floatingRootContext,
    subscribe: true,
    callback: (root) => {
      this.#unsubscribe?.();
      this.dataset.status = root.open ? 'open' : 'closed';
      this.#unsubscribe = root.controller.context.events.on(
        'openchange',
        ({open}) => {
          this.dataset.status = open ? 'open' : 'close';
        },
      );
    },
  });

  disconnectedCallback() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    super.disconnectedCallback();
  }

  protected render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-portal': FloatingPortalElement;
    'floating-overlay': FloatingOverlayElement;
    'floating-focus-manager': FloatingFocusManagerElement;
    'floating-transition': FloatingTransitionElement;
  }
}
