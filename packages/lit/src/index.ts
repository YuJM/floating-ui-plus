export * from '@floating-ui-plus/web';

// The explicit export replaces the framework-neutral controller type with the
// Lit ReactiveController adapter at this package boundary.
export {FloatingController} from './FloatingController';
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
