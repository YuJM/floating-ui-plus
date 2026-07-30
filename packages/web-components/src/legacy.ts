/**
 * Internal compatibility surface used only by the package's regression tests.
 *
 * This module is intentionally absent from package.json exports. The published
 * Web Components package exposes custom elements instead of Lit directives or
 * reactive controllers.
 */
export * from '@floating-ui-plus/web';

export {FloatingController} from './FloatingController';
export type {
  FloatingDelayGroupOptions,
  FloatingItemState,
  FloatingModalOptions,
  FloatingNodeOptions,
  LightDomControllerHost,
} from './FloatingController';
export {SearchController} from './SearchController';
export type {SearchOptionsSource} from './SearchController';
export {
  LIT_FLOATING_DELAY_GROUP_CONTEXT,
  LIT_FLOATING_LIST_CONTEXT,
  LIT_FLOATING_NODE_CONTEXT,
  LIT_FLOATING_TREE_CONTEXT,
} from './context';
export type {LitContextProvider} from './context';
export {floatingOverlay, lockScroll} from './overlay';
export type {FloatingOverlayOptions} from './overlay';
export {floatingTransition} from './transition';
export type {
  FloatingTransitionRenderer,
  FloatingTransitionState,
} from './transition';
