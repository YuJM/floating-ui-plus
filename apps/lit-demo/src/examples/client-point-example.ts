import {html, LitElement, nothing} from 'lit';
import {
  autoUpdate,
  clientPoint,
  dismiss,
  flip,
  FloatingController,
  hover,
  offset,
  role,
  shift,
} from '@floating-ui/lit';

class LitClientPointExample extends LitElement {
  static properties = {open: {state: true}};
  open = false;

  private readonly floating = new FloatingController(this, () => ({
    open: this.open,
    onOpenChange: (open) => {
      this.open = open;
      this.emitAction(open ? 'Cursor reference is now tracking the pointer' : 'Cursor reference released');
    },
    placement: 'top',
    middleware: [offset(16), flip(), shift({padding: 18})],
    whileElementsMounted: autoUpdate,
  })).pipe(
    hover({move: true}),
    clientPoint(),
    dismiss(),
    role({role: 'tooltip'}),
  );

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <article class="demo-card client-point-card">
        <div class="card-top"><span class="number">D</span><span class="chip">virtual reference</span></div>
        <h3>Cursor signal</h3>
        <p>Move across the field. A virtual reference follows the pointer instead of the whole element.</p>
        <div class="card-action">
          <div class="cursor-field" tabindex="0" ${this.floating.reference()}>
            <span>Move here</span><i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>
          </div>
          ${this.open
            ? html`<div class="cursor-tooltip" ${this.floating.floating()}>Pointer is the <b>reference</b></div>`
            : nothing}
        </div>
        <code>hover() → clientPoint() → dismiss()</code>
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

customElements.define('lit-client-point-example', LitClientPointExample);
