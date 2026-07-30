export const SITE_NAME = 'Floating UI Plus Demos';
export const DEFAULT_SITE =
  'https://fup.polcaneli.com';
export const DEFAULT_SOCIAL_IMAGE = '/og-image.png';

export interface SeoMetadata {
  title: string;
  description: string;
  noindex?: boolean;
  schemaType?: 'WebPage' | 'CollectionPage';
}

interface ExampleMetadata {
  label: string;
  description: string;
}

const examples: Record<string, ExampleMetadata> = {
  tooltip: {
    label: 'Tooltip',
    description:
      'Test accessible Floating UI Plus tooltips triggered by pointer and keyboard focus.',
  },
  popover: {
    label: 'Popover',
    description:
      'Explore anchored popovers with click interactions, dismissal, and adaptive positioning.',
  },
  menu: {
    label: 'Menu',
    description:
      'Try an accessible floating menu with roving focus and keyboard navigation.',
  },
  'nested-menu': {
    label: 'Nested Menu',
    description:
      'Explore nested floating menus coordinated through a shared tree and complete keyboard navigation.',
  },
  'client-point': {
    label: 'Client Point',
    description:
      'Position a floating surface from pointer coordinates using a virtual client-point reference.',
  },
  combobox: {
    label: 'Multilingual Combobox',
    description:
      'Search multilingual destinations with fuzzy matching, list navigation, and accessible combobox behavior.',
  },
  placement: {
    label: 'Placement',
    description:
      'Compare all 12 typed Floating UI placements, sides, and alignments in an interactive lab.',
  },
  middleware: {
    label: 'Middleware',
    description:
      'Observe offset, shift, flip, size, arrow, hide, inline, and auto-placement middleware behavior.',
  },
  modal: {
    label: 'Modal',
    description:
      'Test modal focus trapping, scroll locking, Escape dismissal, and focus restoration.',
  },
};

const overview: Record<'web-components' | 'vue', SeoMetadata> = {
  'web-components': {
    title: 'Web Components Demos — Floating UI Plus',
    description:
      'Interactive Lit-powered Web Component demos for tooltips, popovers, menus, focus, search, positioning, and middleware.',
    schemaType: 'CollectionPage',
  },
  vue: {
    title: 'Vue Component Demos — Floating UI Plus',
    description:
      'Interactive Vue demos for reactive floating components, Teleport, transitions, focus, search, positioning, and middleware.',
    schemaType: 'CollectionPage',
  },
};

export const INDEXABLE_ROUTES = [
  '/',
  '/web-components',
  ...Object.keys(examples).map((example) => `/web-components/${example}`),
  '/vue',
  ...Object.keys(examples).map((example) =>
    example === 'placement' || example === 'middleware'
      ? `/vue/${example}`
      : `/vue/examples/${example}`,
  ),
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

  if (path === '/404' || path === '/web-components/hide') {
    return {
      title: 'Page Not Found — Floating UI Plus',
      description:
        'Return to the Floating UI Plus Web Components and Vue interactive demo index.',
      noindex: true,
    };
  }

  if (path === '/web-components' || path === '/vue') {
    return overview[path.slice(1) as keyof typeof overview];
  }

  const parts = path.split('/').filter(Boolean);
  const surface = parts[0];
  const example = parts.at(-1) ?? '';
  const metadata = examples[example];

  if (
    metadata &&
    (surface === 'web-components' || surface === 'vue')
  ) {
    const surfaceName = surface === 'vue' ? 'Vue' : 'Web Components';
    return {
      title: `${metadata.label} Demo — Floating UI Plus ${surfaceName}`,
      description: `${metadata.description} This example uses the Floating UI Plus ${surfaceName} package.`,
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

  const parts = path.split('/').filter(Boolean);
  const surface = parts[0];
  const surfaceName =
    surface === 'web-components'
      ? 'Web Components'
      : surface === 'vue'
        ? 'Vue'
        : undefined;
  if (!surfaceName) return [];

  const breadcrumbs = [
    {name: 'Demos', pathname: '/'},
    {name: surfaceName, pathname: `/${surface}`},
  ];
  const example = parts.at(-1) ?? '';
  const exampleMetadata = examples[example];
  if (exampleMetadata && path !== `/${surface}`) {
    breadcrumbs.push({name: exampleMetadata.label, pathname: path});
  }
  return breadcrumbs;
}
