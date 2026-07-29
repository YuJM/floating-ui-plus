import {html, LitElement} from 'lit';
import '../examples/hide-example';

class LitHideView extends LitElement {
  protected createRenderRoot() { return this; }
  render() { return html`<section class="route-view"><a class="back-link" href="/">← All examples</a><div class="route-copy"><span class="section-kicker">hide middleware route</span><h2>Visible only<br /><span>when connected.</span></h2></div><lit-hide-example></lit-hide-example></section>`; }
}

customElements.define('lit-hide-view', LitHideView);
