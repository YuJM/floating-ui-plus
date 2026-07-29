import {addListener, cleanupAll} from '../events';
import type {FloatingPlugin, ValueOrGetter} from '../types';
import type {Ref} from '../utils/common';
import {
  createGridCellMap,
  findNonDisabledListIndex,
  getGridCellIndexOfCorner,
  getGridCellIndices,
  getGridNavigatedIndex,
  getMaxListIndex,
  getMinListIndex,
  isIndexOutOfListBounds,
  isListIndexDisabled,
} from '../utils/composite';
import {
  contains,
  enqueueMicrotask,
  getTarget,
  getValue,
  isTypeableElement,
} from '../utils/common';

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
  parentOrientation?: 'vertical' | 'horizontal' | 'both' | undefined;
  rtl?: boolean | undefined;
  virtual?: boolean | undefined;
  orientation?: 'vertical' | 'horizontal' | 'both' | undefined;
  cols?: number | undefined;
  scrollItemIntoView?: boolean | ScrollIntoViewOptions | undefined;
  virtualItemRef?: Ref<HTMLElement | null> | undefined;
  itemSizes?: Array<{width: number; height: number}> | undefined;
  dense?: boolean | undefined;
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

function isCrossAxisOpenKey(
  key: string,
  orientation: 'vertical' | 'horizontal' | 'both',
  rtl: boolean,
) {
  if (orientation === 'vertical') {
    return key === (rtl ? 'ArrowLeft' : 'ArrowRight');
  }
  if (orientation === 'horizontal') {
    return key === 'ArrowDown';
  }
  return false;
}

function isCrossAxisCloseKey(
  key: string,
  orientation: 'vertical' | 'horizontal' | 'both',
  rtl: boolean,
) {
  if (orientation === 'vertical') {
    return key === (rtl ? 'ArrowRight' : 'ArrowLeft');
  }
  if (orientation === 'horizontal') {
    return key === 'ArrowUp';
  }
  return false;
}

function isToEndKey(
  key: string,
  orientation: 'vertical' | 'horizontal' | 'both',
  rtl: boolean,
) {
  if (orientation === 'vertical') return key === 'ArrowDown';
  if (orientation === 'horizontal') {
    return key === (rtl ? 'ArrowLeft' : 'ArrowRight');
  }
  return key === 'ArrowDown' || key === (rtl ? 'ArrowLeft' : 'ArrowRight');
}

