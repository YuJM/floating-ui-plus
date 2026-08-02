import type {
  QueryController,
  SearchController,
  SearchPhase,
  SearchSnapshot,
} from '@floating-ui-plus/web';

import type {FloatingComponentContext} from './component-context';

interface FloatingContextProviderElement extends Element {
  contextValue?: FloatingComponentContext | undefined;
}

interface FloatingQueryControllerElement extends Element {
  controller?: QueryController<unknown> | undefined;
}

export const FLOATING_SEARCH_PHASES: readonly SearchPhase[] = [
  'idle',
  'loading',
  'error',
  'empty',
  'results',
];

type ResultsTemplate = HTMLTemplateElement | HTMLElement;

function findTemplate(host: Element, phase: SearchPhase): ResultsTemplate | undefined {
  const name = phase === 'results' ? 'result' : phase;
  const template = Array.from(host.children).find(
    (element): element is ResultsTemplate =>
      (element instanceof HTMLTemplateElement &&
        element.hasAttribute(`data-search-${name}`)) ||
      (element.localName === 'floating-results-status' &&
        element.getAttribute('type') === name) ||
      element.localName === `floating-results-${name === 'result' ? 'item' : name}`,
  );
  if (template instanceof HTMLElement) preparePartTemplate(template);
  return template;
}

function findLoadMoreTemplate(host: Element): ResultsTemplate | undefined {
  const template = Array.from(host.children).find(
    (element): element is ResultsTemplate =>
      (element instanceof HTMLTemplateElement &&
        element.hasAttribute('data-search-more')) ||
      element.localName === 'floating-results-more',
  );
  if (template instanceof HTMLElement) preparePartTemplate(template);
  return template;
}

function preparePartTemplate(part: HTMLElement) {
  const typedPart = part as HTMLElement & {
    prepareTemplate?: () => HTMLTemplateElement;
  };
  if (typedPart.prepareTemplate) return typedPart.prepareTemplate();
  const template = document.createElement('template');
  while (part.firstChild) {
    template.content.append(part.firstChild);
  }
  part.append(template);
  return template;
}

function cloneTemplateContent(template: ResultsTemplate) {
  if (template instanceof HTMLTemplateElement) {
    return template.content.cloneNode(true) as DocumentFragment;
  }
  return preparePartTemplate(template).content.cloneNode(true) as DocumentFragment;
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
  if (binding === '$total') return snapshot.total;
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
 * Prefer `<floating-results-status type="idle|loading|error|empty">` and one
 * `<floating-results-item>` child. The item child is repeated for every
 * result. An optional `<floating-results-more>` is appended when the source
 * exposes a next cursor; a descendant marked `data-search-load-more` requests
 * that next page. The earlier `template[data-search-*]` form and deprecated
 * phase-specific result part names remain supported. `data-search-text="field.path"`
 * binds item text; `$query`, `$index`, `$count`, `$total`, and `$error` bind
 * search metadata.
 */
export class FloatingResultsElement<T = unknown> extends HTMLElement {
  #search: SearchController<T> | undefined;
  #query: QueryController<T> | undefined;
  #getItemLabel: ((item: T) => string) | undefined;
  #onRender: (() => void) | undefined;
  #unsubscribe: (() => void) | undefined;
  #renderedNodes: Node[] = [];

  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<style>:host{display:block}</style><slot></slot>';
  }

  connectedCallback() {
    this.#adoptQueryContext();
    this.#subscribe();
    this.render();
    queueMicrotask(() => {
      if (!this.isConnected || this.#search) return;
      this.#adoptQueryContext();
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

  get query() {
    return this.#query;
  }

  set query(value: QueryController<T> | undefined) {
    if (value === this.#query) return;
    this.#query = value;
    this.render();
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
      this.removeAttribute('data-loading');
      return;
    }

    const snapshot = search.snapshot;
    this.dataset.phase = snapshot.phase;
    this.dataset.loading = String(snapshot.loading);
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
        const itemFragment = cloneTemplateContent(template);
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
      const loadMoreTemplate = findLoadMoreTemplate(this);
      if (snapshot.hasMore && loadMoreTemplate) {
        const loadMoreFragment = cloneTemplateContent(loadMoreTemplate);
        bindTemplate(loadMoreFragment, snapshot);
        for (const control of Array.from(
          loadMoreFragment.querySelectorAll<HTMLElement>(
            '[data-search-load-more]',
          ),
        )) {
          control.dataset.loading = String(snapshot.loading);
          control.setAttribute('aria-busy', String(snapshot.loading));
          if (control instanceof HTMLButtonElement) {
            control.disabled = snapshot.loading;
          }
          control.addEventListener('mousedown', (event) => {
            event.preventDefault();
          });
          control.addEventListener('click', (event) => {
            event.preventDefault();
            void search.loadMore();
          });
        }
        fragment.append(loadMoreFragment);
      }
    } else {
      const phaseFragment = cloneTemplateContent(template);
      bindTemplate(phaseFragment, snapshot);
      fragment.append(phaseFragment);
    }

    this.#renderedNodes = Array.from(fragment.childNodes);
    this.append(fragment);
    for (const {element, item, label} of resultBindings) {
      const listItem = element as HTMLElement & {
        label: string;
        value: T;
        query?: QueryController<T> | undefined;
      };
      listItem.label = label;
      listItem.value = item;
      listItem.query = this.#query;
    }
    queueMicrotask(() => this.#onRender?.());
  }

  #subscribe() {
    if (!this.isConnected || !this.#search || this.#unsubscribe) return;
    this.#unsubscribe = this.#search.subscribe(() => this.render());
  }

  #adoptQueryContext() {
    if (this.#search) return;
    const portalTarget = this.closest(
      'floating-portal-target',
    ) as FloatingContextProviderElement | null;
    const localQuery = this.closest(
      'floating-query, floating-combobox',
    ) as FloatingQueryControllerElement | null;
    const query =
      portalTarget?.contextValue?.query ??
      portalTarget?.contextValue?.combobox ??
      localQuery?.controller;
    if (!query) return;
    this.#search = query.search as SearchController<T>;
    this.#query = query as QueryController<T>;
    this.#getItemLabel = (item) =>
      query.getItemLabel(item as unknown) as string;
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
    'floating-results': FloatingResultsElement;
    /** @deprecated Use `floating-results`. */
    'floating-search': FloatingSearchElement;
  }
}

/** @deprecated Use `FloatingResultsElement`. */
export class FloatingSearchElement<T = unknown> extends FloatingResultsElement<T> {}
