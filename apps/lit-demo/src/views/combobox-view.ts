import {html, LitElement} from 'lit';

import '../examples/combobox-example';

class LitComboboxView extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <section class="route-view">
        <a class="back-link" href="/">← All examples</a>
        <div class="route-copy">
          <span class="section-kicker">combobox route</span>
          <h2>Search across<br /><span>writing systems.</span></h2>
        </div>
        <lit-combobox-example></lit-combobox-example>
      </section>
    `;
  }
}

customElements.define('lit-combobox-view', LitComboboxView);
