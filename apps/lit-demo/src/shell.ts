import {Router} from '@lit-labs/router';
import {html, LitElement} from 'lit';
import type {RouteConfig} from '@lit-labs/router/routes.js';

const routes: RouteConfig[] = [
  {
    path: '/',
    enter: async () => {
      await import('./views/home-view');
      return true;
    },
    render: () => html`<lit-home-view></lit-home-view>`,
  },
  {
    path: '/examples/tooltip',
    enter: async () => {
      await import('./views/tooltip-view');
      return true;
    },
    render: () => html`<lit-tooltip-view></lit-tooltip-view>`,
  },
  {
    path: '/examples/popover',
    enter: async () => {
      await import('./views/popover-view');
      return true;
    },
    render: () => html`<lit-popover-view></lit-popover-view>`,
  },
  {
    path: '/examples/menu',
    enter: async () => {
      await import('./views/menu-view');
      return true;
    },
    render: () => html`<lit-menu-view></lit-menu-view>`,
  },
  {
    path: '/examples/nested-menu',
    enter: async () => {
      await import('./views/nested-menu-view');
      return true;
    },
    render: () => html`<lit-nested-menu-view></lit-nested-menu-view>`,
  },
  {
    path: '/examples/client-point',
    enter: async () => {
      await import('./views/client-point-view');
      return true;
    },
    render: () => html`<lit-client-point-view></lit-client-point-view>`,
  },
  {
    path: '/examples/hide',
    enter: async () => {
      window.history.replaceState(
        window.history.state,
        '',
        '/examples/middleware#hide',
      );
      await import('./views/middleware-view');
      return true;
    },
    render: () => html`<lit-middleware-view></lit-middleware-view>`,
  },
  {
    path: '/examples/middleware',
    enter: async () => {
      await import('./views/middleware-view');
      return true;
    },
    render: () => html`<lit-middleware-view></lit-middleware-view>`,
  },
  {
    path: '/examples/modal',
    enter: async () => {
      await import('./views/modal-view');
      return true;
    },
    render: () => html`<lit-modal-view></lit-modal-view>`,
  },
  {
    path: '/*',
    render: () => html`
      <section class="route-view" aria-labelledby="not-found-title">
        <p class="eyebrow">404 / route not found</p>
        <h2 id="not-found-title">That example is not in this lab.</h2>
        <p>Choose an available interaction example from the navigation.</p>
        <a class="button-primary" href="/">Return to all examples</a>
      </section>
    `,
  },
];

class FloatingUiDemo extends LitElement {
  static properties = {lastAction: {state: true}};
  lastAction = 'Choose an example route';
  private router = new Router(this, routes);

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <header class="masthead">
        <div class="eyebrow"><span class="pulse"></span> floating-ui-plus / lit demo</div>
        <div class="header-row">
          <div>
            <a class="brand-link" href="/" aria-label="Floating UI Plus home"><h1>Floating UI<br /><em>Plus</em></h1></a>
            <p class="lede">Framework-neutral interactions and positioning,<br />with Light DOM bindings for Lit.</p>
          </div>
          <div class="coordinate-stamp" aria-label="Current demo status">
            <span class="stamp-label">LIVE SIGNAL</span>
            <strong>04</strong>
            <span class="stamp-caption">@floating-ui-plus/web + @floating-ui-plus/lit</span>
          </div>
        </div>
        <nav class="route-nav" aria-label="Demo routes">
          <a href="/">All examples</a>
          <a href="/examples/tooltip">Tooltip</a>
          <a href="/examples/popover">Popover</a>
          <a href="/examples/menu">Menu</a>
          <a href="/examples/nested-menu">Nested menu</a>
          <a href="/examples/client-point">Cursor</a>
          <a href="/examples/middleware">Middleware</a>
          <a href="/examples/modal">Modal</a>
        </nav>
      </header>
      <main @floating-demo-action=${this.handleAction}>${this.router.outlet()}</main>
      <footer class="footer">
        <span>floating-ui-plus</span><span>@floating-ui-plus/web / @floating-ui-plus/lit / lit 3</span><span class="footer-status"><i></i> ${this.lastAction}</span>
      </footer>
    `;
  }

  private handleAction(event: CustomEvent<string>) {
    this.lastAction = event.detail;
  }
}

customElements.define('floating-ui-demo', FloatingUiDemo);
