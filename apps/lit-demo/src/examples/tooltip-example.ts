import {html, LitElement} from 'lit';
import {styleMap} from 'lit/directives/style-map.js';
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
  private readonly transitionStyles = {
    duration: {open: 120, close: 180},
    initial: {opacity: '0'},
    open: {opacity: '1'},
    close: {opacity: '0'},
    common: {transition: 'opacity 180ms ease'},
  };

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
          ${this.floating.transition(
            this.open,
            ({status, styles}) => html`
              <div
                class="tooltip"
                data-placement=${this.floating.position.placement}
                data-transition-status=${status}
                style=${styleMap(styles)}
                ${this.floating.floating()}
              >
                Positioned by <b>autoUpdate</b>
              </div>
            `,
            this.transitionStyles,
          )}
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
