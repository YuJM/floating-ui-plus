import Fuse, {
  type FuseResultMatch,
  type IFuseOptions,
  type RangeTuple,
} from 'fuse.js';
import type {
  SearchHit,
  SearchSource,
} from './search';

export interface FuzzySearchKey<T> {
  name: string | string[];
  weight?: number | undefined;
  getFn?:
    | ((item: T) => string | readonly string[] | null | undefined)
    | undefined;
}

interface SegmenterLike {
  segment(value: string): Iterable<{segment: string; isWordLike?: boolean}>;
}

export interface FuzzySearchOptions<T>
  extends Omit<
    IFuseOptions<T>,
    'getFn' | 'includeMatches' | 'includeScore' | 'keys' | 'tokenize'
  > {
  keys?: readonly FuzzySearchKey<T>[] | undefined;
  limit?: number | undefined;
  locale?: string | string[] | undefined;
  segmenter?: SegmenterLike | false | undefined;
  tokenize?: ((value: string) => string[]) | RegExp | undefined;
}

export type FuzzyMatchKind = 'exact' | 'prefix' | 'fuzzy' | 'all';

export interface FuzzySearchMatch {
  key: string;
  value: string;
  indices: ReadonlyArray<RangeTuple>;
}

export interface FuzzySearchResult<T> {
  item: T;
  refIndex: number;
  score: number;
  kind: FuzzyMatchKind;
  matches: readonly FuzzySearchMatch[];
}

export interface FuzzySearch<T> {
  readonly items: readonly T[];
  search(query: string, options?: {limit?: number | undefined}): FuzzySearchResult<T>[];
  setItems(items: readonly T[]): void;
}

export interface FuzzySearchSource<T> extends SearchSource<T> {
  setItems(items: readonly T[]): void;
}

interface IndexedField {
  key: string;
  values: string[];
  normalized: string[];
}

interface IndexedItem<T> {
  item: T;
  refIndex: number;
  fields: IndexedField[];
}

const DEFAULT_KEYS = [
  {name: 'label', weight: 1},
  {name: 'keywords', weight: 0.7},
  {name: 'value', weight: 0.5},
] as const;

const UNICODE_TOKEN_PATTERN = /[\p{L}\p{M}\p{N}_]+/gu;
const COMBINING_MARK_PATTERN = /\p{M}+/gu;

function getPathValue(item: unknown, path: string | string[]): unknown {
  const segments = Array.isArray(path) ? path : path.split('.');
  let value = item;
  for (const segment of segments) {
    if (value == null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

function toStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => toStrings(entry));
  }
  if (value == null) return [];
  return [String(value)];
}

function getKeyName(key: string | string[]) {
  return Array.isArray(key) ? key.join('.') : key;
}

/**
 * Canonical search normalization shared by Fuse indexing, direct ranking, and
 * typeahead matching. NFKC folds full-width/half-width compatibility forms;
 * NFD plus mark removal makes common Latin diacritic aliases equivalent and
 * gives Hangul syllables and canonical jamo one comparable representation.
 */
export function normalizeSearchText(
  value: string,
  locale?: string | string[],
): string {
  return value
    .normalize('NFKC')
    .normalize('NFD')
    .replace(COMBINING_MARK_PATTERN, '')
    .toLocaleLowerCase(locale)
    .trim();
}

function createDefaultTokenizer(
  locale: string | string[] | undefined,
  explicit: SegmenterLike | false | undefined,
) {
  if (explicit === false) {
    return (value: string) => value.match(UNICODE_TOKEN_PATTERN) ?? [];
  }
  let segmenter: SegmenterLike | false | undefined = explicit;
  if (!segmenter) {
    const Segmenter = (
      Intl as typeof Intl & {
        Segmenter?: new (
          locale?: string | string[],
          options?: {granularity: 'word'},
        ) => SegmenterLike;
      }
    ).Segmenter;
    segmenter = Segmenter
      ? new Segmenter(locale, {granularity: 'word'})
      : false;
  }
  if (!segmenter) {
    return (value: string) => value.match(UNICODE_TOKEN_PATTERN) ?? [];
  }
  return (value: string) =>
    Array.from(segmenter.segment(value))
      .filter((part) => part.isWordLike !== false)
      .map((part) => part.segment)
      .filter(Boolean);
}

function getDefaultKeys<T>(items: readonly T[]): readonly FuzzySearchKey<T>[] {
  return typeof items[0] === 'string'
    ? [
        {
          name: 'value',
          weight: 1,
          getFn: (item) => String(item),
        },
      ]
    : DEFAULT_KEYS;
}

function getMatchKind<T>(
  item: IndexedItem<T>,
  normalizedQuery: string,
): FuzzyMatchKind {
  if (!normalizedQuery) return 'all';
  if (
    item.fields.some((field) =>
      field.normalized.some((value) => value === normalizedQuery),
    )
  ) {
    return 'exact';
  }
  if (
    item.fields.some((field) =>
      field.normalized.some((value) => value.startsWith(normalizedQuery)),
    )
  ) {
    return 'prefix';
  }
  return 'fuzzy';
}

function matchPriority(kind: FuzzyMatchKind) {
  if (kind === 'exact') return 0;
  if (kind === 'prefix') return 1;
  if (kind === 'fuzzy') return 2;
  return 0;
}

function mapMatches(
  matches: readonly FuseResultMatch[] | undefined,
  fields: readonly IndexedField[],
): FuzzySearchMatch[] {
  return (matches ?? []).map((match) => {
    const index = Number.parseInt(match.key?.slice('field-'.length) ?? '', 10);
    return {
      key: fields[index]?.key ?? match.key ?? 'value',
      value: match.value ?? '',
      indices: match.indices,
    };
  });
}

