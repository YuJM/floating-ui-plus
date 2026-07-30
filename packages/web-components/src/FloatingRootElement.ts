import {ContextProvider} from '@lit/context';
import {css, html, LitElement, type PropertyValues} from 'lit';
import {
  applyFloatingStyles,
  autoUpdate,
  click,
  dismiss,
  focus,
  getContextArrowStyles,
  hover,
  role,
  type FloatingOptions,
  type FloatingPlugin,
  type FloatingRole,
  type OpenChangeReason,
  type ReferenceElement,
} from '@floating-ui-plus/web';
import {setAttributes} from '@floating-ui-plus/web/utils';

import {FloatingController} from './FloatingController';
import {floatingRootContext} from './component-context';

export interface FloatingOpenChangeDetail {
  open: boolean;
  reason?: OpenChangeReason | undefined;
  sourceEvent?: Event | undefined;
}

export class FloatingRootElement extends LitElement {
  static properties = {
    open: {type: Boolean, reflect: true},
    placement: {type: String},
    strategy: {type: String},
    transform: {type: Boolean},
    middleware: {attribute: false},
    plugins: {attribute: false},
    interactions: {type: String},
    floatingRole: {type: String, attribute: 'floating-role'},
  };

  static styles = css`
    :host,
    slot {
      display: contents;
    }
  `;

  declare open: boolean;
  declare placement: FloatingOptions['placement'];
  declare strategy: FloatingOptions['strategy'];
  declare transform: boolean;
  declare middleware: FloatingOptions['middleware'];
  declare plugins: FloatingPlugin[];
  declare interactions: string;
  declare floatingRole: FloatingRole | '';

  readonly #floating: FloatingController;
  readonly #contextProvider = new ContextProvider(this, {
    context: floatingRootContext,
    initialValue: this,
  });
  #reference: Element | null = null;
  #floatingElement: HTMLElement | null = null;
  #referenceAttributes = new Set<string>();
  #floatingAttributes = new Set<string>();
  #pluginsInstalled = false;

  constructor() {
    super();
    this.open = false;
    this.placement = 'bottom';
    this.strategy = 'absolute';
    this.transform = true;
    this.middleware = undefined;
    this.plugins = [];
    this.interactions = '';
    this.floatingRole = '';
    this.#floating = new FloatingController(
      this,
      () => ({
        open: this.open,
        placement: this.placement,
        strategy: this.strategy,
        transform: this.transform,
        middleware: this.middleware,
        whileElementsMounted: autoUpdate,
        onOpenChange: (open, event, reason) => {
          this.open = open;
          this.dispatchEvent(
            new CustomEvent<FloatingOpenChangeDetail>('openchange', {
              bubbles: true,
              composed: true,
              detail: {open, reason, sourceEvent: event},
            }),
          );
        },
      }),
      {allowShadowRoot: true},
    );
  }

  get controller() {
    return this.#floating.engine;
  }

  get referenceElement() {
    return this.#reference;
  }

  get floatingElement() {
    return this.#floatingElement;
  }

  use(...plugins: FloatingPlugin[]) {
    this.#floating.pipe(...plugins);
    return this;
  }

  setPositionReference(reference: ReferenceElement | null) {
    this.#floating.setPositionReference(reference);
  }

  updatePosition() {
    return this.#floating.update();
  }

  setReferenceElement(reference: Element | null) {
    this.#bindReference(reference);
  }

  setFloatingElement(floating: HTMLElement | null) {
    this.#bindFloating(floating);
  }

  protected firstUpdated() {
    this.#installPlugins();
    this.#syncSlots();
  }

  protected updated(_changed: PropertyValues<this>) {
    this.#syncBindings();
  }

  protected render() {
    return html`
      <slot
        name="reference"
        @slotchange=${this.#handleSlotChange}
      ></slot>
      <slot
        name="floating"
        @slotchange=${this.#handleSlotChange}
      ></slot>
      <slot @slotchange=${this.#handleSlotChange}></slot>
    `;
  }

  #handleSlotChange = () => {
    this.#syncSlots();
  };

  #installPlugins() {
    if (this.#pluginsInstalled) return;
    this.#pluginsInstalled = true;
    const names = new Set(this.interactions.split(/[\s,]+/).filter(Boolean));
    const plugins = [...this.plugins];
    if (names.has('click')) plugins.push(click());
    if (names.has('hover')) plugins.push(hover());
    if (names.has('focus')) plugins.push(focus());
    if (names.has('dismiss')) plugins.push(dismiss());
    if (this.floatingRole) plugins.push(role({role: this.floatingRole}));
    this.#floating.pipe(...plugins);
  }

  #syncSlots() {
    const referenceSlot =
      this.renderRoot.querySelector<HTMLSlotElement>('slot[name="reference"]');
    const floatingSlot =
      this.renderRoot.querySelector<HTMLSlotElement>('slot[name="floating"]');
    const nextReference =
      referenceSlot?.assignedElements({flatten: true})[0] ?? null;
    const nextFloating =
      floatingSlot?.assignedElements({flatten: true})[0] ?? null;

    if (
      nextReference ||
      this.#reference?.getAttribute('slot') === 'reference'
    ) {
      this.#bindReference(nextReference);
    }

    if (
      nextFloating ||
      this.#floatingElement?.getAttribute('slot') === 'floating'
    ) {
      this.#bindFloating(
        nextFloating instanceof HTMLElement ? nextFloating : null,
      );
    }
    this.#syncBindings();
  }

  #bindReference(reference: Element | null) {
    if (reference === this.#reference) return;
    if (this.#reference) {
      this.#referenceAttributes = setAttributes(
        this.#reference,
        {},
        this.#referenceAttributes,
      );
    }
    this.#reference = reference;
    this.#floating.engine.setReference(reference);
    this.#syncBindings();
  }

  #bindFloating(floating: HTMLElement | null) {
    if (floating === this.#floatingElement) return;
    if (this.#floatingElement) {
      this.#floatingAttributes = setAttributes(
        this.#floatingElement,
        {},
        this.#floatingAttributes,
      );
    }
    this.#floatingElement = floating;
    this.#floating.engine.setFloating(floating);
    this.#floating.engine.presence.set(floating ? 'mounted' : 'unmounted');
    this.#syncBindings();
  }

  #syncBindings() {
    const context = this.#floating.context;
    if (this.#reference) {
      this.#referenceAttributes = setAttributes(
        this.#reference,
        context.attributes.reference ?? {},
        this.#referenceAttributes,
      );
    }
    if (!this.#floatingElement) return;
    this.#floatingAttributes = setAttributes(
      this.#floatingElement,
      context.attributes.floating ?? {},
      this.#floatingAttributes,
    );
    this.#floatingElement.hidden = !this.open;
    this.#floatingElement.dataset.status = this.open ? 'open' : 'closed';
    this.#floatingElement.dataset.placement = this.#floating.position.placement;
    applyFloatingStyles(
      this.#floatingElement,
      this.#floating.floatingStyles,
    );
    const arrowElement =
      this.#floatingElement.querySelector<HTMLElement>('floating-arrow');
    if (arrowElement) {
      Object.assign(
        arrowElement.style,
        getContextArrowStyles(context, {element: arrowElement}),
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-root': FloatingRootElement;
  }
}
