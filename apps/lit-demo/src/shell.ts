import {html, LitElement} from 'lit';

class FloatingUiDemo extends LitElement {
  static properties = {lastAction: {state: true}};
  lastAction = 'Choose an example route';

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <header class="masthead">
        <div class="eyebrow"><span class="pulse"></span> floating-ui / lit adapter</div>
        <div class="header-row">
          <div>
            <a class="brand-link" href="/" aria-label="Interaction lab home"><h1>Interaction<br /><em>lab</em></h1></a>
            <p class="lede">A Light DOM field guide for things that appear,<br />move, and make room for people.</p>
          </div>
          <div class="coordinate-stamp" aria-label="Current demo status">
            <span class="stamp-label">LIVE SIGNAL</span>
            <strong>04</strong>
            <span class="stamp-caption">Lit examples in orbit</span>
          </div>
        </div>
        <nav class="route-nav" aria-label="Demo routes">
          <a href="/">All examples</a>
          <a href="/examples/tooltip">Tooltip</a>
          <a href="/examples/popover">Popover</a>
          <a href="/examples/menu">Menu</a>
          <a href="/examples/modal">Modal</a>
        </nav>
      </header>
      <main @floating-demo-action=${this.handleAction}><slot></slot></main>
      <footer class="footer">
        <span>floating-ui-plus</span><span>light DOM / native events / lit 3</span><span class="footer-status"><i></i> ${this.lastAction}</span>
      </footer>
    `;
  }

  private handleAction(event: CustomEvent<string>) {
    this.lastAction = event.detail;
  }
}

customElements.define('floating-ui-demo', FloatingUiDemo);
