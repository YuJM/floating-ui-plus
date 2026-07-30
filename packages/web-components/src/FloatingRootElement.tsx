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
  OpenChangeReason,
  ReferenceElement,
} from '@floating-ui-plus/web';

import {
  getFloatingRootRuntime,
} from './FloatingController';
import {floatingComponentContext} from './component-context';

export interface FloatingOpenChangeDetail {
  open: boolean;
  reason?: OpenChangeReason | undefined;
  sourceEvent?: Event | undefined;
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
      }),
      [host, host.open, inheritedContext],
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
      host.middleware,
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
    },
  },
);

export class FloatingRootElement extends FloatingRootBase {
  #middleware: FloatingOptions['middleware'];
  #plugins: FloatingPlugin[] = [];

  get updateComplete() {
    return this.updated;
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

  use(...plugins: FloatingPlugin[]) {
    getFloatingRootRuntime(this).pipe(...plugins);
    return this;
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
  ) {
    this.open = open;
    this.dispatchEvent(
      new CustomEvent<FloatingOpenChangeDetail>('openchange', {
        bubbles: true,
        composed: true,
        detail: {open, reason, sourceEvent: event},
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-root': FloatingRootElement;
  }
}
