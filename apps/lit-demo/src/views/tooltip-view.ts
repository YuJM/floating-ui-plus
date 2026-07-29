import {html, LitElement} from 'lit';
import '../examples/tooltip-example';

class LitTooltipView extends LitElement {
  protected createRenderRoot() { return this; }
  render() { return html`<section class="route-view"><a class="back-link" href="/">← All examples</a><div class="route-copy"><span class="section-kicker">tooltip route</span><h2>Pointer and<br /><span>keyboard intent.</span></h2></div><lit-tooltip-example></lit-tooltip-example></section>`; }
}

customElements.define('lit-tooltip-view', LitTooltipView);
