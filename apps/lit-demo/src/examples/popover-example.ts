import {html, LitElement, nothing} from 'lit';
import {
  autoUpdate,
  click,
  dismiss,
  flip,
  FloatingController,
  focusManager,
  offset,
  role,
  shift,
} from '@floating-ui-plus/lit';

class LitPopoverExample extends LitElement {
  static properties = {open: {state: true}};
  open = false;

  private readonly floating = new FloatingController(this, () => ({
    open: this.open,
    onOpenChange: (open) => {
      this.open = open;
      this.emitAction(open ? 'Popover opened through a body portal' : 'Popover dismissed');
    },
    placement: 'bottom-start',
    middleware: [offset(12), flip(), shift({padding: 18})],
    whileElementsMounted: autoUpdate,
  })).pipe(click(), dismiss(), role({role: 'dialog'}), focusManager({
    modal: false,
    initialFocus: -1,
    returnFocus: true,
  }));

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <article class="demo-card popover-card">
        <div class="card-top"><span class="number">B</span><span class="chip">portal + light DOM</span></div>
        <h3>Anchored popover</h3>
        <p>The panel is rendered through a portal, while its controller keeps the relationship intact.</p>
        <div class="card-action">
          <button class="coral-button" ${this.floating.reference()}>Open coordinates <span aria-hidden="true">＋</span></button>
          ${this.open
            ? this.floating.portal(html`
                <div class="popover-panel" ${this.floating.floating()}>
                  <span class="panel-kicker">REFERENCE / 42.8°</span>
                  <strong>Portal, still connected.</strong>
                  <p>ARIA and outside-press behavior follow the controller, even after moving to body.</p>
                  <button class="text-button" @click=${(event: Event) => this.floating.context.onOpenChange(false, event, 'click')}>Close panel</button>
                </div>
              `)
            : nothing}
        </div>
        <code>click() → dismiss() → portal()</code>
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

customElements.define('lit-popover-example', LitPopoverExample);
