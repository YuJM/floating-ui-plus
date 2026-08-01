export interface SearchRequest {
  query: string;
  signal: AbortSignal;
  limit: number;
  cursor?: string | undefined;
}

export interface SearchHitMatch {
  field: string;
  ranges?: ReadonlyArray<readonly [number, number]> | undefined;
}

export interface SearchHit<T> {
  item: T;
  score?: number | undefined;
  matches?: readonly SearchHitMatch[] | undefined;
}

export type SearchSourceItem<T> = T | SearchHit<T>;

export interface SearchPage<T> {
  items: readonly SearchSourceItem<T>[];
  total?: number | undefined;
  nextCursor?: string | undefined;
}

export interface SearchSource<T> {
  search(request: SearchRequest): Promise<SearchPage<T>>;
}

export interface AsyncSearchSourceOptions<T> {
  search(request: SearchRequest): Promise<SearchPage<T>>;
}

export function createAsyncSearchSource<T>(
  options: AsyncSearchSourceOptions<T>,
): SearchSource<T> {
  return {search: options.search};
}

export interface ControlledSearchState<T> {
  items: readonly SearchSourceItem<T>[];
  loading?: boolean | undefined;
  error?: unknown;
  total?: number | undefined;
  nextCursor?: string | undefined;
}

export interface SearchOptions<T> {
  source?: SearchSource<T> | undefined;
  items?: readonly SearchSourceItem<T>[] | undefined;
  loading?: boolean | undefined;
  error?: unknown;
  total?: number | undefined;
  nextCursor?: string | undefined;
  getItemKey(item: T): string | number;
  debounceMs?: number | undefined;
  minQueryLength?: number | undefined;
  limit?: number | undefined;
  cacheTtlMs?: number | undefined;
  initialQuery?: string | undefined;
  onQueryChange?: ((query: string) => void) | undefined;
}

/**
 * Rendering-oriented phase derived from a search request and its current
 * query. `idle` means that both the query and current result set are empty.
 */
export type SearchPhase = 'idle' | 'loading' | 'error' | 'empty' | 'results';

export interface SearchSnapshot<T> {
  query: string;
  items: readonly T[];
  hits: readonly SearchHit<T>[];
  phase: SearchPhase;
  loading: boolean;
  error: unknown;
  composing: boolean;
  hasMore: boolean;
  total?: number | undefined;
  nextCursor?: string | undefined;
}

interface CacheEntry<T> {
  expiresAt: number;
  page: SearchPage<T>;
}

function isSearchHit<T>(value: SearchSourceItem<T>): value is SearchHit<T> {
  return (
    value != null &&
    typeof value === 'object' &&
    'item' in value &&
    ('score' in value || 'matches' in value)
  );
}

function toHit<T>(value: SearchSourceItem<T>): SearchHit<T> {
  return isSearchHit(value) ? value : {item: value};
}

/**
 * Framework-neutral search request state.
 *
 * This intentionally has no combobox concepts: open state, active option,
 * selection, ARIA, focus, and rendering belong to the consumer.
 */
export class SearchController<T> {
  #options: SearchOptions<T>;
  #listeners = new Set<(snapshot: SearchSnapshot<T>) => void>();
  #cache = new Map<string, CacheEntry<T>>();
  #timer: ReturnType<typeof setTimeout> | null = null;
  #abortController: AbortController | null = null;
  #requestId = 0;
  #destroyed = false;
  #connected = true;

  query: string;
  items: readonly T[] = [];
  hits: readonly SearchHit<T>[] = [];
  loading = false;
  error: unknown = null;
  composing = false;
  hasMore = false;
  total: number | undefined;
  nextCursor: string | undefined;

  constructor(options: SearchOptions<T>) {
    this.#options = options;
    this.query = options.initialQuery ?? '';
    if (options.items) {
      this.setControlledState({
        items: options.items,
        loading: options.loading,
        error: options.error,
        total: options.total,
        nextCursor: options.nextCursor,
      });
    }
  }

  get snapshot(): SearchSnapshot<T> {
    return {
      query: this.query,
      items: this.items,
      hits: this.hits,
      phase: this.phase,
      loading: this.loading,
      error: this.error,
      composing: this.composing,
      hasMore: this.hasMore,
      ...(this.total == null ? {} : {total: this.total}),
      ...(this.nextCursor == null ? {} : {nextCursor: this.nextCursor}),
    };
  }

  get connected() {
    return this.#connected && !this.#destroyed;
  }

