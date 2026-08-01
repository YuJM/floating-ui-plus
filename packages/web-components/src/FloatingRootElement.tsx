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
import type {
  FloatingOptions,
  FloatingPlugin,
  FloatingRole,
  FloatingTopLayer,
  OpenChangeReason,
  ReferenceElement,
} from '@floating-ui-plus/web';

import {getFloatingRootRuntime} from './FloatingController';
import {floatingComponentContext} from './component-context';

export interface FloatingOpenChangeDetail {
  open: boolean;
  reason?: OpenChangeReason | undefined;
  sourceEvent?: Event | undefined;
}

export interface FloatingBeforeCloseDetail {
  reason?: OpenChangeReason | undefined;
  sourceEvent?: Event | undefined;
}

export interface FloatingTemplateLifecycleDetail {
  root: FloatingRootElement;
  template: HTMLTemplateElement;
  element: HTMLElement;
}

export interface FloatingRootEventDetailMap {
  openchange: FloatingOpenChangeDetail;
  floatingmount: FloatingTemplateLifecycleDetail;
  floatingunmount: FloatingTemplateLifecycleDetail;
}

export type FloatingRootEventType = keyof FloatingRootEventDetailMap;

export interface FloatingRootConfiguration {
  middleware?: FloatingOptions['middleware'];
  plugins?: FloatingPlugin[] | undefined;
  topLayer?: FloatingTopLayer | undefined;
}

const contentsStyles = `
  :host,
  slot {
    display: contents;
  }
`;

interface FloatingRootHost extends HTMLElement {
  open: boolean;
  placement: FloatingOptions['placement'];
  strategy: FloatingOptions['strategy'];
  transform: boolean;
  interactions: string;
  floatingRole: FloatingRole | '';
  topLayer: FloatingTopLayer;
  middleware: FloatingOptions['middleware'];
  plugins: FloatingPlugin[];
}

const FloatingRootBase = c(
  () => {
    const host = useHost<FloatingRootHost>().current;
    const runtime = useMemo(
      () => getFloatingRootRuntime(host as FloatingRootElement),
      [],
    );
    const referenceSlot = useRef<HTMLSlotElement>();
    const floatingSlot = useRef<HTMLSlotElement>();
    const inheritedContext = useContext(floatingComponentContext);
    const referenceChildren = useSlot<Element>(
      referenceSlot,
      (node) => node instanceof Element,
    );
    const floatingChildren = useSlot<Element>(
      floatingSlot,
      (node) => node instanceof Element,
    );
    const contextValue = useMemo(
      () => ({
        ...inheritedContext,
        root: host as FloatingRootElement,
        open: host.open,
        topLayer: host.topLayer,
      }),
      [host, host.open, host.topLayer, inheritedContext],
    );

    useProvider(floatingComponentContext, contextValue);

    useLayoutEffect(() => {
      runtime.syncSlots(referenceSlot.current, floatingSlot.current);
      runtime.sync();
    }, [
      runtime,
      host.open,
      host.placement,
      host.strategy,
      host.transform,
      host.interactions,
      host.floatingRole,
      host.topLayer,
      host.middleware,
      host.plugins,
      referenceChildren,
      floatingChildren,
    ]);

    useEffect(() => {
      runtime.connect();
      return () => runtime.disconnect();
    }, [runtime]);

    return (
      <host shadowDom>
        <style>{contentsStyles}</style>
        <slot name="reference" ref={referenceSlot} />
        <slot name="floating" ref={floatingSlot} />
        <slot />
      </host>
    );
  },
  {
    props: {
      open: {type: Boolean, value: (): boolean => false, reflect: true},
      placement: {
        type: atomicoType<FloatingOptions['placement']>(String),
        value: (): FloatingOptions['placement'] => 'bottom',
      },
      strategy: {
        type: atomicoType<FloatingOptions['strategy']>(String),
        value: (): FloatingOptions['strategy'] => 'absolute',
      },
      transform: {type: Boolean, value: (): boolean => true},
      interactions: {type: String, value: (): string => ''},
      floatingRole: {
        type: atomicoType<FloatingRole | ''>(String),
        value: (): FloatingRole | '' => '',
      },
      topLayer: {
        type: atomicoType<FloatingTopLayer>(String),
        value: (): FloatingTopLayer => 'none',
        attr: 'top-layer',
      },
    },
  },
);

