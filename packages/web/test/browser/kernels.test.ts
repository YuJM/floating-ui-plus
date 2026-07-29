import {fireEvent} from '@testing-library/dom';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  CompositeController,
  createFloatingContextScope,
  createFloating,
  createOverlayElement,
  createPortalNode,
  DelayGroup,
  FloatingList,
  FloatingTransition,
  FloatingTree,
  getArrowStyles,
  lockScroll,
  NextDelayGroup,
  provideFloatingContext,
  removePortalNode,
  requestFloatingContext,
  requestFloatingContextScope,
} from '../../src';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
  document.body.removeAttribute('style');
});

describe('arrow styles', () => {
  test.each([
    ['top', 'bottom'],
    ['right', 'left'],
    ['bottom', 'top'],
    ['left', 'right'],
  ] as const)('maps %s placement to the %s static side', (
    placement,
    staticSide,
  ) => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'offsetWidth', {value: 12});

    const styles = getArrowStyles(
      placement,
      {arrow: {x: 8, y: 4, centerOffset: 0}},
      {element},
    );

    expect(styles).toMatchObject({
      position: 'absolute',
      left: '8px',
      top: '4px',
      [staticSide]: '-6px',
    });
  });

  test('supports numeric and CSS static offsets', () => {
    const element = document.createElement('div');
    expect(
      getArrowStyles('bottom-start', {}, {element, staticOffset: 10}).top,
    ).toBe('10px');
    expect(
      getArrowStyles('bottom-end', {}, {element, staticOffset: '15%'}).top,
    ).toBe('15%');
  });
});

describe('CompositeController', () => {
  function createComposite(
    options: ConstructorParameters<typeof CompositeController>[0] = {},
  ) {
    const items = Array.from({length: 5}, () =>
      document.createElement('button'),
    );
    document.body.append(...items);
    const composite = new CompositeController(options);
    composite.setItems(items);
    return {composite, items};
  }

  test('maintains one roving tab stop and clamps explicit indices', () => {
    const {composite, items} = createComposite();
    expect(items.map((item) => item.tabIndex)).toEqual([0, -1, -1, -1, -1]);

    composite.setActiveIndex(99, true);
    expect(composite.activeIndex).toBe(4);
    expect(document.activeElement).toBe(items[4]);
    expect(items.map((item) => item.tabIndex)).toEqual([-1, -1, -1, -1, 0]);
  });

  test('honors orientation, columns, loop, RTL, and disabled items', () => {
    const {composite, items} = createComposite({
      cols: 2,
      loop: true,
      orientation: 'both',
      rtl: true,
    });
    items[1]!.disabled = true;

    composite.keydown(new KeyboardEvent('keydown', {key: 'ArrowLeft'}));
    expect(composite.activeIndex).toBe(2);
    composite.keydown(new KeyboardEvent('keydown', {key: 'ArrowDown'}));
    expect(composite.activeIndex).toBe(4);
    composite.keydown(new KeyboardEvent('keydown', {key: 'ArrowDown'}));
    expect(composite.activeIndex).toBe(3);
  });

  test('Home and End move to the first and last enabled items', () => {
    const {composite, items} = createComposite();
    items[0]!.disabled = true;
    items[4]!.setAttribute('aria-disabled', 'true');

    composite.keydown(
      new KeyboardEvent('keydown', {key: 'End', cancelable: true}),
    );
    expect(composite.activeIndex).toBe(3);
    composite.keydown(
      new KeyboardEvent('keydown', {key: 'Home', cancelable: true}),
    );
    expect(composite.activeIndex).toBe(1);
  });

  test('ignores cross-axis keys for single-axis composites', () => {
    const vertical = createComposite({orientation: 'vertical'});
    vertical.composite.keydown(
      new KeyboardEvent('keydown', {key: 'ArrowRight'}),
    );
    expect(vertical.composite.activeIndex).toBe(0);

    const horizontal = createComposite({orientation: 'horizontal'});
    horizontal.composite.keydown(
      new KeyboardEvent('keydown', {key: 'ArrowDown'}),
    );
    expect(horizontal.composite.activeIndex).toBe(0);
  });
});

