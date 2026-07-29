export interface PortalNodeOptions {
  id?: string | undefined;
  root?: HTMLElement | null | undefined;
  preserveTabOrder?: boolean | undefined;
}

export function createPortalNode(options: PortalNodeOptions = {}) {
  if (typeof document === 'undefined') return null;
  const root = options.root || document.body;
  if (options.id) {
    const existing = Array.from(
      root.querySelectorAll<HTMLElement>('[id]'),
    ).find((element) => element.id === options.id);
    if (existing) return existing;
  }

  const node = root.ownerDocument.createElement('div');
  node.setAttribute('data-floating-ui-portal', '');
  if (options.id) node.id = options.id;
  root.append(node);
  return node;
}

export function removePortalNode(node: HTMLElement | null) {
  if (node?.hasAttribute('data-floating-ui-portal')) node.remove();
}
