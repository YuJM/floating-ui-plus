import {fireEvent} from '@testing-library/dom';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  click,
  clientPoint,
  createFloating,
  dismiss,
  focus,
  hover,
  listNavigation,
  role,
  safePolygon,
  typeahead,
} from '../../src';
import type {FloatingPlugin} from '../../src';

interface HarnessOptions {
  open?: boolean;
  plugins: FloatingPlugin[];
}

function createHarness({open = false, plugins}: HarnessOptions) {
  const reference = document.createElement('div');
  reference.tabIndex = 0;
  const floating = document.createElement('div');
  const outside = document.createElement('button');
  document.body.append(reference, floating, outside);

  let state = open;
  const onOpenChange = vi.fn((next: boolean) => {
    state = next;
  });
  const controller = createFloating(() => ({open: state, onOpenChange})).pipe(
    ...plugins,
  );
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
      state = next;
      controller.refresh();
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('native interaction plugins', () => {
  test('click opens from keyboard and pointer input', () => {
    const harness = createHarness({plugins: [click()]});

    fireEvent.keyDown(harness.reference, {key: 'Enter'});
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.any(KeyboardEvent),
      'click',
    );

    harness.setOpen(false);
    fireEvent.click(harness.reference);
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.any(MouseEvent),
      'click',
    );
    harness.controller.destroy();
  });

  test('focuses a mouse-clicked reference for Safari keyboard continuity', () => {
    const harness = createHarness({plugins: [click()]});
    harness.outside.focus();

    dispatchPointerDown(harness.reference, 'mouse');
    fireEvent.click(harness.reference);

    expect(document.activeElement).toBe(harness.reference);
    harness.controller.destroy();
  });

  test('clientPoint replaces the position reference with the pointer coordinates', () => {
    const harness = createHarness({plugins: [clientPoint()]});

    fireEvent.mouseMove(harness.reference, {clientX: 42, clientY: 88});
    const rect = harness.controller.elements.reference?.getBoundingClientRect();
    expect(rect?.x).toBe(42);
    expect(rect?.y).toBe(88);
    harness.controller.destroy();
  });

  test('clientPoint keeps a stable virtual reference while the pointer moves', () => {
    let connections = 0;
    const connectionCounter: FloatingPlugin = {
      connect() {
        connections++;
      },
    };
    const harness = createHarness({
      plugins: [clientPoint(), connectionCounter],
    });

    fireEvent.mouseMove(harness.reference, {clientX: 20, clientY: 30});
    const virtualReference = harness.controller.elements.reference;
    fireEvent.mouseMove(harness.reference, {clientX: 80, clientY: 90});

    expect(harness.controller.elements.reference).toBe(virtualReference);
    expect(connections).toBe(1);
    expect(
      harness.controller.elements.reference?.getBoundingClientRect().x,
    ).toBe(80);
    harness.controller.destroy();
  });

  test('clientPoint uses explicit coordinates without reconnecting plugins', () => {
    let connections = 0;
    const connectionCounter: FloatingPlugin = {
      connect() {
        connections++;
      },
    };
    const harness = createHarness({
      plugins: [clientPoint({x: 120, y: 64}), connectionCounter],
    });

    expect(connections).toBe(1);
    expect(
      harness.controller.elements.reference?.getBoundingClientRect().x,
    ).toBe(120);
    expect(
      harness.controller.elements.reference?.getBoundingClientRect().y,
    ).toBe(64);

    fireEvent.mouseMove(harness.reference, {clientX: 20, clientY: 30});
    expect(
      harness.controller.elements.reference?.getBoundingClientRect().x,
    ).toBe(120);
    harness.controller.destroy();
  });

  test('clientPoint tracks window movement while open and cleans up when closed', () => {
    const harness = createHarness({plugins: [clientPoint()]});

    fireEvent.mouseMove(harness.reference, {clientX: 20, clientY: 30});
    harness.setOpen(true);
    fireEvent.mouseMove(document.body, {clientX: 80, clientY: 90});
    expect(
      harness.controller.elements.reference?.getBoundingClientRect().x,
    ).toBe(80);
    expect(
      harness.controller.elements.reference?.getBoundingClientRect().y,
    ).toBe(90);

    harness.setOpen(false);
    fireEvent.mouseMove(document.body, {clientX: 10, clientY: 15});
    expect(
      harness.controller.elements.reference?.getBoundingClientRect().x,
    ).toBe(80);
    harness.controller.destroy();
  });

  test('clientPoint stops window tracking over an interactive floating element', () => {
    const harness = createHarness({plugins: [clientPoint()]});

    fireEvent.mouseMove(harness.reference, {clientX: 20, clientY: 30});
    harness.setOpen(true);
    fireEvent.mouseMove(harness.floating, {clientX: 60, clientY: 70});
    fireEvent.mouseMove(document.body, {clientX: 100, clientY: 110});

    expect(
      harness.controller.elements.reference?.getBoundingClientRect().x,
    ).toBe(20);
    expect(
      harness.controller.elements.reference?.getBoundingClientRect().y,
    ).toBe(30);
    harness.controller.destroy();
  });

  test('clientPoint preserves the DOM reference for non-mouse open events', () => {
    const harness = createHarness({plugins: [clientPoint()]});
    harness.controller.context.onOpenChange(
      true,
      new FocusEvent('focus'),
      'focus',
    );

    fireEvent.mouseMove(harness.reference, {clientX: 42, clientY: 88});

    expect(harness.controller.elements.reference).toBe(harness.reference);
    harness.controller.destroy();
  });

  test('dismiss closes on outside press and Escape', () => {
    const harness = createHarness({open: true, plugins: [dismiss()]});

    fireEvent.pointerDown(harness.outside);
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(Event),
      'outside-press',
    );

    harness.setOpen(true);
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
    });
    document.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(KeyboardEvent),
      'escape-key',
    );
    harness.controller.destroy();
  });

  test('focus opens the floating element and closes after focus leaves', () => {
    vi.useFakeTimers();
    const harness = createHarness({plugins: [focus({visibleOnly: false})]});

    harness.reference.focus();
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.any(FocusEvent),
      'focus',
    );

    harness.outside.focus();
    vi.runAllTimers();
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(FocusEvent),
      'focus',
    );
    harness.controller.destroy();
  });

  test('hover honors open and close delays', () => {
    vi.useFakeTimers();
    const harness = createHarness({
      plugins: [hover({delay: {open: 80, close: 120}})],
    });

    fireEvent.mouseEnter(harness.reference, {clientX: 20, clientY: 20});
    vi.advanceTimersByTime(79);
    expect(harness.onOpenChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.any(MouseEvent),
      'hover',
    );

    fireEvent.mouseLeave(harness.reference, {clientX: 20, clientY: 20});
    vi.advanceTimersByTime(120);
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(MouseEvent),
      'hover',
    );
    harness.controller.destroy();
  });

  test('listNavigation moves focus, skips disabled items, and opens on ArrowDown', () => {
    const first = document.createElement('button');
    const second = document.createElement('button');
    const third = document.createElement('button');
    const listRef = {current: [first, second, third] as Array<HTMLElement | null>};
    let activeIndex: number | null = null;
    const onNavigate = vi.fn((index: number | null) => {
      activeIndex = index;
    });
    const harness = createHarness({
      plugins: [listNavigation(() => ({
        listRef,
        activeIndex,
        onNavigate,
        disabledIndices: [1],
        focusItemOnOpen: false,
        scrollItemIntoView: false,
      }))],
    });
    harness.floating.append(first, second, third);

    fireEvent.keyDown(harness.reference, {key: 'ArrowDown'});
    expect(onNavigate).toHaveBeenLastCalledWith(0);
    expect(document.activeElement).toBe(first);
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.any(KeyboardEvent),
      'list-navigation',
    );

    fireEvent.keyDown(harness.floating, {key: 'ArrowDown'});
    expect(onNavigate).toHaveBeenLastCalledWith(2);
    expect(document.activeElement).toBe(third);
    harness.controller.destroy();
  });

  test('nested listNavigation leaves parent-axis keys to the parent menu', () => {
    const first = document.createElement('button');
    const second = document.createElement('button');
    const listRef = {
      current: [first, second] as Array<HTMLElement | null>,
    };
    const onNavigate = vi.fn();
    const parentKeyDown = vi.fn();
    const harness = createHarness({
      plugins: [
        listNavigation({
          listRef,
          activeIndex: null,
          nested: true,
          onNavigate,
          scrollItemIntoView: false,
        }),
      ],
    });
    harness.floating.append(first, second);
    document.body.addEventListener('keydown', parentKeyDown);

    const parentAxisEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowDown',
    });
    harness.reference.dispatchEvent(parentAxisEvent);

    expect(parentAxisEvent.defaultPrevented).toBe(false);
    expect(parentKeyDown).toHaveBeenCalledOnce();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(harness.onOpenChange).not.toHaveBeenCalled();

    harness.controller.destroy();
  });

  test('nested listNavigation opens, focuses after mounting, and closes on cross-axis keys', async () => {
    const first = document.createElement('button');
    const listRef = {current: [first] as Array<HTMLElement | null>};
    const harness = createHarness({
      plugins: [
        listNavigation({
          listRef,
          activeIndex: null,
          nested: true,
          scrollItemIntoView: false,
        }),
      ],
    });
    harness.controller.setFloating(null);

    fireEvent.keyDown(harness.reference, {key: 'ArrowRight'});
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.any(KeyboardEvent),
      'list-navigation',
    );

    harness.floating.append(first);
    harness.controller.setFloating(harness.floating);
    await Promise.resolve();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, {key: 'ArrowLeft'});
    expect(harness.onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(KeyboardEvent),
      'list-navigation',
    );
    expect(document.activeElement).toBe(harness.reference);
    harness.controller.destroy();
  });

  test('role applies menu relationships and option semantics', () => {
    const harness = createHarness({open: true, plugins: [role({role: 'select'})]});
    harness.controller.refresh();

    expect(harness.controller.context.attributes.reference).toMatchObject({
      'aria-expanded': 'true',
      'aria-haspopup': 'listbox',
      role: 'combobox',
    });
    expect(harness.controller.context.attributes.floating).toMatchObject({
      role: 'listbox',
    });
    const itemAttributes = harness.controller.context.attributes.item;
    expect(itemAttributes).toBeTypeOf('function');
    expect(typeof itemAttributes === 'function' && itemAttributes({active: true, selected: true})).toMatchObject({
      role: 'option',
      'aria-selected': 'true',
    });
    harness.controller.destroy();
  });

  test('safePolygon keeps pointer travel between reference and floating open', () => {
    const reference = document.createElement('button');
    const floating = document.createElement('div');
    reference.getBoundingClientRect = () => DOMRect.fromRect({x: 40, y: 100, width: 80, height: 20});
    floating.getBoundingClientRect = () => DOMRect.fromRect({x: 40, y: 50, width: 120, height: 30});
    const onClose = vi.fn();
    const handler = safePolygon({requireIntent: false})({
      elements: {domReference: reference, floating},
      position: {placement: 'top'},
      x: 80,
      y: 100,
      onClose,
    } as never);

    handler(new MouseEvent('mousemove', {clientX: 80, clientY: 95}));
    expect(onClose).not.toHaveBeenCalled();
    handler(new MouseEvent('mousemove', {clientX: 300, clientY: 95}));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('typeahead matches text and reports typing state', () => {
    vi.useFakeTimers();
    const onMatch = vi.fn();
    const onTypingChange = vi.fn();
    const harness = createHarness({
      open: true,
      plugins: [typeahead({
        listRef: {current: ['Alpha', 'Beta', 'Gamma']},
        activeIndex: null,
        onMatch,
        onTypingChange,
        resetMs: 100,
      })],
    });

    fireEvent.keyDown(harness.floating, {key: 'b'});
    expect(onMatch).toHaveBeenCalledWith(1);
    expect(onTypingChange).toHaveBeenCalledWith(true);
    vi.advanceTimersByTime(100);
    expect(onTypingChange).toHaveBeenLastCalledWith(false);
    harness.controller.destroy();
  });
});

function dispatchPointerDown(target: Element, pointerType: string) {
  const event = new Event('pointerdown', {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'pointerType', {value: pointerType});
  target.dispatchEvent(event);
}
