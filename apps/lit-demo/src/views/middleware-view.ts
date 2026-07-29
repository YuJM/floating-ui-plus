import {html, LitElement} from 'lit';
import '../examples/middleware-examples';

class LitMiddlewareView extends LitElement {
  protected createRenderRoot() { return this; }
  render() {
    return html`
      <section class="middleware-view" aria-labelledby="middleware-title">
        <a class="back-link" href="/">← All examples</a>
        <div class="middleware-intro"><span class="section-kicker">middleware lab</span><h2 id="middleware-title">Position with<br /><span>intent.</span></h2><p>Each card keeps a single FloatingController open so the middleware result remains inspectable.</p></div>
        <section class="middleware-grid" aria-label="Floating UI middleware examples">
          <lit-offset-example></lit-offset-example>
          <lit-shift-example></lit-shift-example>
          <lit-flip-example></lit-flip-example>
          <lit-arrow-example></lit-arrow-example>
          <lit-size-example></lit-size-example>
          <lit-auto-placement-example></lit-auto-placement-example>
          <lit-hide-middleware-example></lit-hide-middleware-example>
          <lit-inline-example></lit-inline-example>
        </section>
      </section>
    `;
  }
}

customElements.define('lit-middleware-view', LitMiddlewareView);
