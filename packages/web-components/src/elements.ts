import {FloatingArrowElement} from './FloatingArrowElement';
import {FloatingComboboxElement} from './FloatingComboboxElement';
import {FloatingQueryElement} from './FloatingQueryElement';
import {FloatingPresenceStackElement} from './FloatingPresenceStackElement';
import {
  FloatingResultsElement,
  FloatingSearchElement,
} from './FloatingResultsElement';
import {
  FloatingResultsEmptyElement,
  FloatingResultsErrorElement,
  FloatingResultsIdleElement,
  FloatingResultsItemElement,
  FloatingResultsLoadingElement,
  FloatingResultsMoreElement,
  FloatingResultsStatusElement,
} from './FloatingResultsParts';
import {FloatingRootElement} from './FloatingRootElement';
import {
  FloatingItemElement,
  FloatingReferenceElement,
} from './RootParts';
import {
  FloatingFocusManagerElement,
  FloatingContentElement,
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
  ['floating-content', FloatingContentElement],
  ['floating-portal-target', FloatingPortalTargetElement],
  ['floating-overlay', FloatingOverlayElement],
  ['floating-arrow', FloatingArrowElement],
  ['floating-focus-manager', FloatingFocusManagerElement],
  ['floating-transition', FloatingTransitionElement],
  ['floating-presence-stack', FloatingPresenceStackElement],
  ['floating-tree', FloatingTreeElement],
  ['floating-node', FloatingNodeElement],
  ['floating-list', FloatingListElement],
  ['floating-list-item', FloatingListItemElement],
  ['floating-query', FloatingQueryElement],
  ['floating-combobox', FloatingComboboxElement],
  ['floating-results', FloatingResultsElement],
  ['floating-search', FloatingSearchElement],
  ['floating-results-status', FloatingResultsStatusElement],
  ['floating-results-idle', FloatingResultsIdleElement],
  ['floating-results-loading', FloatingResultsLoadingElement],
  ['floating-results-error', FloatingResultsErrorElement],
  ['floating-results-empty', FloatingResultsEmptyElement],
  ['floating-results-item', FloatingResultsItemElement],
  ['floating-results-more', FloatingResultsMoreElement],
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
