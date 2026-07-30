import type {Placement} from '@floating-ui/dom';

/**
 * Runtime-safe placement values for consumers that prefer constants over
 * repeating string literals.
 */
export const PLACEMENT = Object.freeze({
  TOP_START: 'top-start',
  TOP: 'top',
  TOP_END: 'top-end',
  RIGHT_START: 'right-start',
  RIGHT: 'right',
  RIGHT_END: 'right-end',
  BOTTOM_END: 'bottom-end',
  BOTTOM: 'bottom',
  BOTTOM_START: 'bottom-start',
  LEFT_END: 'left-end',
  LEFT: 'left',
  LEFT_START: 'left-start',
} as const satisfies Record<string, Placement>);

/** All placement constants in clockwise visual order. */
export const PLACEMENTS = Object.freeze([
  PLACEMENT.TOP_START,
  PLACEMENT.TOP,
  PLACEMENT.TOP_END,
  PLACEMENT.RIGHT_START,
  PLACEMENT.RIGHT,
  PLACEMENT.RIGHT_END,
  PLACEMENT.BOTTOM_END,
  PLACEMENT.BOTTOM,
  PLACEMENT.BOTTOM_START,
  PLACEMENT.LEFT_END,
  PLACEMENT.LEFT,
  PLACEMENT.LEFT_START,
] as const satisfies readonly Placement[]);

export type PlacementConstant = (typeof PLACEMENT)[keyof typeof PLACEMENT];

/** Prefix for DOM markers emitted by Floating UI Plus. */
export const FLOATING_UI_PLUS_DATA_ATTRIBUTE = 'data-floating-ui-plus';

export const FLOATING_UI_PLUS_PORTAL_ATTRIBUTE =
  `${FLOATING_UI_PLUS_DATA_ATTRIBUTE}-portal`;
export const FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE =
  `${FLOATING_UI_PLUS_DATA_ATTRIBUTE}-overlay`;
export const FLOATING_UI_PLUS_FOCUS_GUARD_ATTRIBUTE =
  `${FLOATING_UI_PLUS_DATA_ATTRIBUTE}-focus-guard`;
export const FLOATING_UI_PLUS_TABINDEX_ATTRIBUTE =
  `${FLOATING_UI_PLUS_DATA_ATTRIBUTE}-tabindex`;
export const FLOATING_UI_PLUS_FOCUSABLE_ATTRIBUTE =
  `${FLOATING_UI_PLUS_DATA_ATTRIBUTE}-focusable`;

/** Context keys shared by trees, collections, delay groups, and portals. */
export const FLOATING_CONTEXT_SCOPE = '@floating-ui-plus/context/scope';
export const FLOATING_TREE_CONTEXT = '@floating-ui-plus/context/tree';
export const FLOATING_NODE_CONTEXT = '@floating-ui-plus/context/node';
export const FLOATING_LIST_CONTEXT = '@floating-ui-plus/context/list';
export const FLOATING_DELAY_GROUP_CONTEXT =
  '@floating-ui-plus/context/delay-group';
