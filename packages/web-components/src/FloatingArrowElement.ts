import {ContextConsumer} from '@lit/context';
import {css, html, LitElement} from 'lit';
import {
  FLOATING_UI_PLUS_ARROW_ATTRIBUTE,
  FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
  getContextArrowStyles,
  registerFloatingArrow,
} from '@floating-ui-plus/web';

import {floatingRootContext} from './component-context';
import type {FloatingRootElement} from './FloatingRootElement';

export class FloatingArrowElement extends LitElement {
  static properties = {
    width: {type: Number},
    height: {type: Number},
    staticOffset: {attribute: 'static-offset'},
    rotation: {type: String},
  };

  static styles = css`
    :host {
      display: block;
      position: absolute;
      pointer-events: none;
    }

    svg,
    ::slotted(svg) {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
  `;

  declare width: number;
  declare height: number;
  declare staticOffset: string | number | null;
  declare rotation: 'auto' | 'none';

  #root: FloatingRootElement | undefined;
  #unregisterArrow: (() => void) | undefined;
  #unsubscribe: (() => void) | undefined;
  readonly #rootConsumer = new ContextConsumer(this, {
    context: floatingRootContext,
    subscribe: true,
    callback: (root) => {
      this.#root = root;
      this.#registerArrow();
      this.#subscribe();
      this.#syncPosition();
    },
  });

  constructor() {
    super();
    this.width = 14;
    this.height = 7;
    this.staticOffset = null;
    this.rotation = 'auto';
    this.setAttribute(FLOATING_UI_PLUS_ARROW_ATTRIBUTE, '');
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('aria-hidden', 'true');
  }

  disconnectedCallback() {
    this.#unregisterArrow?.();
    this.#unregisterArrow = undefined;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    super.disconnectedCallback();
  }

  protected firstUpdated() {
    this.#syncPosition();
  }

  protected updated() {
    this.setAttribute(
      FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
      String(this.height),
    );
    this.#registerArrow();
    this.#syncPosition();
  }

  protected render() {
    return html`
      <slot>
        <svg
          width=${this.width}
          height=${this.height}
          viewBox="0 0 ${this.width} ${this.height}"
          part="svg"
        >
          <path
            part="path"
            d="M0 ${this.height}L${this.width / 2} 0L${this.width} ${this
              .height}Z"
          ></path>
        </svg>
      </slot>
    `;
  }

  #subscribe() {
    this.#unsubscribe?.();
    this.#unsubscribe = this.#root?.controller.context.events.on(
      'positionchange',
      () => this.#syncPosition(),
    );
  }

  #registerArrow() {
    this.#unregisterArrow?.();
    this.#unregisterArrow = undefined;
    if (!this.#root) return;
    this.#unregisterArrow = registerFloatingArrow(
      this.#root.controller.context,
      {
        element: this,
        height: this.height,
      },
    );
  }

  #syncPosition() {
    const context = this.#root?.controller.context;
    if (!context) return;
    Object.assign(
      this.style,
      getContextArrowStyles(context, {
        element: this,
        staticOffset: this.staticOffset ?? -this.height,
        rotate: this.rotation !== 'none',
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-arrow': FloatingArrowElement;
  }
}
