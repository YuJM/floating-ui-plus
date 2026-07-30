import type {
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
