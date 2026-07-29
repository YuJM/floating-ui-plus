import {isElement} from '@floating-ui/utils/dom';

import {addListener, cleanupAll} from '../events';
import type {FloatingPlugin, ValueOrGetter} from '../types';
import {
  activeElement,
  contains,
  getDocument,
  getTarget,
  getValue,
  matchesFocusVisible,
} from '../utils/common';

export interface FocusOptions {
  enabled?: boolean | undefined;
  visibleOnly?: boolean | undefined;
}

export function focus(
  options: ValueOrGetter<FocusOptions> = {},
): FloatingPlugin {
  let blockFocus = false;
  let timeout = -1;

  return {
    name: 'focus',
    connect(context) {
      const reference = context.elements.domReference;
      if (!reference) return;
      const win = reference.ownerDocument.defaultView;

      const getOptions = () => ({
        enabled: true,
        visibleOnly: true,
        ...getValue(options),
      });

      const cleanups = [
        context.events.on('openchange', ({reason}) => {
          if (reason === 'reference-press' || reason === 'escape-key') {
            blockFocus = true;
          }
        }),
        addListener(reference, 'mouseleave', () => {
          blockFocus = false;
        }),
        addListener(reference, 'focus', (event) => {
          const current = getOptions();
          if (!current.enabled || blockFocus || event.defaultPrevented) return;
          const target = getTarget(event);
          if (
            current.visibleOnly &&
            isElement(target) &&
            !matchesFocusVisible(target)
          ) {
            return;
          }
          context.onOpenChange(true, event, 'focus');
        }),
        addListener(reference, 'blur', (event) => {
          const current = getOptions();
          if (!current.enabled) return;
          blockFocus = false;
          const related = event.relatedTarget as Element | null;
          win?.clearTimeout(timeout);
          timeout =
            win?.setTimeout(() => {
              const active = activeElement(getDocument(reference));
              if (!related && active === reference) {
                return;
              }
              if (
                contains(context.elements.floating, active) ||
                contains(reference, active)
              ) {
                return;
              }
              context.onOpenChange(false, event, 'focus');
            }) ?? -1;
        }),
      ];

      if (win) {
        cleanups.push(
          addListener(win, 'blur', () => {
            if (
              !context.open &&
              reference === activeElement(getDocument(reference))
            ) {
              blockFocus = true;
            }
          }),
        );
      }

      return () => {
        win?.clearTimeout(timeout);
        cleanupAll(cleanups)();
      };
    },
  };
}
