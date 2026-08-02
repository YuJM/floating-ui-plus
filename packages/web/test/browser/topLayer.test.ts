import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  createFloatingTopLayer,
  supportsFloatingTopLayer,
} from '../../src';

afterEach(() => {
  document.body.replaceChildren();
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('FloatingTopLayerController', () => {
  test('uses the native popover top layer and reports browser dismissal', async () => {
    if (!supportsFloatingTopLayer('popover')) return;
    const element = document.createElement('div');
    const onOpenChange = vi.fn();
    const topLayer = createFloatingTopLayer({onOpenChange});
    document.body.append(element);
    topLayer.setKind('popover');
    topLayer.setElement(element);
    topLayer.connect();

    expect(topLayer.sync(true)).toBe(true);
    expect(element.matches(':popover-open')).toBe(true);
    expect(element.parentElement).toBe(document.body);

    element.hidePopover();
    await vi.waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(
        false,
        expect.any(Event),
        'outside-press',
      );
    });
    topLayer.sync(false);
    topLayer.destroy();
  });

  test('uses a native modal dialog and maps Escape to the shared contract', () => {
    if (!supportsFloatingTopLayer('dialog')) return;
    const element = document.createElement('dialog');
    const onOpenChange = vi.fn();
    const topLayer = createFloatingTopLayer({onOpenChange});
    document.body.append(element);
    topLayer.setKind('dialog');
    topLayer.setElement(element);
    topLayer.connect();

    expect(topLayer.sync(true)).toBe(true);
    expect(element.open).toBe(true);
    const cancel = new Event('cancel', {cancelable: true});
    element.dispatchEvent(cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(false, cancel, 'escape-key');
    topLayer.sync(false);
    expect(element.open).toBe(false);
    topLayer.destroy();
  });

  test('exposes safe-area insets on native dialogs without overriding author styles', () => {
    if (!supportsFloatingTopLayer('dialog')) return;
    const element = document.createElement('dialog');
    element.style.setProperty('--fup-safe-area-inset-bottom', '12px');
    const topLayer = createFloatingTopLayer({onOpenChange: vi.fn()});
    document.body.append(element);
    topLayer.setKind('dialog');
    topLayer.setElement(element);
    topLayer.connect();

    expect(element).toHaveAttribute('data-fup-safe-area', '');
    expect(element.style.getPropertyValue('--fup-safe-area-inset-top')).toBe(
      'env(safe-area-inset-top, 0px)',
    );
    expect(element.style.getPropertyValue('--fup-safe-area-inset-bottom')).toBe(
      '12px',
    );

    topLayer.destroy();
    expect(element).not.toHaveAttribute('data-fup-safe-area');
    expect(element.style.getPropertyValue('--fup-safe-area-inset-top')).toBe('');
    expect(element.style.getPropertyValue('--fup-safe-area-inset-bottom')).toBe(
      '12px',
    );
  });

  test('restores hidden after a dialog discrete exit transition', () => {
    if (!supportsFloatingTopLayer('dialog')) return;
    const element = document.createElement('dialog');
    element.style.transition =
      'display 100ms allow-discrete, overlay 100ms allow-discrete';
    const topLayer = createFloatingTopLayer({onOpenChange: vi.fn()});
    document.body.append(element);
    topLayer.setKind('dialog');
    topLayer.setElement(element);
    topLayer.connect();
    topLayer.sync(true);

    topLayer.sync(false);

    expect(element.open).toBe(false);
    expect(element.hidden).toBe(false);
    element.dispatchEvent(
      new TransitionEvent('transitionend', {propertyName: 'overlay'}),
    );
    expect(element.hidden).toBe(true);
    topLayer.destroy();
  });

  test('restores hidden after a popover discrete exit transition', () => {
    if (!supportsFloatingTopLayer('popover')) return;
    const element = document.createElement('div');
    element.style.transition =
      'display 100ms allow-discrete, overlay 100ms allow-discrete';
    const topLayer = createFloatingTopLayer({onOpenChange: vi.fn()});
    document.body.append(element);
    topLayer.setKind('popover');
    topLayer.setElement(element);
    topLayer.connect();
    topLayer.sync(true);

    topLayer.sync(false);

    expect(element.matches(':popover-open')).toBe(false);
    expect(element.hidden).toBe(false);
    expect(element).toHaveAttribute('popover', 'manual');
    element.dispatchEvent(
      new TransitionEvent('transitionend', {propertyName: 'display'}),
    );
    expect(element.hidden).toBe(true);
    topLayer.destroy();
  });

  test('hides a popover immediately when it has no discrete exit transition', () => {
    if (!supportsFloatingTopLayer('popover')) return;
    const element = document.createElement('div');
    const topLayer = createFloatingTopLayer({onOpenChange: vi.fn()});
    document.body.append(element);
    topLayer.setKind('popover');
    topLayer.setElement(element);
    topLayer.connect();
    topLayer.sync(true);

    topLayer.sync(false);

    expect(element.matches(':popover-open')).toBe(false);
    expect(element.hidden).toBe(true);
    topLayer.destroy();
  });

  test('does not defer hidden for a display transition without allow-discrete', () => {
    if (!supportsFloatingTopLayer('popover')) return;
    const element = document.createElement('div');
    element.style.transition = 'display 100ms, overlay 100ms';
    const topLayer = createFloatingTopLayer({onOpenChange: vi.fn()});
    document.body.append(element);
    topLayer.setKind('popover');
    topLayer.setElement(element);
    topLayer.connect();
    topLayer.sync(true);

    topLayer.sync(false);

    expect(element.hidden).toBe(true);
    topLayer.destroy();
  });

  test('does not infer an exit animation from transition all', () => {
    if (!supportsFloatingTopLayer('popover')) return;
    const element = document.createElement('div');
    element.style.transition = 'all 100ms allow-discrete';
    const topLayer = createFloatingTopLayer({onOpenChange: vi.fn()});
    document.body.append(element);
    topLayer.setKind('popover');
    topLayer.setElement(element);
    topLayer.connect();
    topLayer.sync(true);

    topLayer.sync(false);

    expect(element.hidden).toBe(true);
    topLayer.destroy();
  });

  test('reopens a dialog after a CSS-driven exit', () => {
    if (!supportsFloatingTopLayer('dialog')) return;
    const element = document.createElement('dialog');
    element.style.transition =
      'display 100ms allow-discrete, overlay 100ms allow-discrete';
    const topLayer = createFloatingTopLayer({onOpenChange: vi.fn()});
    document.body.append(element);
    topLayer.setKind('dialog');
    topLayer.setElement(element);
    topLayer.connect();
    topLayer.sync(true);
    topLayer.sync(false);

    topLayer.sync(true);

    expect(element.open).toBe(true);
    expect(element.hidden).toBe(false);
    topLayer.destroy();
  });

  test('locks document scroll only while native dialogs are open', async () => {
    if (!supportsFloatingTopLayer('dialog')) return;
    document.body.style.overflow = 'scroll';

    const firstElement = document.createElement('dialog');
    const secondElement = document.createElement('dialog');
    const first = createFloatingTopLayer({onOpenChange: vi.fn()});
    const second = createFloatingTopLayer({onOpenChange: vi.fn()});
    document.body.append(firstElement, secondElement);

    for (const [controller, element] of [
      [first, firstElement],
      [second, secondElement],
    ] as const) {
      controller.setKind('dialog');
      controller.setElement(element);
      controller.connect();
      expect(controller.sync(true)).toBe(true);
    }

    expect(document.body.style.overflow).toBe('hidden');
    first.sync(false);
    expect(document.body.style.overflow).toBe('hidden');

    secondElement.close();
    await vi.waitFor(() =>
      expect(document.body.style.overflow).toBe('scroll'),
    );

    second.destroy();
    first.destroy();
  });

  test('releases a dialog scroll lock when its surface changes', () => {
    if (!supportsFloatingTopLayer('dialog')) return;
    document.body.style.overflow = '';
    const element = document.createElement('dialog');
    const topLayer = createFloatingTopLayer({onOpenChange: vi.fn()});
    document.body.append(element);
    topLayer.setKind('dialog');
    topLayer.setElement(element);
    topLayer.connect();
    topLayer.sync(true);

    expect(document.body.style.overflow).toBe('hidden');
    topLayer.setKind('none');
    expect(document.body.style.overflow).toBe('');
    topLayer.destroy();
  });

  test('reopens a native surface when a close request is rejected', async () => {
    if (!supportsFloatingTopLayer('popover')) return;
    const element = document.createElement('div');
    const onOpenChange = vi.fn(() => false);
    const topLayer = createFloatingTopLayer({onOpenChange});
    document.body.append(element);
    topLayer.setKind('popover');
    topLayer.setElement(element);
    topLayer.connect();
    topLayer.sync(true);

    element.hidePopover();
    await vi.waitFor(() => expect(element.matches(':popover-open')).toBe(true));
    expect(onOpenChange).toHaveBeenCalledWith(
      false,
      expect.any(Event),
      'outside-press',
    );
    topLayer.destroy();
  });
});
