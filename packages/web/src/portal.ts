import type {FloatingContextScope} from './contextScope';
import {FLOATING_UI_PLUS_PORTAL_ATTRIBUTE} from './constants';

export type PortalTarget = EventTarget | null | undefined;
export type PortalTargetResolver = () => PortalTarget;
export type PortalTargetSource = PortalTarget | PortalTargetResolver;
export type PortalBridgeStatus =
  | 'detached'
  | 'pending'
  | 'attached'
  | 'destroyed';

export type PortalRootResolver = () => HTMLElement | null | undefined;
export type PortalRoot = HTMLElement | PortalRootResolver | null | undefined;

export interface PortalNodeOptions {
  id?: string | undefined;
  root?: PortalRoot;
  ownerDocument?: Document | null | undefined;
  preserveTabOrder?: boolean | undefined;
  contextScope?: FloatingContextScope | null | undefined;
}

export interface PortalBridgeOptions {
  contextScope?: FloatingContextScope | null | undefined;
  target?: PortalTargetSource;
}

/**
 * Framework-neutral lifecycle for a portal attachment target.
 *
 * Renderers own moving their content and call connect/refresh/disconnect from
 * their lifecycle. The bridge owns pending target resolution and Web context
 * attachment cleanup.
 */
export class PortalBridge {
  #contextScope: FloatingContextScope | null;
  #targetSource: PortalTargetSource;
  #target: EventTarget | null = null;
  #cleanup: (() => void) | null = null;
  #connected = false;
  #status: PortalBridgeStatus = 'detached';
  #destroyed = false;

  constructor(options: PortalBridgeOptions = {}) {
    this.#contextScope = options.contextScope ?? null;
    this.#targetSource = options.target;
  }

  get target() {
    return this.#target;
  }

  get status() {
    return this.#status;
  }

  get connected() {
    return this.#connected;
  }

