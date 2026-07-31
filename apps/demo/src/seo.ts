export const SITE_NAME = 'Floating UI Plus Demos';
export const DEFAULT_SITE =
  'https://fup.polcaneli.com';
export const DEFAULT_SOCIAL_IMAGE = '/og-image.png';

import {EXAMPLE_IDS, getExample, type ExampleId, type Locale} from './i18n';
import * as m from './paraglide/messages';

export interface SeoMetadata {
  title: string;
  description: string;
  noindex?: boolean;
  schemaType?: 'WebPage' | 'CollectionPage';
}

export const INDEXABLE_ROUTES = [
  '/',
  ...EXAMPLE_IDS.map((example) => `/${example}`),
  ...(['ko', 'ja'] as const).flatMap((locale) => [
    `/${locale}`,
    ...EXAMPLE_IDS.map((example) => `/${locale}/${example}`),
  ]),
] as const;

export function normalizePathname(pathname: string) {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '');
}

export function getSeoMetadata(pathname: string, locale: Locale = 'en'): SeoMetadata {
  const path = normalizePathname(pathname);
  const options = {locale};
  const segments = path.split('/').filter(Boolean);
  const exampleId = (
    locale === 'en' && segments.length === 1
      ? segments[0]
      : segments.length === 2
        ? segments[1]
        : undefined
  ) as ExampleId | undefined;

  if (path === '/' || (segments.length === 1 && ['ko', 'ja'].includes(segments[0] ?? ''))) {
    return {
      title: `${m.site_name(undefined, options)} — ${m.hero_title(undefined, options)}`,
      description: m.hero_copy(undefined, options),
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

  if (exampleId && EXAMPLE_IDS.includes(exampleId)) {
    const metadata = getExample(locale, exampleId);
    return {
      title: `${metadata.label} — Floating UI Plus`,
      description: metadata.description,
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

  const segments = path.split('/').filter(Boolean);
  const [first, second] = segments;
  const locale = ['ko', 'ja'].includes(first ?? '') ? first : 'en';
  const example = locale === 'en' ? first : second;
  if (!example) return [];
  const metadata = EXAMPLE_IDS.includes(example as ExampleId)
    ? getExample(locale as Locale, example as ExampleId)
    : undefined;
  return metadata
    ? [
        {name: 'Demos', pathname: locale === 'en' ? '/' : `/${locale}`},
        {name: metadata.label, pathname: path},
      ]
    : [];
}
