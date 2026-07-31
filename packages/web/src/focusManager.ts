import {createFocusTrap} from 'focus-trap';
import type {FocusTrap} from 'focus-trap';

import type {FloatingPlugin, OpenChangeReason, ValueOrGetter} from './types';
import {FLOATING_UI_PLUS_FOCUS_GUARD_ATTRIBUTE} from './constants';
import {
  activeElement,
  contains,
  enqueueMicrotask,
  getFloatingFocusElement,
  getValue,
} from './utils/common';
import {getTabbableOptions, tabbable} from './utils/tabbable';

export type FocusTarget =
  | HTMLElement
  | {current: HTMLElement | null}
  | number
  | null;

export interface FocusManagerOptions {
  enabled?: boolean | undefined;
  modal?: boolean | undefined;
  initialFocus?: FocusTarget | undefined;
  returnFocus?:
    | boolean
    | HTMLElement
    | {current: HTMLElement | null}
    | undefined;
  restoreFocus?: boolean | undefined;
  order?: Array<'reference' | 'floating' | 'content'> | undefined;
  guards?: boolean | undefined;
  closeOnFocusOut?: boolean | undefined;
  visuallyHiddenDismiss?: boolean | string | undefined;
  outsideElementsInert?: boolean | undefined;
  isolateSubtrees?: false | 'aria-hidden' | 'inert' | undefined;
  getInsideElements?: (() => Element[]) | undefined;
  tabbableOptions?: Parameters<typeof tabbable>[1] | undefined;
}

const trapStacks = new WeakMap<Document, FocusTrap[]>();

function resolveElement(target: FocusTarget | boolean | undefined) {
  if (!target || typeof target === 'number' || target === true) return null;
  return 'current' in target ? target.current : target;
}

export function getDocumentTrapStack(document: Document): FocusTrap[] {
  let stack = trapStacks.get(document);
  if (!stack) {
    stack = [];
    trapStacks.set(document, stack);
  }
  return stack;
}

function returnFocus(target: HTMLElement) {
  const focus = () => {
    if (target.isConnected) {
      target.focus({preventScroll: true});
    }
  };
  const win = target.ownerDocument.defaultView;
  if (win) {
    win.setTimeout(focus, 0);
  } else {
    enqueueMicrotask(focus);
  }
}

