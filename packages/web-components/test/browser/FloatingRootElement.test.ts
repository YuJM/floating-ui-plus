import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  FLOATING_UI_PLUS_ARROW_ATTRIBUTE,
  FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
  FLOATING_UI_PLUS_CONTENT_ATTRIBUTE,
  FloatingArrowElement,
  FloatingCompositeElement,
  FloatingListElement,
  FloatingPortalElement,
  FloatingReferenceElement,
  FloatingRootElement,
  click,
  offset,
} from '../../src';

afterEach(() => {
  document.body.replaceChildren();
});

describe('FloatingRootElement', () => {
  test('does not register the removed floating-content element', () => {
    expect(customElements.get('floating-content')).toBeUndefined();
  });

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

  test('connects and replaces plugins assigned after the root is connected', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <button slot="reference">Open</button>
      <section slot="floating">Content</section>
    `;
    const button = root.querySelector('button')!;
    document.body.append(root);
    await root.updateComplete;

    root.plugins = [click()];
    await root.updateComplete;
    button.click();
    expect(root.open).toBe(true);

    root.open = false;
    root.plugins = [];
    await root.updateComplete;
    button.click();
    expect(root.open).toBe(false);

    root.interactions = 'click';
    await root.updateComplete;
    button.click();
    expect(root.open).toBe(true);
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

  test('composes a reference with an explicit native content template', async () => {
    const root = document.createElement('floating-root');
    root.interactions = 'click dismiss';
    root.floatingRole = 'dialog';
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <template ${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}>
        <section>Content</section>
      </template>
    `;
    document.body.append(root);
    await root.updateComplete;
    const reference = root.querySelector('floating-reference');
    await reference?.updateComplete;

    expect(reference).toBeInstanceOf(FloatingReferenceElement);
    expect(root.referenceElement).toBe(root.querySelector('button'));
    expect(root.contentTemplate).toBe(root.querySelector('template'));
    expect(root.floatingElement).toBeNull();

    root.querySelector('button')?.click();
    await root.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(root.querySelector('section'));
    });
    expect(root.open).toBe(true);
    expect(root.floatingElement?.getAttribute('role')).toBe('dialog');
  });

  test('uses a native template as an inert conditional blueprint', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <template ${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}>
        <section data-template-panel>
          Content
          <button data-template-action>Action</button>
        </section>
      </template>
    `;
    const template = root.querySelector('template');
    const panel = template?.content.querySelector<HTMLElement>(
      '[data-template-panel]',
    );
    const listener = vi.fn();
    const mountListener = vi.fn((event: Event) => {
      const {element} = (
        event as CustomEvent<{element: HTMLElement}>
      ).detail;
      expect(element.isConnected).toBe(true);
      expect(root.floatingElement).toBeNull();
      element
        .querySelector('[data-template-action]')
        ?.addEventListener('click', listener);
    });
    const unmountListener = vi.fn();
    const unmountConnected: boolean[] = [];
    template?.addEventListener('floatingmount', mountListener);
    template?.addEventListener('floatingunmount', (event) => {
      unmountListener(event);
      unmountConnected.push(
        (
          event as CustomEvent<{
            element: HTMLElement;
          }>
        ).detail.element.isConnected,
      );
      expect(root.floatingElement).toBeNull();
    });

    document.body.append(root);
    await root.updateComplete;

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
    expect(mountListener).toHaveBeenCalledOnce();
    expect(mountListener.mock.calls[0]?.[0].target).toBe(template);
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
    expect(unmountListener).toHaveBeenCalledOnce();
    expect(unmountConnected).toEqual([true]);

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
    expect(mountListener).toHaveBeenCalledTimes(2);
  });

  test('automatically marks a portal template and keeps it inert until open', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-portal>
        <template>
          <section data-template-portal>Portal content</section>
        </template>
      </floating-portal>
    `;
    const template = root.querySelector('template');
    document.body.append(root);
    await root.updateComplete;

    await vi.waitFor(() => {
      expect(document.querySelector('floating-portal-target')).not.toBeNull();
      expect(template?.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE)).toBe(
        true,
      );
      expect(root.contentTemplate).toBe(template);
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

  test('preserves a mounted clone while its portal is enabled or disabled', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Reference</button></floating-reference>
      <floating-portal>
        <template><section data-portable-clone>Portable</section></template>
      </floating-portal>
    `;
    const portal = root.querySelector('floating-portal');
    const template = root.querySelector('template');
    const mounted = vi.fn();
    template?.addEventListener('floatingmount', mounted);
    document.body.append(root);

    await vi.waitFor(() => {
      expect(template?.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE)).toBe(
        true,
      );
      expect(template?.closest('floating-portal-target')).not.toBeNull();
    });
    root.open = true;
    await root.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(
        document.querySelector('[data-portable-clone]'),
      );
      expect(
        root.floatingElement?.closest('floating-portal-target'),
      ).not.toBeNull();
    });
    const clone = root.floatingElement;
    portal!.disabled = true;
    await portal?.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(clone);
      expect(clone?.closest('floating-root')).toBe(root);
    });

    portal!.disabled = false;
    await portal?.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(clone);
      expect(clone?.closest('floating-portal-target')).not.toBeNull();
    });
    expect(mounted).toHaveBeenCalledOnce();
  });

  test('preserves a mounted clone while its portal target changes', async () => {
    const firstTarget = document.createElement('div');
    const secondTarget = document.createElement('div');
    document.body.append(firstTarget, secondTarget);

    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <floating-reference><button>Reference</button></floating-reference>
      <floating-portal>
        <template><section data-target-clone>Targeted</section></template>
      </floating-portal>
    `;
    const portal = root.querySelector('floating-portal')!;
    const template = root.querySelector('template');
    const mounted = vi.fn();
    template?.addEventListener('floatingmount', mounted);
    portal.target = firstTarget;
    document.body.append(root);

    await vi.waitFor(() => {
      expect(root.contentTemplate).toBe(template);
      expect(root.floatingElement).toBe(
        firstTarget.querySelector('[data-target-clone]'),
      );
    });
    const clone = root.floatingElement;

    portal.target = secondTarget;
    await portal.updateComplete;
    await vi.waitFor(() => {
      expect(root.contentTemplate).toBe(template);
      expect(root.floatingElement).toBe(clone);
      expect(secondTarget.querySelector('[data-target-clone]')).toBe(clone);
    });
    expect(firstTarget.querySelector('[data-target-clone]')).toBeNull();
    expect(mounted).toHaveBeenCalledOnce();
  });

  test('remounts an open template after its document fragment changes', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <template ${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}>
        <section data-fragment-version="first">First</section>
      </template>
    `;
    const template = root.querySelector('template');
    const mounted = vi.fn();
    template?.addEventListener('floatingmount', mounted);
    document.body.append(root);

    await vi.waitFor(() => {
      expect(root.floatingElement?.dataset.fragmentVersion).toBe('first');
    });
    const first = root.floatingElement;
    const replacement = document.createElement('section');
    replacement.dataset.fragmentVersion = 'second';
    replacement.textContent = 'Second';
    template?.content.replaceChildren(replacement);

    await vi.waitFor(() => {
      expect(root.floatingElement?.dataset.fragmentVersion).toBe('second');
      expect(root.floatingElement).not.toBe(first);
    });
    expect(first?.isConnected).toBe(false);
    expect(mounted).toHaveBeenCalledTimes(2);
  });

  test('finds the unique portal template through structural components', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-portal>
        <floating-overlay>
          <floating-focus-manager>
            <template>
              <section data-structured-template>Dialog</section>
            </template>
          </floating-focus-manager>
        </floating-overlay>
      </floating-portal>
    `;
    const template = root.querySelector('template');
    document.body.append(root);

    await vi.waitFor(() => {
      expect(template?.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE)).toBe(
        true,
      );
      expect(root.contentTemplate).toBe(template);
    });
    expect(document.querySelector('[data-structured-template]')).toBeNull();
  });

  test('excludes templates owned by a nested floating root', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-portal>
        <template><section>Parent</section></template>
        <floating-root>
          <template ${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}>
            <section>Child</section>
          </template>
        </floating-root>
      </floating-portal>
    `;
    const templates = Array.from(root.querySelectorAll('template'));
    const childRoot = root.querySelector('floating-root');
    document.body.append(root);

    await vi.waitFor(() => {
      expect(
        templates[0]?.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE),
      ).toBe(true);
      expect(childRoot?.contentTemplate).toBe(templates[1]);
    });
    expect(root.contentTemplate).toBe(templates[0]);
    expect(
      templates[1]?.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE),
    ).toBe(true);
  });

  test('excludes a nested portal template from its parent portal', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-portal>
        <floating-portal>
          <template><section data-nested-portal-template>Nested</section></template>
        </floating-portal>
      </floating-portal>
    `;
    const template = root.querySelector('template');
    document.body.append(root);

    await vi.waitFor(() => {
      expect(template?.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE)).toBe(
        true,
      );
      expect(root.contentTemplate).toBe(template);
    });
    expect(
      document.querySelectorAll(
        `template[${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}]`,
      ),
    ).toHaveLength(1);
    expect(document.querySelector('[data-nested-portal-template]')).toBeNull();
  });

  test('requires an explicit marker when a portal owns multiple templates', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-portal>
        <template><section data-first-template>First</section></template>
        <template><section data-second-template>Second</section></template>
      </floating-portal>
    `;
    const templates = Array.from(root.querySelectorAll('template'));
    document.body.append(root);

    await vi.waitFor(() => {
      expect(warning).toHaveBeenCalled();
    });
    expect(
      templates.some((template) =>
        template.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE),
      ),
    ).toBe(false);
    expect(root.contentTemplate).toBeNull();

    templates[1]?.setAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE, '');
    root.open = true;
    await vi.waitFor(() => {
      expect(root.contentTemplate).toBe(templates[1]);
      expect(root.floatingElement).toBe(
        document.querySelector('[data-second-template]'),
      );
    });
    expect(document.querySelector('[data-first-template]')).toBeNull();
    warning.mockRestore();
  });

  test('removes only an automatically injected marker after ownership changes', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-portal>
        <template><section>Automatic</section></template>
      </floating-portal>
    `;
    const portal = root.querySelector('floating-portal');
    const automatic = portal?.querySelector('template');
    document.body.append(root);

    await vi.waitFor(() => {
      expect(
        automatic?.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE),
      ).toBe(true);
    });
    root.append(automatic!);
    await vi.waitFor(() => {
      expect(
        automatic?.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE),
      ).toBe(false);
    });

    const explicit = document.createElement('template');
    explicit.setAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE, '');
    explicit.innerHTML = '<section>Explicit</section>';
    portal?.append(explicit);
    await new Promise((resolve) => setTimeout(resolve, 0));
    root.append(explicit);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(explicit?.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE)).toBe(
      true,
    );
  });

  test('prioritizes a manual surface, then a named slot, then a template', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <section slot="floating" data-slotted-surface>Slotted</section>
      <template ${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}>
        <section data-template-surface>Template</section>
      </template>
    `;
    document.body.append(root);
    await root.updateComplete;

    expect(root.floatingElement).toBe(
      root.querySelector('[data-slotted-surface]'),
    );
    expect(document.querySelector('[data-template-surface]')).toBeNull();

    const manual = document.createElement('section');
    manual.dataset.manualSurface = '';
    document.body.append(manual);
    root.setFloatingElement(manual);
    expect(root.floatingElement).toBe(manual);

    root.setFloatingElement(null);
    expect(root.floatingElement).toBe(
      root.querySelector('[data-slotted-surface]'),
    );

    root.querySelector('[data-slotted-surface]')?.remove();
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(
        root.querySelector('[data-template-surface]'),
      );
    });
  });

  test('warns and stays unmounted for an invalid template fragment', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <template ${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}>
        <section>First</section>
        <section>Second</section>
      </template>
    `;
    document.body.append(root);

    await vi.waitFor(() => {
      expect(warning).toHaveBeenCalled();
    });
    expect(root.floatingElement).toBeNull();
    warning.mockRestore();
  });

  test('waits for root context and binds portal template content only when open', async () => {
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
      '<template><section>Ready while closed</section></template>';
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
      expect(target?.querySelector('template')).not.toBeNull();
    });
    expect(root.open).toBe(false);
    expect(root.floatingElement).toBeNull();
    expect(document.querySelector('floating-portal-target section')).toBeNull();

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
    root.open = true;
    root.innerHTML = `
      <floating-reference><button>Reference</button></floating-reference>
      <floating-portal>
        <template>
          <section data-parent-content>
            <floating-portal>
              <div data-child-content>Child</div>
            </floating-portal>
          </section>
        </template>
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
