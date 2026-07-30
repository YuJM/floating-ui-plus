import {ContextConsumer} from '@lit/context';
import {css, html, LitElement, type PropertyValues} from 'lit';
import type {ItemState} from '@floating-ui-plus/web';
import {setAttributes} from '@floating-ui-plus/web/utils';

import {floatingRootContext} from './component-context';
import type {FloatingRootElement} from './FloatingRootElement';

const contentsStyles = css`
  :host,
  slot {
    display: contents;
  }
`;

abstract class FloatingRootPartElement extends LitElement {
  static styles = contentsStyles;

  protected floatingRoot?: FloatingRootElement;
  protected boundElement: Element | null = null;

  readonly #rootConsumer = new ContextConsumer(this, {
    context: floatingRootContext,
    subscribe: true,
    callback: (value) => {
      this.floatingRoot = value;
      this.syncElement();
    },
  });

  protected firstUpdated() {
    this.syncElement();
  }

  protected render() {
    return html`<slot @slotchange=${this.syncElement}></slot>`;
  }

  protected assignedElement() {
    return (
      this.renderRoot
        .querySelector('slot')
        ?.assignedElements({flatten: true})[0] ?? null
    );
  }

  protected abstract bind(
    root: FloatingRootElement,
    element: Element | null,
  ): void;

  protected syncElement = () => {
    const next = this.assignedElement();
    if (next === this.boundElement && this.floatingRoot) return;
    this.boundElement = next;
    if (this.floatingRoot) this.bind(this.floatingRoot, next);
  };
}

/** Binds its first child to the nearest floating root reference. */
export class FloatingReferenceElement extends FloatingRootPartElement {
  protected bind(root: FloatingRootElement, element: Element | null) {
    root.setReferenceElement(element);
  }

  disconnectedCallback() {
    if (this.floatingRoot?.referenceElement === this.boundElement) {
      this.floatingRoot.setReferenceElement(null);
    }
    this.boundElement = null;
    super.disconnectedCallback();
  }
}

/** Binds its first child to the nearest floating root surface. */
export class FloatingContentElement extends FloatingRootPartElement {
  protected bind(root: FloatingRootElement, element: Element | null) {
    root.setFloatingElement(element instanceof HTMLElement ? element : null);
  }

  disconnectedCallback() {
    if (this.floatingRoot?.floatingElement === this.boundElement) {
      this.floatingRoot.setFloatingElement(null);
    }
    this.boundElement = null;
    super.disconnectedCallback();
  }
}

/** Applies item interaction attributes to its first child. */
export class FloatingItemElement extends FloatingRootPartElement {
  static properties = {
    active: {type: Boolean, reflect: true},
    selected: {type: Boolean, reflect: true},
    index: {type: Number},
    label: {type: String},
    value: {attribute: false},
  };

  declare active: boolean;
  declare selected: boolean;
  declare index: number | undefined;
  declare label: string | null;
  declare value: unknown;

  #attributes = new Set<string>();

  constructor() {
    super();
    this.active = false;
    this.selected = false;
    this.index = undefined;
    this.label = null;
    this.value = undefined;
  }

  protected bind(root: FloatingRootElement, element: Element | null) {
    if (this.boundElement && this.boundElement !== element) {
      this.#attributes = setAttributes(
        this.boundElement,
        {},
        this.#attributes,
      );
    }
    if (!element) return;
    const itemAttributes = root.controller.context.attributes.item;
    const state: ItemState = {
      active: this.active,
      selected: this.selected,
      ...(this.index == null ? {} : {index: this.index}),
    };
    this.#attributes = setAttributes(
      element,
      typeof itemAttributes === 'function'
        ? itemAttributes(state)
        : itemAttributes ?? {},
      this.#attributes,
    );
  }

  protected updated(_changed: PropertyValues<this>) {
    this.syncElement();
    if (this.floatingRoot) {
      this.bind(this.floatingRoot, this.boundElement);
    }
  }

  disconnectedCallback() {
    if (this.boundElement) {
      this.#attributes = setAttributes(
        this.boundElement,
        {},
        this.#attributes,
      );
    }
    super.disconnectedCallback();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-reference': FloatingReferenceElement;
    'floating-content': FloatingContentElement;
    'floating-item': FloatingItemElement;
  }
}
