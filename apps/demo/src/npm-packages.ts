export const npmPackageDefinitions = [
  {
    id: 'web',
    name: '@floating-ui-plus/web',
    href: 'https://www.npmjs.com/package/@floating-ui-plus/web',
    label: 'Web',
  },
  {
    id: 'web-components',
    name: '@floating-ui-plus/web-components',
    href: 'https://www.npmjs.com/package/@floating-ui-plus/web-components',
    label: 'Web Components',
  },
  {
    id: 'vue',
    name: '@floating-ui-plus/vue',
    href: 'https://www.npmjs.com/package/@floating-ui-plus/vue',
    label: 'Vue',
  },
] as const;

/** Provides the package links shown on the demo home page. */
export function getNpmPackages() {
  return npmPackageDefinitions;
}
