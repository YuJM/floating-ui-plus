export const npmPackageDefinitions = [
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

/** Provides stable markup until the browser loads current npm data. */
export function getNpmPackages() {
  return npmPackageDefinitions.map((definition) => ({
    ...definition,
    version: null,
    description: null,
  }));
}
