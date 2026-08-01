import {
  c,
  useContext,
  useEffect,
  useHost,
  useLayoutEffect,
  useMemo,
  useProvider,
  useRef,
  useSlot,
  useState,
} from "atomico";
import {
  FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE,
  FLOATING_UI_PLUS_PORTAL_ATTRIBUTE,
  focusManager,
  lockScroll,
  supportsFloatingTopLayer,
  type FloatingTopLayer,
} from "@floating-ui-plus/web";

import {
  floatingComponentContext,
  type FloatingComponentContext,
} from "./component-context";
import {
  FLOATING_UI_PLUS_CONTENT_ATTRIBUTE,
  FLOATING_UI_PLUS_CONTENT_SLOT,
  isFloatingContentTemplate,
} from "./constants";
import { getFloatingRootRuntime } from "./FloatingController";
import type { FloatingRootElement } from "./FloatingRootElement";

const contentsStyles = `
  :host,
  slot {
    display: contents;
  }
`;

interface PortalRuntime {
  targetElement: FloatingPortalTargetElement | undefined;
  root: FloatingRootElement | undefined;
  templateObservers: Map<Element, MutationObserver>;
  autoContentTemplate: HTMLTemplateElement | undefined;
  templateReconcileQueued: boolean;
  templateWarning: boolean;
  contentScopeCleanup: (() => void) | undefined;
  templateInferenceSuspended: boolean;
}

interface StatePreservingParent extends Element {
  moveBefore?(node: Node, child: Node | null): void;
}

function movePortalNode(parent: Element, node: Node) {
  const statePreservingParent = parent as StatePreservingParent;
  if (
    node.isConnected &&
    parent.isConnected &&
    typeof statePreservingParent.moveBefore === "function"
  ) {
    statePreservingParent.moveBefore(node, null);
    return;
  }
  parent.append(node);
}

const portalRuntimes = new WeakMap<FloatingPortalElement, PortalRuntime>();
const autoContentTemplates = new WeakSet<HTMLTemplateElement>();

function getPortalRuntime(host: FloatingPortalElement) {
  let runtime = portalRuntimes.get(host);
  if (!runtime) {
    runtime = {
      targetElement: undefined,
      root: undefined,
      templateObservers: new Map(),
      autoContentTemplate: undefined,
      templateReconcileQueued: false,
      templateWarning: false,
      contentScopeCleanup: undefined,
      templateInferenceSuspended: false,
    };
    portalRuntimes.set(host, runtime);
  }
  return runtime;
}

function clearAutoContentTemplate(runtime: PortalRuntime) {
  const template = runtime.autoContentTemplate;
  if (!template) return;
  if (autoContentTemplates.has(template)) {
    template.removeAttribute('slot');
    autoContentTemplates.delete(template);
  }
  runtime.autoContentTemplate = undefined;
}

function getPortalContentTemplates(
  host: FloatingPortalElement,
  runtime: PortalRuntime,
) {
  const templates: HTMLTemplateElement[] = [];
  const scopes: Element[] = [host];
  if (runtime.targetElement) scopes.push(runtime.targetElement);
  for (const scope of scopes) {
    for (const template of Array.from(scope.querySelectorAll("template"))) {
      if (runtime.root?.floatingElement?.contains(template)) continue;
      const nearestRoot = template.closest("floating-root");
      if (nearestRoot && nearestRoot !== runtime.root) continue;
      const nearestPortal = template.closest("floating-portal");
      if (scope === host && nearestPortal !== host) continue;
      const nearestTarget = template.closest("floating-portal-target");
      if (
        scope === runtime.targetElement &&
        nearestTarget !== runtime.targetElement
      ) {
        continue;
      }
      if (!templates.includes(template)) templates.push(template);
    }
  }
  return templates;
}

function reconcilePortalContentTemplate(
  host: FloatingPortalElement,
  runtime: PortalRuntime,
) {
  if (runtime.templateInferenceSuspended) return;
  const templates = getPortalContentTemplates(host, runtime);
  const explicitTemplates = templates.filter(
    (template) =>
      isFloatingContentTemplate(template) && !autoContentTemplates.has(template),
  );

  if (explicitTemplates.length > 0) {
    clearAutoContentTemplate(runtime);
    runtime.templateWarning = false;
    return;
  }

  if (templates.length === 1) {
    const template = templates[0]!;
    if (runtime.autoContentTemplate !== template) {
      clearAutoContentTemplate(runtime);
      runtime.autoContentTemplate = template;
      autoContentTemplates.add(template);
      template.slot = FLOATING_UI_PLUS_CONTENT_SLOT;
    }
    runtime.templateWarning = false;
    return;
  }

  clearAutoContentTemplate(runtime);
  if (templates.length > 1 && !runtime.templateWarning) {
    runtime.templateWarning = true;
    console.warn(
      '[floating-ui-plus] A floating portal with multiple templates requires exactly one explicit template[slot="content"].',
      host,
    );
  } else if (templates.length < 2) {
    runtime.templateWarning = false;
  }
}

