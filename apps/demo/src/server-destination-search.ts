import type {MultilingualDestination} from './multilingual-destinations';
import {enableDemoMockServer} from './mocks/browser';

export interface ServerDestinationSearchRequest {
  query: string;
  signal: AbortSignal;
  limit: number;
  cursor?: string | undefined;
}

export interface ServerDestinationSearchPage {
  items: readonly MultilingualDestination[];
  total: number;
  nextCursor?: string | undefined;
}

/**
 * Browser-side HTTP client for the MSW-backed demo server. Replace the mock
 * initialization, not this fetch contract, when a real API becomes available.
 */
export async function searchDestinationsOnServer({
  query,
  signal,
  limit,
  cursor,
}: ServerDestinationSearchRequest): Promise<ServerDestinationSearchPage> {
  await enableDemoMockServer();
  const url = new URL('/api/demo/destinations', window.location.origin);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  if (cursor) url.searchParams.set('cursor', cursor);

  const response = await fetch(url, {signal});
  if (!response.ok) {
    throw new Error(`Destination search failed (${response.status}).`);
  }
  return response.json() as Promise<ServerDestinationSearchPage>;
}
