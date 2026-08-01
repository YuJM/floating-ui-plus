import {describe, expect, test} from 'bun:test';

import {
  FAKE_SERVER_DESTINATION_PAGE_SIZE,
  FAKE_SERVER_DESTINATION_TOTAL,
  searchFakeServerDestinations,
} from '../../src/fake-server-destinations';
import fixture from '../../public/fixtures/fake-server-destinations.json';
import type {MultilingualDestination} from '../../src/multilingual-destinations';

const fakeServerDestinations = fixture as MultilingualDestination[];

describe('fake MSW destination server data', () => {
  test('returns a stable first cursor page from a large data set', () => {
    const page = searchFakeServerDestinations(
      {
        query: '',
        limit: FAKE_SERVER_DESTINATION_PAGE_SIZE,
      },
      fakeServerDestinations,
    );

    expect(page.total).toBe(FAKE_SERVER_DESTINATION_TOTAL);
    expect(page.items).toHaveLength(FAKE_SERVER_DESTINATION_PAGE_SIZE);
    expect(page.nextCursor).toBe(String(FAKE_SERVER_DESTINATION_PAGE_SIZE));
    expect(new Set(fakeServerDestinations.map((item) => item.label)).size).toBe(
      FAKE_SERVER_DESTINATION_TOTAL,
    );
    expect(
      searchFakeServerDestinations(
        {query: 'seoul', limit: 8},
        fakeServerDestinations,
      ).items.map((item) => item.label),
    ).toEqual(['Republic of Korea']);
    expect(
      searchFakeServerDestinations(
        {query: 'korea', limit: 8},
        fakeServerDestinations,
      ).items.every((item) => item.label.toLocaleLowerCase().includes('korea')),
    ).toBe(true);
  });

  test('filters and advances cursor pages without repeating records', () => {
    const first = searchFakeServerDestinations(
      {query: 'a', limit: FAKE_SERVER_DESTINATION_PAGE_SIZE},
      fakeServerDestinations,
    );
    const second = searchFakeServerDestinations(
      {
        query: 'a',
        limit: FAKE_SERVER_DESTINATION_PAGE_SIZE,
        cursor: first.nextCursor,
      },
      fakeServerDestinations,
    );

    expect(first.total).toBeGreaterThan(FAKE_SERVER_DESTINATION_PAGE_SIZE);
    expect(second.items).toHaveLength(FAKE_SERVER_DESTINATION_PAGE_SIZE);
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  });
});
