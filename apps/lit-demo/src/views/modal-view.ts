import {html, LitElement} from 'lit';
import '../examples/modal-example';

class LitModalView extends LitElement {
  protected createRenderRoot() { return this; }
  render() { return html`<section class="route-view"><a class="back-link" href="/">← All examples</a><div class="route-copy"><span class="section-kicker">modal route</span><h2>Focus has<br /><span>a boundary.</span></h2></div><lit-modal-example></lit-modal-example></section>`; }
}

customElements.define('lit-modal-view', LitModalView);
