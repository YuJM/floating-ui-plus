import type {
  ComboboxController,
  SearchController,
  SearchPhase,
  SearchSnapshot,
} from '@floating-ui-plus/web';

import type {FloatingComponentContext} from './component-context';

interface FloatingContextProviderElement extends Element {
  contextValue?: FloatingComponentContext | undefined;
}

interface FloatingComboboxControllerElement extends Element {
  controller?: ComboboxController<unknown> | undefined;
}

export const FLOATING_SEARCH_PHASES: readonly SearchPhase[] = [
  'idle',
  'loading',
  'error',
  'empty',
  'results',
];

function findTemplate(host: Element, phase: SearchPhase) {
  const name = phase === 'results' ? 'result' : phase;
  return Array.from(host.children).find(
    (element): element is HTMLTemplateElement =>
      element instanceof HTMLTemplateElement &&
      element.hasAttribute(`data-search-${name}`),
  );
}

function readPath(value: unknown, path: string): unknown {
  let current = value;
  for (const segment of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function getTextValue<T>(
  binding: string,
  snapshot: SearchSnapshot<T>,
  item: T | undefined,
  index: number | undefined,
) {
  if (binding === '$query') return snapshot.query;
  if (binding === '$index') return index;
  if (binding === '$count') return snapshot.items.length;
  if (binding === '$error') {
    return snapshot.error instanceof Error
      ? snapshot.error.message
      : snapshot.error;
  }
  return readPath(item, binding);
}

function bindTemplate<T>(
  fragment: DocumentFragment,
  snapshot: SearchSnapshot<T>,
  item?: T,
  index?: number,
) {
  for (const element of Array.from(
    fragment.querySelectorAll<HTMLElement>('[data-search-text]'),
  )) {
    const binding = element.dataset.searchText;
    if (!binding) continue;
    const value = getTextValue(binding, snapshot, item, index);
    element.textContent = value == null ? '' : String(value);
  }
}

/**
 * Declaratively renders every SearchController phase from native templates.
 *
 * Provide `template[data-search-idle|loading|error|empty]` and one
 * `template[data-search-result]`. The result template is repeated for every
 * item. `data-search-text="field.path"` binds item text; `$query`, `$index`,
 * `$count`, and `$error` bind search metadata.
 */
export class FloatingSearchElement<T = unknown> extends HTMLElement {
  #search: SearchController<T> | undefined;
  #getItemLabel: ((item: T) => string) | undefined;
  #onRender: (() => void) | undefined;
  #unsubscribe: (() => void) | undefined;
  #renderedNodes: Node[] = [];

  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<style>:host{display:contents}</style><slot></slot>';
  }

  connectedCallback() {
    this.#adoptComboboxContext();
    this.#subscribe();
    this.render();
    queueMicrotask(() => {
      if (!this.isConnected || this.#search) return;
      this.#adoptComboboxContext();
      this.#subscribe();
      this.render();
    });
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  get search() {
    return this.#search;
  }

  set search(value: SearchController<T> | undefined) {
    if (value === this.#search) return;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#search = value;
    this.#subscribe();
    this.render();
  }

  get getItemLabel() {
    return this.#getItemLabel;
  }

  set getItemLabel(value: ((item: T) => string) | undefined) {
    if (value === this.#getItemLabel) return;
    this.#getItemLabel = value;
    this.render();
  }

  get onRender() {
    return this.#onRender;
  }

  set onRender(value: (() => void) | undefined) {
    this.#onRender = value;
  }

  render() {
    this.#renderedNodes.forEach((node) => node.parentNode?.removeChild(node));
    this.#renderedNodes = [];
    const search = this.#search;
    if (!search) {
      this.removeAttribute('data-phase');
      return;
    }

    const snapshot = search.snapshot;
    this.dataset.phase = snapshot.phase;
    const template = findTemplate(this, snapshot.phase);
    if (!template) return;

    const fragment = document.createDocumentFragment();
    const resultBindings: Array<{
      element: HTMLElement;
      item: T;
      label: string;
    }> = [];
    if (snapshot.phase === 'results') {
      snapshot.items.forEach((item, index) => {
        const itemFragment = template.content.cloneNode(
          true,
        ) as DocumentFragment;
        bindTemplate(itemFragment, snapshot, item, index);
        for (const listItem of Array.from(
          itemFragment.querySelectorAll('floating-list-item'),
        )) {
          const label =
            this.#getItemLabel?.(item) ??
            String(readPath(item, 'label') ?? item ?? '');
          listItem.setAttribute('label', label);
          resultBindings.push({element: listItem, item, label});
        }
        fragment.append(itemFragment);
      });
    } else {
      const phaseFragment = template.content.cloneNode(
        true,
      ) as DocumentFragment;
      bindTemplate(phaseFragment, snapshot);
      fragment.append(phaseFragment);
    }

    this.#renderedNodes = Array.from(fragment.childNodes);
    this.append(fragment);
    for (const {element, item, label} of resultBindings) {
      const listItem = element as HTMLElement & {
        label: string;
        value: T;
      };
      listItem.label = label;
      listItem.value = item;
    }
    queueMicrotask(() => this.#onRender?.());
  }

  #subscribe() {
    if (!this.isConnected || !this.#search || this.#unsubscribe) return;
    this.#unsubscribe = this.#search.subscribe(() => this.render());
  }

  #adoptComboboxContext() {
    if (this.#search) return;
    const portalTarget = this.closest(
      'floating-portal-target',
    ) as FloatingContextProviderElement | null;
    const localCombobox = this.closest(
      'floating-combobox',
    ) as FloatingComboboxControllerElement | null;
    const combobox =
      portalTarget?.contextValue?.combobox ?? localCombobox?.controller;
    if (!combobox) return;
    this.#search = combobox.search as SearchController<T>;
    this.#getItemLabel = (item) =>
      combobox.getItemLabel(item as unknown) as string;
    this.#onRender ??= () => {
      const root =
        portalTarget?.contextValue?.root ?? this.closest('floating-root');
      if (root && 'controller' in root) {
        (root as {controller: {refresh(): void}}).controller.refresh();
      }
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-search': FloatingSearchElement;
  }
}
