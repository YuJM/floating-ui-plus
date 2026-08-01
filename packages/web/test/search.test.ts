import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  createAsyncSearchSource,
  createSearch,
  createSearchRenderer,
  type SearchPage,
  type SearchRequest,
} from '../src';

interface Item {
  id: string;
  label: string;
}

const alpha = {id: 'alpha', label: 'Alpha'};
const beta = {id: 'beta', label: 'Beta'};

function createOptions(
  search: (request: SearchRequest) => Promise<SearchPage<Item>>,
) {
  return {
    source: createAsyncSearchSource({search}),
    getItemKey: (item: Item) => item.id,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('SearchController', () => {
  test('debounces input and exposes loading and results', async () => {
    vi.useFakeTimers();
    const search = vi.fn(async () => ({items: [alpha], total: 1}));
    const searchController = createSearch({
      ...createOptions(search),
      debounceMs: 100,
    });

    searchController.setQuery('alp');
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);

    expect(search).toHaveBeenCalledOnce();
    expect(searchController.items).toEqual([alpha]);
    expect(searchController.loading).toBe(false);
    expect(searchController.total).toBe(1);
    searchController.destroy();
  });

  test('aborts the previous request and ignores its late response', async () => {
    const pending = new Map<
      string,
      (page: SearchPage<Item>) => void
    >();
    const signals: AbortSignal[] = [];
    const searchController = createSearch({
      ...createOptions(
        ({query, signal}) =>
          new Promise((resolve) => {
            signals.push(signal);
            pending.set(query, resolve);
          }),
      ),
      debounceMs: 0,
    });

    searchController.setQuery('a');
    searchController.setQuery('b');
    expect(signals[0]?.aborted).toBe(true);
    pending.get('b')?.({items: [beta]});
    await Promise.resolve();
    pending.get('a')?.({items: [alpha]});
    await Promise.resolve();

    expect(searchController.items).toEqual([beta]);
    searchController.destroy();
  });

  test('does not restart an active request when connected again', async () => {
    let resolve: ((page: SearchPage<Item>) => void) | undefined;
    const request = vi.fn(
      () =>
        new Promise<SearchPage<Item>>((next) => {
          resolve = next;
        }),
    );
    const searchController = createSearch({
      ...createOptions(request),
      debounceMs: 0,
    });

    const pending = searchController.refresh();
    expect(searchController.loading).toBe(true);
    searchController.connect();
    expect(request).toHaveBeenCalledOnce();

    resolve?.({items: [alpha]});
    await pending;
    expect(searchController.items).toEqual([alpha]);
    searchController.destroy();
  });

  test('holds searches during IME composition and searches the final value', async () => {
    vi.useFakeTimers();
    const search = vi.fn(async ({query}: SearchRequest) => ({
      items: [{id: query, label: query}],
    }));
    const searchController = createSearch({
      ...createOptions(search),
      debounceMs: 50,
    });

    searchController.startComposition();
    searchController.setQuery('ㅅ');
    await vi.advanceTimersByTimeAsync(100);
    expect(search).not.toHaveBeenCalled();

    searchController.endComposition('서울');
    await vi.advanceTimersByTimeAsync(50);
    expect(search).toHaveBeenCalledOnce();
    expect(search.mock.calls[0]?.[0].query).toBe('서울');
    searchController.destroy();
  });

  test('honors minimum length, result cache TTL, and cursor pagination', async () => {
    vi.useFakeTimers();
    const search = vi.fn(async ({cursor}: SearchRequest) =>
      cursor
        ? {items: [beta], total: 2}
        : {items: [alpha], total: 2, nextCursor: 'page-2'},
    );
    const searchController = createSearch({
      ...createOptions(search),
      debounceMs: 0,
      minQueryLength: 2,
      cacheTtlMs: 1_000,
      limit: 1,
    });

    searchController.setQuery('a');
    expect(search).not.toHaveBeenCalled();
    searchController.setQuery('al');
    await Promise.resolve();
    expect(searchController.hasMore).toBe(true);

    await searchController.loadMore();
    expect(searchController.items).toEqual([alpha, beta]);
    expect(searchController.hasMore).toBe(false);

    searchController.setQuery('al');
    await Promise.resolve();
    expect(search).toHaveBeenCalledTimes(2);
    expect(searchController.items).toEqual([alpha]);
    searchController.destroy();
  });

  test('supports framework-controlled result state without UI semantics', () => {
    const searchController = createSearch<Item>({
      items: [alpha, beta],
      loading: true,
      getItemKey: (item) => item.id,
    });
    expect(searchController.items).toEqual([alpha, beta]);
    expect(searchController.loading).toBe(true);
    expect(searchController.phase).toBe('loading');
    expect(searchController.snapshot).not.toHaveProperty('activeIndex');
    expect(searchController.snapshot).not.toHaveProperty('selectedItem');
    expect(searchController.snapshot).not.toHaveProperty('open');
    expect(searchController.getItemKey(beta)).toBe('beta');
    searchController.destroy();
  });

  test('reports idle, empty, and results phases without choosing presentation', () => {
    const searchController = createSearch<Item>({
      items: [],
      getItemKey: (item) => item.id,
    });

    expect(searchController.snapshot.phase).toBe('idle');
    searchController.setControlledState({items: [alpha]});
    expect(searchController.phase).toBe('results');
    searchController.setControlledState({items: []});
    expect(searchController.phase).toBe('idle');

    searchController.setQuery('seoul');
    expect(searchController.phase).toBe('empty');

    searchController.setControlledState({items: [alpha]});
    expect(searchController.phase).toBe('results');
    searchController.setControlledState({items: [alpha], loading: true});
    expect(searchController.phase).toBe('loading');
    searchController.setControlledState({items: [], error: new Error('offline')});
    expect(searchController.phase).toBe('error');
    searchController.destroy();
  });

  test('does not refresh a source below its minimum query length', async () => {
    const request = vi.fn(async () => ({items: [alpha]}));
    const searchController = createSearch({
      ...createOptions(request),
      debounceMs: 0,
      minQueryLength: 1,
    });

    await searchController.refresh();
    expect(request).not.toHaveBeenCalled();
    expect(searchController.phase).toBe('idle');

    searchController.setQuery('a');
    await Promise.resolve();
    expect(request).toHaveBeenCalledOnce();
    expect(searchController.phase).toBe('results');
    searchController.destroy();
  });

  test('renders every search phase into a bound DOM container', () => {
    const searchController = createSearch<Item>({
      items: [],
      getItemKey: (item) => item.id,
    });
    const container = document.createElement('div');
    const phases: string[] = [];
    const renderer = createSearchRenderer({
      search: searchController,
      render: {
        idle: () => renderPhase('idle', phases),
        loading: () => renderPhase('loading', phases),
        error: () => renderPhase('error', phases),
        empty: ({query}) => renderPhase(`empty:${query}`, phases),
        results: ({items}) => renderPhase(`results:${items.length}`, phases),
      },
    });

    renderer.bind(container);
    expect(container.textContent).toBe('idle');

    searchController.setQuery('seoul');
    expect(container.textContent).toBe('empty:seoul');

    searchController.setControlledState({items: [alpha]});
    expect(container.textContent).toBe('results:1');

    searchController.setControlledState({items: [alpha], loading: true});
    expect(container.textContent).toBe('loading');

    searchController.setControlledState({items: [], error: new Error('offline')});
    expect(container.textContent).toBe('error');
    expect(phases).toEqual([
      'idle',
      'empty:seoul',
      'results:1',
      'loading',
      'error',
    ]);

    renderer.destroy();
    searchController.setControlledState({items: [beta]});
    expect(container.textContent).toBe('error');
    searchController.destroy();
  });

  test('destroy aborts work and suppresses late updates', async () => {
    let resolve: ((page: SearchPage<Item>) => void) | undefined;
    let signal: AbortSignal | undefined;
    const searchController = createSearch({
      ...createOptions(
        (request) =>
          new Promise((next) => {
            signal = request.signal;
            resolve = next;
          }),
      ),
      debounceMs: 0,
    });
    searchController.setQuery('alpha');
    searchController.destroy();
    expect(signal?.aborted).toBe(true);
    resolve?.({items: [alpha]});
    await Promise.resolve();
    expect(searchController.items).toEqual([]);
  });
});

function renderPhase(label: string, phases: string[]) {
  phases.push(label);
  const element = document.createElement('div');
  element.textContent = label;
  return element;
}
