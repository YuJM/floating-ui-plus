import {html, LitElement} from 'lit';

import '../examples/menu-example';
import '../examples/nested-menu-example';
import '../examples/modal-example';
import '../examples/popover-example';
import '../examples/tooltip-example';
import '../examples/client-point-example';

class LitHomeView extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <section class="hero-stage" aria-labelledby="stage-title">
        <div class="stage-grid"></div>
        <div class="stage-copy">
          <span class="section-kicker">01 / observe</span>
          <h2 id="stage-title">The DOM is<br /><span>the canvas.</span></h2>
          <p>Each card is an independent Lit component with a Light DOM render root and its own FloatingController pipeline.</p>
        </div>
        <div class="signal-orbit" aria-hidden="true">
          <span class="orbit-ring ring-one"></span><span class="orbit-ring ring-two"></span>
          <span class="orbit-dot dot-a"></span><span class="orbit-dot dot-b"></span><span class="orbit-dot dot-c"></span><span class="orbit-core"></span>
        </div>
        <div class="stage-readout"><span>ROUTE MAP</span><strong>/ · /examples/:primitive</strong></div>
      </section>
      <section class="demo-grid" aria-label="Lit interaction examples">
        <lit-tooltip-example></lit-tooltip-example>
        <lit-popover-example></lit-popover-example>
        <lit-menu-example></lit-menu-example>
        <lit-nested-menu-example></lit-nested-menu-example>
        <lit-client-point-example></lit-client-point-example>
      </section>
      <lit-modal-example></lit-modal-example>
    `;
  }
}

customElements.define('lit-home-view', LitHomeView);
