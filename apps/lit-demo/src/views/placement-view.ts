import {html, LitElement} from 'lit';
import {
  autoUpdate,
  FloatingController,
  offset,
  PLACEMENT,
  PLACEMENTS,
  type Placement,
} from '@floating-ui-plus/lit';

class LitPlacementView extends LitElement {
  static properties = {
    placement: {state: true},
  };

  placement: Placement = PLACEMENT.TOP;

  private floating = new FloatingController(this, () => ({
    open: true,
    placement: this.placement,
    middleware: [offset(18)],
    whileElementsMounted: autoUpdate,
  }));

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <section class="placement-view" aria-labelledby="placement-title">
        <div class="placement-copy">
          <a class="back-link" href="/">← All examples</a>
          <span class="section-kicker">placement / 12 directions</span>
          <h2 id="placement-title">
            Choose a constant.<br /><span>Watch it move.</span>
          </h2>
          <p>
            Every control passes a typed value from <code>PLACEMENT</code> into
            the Lit controller pipeline.
          </p>
          <div class="placement-readout" aria-live="polite">
            <span>Selected constant</span>
            <strong>
              PLACEMENT.${this.placement.toUpperCase().replace('-', '_')}
            </strong>
            <code>${this.placement}</code>
          </div>
        </div>

        <div class="placement-stage" aria-label="Interactive placement selector">
          ${PLACEMENTS.map(
            (placement) => html`
              <button
                type="button"
                class="placement-control ${placement === this.placement
                  ? 'is-selected'
                  : ''}"
                data-placement-control=${placement}
                aria-pressed=${String(placement === this.placement)}
                aria-label="Place floating element at ${placement}"
                @click=${() => {
                  this.placement = placement;
                }}
              >
                <span aria-hidden="true"></span>
              </button>
            `,
          )}

          <div class="placement-reference" ${this.floating.reference()}>
            Reference
          </div>
          <div
            class="placement-floating"
            data-placement=${this.floating.position.placement}
            role="status"
            ${this.floating.floating()}
          >
            ${this.floating.position.placement}
          </div>
        </div>
      </section>
    `;
  }
}

customElements.define('lit-placement-view', LitPlacementView);
