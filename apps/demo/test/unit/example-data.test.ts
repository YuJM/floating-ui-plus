import {describe, expect, test} from 'bun:test';

import {
  DEFAULT_PLACEMENT,
  MENU_LABELS,
  NESTED_MENU_PROJECT_LABELS,
  NESTED_MENU_ROOT_LABELS,
  PLACEMENT_OPTIONS,
} from '../../src/example-data';

describe('shared demo fixture data', () => {
  test('keeps the placement selector complete and centered on the shared default', () => {
    expect(PLACEMENT_OPTIONS).toHaveLength(12);
    expect(PLACEMENT_OPTIONS).toContain(DEFAULT_PLACEMENT);
    expect(new Set(PLACEMENT_OPTIONS).size).toBe(PLACEMENT_OPTIONS.length);
  });

  test('provides the same menu collections to every implementation', () => {
    expect(MENU_LABELS).toEqual([
      'North star',
      'Orbit map',
      'Signal log',
      'Field notes',
    ]);
    expect(NESTED_MENU_ROOT_LABELS).toHaveLength(3);
    expect(NESTED_MENU_PROJECT_LABELS).toHaveLength(3);
  });
});
