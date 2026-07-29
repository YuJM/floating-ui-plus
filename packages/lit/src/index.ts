export * from '@floating-ui-plus/web';

// The explicit export replaces the framework-neutral controller type with the
// Lit ReactiveController adapter at this package boundary.
export {FloatingController} from './FloatingController';
export type {
  FloatingItemState,
  LightDomControllerHost,
} from './FloatingController';
export {floatingOverlay, lockScroll} from './overlay';
export type {FloatingOverlayOptions} from './overlay';
