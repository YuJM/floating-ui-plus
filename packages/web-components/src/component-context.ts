import {createContext} from '@lit/context';
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

export const floatingRootContext = createContext<FloatingRootElement>(
  Symbol('floating-root'),
);
export const floatingTreeContext = createContext<FloatingTree>(
  Symbol('floating-tree'),
);
export const floatingParentNodeContext = createContext<string | null>(
  Symbol('floating-parent-node'),
);
export const floatingContextScopeContext = createContext<FloatingContextScope>(
  Symbol('floating-context-scope'),
);
export const floatingListContext = createContext<FloatingList<unknown>>(
  Symbol('floating-list'),
);
export const floatingDelayGroupContext = createContext<DelayGroup>(
  Symbol('floating-delay-group'),
);
export const floatingCompositeContext = createContext<FloatingCompositeContext>(
  Symbol('floating-composite'),
);
