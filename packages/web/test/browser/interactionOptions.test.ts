import {fireEvent} from '@testing-library/dom';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  click,
  clientPoint,
  createFloating,
  dismiss,
  focus,
  FloatingTree,
  hover,
  role,
  typeahead,
  type FloatingPlugin,
  type TypeaheadOptions,
} from '../../src';

function createHarness({
  open = false,
  plugins,
  reference = document.createElement('div'),
}: {
  open?: boolean;
  plugins: FloatingPlugin[];
  reference?: HTMLElement;
}) {
  reference.tabIndex ||= 0;
  const floating = document.createElement('div');
  const outside = document.createElement('button');
  if (!reference.isConnected) {
    document.body.append(reference);
  }
  document.body.append(floating, outside);

  let openState = open;
  const onOpenChange = vi.fn((next: boolean) => {
    openState = next;
  });
  const controller = createFloating(() => ({
    open: openState,
    onOpenChange,
  })).pipe(...plugins);
  controller.setReference(reference);
  controller.setFloating(floating);
  controller.connect();

  return {
    controller,
    floating,
    onOpenChange,
    outside,
    reference,
    setOpen(next: boolean) {
      openState = next;
      controller.refresh();
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('click option parity', () => {
  test('supports mousedown without double toggling on click', () => {
    const harness = createHarness({plugins: [click({event: 'mousedown'})]});

    dispatchPointerDown(harness.reference, 'mouse');
    fireEvent.mouseDown(harness.reference, {button: 0});
    expect(harness.onOpenChange).toHaveBeenCalledOnce();
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.any(MouseEvent),
      'click',
    );

    fireEvent.click(harness.reference);
    expect(harness.onOpenChange).toHaveBeenCalledOnce();
    harness.controller.destroy();
  });

  test('toggle false keeps an open surface open', () => {
    const harness = createHarness({
      open: true,
      plugins: [click({toggle: false})],
    });

    fireEvent.click(harness.reference);
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.any(MouseEvent),
      'click',
    );
    harness.controller.destroy();
  });

  test('ignoreMouse ignores mouse input but accepts touch input', () => {
    const harness = createHarness({plugins: [click({ignoreMouse: true})]});

    dispatchPointerDown(harness.reference, 'mouse');
    fireEvent.click(harness.reference);
    expect(harness.onOpenChange).not.toHaveBeenCalled();

    dispatchPointerDown(harness.reference, 'touch');
    fireEvent.click(harness.reference);
    expect(harness.onOpenChange).toHaveBeenCalledOnce();
    harness.controller.destroy();
  });

  test('adds Enter and Space keyboard handlers only to non-native references', () => {
    const harness = createHarness({plugins: [click()]});

    fireEvent.keyDown(harness.reference, {key: 'Enter'});
    expect(harness.onOpenChange).toHaveBeenCalledOnce();
    harness.setOpen(false);
    harness.onOpenChange.mockClear();

    const spaceDown = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    harness.reference.dispatchEvent(spaceDown);
    expect(spaceDown.defaultPrevented).toBe(true);
    fireEvent.keyUp(harness.reference, {key: ' '});
    expect(harness.onOpenChange).toHaveBeenCalledOnce();
    harness.controller.destroy();

    document.body.replaceChildren();
    const input = document.createElement('input');
    const native = createHarness({
      plugins: [click()],
      reference: input,
    });
    fireEvent.keyDown(input, {key: ' '});
    fireEvent.keyUp(input, {key: ' '});
    expect(native.onOpenChange).not.toHaveBeenCalled();
    native.controller.destroy();
  });

  test('keyboardHandlers and enabled can disable the interaction', () => {
    let enabled = false;
    let keyboardHandlers = true;
    const harness = createHarness({
      plugins: [click(() => ({enabled, keyboardHandlers}))],
    });

    fireEvent.click(harness.reference);
    expect(harness.onOpenChange).not.toHaveBeenCalled();

    enabled = true;
    keyboardHandlers = false;
    fireEvent.keyDown(harness.reference, {key: 'Enter'});
    expect(harness.onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(harness.reference);
    expect(harness.onOpenChange).toHaveBeenCalledOnce();
    harness.controller.destroy();
  });
});

describe('dismiss option parity', () => {
  test('can independently disable escape and outside press', () => {
    const harness = createHarness({
      open: true,
      plugins: [dismiss({escapeKey: false, outsidePress: false})],
    });

    fireEvent.keyDown(document, {key: 'Escape'});
    fireEvent.pointerDown(harness.outside);
    expect(harness.onOpenChange).not.toHaveBeenCalled();
    harness.controller.destroy();
  });

  test.each(['pointerdown', 'mousedown', 'click'] as const)(
    'supports %s outsidePressEvent',
    (outsidePressEvent) => {
      const harness = createHarness({
        open: true,
        plugins: [dismiss({outsidePressEvent})],
      });

      dispatchPress(harness.outside, outsidePressEvent);
      expect(harness.onOpenChange).toHaveBeenLastCalledWith(
        false,
        expect.any(Event),
        'outside-press',
      );
      harness.controller.destroy();
    },
  );

  test('outsidePress guard and disconnected targets are ignored', () => {
    const outsidePress = vi.fn(() => false);
    const harness = createHarness({
      open: true,
      plugins: [dismiss({outsidePress})],
    });

    fireEvent.pointerDown(harness.outside);
    expect(outsidePress).toHaveBeenCalledOnce();
    expect(harness.onOpenChange).not.toHaveBeenCalled();

    const detached = document.createElement('button');
    fireEvent.pointerDown(detached);
    expect(harness.onOpenChange).not.toHaveBeenCalled();
    harness.controller.destroy();
  });

  test.each(['pointerdown', 'mousedown', 'click'] as const)(
    'supports %s referencePressEvent',
    (referencePressEvent) => {
      const harness = createHarness({
        open: true,
        plugins: [dismiss({referencePress: true, referencePressEvent})],
      });

      dispatchPress(harness.reference, referencePressEvent);
      expect(harness.onOpenChange).toHaveBeenLastCalledWith(
        false,
        expect.any(Event),
        'reference-press',
      );
      harness.controller.destroy();
    },
  );

  test('Escape is ignored while IME composition is active', () => {
    vi.useFakeTimers();
    const harness = createHarness({open: true, plugins: [dismiss()]});

    fireEvent.compositionStart(document);
    fireEvent.keyDown(document, {key: 'Escape'});
    expect(harness.onOpenChange).not.toHaveBeenCalled();

    fireEvent.compositionEnd(document);
    fireEvent.keyDown(document, {key: 'Escape'});
    expect(harness.onOpenChange).not.toHaveBeenCalled();
    vi.runAllTimers();
    fireEvent.keyDown(document, {key: 'Escape'});
    expect(harness.onOpenChange).toHaveBeenCalledOnce();
    harness.controller.destroy();
  });

  test('an ordinary inside press does not poison the next outside press', () => {
    const harness = createHarness({open: true, plugins: [dismiss()]});

    fireEvent.pointerDown(harness.floating);
    fireEvent.pointerDown(harness.outside);

    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(Event),
      'outside-press',
    );
    harness.controller.destroy();
  });

  test('a click drag beginning inside does not dismiss', () => {
    const harness = createHarness({
      open: true,
      plugins: [dismiss({outsidePressEvent: 'click'})],
    });

    fireEvent.mouseDown(harness.floating, {button: 0});
    fireEvent.mouseUp(harness.outside, {button: 0});
    fireEvent.click(harness.outside);

    expect(harness.onOpenChange).not.toHaveBeenCalled();
    harness.controller.destroy();
  });

  test('ancestor scroll dismisses the surface', () => {
    const scroller = document.createElement('div');
    scroller.style.overflow = 'auto';
    const reference = document.createElement('button');
    scroller.append(reference);
    document.body.append(scroller);
    const harness = createHarness({
      open: true,
      plugins: [dismiss({ancestorScroll: true})],
      reference,
    });

    fireEvent.scroll(scroller);
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(Event),
      'ancestor-scroll',
    );
    harness.controller.destroy();
  });

  test('capture config controls whether stopped events reach document', () => {
    const stopInCapture = (event: Event) => event.stopPropagation();
    document.body.addEventListener('pointerdown', stopInCapture, true);
    document.body.addEventListener('keydown', stopInCapture, true);

    const bubble = createHarness({
      open: true,
      plugins: [dismiss({capture: false})],
    });
    fireEvent.pointerDown(bubble.outside);
    fireEvent.keyDown(bubble.outside, {key: 'Escape'});
    expect(bubble.onOpenChange).not.toHaveBeenCalled();
    bubble.controller.destroy();

    document.body.replaceChildren();
    const capture = createHarness({
      open: true,
      plugins: [dismiss({capture: true})],
    });
    fireEvent.pointerDown(capture.outside);
    capture.setOpen(true);
    fireEvent.keyDown(capture.outside, {key: 'Escape'});
    expect(capture.onOpenChange).toHaveBeenCalledTimes(2);
    capture.controller.destroy();

    document.body.removeEventListener('pointerdown', stopInCapture, true);
    document.body.removeEventListener('keydown', stopInCapture, true);
  });

  test('non-bubbling tree dismissal closes only the deepest open node', () => {
    const tree = new FloatingTree();
    const parent = createHarness({open: true, plugins: [dismiss()]});
    const child = createHarness({
      open: true,
      plugins: [
        dismiss({
          bubbles: {escapeKey: false, outsidePress: false},
        }),
      ],
    });
    const parentRegistration = tree.register(parent.controller, {id: 'parent'});
    const childRegistration = tree.register(child.controller, {
      id: 'child',
      parentId: 'parent',
    });

    fireEvent.keyDown(document, {key: 'Escape'});
    expect(parent.onOpenChange).not.toHaveBeenCalled();
    expect(child.onOpenChange).toHaveBeenCalledOnce();

    child.onOpenChange.mockClear();
    child.setOpen(true);
    fireEvent.pointerDown(parent.outside);
    expect(parent.onOpenChange).not.toHaveBeenCalled();
    expect(child.onOpenChange).toHaveBeenCalledOnce();

    childRegistration.unregister();
    parentRegistration.unregister();
    child.controller.destroy();
    parent.controller.destroy();
  });

  test('tree ancestors ignore presses inside descendant floating elements', () => {
    const tree = new FloatingTree();
    const parent = createHarness({open: true, plugins: [dismiss()]});
    const child = createHarness({open: true, plugins: [dismiss()]});
    const parentRegistration = tree.register(parent.controller, {id: 'parent'});
    const childRegistration = tree.register(child.controller, {
      id: 'child',
      parentId: 'parent',
    });

    fireEvent.pointerDown(child.floating);
    expect(parent.onOpenChange).not.toHaveBeenCalled();
    expect(child.onOpenChange).not.toHaveBeenCalled();

    childRegistration.unregister();
    parentRegistration.unregister();
    child.controller.destroy();
    parent.controller.destroy();
  });

  test('ancestor scroll observes both reference and floating ancestors', () => {
    const referenceScroller = document.createElement('div');
    referenceScroller.style.overflow = 'auto';
    const floatingScroller = document.createElement('div');
    floatingScroller.style.overflow = 'auto';
    const reference = document.createElement('button');
    referenceScroller.append(reference);
    document.body.append(referenceScroller, floatingScroller);
    const harness = createHarness({
      open: true,
      plugins: [dismiss({ancestorScroll: true})],
      reference,
    });
    floatingScroller.append(harness.floating);

    // Reconnect after moving the floating element so both ancestor chains are
    // captured by the interaction.
    harness.controller.disconnect();
    harness.controller.connect();
    fireEvent.scroll(floatingScroller);
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(Event),
      'ancestor-scroll',
    );
    harness.controller.destroy();
  });
});

