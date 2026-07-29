import {html, LitElement} from 'lit';
import '../examples/popover-example';

class LitPopoverView extends LitElement {
  protected createRenderRoot() { return this; }
  render() { return html`<section class="route-view"><a class="back-link" href="/">← All examples</a><div class="route-copy"><span class="section-kicker">popover route</span><h2>Portaled,<br /><span>still connected.</span></h2></div><lit-popover-example></lit-popover-example></section>`; }
}

customElements.define('lit-popover-view', LitPopoverView);
