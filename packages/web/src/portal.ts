import type {FloatingContextScope} from './contextScope';

export interface PortalNodeOptions {
  id?: string | undefined;
  root?: HTMLElement | null | undefined;
  preserveTabOrder?: boolean | undefined;
  contextScope?: FloatingContextScope | null | undefined;
}

const contextCleanups = new WeakMap<HTMLElement, () => void>();

export function createPortalNode(options: PortalNodeOptions = {}) {
  if (typeof document === 'undefined') return null;
  const root = options.root || document.body;
  if (options.id) {
    const existing = Array.from(
      root.querySelectorAll<HTMLElement>('[id]'),
    ).find((element) => element.id === options.id);
    if (existing) {
      attachPortalContext(existing, options.contextScope);
      return existing;
    }
  }

  const node = root.ownerDocument.createElement('div');
  node.setAttribute('data-floating-ui-portal', '');
  if (options.id) node.id = options.id;
  root.append(node);
  attachPortalContext(node, options.contextScope);
  return node;
}

export function removePortalNode(node: HTMLElement | null) {
  if (node) {
    contextCleanups.get(node)?.();
    contextCleanups.delete(node);
  }
  if (node?.hasAttribute('data-floating-ui-portal')) node.remove();
}

function attachPortalContext(
  node: HTMLElement,
  scope: FloatingContextScope | null | undefined,
) {
  contextCleanups.get(node)?.();
  contextCleanups.delete(node);
  if (scope) contextCleanups.set(node, scope.attach(node));
}
