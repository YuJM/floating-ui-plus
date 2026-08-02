import {fireEvent} from '@testing-library/dom';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  CompositeController,
  applyFloatingStyles,
  createPortalBridge,
  createFloatingContextScope,
  createFloating,
  createOverlayElement,
  createPortalNode,
  createPortalNodeController,
  DelayGroup,
  FloatingList,
  FloatingTransition,
  FloatingPresenceStack,
  FloatingTree,
  FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
  FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE,
  FLOATING_UI_PLUS_PORTAL_ATTRIBUTE,
  getArrowStyles,
  getArrowTransform,
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
    ['top', 'rotate(180deg)'],
    ['right', 'rotate(-90deg)'],
    ['bottom', 'rotate(0deg)'],
    ['left', 'rotate(90deg)'],
  ] as const)('rotates a default arrow for %s placement', (placement, transform) => {
    expect(getArrowTransform(placement)).toBe(transform);
  });

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
    element.setAttribute(FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE, '6');

    const styles = getArrowStyles(
      placement,
      {arrow: {x: 8, y: 4, centerOffset: 0}},
      {element},
    );

    const usesHorizontalAxis = placement === 'top' || placement === 'bottom';
    expect(styles).toMatchObject({
      position: 'absolute',
      left: usesHorizontalAxis ? '8px' : '',
      top: usesHorizontalAxis ? '' : '4px',
      [staticSide]: '-6px',
    });
  });

  test('supports numeric and CSS static offsets', () => {
    const element = document.createElement('div');
    expect(
      getArrowStyles('bottom-start', {}, {element, staticOffset: 10}).top,
    ).toBe('10px');
    expect(
      getArrowStyles('bottom-start', {}, {element, staticOffset: '-9'}).top,
    ).toBe('-9px');
    expect(
      getArrowStyles('bottom-end', {}, {element, staticOffset: '15%'}).top,
    ).toBe('15%');
  });

  test('only applies automatic rotation when requested', () => {
    const element = document.createElement('div');

    expect(getArrowStyles('top', {}, {element}).transform).toBeUndefined();
    expect(
      getArrowStyles('top', {}, {element, rotate: true}).transform,
    ).toBe('rotate(180deg)');
  });

  test('clears the previous static side when placement changes', () => {
    const element = document.createElement('div');
    element.setAttribute(FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE, '6');

    expect(
      getArrowStyles('top', {arrow: {x: 8, centerOffset: 0}}, {element}),
    ).toMatchObject({top: '', bottom: '-6px'});
    expect(
      getArrowStyles('bottom', {arrow: {x: 8, centerOffset: 0}}, {element}),
    ).toMatchObject({top: '-6px', bottom: ''});
  });
});

describe('floating styles', () => {
  test('applies positioning styles and clears omitted properties', () => {
    const element = document.createElement('div');
    element.style.bottom = '8px';
    applyFloatingStyles(element, {
      position: 'absolute',
      top: '0px',
      left: '0px',
      transform: 'translate(12px, 24px)',
    });

    expect(element.style.position).toBe('absolute');
    expect(element.style.transform).toBe('translate(12px, 24px)');
    expect(element.style.bottom).toBe('');
  });
});

