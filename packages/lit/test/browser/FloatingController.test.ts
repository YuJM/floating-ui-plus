import {fireEvent} from '@testing-library/dom';
import {html, LitElement, nothing} from 'lit';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {click, dismiss, FloatingController, role} from '../../src';

const tag = 'floating-ui-lit-test';

class FloatingUiLitTest extends LitElement {
  static properties = {
    open: {state: true},
  };

  open = false;

  floating = new FloatingController(this, () => ({
    open: this.open,
    onOpenChange: (open) => {
      this.open = open;
    },
  })).pipe(click(), dismiss(), role({role: 'dialog'}));

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <button ${this.floating.reference()}>Open</button>
      ${this.open
        ? html`<div
            class="consumer-class"
            style="color: red"
            ${this.floating.floating()}
          >
            Content
          </div>`
        : nothing}
    `;
  }
}

if (!customElements.get(tag)) {
  customElements.define(tag, FloatingUiLitTest);
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('FloatingController', () => {
  test('preserves a virtual position reference across a Lit re-render', async () => {
    class VirtualReferenceFixture extends LitElement {
      static properties = {tick: {state: true}};
      tick = 0;
      floating = new FloatingController(this, {open: true});

      protected createRenderRoot() {
        return this;
      }

      render() {
        return html`
          <button ${this.floating.reference()}>Reference ${this.tick}</button>
          <div ${this.floating.floating()}>Floating</div>
        `;
      }
    }
    const virtualTag = 'floating-ui-lit-virtual-reference-test';
    if (!customElements.get(virtualTag)) {
      customElements.define(virtualTag, VirtualReferenceFixture);
    }
    const host = document.createElement(virtualTag) as VirtualReferenceFixture;
    document.body.append(host);
    await host.updateComplete;

    const virtualReference = {
      contextElement: host.querySelector('button')!,
      getBoundingClientRect: () => DOMRect.fromRect({x: 80, y: 40}),
    };
    host.floating.setPositionReference(virtualReference);
    host.tick++;
    await host.updateComplete;

    expect(host.floating.elements.reference).toBe(virtualReference);
  });

  test('binds Light DOM elements without replacing user class or style', async () => {
    const host = document.createElement(tag) as FloatingUiLitTest;
    document.body.append(host);
    await host.updateComplete;
    const button = host.querySelector('button')!;

    fireEvent.click(button);
    await host.updateComplete;

    const floating = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(host.shadowRoot).toBeNull();
    expect(floating.className).toBe('consumer-class');
    expect(floating.style.color).toBe('red');
    expect(floating.style.position).toBe('absolute');
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  test('renders portal content in a controller-owned portal node', async () => {
    class PortalFixture extends LitElement {
      floating = new FloatingController(this, {open: true});

      protected createRenderRoot() {
        return this;
      }

      render() {
        return html`${this.floating.portal(html`<p>Portaled</p>`)}`;
      }
    }
    const portalTag = 'floating-ui-lit-portal-test';
    if (!customElements.get(portalTag)) {
      customElements.define(portalTag, PortalFixture);
    }
    const host = document.createElement(portalTag) as PortalFixture;
    document.body.append(host);
    await host.updateComplete;

    expect(
      document.querySelector('[data-floating-ui-portal] p')?.textContent,
    ).toBe('Portaled');
  });

  test('registers item directives in DOM order', async () => {
    class ListFixture extends LitElement {
      floating = new FloatingController(this, {open: true});

      protected createRenderRoot() {
        return this;
      }

      render() {
        return html`
          <button ${this.floating.item({label: 'First', value: 1})}>
            First
          </button>
          <button ${this.floating.item({label: 'Second', value: 2})}>
            Second
          </button>
        `;
      }
    }
    const listTag = 'floating-ui-lit-list-test';
    if (!customElements.get(listTag)) {
      customElements.define(listTag, ListFixture);
    }
    const host = document.createElement(listTag) as ListFixture;
    document.body.append(host);
    await host.updateComplete;

    expect(host.floating.list.items.map((item) => item.label)).toEqual([
      'First',
      'Second',
    ]);
  });

  test('warns when a host renders into Shadow DOM', async () => {
    class ShadowFixture extends LitElement {
      floating = new FloatingController(this, {open: false});
    }
    const shadowTag = 'floating-ui-lit-shadow-warning-test';
    if (!customElements.get(shadowTag)) {
      customElements.define(shadowTag, ShadowFixture);
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const host = document.createElement(shadowTag);
    document.body.append(host);
    await (host as ShadowFixture).updateComplete;

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('supports Light DOM only'),
    );
    warn.mockRestore();
  });
});
