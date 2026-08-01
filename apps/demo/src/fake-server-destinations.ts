import type {MultilingualDestination} from './multilingual-destinations';

/**
 * Fixed public fixture served by MSW. Regenerate intentionally with
 * `bun run generate:fake-server-destinations`.
 */
export const FAKE_SERVER_DESTINATION_PAGE_SIZE = 8;
export const FAKE_SERVER_DESTINATION_TOTAL = 240;
const FIXTURE_URL = '/fixtures/fake-server-destinations.json';
let destinationFixture: Promise<readonly MultilingualDestination[]> | undefined;

export async function loadFakeServerDestinations() {
  destinationFixture ??= fetch(FIXTURE_URL).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load destination fixture (${response.status}).`);
    }
    return (await response.json()) as MultilingualDestination[];
  });
  try {
    return await destinationFixture;
  } catch (error) {
    destinationFixture = undefined;
    throw error;
  }
}

export interface FakeServerSearchRequest {
  query: string;
  limit: number;
  cursor?: string | undefined;
}

function normalize(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase();
}

function getStartIndex(cursor: string | undefined) {
  const value = Number.parseInt(cursor ?? '0', 10);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

/** The MSW handler calls this as the deterministic cursor-paginated API. */
export function searchFakeServerDestinations({
  query,
  limit,
  cursor,
}: FakeServerSearchRequest, destinations: readonly MultilingualDestination[]) {
  const normalizedQuery = normalize(query.trim());
  const matches = destinations.filter((destination) => {
    if (!normalizedQuery) return true;
    return normalize(
      [
        destination.label,
        destination.value,
        ...destination.keywords,
        ...destination.countryKeywords,
      ].join(' '),
    ).includes(normalizedQuery);
  });
  const start = getStartIndex(cursor);
  const end = Math.min(start + Math.max(limit, 1), matches.length);

  return {
    items: matches.slice(start, end),
    total: matches.length,
    ...(end < matches.length ? {nextCursor: String(end)} : {}),
  };
}
