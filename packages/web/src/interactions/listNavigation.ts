import {addListener, cleanupAll} from '../events';
import type {FloatingPlugin, ValueOrGetter} from '../types';
import type {Ref} from '../utils/common';
import {
  findNonDisabledListIndex,
  getMaxListIndex,
  getMinListIndex,
  isListIndexDisabled,
} from '../utils/composite';
import {contains, enqueueMicrotask, getTarget, getValue} from '../utils/common';

export interface ListNavigationOptions {
  listRef: Ref<Array<HTMLElement | null>>;
  activeIndex: number | null;
  onNavigate?: ((activeIndex: number | null) => void) | undefined;
  enabled?: boolean | undefined;
  selectedIndex?: number | null | undefined;
  focusItemOnOpen?: boolean | 'auto' | undefined;
  focusItemOnHover?: boolean | undefined;
  openOnArrowKeyDown?: boolean | undefined;
  disabledIndices?: Array<number> | ((index: number) => boolean) | undefined;
  allowEscape?: boolean | undefined;
  loop?: boolean | undefined;
  nested?: boolean | undefined;
  rtl?: boolean | undefined;
  virtual?: boolean | undefined;
  orientation?: 'vertical' | 'horizontal' | 'both' | undefined;
  cols?: number | undefined;
  scrollItemIntoView?: boolean | ScrollIntoViewOptions | undefined;
  virtualItemRef?: Ref<HTMLElement | null> | undefined;
}

function isNavigationKey(
  key: string,
  orientation: 'vertical' | 'horizontal' | 'both',
) {
  if (orientation === 'vertical') {
    return key === 'ArrowDown' || key === 'ArrowUp';
  }
  if (orientation === 'horizontal') {
    return key === 'ArrowLeft' || key === 'ArrowRight';
  }
  return ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(key);
}

export function listNavigation(
  options: ValueOrGetter<ListNavigationOptions>,
): FloatingPlugin {
  let lastInput: 'pointer' | 'keyboard' = 'keyboard';

  return {
    name: 'listNavigation',
    connect(context) {
      const reference = context.elements.domReference;
      const floating = context.elements.floating;
      if (!reference && !floating) return;

      const getOptions = () => ({
        enabled: true,
        selectedIndex: null,
        focusItemOnOpen: 'auto' as const,
        focusItemOnHover: true,
        openOnArrowKeyDown: true,
        disabledIndices: undefined,
        allowEscape: false,
        loop: false,
        nested: false,
        rtl: false,
        virtual: false,
        orientation: 'vertical' as const,
        cols: 1,
        scrollItemIntoView: true as boolean | ScrollIntoViewOptions,
        ...getValue(options),
      });

      function navigate(index: number | null, event?: Event) {
        const current = getOptions();
        current.onNavigate?.(index);
        if (index == null) return;
        const element = current.listRef.current[index];
        if (!element) return;
        current.virtualItemRef && (current.virtualItemRef.current = element);
        if (!current.virtual) {
          element.focus({preventScroll: true});
        }
        if (current.scrollItemIntoView) {
          element.scrollIntoView(
            current.scrollItemIntoView === true
              ? {block: 'nearest', inline: 'nearest'}
              : current.scrollItemIntoView,
          );
        }
        if (event && !context.open && current.openOnArrowKeyDown) {
          context.onOpenChange(true, event, 'list-navigation');
        }
      }

      function onKeyDown(event: KeyboardEvent) {
        const current = getOptions();
        if (
          !current.enabled ||
          event.defaultPrevented ||
          !isNavigationKey(event.key, current.orientation || 'vertical')
        ) {
          return;
        }

        lastInput = 'keyboard';
        const listRef = current.listRef;
        const min = getMinListIndex(listRef, current.disabledIndices);
        const max = getMaxListIndex(listRef, current.disabledIndices);
        const active = current.activeIndex ?? current.selectedIndex ?? -1;
        const forwardKeys = [
          'ArrowDown',
          current.rtl ? 'ArrowLeft' : 'ArrowRight',
        ];
        const backward = !forwardKeys.includes(event.key);
        let next: number;

        const cols = current.cols || 1;
        if (cols > 1 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
          next = active + (backward ? -1 : 1);
        } else if (cols > 1 && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
          next = active + (backward ? -cols : cols);
          while (
            next >= min &&
            next <= max &&
            isListIndexDisabled(listRef, next, current.disabledIndices)
          ) {
            next += backward ? -cols : cols;
          }
        } else {
          next = findNonDisabledListIndex(listRef, {
            startingIndex: active,
            decrement: backward,
            disabledIndices: current.disabledIndices,
          });
        }

        if (next < min || next > max) {
          if (current.allowEscape && current.loop) {
            next = -1;
          } else if (current.loop) {
            next = backward ? max : min;
          } else {
            next = backward ? min : max;
          }
        }

        event.preventDefault();
        event.stopPropagation();
        navigate(next === -1 ? null : next, event);
      }

      function findItem(target: EventTarget | null) {
        const current = getOptions();
        return current.listRef.current.findIndex(
          (item) =>
            item != null &&
            target instanceof Node &&
            (item === target || contains(item, target as Element)),
        );
      }

      const cleanups = [
        addListener(reference, 'keydown', onKeyDown),
        addListener(floating, 'keydown', onKeyDown),
        addListener(reference, 'pointerdown', () => {
          lastInput = 'pointer';
        }),
        addListener(floating, 'pointermove', (event) => {
          const current = getOptions();
          if (!current.enabled || !current.focusItemOnHover) return;
          lastInput = 'pointer';
          const index = findItem(getTarget(event));
          if (
            index >= 0 &&
            !isListIndexDisabled(
              current.listRef,
              index,
              current.disabledIndices,
            )
          ) {
            navigate(index);
          }
        }),
      ];

      const unsubscribe = context.events.on('openchange', ({open}) => {
        const current = getOptions();
        if (!open || !current.enabled) return;
        const shouldFocus =
          current.focusItemOnOpen === true ||
          (current.focusItemOnOpen === 'auto' && lastInput === 'keyboard');
        if (!shouldFocus) return;
        const index =
          current.selectedIndex ??
          current.activeIndex ??
          getMinListIndex(current.listRef, current.disabledIndices);
        enqueueMicrotask(() => navigate(index));
      });
      cleanups.push(unsubscribe);

      return cleanupAll(cleanups);
    },
  };
}
