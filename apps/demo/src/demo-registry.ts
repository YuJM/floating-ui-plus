export const FRAMEWORKS = ['web-components', 'vue'] as const;

export type Framework = (typeof FRAMEWORKS)[number];

export const EXAMPLES = [
  {
    id: 'tooltip',
    label: 'Tooltip',
    heading: 'Pointer and<br /><span>keyboard intent.</span>',
    description:
      'Test accessible Floating UI Plus tooltips triggered by pointer and keyboard focus.',
  },
  {
    id: 'popover',
    label: 'Popover',
    heading: 'Teleported,<br /><span>still reactive.</span>',
    description:
      'Explore anchored popovers with click interactions, dismissal, and adaptive positioning.',
  },
  {
    id: 'menu',
    label: 'Menu',
    heading: 'Roving focus,<br /><span>one registry.</span>',
    description:
      'Try an accessible floating menu with roving focus and keyboard navigation.',
  },
  {
    id: 'nested-menu',
    label: 'Nested menu',
    heading: 'Menus that know<br /><span>their descendants.</span>',
    description:
      'Explore nested floating menus coordinated through a shared tree and complete keyboard navigation.',
  },
  {
    id: 'client-point',
    label: 'Client point',
    heading: 'A reference<br /><span>without an element.</span>',
    description:
      'Position a floating surface from pointer coordinates using a virtual client-point reference.',
  },
  {
    id: 'combobox',
    label: 'Query',
    heading: 'Search across<br /><span>writing systems.</span>',
    description:
      'Search multilingual destinations with fuzzy matching, list navigation, and default accessible query behavior.',
  },
  {
    id: 'placement',
    label: 'Placement',
    heading: 'Choose a constant.<br /><span>Watch it move.</span>',
    description:
      'Compare all 12 typed Floating UI placements, sides, and alignments in an interactive lab.',
  },
  {
    id: 'middleware',
    label: 'Middleware',
    heading: 'Position with<br /><span>intent.</span>',
    description:
      'Observe offset, shift, flip, size, arrow, hide, inline, and auto-placement middleware behavior.',
  },
  {
    id: 'modal',
    label: 'Modal',
    heading: 'Focus has<br /><span>a boundary.</span>',
    description:
      'Test modal focus trapping, scroll locking, Escape dismissal, and focus restoration.',
  },
] as const;

export type ExampleId = (typeof EXAMPLES)[number]['id'];

export const EXAMPLE_BY_ID = Object.fromEntries(
  EXAMPLES.map((example) => [example.id, example]),
) as Record<ExampleId, (typeof EXAMPLES)[number]>;

export function resolveFramework(value: string | null): Framework {
  return value === 'vue' ? 'vue' : 'web-components';
}

export function exampleHref(example: ExampleId, framework: Framework) {
  return `/${example}?framework=${framework}`;
}
