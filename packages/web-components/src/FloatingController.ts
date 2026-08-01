import {
  applyFloatingStyles,
  autoUpdate,
  click,
  createFloating,
  createFloatingTopLayer,
  dismiss,
  focus,
  getContextArrowStyles,
  hover,
  requestFloatingContextScope,
  role,
  type FloatingController,
  type FloatingContext,
  type FloatingPlugin,
  type FloatingTopLayerController,
  type FloatingTopLayer,
  type OpenChangeReason,
  type ReferenceElement,
} from '@floating-ui-plus/web';
import {setAttributes} from '@floating-ui-plus/web/utils';

import {
  FLOATING_UI_PLUS_CLOSE_ATTRIBUTE,
  FLOATING_UI_PLUS_CONTENT_ATTRIBUTE,
  FLOATING_UI_PLUS_CONTENT_TEMPLATE_SELECTOR,
} from './constants';
import type {FloatingRootElement} from './FloatingRootElement';

const runtimes = new WeakMap<FloatingRootElement, FloatingRootRuntime>();
const floatingOwners = new WeakMap<Element, FloatingRootElement>();

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
  readonly topLayer: FloatingTopLayerController;

  readonly #host: FloatingRootElement;
  #reference: Element | null = null;
  #floatingElement: HTMLElement | null = null;
  #manualFloatingElement: HTMLElement | null = null;
  #slottedFloatingElement: HTMLElement | null = null;
  #slottedTopLayer: FloatingTopLayer = 'none';
  #templateFloatingElement: HTMLElement | null = null;
  #templateTopLayer: FloatingTopLayer = 'none';
  #contentTemplate: HTMLTemplateElement | null = null;
  #templateNodes: Node[] = [];
  #contentScopes = new Map<Element, MutationObserver | null>();
  #templateContentObserver: MutationObserver | null = null;
  #contentReconcileQueued = false;
  #forceTemplateRemount = false;
  #contentWarning: string | null = null;
  #referenceAttributes = new Set<string>();
  #floatingAttributes = new Set<string>();
  #contextAttachmentCleanup: (() => void) | null = null;
  #unsubscribePosition: (() => void) | null = null;
  #componentPlugins: FloatingPlugin[] = [];
  #registeredComponentPlugins = new Map<object, readonly FloatingPlugin[]>();
  #registeredComponentPluginsVersion = 0;
  #syncedRegisteredComponentPluginsVersion = -1;
  #componentPluginCleanups: Array<() => void> = [];
  #componentPluginContext: FloatingContext | null = null;
  #componentPluginsSource: readonly FloatingPlugin[] | null = null;
  #componentInteractions = '';
  #componentFloatingRole = '';
  #componentPluginBridgeInstalled = false;
  #connected = false;
  #disconnectQueued = false;
  #floatingClickCleanup: (() => void) | null = null;

  constructor(host: FloatingRootElement) {
    this.#host = host;
    this.topLayer = createFloatingTopLayer({
      onOpenChange: (open, event, reason) => {
        return host.commitOpenChange(open, event, reason);
      },
    });
    this.#contentScopes.set(host, null);
    this.engine = createFloating(() => ({
      open: host.open,
      placement: host.placement,
      strategy: host.strategy,
      transform: host.transform,
      middleware: host.middleware,
      whileElementsMounted: autoUpdate,
      onOpenChange: (open, event, reason) => {
        return host.commitOpenChange(open, event, reason);
      },
    }));
  }

  get referenceElement() {
    return this.#reference;
  }

  get floatingElement() {
    return this.#floatingElement;
  }

  get contentTemplate() {
    return this.#contentTemplate;
  }

  pipe(...plugins: FloatingPlugin[]) {
    this.engine.pipe(...plugins);
  }

  registerComponentPlugins(
    owner: object,
    plugins: readonly FloatingPlugin[],
  ) {
    this.#registeredComponentPlugins.set(owner, plugins);
    this.#registeredComponentPluginsVersion++;
    this.#syncComponentPlugins();
    return () => {
      if (!this.#registeredComponentPlugins.delete(owner)) return;
      this.#registeredComponentPluginsVersion++;
      this.#syncComponentPlugins();
    };
  }

  connect() {
    if (this.#connected) return;
    this.#connected = true;
    this.topLayer.connect();
    this.#syncComponentPlugins();
    this.#installComponentPluginBridge();
    this.engine.setContextParent(
      requestFloatingContextScope(this.#host) ?? null,
    );
    this.#contextAttachmentCleanup =
      this.engine.contextScope.attach(this.#host);
    for (const scope of this.#contentScopes.keys()) {
      this.#observeContentScope(scope);
    }
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
    if (!this.#connected || this.#disconnectQueued) return;
    this.#disconnectQueued = true;
    queueMicrotask(() => {
      this.#disconnectQueued = false;
      if (this.#host.isConnected || !this.#connected) return;
      this.#connected = false;
      this.topLayer.disconnect();
      this.#unsubscribePosition?.();
      this.#unsubscribePosition = null;
      this.#unmountTemplate();
      this.#templateContentObserver?.disconnect();
      this.#templateContentObserver = null;
      for (const [scope, observer] of this.#contentScopes) {
        observer?.disconnect();
        this.#contentScopes.set(scope, null);
      }
      this.engine.disconnect();
      this.#contextAttachmentCleanup?.();
      this.#contextAttachmentCleanup = null;
      this.engine.setContextParent(null);
    });
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

    this.#setSlottedFloatingElement(
      nextFloating instanceof HTMLElement ? nextFloating : null,
    );
    this.syncBindings();
  }

  sync() {
    this.#syncComponentPlugins();
    this.engine.refresh();
    this.#reconcileContentTemplates();
    this.#syncTemplateMount();
    this.syncBindings();
  }

  registerContentScope(scope: Element) {
    if (!this.#contentScopes.has(scope)) {
      this.#contentScopes.set(scope, null);
      if (this.#connected) this.#observeContentScope(scope);
      this.#scheduleContentReconcile();
    }
    return () => {
      if (scope === this.#host) return;
      this.#contentScopes.get(scope)?.disconnect();
      this.#contentScopes.delete(scope);
      this.#scheduleContentReconcile();
    };
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
    if (floating === this.#manualFloatingElement) return;
    this.#manualFloatingElement = floating;
    this.#syncTemplateMount();
    this.#syncEffectiveFloatingElement();
  }

  #setSlottedFloatingElement(floating: HTMLElement | null) {
    const topLayer = this.#resolveSlottedTopLayer(floating);
    const surface = this.#resolveSlottedSurface(floating, topLayer);
    if (
      surface === this.#slottedFloatingElement &&
      topLayer === this.#slottedTopLayer
    ) {
      return;
    }
    this.#slottedFloatingElement = surface;
    this.#slottedTopLayer = topLayer;
    this.#syncTemplateMount();
    this.#syncEffectiveFloatingElement();
  }

  #resolveSlottedTopLayer(element: HTMLElement | null): FloatingTopLayer {
    const explicitTopLayer = (element as
      | (HTMLElement & {topLayer?: unknown})
      | null)?.topLayer;
    if (element?.hasAttribute('top-layer')) {
      return explicitTopLayer === 'popover' || explicitTopLayer === 'dialog'
        ? explicitTopLayer
        : 'none';
    }
    if (
      element?.localName === 'floating-portal' &&
      element.querySelector(':scope > dialog')
    ) {
      return 'dialog';
    }
    if (element?.localName === 'dialog') return 'dialog';
    if (explicitTopLayer === 'popover' || explicitTopLayer === 'dialog') {
      return explicitTopLayer;
    }
    const role =
      this.engine.context.attributes.floating?.role ?? this.#host.floatingRole;
    if (
      element?.localName === 'floating-content' &&
      (role === 'dialog' || role === 'menu' || role === 'listbox')
    ) {
      return 'popover';
    }
    return 'none';
  }

  #resolveSlottedSurface(
    element: HTMLElement | null,
    topLayer: FloatingTopLayer,
  ) {
    if (topLayer !== 'dialog' || element?.localName !== 'floating-portal') {
      return element;
    }
    return element.querySelector<HTMLDialogElement>('dialog');
  }

  #syncEffectiveFloatingElement() {
    this.#bindFloatingElement(
      this.#manualFloatingElement ??
        this.#slottedFloatingElement ??
        this.#templateFloatingElement,
    );
  }

  #resolveTemplateTopLayer() {
    const template = this.#contentTemplate;
    if (!template) return 'none' as const;
    const portal = template.closest('floating-portal') as
      | (HTMLElement & {topLayer?: unknown})
      | null;
    if (portal?.hasAttribute('top-layer')) {
      return portal.topLayer === 'dialog' || portal.topLayer === 'popover'
        ? portal.topLayer
        : 'none';
    }
    const templateDialog = template.content.querySelector(':scope > dialog');
    if (templateDialog) return 'dialog' as const;
    return 'popover' as const;
  }

  #bindFloatingElement(floating: HTMLElement | null) {
    if (floating === this.#floatingElement) return;
    this.#floatingClickCleanup?.();
    this.#floatingClickCleanup = null;
    if (this.#floatingElement) {
      floatingOwners.delete(this.#floatingElement);
      this.#floatingAttributes = setAttributes(
        this.#floatingElement,
        {},
        this.#floatingAttributes,
      );
    }
    this.#floatingElement = floating;
    if (floating) {
      floatingOwners.set(floating, this.#host);
      const handleClick = (event: MouseEvent) => {
        const pathOwner = event
          .composedPath()
          .find(
            (target): target is Element =>
              target instanceof Element && floatingOwners.has(target),
          );
        if (
          !pathOwner ||
          floatingOwners.get(pathOwner) !== this.#host ||
          !(event.target instanceof Element) ||
          !event.target.closest(`[${FLOATING_UI_PLUS_CLOSE_ATTRIBUTE}]`)
        ) {
          return;
        }
        // Closing a conditional child removes its owner synchronously. Do not
        // let the same click continue to a parent surface after that cleanup.
        event.stopPropagation();
        this.engine.context.onOpenChange(false, event, 'click');
      };
      floating.addEventListener('click', handleClick);
      this.#floatingClickCleanup = () =>
        floating.removeEventListener('click', handleClick);
    }
    this.engine.setFloating(floating);
    this.engine.presence.set(floating ? 'mounted' : 'unmounted');
    this.syncBindings();
    if (floating && this.#host.open) {
      this.engine.context.events.emit('openchange', {
        open: true,
        nested: this.engine.context.nested,
      });
    }
  }

  #observeContentScope(scope: Element) {
    this.#contentScopes.get(scope)?.disconnect();
    const observer = new MutationObserver((records) => {
      const markerChanged = records.some(
        (record) =>
          record.type === 'attributes' ||
          Array.from(record.addedNodes).some(
            (node) =>
              node instanceof Element &&
              (node.matches(
                FLOATING_UI_PLUS_CONTENT_TEMPLATE_SELECTOR,
              ) ||
                node.querySelector(
                  FLOATING_UI_PLUS_CONTENT_TEMPLATE_SELECTOR,
                )),
          ) ||
          Array.from(record.removedNodes).some(
            (node) =>
              node === this.#contentTemplate ||
              (node instanceof Element &&
                this.#contentTemplate != null &&
                node.contains(this.#contentTemplate)),
          ),
      );
      if (markerChanged) this.#scheduleContentReconcile();
    });
    observer.observe(scope, {
      attributes: true,
      attributeFilter: [FLOATING_UI_PLUS_CONTENT_ATTRIBUTE, 'slot'],
      childList: true,
      subtree: true,
    });
    this.#contentScopes.set(scope, observer);
  }

  #scheduleContentReconcile(forceRemount = false) {
    this.#forceTemplateRemount ||= forceRemount;
    if (this.#contentReconcileQueued) return;
    this.#contentReconcileQueued = true;
    queueMicrotask(() => {
      this.#contentReconcileQueued = false;
      const remount = this.#forceTemplateRemount;
      this.#forceTemplateRemount = false;
      if (remount) this.#unmountTemplate();
      this.#reconcileContentTemplates();
      this.#syncTemplateMount();
    });
  }

  #reconcileContentTemplates() {
    const templates: HTMLTemplateElement[] = [];
    for (const scope of this.#contentScopes.keys()) {
      for (const template of Array.from(
        scope.querySelectorAll<HTMLTemplateElement>(
          FLOATING_UI_PLUS_CONTENT_TEMPLATE_SELECTOR,
        ),
      )) {
        if (
          !templates.includes(template) &&
          this.#ownsContentTemplate(template)
        ) {
          templates.push(template);
        }
      }
    }

    const nextTemplate = templates.length === 1 ? templates[0]! : null;
    if (templates.length > 1) {
      this.#warnContent(
        'A floating root can own only one template[slot="content"] (or legacy data-fup-content template).',
      );
    } else {
      this.#contentWarning = null;
    }
    if (nextTemplate === this.#contentTemplate) return;

    this.#unmountTemplate();
    this.#templateContentObserver?.disconnect();
    this.#contentTemplate = nextTemplate;
    this.#templateTopLayer = this.#resolveTemplateTopLayer();
    if (!nextTemplate) {
      this.#templateContentObserver = null;
      return;
    }
    this.#templateContentObserver = new MutationObserver(() => {
      this.#scheduleContentReconcile(true);
    });
    this.#templateContentObserver.observe(nextTemplate.content, {
      childList: true,
      subtree: true,
    });
  }

  #ownsContentTemplate(template: HTMLTemplateElement) {
    const nearestRoot = template.closest('floating-root');
    if (nearestRoot) return nearestRoot === this.#host;
    const portalTarget = template.closest('floating-portal-target') as
      | (HTMLElement & {
          contextValue?: {root?: FloatingRootElement};
        })
      | null;
    return !portalTarget || portalTarget.contextValue?.root === this.#host;
  }

  #syncTemplateMount() {
    const shouldMount =
      this.#connected &&
      this.#host.open &&
      this.#contentTemplate != null &&
      this.#manualFloatingElement == null &&
      this.#slottedFloatingElement == null;
    if (!shouldMount) {
      this.#unmountTemplate();
      return;
    }
    if (this.#templateFloatingElement) {
      this.#syncEffectiveFloatingElement();
      return;
    }

    const template = this.#contentTemplate!;
    const meaningfulNodes = Array.from(template.content.childNodes).filter(
      (node) =>
        node.nodeType !== Node.COMMENT_NODE &&
        !(
          node.nodeType === Node.TEXT_NODE &&
          (node.textContent ?? '').trim() === ''
        ),
    );
    const sourceElement = meaningfulNodes[0];
    if (
      meaningfulNodes.length !== 1 ||
      !(sourceElement instanceof Element) ||
      sourceElement.namespaceURI !== 'http://www.w3.org/1999/xhtml'
    ) {
      this.#warnContent(
        'template[slot="content"] must contain exactly one top-level HTMLElement.',
      );
      return;
    }

    const clone = template.ownerDocument.importNode(template.content, true);
    const element = Array.from(clone.children).find(
      (child): child is HTMLElement =>
        child.namespaceURI === 'http://www.w3.org/1999/xhtml',
    );
    if (!element) return;
    this.#templateNodes = Array.from(clone.childNodes);
    template.after(clone);
    template.dispatchEvent(
      new CustomEvent('floatingmount', {
        bubbles: true,
        composed: true,
        detail: {root: this.#host, template, element},
      }),
    );
    this.#templateFloatingElement = element;
    this.#syncEffectiveFloatingElement();
  }

  #unmountTemplate() {
    const template = this.#contentTemplate;
    const element = this.#templateFloatingElement;
    if (!template || !element) return;
    this.#templateFloatingElement = null;
    this.#syncEffectiveFloatingElement();
    template.dispatchEvent(
      new CustomEvent('floatingunmount', {
        bubbles: true,
        composed: true,
        detail: {root: this.#host, template, element},
      }),
    );
    for (const node of this.#templateNodes) {
      node.parentNode?.removeChild(node);
    }
    this.#templateNodes = [];
  }

  #warnContent(message: string) {
    if (message === this.#contentWarning) return;
    this.#contentWarning = message;
    console.warn(`[floating-ui-plus] ${message}`, this.#host);
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
    const surfaceTopLayer = this.#resolveSlottedTopLayer(
      this.#manualFloatingElement ?? this.#slottedFloatingElement,
    );
    const topLayer =
      surfaceTopLayer !== 'none'
        ? surfaceTopLayer
        : this.#templateFloatingElement && this.#templateTopLayer !== 'none'
          ? this.#templateTopLayer
          : this.#host.topLayer;
    this.topLayer.setKind(
      topLayer,
    );
    this.topLayer.setElement(this.#floatingElement);
    if (!this.#floatingElement) return;
    this.#floatingAttributes = setAttributes(
      this.#floatingElement,
      context.attributes.floating ?? {},
      this.#floatingAttributes,
    );
    const nativeTopLayer = this.topLayer.sync(this.#host.open);
    if (!nativeTopLayer) {
      this.#floatingElement.hidden = !this.#host.open;
    }
    this.#floatingElement.dataset.status = this.#host.open ? 'open' : 'closed';
    this.#floatingElement.dataset.placement = this.engine.position.placement;
    if (topLayer !== 'dialog' || !nativeTopLayer) {
      applyFloatingStyles(this.#floatingElement, this.engine.floatingStyles);
    }

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

  #installComponentPluginBridge() {
    if (this.#componentPluginBridgeInstalled) return;
    this.#componentPluginBridgeInstalled = true;
    this.engine.pipe({
      name: 'web-components',
      connect: (context) => {
        this.#componentPluginContext = context;
        this.#connectComponentPlugins(context);
        return () => {
          this.#cleanupComponentPlugins();
          if (this.#componentPluginContext === context) {
            this.#componentPluginContext = null;
          }
        };
      },
      update: (context) => {
        for (const plugin of this.#componentPlugins) {
          plugin.update?.(context);
        }
      },
    });
  }

  #syncComponentPlugins() {
    if (
      this.#componentPluginsSource === this.#host.plugins &&
      this.#componentInteractions === this.#host.interactions &&
      this.#componentFloatingRole === this.#host.floatingRole &&
      this.#syncedRegisteredComponentPluginsVersion ===
        this.#registeredComponentPluginsVersion
    ) {
      return;
    }
    this.#componentPluginsSource = this.#host.plugins;
    this.#componentInteractions = this.#host.interactions;
    this.#componentFloatingRole = this.#host.floatingRole;
    this.#syncedRegisteredComponentPluginsVersion =
      this.#registeredComponentPluginsVersion;

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
    plugins.push(
      ...Array.from(
        this.#registeredComponentPlugins.values(),
        (value) => [...value],
      ).flat(),
    );
    this.#componentPlugins = plugins;
    if (this.#componentPluginContext) {
      this.#connectComponentPlugins(this.#componentPluginContext);
    }
  }

  #connectComponentPlugins(context: FloatingContext) {
    this.#cleanupComponentPlugins();
    for (const plugin of this.#componentPlugins) {
      const cleanup = plugin.connect(context);
      if (cleanup) this.#componentPluginCleanups.push(cleanup);
    }
  }

  #cleanupComponentPlugins() {
    this.#componentPluginCleanups
      .splice(0)
      .reverse()
      .forEach((cleanup) => cleanup());
  }
}

export type CommitOpenChange = (
  open: boolean,
  event?: Event,
  reason?: OpenChangeReason,
) => void;
