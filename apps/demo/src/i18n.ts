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

export function getExamples(locale: Locale) {
  const options = {locale};
  return [
    {id: 'tooltip' as const, label: m.pattern_tooltip_label(undefined, options), heading: m.pattern_tooltip_heading(undefined, options), description: m.pattern_tooltip_description(undefined, options)},
    {id: 'popover' as const, label: m.pattern_popover_label(undefined, options), heading: m.pattern_popover_heading(undefined, options), description: m.pattern_popover_description(undefined, options)},
    {id: 'menu' as const, label: m.pattern_menu_label(undefined, options), heading: m.pattern_menu_heading(undefined, options), description: m.pattern_menu_description(undefined, options)},
    {id: 'nested-menu' as const, label: m.pattern_nested_menu_label(undefined, options), heading: m.pattern_nested_menu_heading(undefined, options), description: m.pattern_nested_menu_description(undefined, options)},
    {id: 'client-point' as const, label: m.pattern_client_point_label(undefined, options), heading: m.pattern_client_point_heading(undefined, options), description: m.pattern_client_point_description(undefined, options)},
    {id: 'combobox' as const, label: m.pattern_combobox_label(undefined, options), heading: m.pattern_combobox_heading(undefined, options), description: m.pattern_combobox_description(undefined, options)},
    {id: 'placement' as const, label: m.pattern_placement_label(undefined, options), heading: m.pattern_placement_heading(undefined, options), description: m.pattern_placement_description(undefined, options)},
    {id: 'middleware' as const, label: m.pattern_middleware_label(undefined, options), heading: m.pattern_middleware_heading(undefined, options), description: m.pattern_middleware_description(undefined, options)},
    {id: 'modal' as const, label: m.pattern_modal_label(undefined, options), heading: m.pattern_modal_heading(undefined, options), description: m.pattern_modal_description(undefined, options)},
  ];
}

export function getExample(locale: Locale, id: ExampleId) {
  const example = getExamples(locale).find((item) => item.id === id);
  if (!example) throw new Error(`Unknown example: ${id}`);
  const options = {locale};
  const build = {
    tooltip: m.example_tooltip_build,
    popover: m.example_popover_build,
    menu: m.example_menu_build,
    'nested-menu': m.example_nested_menu_build,
    'client-point': m.example_client_point_build,
    combobox: m.example_combobox_build,
    placement: m.example_placement_build,
    middleware: m.example_middleware_build,
    modal: m.example_modal_build,
  }[id]({'move: true': 'move: true'}, options);
  return {...example, build};
}

export function ogLocale(locale: Locale) {
  return {en: 'en_US', ko: 'ko_KR', ja: 'ja_JP'}[locale];
}