describe('focus option parity', () => {
  test('moving focus into the floating surface does not close it', () => {
    vi.useFakeTimers();
    const harness = createHarness({
      open: true,
      plugins: [focus({visibleOnly: false})],
    });
    const inside = document.createElement('button');
    harness.floating.append(inside);

    harness.reference.focus();
    harness.onOpenChange.mockClear();
    inside.focus();
    vi.runAllTimers();

    expect(harness.onOpenChange).not.toHaveBeenCalledWith(
      false,
      expect.anything(),
      'focus',
    );
    harness.controller.destroy();
  });

  test('reference press and Escape block immediate focus reopen', () => {
    const harness = createHarness({
      plugins: [focus({visibleOnly: false})],
    });

    harness.controller.context.events.emit('openchange', {
      open: false,
      reason: 'reference-press',
      nested: false,
    });
    fireEvent.focus(harness.reference);
    expect(harness.onOpenChange).not.toHaveBeenCalled();

    harness.reference.dispatchEvent(
      new MouseEvent('mouseleave', {bubbles: false}),
    );
    fireEvent.focus(harness.reference);
    expect(harness.onOpenChange).toHaveBeenCalledOnce();
    harness.controller.destroy();
  });

  test('enabled false is inert', () => {
    const harness = createHarness({
      plugins: [focus({enabled: false, visibleOnly: false})],
    });
    harness.reference.focus();
    expect(harness.onOpenChange).not.toHaveBeenCalled();
    harness.controller.destroy();
  });
});

