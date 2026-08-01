import {delay, http, HttpResponse} from 'msw';

import {
  loadFakeServerDestinations,
  searchFakeServerDestinations,
} from '../fake-server-destinations';

export const destinationHandlers = [
  http.get('/api/demo/destinations', async ({request}) => {
    const url = new URL(request.url);
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '8', 10);
    const destinations = await loadFakeServerDestinations();
    const page = searchFakeServerDestinations(
      {
        query: url.searchParams.get('q') ?? '',
        limit: Number.isSafeInteger(limit) ? limit : 8,
        cursor: url.searchParams.get('cursor') ?? undefined,
      },
      destinations,
    );

    await delay(320);
    return HttpResponse.json(page);
  }),
];
