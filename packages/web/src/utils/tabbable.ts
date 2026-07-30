import {
  focusable,
  isTabbable,
  tabbable,
  type FocusableElement,
  type CheckOptions,
  type TabbableOptions,
} from 'tabbable';

import {activeElement, getDocument} from './common';
import {FLOATING_UI_PLUS_TABINDEX_ATTRIBUTE} from '../constants';

export const getTabbableOptions = (): TabbableOptions & CheckOptions => ({
  getShadowRoot: false,
  displayCheck: 'full',
});

export function getFirstTabbableElement(
  element: HTMLElement,
): FocusableElement | null {
  return (
    (isTabbable(element, getTabbableOptions()) ? element : null) ||
    tabbable(element, getTabbableOptions())[0] ||
    null
  );
}

export function getNextTabbable(reference: Element | null) {
  const doc = getDocument(reference);
  const list = tabbable(doc.body, getTabbableOptions());
  const index = list.indexOf(reference as FocusableElement);
  return list[index + 1] || null;
}

export function getPreviousTabbable(reference: Element | null) {
  const doc = getDocument(reference);
  const list = tabbable(doc.body, getTabbableOptions());
  const index = list.indexOf(reference as FocusableElement);
  return list[index - 1] || null;
}

export function isOutsideEvent(event: FocusEvent, container?: Element | null) {
  const current = container || (event.currentTarget as Element | null);
  const related = event.relatedTarget;
  return (
    current != null &&
    related instanceof Node &&
    !current.contains(related) &&
    activeElement(getDocument(current)) !== related
  );
}

export function disableFocusInside(container: HTMLElement) {
  focusable(container, getTabbableOptions()).forEach((element) => {
    element.setAttribute(
      FLOATING_UI_PLUS_TABINDEX_ATTRIBUTE,
      element.getAttribute('tabindex') ?? '',
    );
    element.setAttribute('tabindex', '-1');
  });
}

export function enableFocusInside(container: HTMLElement) {
  container
    .querySelectorAll<HTMLElement>(`[${FLOATING_UI_PLUS_TABINDEX_ATTRIBUTE}]`)
    .forEach((element) => {
      const value = element.getAttribute(FLOATING_UI_PLUS_TABINDEX_ATTRIBUTE);
      if (value) {
        element.setAttribute('tabindex', value);
      } else {
        element.removeAttribute('tabindex');
      }
      element.removeAttribute(FLOATING_UI_PLUS_TABINDEX_ATTRIBUTE);
    });
}

export {isFocusable} from 'tabbable';
export {focusable, isTabbable, tabbable};
export type {CheckOptions, FocusableElement, TabbableOptions};
