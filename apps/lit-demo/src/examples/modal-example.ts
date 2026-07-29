import {html, LitElement, nothing} from 'lit';
import {
  autoUpdate,
  click,
  dismiss,
  FloatingController,
  floatingOverlay,
  focusManager,
  offset,
  role,
  shift,
} from '@floating-ui-plus/lit';

class LitModalExample extends LitElement {
  static properties = {open: {state: true}};
  open = false;

  private readonly floating = new FloatingController(this, () => ({
    open: this.open,
    onOpenChange: (open) => {
      this.open = open;
      this.emitAction(open ? 'Modal trap activated' : 'Modal closed and focus restored');
    },
    placement: 'bottom',
    middleware: [offset(20), shift({padding: 24})],
    whileElementsMounted: autoUpdate,
  })).pipe(click(), dismiss(), role({role: 'dialog'}), focusManager({
    modal: true,
    initialFocus: 0,
    returnFocus: true,
    outsideElementsInert: true,
  }));

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <section class="modal-strip" aria-labelledby="modal-title">
        <div>
          <span class="section-kicker">02 / contain</span>
          <h2 id="modal-title">A modal should<br /><span>make space.</span></h2>
        </div>
        <p>Open this one to feel the shared document trap stack, initial focus, inert neighbors, and focus restoration.</p>
        <button class="outline-button" ${this.floating.reference()}>Enter focus room <span aria-hidden="true">→</span></button>
        ${this.open
          ? this.floating.portal(floatingOverlay(html`
              <div class="modal-anchor">
                <section class="modal-panel" aria-labelledby="modal-heading" ${this.floating.floating()}>
                  <span class="panel-kicker">FOCUS ROOM / PRIVATE</span>
                  <h3 id="modal-heading">You are inside<br />the focus trap.</h3>
                  <p>Press Escape or choose leave. Focus returns to the trigger because the close reason is known.</p>
                  <div class="modal-actions">
                    <button class="coral-button" @click=${(event: Event) => this.floating.context.onOpenChange(false, event, 'click')}>Leave room</button>
                    <span class="modal-hint">ESC to dismiss</span>
                  </div>
                </section>
              </div>
            `, {lockScroll: true, className: 'demo-overlay'}))
          : nothing}
      </section>
    `;
  }

  private emitAction(message: string) {
    this.dispatchEvent(new CustomEvent('floating-demo-action', {
      detail: message,
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('lit-modal-example', LitModalExample);
