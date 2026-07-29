const scrollLocks = new WeakMap<
  Document,
  {count: number; overflow: string; paddingRight: string}
>();

export function lockScroll(document: Document): () => void {
  const existing = scrollLocks.get(document);
  if (existing) {
    existing.count++;
  } else {
    const body = document.body;
    const scrollbarWidth =
      (document.defaultView?.innerWidth ||
        document.documentElement.clientWidth) -
      document.documentElement.clientWidth;
    scrollLocks.set(document, {
      count: 1,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    });
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  }

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    const state = scrollLocks.get(document);
    if (!state || --state.count > 0) return;
    document.body.style.overflow = state.overflow;
    document.body.style.paddingRight = state.paddingRight;
    scrollLocks.delete(document);
  };
}

export interface OverlayOptions {
  lockScroll?: boolean | undefined;
}

export function createOverlayElement(
  document: Document,
  options: OverlayOptions = {},
) {
  const element = document.createElement('div');
  element.setAttribute('data-floating-ui-overlay', '');
  Object.assign(element.style, {
    position: 'fixed',
    inset: '0',
  });
  const unlock = options.lockScroll ? lockScroll(document) : () => {};
  return {element, destroy: unlock};
}
