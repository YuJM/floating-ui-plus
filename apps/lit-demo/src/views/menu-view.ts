import {html, LitElement} from 'lit';
import '../examples/menu-example';

class LitMenuView extends LitElement {
  protected createRenderRoot() { return this; }
  render() { return html`<section class="route-view"><a class="back-link" href="/">← All examples</a><div class="route-copy"><span class="section-kicker">menu route</span><h2>Roving focus,<br /><span>one registry.</span></h2></div><lit-menu-example></lit-menu-example></section>`; }
}

customElements.define('lit-menu-view', LitMenuView);
