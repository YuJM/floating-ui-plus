import {
  c,
  useContext,
  useEffect,
  useHost,
  useLayoutEffect,
  useMemo,
  useProvider,
  useRef,
  useState,
} from 'atomico';
import {
  FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE,
  FLOATING_UI_PLUS_PORTAL_ATTRIBUTE,
  focusManager,
  lockScroll,
} from '@floating-ui-plus/web';

import {
  floatingComponentContext,
  type FloatingComponentContext,
} from './component-context';
import type {FloatingRootElement} from './FloatingRootElement';

const contentsStyles = `
  :host,
  slot {
    display: contents;
  }
`;

interface PortalRuntime {
  targetElement: FloatingPortalTargetElement | undefined;
}

interface StatePreservingParent extends Element {
  moveBefore?(node: Node, child: Node | null): void;
}

function movePortalNode(parent: Element, node: Node) {
  const statePreservingParent = parent as StatePreservingParent;
  if (
    node.isConnected &&
    parent.isConnected &&
    typeof statePreservingParent.moveBefore === 'function'
  ) {
    statePreservingParent.moveBefore(node, null);
    return;
  }
  parent.append(node);
}

const portalRuntimes = new WeakMap<FloatingPortalElement, PortalRuntime>();

function getPortalRuntime(host: FloatingPortalElement) {
  let runtime = portalRuntimes.get(host);
  if (!runtime) {
    runtime = {targetElement: undefined};
    portalRuntimes.set(host, runtime);
  }
  return runtime;
}

function restorePortal(host: FloatingPortalElement, runtime: PortalRuntime) {
  const targetElement = runtime.targetElement;
  if (!targetElement) return;
  while (targetElement.firstChild) {
    movePortalNode(host, targetElement.firstChild);
  }
  targetElement.remove();
  runtime.targetElement = undefined;
}

interface FloatingPortalTargetHost extends HTMLElement {
  contextValue: FloatingComponentContext;
}

const FloatingPortalTargetBase = c(() => {
  const host = useHost<FloatingPortalTargetHost>().current;
  useProvider(floatingComponentContext, host.contextValue);
  useEffect(() => {
    const scope = host.contextValue.contextScope;
    if (!scope) return;
    return scope.attach(host);
  }, [host, host.contextValue.contextScope]);
  return (
    <host shadowDom>
      <style>{contentsStyles}</style>
      <slot />
    </host>
  );
});

/** Internal provider that keeps teleported descendants mounted correctly. */
export class FloatingPortalTargetElement extends FloatingPortalTargetBase {
  #contextValue: FloatingComponentContext = {
    root: undefined,
    tree: undefined,
    parentNodeId: null,
    contextScope: undefined,
    list: undefined,
    delayGroup: undefined,
    composite: undefined,
  };

  get contextValue() {
    return this.#contextValue;
  }

  set contextValue(value: FloatingComponentContext) {
    if (value === this.#contextValue) return;
    this.#contextValue = value;
    void this.update();
  }
}

interface FloatingPortalHost extends HTMLElement {
  to: string;
  disabled: boolean;
  target: Element | null;
}

const FloatingPortalBase = c(
  () => {
    const host = useHost<FloatingPortalHost>().current;
    const runtime = useMemo(
      () => getPortalRuntime(host as FloatingPortalElement),
      [],
    );
    const [providerReady, setProviderReady] = useState(false);
    const componentContext = useContext(floatingComponentContext);
    const capturedContext = useRef(componentContext);
    if (componentContext.root !== undefined) {
      capturedContext.current = componentContext;
    }
    const targetReady =
      capturedContext.current.root !== undefined &&
      typeof capturedContext.current.root.open === 'boolean';

    useEffect(() => {
      host.setAttribute(FLOATING_UI_PLUS_PORTAL_ATTRIBUTE, '');
    }, []);
    useEffect(() => {
      if (!targetReady) return;
      const observer = new MutationObserver(() => {
        void (host as FloatingPortalElement).update();
      });
      observer.observe(host, {childList: true});
      return () => observer.disconnect();
    }, [host, targetReady]);

    useLayoutEffect(() => {
      // A portal must not move before the nearest root context, including its
      // open state, has actually arrived. `false` is a valid received value.
      if (host.disabled || !targetReady) {
        restorePortal(host as FloatingPortalElement, runtime);
        setProviderReady(false);
        return;
      }
      const target =
        host.target ??
        (host.to ? host.ownerDocument.querySelector(host.to) : null) ??
        host.ownerDocument.body;
      if (!target) return;
      if (
        runtime.targetElement &&
        runtime.targetElement.parentElement !== target
      ) {
        restorePortal(host as FloatingPortalElement, runtime);
        setProviderReady(false);
      }
      if (!runtime.targetElement) {
        runtime.targetElement = host.ownerDocument.createElement(
          'floating-portal-target',
        ) as FloatingPortalTargetElement;
        runtime.targetElement.contextValue = capturedContext.current;
        target.append(runtime.targetElement);
        const currentTarget = runtime.targetElement;
        void currentTarget.updated.then(() => {
          if (runtime.targetElement !== currentTarget) return;
          setProviderReady(true);
        });
        return;
      }
      runtime.targetElement.contextValue = capturedContext.current;
      if (!providerReady) return;
      for (const child of Array.from(host.childNodes)) {
        movePortalNode(runtime.targetElement, child);
      }
    }, [
      runtime,
      providerReady,
      targetReady,
      host.disabled,
      host.target,
      host.to,
      capturedContext.current,
    ]);

    useEffect(
      () => () => {
        restorePortal(host as FloatingPortalElement, runtime);
      },
      [runtime],
    );

    if (!targetReady) return null;

    return (
      <host shadowDom>
        <style>{contentsStyles}</style>
        {host.disabled ? <slot /> : null}
      </host>
    );
  },
  {
    props: {
      to: {type: String, value: (): string => 'body'},
      disabled: {
        type: Boolean,
        value: (): boolean => false,
        reflect: true,
      },
    },
  },
);