  setTarget(target: PortalTargetSource) {
    if (this.#destroyed) return;
    this.#targetSource = target;
    if (this.#connected) this.refresh();
  }

  connect(target?: PortalTargetSource) {
    if (this.#destroyed) return null;
    if (arguments.length > 0) this.#targetSource = target;
    this.#connected = true;
    return this.refresh();
  }

  refresh() {
    if (this.#destroyed) return null;
    if (!this.#connected) {
      this.#status = 'detached';
      return null;
    }

    let target: PortalTarget;
    try {
      target =
        typeof this.#targetSource === 'function'
          ? this.#targetSource()
          : this.#targetSource;
    } catch (error) {
      this.#setResolvedTarget(null);
      this.#status = 'pending';
      throw error;
    }

    this.#setResolvedTarget(target ?? null);
    this.#status = this.#target ? 'attached' : 'pending';
    return this.#target;
  }

  disconnect() {
    if (this.#destroyed) return;
    this.#connected = false;
    this.#setResolvedTarget(null);
    this.#status = 'detached';
  }

  attach(target: PortalTarget) {
    if (this.#destroyed) return;
    this.#targetSource = target;
    this.#connected = true;
    this.refresh();
  }

  move(target: PortalTarget) {
    this.attach(target);
  }

  setContextScope(scope: FloatingContextScope | null | undefined) {
    if (this.#destroyed) return;
    if (scope === this.#contextScope) return;
    this.#contextScope = scope ?? null;
    this.#attachContext(true);
  }

  detach() {
    if (this.#destroyed) return;
    this.#targetSource = null;
    this.disconnect();
  }

  destroy() {
    if (this.#destroyed) return;
    this.disconnect();
    this.#destroyed = true;
    this.#status = 'destroyed';
    this.#targetSource = null;
    this.#contextScope = null;
  }

  #setResolvedTarget(target: EventTarget | null) {
    if (target !== this.#target) {
      this.#cleanup?.();
      this.#cleanup = null;
      this.#target = target;
    }
    this.#attachContext();
  }

  #attachContext(force = false) {
    if (force) {
      this.#cleanup?.();
      this.#cleanup = null;
    }
    if (
      this.#connected &&
      !this.#cleanup &&
      this.#target &&
      this.#contextScope
    ) {
      this.#cleanup = this.#contextScope.attach(this.#target);
    }
  }
}

const portalBridges = new WeakMap<HTMLElement, PortalBridge>();

export function createPortalBridge(options: PortalBridgeOptions = {}) {
  return new PortalBridge(options);
}

export function resolvePortalRoot(
  root: PortalRoot,
  ownerDocument: Document | null = getGlobalDocument(),
) {
  if (typeof root === 'function') return root() ?? null;
  if (root) return root;
  return ownerDocument?.body ?? null;
}

export function createPortalNode(options: PortalNodeOptions = {}) {
  const root = resolvePortalRoot(
    options.root,
    options.ownerDocument === undefined
      ? getGlobalDocument()
      : options.ownerDocument,
  );
  if (!root) return null;
  const node = getOrCreatePortalNode(root, options.id);
  attachPortalContext(node, options.contextScope);
  return node;
}

/**
 * Owns creation and cleanup of a portal node whose root may not exist yet.
 * Framework adapters only need to call connect/refresh/disconnect.
 */
export class PortalNodeController {
  #options: PortalNodeOptions;
  #bridge: PortalBridge;
  #node: HTMLElement | null = null;
  #root: HTMLElement | null = null;
  #resolvedId: string | undefined;
  #destroyed = false;

  constructor(options: PortalNodeOptions = {}) {
    this.#options = options;
    this.#bridge = createPortalBridge({
      contextScope: options.contextScope,
      target: () => this.#resolveNode(),
    });
  }

  get node() {
    return this.#node;
  }

  get status() {
    return this.#bridge.status;
  }

  get connected() {
    return this.#bridge.connected;
  }

  updateOptions(options: PortalNodeOptions) {
    if (this.#destroyed) return null;
    this.#options = options;
    this.#bridge.setContextScope(options.contextScope);
    return this.#bridge.connected ? this.refresh() : this.#node;
  }

  connect() {
    if (this.#destroyed) return null;
    this.#bridge.connect();
    return this.#node;
  }

  refresh() {
    if (this.#destroyed) return null;
    this.#bridge.refresh();
    return this.#node;
  }

  disconnect() {
    if (this.#destroyed) return;
    this.#bridge.disconnect();
    this.#releaseNode();
  }

  destroy() {
    if (this.#destroyed) return;
    this.#bridge.destroy();
    this.#releaseNode();
    this.#destroyed = true;
  }

  #resolveNode() {
    const root = resolvePortalRoot(
      this.#options.root,
      this.#options.ownerDocument === undefined
        ? getGlobalDocument()
        : this.#options.ownerDocument,
    );
    if (!root) {
      this.#releaseNode();
      return null;
    }
    if (
      this.#node &&
      this.#root === root &&
      this.#resolvedId === this.#options.id
    ) {
      return this.#node;
    }

    this.#releaseNode();
    this.#root = root;
    this.#resolvedId = this.#options.id;
    this.#node = getOrCreatePortalNode(root, this.#options.id);
    return this.#node;
  }

  #releaseNode() {
    const node = this.#node;
    this.#node = null;
    this.#root = null;
    this.#resolvedId = undefined;
    if (node?.hasAttribute(FLOATING_UI_PLUS_PORTAL_ATTRIBUTE)) node.remove();
  }
}

export function createPortalNodeController(options: PortalNodeOptions = {}) {
  return new PortalNodeController(options);
}

export function removePortalNode(node: HTMLElement | null) {
  if (node) {
    portalBridges.get(node)?.destroy();
    portalBridges.delete(node);
  }
  if (node?.hasAttribute(FLOATING_UI_PLUS_PORTAL_ATTRIBUTE)) node.remove();
}

function getOrCreatePortalNode(root: HTMLElement, id?: string) {
  if (id) {
    const existing = Array.from(
      root.querySelectorAll<HTMLElement>('[id]'),
    ).find((element) => element.id === id);
    if (existing) return existing;
  }

  const node = root.ownerDocument.createElement('div');
  node.setAttribute(FLOATING_UI_PLUS_PORTAL_ATTRIBUTE, '');
  if (id) node.id = id;
  root.append(node);
  return node;
}

function attachPortalContext(
  node: HTMLElement,
  scope: FloatingContextScope | null | undefined,
) {
  let bridge = portalBridges.get(node);
  if (!bridge) {
    bridge = createPortalBridge({contextScope: scope, target: node});
    bridge.connect();
    portalBridges.set(node, bridge);
  } else {
    bridge.setContextScope(scope);
    bridge.attach(node);
  }
}

function getGlobalDocument() {
  return typeof document === 'undefined' ? null : document;
}
