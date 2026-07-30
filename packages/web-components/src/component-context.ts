import {createContext} from 'atomico';
import type {
  CompositeController,
  DelayGroup,
  FloatingContextScope,
  FloatingList,
  FloatingTree,
} from '@floating-ui-plus/web';

import type {FloatingRootElement} from './FloatingRootElement';

export interface FloatingCompositeContext {
  controller: CompositeController;
  elements: Set<HTMLElement>;
  sync(): void;
}

export interface FloatingComponentContext {
  root?: FloatingRootElement | undefined;
  open?: boolean | undefined;
  portalTarget?: Element | undefined;
  tree?: FloatingTree | undefined;
  parentNodeId: string | null;
  contextScope?: FloatingContextScope | undefined;
  list?: FloatingList<unknown> | undefined;
  delayGroup?: DelayGroup | undefined;
  composite?: FloatingCompositeContext | undefined;
}

export const floatingComponentContext =
  createContext<FloatingComponentContext>({
    root: undefined,
    open: undefined,
    portalTarget: undefined,
    tree: undefined,
    parentNodeId: null,
    contextScope: undefined,
    list: undefined,
    delayGroup: undefined,
    composite: undefined,
  });
