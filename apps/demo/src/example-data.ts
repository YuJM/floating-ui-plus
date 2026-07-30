/** Framework-neutral content and control values shared by the demo implementations. */
export const MENU_LABELS = [
  'North star',
  'Orbit map',
  'Signal log',
  'Field notes',
] as const;

export const NESTED_MENU_ROOT_LABELS = [
  'New note',
  'Move to project',
  'Archive',
] as const;

export const NESTED_MENU_PROJECT_LABELS = [
  'Atlas',
  'Field research',
  'Signals',
] as const;

export const PLACEMENT_OPTIONS = [
  'top-start',
  'top',
  'top-end',
  'right-start',
  'right',
  'right-end',
  'bottom-end',
  'bottom',
  'bottom-start',
  'left-end',
  'left',
  'left-start',
] as const;

export const DEFAULT_PLACEMENT = 'top';
