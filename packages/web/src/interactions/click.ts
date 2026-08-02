import {isHTMLElement} from '@floating-ui/utils/dom';

import {addListener, cleanupAll} from '../events';
import type {FloatingPlugin, ValueOrGetter} from '../types';
import {
  getTarget,
  getValue,
  isMouseLikePointerType,
  isTypeableElement,
} from '../utils/common';

export interface ClickOptions {
  enabled?: boolean | undefined;
  event?: 'click' | 'mousedown' | undefined;
  toggle?: boolean | undefined;
  ignoreMouse?: boolean | undefined;
  keyboardHandlers?: boolean | undefined;
  stickIfOpen?: boolean | undefined;
}

export function click(
  options: ValueOrGetter<ClickOptions> = {},
): FloatingPlugin {
  let pointerType: string | undefined;
  let didKeyDown = false;
  let didMouseDown = false;

  return {
    name: 'click',
    connect(context) {
      const reference = context.elements.domReference;
      if (!reference) return;

      function getOptions() {
        return {
          enabled: true,
          event: 'click' as const,
          toggle: true,
          ignoreMouse: false,
          keyboardHandlers: true,
          stickIfOpen: true,
          ...getValue(options),
        };
      }

      function toggle(event: Event) {
        const current = getOptions();
        const shouldClose =
          context.open &&
          current.toggle &&
          (context.data.openEvent && current.stickIfOpen
            ? context.data.openEvent.type === current.event
            : true);
        context.onOpenChange(!shouldClose, event, 'click');
      }

      function focusPointerReference() {
        // Safari does not focus buttons when they are clicked. Preserve the
        // reference as the keyboard event target so pointer-opened floating
        // controls can immediately continue with keyboard interaction.
        if (
          pointerType != null &&
          isMouseLikePointerType(pointerType) &&
          reference instanceof HTMLElement
        ) {
          reference.focus({preventScroll: true});
        }
      }

      return cleanupAll([
        addListener(reference, 'pointerdown', (event) => {
          pointerType = event.pointerType;
          context.data.pointerType = pointerType;
        }),
        addListener(reference, 'mousedown', (event) => {
          const current = getOptions();
          if (
            !current.enabled ||
            event.defaultPrevented ||
            event.button !== 0
          ) {
            return;
          }
          if (current.event !== 'mousedown') return;
          if (
            current.ignoreMouse &&
            isMouseLikePointerType(pointerType, true)
          ) {
            return;
          }
          if (!context.open) {
            event.preventDefault();
          }
          didMouseDown = true;
          focusPointerReference();
          toggle(event);
        }),
        addListener(reference, 'click', (event) => {
          const current = getOptions();
          if (!current.enabled || event.defaultPrevented) return;
          if (current.event === 'mousedown' && didMouseDown) {
            didMouseDown = false;
            pointerType = undefined;
            return;
          }
          if (
            current.ignoreMouse &&
            isMouseLikePointerType(pointerType, true)
          ) {
            return;
          }
          focusPointerReference();
          toggle(event);
        }),
        addListener(reference, 'keydown', (event) => {
          const current = getOptions();
          pointerType = undefined;
          const target = getTarget(event);
          if (
            !current.enabled ||
            event.defaultPrevented ||
            !current.keyboardHandlers ||
            (isHTMLElement(target) && target.tagName === 'BUTTON')
          ) {
            return;
          }
          if (
            event.key === ' ' &&
            !isTypeableElement(context.elements.domReference)
          ) {
            event.preventDefault();
            didKeyDown = true;
          }
          if (isHTMLElement(target) && target.tagName === 'A') return;
          if (event.key === 'Enter') {
            toggle(event);
          }
        }),
        addListener(reference, 'keyup', (event) => {
          const current = getOptions();
          const target = getTarget(event);
          if (
            !current.enabled ||
            event.defaultPrevented ||
            !current.keyboardHandlers ||
            (isHTMLElement(target) && target.tagName === 'BUTTON') ||
            isTypeableElement(context.elements.domReference)
          ) {
            return;
          }
          if (event.key === ' ' && didKeyDown) {
            didKeyDown = false;
            toggle(event);
          }
        }),
      ]);
    },
  };
}
