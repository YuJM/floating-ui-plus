import * as m from './paraglide/messages';

export const LOCALES = ['en', 'ko', 'ja'] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export const EXAMPLE_IDS = [
  'tooltip', 'popover', 'menu', 'nested-menu', 'client-point', 'combobox',
  'placement', 'middleware', 'modal',
] as const;
export type ExampleId = (typeof EXAMPLE_IDS)[number];

export const COMBOBOX_SOURCES = ['fuzzy', 'server'] as const;
export type ComboboxSource = (typeof COMBOBOX_SOURCES)[number];

export function isComboboxSource(value: string | undefined): value is ComboboxSource {
  return (COMBOBOX_SOURCES as readonly string[]).includes(value ?? '');
}

const COMPONENT_NAMES: Record<ExampleId, string> = {
  tooltip: 'Tooltip',
  popover: 'Popover',
  menu: 'Menu',
  'nested-menu': 'Nested menu',
  'client-point': 'Client point',
  combobox: 'Query',
  placement: 'Placement',
  middleware: 'Middleware',
  modal: 'Modal',
};

const APPLIED_FEATURES: Record<ExampleId, readonly string[]> = {
  tooltip: ['floating-root', 'hover()', 'focus()', 'dismiss()', 'role()', 'safePolygon()', 'arrow'],
  popover: ['floating-root', 'click()', 'dismiss()', 'offset()', 'flip()', 'shift()'],
  menu: ['floating-list', 'navigation', 'typeahead', 'loop'],
  'nested-menu': ['floating-tree', 'floating-node', 'floating-list', 'dismiss()'],
  'client-point': ['clientPoint()', 'hover({move: true})', 'flip()', 'shift()'],
  combobox: [
    'floating-query',
    'floating-list',
    'floating-list-item',
    'createFuzzySearchSource()',
    'application search source',
  ],
  placement: ['Placement', 'offset()'],
  middleware: ['floating-root', 'offset', 'shift', 'flip', 'arrow', 'size', 'autoPlacement', 'hide', 'inline'],
  modal: ['dialog', 'floating-node', 'click()', 'dismiss()', 'role()'],
};

export function getExamples(locale: Locale) {
  const options = {locale};
  const builds = {
    tooltip: m.example_tooltip_build,
    popover: m.example_popover_build,
    menu: m.example_menu_build,
    'nested-menu': m.example_nested_menu_build,
    'client-point': m.example_client_point_build,
    combobox: m.example_combobox_build,
    placement: m.example_placement_build,
    middleware: m.example_middleware_build,
    modal: m.example_modal_build,
  };
  return [
    {id: 'tooltip' as const, label: m.pattern_tooltip_label(undefined, options), heading: COMPONENT_NAMES.tooltip, description: m.pattern_tooltip_description(undefined, options), build: builds.tooltip(undefined, options), features: APPLIED_FEATURES.tooltip},
    {id: 'popover' as const, label: m.pattern_popover_label(undefined, options), heading: COMPONENT_NAMES.popover, description: m.pattern_popover_description(undefined, options), build: builds.popover(undefined, options), features: APPLIED_FEATURES.popover},
    {id: 'menu' as const, label: m.pattern_menu_label(undefined, options), heading: COMPONENT_NAMES.menu, description: m.pattern_menu_description(undefined, options), build: builds.menu(undefined, options), features: APPLIED_FEATURES.menu},
    {id: 'nested-menu' as const, label: m.pattern_nested_menu_label(undefined, options), heading: COMPONENT_NAMES['nested-menu'], description: m.pattern_nested_menu_description(undefined, options), build: builds['nested-menu'](undefined, options), features: APPLIED_FEATURES['nested-menu']},
    {id: 'client-point' as const, label: m.pattern_client_point_label(undefined, options), heading: COMPONENT_NAMES['client-point'], description: m.pattern_client_point_description(undefined, options), build: builds['client-point'](undefined, options), features: APPLIED_FEATURES['client-point']},
    {id: 'combobox' as const, label: m.pattern_combobox_label(undefined, options), heading: COMPONENT_NAMES.combobox, description: m.pattern_combobox_description(undefined, options), build: builds.combobox(undefined, options), features: APPLIED_FEATURES.combobox},
    {id: 'placement' as const, label: m.pattern_placement_label(undefined, options), heading: COMPONENT_NAMES.placement, description: m.pattern_placement_description(undefined, options), build: builds.placement(undefined, options), features: APPLIED_FEATURES.placement},
    {id: 'middleware' as const, label: m.pattern_middleware_label(undefined, options), heading: COMPONENT_NAMES.middleware, description: m.pattern_middleware_description(undefined, options), build: builds.middleware(undefined, options), features: APPLIED_FEATURES.middleware},
    {id: 'modal' as const, label: m.pattern_modal_label(undefined, options), heading: COMPONENT_NAMES.modal, description: m.pattern_modal_description(undefined, options), build: builds.modal(undefined, options), features: APPLIED_FEATURES.modal},
  ];
}

export function getExample(locale: Locale, id: ExampleId) {
  const example = getExamples(locale).find((item) => item.id === id);
  if (!example) throw new Error(`Unknown example: ${id}`);
  return example;
}

export function ogLocale(locale: Locale) {
  return {en: 'en_US', ko: 'ko_KR', ja: 'ja_JP'}[locale];
}
