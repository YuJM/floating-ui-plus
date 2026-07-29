import {
  focusable,
  isTabbable,
  tabbable,
  type FocusableElement,
  type CheckOptions,
  type TabbableOptions,
} from 'tabbable';

import {activeElement, getDocument} from './common';

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
    element.dataset.floatingUiTabindex = element.getAttribute('tabindex') ?? '';
    element.setAttribute('tabindex', '-1');
  });
}

export function enableFocusInside(container: HTMLElement) {
  container
    .querySelectorAll<HTMLElement>('[data-floating-ui-tabindex]')
    .forEach((element) => {
      const value = element.dataset.floatingUiTabindex;
      if (value) {
        element.setAttribute('tabindex', value);
      } else {
        element.removeAttribute('tabindex');
      }
      delete element.dataset.floatingUiTabindex;
    });
}

export {isFocusable} from 'tabbable';
export {focusable, isTabbable, tabbable};
export type {CheckOptions, FocusableElement, TabbableOptions};
