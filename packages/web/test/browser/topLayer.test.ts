import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  createFloatingTopLayer,
  supportsFloatingTopLayer,
} from '../../src';

afterEach(() => {
  document.body.replaceChildren();
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
});
