import {afterEach, describe, expect, test, vi} from 'vitest';
import {userEvent} from 'vitest/browser';

import {click, createFloating, dismiss, offset} from '../../src';

const runsInRealBrowser = !navigator.userAgent.includes('jsdom');

afterEach(() => {
  document.body.replaceChildren();
  document.body.removeAttribute('style');
});

describe.skipIf(!runsInRealBrowser)('real browser DOM', () => {
  test('uses Playwright input to produce the native pointer and keyboard path', async () => {
    const reference = document.createElement('button');
    const floatingElement = document.createElement('div');
    reference.textContent = 'Open';
    floatingElement.textContent = 'Floating';
    document.body.append(reference, floatingElement);

    const eventOrder: string[] = [];
    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach((type) => {
      reference.addEventListener(type, () => eventOrder.push(type));
    });

    let open = false;
    const onOpenChange = vi.fn((next: boolean) => {
      open = next;
    });
    const floating = createFloating(() => ({open, onOpenChange})).pipe(
      click(),
      dismiss(),
    );
    floating.setReference(reference);
    floating.setFloating(floatingElement);
    floating.connect();

    await userEvent.click(reference);

    expect(eventOrder).toEqual([
      'pointerdown',
      'mousedown',
      'mouseup',
      'click',
    ]);
    expect(document.activeElement).toBe(reference);
    expect(onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.any(MouseEvent),
      'click',
    );

    floating.refresh();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(KeyboardEvent),
      'escape-key',
    );
    floating.destroy();
  });

  test('measures CSS layout with the native layout engine', async () => {
    document.body.style.margin = '0';
    const reference = document.createElement('button');
    const floatingElement = document.createElement('div');
    Object.assign(reference.style, {
      position: 'fixed',
      left: '240px',
      top: '180px',
      width: '120px',
      height: '40px',
    });
    Object.assign(floatingElement.style, {
      width: '80px',
      height: '30px',
    });
    document.body.append(reference, floatingElement);

    const floating = createFloating({
      open: true,
      placement: 'bottom-start',
      strategy: 'fixed',
      middleware: [offset(12)],
    });
    floating.setReference(reference);
    floating.setFloating(floatingElement);
    floating.connect();
    await floating.update();
    Object.assign(floatingElement.style, floating.floatingStyles);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );

    const referenceRect = reference.getBoundingClientRect();
    const floatingRect = floatingElement.getBoundingClientRect();
    expect(navigator.userAgent).not.toContain('jsdom');
    expect(navigator.webdriver).toBe(true);
    expect(referenceRect.toJSON()).toMatchObject({
      x: 240,
      y: 180,
      width: 120,
      height: 40,
    });
    expect(floatingRect.x).toBeCloseTo(240, 0);
    expect(floatingRect.y).toBeCloseTo(232, 0);
    expect(floatingRect.width).toBeCloseTo(80, 0);
    expect(floatingRect.height).toBeCloseTo(30, 0);
    floating.destroy();
  });
});
