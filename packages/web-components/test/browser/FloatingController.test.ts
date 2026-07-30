import {fireEvent} from '@testing-library/dom';
import {html, LitElement, nothing} from 'lit';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  click,
  clientPoint,
  DelayGroup,
  dismiss,
  FloatingController,
  FloatingTree,
  FLOATING_UI_PLUS_PORTAL_ATTRIBUTE,
  hover,
  requestFloatingContext,
  role,
} from '../../src/legacy';
import type {FloatingPlugin} from '../../src';

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
  test('keeps a client point reference through open, move, and close renders', async () => {
    class ClientPointFixture extends LitElement {
      static properties = {
        open: {state: true},
        pointerLabel: {state: true},
      };
      open = false;
      pointerLabel = 'Awaiting pointer';
      floating = new FloatingController(this, () => ({
        open: this.open,
        onOpenChange: (open) => {
          this.open = open;
        },
      })).pipe(
        hover({move: true}),
        clientPoint(),
        role({role: 'tooltip'}),
      );

      protected createRenderRoot() {
        return this;
      }

      render() {
        return html`
          <div
            class="client-point-reference"
            ${this.floating.reference()}
            @mousemove=${(event: MouseEvent) => {
              this.pointerLabel = `${event.clientX}:${event.clientY}`;
            }}
          >
            ${this.pointerLabel}
          </div>
          ${this.open
            ? html`<div class="client-point-floating" ${this.floating.floating()}>
                Pointer
              </div>`
            : nothing}
        `;
      }
    }

    const clientPointTag = 'floating-ui-lit-client-point-test';
    if (!customElements.get(clientPointTag)) {
      customElements.define(clientPointTag, ClientPointFixture);
    }
    const host = document.createElement(
      clientPointTag,
    ) as ClientPointFixture;
    document.body.append(host);
    await host.updateComplete;
    const reference = host.querySelector<HTMLElement>(
      '.client-point-reference',
    )!;

    fireEvent.mouseEnter(reference, {clientX: 40, clientY: 30});
    await host.updateComplete;
    expect(host.open).toBe(true);
    expect(host.querySelector('.client-point-floating')).not.toBeNull();

    fireEvent.mouseMove(reference, {clientX: 90, clientY: 70});
    await host.updateComplete;
    expect(host.floating.elements.reference?.getBoundingClientRect().x).toBe(
      90,
    );
    expect(host.floating.elements.reference?.getBoundingClientRect().y).toBe(
      70,
    );

    fireEvent.mouseLeave(reference);
    await host.updateComplete;
    expect(host.open).toBe(false);
    expect(host.querySelector('.client-point-floating')).toBeNull();
  });

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

  test('keeps stable element bindings connected across a Lit re-render', async () => {
    let connections = 0;
    let cleanups = 0;
    const connectionCounter: FloatingPlugin = {
      connect() {
        connections++;
        return () => {
          cleanups++;
        };
      },
    };

    class StableBindingFixture extends LitElement {
      static properties = {tick: {state: true}};
      tick = 0;
      floating = new FloatingController(this, {open: true}).pipe(
        connectionCounter,
      );

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

    const stableTag = 'floating-ui-lit-stable-binding-test';
    if (!customElements.get(stableTag)) {
      customElements.define(stableTag, StableBindingFixture);
    }
    const host = document.createElement(stableTag) as StableBindingFixture;
    document.body.append(host);
    await host.updateComplete;
    const mountedConnections = connections;
    const mountedCleanups = cleanups;

    host.tick++;
    await host.updateComplete;

    expect(connections).toBe(mountedConnections);
    expect(cleanups).toBe(mountedCleanups);
  });

  test('mounts positioning observers after Light DOM elements are connected', async () => {
    let mountedWithConnectedElements = false;

    class ConnectedMountFixture extends LitElement {
      floating = new FloatingController(this, {
        open: true,
        whileElementsMounted(reference, floating, update) {
          mountedWithConnectedElements =
            reference instanceof Element &&
            reference.isConnected &&
            floating.isConnected;
          void update();
          return () => {};
        },
      });

      protected createRenderRoot() {
        return this;
      }

      render() {
        return html`
          <div class="overflow-stage">
            <button ${this.floating.reference()}>Reference</button>
            <div ${this.floating.floating()}>Floating</div>
          </div>
        `;
      }
    }

    const connectedMountTag = 'floating-ui-lit-connected-mount-test';
    if (!customElements.get(connectedMountTag)) {
      customElements.define(connectedMountTag, ConnectedMountFixture);
    }
    const host = document.createElement(
      connectedMountTag,
    ) as ConnectedMountFixture;
    document.body.append(host);
    await host.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mountedWithConnectedElements).toBe(true);
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
      document.querySelector(`[${FLOATING_UI_PLUS_PORTAL_ATTRIBUTE}] p`)
        ?.textContent,
    ).toBe('Portaled');
  });

  test('refreshes a deferred portal root and reconnects its directive', async () => {
    class DeferredPortalFixture extends LitElement {
      floating = new FloatingController(this, {open: true});
      portalRoot: HTMLElement | null = null;

      protected createRenderRoot() {
        return this;
      }

      render() {
        return html`${this.floating.portal(
          html`<p data-testid="deferred-portal">Deferred</p>`,
          {root: () => this.portalRoot},
        )}`;
      }
    }
    const deferredPortalTag = 'floating-ui-lit-deferred-portal-test';
    if (!customElements.get(deferredPortalTag)) {
      customElements.define(deferredPortalTag, DeferredPortalFixture);
    }
    const host = document.createElement(
      deferredPortalTag,
    ) as DeferredPortalFixture;
    document.body.append(host);
    await host.updateComplete;
    expect(document.querySelector('[data-testid="deferred-portal"]')).toBeNull();

    const root = document.createElement('section');
    document.body.append(root);
    host.portalRoot = root;
    host.requestUpdate();
    await host.updateComplete;
    expect(root.querySelector('[data-testid="deferred-portal"]')).not.toBeNull();

    host.remove();
    await Promise.resolve();
    expect(root.querySelector('[data-testid="deferred-portal"]')).toBeNull();

    document.body.append(host);
    await host.updateComplete;
    expect(root.querySelector('[data-testid="deferred-portal"]')).not.toBeNull();
  });

  test('bridges controller-provided context into portal descendants', async () => {
    const consumerTag = 'floating-ui-lit-context-consumer-test';
    class ContextConsumer extends HTMLElement {
      value: string | undefined;

      connectedCallback() {
        this.value = requestFloatingContext<string>(this, 'demo-theme');
        this.textContent = this.value ?? 'missing';
      }
    }
    if (!customElements.get(consumerTag)) {
      customElements.define(consumerTag, ContextConsumer);
    }

    class PortalContextFixture extends LitElement {
      floating = new FloatingController(this, {open: true}).provideContext(
        'demo-theme',
        'night',
      );

      protected createRenderRoot() {
        return this;
      }

      render() {
        return html`${this.floating.portal(
          html`<floating-ui-lit-context-consumer-test />`,
        )}`;
      }
    }
    const contextTag = 'floating-ui-lit-portal-context-test';
    if (!customElements.get(contextTag)) {
      customElements.define(contextTag, PortalContextFixture);
    }

    const host = document.createElement(contextTag) as PortalContextFixture;
    document.body.append(host);
    await host.updateComplete;

    expect(
      document.querySelector<ContextConsumer>(consumerTag)?.value,
    ).toBe('night');
  });

  test('inherits Web tree coordination through a portaled Lit child', async () => {
    const tree = new FloatingTree();
    class PortaledTreeChild extends LitElement {
      floating = new FloatingController(this, {open: false}).node({
        id: 'portaled-child',
      });

      protected createRenderRoot() {
        return this;
      }
    }
    class PortaledTreeParent extends LitElement {
      floating = new FloatingController(this, {open: false}).node({
        tree,
        id: 'portal-parent',
      });

      protected createRenderRoot() {
        return this;
      }

      render() {
        return this.floating.portal(
          html`<floating-ui-lit-portaled-tree-child-test />`,
        );
      }
    }
    const childTag = 'floating-ui-lit-portaled-tree-child-test';
    const parentTag = 'floating-ui-lit-portaled-tree-parent-test';
    if (!customElements.get(childTag)) {
      customElements.define(childTag, PortaledTreeChild);
    }
    if (!customElements.get(parentTag)) {
      customElements.define(parentTag, PortaledTreeParent);
    }

    const host = document.createElement(parentTag) as PortaledTreeParent;
    document.body.append(host);
    await host.updateComplete;
    await (
      document.querySelector(childTag) as PortaledTreeChild
    ).updateComplete;

    expect(tree.nodes.map(({id, parentId}) => [id, parentId])).toEqual([
      ['portal-parent', null],
      ['portaled-child', 'portal-parent'],
    ]);

    host.remove();
    expect(tree.nodes).toEqual([]);
  });

  test('owns tree registration and cleanup for the host lifecycle', async () => {
    const tree = new FloatingTree();
    class TreeFixture extends LitElement {
      floating = new FloatingController(this, {open: false}).node({
        tree,
        id: 'declarative-node',
      });

      protected createRenderRoot() {
        return this;
      }
    }
    const treeTag = 'floating-ui-lit-tree-lifecycle-test';
    if (!customElements.get(treeTag)) {
      customElements.define(treeTag, TreeFixture);
    }

    const host = document.createElement(treeTag) as TreeFixture;
    document.body.append(host);
    await host.updateComplete;
    expect(tree.nodes.map((node) => node.id)).toEqual(['declarative-node']);

    host.remove();
    expect(tree.nodes).toEqual([]);

    document.body.append(host);
    await host.updateComplete;
    expect(tree.nodes.map((node) => node.id)).toEqual(['declarative-node']);
  });

  test('coordinates open state with a declarative delay group', async () => {
    const group = new DelayGroup();
    class DelayGroupFixture extends LitElement {
      static properties = {open: {state: true}};
      open = false;
      floating = new FloatingController(this, () => ({
        open: this.open,
        onOpenChange: (open) => {
          this.open = open;
        },
      }))
        .delayGroup({group, id: 'tooltip'})
        .pipe(click());

      protected createRenderRoot() {
        return this;
      }

      render() {
        return html`<button ${this.floating.reference()}>Toggle</button>`;
      }
    }
    const groupTag = 'floating-ui-lit-delay-group-test';
    if (!customElements.get(groupTag)) {
      customElements.define(groupTag, DelayGroupFixture);
    }

    const host = document.createElement(groupTag) as DelayGroupFixture;
    document.body.append(host);
    await host.updateComplete;
    fireEvent.click(host.querySelector('button')!);
    await host.updateComplete;

    expect(group.currentId).toBe('tooltip');
    expect(host.floating.context.data.delayGroup).toBe(group);
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
