import {fireEvent} from '@testing-library/dom';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  createFloating,
  listNavigation,
  type ListNavigationOptions,
} from '../../src';

type Options = Omit<ListNavigationOptions, 'listRef' | 'activeIndex'>;

function createListHarness({
  count = 4,
  initialActiveIndex = null,
  open = false,
  options = {},
  reference = document.createElement('button'),
}: {
  count?: number;
  initialActiveIndex?: number | null;
  open?: boolean;
  options?: Options;
  reference?: HTMLElement;
} = {}) {
  const floating = document.createElement('div');
  const items = Array.from({length: count}, (_, index) => {
    const item = document.createElement('button');
    item.textContent = `Item ${index}`;
    return item;
  });
  const listRef = {current: items as Array<HTMLElement | null>};
  floating.append(...items);
  document.body.append(reference, floating);

  let openState = open;
  let activeIndex = initialActiveIndex;
  let enabled = options.enabled ?? true;
  const onNavigate = vi.fn((index: number | null) => {
    activeIndex = index;
    options.onNavigate?.(index);
  });
  const onOpenChange = vi.fn((next: boolean) => {
    openState = next;
  });
  const controller = createFloating(() => ({
    open: openState,
    onOpenChange,
  })).pipe(
    listNavigation(() => ({
      ...options,
      enabled,
      listRef,
      activeIndex,
      onNavigate,
      scrollItemIntoView: options.scrollItemIntoView ?? false,
    })),
  );
  controller.setReference(reference);
  controller.setFloating(floating);
  controller.connect();

  return {
    controller,
    floating,
    items,
    listRef,
    onNavigate,
    onOpenChange,
    reference,
    get activeIndex() {
      return activeIndex;
    },
    setActiveIndex(index: number | null) {
      activeIndex = index;
    },
    setEnabled(next: boolean) {
      enabled = next;
    },
    setOpen(next: boolean) {
      openState = next;
      controller.refresh();
    },
  };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('listNavigation parity', () => {
  test.each([
    {key: 'ArrowDown', expected: 0},
    {key: 'ArrowUp', expected: 3},
  ])('opens a vertical list with $key at index $expected', ({
    key,
    expected,
  }) => {
    const harness = createListHarness();

    fireEvent.keyDown(harness.reference, {key});

    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.any(KeyboardEvent),
      'list-navigation',
    );
    expect(harness.activeIndex).toBe(expected);
    expect(document.activeElement).toBe(harness.items[expected]);
    harness.controller.destroy();
  });

  test.each([
    {rtl: false, key: 'ArrowRight', expected: 0},
    {rtl: false, key: 'ArrowLeft', expected: 3},
    {rtl: true, key: 'ArrowLeft', expected: 0},
    {rtl: true, key: 'ArrowRight', expected: 3},
  ])('supports horizontal navigation: $key rtl=$rtl', ({
    rtl,
    key,
    expected,
  }) => {
    const harness = createListHarness({
      options: {orientation: 'horizontal', rtl},
    });

    fireEvent.keyDown(harness.reference, {key});

    expect(harness.activeIndex).toBe(expected);
    expect(document.activeElement).toBe(harness.items[expected]);
    harness.controller.destroy();
  });

  test('does not open or navigate when openOnArrowKeyDown is false', () => {
    const harness = createListHarness({
      options: {openOnArrowKeyDown: false},
    });

    fireEvent.keyDown(harness.reference, {key: 'ArrowDown'});

    expect(harness.onOpenChange).not.toHaveBeenCalled();
    expect(harness.onNavigate).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(harness.items[0]);
    harness.controller.destroy();
  });

  test('clamps without loop and wraps with loop', () => {
    const clamped = createListHarness({
      initialActiveIndex: 3,
      open: true,
    });
    fireEvent.keyDown(clamped.floating, {key: 'ArrowDown'});
    expect(clamped.activeIndex).toBe(3);
    clamped.controller.destroy();

    document.body.replaceChildren();
    const looped = createListHarness({
      initialActiveIndex: 3,
      open: true,
      options: {loop: true},
    });
    fireEvent.keyDown(looped.floating, {key: 'ArrowDown'});
    expect(looped.activeIndex).toBe(0);
    fireEvent.keyDown(looped.floating, {key: 'ArrowUp'});
    expect(looped.activeIndex).toBe(3);
    looped.controller.destroy();
  });

  test('allowEscape reports null once before wrapping', () => {
    const harness = createListHarness({
      initialActiveIndex: 3,
      open: true,
      options: {allowEscape: true, loop: true, virtual: true},
    });

    fireEvent.keyDown(harness.reference, {key: 'ArrowDown'});
    expect(harness.activeIndex).toBeNull();
    expect(harness.onNavigate).toHaveBeenLastCalledWith(null);

    fireEvent.keyDown(harness.reference, {key: 'ArrowDown'});
    expect(harness.activeIndex).toBe(0);

    fireEvent.keyDown(harness.reference, {key: 'ArrowUp'});
    expect(harness.activeIndex).toBeNull();
    fireEvent.keyDown(harness.reference, {key: 'ArrowUp'});
    expect(harness.activeIndex).toBe(3);
    harness.controller.destroy();
  });

  test('Home and End focus the first and last enabled items', () => {
    const harness = createListHarness({
      initialActiveIndex: 1,
      open: true,
      options: {disabledIndices: [0, 3]},
    });

    fireEvent.keyDown(harness.floating, {key: 'End'});
    expect(harness.activeIndex).toBe(2);
    expect(document.activeElement).toBe(harness.items[2]);

    fireEvent.keyDown(harness.floating, {key: 'Home'});
    expect(harness.activeIndex).toBe(1);
    expect(document.activeElement).toBe(harness.items[1]);
    harness.controller.destroy();
  });

  test('Home and End are ignored on typeable references', () => {
    const input = document.createElement('input');
    const harness = createListHarness({
      open: true,
      reference: input,
    });

    fireEvent.keyDown(input, {key: 'End'});
    expect(harness.onNavigate).not.toHaveBeenCalled();
    harness.controller.destroy();
  });

  test.each([
    {disabledIndices: [0, 2]},
    {disabledIndices: (index: number) => index === 0 || index === 2},
  ])('skips disabled indices from arrays and functions', ({
    disabledIndices,
  }) => {
    const harness = createListHarness({options: {disabledIndices}});

    fireEvent.keyDown(harness.reference, {key: 'ArrowDown'});
    expect(harness.activeIndex).toBe(1);
    fireEvent.keyDown(harness.floating, {key: 'ArrowDown'});
    expect(harness.activeIndex).toBe(3);
    harness.controller.destroy();
  });

  test('selectedIndex is focused when an interaction opens the list', async () => {
    const harness = createListHarness({
      options: {focusItemOnOpen: true, selectedIndex: 2},
    });

    harness.controller.context.onOpenChange(
      true,
      new MouseEvent('click'),
      'click',
    );
    await Promise.resolve();

    expect(harness.activeIndex).toBe(2);
    expect(document.activeElement).toBe(harness.items[2]);
    harness.controller.destroy();
  });

  test('focusItemOnOpen auto distinguishes pointer and keyboard modality', async () => {
    const pointer = createListHarness();
    fireEvent.pointerDown(pointer.reference, {pointerType: 'mouse'});
    pointer.controller.context.onOpenChange(
      true,
      new MouseEvent('click'),
      'click',
    );
    await Promise.resolve();
    expect(pointer.onNavigate).not.toHaveBeenCalled();
    pointer.controller.destroy();

    document.body.replaceChildren();
    const keyboard = createListHarness();
    keyboard.controller.context.onOpenChange(
      true,
      new KeyboardEvent('keydown', {key: 'Enter'}),
      'click',
    );
    await Promise.resolve();
    expect(keyboard.activeIndex).toBe(0);
    expect(document.activeElement).toBe(keyboard.items[0]);
    keyboard.controller.destroy();
  });

  test('focusItemOnHover can focus or ignore hovered items', () => {
    const enabled = createListHarness({open: true});
    fireEvent.pointerMove(enabled.items[2]);
    expect(enabled.activeIndex).toBe(2);
    expect(document.activeElement).toBe(enabled.items[2]);
    enabled.controller.destroy();

    document.body.replaceChildren();
    const disabled = createListHarness({
      open: true,
      options: {focusItemOnHover: false},
    });
    fireEvent.pointerMove(disabled.items[2]);
    expect(disabled.onNavigate).not.toHaveBeenCalled();
    disabled.controller.destroy();
  });

  test('virtual navigation updates virtualItemRef without moving DOM focus', () => {
    const virtualItemRef = {current: null as HTMLElement | null};
    const harness = createListHarness({
      open: true,
      options: {virtual: true, virtualItemRef},
    });
    harness.reference.focus();

    fireEvent.keyDown(harness.reference, {key: 'ArrowDown'});

    expect(harness.activeIndex).toBe(0);
    expect(virtualItemRef.current).toBe(harness.items[0]);
    expect(document.activeElement).toBe(harness.reference);
    harness.controller.destroy();
  });

  test('uses caller scrollIntoView options after positioning can settle', async () => {
    const scrollIntoView = vi.fn();
    const harness = createListHarness({
      open: true,
      options: {
        scrollItemIntoView: {block: 'center', inline: 'nearest'},
      },
    });
    harness.items[0]!.scrollIntoView = scrollIntoView;

    fireEvent.keyDown(harness.floating, {key: 'ArrowDown'});

    expect(scrollIntoView).not.toHaveBeenCalled();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'center',
      inline: 'nearest',
    });
    harness.controller.destroy();
  });

  test('navigates a grid without crossing rows on horizontal keys', () => {
    const harness = createListHarness({
      count: 6,
      initialActiveIndex: 0,
      open: true,
      options: {
        cols: 3,
        disabledIndices: [1],
        loop: true,
        orientation: 'both',
      },
    });

    fireEvent.keyDown(harness.floating, {key: 'ArrowRight'});
    expect(harness.activeIndex).toBe(2);
    fireEvent.keyDown(harness.floating, {key: 'ArrowRight'});
    expect(harness.activeIndex).toBe(0);
    fireEvent.keyDown(harness.floating, {key: 'ArrowDown'});
    expect(harness.activeIndex).toBe(3);
    harness.controller.destroy();
  });

  test('uses itemSizes when navigating a non-uniform grid', () => {
    const harness = createListHarness({
      count: 4,
      initialActiveIndex: 0,
      open: true,
      options: {
        cols: 3,
        itemSizes: [
          {width: 2, height: 1},
          {width: 1, height: 1},
          {width: 1, height: 1},
          {width: 2, height: 1},
        ],
        orientation: 'both',
      },
    });

    fireEvent.keyDown(harness.floating, {key: 'ArrowRight'});
    expect(harness.activeIndex).toBe(1);

    harness.setActiveIndex(0);
    fireEvent.keyDown(harness.floating, {key: 'ArrowDown'});
    expect(harness.activeIndex).toBe(2);
    harness.controller.destroy();
  });

  test('supports nested RTL and horizontal parent orientation keys', async () => {
    const rtl = createListHarness({
      options: {nested: true, rtl: true},
    });
    fireEvent.keyDown(rtl.reference, {key: 'ArrowLeft'});
    expect(rtl.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.any(KeyboardEvent),
      'list-navigation',
    );
    rtl.setOpen(true);
    rtl.items[0]!.focus();
    fireEvent.keyDown(rtl.items[0], {key: 'ArrowRight'});
    expect(rtl.onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(KeyboardEvent),
      'list-navigation',
    );
    expect(document.activeElement).toBe(rtl.reference);
    rtl.controller.destroy();

    document.body.replaceChildren();
    const horizontalParent = createListHarness({
      options: {nested: true, parentOrientation: 'horizontal'},
    });
    fireEvent.keyDown(horizontalParent.reference, {key: 'ArrowDown'});
    expect(horizontalParent.onOpenChange).toHaveBeenCalledWith(
      true,
      expect.any(KeyboardEvent),
      'list-navigation',
    );
    await Promise.resolve();
    horizontalParent.controller.destroy();
  });

  test('enabled can be changed without reconnecting the plugin', () => {
    const harness = createListHarness();
    harness.setEnabled(false);
    fireEvent.keyDown(harness.reference, {key: 'ArrowDown'});
    expect(harness.onOpenChange).not.toHaveBeenCalled();

    harness.setEnabled(true);
    fireEvent.keyDown(harness.reference, {key: 'ArrowDown'});
    expect(harness.onOpenChange).toHaveBeenCalledOnce();
    harness.controller.destroy();
  });
});
