import type {ReactiveController, ReactiveControllerHost} from 'lit';
import type {DirectiveResult} from 'lit/directive.js';
import {
  createFloating,
  FloatingList,
  type ArrowOptions,
  type FloatingController as WebFloatingController,
  type FloatingOptionsSource,
  type FloatingPlugin,
  type ItemState,
  type PortalNodeOptions,
} from '@floating-ui/web';

import {bindFloatingElement, renderFloatingPortal} from './directives';

export interface LightDomControllerHost extends ReactiveControllerHost {
  readonly renderRoot?: HTMLElement | DocumentFragment;
}

export interface FloatingItemState extends ItemState {
  label?: string | undefined;
  value?: unknown;
}

export class FloatingController implements ReactiveController {
  readonly #host: LightDomControllerHost;
  readonly #floating: WebFloatingController;
  #unsubscribePosition: (() => void) | null = null;
  #positionKey = '';
  readonly list = new FloatingList<unknown>();

  constructor(host: LightDomControllerHost, options: FloatingOptionsSource) {
    this.#host = host;
    this.#floating = createFloating(options);
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

  pipe(...plugins: FloatingPlugin[]) {
    this.#floating.pipe(...plugins);
    return this;
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
      list: this.list,
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
    const root = this.#host.renderRoot;
    if (
      __DEV__ &&
      typeof ShadowRoot !== 'undefined' &&
      root instanceof ShadowRoot
    ) {
      console.warn(
        '@floating-ui/lit officially supports Light DOM only. Override createRenderRoot() to return this.',
      );
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

  hostUpdated() {
    this.#floating.refresh();
  }

  hostDisconnected() {
    this.#unsubscribePosition?.();
    this.#unsubscribePosition = null;
    this.#floating.disconnect();
  }

  destroy() {
    this.#unsubscribePosition?.();
    this.#unsubscribePosition = null;
    this.#floating.destroy();
  }
}