  /**
   * The current rendering phase. This does not prescribe UI copy or markup;
   * renderers can use `idle` for query prompts and `empty` for a no-results
   * state without duplicating loading/error precedence rules.
   */
  get phase(): SearchPhase {
    if (this.loading) return 'loading';
    if (this.error != null) return 'error';
    if (this.items.length) return 'results';
    if (!this.query.trim()) return 'idle';
    return 'empty';
  }

  getItemKey(item: T) {
    return this.#options.getItemKey(item);
  }

  subscribe(listener: (snapshot: SearchSnapshot<T>) => void) {
    this.#listeners.add(listener);
    listener(this.snapshot);
    return () => this.#listeners.delete(listener);
  }

  setOptions(options: Partial<SearchOptions<T>>) {
    this.#options = {...this.#options, ...options};
  }

  setQuery(query: string) {
    if (this.#destroyed) return;
    this.query = query;
    this.#options.onQueryChange?.(query);
    this.#emit();
    if (!this.#options.source || this.composing || !this.#connected) return;
    this.#scheduleSearch();
  }

  startComposition() {
    if (this.#destroyed || this.composing) return;
    this.composing = true;
    this.#cancelScheduled();
    this.#abortActive();
    this.#emit();
  }

  endComposition(completeQuery = this.query) {
    if (this.#destroyed) return;
    this.composing = false;
    this.query = completeQuery.normalize('NFKC');
    this.#options.onQueryChange?.(this.query);
    this.#emit();
    if (this.#options.source && this.#connected) this.#scheduleSearch();
  }

  setControlledState(state: ControlledSearchState<T>) {
    this.#applyPage(
      {
        items: state.items,
        total: state.total,
        nextCursor: state.nextCursor,
      },
      false,
    );
    this.loading = state.loading ?? false;
    this.error = state.error ?? null;
    this.#emit();
  }

  refresh() {
    if (
      !this.#options.source ||
      this.composing ||
      !this.#connected ||
      this.#destroyed
    ) {
      return Promise.resolve();
    }
    if (!this.#hasMinimumQueryLength()) {
      this.#clearForShortQuery();
      return Promise.resolve();
    }
    return this.#performSearch(undefined, false);
  }

  loadMore() {
    if (
      !this.#options.source ||
      !this.#connected ||
      this.loading ||
      !this.hasMore ||
      !this.nextCursor
    ) {
      return Promise.resolve();
    }
    return this.#performSearch(this.nextCursor, true);
  }

  connect() {
    if (this.#destroyed) return;
    this.#connected = true;
    if (
      this.#options.source &&
      !this.composing &&
      !this.loading &&
      !this.items.length
    ) {
      void this.refresh();
    }
  }

  disconnect() {
    if (this.#destroyed) return;
    this.#connected = false;
    this.#cancelScheduled();
    this.#abortActive();
    this.loading = false;
    this.#emit();
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#connected = false;
    this.#cancelScheduled();
    this.#abortActive();
    this.#cache.clear();
    this.#listeners.clear();
  }

  #scheduleSearch() {
    if (!this.#connected || this.#destroyed) return;
    this.#cancelScheduled();
    if (!this.#hasMinimumQueryLength()) {
      this.#clearForShortQuery();
      return;
    }
    const debounceMs = this.#options.debounceMs ?? 150;
    if (debounceMs <= 0) {
      void this.#performSearch(undefined, false);
      return;
    }
    this.#timer = setTimeout(() => {
      this.#timer = null;
      void this.#performSearch(undefined, false);
    }, debounceMs);
  }

  async #performSearch(cursor: string | undefined, append: boolean) {
    const source = this.#options.source;
    if (!source || this.#destroyed) return;
    this.#cancelScheduled();
    this.#abortActive();
    const query = this.query;
    const limit = this.#options.limit ?? 20;
    const cacheKey = `${query}\u0000${cursor ?? ''}\u0000${limit}`;
    const cached = this.#cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.#applyPage(cached.page, append);
      this.loading = false;
      this.error = null;
      this.#emit();
      return;
    }

    const requestId = ++this.#requestId;
    const abortController = new AbortController();
    this.#abortController = abortController;
    this.loading = true;
    this.error = null;
    this.#emit();
    try {
      const page = await source.search({
        query,
        signal: abortController.signal,
        limit,
        ...(cursor ? {cursor} : {}),
      });
      if (
        this.#destroyed ||
        abortController.signal.aborted ||
        requestId !== this.#requestId ||
        query !== this.query
      ) {
        return;
      }
      this.#cache.set(cacheKey, {
        page,
        expiresAt: Date.now() + (this.#options.cacheTtlMs ?? 30_000),
      });
      this.#applyPage(page, append);
      this.loading = false;
      this.error = null;
      this.#emit();
    } catch (error) {
      if (
        this.#destroyed ||
        abortController.signal.aborted ||
        requestId !== this.#requestId
      ) {
        return;
      }
      this.loading = false;
      this.error = error;
      this.#emit();
    } finally {
      if (this.#abortController === abortController) {
        this.#abortController = null;
      }
    }
  }

  #applyPage(page: SearchPage<T>, append: boolean) {
    const nextHits = page.items.map(toHit);
    const hits = append ? [...this.hits, ...nextHits] : nextHits;
    const seen = new Set<string | number>();
    this.hits = hits.filter(({item}) => {
      const key = this.#options.getItemKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    this.items = this.hits.map(({item}) => item);
    this.total = page.total;
    this.nextCursor = page.nextCursor;
    this.hasMore = Boolean(page.nextCursor);
  }

  #hasMinimumQueryLength() {
    return this.query.length >= (this.#options.minQueryLength ?? 0);
  }

  #clearForShortQuery() {
    this.items = [];
    this.hits = [];
    this.loading = false;
    this.error = null;
    this.total = 0;
    this.nextCursor = undefined;
    this.hasMore = false;
    this.#emit();
  }

  #cancelScheduled() {
    if (this.#timer != null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }

  #abortActive() {
    this.#abortController?.abort();
    this.#abortController = null;
  }

  #emit() {
    if (this.#destroyed) return;
    const snapshot = this.snapshot;
    this.#listeners.forEach((listener) => listener(snapshot));
  }
}

export function createSearch<T>(options: SearchOptions<T>) {
  return new SearchController(options);
}

/** A DOM node (or nodes) produced for one search phase. */
export type SearchRenderOutput = Node | Iterable<Node> | null | undefined;

/** Immutable search data passed to a phase renderer. */
export interface SearchRenderContext<T> extends SearchSnapshot<T> {
  search: SearchController<T>;
}

/**
 * Render functions for every possible search phase.
 *
 * Requiring all phases makes an intentional blank state explicit instead of
 * silently leaving a stale result list in the DOM.
 */
export type SearchRenderers<T> = {
  readonly [Phase in SearchPhase]: (
    context: SearchRenderContext<T>,
  ) => SearchRenderOutput;
};

export interface SearchRendererOptions<T> {
  search: SearchController<T>;
  render: SearchRenderers<T>;
}

/**
 * Subscribes a DOM container to a search controller and replaces its children
 * through phase-specific render functions. It owns phase dispatch and the
 * subscription lifecycle; applications continue to own their HTML, copy, and
 * item bindings.
 *
 * This is useful for direct DOM and Custom Element renderers. Frameworks with
 * declarative templates should render `SearchSnapshot.phase` themselves.
 */
export class SearchRenderer<T> {
  #search: SearchController<T>;
  #renderers: SearchRenderers<T>;
  #container: Element | null = null;
  #unsubscribe: (() => void) | null = null;
  #destroyed = false;

  constructor(options: SearchRendererOptions<T>) {
    this.#search = options.search;
    this.#renderers = options.render;
    this.#unsubscribe = this.#search.subscribe(() => this.render());
  }

  /** Bind a container, immediately render its current phase, and return cleanup. */
  bind(container: Element) {
    this.#container = container;
    this.render();
    return () => {
      if (this.#container === container) this.#container = null;
    };
  }

  /** Re-render the currently bound container from the latest search snapshot. */
  render() {
    const container = this.#container;
    if (this.#destroyed || !container) return;
    const snapshot = this.#search.snapshot;
    const output = this.#renderers[snapshot.phase]({
      ...snapshot,
      search: this.#search,
    });
    const nodes =
      output == null
        ? []
        : isNode(output)
          ? [output]
          : [...output];
    container.replaceChildren(...nodes);
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#container = null;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
}

/** Create a phase-aware DOM renderer for a `SearchController`. */
export function createSearchRenderer<T>(options: SearchRendererOptions<T>) {
  return new SearchRenderer(options);
}

function isNode(value: SearchRenderOutput): value is Node {
  return typeof Node !== 'undefined' && value instanceof Node;
}