function schedulePortalTemplateReconcile(
  host: FloatingPortalElement,
  runtime: PortalRuntime,
) {
  if (runtime.templateReconcileQueued) return;
  runtime.templateReconcileQueued = true;
  queueMicrotask(() => {
    runtime.templateReconcileQueued = false;
    reconcilePortalContentTemplate(host, runtime);
  });
}

function updatePortalTemplateScopes(
  host: FloatingPortalElement,
  runtime: PortalRuntime,
) {
  const scopes = new Set<Element>([host]);
  if (runtime.targetElement) scopes.add(runtime.targetElement);
  for (const [scope, observer] of runtime.templateObservers) {
    if (scopes.has(scope)) continue;
    observer.disconnect();
    runtime.templateObservers.delete(scope);
  }
  for (const scope of scopes) {
    if (runtime.templateObservers.has(scope)) continue;
    const observer = new MutationObserver(() => {
      schedulePortalTemplateReconcile(host, runtime);
    });
    observer.observe(scope, {
      attributes: true,
      attributeFilter: [FLOATING_UI_PLUS_CONTENT_ATTRIBUTE, 'slot'],
      childList: true,
      subtree: true,
    });
    runtime.templateObservers.set(scope, observer);
  }
  schedulePortalTemplateReconcile(host, runtime);
}

function disconnectPortalTemplateInference(runtime: PortalRuntime) {
  for (const observer of runtime.templateObservers.values()) {
    observer.disconnect();
  }
  runtime.templateObservers.clear();
  clearAutoContentTemplate(runtime);
  runtime.templateReconcileQueued = false;
  runtime.templateWarning = false;
}

function schedulePortalRootSync(runtime: PortalRuntime) {
  queueMicrotask(() => {
    if (runtime.root?.isConnected) {
      getFloatingRootRuntime(runtime.root).sync();
    }
  });
}

function restorePortalChildren(
  host: FloatingPortalElement,
  runtime: PortalRuntime,
) {
  const targetElement = runtime.targetElement;
  if (!targetElement) return;
  while (targetElement.firstChild) {
    movePortalNode(host, targetElement.firstChild);
  }
}

function destroyPortal(host: FloatingPortalElement, runtime: PortalRuntime) {
  const targetElement = runtime.targetElement;
  if (!targetElement) return;
  restorePortalChildren(host, runtime);
  runtime.contentScopeCleanup?.();
  runtime.contentScopeCleanup = undefined;
  targetElement.remove();
  runtime.targetElement = undefined;
  updatePortalTemplateScopes(host, runtime);
  schedulePortalRootSync(runtime);
}

function getDirectNestedPortals(host: FloatingPortalElement, nodes: Node[]) {
  const portals: FloatingPortalElement[] = [];
  for (const node of nodes) {
    if (!(node instanceof Element)) continue;
    const candidates = [
      ...(node.matches("floating-portal")
        ? [node as FloatingPortalElement]
        : []),
      ...Array.from(
        node.querySelectorAll<FloatingPortalElement>("floating-portal"),
      ),
    ];
    for (const portal of candidates) {
      if (portal.parentElement?.closest("floating-portal") === host) {
        portals.push(portal);
      }
    }
  }
  return portals;
}

interface FloatingPortalTargetHost extends HTMLElement {
  contextValue: FloatingComponentContext;
}

