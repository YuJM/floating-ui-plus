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
});
