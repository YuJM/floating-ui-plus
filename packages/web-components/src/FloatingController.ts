import type {ReactiveController, ReactiveControllerHost} from 'lit';
import type {DirectiveResult} from 'lit/directive.js';
import {
  createFloating,
  focusManager,
  requestFloatingContextScope,
  type ArrowOptions,
  type FloatingDelayGroupOptions as WebFloatingDelayGroupOptions,
  type FloatingController as WebFloatingController,
  type FocusManagerOptions,
  type FloatingList,
  type FloatingNodeOptions as WebFloatingNodeOptions,
  type FloatingOptionsSource,
  type FloatingPlugin,
  type ItemState,
  type PortalNodeOptions,
  type TransitionStyles,
} from '@floating-ui-plus/web';

import {bindFloatingElement, renderFloatingPortal} from './directives';
import {floatingOverlay, type FloatingOverlayOptions} from './overlay';
import {
  floatingTransition,
  type FloatingTransitionRenderer,
} from './transition';

export interface LightDomControllerHost extends ReactiveControllerHost {
  readonly renderRoot?: HTMLElement | DocumentFragment;
}

interface FloatingControllerAdapterOptions {
  allowShadowRoot?: boolean;
}

export interface FloatingItemState extends ItemState {
  label?: string | undefined;
  value?: unknown;
}

export type FloatingNodeOptions = WebFloatingNodeOptions;
export type FloatingDelayGroupOptions = WebFloatingDelayGroupOptions;

export interface FloatingModalOptions {
  focus?: FocusManagerOptions | undefined;
  overlay?: FloatingOverlayOptions | undefined;
  portal?:
    | (PortalNodeOptions & {topLayer?: 'popover' | undefined})
    | undefined;
}

const EMPTY_TRANSITION_OPTIONS: TransitionStyles = {};

export class FloatingController implements ReactiveController {
  readonly #host: LightDomControllerHost;
  readonly #floating: WebFloatingController;
  #unsubscribePosition: (() => void) | null = null;
  #positionKey = '';
  #connected = false;
  #destroyed = false;
  #contextAttachmentCleanup: (() => void) | null = null;
  #modalOptions: FloatingModalOptions = {};
  #modalPluginInstalled = false;
  readonly #adapterOptions: FloatingControllerAdapterOptions;
  readonly #placement = () => this.position.placement;
  readonly listElements: {
    readonly current: Array<HTMLElement | null>;
  };
  readonly listLabels: {
    readonly current: Array<string | null>;
  };
  readonly listValues: {
    readonly current: unknown[];
  };

  constructor(
    host: LightDomControllerHost,
    options: FloatingOptionsSource,
    adapterOptions: FloatingControllerAdapterOptions = {},
  ) {
    this.#host = host;
    this.#adapterOptions = adapterOptions;
    this.#floating = createFloating(options);
    const controller = this;
    this.listElements = {
      get current() {
        return controller.list.items.map((item) => item.element);
      },
    };
    this.listLabels = {
      get current() {
        return controller.list.items.map((item) => item.label);
      },
    };
    this.listValues = {
      get current() {
        return controller.list.items.map((item) => item.value);
      },
    };
    host.addController(this);
  }

  get context() {
    return this.#floating.context;
  }

  get elements() {
    return this.#floating.elements;
  }

  get position() {
    return this.#floating.position;
  }

  get floatingStyles() {
    return this.#floating.floatingStyles;
  }

  get list() {
    return this.#floating.list;
  }

  /** @internal Used by the package's component layer. */
  get engine() {
    return this.#floating;
  }

  pipe(...plugins: FloatingPlugin[]) {
    this.#floating.pipe(...plugins);
    return this;
  }

  /**
   * Registers this controller in a floating tree for the host lifecycle.
   * Without an explicit tree, the nearest Light DOM context is used and a root
   * tree is created when no provider exists.
   */
  node(options: FloatingNodeOptions = {}) {
    this.#floating.node(options);
    return this;
  }

  /**
   * Replaces the controller-owned list and provides it to Light DOM and
   * portaled descendants.
   */
  withList(list?: FloatingList<unknown>) {
    this.#floating.withList(list);
    return this;
  }

  /**
   * Coordinates this controller with a shared delay group for its lifecycle.
   */
  delayGroup(options: FloatingDelayGroupOptions = {}) {
    this.#floating.delayGroup(options);
    return this;
  }

