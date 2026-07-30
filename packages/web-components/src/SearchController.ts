import type {ReactiveController, ReactiveControllerHost} from 'lit';
import {
  SearchController as WebSearchController,
  type ControlledSearchState,
  type SearchOptions,
  type SearchSnapshot,
} from '@floating-ui-plus/web';

export type SearchOptionsSource<T> =
  | SearchOptions<T>
  | (() => SearchOptions<T>);

function getOptions<T>(source: SearchOptionsSource<T>) {
  return typeof source === 'function'
    ? (source as () => SearchOptions<T>)()
    : source;
}

/** Lit lifecycle adapter for generic search request state. */
export class SearchController<T> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #source: SearchOptionsSource<T>;
  readonly #controller: WebSearchController<T>;
  #unsubscribe: (() => void) | null = null;
  #controlledItems: readonly unknown[] | undefined;
  #controlledLoading: boolean | undefined;
  #controlledError: unknown;
  #controlledTotal: number | undefined;
  #controlledCursor: string | undefined;

  constructor(
    host: ReactiveControllerHost,
    options: SearchOptionsSource<T>,
  ) {
    this.#host = host;
    this.#source = options;
    this.#controller = new WebSearchController(getOptions(options));
    host.addController(this);
  }

  get state(): SearchSnapshot<T> {
    return this.#controller.snapshot;
  }

  get query() {
    return this.#controller.query;
  }

  get items() {
    return this.#controller.items;
  }

  get hits() {
    return this.#controller.hits;
  }

  get loading() {
    return this.#controller.loading;
  }

  get error() {
    return this.#controller.error;
  }

  get hasMore() {
    return this.#controller.hasMore;
  }

  setQuery(query: string) {
    this.#controller.setQuery(query);
  }

  startComposition() {
    this.#controller.startComposition();
  }

  endComposition(query?: string) {
    this.#controller.endComposition(query);
  }

  refresh() {
    return this.#controller.refresh();
  }

  loadMore() {
    return this.#controller.loadMore();
  }

  setControlledState(state: ControlledSearchState<T>) {
    this.#controller.setControlledState(state);
  }

  hostConnected() {
    this.#unsubscribe = this.#controller.subscribe(() => {
      this.#host.requestUpdate();
    });
    this.#syncOptions();
    this.#controller.connect();
  }

  hostUpdate() {
    this.#syncOptions();
  }

  hostDisconnected() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#controller.disconnect();
  }

  destroy() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#controller.destroy();
  }

  #syncOptions() {
    const options = getOptions(this.#source);
    this.#controller.setOptions(options);
    if (
      options.items &&
      (options.items !== this.#controlledItems ||
        options.loading !== this.#controlledLoading ||
        options.error !== this.#controlledError ||
        options.total !== this.#controlledTotal ||
        options.nextCursor !== this.#controlledCursor)
    ) {
      this.#controlledItems = options.items;
      this.#controlledLoading = options.loading;
      this.#controlledError = options.error;
      this.#controlledTotal = options.total;
      this.#controlledCursor = options.nextCursor;
      this.#controller.setControlledState({
        items: options.items,
        loading: options.loading,
        error: options.error,
        total: options.total,
        nextCursor: options.nextCursor,
      });
    }
  }
}
