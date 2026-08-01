import {getOverflowAncestors} from '@floating-ui/dom';
import {isElement} from '@floating-ui/utils/dom';

import {addListener, cleanupAll} from '../events';
import type {FloatingTree} from '../tree';
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
  let compositionTimeout = -1;

  return {
    name: 'dismiss',
    connect(context) {
      const reference = context.elements.domReference;
      const floating = context.elements.floating;
      const doc = floating?.ownerDocument || reference?.ownerDocument;
      if (!doc) return;
      const win = doc.defaultView || window;

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
      const normalizeProp = (
        value: DismissOptions['bubbles'] | DismissOptions['capture'],
      ) => ({
        escapeKey:
          typeof value === 'boolean' ? value : value?.escapeKey ?? false,
        outsidePress:
          typeof value === 'boolean' ? value : value?.outsidePress ?? true,
      });
      const getTreeState = () => {
        const tree = context.data.floatingTree as FloatingTree | undefined;
        const nodeId = context.data.nodeId;
        const descendants =
          tree && typeof nodeId === 'string'
            ? tree.descendants(nodeId)
            : [];
        return {descendants, tree};
      };

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
        const {escapeKey: escapeKeyBubbles} = normalizeProp(current.bubbles);
        context.data.__escapeKeyBubbles = escapeKeyBubbles;
        if (!escapeKeyBubbles) {
          event.stopPropagation();
          const {descendants} = getTreeState();
          if (
            descendants.some(
              (node) =>
                node.controller.context.open &&
                !node.controller.context.data.__escapeKeyBubbles,
            )
          ) {
            return;
          }
        }
        // The library owns this Escape action. Prevent the browser's native
        // dialog cancel default so a parent top-layer dialog cannot dismiss
        // after a nested floating surface has handled the same key.
        event.preventDefault();
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
        const {descendants} = getTreeState();
        if (
          contains(floating, target as Element) ||
          contains(reference, target as Element) ||
          descendants.some((node) =>
            contains(node.controller.context.elements.floating, target as Element),
          )
        ) {
          startedInside = false;
          return;
        }
        if (
          (current.outsidePressEvent || 'pointerdown') === 'click' &&
          startedInside
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
        const {outsidePress: outsidePressBubbles} = normalizeProp(
          current.bubbles,
        );
        context.data.__outsidePressBubbles = outsidePressBubbles;
        if (
          descendants.some(
            (node) =>
              node.controller.context.open &&
              !node.controller.context.data.__outsidePressBubbles,
          )
        ) {
          return;
        }
        context.onOpenChange(false, event, 'outside-press');
      };

      const initial = getOptions();
      const initialBubbles = normalizeProp(initial.bubbles);
      const initialCapture = normalizeProp(initial.capture);
      context.data.__escapeKeyBubbles = initialBubbles.escapeKey;
      context.data.__outsidePressBubbles = initialBubbles.outsidePress;
      const cleanups = [
        addListener(doc, 'compositionstart', () => {
          win.clearTimeout(compositionTimeout);
          composing = true;
        }),
        addListener(doc, 'compositionend', () => {
          win.clearTimeout(compositionTimeout);
          compositionTimeout = win.setTimeout(() => {
            composing = false;
          }, 0);
        }),
        addListener(doc, 'keydown', onEscape, initialCapture.escapeKey),
        addListener(
          doc,
          initial.outsidePressEvent || 'pointerdown',
          onOutsidePress as EventListener,
          initialCapture.outsidePress,
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

      if (initial.outsidePressEvent === 'click') {
        const markInside = (event: MouseEvent) => {
          if (event.button === 0) {
            startedInside = true;
          }
        };
        cleanups.push(
          addListener(floating, 'mousedown', markInside),
          addListener(floating, 'mouseup', markInside),
        );
      }

      if (initial.ancestorScroll) {
        const ancestors = new Set<EventTarget>();
        if (reference) {
          getOverflowAncestors(reference).forEach((ancestor) =>
            ancestors.add(ancestor),
          );
        }
        if (floating) {
          getOverflowAncestors(floating).forEach((ancestor) =>
            ancestors.add(ancestor),
          );
        }
        const positionReference = context.elements.reference;
        if (
          positionReference &&
          !isElement(positionReference) &&
          positionReference.contextElement
        ) {
          getOverflowAncestors(positionReference.contextElement).forEach(
            (ancestor) => ancestors.add(ancestor),
          );
        }
        ancestors.delete(doc.defaultView?.visualViewport as EventTarget);
        ancestors.forEach((ancestor) => {
          cleanups.push(
            addListener(ancestor, 'scroll', (event: Event) => {
              if (context.open) {
                context.onOpenChange(false, event, 'ancestor-scroll');
              }
            }),
          );
        });
      }

      return () => {
        win.clearTimeout(compositionTimeout);
        delete context.data.__escapeKeyBubbles;
        delete context.data.__outsidePressBubbles;
        cleanupAll(cleanups)();
      };
    },
  };
}
