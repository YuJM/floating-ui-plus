export * from '@floating-ui-plus/web';

// Explicit exports replace framework-neutral controllers with Lit lifecycle
// adapters at this package boundary.
export {FloatingController} from './FloatingController';
export {SearchController} from './SearchController';
export type {SearchOptionsSource} from './SearchController';
export type {
  FloatingDelayGroupOptions,
  FloatingItemState,
  FloatingModalOptions,
  FloatingNodeOptions,
  LightDomControllerHost,
} from './FloatingController';
export {floatingOverlay, lockScroll} from './overlay';
export type {FloatingOverlayOptions} from './overlay';
export {
  LIT_FLOATING_DELAY_GROUP_CONTEXT,
  LIT_FLOATING_LIST_CONTEXT,
  LIT_FLOATING_NODE_CONTEXT,
  LIT_FLOATING_TREE_CONTEXT,
} from './context';
export type {LitContextProvider} from './context';
export {floatingTransition} from './transition';
export type {
  FloatingTransitionRenderer,
  FloatingTransitionState,
} from './transition';