export function listNavigation(
  options: ValueOrGetter<ListNavigationOptions>,
): FloatingPlugin {
  let lastInput: 'pointer' | 'keyboard' = 'keyboard';
  let pendingFocusOnOpen = false;
  let pendingFocusDirection: 'start' | 'end' | null = null;
  let logicalIndex = -1;
  let scrollRequest = 0;

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
        parentOrientation: 'vertical' as const,
        rtl: false,
        virtual: false,
        orientation: 'vertical' as const,
        cols: 1,
        scrollItemIntoView: true as boolean | ScrollIntoViewOptions,
        itemSizes: undefined,
        dense: false,
        ...getValue(options),
      });

      function scheduleScrollIntoView(index: number) {
        const request = ++scrollRequest;
        const view =
          floating?.ownerDocument.defaultView ??
          reference?.ownerDocument.defaultView;
        const run = () => {
          if (request !== scrollRequest) return;
          const current = getOptions();
          const element = current.listRef.current[index];
          if (!element?.isConnected || !current.scrollItemIntoView) return;
          element.scrollIntoView(
            current.scrollItemIntoView === true
              ? {block: 'nearest', inline: 'nearest'}
              : current.scrollItemIntoView,
          );
        };

        // Positioning and conditionally-rendered list items settle in
        // microtasks. Scroll on the next frame so an item is never brought
        // into view while its floating ancestor is still at the initial 0,0.
        if (view) {
          view.requestAnimationFrame(run);
        } else {
          enqueueMicrotask(run);
        }
      }

      function navigate(index: number | null, event?: Event) {
        const current = getOptions();
        logicalIndex = index ?? -1;
        const publicIndex =
          index == null || isIndexOutOfListBounds(current.listRef, index)
            ? null
            : index;
        current.onNavigate?.(publicIndex);
        if (publicIndex == null) return;
        const element = current.listRef.current[publicIndex];
        if (!element) return;
        current.virtualItemRef && (current.virtualItemRef.current = element);
        if (!current.virtual) {
          element.focus({preventScroll: true});
        }
        if (current.scrollItemIntoView) {
          scheduleScrollIntoView(publicIndex);
        }
        if (event && !context.open && current.openOnArrowKeyDown) {
          context.onOpenChange(true, event, 'list-navigation');
        }
      }

      function onKeyDown(event: KeyboardEvent) {
        const current = getOptions();
        const orientation = current.orientation || 'vertical';
        const rtl = Boolean(current.rtl);
        if (!current.enabled || event.defaultPrevented) {
          return;
        }

        lastInput = 'keyboard';

        if (current.nested && event.currentTarget === reference) {
          if (
            !isCrossAxisOpenKey(
              event.key,
              current.parentOrientation || 'vertical',
              rtl,
            )
          ) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          if (context.open) {
            navigate(
              getMinListIndex(current.listRef, current.disabledIndices),
              event,
            );
          } else {
            pendingFocusOnOpen = true;
            pendingFocusDirection = 'start';
            context.onOpenChange(true, event, 'list-navigation');
            focusPendingItem();
          }
          return;
        }

        if (
          current.nested &&
          event.currentTarget === floating &&
          isCrossAxisCloseKey(
            event.key,
            orientation,
            rtl,
          )
        ) {
          if (
            !isNavigationKey(
              event.key,
              current.parentOrientation || 'vertical',
            )
          ) {
            event.preventDefault();
            event.stopPropagation();
          }
          context.onOpenChange(false, event, 'list-navigation');
          if (reference instanceof HTMLElement && !current.virtual) {
            reference.focus({preventScroll: true});
          }
          return;
        }

        const isHomeOrEnd = event.key === 'Home' || event.key === 'End';
        if (
          isHomeOrEnd &&
          !(
            event.currentTarget === reference &&
            isTypeableElement(reference)
          )
        ) {
          if (!context.open) return;
          event.preventDefault();
          event.stopPropagation();
          navigate(
            event.key === 'Home'
              ? getMinListIndex(current.listRef, current.disabledIndices)
              : getMaxListIndex(current.listRef, current.disabledIndices),
            event,
          );
          return;
        }

        if (!isNavigationKey(event.key, orientation)) {
          return;
        }

        const listRef = current.listRef;
        const min = getMinListIndex(listRef, current.disabledIndices);
        const max = getMaxListIndex(listRef, current.disabledIndices);
        if (current.activeIndex != null) {
          logicalIndex = current.activeIndex;
        } else if (current.selectedIndex != null && logicalIndex === -1) {
          logicalIndex = current.selectedIndex;
        }

        if (event.currentTarget === reference && !context.open) {
          if (!current.openOnArrowKeyDown) return;
          event.preventDefault();
          event.stopPropagation();
          pendingFocusOnOpen = true;
          pendingFocusDirection = isToEndKey(event.key, orientation, rtl)
            ? 'start'
            : 'end';
          context.onOpenChange(true, event, 'list-navigation');
          focusPendingItem();
          return;
        }

        if (
          event.currentTarget === floating &&
          !context.open
        ) {
          return;
        }

        const cols = current.cols || 1;
        if (cols > 1) {
          const sizes =
            current.itemSizes ||
            Array.from({length: listRef.current.length}, () => ({
              width: 1,
              height: 1,
            }));
          const cellMap = createGridCellMap(sizes, cols, Boolean(current.dense));
          const gridListRef = {
            current: cellMap.map((itemIndex) =>
              itemIndex == null ? null : listRef.current[itemIndex],
            ),
          };
          const minGridIndex = cellMap.findIndex(
            (itemIndex) =>
              itemIndex != null &&
              !isListIndexDisabled(
                listRef,
                itemIndex,
                current.disabledIndices,
              ),
          );
          const maxGridIndex = cellMap.reduce<number>(
            (found, itemIndex, cellIndex) =>
              itemIndex != null &&
              !isListIndexDisabled(
                listRef,
                itemIndex,
                current.disabledIndices,
              )
                ? cellIndex
                : found,
            -1,
          );
          const disabledItemIndices =
            typeof current.disabledIndices === 'function'
              ? listRef.current.map((_, index) =>
                  isListIndexDisabled(
                    listRef,
                    index,
                    current.disabledIndices,
                  )
                    ? index
                    : undefined,
                )
              : current.disabledIndices || [];
          const disabledCellIndices = getGridCellIndices(
            [...disabledItemIndices, undefined],
            cellMap,
          );
          const currentItem =
            current.activeIndex ??
            (logicalIndex >= 0 && logicalIndex <= max ? logicalIndex : min);
          const previousCell = getGridCellIndexOfCorner(
            currentItem,
            sizes,
            cellMap,
            cols,
            event.key === 'ArrowDown'
              ? 'bl'
              : event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')
                ? 'tr'
                : 'tl',
          );
          const nextCell = getGridNavigatedIndex(gridListRef, {
            key: event.key,
            orientation,
            loop: Boolean(current.loop),
            rtl,
            cols,
            disabledIndices: disabledCellIndices,
            minIndex: minGridIndex,
            maxIndex: maxGridIndex,
            prevIndex: previousCell,
          });
          const nextItem = cellMap[nextCell];

          event.preventDefault();
          event.stopPropagation();
          if (nextItem != null) {
            navigate(nextItem, event);
          }
          return;
        }

        const forward = isToEndKey(event.key, orientation, rtl);
        let next: number;
        if (forward) {
          if (logicalIndex === -1) {
            next = min;
          } else if (current.loop && logicalIndex >= max) {
            next =
              current.allowEscape && logicalIndex !== listRef.current.length
                ? listRef.current.length
                : min;
          } else {
            next = findNonDisabledListIndex(listRef, {
              startingIndex: logicalIndex,
              disabledIndices: current.disabledIndices,
            });
            if (!current.loop) next = Math.min(max, next);
          }
        } else if (logicalIndex === -1) {
          next = max;
        } else if (current.loop && logicalIndex <= min) {
          next = current.allowEscape && logicalIndex !== -1 ? -1 : max;
        } else {
          next = findNonDisabledListIndex(listRef, {
            startingIndex: logicalIndex,
            decrement: true,
            disabledIndices: current.disabledIndices,
          });
          if (!current.loop) next = Math.max(min, next);
        }

        if (!current.loop && isIndexOutOfListBounds(listRef, next)) {
          next = forward ? max : min;
        }

        if (min === -1 || max === -1) {
          if (context.open) {
            event.preventDefault();
            event.stopPropagation();
          }
          return;
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

      function focusPendingItem() {
        if (!pendingFocusOnOpen || !context.open) return;
        const current = getOptions();
        const index =
          current.selectedIndex ??
          current.activeIndex ??
          (pendingFocusDirection === 'end'
            ? getMaxListIndex(current.listRef, current.disabledIndices)
            : getMinListIndex(current.listRef, current.disabledIndices));
        if (!current.listRef.current[index]?.isConnected) return;
        pendingFocusOnOpen = false;
        pendingFocusDirection = null;
        navigate(index);
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
        if (!open) {
          pendingFocusOnOpen = false;
          pendingFocusDirection = null;
          logicalIndex = -1;
          return;
        }
        if (!current.enabled) return;
        const shouldFocus =
          current.focusItemOnOpen === true ||
          (current.focusItemOnOpen === 'auto' && lastInput === 'keyboard');
        if (!shouldFocus) return;
        pendingFocusOnOpen = true;
        enqueueMicrotask(focusPendingItem);
      });
      cleanups.push(unsubscribe);

      if (context.open && pendingFocusOnOpen) {
        enqueueMicrotask(focusPendingItem);
      }

      return cleanupAll([
        ...cleanups,
        () => {
          scrollRequest++;
        },
      ]);
    },
  };
}
