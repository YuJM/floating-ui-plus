import {
  applyFloatingStyles,
  autoUpdate,
  click,
  createFloating,
  dismiss,
  focus,
  getContextArrowStyles,
  hover,
  requestFloatingContextScope,
  role,
  type FloatingController,
  type FloatingPlugin,
  type OpenChangeReason,
  type ReferenceElement,
} from '@floating-ui-plus/web';
import {setAttributes} from '@floating-ui-plus/web/utils';

import type {FloatingRootElement} from './FloatingRootElement';

const runtimes = new WeakMap<FloatingRootElement, FloatingRootRuntime>();

export function getFloatingRootRuntime(host: FloatingRootElement) {
  let runtime = runtimes.get(host);
  if (!runtime) {
    runtime = new FloatingRootRuntime(host);
    runtimes.set(host, runtime);
  }
  return runtime;
}

export class FloatingRootRuntime {
  readonly engine: FloatingController;

  readonly #host: FloatingRootElement;
  #reference: Element | null = null;
  #floatingElement: HTMLElement | null = null;
  #referenceAttributes = new Set<string>();
  #floatingAttributes = new Set<string>();
  #contextAttachmentCleanup: (() => void) | null = null;
  #unsubscribePosition: (() => void) | null = null;
  #pluginsInstalled = false;
  #connected = false;

  constructor(host: FloatingRootElement) {
    this.#host = host;
    this.engine = createFloating(() => ({
      open: host.open,
      placement: host.placement,
      strategy: host.strategy,
      transform: host.transform,
      middleware: host.middleware,
      whileElementsMounted: autoUpdate,
      onOpenChange: (open, event, reason) => {
        host.commitOpenChange(open, event, reason);
      },
    }));
  }

  get referenceElement() {
    return this.#reference;
  }

  get floatingElement() {
    return this.#floatingElement;
  }

  pipe(...plugins: FloatingPlugin[]) {
    this.engine.pipe(...plugins);
  }

  connect() {
    if (this.#connected) return;
    this.#connected = true;
    this.#installPlugins();
    this.engine.setContextParent(
      requestFloatingContextScope(this.#host) ?? null,
    );
    this.#contextAttachmentCleanup =
      this.engine.contextScope.attach(this.#host);
    this.engine.connect();
    this.#unsubscribePosition = this.engine.context.events.on(
      'positionchange',
      () => {
        this.syncBindings();
        void this.#host.update();
      },
    );
    this.sync();
  }

  disconnect() {
    if (!this.#connected) return;
    this.#connected = false;
    this.#unsubscribePosition?.();
    this.#unsubscribePosition = null;
    this.engine.disconnect();
    this.#contextAttachmentCleanup?.();
    this.#contextAttachmentCleanup = null;
    this.engine.setContextParent(null);
  }

  syncSlots(
    referenceSlot: HTMLSlotElement | undefined,
    floatingSlot: HTMLSlotElement | undefined,
  ) {
    const nextReference =
      referenceSlot?.assignedElements({flatten: true})[0] ?? null;
    const nextFloating =
      floatingSlot?.assignedElements({flatten: true})[0] ?? null;

    if (
      nextReference ||
      this.#reference?.getAttribute('slot') === 'reference'
    ) {
      this.setReferenceElement(nextReference);
    }

    if (
      nextFloating ||
      this.#floatingElement?.getAttribute('slot') === 'floating'
    ) {
      this.setFloatingElement(
        nextFloating instanceof HTMLElement ? nextFloating : null,
      );
    }
    this.syncBindings();
  }

  sync() {
    this.engine.refresh();
    this.syncBindings();
  }

  async updatePosition() {
    await this.engine.update();
    this.syncBindings();
    await this.#host.update();
  }

  setPositionReference(reference: ReferenceElement | null) {
    this.engine.setPositionReference(reference);
  }

  setReferenceElement(reference: Element | null) {
    if (reference === this.#reference) return;
    if (this.#reference) {
      this.#referenceAttributes = setAttributes(
        this.#reference,
        {},
        this.#referenceAttributes,
      );
    }
    this.#reference = reference;
    this.engine.setReference(reference);
    this.syncBindings();
  }

  setFloatingElement(floating: HTMLElement | null) {
    if (floating === this.#floatingElement) return;
    if (this.#floatingElement) {
      this.#floatingAttributes = setAttributes(
        this.#floatingElement,
        {},
        this.#floatingAttributes,
      );
    }
    this.#floatingElement = floating;
    this.engine.setFloating(floating);
    this.engine.presence.set(floating ? 'mounted' : 'unmounted');
    this.syncBindings();
  }

  syncBindings() {
    const context = this.engine.context;
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
    this.#floatingElement.hidden = !this.#host.open;
    this.#floatingElement.dataset.status = this.#host.open ? 'open' : 'closed';
    this.#floatingElement.dataset.placement = this.engine.position.placement;
    applyFloatingStyles(this.#floatingElement, this.engine.floatingStyles);

    const arrowElement =
      this.#floatingElement.querySelector<HTMLElement>('floating-arrow');
    if (!arrowElement) return;
    const arrowOptions = arrowElement as HTMLElement & {
      height?: number;
      staticOffset?: string | number | null;
      rotation?: 'auto' | 'none';
    };
    Object.assign(
      arrowElement.style,
      getContextArrowStyles(context, {
        element: arrowElement,
        staticOffset:
          arrowOptions.staticOffset ??
          -(arrowOptions.height ?? arrowElement.offsetHeight),
        rotate: arrowOptions.rotation !== 'none',
      }),
    );
  }

  #installPlugins() {
    if (this.#pluginsInstalled) return;
    this.#pluginsInstalled = true;
    const names = new Set(
      this.#host.interactions.split(/[\s,]+/).filter(Boolean),
    );
    const plugins = [...this.#host.plugins];
    if (names.has('click')) plugins.push(click());
    if (names.has('hover')) plugins.push(hover());
    if (names.has('focus')) plugins.push(focus());
    if (names.has('dismiss')) plugins.push(dismiss());
    if (this.#host.floatingRole) {
      plugins.push(role({role: this.#host.floatingRole}));
    }
    this.engine.pipe(...plugins);
  }
}

export type CommitOpenChange = (
  open: boolean,
  event?: Event,
  reason?: OpenChangeReason,
) => void;
