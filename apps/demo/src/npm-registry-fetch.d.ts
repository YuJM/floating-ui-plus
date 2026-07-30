declare module 'npm-registry-fetch' {
  interface NpmManifest {
    description?: string;
    version?: string;
    'dist-tags'?: {latest?: string};
  }

  interface NpmRegistryFetch {
    json(path: string, options?: Record<string, unknown>): Promise<NpmManifest>;
  }

  const npmFetch: NpmRegistryFetch;
  export default npmFetch;
}
