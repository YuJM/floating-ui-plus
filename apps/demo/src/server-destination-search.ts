import {
  multilingualDestinations,
  type MultilingualDestination,
} from './multilingual-destinations';

export interface ServerDestinationSearchRequest {
  query: string;
  signal: AbortSignal;
  limit: number;
  cursor?: string | undefined;
}

function normalize(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase();
}

function waitForServer(signal: AbortSignal, delayMs = 320) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Search aborted', 'AbortError'));
      return;
    }
    const handleAbort = () => {
      clearTimeout(timeout);
      reject(new DOMException('Search aborted', 'AbortError'));
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, delayMs);
    signal.addEventListener('abort', handleAbort, {once: true});
  });
}

/** A deterministic stand-in for a paginated HTTP search endpoint. */
export async function searchDestinationsOnServer({
  query,
  signal,
  limit,
  cursor,
}: ServerDestinationSearchRequest) {
  await waitForServer(signal);
  const normalizedQuery = normalize(query.trim());
  const matches = multilingualDestinations.filter((destination) => {
    if (!normalizedQuery) return true;
    return normalize(
      [
        destination.label,
        destination.region,
        destination.language,
        destination.value,
        ...destination.keywords,
        ...destination.countryKeywords,
      ].join(' '),
    ).includes(normalizedQuery);
  });
  const start = Number.parseInt(cursor ?? '0', 10) || 0;
  const end = Math.min(start + limit, matches.length);

  return {
    items: matches.slice(start, end) as readonly MultilingualDestination[],
    total: matches.length,
    ...(end < matches.length ? {nextCursor: String(end)} : {}),
  };
}