describe('floating presence', () => {
  test('resolves when the mounted surface receives a positioned update', async () => {
    const reference = document.createElement('button');
    const floating = document.createElement('div');
    document.body.append(reference, floating);
    const controller = createFloating({open: true});
    controller.setReference(reference);
    controller.setFloating(floating);
    controller.connect();

    const positioned = controller.whenPositioned();
    controller.presence.set('mounted');
    await controller.update();

    await expect(positioned).resolves.toMatchObject({isPositioned: true});
    controller.presence.set('leaving');
    expect(controller.presence.state).toBe('leaving');
    controller.destroy();
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
  test('moves a context scope between portal targets and cleans it up', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    const child = document.createElement('span');
    const scope = createFloatingContextScope();
    scope.provide('theme', 'night');
    document.body.append(first, second);

    const bridge = createPortalBridge({contextScope: scope});
    bridge.attach(first);
    first.append(child);
    expect(requestFloatingContext(child, 'theme')).toBe('night');

    bridge.move(second);
    expect(requestFloatingContext(child, 'theme')).toBeUndefined();
    second.append(child);
    expect(requestFloatingContext(child, 'theme')).toBe('night');

    bridge.detach();
    expect(requestFloatingContext(child, 'theme')).toBeUndefined();
    bridge.destroy();
    expect(bridge.target).toBeNull();
  });

  test('resolves a deferred target across connect, refresh, and disconnect', () => {
    const firstScope = createFloatingContextScope();
    const secondScope = createFloatingContextScope();
    firstScope.provide('theme', 'first');
    secondScope.provide('theme', 'second');
    let target: HTMLElement | null = null;
    const bridge = createPortalBridge({
      contextScope: firstScope,
      target: () => target,
    });
    const node = document.createElement('div');
    const child = document.createElement('span');
    node.append(child);

    expect(bridge.status).toBe('detached');
    expect(bridge.connect()).toBeNull();
    expect(bridge.status).toBe('pending');
    target = node;
    expect(bridge.refresh()).toBe(node);
    expect(bridge.status).toBe('attached');
    expect(requestFloatingContext(child, 'theme')).toBe('first');
    bridge.setContextScope(secondScope);
    expect(requestFloatingContext(child, 'theme')).toBe('second');
    bridge.disconnect();
    expect(bridge.status).toBe('detached');
    expect(requestFloatingContext(child, 'theme')).toBeUndefined();
    bridge.connect();
    expect(requestFloatingContext(child, 'theme')).toBe('second');
    target = null;
    bridge.refresh();
    expect(bridge.status).toBe('pending');
    bridge.destroy();
    expect(bridge.status).toBe('destroyed');
  });

  test('creates an owned portal node after its root becomes available', () => {
    const scope = createFloatingContextScope();
    scope.provide('theme', 'deferred');
    let root: HTMLElement | null = null;
    const portal = createPortalNodeController({
      id: 'deferred-portal',
      root: () => root,
      contextScope: scope,
    });

    expect(portal.connect()).toBeNull();
    expect(portal.status).toBe('pending');

    root = document.createElement('section');
    document.body.append(root);
    const firstNode = portal.refresh();
    expect(firstNode?.parentElement).toBe(root);
    expect(portal.status).toBe('attached');
    const child = document.createElement('span');
    firstNode?.append(child);
    expect(requestFloatingContext(child, 'theme')).toBe('deferred');

    const nextRoot = document.createElement('section');
    document.body.append(nextRoot);
    root = nextRoot;
    const movedNode = portal.refresh();
    expect(firstNode?.isConnected).toBe(false);
    expect(movedNode?.parentElement).toBe(nextRoot);

    portal.disconnect();
    expect(movedNode?.isConnected).toBe(false);
    expect(portal.status).toBe('detached');
    expect(portal.connect()?.parentElement).toBe(nextRoot);
    portal.destroy();
  });

  test('keeps multiple open portal nodes isolated and closes one without affecting the other', () => {
    const root = document.createElement('section');
    const firstScope = createFloatingContextScope();
    const secondScope = createFloatingContextScope();
    firstScope.provide('portal', 'first');
    secondScope.provide('portal', 'second');
    document.body.append(root);

    const firstPortal = createPortalNodeController({
      id: 'first-portal',
      root,
      contextScope: firstScope,
    });
    const secondPortal = createPortalNodeController({
      id: 'second-portal',
      root,
      contextScope: secondScope,
    });

    const firstNode = firstPortal.connect()!;
    const secondNode = secondPortal.connect()!;
    const firstContent = document.createElement('button');
    const secondContent = document.createElement('button');
    firstNode.append(firstContent);
    secondNode.append(secondContent);

    expect(
      root.querySelectorAll(`[${FLOATING_UI_PLUS_PORTAL_ATTRIBUTE}]`),
    ).toHaveLength(2);
    expect(firstNode).not.toBe(secondNode);
    expect(requestFloatingContext(firstContent, 'portal')).toBe('first');
    expect(requestFloatingContext(secondContent, 'portal')).toBe('second');

    firstPortal.disconnect();

    expect(firstNode.isConnected).toBe(false);
    expect(requestFloatingContext(firstContent, 'portal')).toBeUndefined();
    expect(secondNode.isConnected).toBe(true);
    expect(requestFloatingContext(secondContent, 'portal')).toBe('second');
    expect(
      root.querySelectorAll(`[${FLOATING_UI_PLUS_PORTAL_ATTRIBUTE}]`),
    ).toHaveLength(1);

    firstPortal.destroy();
    secondPortal.destroy();
  });

  test('reuses and preserves a consumer-owned deferred portal node', () => {
    const root = document.createElement('section');
    const existing = document.createElement('div');
    existing.id = 'consumer-deferred-portal';
    root.append(existing);
    document.body.append(root);
    const portal = createPortalNodeController({
      id: existing.id,
      root: () => root,
    });

    expect(portal.connect()).toBe(existing);
    portal.disconnect();
    expect(existing.isConnected).toBe(true);
    portal.destroy();
    expect(existing.isConnected).toBe(true);
  });

  test('creates, reuses, roots, and removes owned portal nodes', () => {
    const root = document.createElement('section');
    document.body.append(root);

    const first = createPortalNode({id: 'portal', root});
    const reused = createPortalNode({id: 'portal', root});
    expect(first).toBe(reused);
    expect(first?.parentElement).toBe(root);
    expect(first?.hasAttribute(FLOATING_UI_PLUS_PORTAL_ATTRIBUTE)).toBe(true);

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
    expect(overlay.element.hasAttribute(FLOATING_UI_PLUS_OVERLAY_ATTRIBUTE)).toBe(
      true,
    );
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

describe('FloatingPresenceStack', () => {
  test('bounds the stack, pauses timers, and leaves exit presence to the renderer', () => {
    vi.useFakeTimers();
    const controller = new FloatingPresenceStack<string>({limit: 2, timeout: 100});
    const first = controller.add('First', {id: 'first'});
    controller.add('Second', {id: 'second'});
    const third = controller.add('Third', {id: 'third'});

    expect(first).toBe('first');
    expect(third).toBe('third');
    expect(controller.snapshot.records).toEqual([
      expect.objectContaining({id: 'first', open: false, overflowed: true}),
      expect.objectContaining({id: 'second', open: true}),
      expect.objectContaining({id: 'third', open: true}),
    ]);

    controller.pause('pointer');
    vi.advanceTimersByTime(200);
    expect(controller.snapshot.records.filter((record) => record.open)).toHaveLength(2);

    controller.resume('pointer');
    vi.advanceTimersByTime(100);
    expect(controller.snapshot.records.filter((record) => record.open)).toHaveLength(0);
    expect(controller.snapshot.records).toHaveLength(3);

    controller.remove('first');
    expect(controller.snapshot.records).toHaveLength(2);
    controller.destroy();
  });

  test('keeps timeout zero records open until explicitly closed', () => {
    vi.useFakeTimers();
    const controller = new FloatingPresenceStack<string>({timeout: 0});
    const id = controller.add('Persistent');

    vi.advanceTimersByTime(10_000);
    expect(controller.snapshot.records[0]).toMatchObject({id, open: true});

    controller.close(id);
    expect(controller.snapshot.records[0]).toMatchObject({id, open: false});
    controller.destroy();
  });

  test('updates future defaults and closes excess records when the limit shrinks', () => {
    vi.useFakeTimers();
    const controller = new FloatingPresenceStack<string>({limit: 3, timeout: 0});
    controller.add('First', {id: 'first'});
    controller.add('Second', {id: 'second'});
    controller.add('Third', {id: 'third'});

    controller.setOptions({limit: 2, timeout: 50});

    expect(controller.options).toEqual({limit: 2, timeout: 50});
    expect(controller.snapshot.records).toEqual([
      expect.objectContaining({id: 'first', open: false, overflowed: true}),
      expect.objectContaining({id: 'second', open: true}),
      expect.objectContaining({id: 'third', open: true}),
    ]);

    controller.add('Fourth', {id: 'fourth'});
    vi.advanceTimersByTime(50);
    expect(controller.snapshot.records.find(({id}) => id === 'fourth')).toMatchObject({
      open: false,
    });
    controller.destroy();
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
