import {FloatingArrowElement} from './FloatingArrowElement';
import {FloatingRootElement} from './FloatingRootElement';
import {
  FloatingItemElement,
  FloatingReferenceElement,
} from './RootParts';
import {
  FloatingFocusManagerElement,
  FloatingOverlayElement,
  FloatingPortalElement,
  FloatingPortalTargetElement,
  FloatingTransitionElement,
} from './SurfaceComponents';
import {
  FloatingCompositeElement,
  FloatingCompositeItemElement,
  FloatingDelayGroupElement,
  FloatingListElement,
  FloatingListItemElement,
  FloatingNodeElement,
  FloatingTreeElement,
  NextFloatingDelayGroupElement,
} from './CollectionComponents';

const floatingElements = [
  ['floating-root', FloatingRootElement],
  ['floating-reference', FloatingReferenceElement],
  ['floating-item', FloatingItemElement],
  ['floating-portal', FloatingPortalElement],
  ['floating-portal-target', FloatingPortalTargetElement],
  ['floating-overlay', FloatingOverlayElement],
  ['floating-arrow', FloatingArrowElement],
  ['floating-focus-manager', FloatingFocusManagerElement],
  ['floating-transition', FloatingTransitionElement],
  ['floating-tree', FloatingTreeElement],
  ['floating-node', FloatingNodeElement],
  ['floating-list', FloatingListElement],
  ['floating-list-item', FloatingListItemElement],
  ['floating-delay-group', FloatingDelayGroupElement],
  ['next-floating-delay-group', NextFloatingDelayGroupElement],
  ['floating-composite', FloatingCompositeElement],
  ['floating-composite-item', FloatingCompositeItemElement],
] as const;

export function defineFloatingElements(
  registry: CustomElementRegistry | undefined = globalThis.customElements,
) {
  if (!registry) return;
  for (const [name, constructor] of floatingElements) {
    if (!registry.get(name)) {
      registry.define(name, constructor);
    }
  }
}

defineFloatingElements();
