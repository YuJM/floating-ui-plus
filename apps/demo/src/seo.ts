export const SITE_NAME = 'Floating UI Plus Demos';
export const DEFAULT_SITE =
  'https://fup.polcaneli.com';
export const DEFAULT_SOCIAL_IMAGE = '/og-image.png';

import {EXAMPLE_BY_ID, EXAMPLES, type ExampleId} from './demo-registry';

export interface SeoMetadata {
  title: string;
  description: string;
  noindex?: boolean;
  schemaType?: 'WebPage' | 'CollectionPage';
}

export const INDEXABLE_ROUTES = [
  '/',
  ...EXAMPLES.map((example) => `/${example.id}`),
] as const;

export function normalizePathname(pathname: string) {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '');
}

export function getSeoMetadata(pathname: string): SeoMetadata {
  const path = normalizePathname(pathname);

  if (path === '/') {
    return {
      title: 'Floating UI Plus Demos — Web Components & Vue',
      description:
        'Explore accessible floating UI primitives through interactive Web Components and Vue demos powered by one framework-neutral kernel.',
      schemaType: 'CollectionPage',
    };
  }

  if (path === '/404') {
    return {
      title: 'Page Not Found — Floating UI Plus',
      description:
        'Return to the Floating UI Plus Web Components and Vue interactive demo index.',
      noindex: true,
    };
  }

  const example = path.slice(1) as ExampleId;
  const metadata = EXAMPLE_BY_ID[example];

  if (metadata) {
    return {
      title: `${metadata.label} Demo — Floating UI Plus`,
      description: `${metadata.description} Compare the Web Components and Vue implementations in one demo.`,
    };
  }

  return {
    title: SITE_NAME,
    description:
      'Interactive Floating UI Plus demos for accessible positioning and interactions.',
    noindex: true,
  };
}

export function getBreadcrumbs(pathname: string) {
  const path = normalizePathname(pathname);
  if (path === '/') return [];

  const example = path.slice(1) as ExampleId;
  const metadata = EXAMPLE_BY_ID[example];
  return metadata
    ? [
        {name: 'Demos', pathname: '/'},
        {name: metadata.label, pathname: path},
      ]
    : [];
}
