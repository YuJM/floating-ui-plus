import {html, LitElement, nothing} from 'lit';
import {ref} from 'lit/directives/ref.js';
import {
  autoUpdate,
  FloatingController,
  hide,
  offset,
  role,
} from '@floating-ui/lit';

type HideMode = 'attached' | 'escaped';

interface HideData {
  referenceHidden?: boolean;
  escaped?: boolean;
}

class LitHideExample extends LitElement {
  static properties = {mode: {state: true}};
  mode: HideMode = 'attached';

  private viewport: HTMLElement | null = null;
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    placement: 'bottom',
    // The two calls intentionally share one `middlewareData.hide` object.
    // This is the documented way to request both strategies at once.
    middleware: [
      offset(18),
      hide(),
      hide({strategy: 'escaped'}),
    ],
    whileElementsMounted: autoUpdate,
  })).pipe(role({role: 'tooltip'}));

  protected createRenderRoot() {
    return this;
  }

  render() {
    const hideData = this.floating.position.middlewareData.hide as HideData | undefined;
    const referenceHidden = Boolean(hideData?.referenceHidden);
    const escaped = Boolean(hideData?.escaped);

    return html`
      <article class="demo-card hide-card">
        <div class="card-top"><span class="number">E</span><span class="chip">middleware data</span></div>
        <h3>Clipping signal</h3>
        <p>Hide the panel only when the reference is clipped, or dim it once the panel escapes its clipping context.</p>
        <div class="card-action">
          <div class="hide-viewport" ${ref(this.setViewport)}>
            <div class="hide-track">
              <button
                class="hide-reference"
                data-mode=${this.mode}
                ${this.floating.reference()}
              >
                Reference
              </button>
            </div>
          </div>
          ${this.floating.portal(html`
            <div
              class="hide-panel"
              data-reference-hidden=${String(referenceHidden)}
              data-escaped=${String(escaped)}
              ${this.floating.floating()}
            >
              <span>hide()</span>
              <strong>${referenceHidden ? 'Reference clipped' : escaped ? 'Floating escaped' : 'Attached'}</strong>
            </div>
          `)}
          <div class="hide-controls" aria-label="Hide middleware scenarios">
            <button class="text-button" @click=${this.showAttached}>Attached</button>
            <button class="text-button" @click=${this.showEscaped}>Escape floating</button>
            <button class="text-button" @click=${this.hideReference}>Clip reference</button>
          </div>
        </div>
        <code>hide() + hide({strategy: 'escaped'})</code>
      </article>
    `;
  }

  private setViewport = (element?: Element) => {
    this.viewport = element as HTMLElement | null;
  };

  private showAttached = () => {
    this.setScenario('attached', 0);
  };

  private showEscaped = () => {
    this.setScenario('escaped', 0);
  };

  private hideReference = () => {
    this.setScenario('attached', 118);
  };

  private setScenario(mode: HideMode, scrollTop: number) {
    this.mode = mode;
    void this.updateComplete.then(() => {
      if (this.viewport) this.viewport.scrollTop = scrollTop;
      void this.floating.update();
    });
  }
}

customElements.define('lit-hide-example', LitHideExample);
