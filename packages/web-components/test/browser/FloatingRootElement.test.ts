import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  FloatingArrowElement,
  FloatingCompositeElement,
  FloatingContentElement,
  FloatingListElement,
  FloatingReferenceElement,
  FloatingRootElement,
  offset,
} from '../../src';

afterEach(() => {
  document.body.replaceChildren();
});

describe('FloatingRootElement', () => {
  test('binds native slotted elements without a directive', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.middleware = [offset(8)];
    root.innerHTML = `
      <button slot="reference">Open</button>
      <section slot="floating">Content</section>
    `;
    document.body.append(root);
    await root.updateComplete;
    await root.updatePosition();

    expect(root).toBeInstanceOf(FloatingRootElement);
    expect(root.referenceElement).toBe(root.querySelector('button'));
    expect(root.floatingElement).toBe(root.querySelector('section'));
    expect(root.floatingElement?.hidden).toBe(false);
    expect(root.floatingElement?.style.position).toBe('absolute');
  });

  test('maps click interactions to reflected state and a DOM event', async () => {
    const root = document.createElement('floating-root');
    root.interactions = 'click dismiss';
    root.floatingRole = 'dialog';
    root.innerHTML = `
      <button slot="reference">Open</button>
      <section slot="floating">Content</section>
    `;
    const listener = vi.fn();
    root.addEventListener('openchange', listener);
    document.body.append(root);
    await root.updateComplete;

    root.querySelector('button')?.click();
    await root.updateComplete;

    expect(root.open).toBe(true);
    expect(root.hasAttribute('open')).toBe(true);
    expect(root.floatingElement?.getAttribute('role')).toBe('dialog');
    expect(listener).toHaveBeenCalledOnce();
  });

  test('reconciles replaced slot content', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <button slot="reference">First</button>
      <section slot="floating">First panel</section>
    `;
    document.body.append(root);
    await root.updateComplete;
    const first = root.referenceElement;

    const replacement = document.createElement('button');
    replacement.slot = 'reference';
    replacement.textContent = 'Second';
    first?.replaceWith(replacement);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root.referenceElement).toBe(replacement);
    expect(root.controller.elements.reference).toBe(replacement);
  });

  test('composes reference and content components through Lit Context', async () => {
    const root = document.createElement('floating-root');
    root.interactions = 'click dismiss';
    root.floatingRole = 'dialog';
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-content><section>Content</section></floating-content>
    `;
    document.body.append(root);
    await root.updateComplete;
    const reference = root.querySelector('floating-reference');
    const content = root.querySelector('floating-content');
    await reference?.updateComplete;
    await content?.updateComplete;

    expect(reference).toBeInstanceOf(FloatingReferenceElement);
    expect(content).toBeInstanceOf(FloatingContentElement);
    expect(root.referenceElement).toBe(root.querySelector('button'));
    expect(root.floatingElement).toBe(root.querySelector('section'));

    root.querySelector('button')?.click();
    await root.updateComplete;
    expect(root.open).toBe(true);
    expect(root.floatingElement?.getAttribute('role')).toBe('dialog');
  });

  test('provides ordered list and composite components', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-list>
        <floating-list-item label="One"><button>One</button></floating-list-item>
        <floating-list-item label="Two"><button>Two</button></floating-list-item>
      </floating-list>
    `;
    document.body.append(root);
    await root.updateComplete;
    const list = root.querySelector('floating-list');
    const listItems = Array.from(
      root.querySelectorAll('floating-list-item'),
    );
    await list?.updateComplete;
    await Promise.all(listItems.map((item) => item.updateComplete));

    expect(list).toBeInstanceOf(FloatingListElement);
    expect(root.controller.list.items.map((item) => item.label)).toEqual([
      'One',
      'Two',
    ]);

    const composite = document.createElement('floating-composite');
    composite.loop = true;
    composite.innerHTML = `
      <floating-composite-item><button>First</button></floating-composite-item>
      <floating-composite-item><button>Second</button></floating-composite-item>
    `;
    document.body.append(composite);
    await composite.updateComplete;
    await Promise.all(
      Array.from(
        composite.querySelectorAll('floating-composite-item'),
      ).map(
        (item) => item.updateComplete,
      ),
    );
    const buttons = Array.from(composite.querySelectorAll('button'));
    buttons[0]?.focus();
    buttons[0]?.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'ArrowRight'}),
    );

    expect(composite).toBeInstanceOf(FloatingCompositeElement);
    expect(document.activeElement).toBe(buttons[1]);
  });

  test('renders an arrow component with an SVG contract', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <button slot="reference">Reference</button>
      <section slot="floating">
        Floating
        <floating-arrow width="18" height="9"></floating-arrow>
      </section>
    `;
    document.body.append(root);
    await root.updateComplete;
    const arrow = root.querySelector('floating-arrow');
    await arrow?.updateComplete;

    expect(arrow).toBeInstanceOf(FloatingArrowElement);
    expect(
      arrow?.shadowRoot?.querySelector('svg')?.getAttribute('viewBox'),
    ).toBe('0 0 18 9');
    expect(arrow?.getAttribute('aria-hidden')).toBe('true');
  });
});
