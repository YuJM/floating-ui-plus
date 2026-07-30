import npmFetch from 'npm-registry-fetch';

const NPM_REGISTRY = 'https://registry.npmjs.org';

const packageDefinitions = [
  {
    name: '@floating-ui-plus/web',
    href: 'https://www.npmjs.com/package/@floating-ui-plus/web',
    label: 'Web',
  },
  {
    name: '@floating-ui-plus/web-components',
    href: 'https://www.npmjs.com/package/@floating-ui-plus/web-components',
    label: 'Web Components',
  },
  {
    name: '@floating-ui-plus/vue',
    href: 'https://www.npmjs.com/package/@floating-ui-plus/vue',
    label: 'Vue',
  },
] as const;

export interface NpmPackageInfo {
  name: string;
  href: string;
  label: string;
  version: string | null;
  description: string | null;
}

async function fetchNpmPackage(
  definition: (typeof packageDefinitions)[number],
): Promise<NpmPackageInfo> {
  try {
    const manifest = await npmFetch.json(`/${definition.name}`, {
      registry: NPM_REGISTRY,
      fullMetadata: false,
      retry: {retries: 1},
    });
    return {
      ...definition,
      version: manifest['dist-tags']?.latest ?? manifest.version ?? null,
      description: manifest.description ?? null,
    };
  } catch {
    return {...definition, version: null, description: null};
  }
}

/** Fetches the published state once while Astro builds the static demo. */
export function getNpmPackages() {
  return Promise.all(packageDefinitions.map(fetchNpmPackage));
}
