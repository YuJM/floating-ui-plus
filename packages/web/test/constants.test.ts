import {describe, expect, test} from 'vitest';

import {PLACEMENT, PLACEMENTS} from '../src';

describe('placement constants', () => {
  test('exposes every valid placement exactly once', () => {
    expect(PLACEMENTS).toEqual([
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
    ]);
    expect(new Set(PLACEMENTS).size).toBe(12);
    expect(PLACEMENT.BOTTOM_START).toBe('bottom-start');
  });

  test('keeps the public collections immutable', () => {
    expect(Object.isFrozen(PLACEMENT)).toBe(true);
    expect(Object.isFrozen(PLACEMENTS)).toBe(true);
  });
});
