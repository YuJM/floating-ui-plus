import {describe, expect, test} from 'vitest';

import {
  createFuzzyMatcher,
  createFuzzySearch,
  fuzzySearch,
  normalizeSearchText,
} from '../src';

const destinations = [
  {
    label: '서울',
    keywords: ['seoul', '서울', 'seol'],
    language: '한국어',
    value: 'seoul',
  },
  {
    label: '東京',
    keywords: ['とうきょう', 'tokyo', 'toukyou'],
    language: '日本語',
    value: 'tokyo',
  },
  {
    label: '北京',
    keywords: ['北京', 'beijing', 'peking'],
    language: '中文',
    value: 'beijing',
  },
  {
    label: 'München',
    keywords: ['munich', 'muenchen'],
    language: 'Deutsch',
    value: 'munich',
  },
] as const;

describe('multilingual fuzzy search', () => {
  const search = createFuzzySearch(destinations, {
    keys: [
      {name: 'label', weight: 1},
      {name: 'keywords', weight: 0.7},
      {name: 'value', weight: 0.5},
    ],
    threshold: 0.35,
  });

  test.each([
    ['서을', '서울'],
    ['とうきょ', '東京'],
    ['bejing', '北京'],
    ['munchen', 'München'],
    ['ｔｏｋｙｏ', '東京'],
  ])('ranks %s as %s', (query, expected) => {
    expect(search.search(query)[0]?.item.label).toBe(expected);
  });

  test('normalizes compatibility forms, canonical jamo, and diacritics', () => {
    expect(normalizeSearchText('Ｍünchen')).toBe('munchen');
    expect(normalizeSearchText('서울')).toBe(
      normalizeSearchText('\u1109\u1165\u110b\u116e\u11af'),
    );
    expect(normalizeSearchText('ｶﾀｶﾅ')).toBe(normalizeSearchText('カタカナ'));
  });

  test('ranks exact and prefix fields ahead of fuzzy results', () => {
    const results = fuzzySearch(
      [
        {label: 'Bejingle', keywords: []},
        {label: 'North', keywords: ['bejing']},
        {label: 'Bejing road', keywords: []},
      ],
      'bejing',
      {keys: [{name: 'label'}, {name: 'keywords', weight: 0.7}]},
    );

    expect(results.map(({kind}) => kind)).toEqual([
      'exact',
      'prefix',
      'prefix',
    ]);
    expect(results[0]?.item.label).toBe('North');
  });

  test('updates an existing index and exposes a typeahead matcher', () => {
    const mutable = createFuzzySearch([{label: 'Alpha'}]);
    expect(mutable.search('alp')[0]?.item.label).toBe('Alpha');
    mutable.setItems([{label: 'Beta'}]);
    expect(mutable.search('bet')[0]?.item.label).toBe('Beta');
    expect(createFuzzyMatcher()(['Alpha', 'Beta'], 'b')).toBe('Beta');
  });
});