  provideContext<T>(key: string, value: T | (() => T)) {
    this.#floating.contextScope.provide(key, value);
    return this;
  }

  consumeContext<T>(key: string): T | undefined {
    return this.#floating.contextScope.consume<T>(key);
  }

  reference(): DirectiveResult {
    return bindFloatingElement({
      controller: this.#floating,
      kind: 'reference',
    });
  }

  floating(): DirectiveResult {
    return bindFloatingElement({
      controller: this.#floating,
      kind: 'floating',
    });
  }

  item(state: FloatingItemState = {}): DirectiveResult {
    return bindFloatingElement({
      controller: this.#floating,
      kind: 'item',
      state,
      list: this.#floating.list,
    });
  }

  arrow(options: Omit<ArrowOptions, 'element'> = {}): DirectiveResult {
    return bindFloatingElement({
      controller: this.#floating,
      kind: 'arrow',
      arrowOptions: options,
    });
  }

  portal(
    value: unknown,
    options?: PortalNodeOptions & {topLayer?: 'popover' | undefined},
  ): DirectiveResult {
    return renderFloatingPortal({
      controller: this.#floating,
      value,
      ...(options ? {options} : {}),
    });
  }

  transition(
    open: boolean,
    renderer: FloatingTransitionRenderer,
    options: TransitionStyles = EMPTY_TRANSITION_OPTIONS,
  ): DirectiveResult {
    return floatingTransition(
      open,
      this.#placement,
      renderer,
      options,
    );
  }

  /**
   * Lazily installs focus management and renders a scroll-locking portal
   * overlay. The plugin remains attached so close transitions can restore
   * focus through the normal controller refresh cycle.
   */
  modal(value: unknown, options: FloatingModalOptions = {}): DirectiveResult {
    this.#modalOptions = options;
    if (!this.#modalPluginInstalled) {
      this.#modalPluginInstalled = true;
      this.#floating.pipe(
        focusManager(() => this.#modalOptions.focus ?? {modal: true}),
      );
    }
    return this.portal(
      floatingOverlay(value, {
        lockScroll: true,
        ...options.overlay,
      }),
      options.portal,
    );
  }

  setPositionReference(
    reference: Parameters<WebFloatingController['setPositionReference']>[0],
  ) {
    this.#floating.setPositionReference(reference);
  }

  async update() {
    await this.#floating.update();
    this.#host.requestUpdate();
  }

  hostConnected() {
    if (this.#destroyed) return;
    this.#connected = true;
    const root = this.#host.renderRoot;
    if (
      __DEV__ &&
      !this.#adapterOptions.allowShadowRoot &&
      typeof ShadowRoot !== 'undefined' &&
      root instanceof ShadowRoot
    ) {
      console.warn(
        'The internal legacy Lit adapter supports Light DOM only. Override createRenderRoot() to return this.',
      );
    }
    if (isEventTarget(this.#host)) {
      this.#floating.setContextParent(
        requestFloatingContextScope(this.#host) ?? null,
      );
      this.#contextAttachmentCleanup =
        this.#floating.contextScope.attach(this.#host);
    }
    this.#floating.connect();
    this.#unsubscribePosition = this.#floating.context.events.on(
      'positionchange',
      (position) => {
        const key = [
          position.x,
          position.y,
          position.strategy,
          position.placement,
          position.isPositioned,
          JSON.stringify(position.middlewareData),
        ].join(':');
        if (key !== this.#positionKey) {
          this.#positionKey = key;
          this.#host.requestUpdate();
        }
      },
    );
  }

  hostUpdate() {
    this.#floating.refresh();
  }

  hostDisconnected() {
    this.#connected = false;
    this.#unsubscribePosition?.();
    this.#unsubscribePosition = null;
    this.#floating.disconnect();
    this.#contextAttachmentCleanup?.();
    this.#contextAttachmentCleanup = null;
    this.#floating.setContextParent(null);
  }

  destroy() {
    this.hostDisconnected();
    this.#destroyed = true;
    this.#floating.destroy();
  }
}

function isEventTarget(value: unknown): value is EventTarget {
  return (
    typeof EventTarget !== 'undefined' && value instanceof EventTarget
  );
}
