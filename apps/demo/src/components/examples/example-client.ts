import type {
  FloatingContentElement,
  FloatingOpenChangeDetail,
  FloatingPlugin,
  FloatingRootElement,
} from '@floating-ui-plus/web-components';

export type ExampleScope = HTMLElement;

export function initializeExample(
  name: string,
  setup: (scope: ExampleScope) => void,
) {
  if (document.documentElement.dataset.framework === 'vue') return;
  const scope = document.querySelector<ExampleScope>(`[data-demo="${name}"]`);
  if (!scope || scope.dataset.initialized === 'true') return;
  setup(scope);
  scope.dataset.initialized = 'true';
}

export function floatingRoot(scope: ParentNode, selector: string) {
  const element = scope.querySelector(selector);
  if (!(element instanceof HTMLElement) || element.localName !== 'floating-root') {
    throw new Error(`Missing FloatingRootElement for ${selector}`);
  }
  return element as FloatingRootElement;
}

export function floatingContent(scope: ParentNode, selector: string) {
  const ownerDocument =
    scope instanceof Document ? scope : scope.ownerDocument ?? document;
  const element =
    scope.querySelector(selector) ?? ownerDocument.querySelector(selector);
  if (
    !(element instanceof HTMLElement) ||
    element.localName !== 'floating-content'
  ) {
    throw new Error(`Missing FloatingContentElement for ${selector}`);
  }
  return element as FloatingContentElement;
}

export function floatingTemplateContent(element: FloatingContentElement) {
  const template =
    element.template ??
    Array.from(element.children).find(
      (child): child is HTMLTemplateElement =>
        child instanceof HTMLTemplateElement,
    ) ??
    null;
  const content = template?.content;
  if (!content) {
    throw new Error('FloatingContentElement requires a direct template child');
  }
  return content;
}

export function onFloatingContentMount(
  element: FloatingContentElement,
  listener: () => void,
) {
  const sync = () => {
    if (
      Array.from(element.children).some(
        (child) => !(child instanceof HTMLTemplateElement),
      )
    ) {
      listener();
    }
  };
  const observer = new MutationObserver(sync);
  observer.observe(element, {childList: true});
  sync();
  return () => observer.disconnect();
}

export function configureFloating(
  element: FloatingRootElement,
  options: {
    middleware?: FloatingRootElement['middleware'];
    plugins?: FloatingPlugin[];
  },
) {
  if (options.middleware) element.middleware = options.middleware;
  if (options.plugins) element.plugins = options.plugins;
}

export function closeFloating(
  element: FloatingRootElement,
  event: Event,
  reason: 'click' | 'escape-key' = 'click',
) {
  element.controller.context.onOpenChange(false, event, reason);
}

export function emitExampleAction(scope: ExampleScope, message: string) {
  scope.dispatchEvent(
    new CustomEvent('floating-demo-action', {
      bubbles: true,
      composed: true,
      detail: message,
    }),
  );
}

export function onFloatingOpenChange(
  element: FloatingRootElement,
  listener: (detail: FloatingOpenChangeDetail) => void,
) {
  element.addEventListener('openchange', (event) => {
    listener((event as CustomEvent<FloatingOpenChangeDetail>).detail);
  });
}

export function activeItems(items: HTMLElement[], refresh: () => void) {
  let index: number | null = null;
  return {
    get value() {
      return index;
    },
    set(next: number | null) {
      index = next;
      items.forEach((item, itemIndex) => {
        item.tabIndex = itemIndex === next ? 0 : -1;
        item.dataset.active = String(itemIndex === next);
      });
      refresh();
    },
  };
}
