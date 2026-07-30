import {isElement, isHTMLElement} from '@floating-ui/utils/dom';

import type {FloatingStyles, ValueOrGetter} from '../types';
import {FLOATING_UI_PLUS_FOCUSABLE_ATTRIBUTE} from '../constants';

export type Ref<T> = {current: T};

const FLOATING_STYLE_KEYS = [
  'position',
  'left',
  'top',
  'right',
  'bottom',
  'transform',
  'willChange',
] as const;

/** Applies a controller's complete positioning output to its floating surface. */
export function applyFloatingStyles(
  element: HTMLElement,
  styles: FloatingStyles,
) {
  FLOATING_STYLE_KEYS.forEach((name) => {
    const value = styles[name];
    if (value == null || value === '') {
      element.style.removeProperty(
        name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
      );
    } else {
      element.style[name] = value;
    }
  });
}

export type PossibleRef<T> =
  | ((value: T | null) => void)
  | {current: T | null}
  | null
  | undefined;

export function mergeRefs<T>(refs: PossibleRef<T>[]) {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref) {
        ref.current = value;
      }
    });
  };
}

export function enqueueMicrotask(callback: () => void) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
  } else {
    void Promise.resolve().then(callback);
  }
}

export function getValue<T>(value: ValueOrGetter<T>): T {
  return typeof value === 'function' ? (value as () => T)() : value;
}

export function getDocument(node: Element | null | undefined): Document {
  return node?.ownerDocument || document;
}

export function activeElement(doc: Document): Element | null {
  let active = doc.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

export function contains(
  parent?: Element | null,
  child?: Element | null,
): boolean {
  if (!parent || !child) return false;
  return parent === child || parent.contains(child);
}

export function getTarget(event: Event): EventTarget | null {
  return event.composedPath?.()[0] || event.target;
}

export function isTypeableElement(element: unknown): element is HTMLElement {
  return (
    isHTMLElement(element) &&
    (element.matches('input:not([type="button"]):not([type="submit"])') ||
      element.matches('textarea') ||
      element.isContentEditable)
  );
}

export function isTypeableCombobox(
  element: Element | null,
): element is HTMLElement {
  return (
    isTypeableElement(element) && element.getAttribute('role') === 'combobox'
  );
}

export function matchesFocusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

export function getFloatingFocusElement(
  floating: HTMLElement | null,
): HTMLElement | null {
  if (!floating) return null;
  return (
    floating.querySelector<HTMLElement>(
      `[${FLOATING_UI_PLUS_FOCUSABLE_ATTRIBUTE}]`,
    ) ||
    floating
  );
}

export function isVirtualClick(event: MouseEvent | PointerEvent): boolean {
  if (
    (event as MouseEvent & {mozInputSource?: number}).mozInputSource === 0 &&
    event.isTrusted
  ) {
    return true;
  }

  return event.detail === 0 && !('pointerType' in event && event.pointerType);
}

export function isVirtualPointerEvent(event: PointerEvent): boolean {
  return (
    event.width === 0 &&
    event.height === 0 &&
    event.pressure === 0 &&
    event.detail === 0 &&
    event.pointerType === 'mouse'
  );
}

export function isMouseLikePointerType(
  pointerType: string | undefined,
  strict = false,
): boolean {
  const values = strict ? ['mouse'] : ['mouse', 'pen'];
  return pointerType == null || values.includes(pointerType);
}

export function setAttributes(
  element: Element,
  attributes: Record<string, string | boolean | null | undefined>,
  previous: Set<string> = new Set(),
): Set<string> {
  const next = new Set(Object.keys(attributes));
  previous.forEach((name) => {
    if (!next.has(name)) {
      element.removeAttribute(name);
    }
  });

  Object.entries(attributes).forEach(([name, value]) => {
    if (value == null || value === false) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value === true ? '' : String(value));
    }
  });

  return next;
}

export function isElementTarget(value: unknown): value is Element {
  return isElement(value);
}

export function createId(prefix = 'floating-ui') {
  const cryptoObject =
    typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObject && 'randomUUID' in cryptoObject) {
    return `${prefix}-${cryptoObject.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}
