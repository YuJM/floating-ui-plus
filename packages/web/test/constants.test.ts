import {describe, expect, test} from 'vitest';

import {
  FLOATING_CONTEXT_SCOPE,
  FLOATING_DELAY_GROUP_CONTEXT,
  FLOATING_LIST_CONTEXT,
  FLOATING_NODE_CONTEXT,
  FLOATING_TREE_CONTEXT,
  FLOATING_UI_PLUS_ARROW_ATTRIBUTE,
  FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
  FLOATING_UI_PLUS_DATA_ATTRIBUTE,
  FLOATING_UI_PLUS_FOCUSABLE_ATTRIBUTE,
  FLOATING_UI_PLUS_FOCUS_GUARD_ATTRIBUTE,
  FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE,
  FLOATING_UI_PLUS_PORTAL_ATTRIBUTE,
  FLOATING_UI_PLUS_TABINDEX_ATTRIBUTE,
  PLACEMENT,
  PLACEMENTS,
} from '../src';

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

describe('shared identifiers', () => {
  test('uses the short data-fup prefix for every public DOM marker', () => {
    expect({
      base: FLOATING_UI_PLUS_DATA_ATTRIBUTE,
      arrow: FLOATING_UI_PLUS_ARROW_ATTRIBUTE,
      arrowHeight: FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
      portal: FLOATING_UI_PLUS_PORTAL_ATTRIBUTE,
      overlay: FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE,
      focusGuard: FLOATING_UI_PLUS_FOCUS_GUARD_ATTRIBUTE,
      tabindex: FLOATING_UI_PLUS_TABINDEX_ATTRIBUTE,
      focusable: FLOATING_UI_PLUS_FOCUSABLE_ATTRIBUTE,
    }).toEqual({
      base: 'data-fup',
      arrow: 'data-fup-arrow',
      arrowHeight: 'data-fup-arrow-height',
      portal: 'data-fup-portal',
      overlay: 'data-fup-overlay',
      focusGuard: 'data-fup-focus-guard',
      tabindex: 'data-fup-tabindex',
      focusable: 'data-fup-focusable',
    });
  });

  test('keeps public context keys stable', () => {
    expect({
      scope: FLOATING_CONTEXT_SCOPE,
      tree: FLOATING_TREE_CONTEXT,
      node: FLOATING_NODE_CONTEXT,
      list: FLOATING_LIST_CONTEXT,
      delayGroup: FLOATING_DELAY_GROUP_CONTEXT,
    }).toEqual({
      scope: '@floating-ui-plus/context/scope',
      tree: '@floating-ui-plus/context/tree',
      node: '@floating-ui-plus/context/node',
      list: '@floating-ui-plus/context/list',
      delayGroup: '@floating-ui-plus/context/delay-group',
    });
  });
});