export class FloatingRootElement extends FloatingRootBase {
  #middleware: FloatingOptions['middleware'];
  #plugins: FloatingPlugin[] = [];

  get updateComplete() {
    return this.updated;
  }

  static query(scope: ParentNode, selector: string) {
    const element = scope.querySelector(selector);
    if (!(element instanceof FloatingRootElement)) {
      throw new Error(`Missing FloatingRootElement for ${selector}`);
    }
    return element;
  }

  get middleware() {
    return this.#middleware;
  }

  set middleware(value: FloatingOptions['middleware']) {
    if (value === this.#middleware) return;
    this.#middleware = value;
    void this.update();
  }

  get plugins() {
    return this.#plugins;
  }

  set plugins(value: FloatingPlugin[]) {
    if (value === this.#plugins) return;
    this.#plugins = value;
    void this.update();
  }

  get controller() {
    return getFloatingRootRuntime(this).engine;
  }

  get referenceElement() {
    return getFloatingRootRuntime(this).referenceElement;
  }

  get floatingElement() {
    return getFloatingRootRuntime(this).floatingElement;
  }

  get contentTemplate() {
    return getFloatingRootRuntime(this).contentTemplate;
  }

  use(...plugins: FloatingPlugin[]) {
    getFloatingRootRuntime(this).pipe(...plugins);
    return this;
  }

  configure(configuration: FloatingRootConfiguration) {
    if (configuration.middleware !== undefined) {
      this.middleware = configuration.middleware;
    }
    if (configuration.plugins !== undefined) {
      this.plugins = configuration.plugins;
    }
    if (configuration.topLayer !== undefined) {
      this.topLayer = configuration.topLayer;
    }
    return this;
  }

  on<Type extends FloatingRootEventType>(
    type: Type,
    listener: (detail: FloatingRootEventDetailMap[Type]) => void,
  ) {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent<
        FloatingRootEventDetailMap[Type]
      >;
      if (type === 'openchange') {
        if (event.target !== this) return;
      } else {
        const detail = customEvent.detail as FloatingTemplateLifecycleDetail;
        if (detail.root !== this) return;
      }
      listener(customEvent.detail);
    };
    this.addEventListener(type, handleEvent);
    return () => this.removeEventListener(type, handleEvent);
  }

  close(event?: Event, reason?: OpenChangeReason) {
    const wasOpen = this.open;
    this.controller.context.onOpenChange(false, event, reason);
    return !wasOpen || !this.open;
  }

  setPositionReference(reference: ReferenceElement | null) {
    getFloatingRootRuntime(this).setPositionReference(reference);
  }

  updatePosition() {
    return getFloatingRootRuntime(this).updatePosition();
  }

  setReferenceElement(reference: Element | null) {
    getFloatingRootRuntime(this).setReferenceElement(reference);
  }

  setFloatingElement(floating: HTMLElement | null) {
    getFloatingRootRuntime(this).setFloatingElement(floating);
  }

  commitOpenChange(
    open: boolean,
    event?: Event,
    reason?: OpenChangeReason,
  ): boolean {
    if (!open) {
      const beforeClose = new CustomEvent<FloatingBeforeCloseDetail>(
        'floatingbeforeclose',
        {
          bubbles: true,
          cancelable: true,
          composed: true,
          detail: {reason, sourceEvent: event},
        },
      );
      if (!this.dispatchEvent(beforeClose)) return false;
    }
    this.open = open;
    this.dispatchEvent(
      new CustomEvent<FloatingOpenChangeDetail>('openchange', {
        bubbles: true,
        composed: true,
        detail: {open, reason, sourceEvent: event},
      }),
    );
    return true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-root': FloatingRootElement;
  }

  interface HTMLElementEventMap {
    floatingmount: CustomEvent<FloatingTemplateLifecycleDetail>;
    floatingunmount: CustomEvent<FloatingTemplateLifecycleDetail>;
    floatingbeforeclose: CustomEvent<FloatingBeforeCloseDetail>;
  }
}
