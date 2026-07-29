import {html, LitElement} from 'lit';
import '../examples/client-point-example';

class LitClientPointView extends LitElement {
  protected createRenderRoot() { return this; }
  render() { return html`<section class="route-view"><a class="back-link" href="/">← All examples</a><div class="route-copy"><span class="section-kicker">client point route</span><h2>A reference<br /><span>without an element.</span></h2></div><lit-client-point-example></lit-client-point-example></section>`; }
}

customElements.define('lit-client-point-view', LitClientPointView);