describe('FloatingList', () => {
  test('sorts registrations by live DOM order and reindexes after removal', () => {
    const list = new FloatingList<string>();
    const first = document.createElement('button');
    const second = document.createElement('button');
    document.body.append(second, first);

    const removeFirst = list.register({
      id: 'first',
      element: first,
      label: 'First',
      value: 'a',
    });
    list.register({
      id: 'second',
      element: second,
      label: 'Second',
      value: 'b',
    });

    expect(list.items.map(({id, index}) => [id, index])).toEqual([
      ['second', 0],
      ['first', 1],
    ]);
    removeFirst();
    expect(list.items.map(({id, index}) => [id, index])).toEqual([
      ['second', 0],
    ]);
  });

  test('updates items and emits for register, update, and removal', () => {
    const list = new FloatingList<number>();
    const listener = vi.fn();
    list.subscribe(listener);
    const unregister = list.register({id: 'item', label: null, value: 1});
    list.update('item', {label: 'Updated', value: 2});
    unregister();

    expect(listener).toHaveBeenCalledTimes(3);
    expect(list.items).toEqual([]);
  });
});

describe('portal and overlay services', () => {
  test('creates, reuses, roots, and removes owned portal nodes', () => {
    const root = document.createElement('section');
    document.body.append(root);

    const first = createPortalNode({id: 'portal', root});
    const reused = createPortalNode({id: 'portal', root});
    expect(first).toBe(reused);
    expect(first?.parentElement).toBe(root);
    expect(first?.hasAttribute('data-floating-ui-portal')).toBe(true);

    removePortalNode(first);
    expect(root.querySelector('#portal')).toBeNull();
  });

  test('does not remove an existing consumer node returned by id', () => {
    const existing = document.createElement('div');
    existing.id = 'consumer-root';
    document.body.append(existing);

    const node = createPortalNode({id: 'consumer-root'});
    expect(node).toBe(existing);
    removePortalNode(node);
    expect(existing.isConnected).toBe(true);
  });

  test('attaches and cleans a Web context scope on a portal node', () => {
    const existing = document.createElement('div');
    existing.id = 'scoped-consumer-root';
    document.body.append(existing);
    const scope = createFloatingContextScope();
    scope.provide('theme', 'night');

    const node = createPortalNode({
      id: 'scoped-consumer-root',
      contextScope: scope,
    })!;
    const child = document.createElement('span');
    node.append(child);
    expect(requestFloatingContext(child, 'theme')).toBe('night');
    expect(requestFloatingContextScope(child)).toBe(scope);

    removePortalNode(node);
    expect(existing.isConnected).toBe(true);
    expect(requestFloatingContext(child, 'theme')).toBeUndefined();
  });

  test('reference-counts scroll locking and restores prior body styles', () => {
    document.body.style.overflow = 'scroll';
    document.body.style.paddingRight = '3px';
    const firstUnlock = lockScroll(document);
    const secondUnlock = lockScroll(document);
    expect(document.body.style.overflow).toBe('hidden');

    firstUnlock();
    expect(document.body.style.overflow).toBe('hidden');
    firstUnlock();
    expect(document.body.style.overflow).toBe('hidden');
    secondUnlock();
    expect(document.body.style.overflow).toBe('scroll');
    expect(document.body.style.paddingRight).toBe('3px');
  });

  test('creates a fixed overlay and releases its optional scroll lock', () => {
    const overlay = createOverlayElement(document, {lockScroll: true});
    expect(overlay.element.dataset.floatingUiOverlay).toBe('');
    expect(overlay.element.style.position).toBe('fixed');
    expect(Number.parseFloat(overlay.element.style.inset)).toBe(0);
    expect(document.body.style.overflow).toBe('hidden');
    overlay.destroy();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('delay groups', () => {
  test.each([DelayGroup, NextDelayGroup])(
    '%s coordinates instant handoffs and delayed reset',
    (Group) => {
      vi.useFakeTimers();
      const group = new Group({delay: {open: 100, close: 20}, timeoutMs: 50});
      const listener = vi.fn();
      group.subscribe(listener);

      expect(group.getDelay('a')).toEqual({open: 100, close: 20});
      group.open('a');
      expect(group.currentId).toBe('a');
      expect(group.isInstantPhase).toBe(false);

      group.open('b');
      expect(group.currentId).toBe('b');
      expect(group.isInstantPhase).toBe(true);
      expect(group.getDelay('b')).toBe(0);

      group.close('a');
      vi.advanceTimersByTime(50);
      expect(group.currentId).toBe('b');
      group.close('b');
      vi.advanceTimersByTime(49);
      expect(group.currentId).toBe('b');
      vi.advanceTimersByTime(1);
      expect(group.currentId).toBeNull();
      expect(group.isInstantPhase).toBe(false);
      expect(listener).toHaveBeenCalledTimes(3);
      group.destroy();
    },
  );
});

describe('FloatingTransition', () => {
  test('publishes initial, open, close, and unmounted states with styles', () => {
    vi.useFakeTimers();
    const frameCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    const transition = new FloatingTransition(() => 'bottom-start', {
      duration: {close: 120},
      common: (placement) => ({transformOrigin: placement}),
      initial: {opacity: '0'},
      open: {opacity: '1'},
      close: {opacity: '0'},
    });
    const states: string[] = [];
    transition.subscribe(() => states.push(transition.status));

    transition.setOpen(true);
    expect(transition.isMounted).toBe(true);
    expect(transition.status).toBe('initial');
    expect(transition.styles).toMatchObject({
      opacity: '0',
      transformOrigin: 'bottom-start',
    });

    frameCallbacks[0]!(0);
    expect(transition.status).toBe('open');
    expect(transition.styles.opacity).toBe('1');

    transition.setOpen(false);
    expect(transition.status).toBe('close');
    vi.advanceTimersByTime(119);
    expect(transition.isMounted).toBe(true);
    vi.advanceTimersByTime(1);
    expect(transition.status).toBe('unmounted');
    expect(transition.isMounted).toBe(false);
    expect(states).toEqual(['initial', 'open', 'close', 'unmounted']);
    transition.destroy();
    vi.unstubAllGlobals();
  });
});

describe('FloatingTree and context protocol', () => {
  function createNode() {
    let open = true;
    const onOpenChange = vi.fn((next: boolean) => {
      open = next;
    });
    return {
      controller: createFloating(() => ({open, onOpenChange})),
      onOpenChange,
    };
  }

  test('marks nested contexts and recursively closes descendants', () => {
    const tree = new FloatingTree();
    const parent = createNode();
    const child = createNode();
    const grandchild = createNode();
    const parentRegistration = tree.register(parent.controller, {id: 'p'});
    const childRegistration = tree.register(child.controller, {
      id: 'c',
      parentId: 'p',
    });
    const grandchildRegistration = tree.register(grandchild.controller, {
      id: 'g',
      parentId: 'c',
    });

    expect(parent.controller.context.nested).toBe(false);
    expect(child.controller.context.nested).toBe(true);
    expect(child.controller.context.data).toMatchObject({
      nodeId: 'c',
      parentId: 'p',
    });
    expect(tree.children('p').map(({id}) => id)).toEqual(['c']);

    const event = new KeyboardEvent('keydown', {key: 'Escape'});
    tree.closeDescendants('p', event, 'escape-key');
    expect(child.onOpenChange).toHaveBeenCalledWith(
      false,
      event,
      'escape-key',
    );
    expect(grandchild.onOpenChange).toHaveBeenCalledWith(
      false,
      event,
      'escape-key',
    );

    grandchildRegistration.unregister();
    childRegistration.unregister();
    expect(child.controller.context.nested).toBe(false);
    parentRegistration.unregister();
    expect(tree.nodes).toHaveLength(0);
  });

  test('notifies subscribers on registration changes', () => {
    const tree = new FloatingTree();
    const listener = vi.fn();
    const unsubscribe = tree.subscribe(listener);
    const node = createNode();
    const registration = tree.register(node.controller);
    registration.unregister();
    unsubscribe();
    tree.register(createNode().controller);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('provides the nearest Light DOM context and stops after cleanup', () => {
    const parent = document.createElement('div');
    const child = document.createElement('button');
    parent.append(child);
    document.body.append(parent);
    const cleanup = provideFloatingContext(parent, 'menu', () => ({
      id: 'root',
    }));

    expect(requestFloatingContext<{id: string}>(child, 'menu')).toEqual({
      id: 'root',
    });
    cleanup();
    expect(requestFloatingContext(child, 'menu')).toBeUndefined();
  });

  test('inherits coordinator tree and delay group state through scopes', () => {
    let parentOpen = false;
    let childOpen = false;
    const tree = new FloatingTree();
    const group = new DelayGroup();
    const parent = createFloating(() => ({
      open: parentOpen,
      onOpenChange: (open) => {
        parentOpen = open;
      },
    }))
      .node({tree, id: 'parent'})
      .delayGroup({group, id: 'parent'});
    const child = createFloating(() => ({
      open: childOpen,
      onOpenChange: (open) => {
        childOpen = open;
      },
    }))
      .node({id: 'child'})
      .delayGroup({id: 'child'})
      .setContextParent(parent.contextScope);

    parent.connect();
    child.connect();
    expect(tree.nodes.map(({id, parentId}) => [id, parentId])).toEqual([
      ['parent', null],
      ['child', 'parent'],
    ]);
    expect(child.context.data.delayGroup).toBe(group);

    child.context.onOpenChange(true, undefined, 'hover');
    expect(group.currentId).toBe('child');
    child.disconnect();
    expect(tree.nodes.map(({id}) => id)).toEqual(['parent']);
    expect(child.context.data.delayGroup).toBeUndefined();

    parent.destroy();
    child.destroy();
  });

  test('owns the collection service and accepts an explicit list', () => {
    const controller = createFloating();
    const itemCleanup = controller.list.register({
      label: 'Default',
      value: 1,
    });
    expect(controller.list.items[0]?.label).toBe('Default');
    itemCleanup();

    const list = new FloatingList<number>();
    controller.withList(list as FloatingList<unknown>);
    expect(controller.list).toBe(list);
    controller.destroy();
  });
});

describe('non-modal focus manager', () => {
  test('focuses initial content and closes on focus out', async () => {
    let open = true;
    const onOpenChange = vi.fn((next: boolean) => {
      open = next;
    });
    const reference = document.createElement('button');
    const floating = document.createElement('div');
    const inside = document.createElement('button');
    const outside = document.createElement('button');
    floating.append(inside);
    document.body.append(reference, floating, outside);
    const controller = createFloating(() => ({open, onOpenChange})).pipe(
      // Non-modal surfaces use native focus movement rather than focus-trap.
      // This also covers closeOnFocusOut's asynchronous active-element check.
      (await import('../../src')).focusManager({
        modal: false,
        closeOnFocusOut: true,
        initialFocus: inside,
      }),
    );
    controller.setReference(reference);
    controller.setFloating(floating);
    controller.connect();
    await Promise.resolve();
    expect(document.activeElement).toBe(inside);

    outside.focus();
    fireEvent.focusOut(floating, {relatedTarget: outside});
    await Promise.resolve();
    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(FocusEvent),
      'focus-out',
    );
    controller.destroy();
  });
});
