import {getOverflowAncestors} from '@floating-ui/dom';

import {addListener, cleanupAll} from '../events';
import type {FloatingPlugin, ValueOrGetter} from '../types';
import {contains, getTarget, getValue} from '../utils/common';

export interface DismissOptions {
  enabled?: boolean | undefined;
  escapeKey?: boolean | undefined;
  outsidePress?: boolean | ((event: MouseEvent) => boolean) | undefined;
  outsidePressEvent?: 'pointerdown' | 'mousedown' | 'click' | undefined;
  referencePress?: boolean | undefined;
  referencePressEvent?: 'pointerdown' | 'mousedown' | 'click' | undefined;
  ancestorScroll?: boolean | undefined;
  bubbles?:
    | boolean
    | {escapeKey?: boolean | undefined; outsidePress?: boolean | undefined}
    | undefined;
  capture?:
    | boolean
    | {escapeKey?: boolean | undefined; outsidePress?: boolean | undefined}
    | undefined;
}

export function dismiss(
  options: ValueOrGetter<DismissOptions> = {},
): FloatingPlugin {
  let composing = false;
  let startedInside = false;

  return {
    name: 'dismiss',
    connect(context) {
      const reference = context.elements.domReference;
      const floating = context.elements.floating;
      const doc = floating?.ownerDocument || reference?.ownerDocument;
      if (!doc) return;

      const getOptions = () => ({
        enabled: true,
        escapeKey: true,
        outsidePress: true as DismissOptions['outsidePress'],
        outsidePressEvent: 'pointerdown' as const,
        referencePress: false,
        referencePressEvent: 'pointerdown' as const,
        ancestorScroll: false,
        ...getValue(options),
      });

      const onEscape = (event: KeyboardEvent) => {
        const current = getOptions();
        if (
          !current.enabled ||
          event.defaultPrevented ||
          !context.open ||
          !current.escapeKey ||
          composing ||
          event.key !== 'Escape'
        ) {
          return;
        }
        context.onOpenChange(false, event, 'escape-key');
      };

      const onOutsidePress = (event: MouseEvent) => {
        const current = getOptions();
        if (
          !current.enabled ||
          event.defaultPrevented ||
          !context.open ||
          !current.outsidePress
        ) {
          return;
        }
        const target = getTarget(event);
        if (!(target instanceof Node) || !target.isConnected) return;
        if (
          startedInside ||
          contains(floating, target as Element) ||
          contains(reference, target as Element)
        ) {
          startedInside = false;
          return;
        }
        startedInside = false;
        if (
          typeof current.outsidePress === 'function' &&
          !current.outsidePress(event)
        ) {
          return;
        }
        context.onOpenChange(false, event, 'outside-press');
      };

      const initial = getOptions();
      const cleanups = [
        addListener(doc, 'compositionstart', () => {
          composing = true;
        }),
        addListener(doc, 'compositionend', () => {
          composing = false;
        }),
        addListener(doc, 'keydown', onEscape, true),
        addListener(floating, 'pointerdown', () => {
          startedInside = true;
        }),
        addListener(
          doc,
          initial.outsidePressEvent || 'pointerdown',
          onOutsidePress as EventListener,
          true,
        ),
        addListener(
          reference,
          initial.referencePressEvent || 'pointerdown',
          (event: Event) => {
            const current = getOptions();
            if (
              !current.enabled ||
              event.defaultPrevented ||
              !current.referencePress
            ) {
              return;
            }
            context.onOpenChange(false, event, 'reference-press');
          },
        ),
      ];

      if (initial.ancestorScroll && reference) {
        getOverflowAncestors(reference).forEach((ancestor) => {
          cleanups.push(
            addListener(ancestor, 'scroll', (event: Event) => {
              if (context.open) {
                context.onOpenChange(false, event, 'ancestor-scroll');
              }
            }),
          );
        });
      }

      return cleanupAll(cleanups);
    },
  };
}