/** Teleports its children while re-providing the nearest contexts. */
export class FloatingPortalElement extends FloatingPortalBase {
  #target: Element | null = null;

  get updateComplete() {
    return this.updated;
  }

  get target() {
    return this.#target;
  }

  set target(value: Element | null) {
    if (value === this.#target) return;
    this.#target = value;
    void this.update();
  }
}

interface FloatingOverlayHost extends HTMLElement {
  lockScroll: boolean;
}

const FloatingOverlayBase = c(
  () => {
    const host = useHost<FloatingOverlayHost>().current;
    const root = useContext(floatingComponentContext).root;
    const unlock = useRef<(() => void) | undefined>();

    const syncLock = () => {
      unlock.current?.();
      unlock.current = undefined;
      if (host.lockScroll && host.isConnected && !host.hidden) {
        unlock.current = lockScroll(host.ownerDocument);
      }
    };

    useEffect(() => {
      host.setAttribute(FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE, '');
    }, []);

    useEffect(() => {
      if (!root) return;
      const sync = (open: boolean) => {
        host.hidden = !open;
        syncLock();
      };
      sync(root.open);
      return root.controller.context.events.on('openchange', ({open}) => {
        sync(open);
      });
    }, [root]);

    useLayoutEffect(() => {
      syncLock();
    });

    useEffect(
      () => () => {
        unlock.current?.();
        unlock.current = undefined;
      },
      [],
    );

    return (
      <host shadowDom>
        <style>{`
          :host {
            display: block;
            position: fixed;
            inset: 0;
          }

          :host([hidden]) {
            display: none;
          }
        `}</style>
        <slot />
      </host>
    );
  },
  {
    props: {
      lockScroll: {
        type: Boolean,
        value: (): boolean => false,
        reflect: true,
        attr: 'lock-scroll',
      },
    },
  },
);

/** Fixed overlay surface with optional document scroll locking. */
export class FloatingOverlayElement extends FloatingOverlayBase {
  get updateComplete() {
    return this.updated;
  }
}

interface FloatingFocusManagerHost extends HTMLElement {
  enabled: boolean;
  modal: boolean;
  initialFocus: number;
  returnFocus: boolean;
  outsideElementsInert: boolean;
}

const FloatingFocusManagerBase = c(
  () => {
    const host = useHost<FloatingFocusManagerHost>().current;
    const root = useContext(floatingComponentContext).root;

    useEffect(() => {
      if (!root || !host.enabled) return;
      const plugin = focusManager(() => ({
        enabled: host.enabled,
        modal: host.modal,
        initialFocus: host.initialFocus,
        returnFocus: host.returnFocus,
        outsideElementsInert: host.outsideElementsInert,
      }));
      const cleanup = plugin.connect(root.controller.context) || undefined;
      plugin.update?.(root.controller.context);
      return () => cleanup?.();
    }, [
      root,
      host.enabled,
      host.modal,
      host.initialFocus,
      host.returnFocus,
      host.outsideElementsInert,
    ]);

    return (
      <host shadowDom>
        <style>{contentsStyles}</style>
        <slot />
      </host>
    );
  },
  {
    props: {
      enabled: {
        type: Boolean,
        value: (): boolean => true,
        reflect: true,
      },
      modal: {
        type: Boolean,
        value: (): boolean => true,
        reflect: true,
      },
      initialFocus: {
        type: Number,
        value: (): number => 0,
        attr: 'initial-focus',
      },
      returnFocus: {
        type: Boolean,
        value: (): boolean => true,
        attr: 'return-focus',
      },
      outsideElementsInert: {
        type: Boolean,
        value: (): boolean => false,
        attr: 'outside-elements-inert',
      },
    },
  },
);

/** Connects the Web focus-manager plugin to the nearest floating root. */
export class FloatingFocusManagerElement extends FloatingFocusManagerBase {
  get updateComplete() {
    return this.updated;
  }
}

const FloatingTransitionBase = c(() => {
  const host = useHost<HTMLElement>().current;
  const root = useContext(floatingComponentContext).root;

  useEffect(() => {
    if (!root) return;
    host.dataset.status = root.open ? 'open' : 'closed';
    return root.controller.context.events.on('openchange', ({open}) => {
      host.dataset.status = open ? 'open' : 'close';
    });
  }, [root]);

  return (
    <host shadowDom>
      <style>{contentsStyles}</style>
      <slot />
    </host>
  );
});

/** Reflects root open/close state as a small CSS transition state machine. */
export class FloatingTransitionElement extends FloatingTransitionBase {
  get updateComplete() {
    return this.updated;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-portal': FloatingPortalElement;
    'floating-portal-target': FloatingPortalTargetElement;
    'floating-overlay': FloatingOverlayElement;
    'floating-focus-manager': FloatingFocusManagerElement;
    'floating-transition': FloatingTransitionElement;
  }
}