describe('hover option parity', () => {
  test('restMs waits for pointer rest and resets on movement', () => {
    vi.useFakeTimers();
    const harness = createHarness({plugins: [hover({restMs: 100})]});

    fireEvent.mouseMove(harness.reference, {movementX: 10, movementY: 10});
    vi.advanceTimersByTime(99);
    expect(harness.onOpenChange).not.toHaveBeenCalled();
    fireEvent.mouseMove(harness.reference, {movementX: 10, movementY: 10});
    vi.advanceTimersByTime(99);
    expect(harness.onOpenChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(harness.onOpenChange).toHaveBeenCalledOnce();
    harness.controller.destroy();
  });

  test('touch bypasses delay unless mouseOnly is true', () => {
    vi.useFakeTimers();
    const touch = createHarness({
      plugins: [hover({delay: 100, restMs: 100})],
    });
    dispatchPointerDown(touch.reference, 'touch');
    fireEvent.mouseMove(touch.reference);
    expect(touch.onOpenChange).toHaveBeenCalledOnce();
    touch.controller.destroy();

    document.body.replaceChildren();
    const mouseOnly = createHarness({
      plugins: [hover({mouseOnly: true, restMs: 100})],
    });
    dispatchPointerDown(mouseOnly.reference, 'touch');
    fireEvent.mouseMove(mouseOnly.reference);
    vi.runAllTimers();
    expect(mouseOnly.onOpenChange).not.toHaveBeenCalled();
    mouseOnly.controller.destroy();
  });

  test('move false does not reopen from mouse movement', () => {
    const harness = createHarness({plugins: [hover({move: false})]});

    fireEvent.mouseMove(harness.reference);
    expect(harness.onOpenChange).not.toHaveBeenCalled();
    fireEvent.mouseEnter(harness.reference);
    expect(harness.onOpenChange).toHaveBeenCalledOnce();
    harness.controller.destroy();
  });

  test('leaving the floating surface uses the close delay', () => {
    vi.useFakeTimers();
    const harness = createHarness({
      open: true,
      plugins: [hover({delay: {close: 80}})],
    });

    fireEvent.mouseLeave(harness.floating);
    vi.advanceTimersByTime(79);
    expect(harness.onOpenChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(MouseEvent),
      'hover',
    );
    harness.controller.destroy();
  });
});

describe('clientPoint option parity', () => {
  test.each([
    {
      axis: 'x' as const,
      point: {x: 40, y: 70},
      expected: {x: 40, y: 20, width: 0, height: 40},
    },
    {
      axis: 'y' as const,
      point: {x: 40, y: 70},
      expected: {x: 10, y: 70, width: 80, height: 0},
    },
  ])('tracks the $axis axis only', ({axis, point, expected}) => {
    const reference = document.createElement('button');
    reference.getBoundingClientRect = () =>
      DOMRect.fromRect({x: 10, y: 20, width: 80, height: 40});
    const harness = createHarness({
      plugins: [clientPoint({axis})],
      reference,
    });

    fireEvent.mouseMove(reference, {clientX: point.x, clientY: point.y});
    const rect =
      harness.controller.elements.reference?.getBoundingClientRect();
    expect(rect).toMatchObject(expected);
    harness.controller.destroy();
  });

  test('disabling restores the DOM position reference', () => {
    let enabled = true;
    const harness = createHarness({
      plugins: [clientPoint(() => ({enabled}))],
    });
    fireEvent.mouseMove(harness.reference, {clientX: 40, clientY: 70});
    expect(harness.controller.elements.reference).not.toBe(harness.reference);

    enabled = false;
    harness.controller.refresh();
    expect(harness.controller.elements.reference).toBe(harness.reference);
    harness.controller.destroy();
  });
});

describe('role option parity', () => {
  test.each([
    ['tooltip', 'tooltip', 'aria-describedby'],
    ['label', null, 'aria-labelledby'],
    ['dialog', 'dialog', 'aria-controls'],
    ['alertdialog', 'alertdialog', 'aria-controls'],
    ['menu', 'menu', 'aria-controls'],
    ['listbox', 'listbox', 'aria-controls'],
    ['grid', 'grid', 'aria-controls'],
    ['tree', 'tree', 'aria-controls'],
  ] as const)('applies %s role semantics', (requested, applied, relation) => {
    const harness = createHarness({
      open: true,
      plugins: [role({role: requested})],
    });
    harness.controller.refresh();

    expect(harness.controller.context.attributes.floating!.role).toBe(
      applied ?? undefined,
    );
    expect(
      harness.controller.context.attributes.reference![relation],
    ).toBeTruthy();
    harness.controller.destroy();
  });

  test.each([
    ['select', 'none'],
    ['combobox', 'list'],
  ] as const)('%s exposes listbox option semantics', (requested, autocomplete) => {
    const harness = createHarness({
      open: true,
      plugins: [role({role: requested})],
    });
    harness.controller.refresh();
    const item = harness.controller.context.attributes.item;

    expect(harness.controller.context.attributes.reference).toMatchObject({
      role: 'combobox',
      'aria-autocomplete': autocomplete,
      'aria-haspopup': 'listbox',
    });
    expect(harness.controller.context.attributes.floating!.role).toBe(
      'listbox',
    );
    expect(
      typeof item === 'function' &&
        item({active: true, selected: false}),
    ).toMatchObject({
      role: 'option',
      'aria-selected': 'false',
    });
    harness.controller.destroy();
  });

  test('uses an explicit floating focus element id and clears when disabled', () => {
    let enabled = true;
    const harness = createHarness({
      open: true,
      plugins: [role(() => ({enabled, role: 'dialog'}))],
    });
    const focusElement = document.createElement('div');
    focusElement.dataset.floatingUiFocusable = '';
    focusElement.id = 'custom-focus-id';
    harness.floating.append(focusElement);
    harness.controller.refresh();
    expect(harness.controller.context.attributes.floating!.id).toBe(
      'custom-focus-id',
    );

    enabled = false;
    harness.controller.refresh();
    expect(harness.controller.context.attributes.reference).toEqual({});
    expect(harness.controller.context.attributes.floating).toEqual({});
    harness.controller.destroy();
  });
});

describe('typeahead option parity', () => {
  function createTypeaheadHarness({
    activeIndex = null,
    list = ['one', 'two', 'three'],
    open = true,
    options = {},
  }: {
    activeIndex?: number | null;
    list?: Array<string | null>;
    open?: boolean;
    options?: Partial<
      Omit<
        TypeaheadOptions,
        'listRef' | 'activeIndex' | 'onMatch' | 'onTypingChange'
      >
    >;
  } = {}) {
    let active = activeIndex;
    const onMatch = vi.fn((index: number) => {
      active = index;
    });
    const onTypingChange = vi.fn();
    const harness = createHarness({
      open,
      plugins: [
        typeahead(() => ({
          listRef: {current: list},
          activeIndex: active,
          onMatch,
          onTypingChange,
          resetMs: 100,
          ...options,
        })),
      ],
    });
    return {harness, onMatch, onTypingChange};
  }

  test('cycles rapidly through items sharing the first letter', () => {
    vi.useFakeTimers();
    const {harness, onMatch} = createTypeaheadHarness();

    fireEvent.keyDown(harness.reference, {key: 't'});
    fireEvent.keyDown(harness.reference, {key: 't'});
    fireEvent.keyDown(harness.reference, {key: 't'});

    expect(onMatch.mock.calls.map(([index]) => index)).toEqual([1, 2, 1]);
    harness.controller.destroy();
  });

  test('does not cycle repeated letters when a label starts with both', () => {
    vi.useFakeTimers();
    const {harness, onMatch} = createTypeaheadHarness({
      list: ['apple', 'aaron', 'apricot'],
    });

    fireEvent.keyDown(harness.reference, {key: 'a'});
    fireEvent.keyDown(harness.reference, {key: 'a'});

    expect(onMatch).toHaveBeenCalledTimes(2);
    expect(onMatch).toHaveBeenLastCalledWith(1);
    harness.controller.destroy();
  });

  test('resets after timeout and starts after selectedIndex', () => {
    vi.useFakeTimers();
    const {harness, onMatch} = createTypeaheadHarness({
      options: {selectedIndex: 1},
    });
    harness.controller.context.onOpenChange(
      true,
      new KeyboardEvent('keydown'),
      'click',
    );

    fireEvent.keyDown(harness.floating, {key: 't'});
    expect(onMatch).toHaveBeenLastCalledWith(2);
    vi.advanceTimersByTime(100);
    fireEvent.keyDown(harness.floating, {key: 't'});
    expect(onMatch).toHaveBeenLastCalledWith(1);
    harness.controller.destroy();
  });

  test('matches case-insensitively and supports a custom matcher', () => {
    const findMatch = vi.fn((list: Array<string | null>) =>
      list.find((value) => value === 'Gamma'),
    );
    const {harness, onMatch} = createTypeaheadHarness({
      list: ['ALPHA', 'Beta', 'Gamma'],
      options: {findMatch},
    });

    fireEvent.keyDown(harness.floating, {key: 'A'});
    expect(onMatch).toHaveBeenLastCalledWith(2);
    expect(findMatch).toHaveBeenCalled();
    harness.controller.destroy();
  });

  test('ignores configured and modified keys', () => {
    const {harness, onMatch} = createTypeaheadHarness({
      options: {ignoreKeys: ['x']},
    });

    fireEvent.keyDown(harness.floating, {key: 'x'});
    fireEvent.keyDown(harness.floating, {key: 't', ctrlKey: true});
    fireEvent.keyDown(harness.floating, {key: 't', metaKey: true});
    fireEvent.keyDown(harness.floating, {key: 't', altKey: true});
    expect(onMatch).not.toHaveBeenCalled();
    harness.controller.destroy();
  });

  test('resets typing immediately when a sequence no longer matches', () => {
    vi.useFakeTimers();
    const {harness, onTypingChange} = createTypeaheadHarness();

    fireEvent.keyDown(harness.floating, {key: 't'});
    expect(onTypingChange).toHaveBeenLastCalledWith(true);
    fireEvent.keyDown(harness.floating, {key: 'z'});
    expect(onTypingChange).toHaveBeenLastCalledWith(false);
    harness.controller.destroy();
  });
});

function dispatchPress(
  target: Element,
  event: 'pointerdown' | 'mousedown' | 'click',
) {
  if (event === 'pointerdown') {
    fireEvent.pointerDown(target);
  } else if (event === 'mousedown') {
    fireEvent.mouseDown(target);
  } else {
    fireEvent.click(target);
  }
}

function dispatchPointerDown(target: Element, pointerType: string) {
  const event = new Event('pointerdown', {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'pointerType', {value: pointerType});
  target.dispatchEvent(event);
}
