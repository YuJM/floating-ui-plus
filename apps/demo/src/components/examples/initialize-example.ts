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