export function focusManager(
  options: ValueOrGetter<FocusManagerOptions> = {},
): FloatingPlugin {
  let trap: FocusTrap | null = null;
  let previouslyFocused: HTMLElement | null = null;
  let lastFocusedInside: HTMLElement | null = null;
  let removeListeners: (() => void) | null = null;
  let dismissButtons: HTMLElement[] = [];
  let insideElementsObserver: MutationObserver | null = null;
  let insideElementsUpdateQueued = false;
  let trapReady = false;
  let trapContainerUpdatePending = false;
  let wasOpen = false;
  let returnFocusScheduled = false;
  let closeReason: OpenChangeReason | undefined;
  let closeEvent: Event | undefined;

  return {
    name: 'focusManager',
    connect(context) {
      const disconnectInsideElementsObserver = () => {
        insideElementsObserver?.disconnect();
        insideElementsObserver = null;
        insideElementsUpdateQueued = false;
        trapContainerUpdatePending = false;
      };
      const getTrapContainers = (
        floating: HTMLElement,
        current: FocusManagerOptions,
      ) => [
        ...new Set([
          floating,
          ...(current.getInsideElements?.().filter((element) =>
            element.isConnected,
          ) ?? []),
        ]),
      ] as HTMLElement[];
      const updateTrapContainers = (
        floating: HTMLElement,
        current: FocusManagerOptions,
      ) => {
        if (!trapReady || trap?.paused) {
          trapContainerUpdatePending = true;
          return;
        }
        trap?.updateContainerElements(getTrapContainers(floating, current));
      };
      const markTrapReady = (
        floating: HTMLElement,
        current: FocusManagerOptions,
      ) => {
        trapReady = true;
        if (!trapContainerUpdatePending) return;
        trapContainerUpdatePending = false;
        updateTrapContainers(floating, current);
      };
      const observeInsideElements = (
        floating: HTMLElement,
        current: FocusManagerOptions,
      ) => {
        disconnectInsideElementsObserver();
        if (!current.getInsideElements) return;
        const view = floating.ownerDocument.defaultView;
        const Observer = view?.MutationObserver ?? globalThis.MutationObserver;
        const target =
          floating.ownerDocument.body ??
          floating.ownerDocument.documentElement;
        if (!Observer || !target) return;
        insideElementsObserver = new Observer(() => {
          if (insideElementsUpdateQueued) return;
          insideElementsUpdateQueued = true;
          enqueueMicrotask(() => {
            insideElementsUpdateQueued = false;
            if (trap) updateTrapContainers(floating, getValue(options));
          });
        });
        insideElementsObserver.observe(target, {
          childList: true,
          subtree: true,
        });
      };
      const sync = () => {
        const current = getValue(options);
        const floating = context.elements.floating;
        const reference = context.elements.domReference as HTMLElement | null;
        const enabled = current.enabled !== false;

        if (!enabled || !context.open || !floating) {
          const wasActive = wasOpen;
          wasOpen = false;
          removeListeners?.();
          removeListeners = null;
          dismissButtons.forEach((element) => element.remove());
          dismissButtons = [];

          disconnectInsideElementsObserver();
          if (trap) {
            trap.deactivate();
            trap = null;
          }
          trapReady = false;

          const outsideFocusable =
            closeReason === 'outside-press' &&
            closeEvent?.target instanceof HTMLElement &&
            closeEvent.target.tabIndex >= 0;
          const returnTarget = resolveElement(current.returnFocus);
          if (
            wasActive &&
            closeReason !== 'focus-out' &&
            !outsideFocusable &&
            current.returnFocus !== false &&
            previouslyFocused
          ) {
            const target = returnTarget || reference || previouslyFocused;
            returnFocusScheduled = true;
            returnFocus(target);
          }
          if (wasActive) previouslyFocused = null;
          return;
        }

        const opening = !wasOpen;
        wasOpen = true;
        removeListeners?.();
        removeListeners = null;

        if (opening) {
          const focused = activeElement(floating.ownerDocument);
          previouslyFocused =
            focused instanceof HTMLElement ? focused : reference;
        }

        if (current.visuallyHiddenDismiss && !dismissButtons.length) {
          const label =
            typeof current.visuallyHiddenDismiss === 'string'
              ? current.visuallyHiddenDismiss
              : 'Dismiss';
          for (const position of ['before', 'after'] as const) {
            const button = floating.ownerDocument.createElement('button');
            button.type = 'button';
            button.textContent = label;
            button.setAttribute(FLOATING_UI_PLUS_FOCUS_GUARD_ATTRIBUTE, '');
            Object.assign(button.style, {
              position: 'fixed',
              width: '1px',
              height: '1px',
              padding: '0',
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: '0',
            });
            button.addEventListener('click', (event) => {
              context.onOpenChange(false, event, 'escape-key');
            });
            position === 'before'
              ? floating.prepend(button)
              : floating.append(button);
            dismissButtons.push(button);
          }
        }

        const onFocusIn = (event: FocusEvent) => {
          if (
            event.target instanceof HTMLElement &&
            contains(floating, event.target)
          ) {
            lastFocusedInside = event.target;
          }
        };
        const onFocusOut = (event: FocusEvent) => {
          if (current.closeOnFocusOut === false || current.modal !== false) {
            return;
          }
          enqueueMicrotask(() => {
            const focused = activeElement(floating.ownerDocument);
            const inside =
              contains(floating, focused) ||
              contains(reference, focused) ||
              current
                .getInsideElements?.()
                .some((element) => contains(element, focused));
            if (!inside) {
              context.onOpenChange(false, event, 'focus-out');
            }
          });
        };
        floating.addEventListener('focusin', onFocusIn);
        floating.addEventListener('focusout', onFocusOut);
        removeListeners = () => {
          floating.removeEventListener('focusin', onFocusIn);
          floating.removeEventListener('focusout', onFocusOut);
        };

        if (current.modal !== false && !trap) {
          if (
            __DEV__ &&
            floating.querySelector(
              '[tabindex]:not([tabindex^="-"]):not([tabindex="0"])',
            )
          ) {
            console.warn(
              'Positive tabindex values are discouraged and are not supported in multi-container focus traps.',
            );
          }
          const focusables = () =>
            tabbable(floating, {
              ...getTabbableOptions(),
              ...current.tabbableOptions,
            });
          const initialFocus = () => {
            const explicit = resolveElement(current.initialFocus);
            if (explicit) return explicit;
            if (
              typeof current.initialFocus === 'number' &&
              current.initialFocus < 0
            ) {
              return false;
            }
            if (typeof current.initialFocus === 'number') {
              return (
                focusables()[current.initialFocus] ||
                getFloatingFocusElement(floating)
              );
            }
            const order = current.order || ['content'];
            for (const part of order) {
              if (part === 'reference' && reference) return reference;
              if (part === 'floating') return floating;
              if (part === 'content' && focusables()[0]) return focusables()[0];
            }
            return getFloatingFocusElement(floating);
          };

          trapReady = false;
          trapContainerUpdatePending = false;
          trap = createFocusTrap(getTrapContainers(floating, current), {
            escapeDeactivates: false,
            clickOutsideDeactivates: false,
            allowOutsideClick: true,
            fallbackFocus: () => getFloatingFocusElement(floating) || floating,
            initialFocus:
              typeof current.initialFocus === 'number' &&
              current.initialFocus < 0
                ? false
                : () => initialFocus() || floating,
            // Dynamic multi-container traps must finish isolation before a
            // portal mutation can request another container update.
            delayInitialFocus: current.getInsideElements ? false : true,
            returnFocusOnDeactivate: false,
            trapStack: getDocumentTrapStack(floating.ownerDocument),
            onPause: () => {
              trapReady = false;
            },
            onPostActivate: () =>
              markTrapReady(floating, getValue(options)),
            onPostUnpause: () =>
              markTrapReady(floating, getValue(options)),
            tabbableOptions: {
              ...getTabbableOptions(),
              ...current.tabbableOptions,
            },
            isolateSubtrees: current.outsideElementsInert
              ? 'inert' in floating
                ? 'inert'
                : 'aria-hidden'
              : current.isolateSubtrees ?? 'aria-hidden',
          });
          trap.activate();
          observeInsideElements(floating, current);
        } else if (trap) {
          updateTrapContainers(floating, current);
        } else if (current.modal === false && opening) {
          enqueueMicrotask(() => {
            const target =
              current.restoreFocus && lastFocusedInside
                ? lastFocusedInside
                : resolveElement(current.initialFocus) ||
                  getFloatingFocusElement(floating);
            target?.focus({preventScroll: true});
          });
        }
      };

      sync();
      const unsubscribe = context.events.on('openchange', (event) => {
        if (!event.open) {
          closeReason = event.reason;
          closeEvent = event.event;
        } else {
          returnFocusScheduled = false;
          closeReason = undefined;
          closeEvent = undefined;
        }
        enqueueMicrotask(sync);
      });
      return () => {
        const current = getValue(options);
        const wasActive = wasOpen;
        const closedThisTurn = closeReason !== undefined;
        // Conditional renderers can unmount the manager in the same turn that
        // closes the surface. Finish the closed-state sync before discarding
        // the captured return target.
        if (wasActive && (!context.open || current.enabled === false)) {
          sync();
        }
        const reference = context.elements.domReference as HTMLElement | null;
        const outsideFocusable =
          closeReason === 'outside-press' &&
          closeEvent?.target instanceof HTMLElement &&
          closeEvent.target.tabIndex >= 0;
        if (
          (wasActive || closedThisTurn) &&
          !returnFocusScheduled &&
          current.returnFocus !== false &&
          closeReason !== 'focus-out' &&
          !outsideFocusable
        ) {
          const target =
            resolveElement(current.returnFocus) ||
            reference ||
            previouslyFocused;
          if (target) {
            returnFocusScheduled = true;
            returnFocus(target);
          }
        }
        unsubscribe();
        removeListeners?.();
        dismissButtons.forEach((element) => element.remove());
        disconnectInsideElementsObserver();
        trap?.deactivate();
        trap = null;
        trapReady = false;
        removeListeners = null;
        dismissButtons = [];
        previouslyFocused = null;
        wasOpen = false;
      };
    },
    update(context) {
      context.events.emit('openchange', {
        open: context.open,
        nested: context.nested,
      });
    },
  };
}
