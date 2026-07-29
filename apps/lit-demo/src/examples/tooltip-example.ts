import {html, LitElement, nothing} from 'lit';
import {
  autoUpdate,
  dismiss,
  flip,
  FloatingController,
  focus,
  hover,
  offset,
  role,
  safePolygon,
  shift,
} from '@floating-ui-plus/lit';

class LitTooltipExample extends LitElement {
  static properties = {open: {state: true}};
  open = false;

  private readonly floating = new FloatingController(this, () => ({
    open: this.open,
    onOpenChange: (open) => {
      this.open = open;
      this.emitAction(open ? 'Tooltip opened from pointer or focus' : 'Tooltip closed');
    },
    placement: 'top',
    middleware: [offset(14), flip(), shift({padding: 12})],
    whileElementsMounted: autoUpdate,
  })).pipe(
    hover({handleClose: safePolygon({buffer: 4})}),
    focus(),
    dismiss(),
    role({role: 'tooltip'}),
  );

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <article class="demo-card tooltip-card">
        <div class="card-top"><span class="number">A</span><span class="chip">hover + focus</span></div>
        <h3>Signal tooltip</h3>
        <p>One pipeline wires pointer intent, keyboard focus, dismissal, and descriptive ARIA.</p>
        <div class="card-action">
          <button class="ink-button" ${this.floating.reference()}>Inspect signal <span aria-hidden="true">↗</span></button>
          ${this.open
            ? html`<div
                class="tooltip"
                data-placement=${this.floating.position.placement}
                ${this.floating.floating()}
              >
                Positioned by <b>autoUpdate</b>
              </div>`
            : nothing}
        </div>
        <code>hover({handleClose: safePolygon()}) → focus() → dismiss()</code>
      </article>
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

customElements.define('lit-tooltip-example', LitTooltipExample);
