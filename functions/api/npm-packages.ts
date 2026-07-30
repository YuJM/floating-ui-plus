import {npmPackageDefinitions, type NpmPackageInfo} from '../../apps/demo/src/npm-packages';

interface FunctionContext {
  request: Request;
  waitUntil(promise: Promise<unknown>): void;
}

const NPM_REGISTRY = 'https://registry.npmjs.org';
const NPM_CACHE_SECONDS = 60 * 60;
const NPM_CACHE_NAME = 'npm-packages';

async function fetchNpmPackages(): Promise<NpmPackageInfo[]> {
  return Promise.all(
    npmPackageDefinitions.map(async (definition) => {
      try {
        const response = await fetch(
          `${NPM_REGISTRY}/${encodeURIComponent(definition.name)}`,
          {headers: {accept: 'application/json'}},
        );
        if (!response.ok) throw new Error(`npm registry returned ${response.status}`);

        const manifest = (await response.json()) as {
          description?: string;
          version?: string;
          'dist-tags'?: {latest?: string};
        };
        return {
          ...definition,
          version: manifest['dist-tags']?.latest ?? manifest.version ?? null,
          description: manifest.description ?? null,
        };
      } catch {
        return {...definition, version: null, description: null};
      }
    }),
  );
}

export const onRequestGet = async ({request, waitUntil}: FunctionContext) => {
  const cache = await caches.open(NPM_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = Response.json(await fetchNpmPackages(), {
    headers: {
      'Cache-Control': `public, max-age=${NPM_CACHE_SECONDS}`,
    },
  });
  waitUntil(cache.put(request, response.clone()));
  return response;
};
