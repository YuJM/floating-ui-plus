export * from '@floating-ui-plus/web';

export {FloatingArrowElement} from './FloatingArrowElement';
export {
  FloatingPresenceStackElement,
  type FloatingPresenceStackChangeDetail,
  type FloatingPresenceStackElementOptions,
} from './FloatingPresenceStackElement';
export {
  FloatingQueryElement,
  type FloatingQueryActivateDetail,
  type FloatingQueryStateChangeDetail,
} from './FloatingQueryElement';
export {createFloatingQueryStatusFormatter} from './query-types';
export type {
  FloatingQueryConfiguration,
  FloatingQuerySearchConfiguration,
  FloatingQueryStatusMessages,
  FloatingQueryStatusContext,
  FloatingQueryStatusFormatter,
  FloatingQueryStatusText,
} from './query-types';
export {
  /** @deprecated Use `FloatingQueryElement` for a generic editable query. */
  FloatingComboboxElement,
  type FloatingComboboxSelectDetail,
  type FloatingComboboxStateChangeDetail,
} from './FloatingComboboxElement';
export {
  FLOATING_SEARCH_PHASES,
  FloatingResultsElement,
  /** @deprecated Use `FloatingResultsElement`. */
  FloatingSearchElement,
} from './FloatingResultsElement';
export {
  FloatingResultsPartElement,
  FloatingResultsStatusElement,
  FloatingResultsIdleElement,
  FloatingResultsLoadingElement,
  FloatingResultsErrorElement,
  FloatingResultsEmptyElement,
  FloatingResultsItemElement,
  FloatingResultsMoreElement,
} from './FloatingResultsParts';
export {createFloatingComboboxStatusFormatter} from './combobox-types';
export type {
  FloatingComboboxConfiguration,
  FloatingComboboxSearchConfiguration,
  FloatingComboboxStatusMessages,
  FloatingComboboxStatusContext,
  FloatingComboboxStatusFormatter,
  FloatingComboboxStatusText,
} from './combobox-types';
export {
  FloatingItemElement,
  FloatingReferenceElement,
} from './RootParts';
export {
  FLOATING_UI_PLUS_CLOSE_ATTRIBUTE,
  FLOATING_UI_PLUS_CONTENT_ATTRIBUTE,
  FLOATING_UI_PLUS_CONTENT_SLOT,
} from './constants';
export {
  FloatingRootElement,
  type FloatingRootConfiguration,
  type FloatingRootEventDetailMap,
  type FloatingRootEventType,
  type FloatingBeforeCloseDetail,
  type FloatingOpenChangeDetail,
  type FloatingTemplateLifecycleDetail,
} from './FloatingRootElement';
export {
  FloatingFocusManagerElement,
  FloatingContentElement,
  FloatingOverlayElement,
  FloatingPortalElement,
  FloatingTransitionElement,
} from './SurfaceComponents';
export {
  FloatingCompositeElement,
  FloatingCompositeItemElement,
  FloatingDelayGroupElement,
  FloatingListElement,
  type FloatingListActiveIndexChangeDetail,
  FloatingListItemElement,
  FloatingNodeElement,
  FloatingTreeElement,
  NextFloatingDelayGroupElement,
} from './CollectionComponents';
export {defineFloatingElements} from './elements';
