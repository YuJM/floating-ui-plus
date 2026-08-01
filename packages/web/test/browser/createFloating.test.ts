import {fireEvent} from '@testing-library/dom';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  click,
  createFloating,
  dismiss,
  focus,
  focusManager,
  getDocumentTrapStack,
  role,
} from '../../src';

afterEach(() => {
  document.body.replaceChildren();
});

describe('createFloating pipeline', () => {
  test('provides the default dialog ARIA relationship without a role plugin', () => {
    const reference = document.createElement('button');
    const floatingElement = document.createElement('div');
    document.body.append(reference, floatingElement);
    const floating = createFloating({open: true});

    floating.setReference(reference);
    floating.setFloating(floatingElement);
    floating.connect();

    expect(floating.context.attributes.reference).toMatchObject({
      'aria-expanded': 'true',
      'aria-haspopup': 'dialog',
      'aria-controls': floating.context.floatingId,
    });
    expect(floating.context.attributes.floating).toMatchObject({
      id: floating.context.floatingId,
      role: 'dialog',
    });
    floating.destroy();
  });

  test('injects one context and runs native interactions in order', () => {
    const reference = document.createElement('button');
    const floatingElement = document.createElement('div');
    document.body.append(reference, floatingElement);
    let open = false;
    const onOpenChange = vi.fn((next: boolean) => {
      open = next;
    });
    const floating = createFloating(() => ({open, onOpenChange})).pipe(
      click(),
      focus(),
      dismiss(),
      role({role: 'dialog'}),
    );

    floating.setReference(reference);
    floating.setFloating(floatingElement);
    floating.connect();
    fireEvent.click(reference);

    expect(onOpenChange).toHaveBeenCalledWith(
      true,
      expect.any(MouseEvent),
      'click',
    );
    floating.refresh();
    expect(floating.context.attributes.reference?.['aria-expanded']).toBe(
      'true',
    );

    fireEvent.keyDown(document, {key: 'Escape'});
    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(KeyboardEvent),
      'escape-key',
    );
    floating.destroy();
  });

  test('runs onBeforeClose before every close request and can cancel it', () => {
    let open = true;
    const beforeClose = vi.fn(() => false);
    const onOpenChange = vi.fn((next: boolean) => {
      open = next;
    });
    const floating = createFloating(() => ({
      open,
      onBeforeClose: beforeClose,
      onOpenChange,
    }));

    floating.context.onOpenChange(false, undefined, 'escape-key');

    expect(beforeClose).toHaveBeenCalledWith(undefined, 'escape-key');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(open).toBe(true);

    beforeClose.mockReturnValue(true);
    floating.context.onOpenChange(false, undefined, 'click');

    expect(beforeClose).toHaveBeenLastCalledWith(undefined, 'click');
    expect(onOpenChange).toHaveBeenCalledWith(false, undefined, 'click');
    expect(open).toBe(false);
    floating.destroy();
  });

  test('enabled false installs inert plugins', () => {
    const reference = document.createElement('button');
    const onOpenChange = vi.fn();
    const floating = createFloating({open: false, onOpenChange}).pipe(
      click({enabled: false}),
      focus({enabled: false}),
      dismiss({enabled: false}),
    );
    floating.setReference(reference);
    floating.connect();

    fireEvent.click(reference);
    fireEvent.focus(reference);
    fireEvent.keyDown(document, {key: 'Escape'});
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test('shares the nested modal trap stack per document', () => {
    const createModal = () => {
      const reference = document.createElement('button');
      const element = document.createElement('div');
      element.innerHTML = '<button>Inside</button>';
      document.body.append(reference, element);
      const floating = createFloating({open: true}).pipe(
        focusManager({
          tabbableOptions: {displayCheck: 'none'},
        }),
      );
      floating.setReference(reference);
      floating.setFloating(element);
      floating.connect();
      return floating;
    };

    const parent = createModal();
    const child = createModal();
    expect(getDocumentTrapStack(document)).toHaveLength(2);
    child.destroy();
    expect(getDocumentTrapStack(document)).toHaveLength(1);
    parent.destroy();
    expect(getDocumentTrapStack(document)).toHaveLength(0);
  });

  test('keeps dynamically added inside containers out of subtree isolation', async () => {
    const reference = document.createElement('button');
    const floatingElement = document.createElement('div');
    const insideButton = document.createElement('button');
    const outside = document.createElement('div');
    const insideContainers: Element[] = [];
    floatingElement.append(insideButton);
    document.body.append(reference, floatingElement, outside);
    const floating = createFloating({open: true}).pipe(
      focusManager({
        isolateSubtrees: 'inert',
        getInsideElements: () => insideContainers,
        tabbableOptions: {displayCheck: 'none'},
      }),
    );
    floating.setReference(reference);
    floating.setFloating(floatingElement);
    floating.connect();

    const portal = document.createElement('div');
    portal.append(document.createElement('button'));
    insideContainers.push(portal);
    document.body.append(portal);

    await vi.waitFor(() => {
      expect(portal.hasAttribute('inert')).toBe(false);
      expect(outside.hasAttribute('inert')).toBe(true);
    });
    expect(getDocumentTrapStack(document)).toHaveLength(1);
    expect(getDocumentTrapStack(document)[0]?.paused).toBe(false);
    floating.destroy();
    expect(getDocumentTrapStack(document)).toHaveLength(0);
    expect(outside.hasAttribute('inert')).toBe(false);
  });

  test('restores isolation after a nested trap pauses a dynamic parent trap', async () => {
    const parentReference = document.createElement('button');
    const parentFloating = document.createElement('div');
    const childReference = document.createElement('button');
    const outside = document.createElement('div');
    const insideContainers: Element[] = [];
    parentFloating.append(childReference);
    document.body.append(parentReference, parentFloating, outside);
    const parent = createFloating({open: true}).pipe(
      focusManager({
        isolateSubtrees: 'inert',
        getInsideElements: () => insideContainers,
        tabbableOptions: {displayCheck: 'none'},
      }),
    );
    parent.setReference(parentReference);
    parent.setFloating(parentFloating);
    parent.connect();

    const portalTarget = document.createElement('div');
    const childFloating = document.createElement('div');
    childFloating.append(document.createElement('button'));
    portalTarget.append(childFloating);
    insideContainers.push(portalTarget);
    document.body.append(portalTarget);
    const child = createFloating({open: true}).pipe(
      focusManager({
        tabbableOptions: {displayCheck: 'none'},
      }),
    );
    child.setReference(childReference);
    child.setFloating(childFloating);
    child.connect();

    await vi.waitFor(() => {
      expect(getDocumentTrapStack(document)).toHaveLength(2);
      expect(portalTarget.hasAttribute('inert')).toBe(false);
    });
    child.destroy();
    insideContainers.splice(0);
    portalTarget.remove();
    await vi.waitFor(() => {
      expect(getDocumentTrapStack(document)).toHaveLength(1);
      expect(outside.hasAttribute('inert')).toBe(true);
    });
    parent.destroy();

    expect(getDocumentTrapStack(document)).toHaveLength(0);
    expect(outside.hasAttribute('inert')).toBe(false);
  });

  test('returns focus when a closed manager disconnects before its microtask', async () => {
    let open = true;
    const reference = document.createElement('button');
    const element = document.createElement('div');
    element.innerHTML = '<button>Inside</button>';
    document.body.append(reference, element);
    reference.focus();
    const floating = createFloating(() => ({
      open,
      onOpenChange(next: boolean) {
        open = next;
      },
    })).pipe(
      focusManager({
        tabbableOptions: {displayCheck: 'none'},
      }),
    );
    floating.setReference(reference);
    floating.setFloating(element);
    floating.connect();
    await Promise.resolve();
    const inside = element.querySelector('button')!;
    inside.focus();
    expect(document.activeElement).toBe(inside);

    floating.context.onOpenChange(false, undefined, 'escape-key');
    floating.destroy();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.activeElement).toBe(reference);
  });
});
