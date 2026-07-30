import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  FLOATING_UI_PLUS_ARROW_ATTRIBUTE,
  FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
  FloatingArrowElement,
  FloatingCompositeElement,
  FloatingContentElement,
  FloatingListElement,
  FloatingPortalElement,
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
    expect(root.referenceElement?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(root.referenceElement?.getAttribute('aria-expanded')).toBe('true');
    expect(root.floatingElement?.getAttribute('role')).toBe('dialog');
    expect(root.referenceElement?.getAttribute('aria-controls')).toBe(
      root.floatingElement?.id,
    );
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

  test('composes reference and content components through Atomico context', async () => {
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
    expect(root.floatingElement).toBeNull();
    expect(content?.shadowRoot?.querySelector('slot')).toBeNull();

    root.querySelector('button')?.click();
    await root.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(root.querySelector('section'));
      expect(content?.shadowRoot?.querySelector('slot')).not.toBeNull();
    });
    expect(root.open).toBe(true);
    expect(root.floatingElement?.getAttribute('role')).toBe('dialog');
  });

  test('uses a native template as an inert conditional blueprint', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-content>
        <template>
          <section data-template-panel>
            Content
            <button data-template-action>Action</button>
          </section>
        </template>
      </floating-content>
    `;
    const content = root.querySelector('floating-content');
    const template = content?.template;
    const panel = template?.content.querySelector<HTMLElement>(
      '[data-template-panel]',
    );
    const listener = vi.fn();
    content?.addEventListener('click', (event) => {
      if (
        event.target instanceof Element &&
        event.target.matches('[data-template-action]')
      ) {
        listener();
      }
    });

    document.body.append(root);
    await root.updateComplete;
    await content?.updateComplete;

    expect(content).toBeInstanceOf(FloatingContentElement);
    expect(content?.content).toBe(template?.content);
    expect(panel?.isConnected).toBe(false);
    expect(document.querySelector('[data-template-panel]')).toBeNull();
    expect(root.floatingElement).toBeNull();

    root.open = true;
    await root.updateComplete;
    await vi.waitFor(() => {
      const firstPanel = document.querySelector('[data-template-panel]');
      expect(root.floatingElement).toBe(firstPanel);
      expect(firstPanel).not.toBe(panel);
    });
    const firstPanel = document.querySelector('[data-template-panel]');
    firstPanel
      ?.querySelector<HTMLButtonElement>('[data-template-action]')
      ?.click();
    expect(listener).toHaveBeenCalledOnce();

    root.open = false;
    await root.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBeNull();
      expect(panel?.isConnected).toBe(false);
      expect(template?.content.querySelector('[data-template-panel]')).toBe(
        panel,
      );
    });

    root.open = true;
    await root.updateComplete;
    await vi.waitFor(() => {
      const secondPanel = document.querySelector('[data-template-panel]');
      expect(root.floatingElement).toBe(secondPanel);
      expect(secondPanel).not.toBe(firstPanel);
      expect(secondPanel).not.toBe(panel);
    });
    const secondPanel = document.querySelector('[data-template-panel]');
    secondPanel
      ?.querySelector<HTMLButtonElement>('[data-template-action]')
      ?.click();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('keeps template-backed portal content out of the document until open', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-portal>
        <floating-content>
          <template>
            <section data-template-portal>Portal content</section>
          </template>
        </floating-content>
      </floating-portal>
    `;
    document.body.append(root);
    await root.updateComplete;

    await vi.waitFor(() => {
      expect(document.querySelector('floating-portal-target')).not.toBeNull();
    });
    expect(document.querySelector('[data-template-portal]')).toBeNull();
    expect(root.floatingElement).toBeNull();

    root.open = true;
    await root.updateComplete;
    await vi.waitFor(() => {
      const panel = document.querySelector('[data-template-portal]');
      expect(panel).not.toBeNull();
      expect(panel?.closest('floating-portal-target')).not.toBeNull();
      expect(root.floatingElement).toBe(panel);
    });

    root.open = false;
    await root.updateComplete;
    await vi.waitFor(() => {
      expect(document.querySelector('[data-template-portal]')).toBeNull();
      expect(root.floatingElement).toBeNull();
    });
  });

  test('waits for root context and binds direct content only when open', async () => {
    const standaloneParent = document.createElement('div');
    const standalone = document.createElement('floating-portal');
    standalone.innerHTML = '<button>Not ready</button>';
    standaloneParent.append(standalone);
    document.body.append(standaloneParent);
    await standalone.updateComplete;

    expect(standalone.parentElement).toBe(standaloneParent);
    expect(standalone.shadowRoot?.querySelector('slot')?.hidden).toBe(true);
    expect(document.querySelector('floating-portal-target')).toBeNull();

    const root = document.createElement('floating-root');
    root.innerHTML =
      '<floating-reference><button>Reference</button></floating-reference>';
    const portal = document.createElement('floating-portal');
    portal.innerHTML =
      '<floating-content><section>Ready while closed</section></floating-content>';
    root.append(portal);
    document.body.append(root);
    await root.updateComplete;
    await portal.updateComplete;

    await vi.waitFor(() => {
      expect(portal).toBeInstanceOf(FloatingPortalElement);
      expect(portal.parentElement).toBe(root);
      const target = document.body.querySelector(
        'floating-portal-target',
      );
      expect(target?.shadowRoot?.querySelector('slot')).toBeInstanceOf(
        HTMLSlotElement,
      );
      expect(target?.querySelector('floating-content')).not.toBeNull();
    });
    expect(root.open).toBe(false);
    expect(root.floatingElement).toBeNull();
    expect(
      document
        .querySelector('floating-portal-target floating-content')
        ?.shadowRoot?.querySelector('slot'),
    ).toBeNull();

    root.open = true;
    await root.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(
        document.querySelector('floating-portal-target section'),
      );
      expect(root.floatingElement?.hidden).toBe(false);
      expect(root.floatingElement?.getAttribute('role')).toBe('dialog');
    });
  });

  test('appends a nested portal to its logical parent portal', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Reference</button></floating-reference>
      <floating-portal>
        <floating-content>
          <section data-parent-content>
            <floating-portal>
              <div data-child-content>Child</div>
            </floating-portal>
          </section>
        </floating-content>
      </floating-portal>
    `;
    document.body.append(root);
    await root.updateComplete;

    await vi.waitFor(() => {
      const parentContent = document.querySelector('[data-parent-content]');
      const childContent = document.querySelector('[data-child-content]');
      const parentPortal = parentContent?.closest('floating-portal-target');
      const childPortal = childContent?.closest('floating-portal-target');
      expect(parentPortal).not.toBeNull();
      expect(childPortal).not.toBe(parentPortal);
      expect(childPortal?.parentElement).toBe(parentPortal);
      expect(parentPortal?.lastElementChild).toBe(childPortal);
    });
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
    expect(arrow?.shadowRoot?.querySelector('slot')).toBeInstanceOf(
      HTMLSlotElement,
    );
    const path = arrow?.shadowRoot?.querySelector('path');
    if (typeof path?.getBBox === 'function') {
      expect(path.getBBox().width).toBe(18);
    } else {
      expect(path?.getAttribute('d')).toBe('M0 9L9 0L18 9Z');
    }
    expect(arrow?.getAttribute('aria-hidden')).toBe('true');
    expect(arrow?.hasAttribute(FLOATING_UI_PLUS_ARROW_ATTRIBUTE)).toBe(true);
    expect(
      arrow?.getAttribute(FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE),
    ).toBe('9');
  });

  test('updates the arrow side and rotation when placement changes', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <button slot="reference">Reference</button>
      <section slot="floating">
        Floating
        <floating-arrow width="18" height="9" static-offset="-9"></floating-arrow>
      </section>
    `;
    document.body.append(root);
    await root.updateComplete;
    const arrow = root.querySelector('floating-arrow')!;
    await arrow.updateComplete;

    const cases = [
      ['top', 'bottom', 'rotate(180deg)'],
      ['right', 'left', 'rotate(-90deg)'],
      ['bottom', 'top', 'rotate(0deg)'],
      ['left', 'right', 'rotate(90deg)'],
    ] as const;

    for (const [placement, staticSide, transform] of cases) {
      root.placement = placement;
      await root.updateComplete;
      await root.updatePosition();

      await vi.waitFor(() => {
        expect(arrow.style[staticSide]).toBe('-9px');
        expect(arrow.style.transform).toBe(transform);
      });
      for (const side of ['top', 'right', 'bottom', 'left'] as const) {
        if (side !== staticSide) expect(arrow.style[side]).toBe('');
      }
    }
  });
});