const FloatingPortalTargetBase = c(() => {
  const host = useHost<FloatingPortalTargetHost>().current;
  const contextValue = useMemo(
    () => ({
      ...host.contextValue,
      portalTarget: host,
    }),
    [host, host.contextValue],
  );
  useProvider(floatingComponentContext, contextValue);
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
    open: undefined,
    portalTarget: undefined,
    tree: undefined,
    parentNodeId: null,
    contextScope: undefined,
    list: undefined,
    delayGroup: undefined,
    composite: undefined,
    query: undefined,
    combobox: undefined,
    topLayer: undefined,
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
  topLayer: FloatingTopLayer;
  target: Element | null;
}

const FloatingPortalBase = c(
  () => {
    const host = useHost<FloatingPortalHost>().current;
    const runtime = useMemo(
      () => getPortalRuntime(host as FloatingPortalElement),
      [],
    );
    const portalSlot = useRef<HTMLSlotElement>();
    const contentSlot = useRef<HTMLSlotElement>();
    const defaultPortalChildren = useSlot<Node>(portalSlot);
    const contentPortalChildren = useSlot<Node>(contentSlot);
    const portalChildren = useMemo(
      () => [...defaultPortalChildren, ...contentPortalChildren],
      [defaultPortalChildren, contentPortalChildren],
    );
    const [providerReady, setProviderReady] = useState(false);
    const componentContext = useContext(floatingComponentContext);
    const capturedContext = useRef(componentContext);
    if (componentContext.root !== undefined) {
      capturedContext.current = componentContext;
    }
    const targetReady = capturedContext.current.root !== undefined;
    const containsNativeDialog = portalChildren.some(
      (node) =>
        node instanceof HTMLDialogElement ||
        (node instanceof Element && node.querySelector(':scope > dialog')),
    );
    const containsContentTemplate = portalChildren.some(
      (node) => node instanceof HTMLTemplateElement,
    );
    const explicitTopLayer =
      host.hasAttribute('top-layer')
        ? host.topLayer
        : capturedContext.current.topLayer ?? 'none';
    const nativeTopLayer = supportsFloatingTopLayer(
      explicitTopLayer,
    ) || containsNativeDialog || (
      !host.hasAttribute('top-layer') &&
      !host.hasAttribute('to') &&
      host.target == null &&
      containsContentTemplate &&
      supportsFloatingTopLayer('popover')
    );
    const portalDisabled = host.disabled || nativeTopLayer;
    runtime.root = capturedContext.current.root;
    runtime.templateInferenceSuspended =
      !portalDisabled &&
      targetReady &&
      (!runtime.targetElement || !providerReady);

    useEffect(() => {
      host.setAttribute(FLOATING_UI_PLUS_PORTAL_ATTRIBUTE, "");
      updatePortalTemplateScopes(host as FloatingPortalElement, runtime);
      return () => {
        disconnectPortalTemplateInference(runtime);
      };
    }, []);

    useLayoutEffect(() => {
      // Mount portal content once its logical context is ready. Open state
      // controls visibility through the floating surface and overlay so the
      // Atomico subtree is not disconnected during an interaction.
      if (portalDisabled || !targetReady) {
        destroyPortal(host as FloatingPortalElement, runtime);
        setProviderReady(false);
        updatePortalTemplateScopes(host as FloatingPortalElement, runtime);
        return;
      }
      const explicitTarget =
        host.hasAttribute("to") && host.to
          ? host.ownerDocument.querySelector(host.to)
          : null;
      const parentPortal = host.parentElement?.closest(
        "floating-portal",
      ) as FloatingPortalElement | null;
      const parentPortalTarget =
        parentPortal && !parentPortal.disabled
          ? getPortalRuntime(parentPortal).targetElement
          : undefined;
      if (parentPortal && !parentPortal.disabled && !parentPortalTarget) {
        return;
      }
      const target =
        host.target ??
        explicitTarget ??
        parentPortalTarget ??
        host.parentElement?.closest("floating-portal-target") ??
        capturedContext.current.portalTarget ??
        host.ownerDocument.body;
      if (!target) return;
      if (
        runtime.targetElement &&
        runtime.targetElement.parentElement !== target
      ) {
        destroyPortal(host as FloatingPortalElement, runtime);
        setProviderReady(false);
      }
      if (!runtime.targetElement) {
        runtime.targetElement = host.ownerDocument.createElement(
          "floating-portal-target",
        ) as FloatingPortalTargetElement;
        runtime.targetElement.contextValue = capturedContext.current;
        runtime.contentScopeCleanup =
          getFloatingRootRuntime(
            capturedContext.current.root!,
          ).registerContentScope(runtime.targetElement);
        target.append(runtime.targetElement);
        updatePortalTemplateScopes(host as FloatingPortalElement, runtime);
        const currentTarget = runtime.targetElement;
        void currentTarget.updated.then(() => {
          if (runtime.targetElement !== currentTarget) return;
          setProviderReady(true);
        });
        return;
      }
      runtime.targetElement.contextValue = capturedContext.current;
      if (!providerReady) return;
      const nestedPortals = getDirectNestedPortals(
        host as FloatingPortalElement,
        portalChildren,
      );
      for (const child of portalChildren) {
        movePortalNode(runtime.targetElement, child);
      }
      schedulePortalRootSync(runtime);
      schedulePortalTemplateReconcile(
        host as FloatingPortalElement,
        runtime,
      );
      // A nested portal belongs after its parent's rendered content. Equal
      // layer values can then rely on normal DOM paint order.
      for (const nestedPortal of nestedPortals) {
        const nestedTarget = getPortalRuntime(nestedPortal).targetElement;
        if (nestedTarget) {
          runtime.targetElement.append(nestedTarget);
        } else {
          void nestedPortal.update();
        }
      }
    }, [
      runtime,
      providerReady,
      targetReady,
      portalChildren,
      portalDisabled,
      host.target,
      host.to,
      capturedContext.current,
    ]);

    return (
      <host shadowDom>
        <style>{`
          ${contentsStyles}

          slot[hidden] {
            display: none;
          }
        `}</style>
        <slot ref={portalSlot} hidden={!portalDisabled && !targetReady} />
        <slot
          name={FLOATING_UI_PLUS_CONTENT_SLOT}
          ref={contentSlot}
          hidden={!portalDisabled && !targetReady}
        />
      </host>
    );
  },
  {
    props: {
      to: { type: String, value: (): string => "body" },
      disabled: {
        type: Boolean,
        value: (): boolean => false,
        reflect: true,
      },
      topLayer: {
        type: String,
        value: (): FloatingTopLayer => 'none',
        attr: 'top-layer',
      },
    },
  },
);

/** Teleports its children while re-providing the nearest contexts. */
export class FloatingPortalElement extends FloatingPortalBase {
  #target: Element | null = null;

  disconnectedCallback() {
    (
      FloatingPortalBase.prototype as unknown as {
        disconnectedCallback(): void;
      }
    ).disconnectedCallback.call(this);
    queueMicrotask(() => {
      if (!this.isConnected) {
        destroyPortal(this, getPortalRuntime(this));
      }
    });
  }

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

interface FloatingContentHost extends HTMLElement {
  topLayer: FloatingTopLayer;
}

const FloatingContentBase = c(
  () => {
    const host = useHost<FloatingContentHost>().current;
    const root = useContext(floatingComponentContext).root;

    useLayoutEffect(() => {
      if (!root) return;
      const runtime = getFloatingRootRuntime(root);
      runtime.setFloatingElement(host);
      return () => runtime.setFloatingElement(null);
    }, [host, root]);

    return (
      <host shadowDom>
        <style>{`:host { display: block; } slot { display: contents; }`}</style>
        <slot />
      </host>
    );
  },
  {
    props: {
      topLayer: {
        type: String,
        value: (): FloatingTopLayer => 'none',
        attr: 'top-layer',
      },
    },
  },
);

/** Direct floating surface. `top-layer="popover"` uses the Popover API. */
export class FloatingContentElement extends FloatingContentBase {
  get updateComplete() {
    return this.updated;
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
      host.setAttribute(FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE, "");
    }, []);

    useEffect(() => {
      if (!root) return;
      const sync = (open: boolean) => {
        host.hidden = !open;
        syncLock();
      };
      sync(root.open);
      return root.controller.context.events.on("openchange", ({ open }) => {
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
        attr: "lock-scroll",
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

function getNestedPortalTargets(root: FloatingRootElement) {
  const portalTarget = root.floatingElement?.closest(
    "floating-portal-target",
  );
  if (!portalTarget) return [];
  return Array.from(portalTarget.children).filter(
    (element) => element.localName === "floating-portal-target",
  );
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
        getInsideElements: () => getNestedPortalTargets(root),
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
        attr: "initial-focus",
      },
      returnFocus: {
        type: Boolean,
        value: (): boolean => true,
        attr: "return-focus",
      },
      outsideElementsInert: {
        type: Boolean,
        value: (): boolean => false,
        attr: "outside-elements-inert",
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
    host.dataset.status = root.open ? "open" : "closed";
    return root.controller.context.events.on("openchange", ({ open }) => {
      host.dataset.status = open ? "open" : "close";
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
    "floating-portal": FloatingPortalElement;
    "floating-content": FloatingContentElement;
    "floating-portal-target": FloatingPortalTargetElement;
    "floating-overlay": FloatingOverlayElement;
    "floating-focus-manager": FloatingFocusManagerElement;
    "floating-transition": FloatingTransitionElement;
  }
}
