import {html, LitElement} from 'lit';
import '../examples/nested-menu-example';

class LitNestedMenuView extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <section class="route-view">
        <a class="back-link" href="/">← All examples</a>
        <div class="route-copy">
          <span class="section-kicker">floating tree route</span>
          <h2>Menus that know<br /><span>their descendants.</span></h2>
        </div>
        <lit-nested-menu-example></lit-nested-menu-example>
      </section>
    `;
  }
}

customElements.define('lit-nested-menu-view', LitNestedMenuView);