class FuseSearch<T> implements FuzzySearch<T> {
  #items: readonly T[];
  readonly #options: FuzzySearchOptions<T>;
  #indexed: IndexedItem<T>[] = [];
  #fuse: Fuse<IndexedItem<T>> | null = null;

  constructor(items: readonly T[], options: FuzzySearchOptions<T>) {
    this.#items = items;
    this.#options = options;
    this.#rebuild();
  }

  get items() {
    return this.#items;
  }

  setItems(items: readonly T[]) {
    this.#items = items;
    this.#rebuild();
  }

  search(query: string, options: {limit?: number | undefined} = {}) {
    const normalizedQuery = normalizeSearchText(query, this.#options.locale);
    const limit = options.limit ?? this.#options.limit;
    if (!normalizedQuery) {
      return this.#indexed
        .slice(0, limit)
        .map(({item, refIndex}) => ({
          item,
          refIndex,
          score: 0,
          kind: 'all' as const,
          matches: [],
        }));
    }

    const fuzzyResults = this.#fuse?.search(normalizedQuery) ?? [];
    const byIndex = new Map(
      fuzzyResults.map((result) => [result.item.refIndex, result]),
    );

    // A strict threshold must never hide a direct exact/prefix candidate.
    for (const indexed of this.#indexed) {
      const kind = getMatchKind(indexed, normalizedQuery);
      if (kind !== 'fuzzy' && !byIndex.has(indexed.refIndex)) {
        byIndex.set(indexed.refIndex, {
          item: indexed,
          refIndex: indexed.refIndex,
          score: kind === 'exact' ? 0 : Number.EPSILON,
          matches: [],
        });
      }
    }

    return [...byIndex.values()]
      .map((result): FuzzySearchResult<T> => {
        const kind = getMatchKind(result.item, normalizedQuery);
        return {
          item: result.item.item,
          refIndex: result.item.refIndex,
          score: result.score ?? 1,
          kind,
          matches: mapMatches(result.matches, result.item.fields),
        };
      })
      .sort(
        (a, b) =>
          matchPriority(a.kind) - matchPriority(b.kind) ||
          a.score - b.score ||
          a.refIndex - b.refIndex,
      )
      .slice(0, limit);
  }

  #rebuild() {
    const keys = this.#options.keys ?? getDefaultKeys(this.#items);
    const locale = this.#options.locale;
    this.#indexed = this.#items.map((item, refIndex) => ({
      item,
      refIndex,
      fields: keys.map((key) => {
        const values = toStrings(
          key.getFn ? key.getFn(item) : getPathValue(item, key.name),
        );
        return {
          key: getKeyName(key.name),
          values,
          normalized: values.map((value) => normalizeSearchText(value, locale)),
        };
      }),
    }));

    const {
      keys: _keys,
      limit: _limit,
      locale: _locale,
      segmenter,
      tokenize,
      ...fuseOptions
    } = this.#options;
    this.#fuse = new Fuse(this.#indexed, {
      threshold: 0.35,
      ignoreDiacritics: true,
      ignoreLocation: true,
      useTokenSearch: true,
      tokenMatch: 'all',
      ...fuseOptions,
      includeMatches: true,
      includeScore: true,
      keys: keys.map((key, index) => ({
        name: `field-${index}`,
        weight: key.weight ?? 1,
        getFn: (record) => record.fields[index]?.normalized ?? [],
      })),
      tokenize:
        tokenize ?? createDefaultTokenizer(locale, segmenter),
    });
  }
}

export function createFuzzySearch<T>(
  items: readonly T[],
  options: FuzzySearchOptions<T> = {},
): FuzzySearch<T> {
  return new FuseSearch(items, options);
}

export function fuzzySearch<T>(
  items: readonly T[],
  query: string,
  options: FuzzySearchOptions<T> = {},
): FuzzySearchResult<T>[] {
  return createFuzzySearch(items, options).search(query);
}

export function createFuzzyMatcher(
  options: Omit<FuzzySearchOptions<string>, 'keys'> = {},
) {
  let previousList: Array<string | null> | null = null;
  let search: FuzzySearch<string> | null = null;

  return (
    list: Array<string | null>,
    typedString: string,
  ): string | null => {
    if (list !== previousList) {
      previousList = list;
      search = createFuzzySearch(
        list.filter((value): value is string => value != null),
        options,
      );
    }
    return search?.search(typedString, {limit: 1})[0]?.item ?? null;
  };
}

export function createFuzzySearchSource<T>(
  items: readonly T[],
  options: FuzzySearchOptions<T> = {},
): FuzzySearchSource<T> {
  const search = createFuzzySearch(items, options);
  return {
    setItems(nextItems) {
      search.setItems(nextItems);
    },
    async search({query, signal, limit, cursor}) {
      if (signal.aborted) {
        throw new DOMException('Search aborted', 'AbortError');
      }
      const allResults = search.search(query);
      const start = Math.max(0, Number.parseInt(cursor ?? '0', 10) || 0);
      const results = allResults.slice(start, start + limit);
      const hits: SearchHit<T>[] = results.map((result) => ({
        item: result.item,
        score: result.score,
        matches: result.matches.map((match) => ({
          field: match.key,
          ranges: match.indices,
        })),
      }));
      const nextOffset = start + results.length;
      return {
        items: hits,
        total: allResults.length,
        ...(nextOffset < allResults.length
          ? {nextCursor: String(nextOffset)}
          : {}),
      };
    },
  };
}
