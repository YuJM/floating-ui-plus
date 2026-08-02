export type ExampleScope = HTMLElement;

export function initializeExample(
  name: string,
  setup: (scope: ExampleScope) => void,
) {
  if (document.documentElement.dataset.framework === 'vue') return;
  const initialize = () => {
    const scope = document.getElementById(`${name}-demo`) as ExampleScope | null;
    if (!scope || scope.dataset.initialized === 'true') return;
    setup(scope);
    scope.dataset.initialized = 'true';
  };

  // Layout-level registration is intentionally loaded before examples, but it
  // is a dynamic module import. Wait for the custom-element upgrade before a
  // demo calls element APIs such as `configure()` or `query()`.
  if (customElements.get('floating-root')) {
    initialize();
  } else {
    void customElements.whenDefined('floating-root').then(initialize);
  }
}
