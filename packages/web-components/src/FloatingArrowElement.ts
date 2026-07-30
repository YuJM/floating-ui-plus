import {ContextConsumer} from '@lit/context';
import {css, html, LitElement} from 'lit';
import {getContextArrowStyles} from '@floating-ui-plus/web';

import {floatingRootContext} from './component-context';
import type {FloatingRootElement} from './FloatingRootElement';

export class FloatingArrowElement extends LitElement {
  static properties = {
    width: {type: Number},
    height: {type: Number},
    staticOffset: {attribute: 'static-offset'},
  };

  static styles = css`
    :host {
      display: block;
      position: absolute;
      pointer-events: none;
    }

    svg {
      display: block;
      overflow: visible;
    }
  `;

  declare width: number;
  declare height: number;
  declare staticOffset: string | number | null;

  #root: FloatingRootElement | undefined;
  #unsubscribe: (() => void) | undefined;
  readonly #rootConsumer = new ContextConsumer(this, {
    context: floatingRootContext,
    subscribe: true,
    callback: (root) => {
      this.#root = root;
      this.#subscribe();
      this.#syncPosition();
    },
  });

  constructor() {
    super();
    this.width = 14;
    this.height = 7;
    this.staticOffset = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('aria-hidden', 'true');
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    super.disconnectedCallback();
  }

  protected firstUpdated() {
    this.#syncPosition();
  }

  protected updated() {
    this.#syncPosition();
  }

  protected render() {
    return html`
      <svg
        width=${this.width}
        height=${this.height}
        viewBox="0 0 ${this.width} ${this.height}"
        part="svg"
      >
        <slot>
          <path
            part="path"
            d="M0 ${this.height}L${this.width / 2} 0L${this.width} ${this
              .height}Z"
          ></path>
        </slot>
      </svg>
    `;
  }

  #subscribe() {
    this.#unsubscribe?.();
    this.#unsubscribe = this.#root?.controller.context.events.on(
      'positionchange',
      () => this.#syncPosition(),
    );
  }

  #syncPosition() {
    const context = this.#root?.controller.context;
    if (!context) return;
    Object.assign(
      this.style,
      getContextArrowStyles(context, {
        element: this,
        staticOffset: this.staticOffset ?? -(this.width / 2),
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-arrow': FloatingArrowElement;
  }
}
