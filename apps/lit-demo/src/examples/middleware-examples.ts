import {html, LitElement} from 'lit';
import {ref} from 'lit/directives/ref.js';
import {
  arrow,
  autoPlacement,
  autoUpdate,
  flip,
  FloatingController,
  inline,
  offset,
  shift,
  size,
} from '@floating-ui/lit';

abstract class MiddlewareExample extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  protected placementLabel(controller: FloatingController) {
    return controller.position.isPositioned ? controller.position.placement : 'measuring';
  }
}

class LitOffsetExample extends MiddlewareExample {
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    placement: 'top',
    middleware: [offset(28)],
    whileElementsMounted: autoUpdate,
  }));

  render() {
    return html`<article class="middleware-card"><div class="middleware-title"><span>01</span><h3>offset</h3></div><p>Creates deliberate breathing room along the placement axis.</p><div class="mw-stage mw-stage-scroll-y" tabindex="0" aria-label="Vertically scrollable offset viewport"><button class="mw-reference" ${this.floating.reference()}>Reference</button><div class="mw-panel mw-panel-cyan" ${this.floating.floating()}>28px gap</div></div><code>offset(28)</code></article>`;
  }
}

class LitShiftExample extends MiddlewareExample {
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    placement: 'bottom-start',
    middleware: [offset(8), shift({padding: 12})],
    whileElementsMounted: autoUpdate,
  }));

  render() {
    return html`<article class="middleware-card"><div class="middleware-title"><span>02</span><h3>shift</h3></div><p>Keeps a panel inside its clipping boundary near an edge.</p><div class="mw-stage mw-stage-scroll-x" tabindex="0" aria-label="Horizontally scrollable shift viewport"><button class="mw-reference mw-reference-edge" ${this.floating.reference()}>At edge</button><div class="mw-panel mw-panel-lavender" ${this.floating.floating()}>Shifted in view</div></div><code>shift({padding: 12})</code></article>`;
  }
}

class LitFlipExample extends MiddlewareExample {
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    placement: 'bottom',
    middleware: [offset(8), flip({padding: 8})],
    whileElementsMounted: autoUpdate,
  }));

  render() {
    return html`<article class="middleware-card"><div class="middleware-title"><span>03</span><h3>flip</h3></div><p>The preferred bottom placement has no space, so it reverses.</p><div class="mw-stage mw-stage-scroll-y" tabindex="0" aria-label="Vertically scrollable flip viewport"><button class="mw-reference mw-reference-bottom" ${this.floating.reference()}>Near bottom</button><div class="mw-panel mw-panel-coral" ${this.floating.floating()}>Final: ${this.placementLabel(this.floating)}</div></div><code>flip({padding: 8})</code></article>`;
  }
}

class LitArrowExample extends MiddlewareExample {
  private arrowElement: HTMLElement | null = null;
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    placement: 'top',
    middleware: [
      offset(12),
      ...(this.arrowElement ? [arrow({element: this.arrowElement, padding: 8})] : []),
    ],
    whileElementsMounted: autoUpdate,
  }));

  render() {
    return html`<article class="middleware-card"><div class="middleware-title"><span>04</span><h3>arrow</h3></div><p>Places a square arrow on its dynamic axis toward the reference.</p><div class="mw-stage mw-stage-scroll-x mw-stage-arrow" tabindex="0" aria-label="Horizontally scrollable arrow viewport"><button class="mw-reference" ${this.floating.reference()}>Reference</button><div class="mw-panel mw-panel-ink" ${this.floating.floating()}>Points here <i class="mw-arrow" ${ref(this.setArrow)} ${this.floating.arrow()}></i></div></div><code>arrow({element, padding: 8})</code></article>`;
  }

  private setArrow = (element?: Element) => {
    this.arrowElement = element as HTMLElement | null;
    this.requestUpdate();
  };
}

class LitSizeExample extends MiddlewareExample {
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    placement: 'bottom-start',
    middleware: [
      offset(8),
      size({
        apply({rects, elements, availableHeight}) {
          Object.assign(elements.floating.style, {
            minWidth: `${rects.reference.width}px`,
            maxHeight: `${Math.max(0, availableHeight)}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  }));

  render() {
    return html`<article class="middleware-card"><div class="middleware-title"><span>05</span><h3>size</h3></div><p>Uses the lifecycle <code>apply()</code> callback to match reference width.</p><div class="mw-stage mw-stage-scroll-x mw-stage-size" tabindex="0" aria-label="Horizontally scrollable size viewport"><button class="mw-reference mw-reference-wide" ${this.floating.reference()}>Wide reference</button><div class="mw-panel mw-panel-paper" ${this.floating.floating()}>Same minimum width</div></div><code>size({apply: matchReferenceWidth})</code></article>`;
  }
}

class LitAutoPlacementExample extends MiddlewareExample {
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    middleware: [autoPlacement({padding: 10})],
    whileElementsMounted: autoUpdate,
  }));

  render() {
    return html`<article class="middleware-card"><div class="middleware-title"><span>06</span><h3>autoPlacement</h3></div><p>Chooses the side with the most available space, rather than preserving a preference.</p><div class="mw-stage mw-stage-scroll-y" tabindex="0" aria-label="Vertically scrollable auto placement viewport"><button class="mw-reference mw-reference-corner" ${this.floating.reference()}>Corner</button><div class="mw-panel mw-panel-mint" ${this.floating.floating()}>Final: ${this.placementLabel(this.floating)}</div></div><code>autoPlacement({padding: 10})</code></article>`;
  }
}

class LitInlineExample extends MiddlewareExample {
  private point: {x: number; y: number} | null = null;
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    placement: 'top',
    middleware: [
      inline(() => this.point || {}),
      offset(8),
      flip({padding: 8}),
    ],
    whileElementsMounted: autoUpdate,
  }));

  render() {
    return html`<article class="middleware-card"><div class="middleware-title"><span>08</span><h3>inline</h3></div><p>Move over either line: the matching client rect becomes the anchor.</p><div class="mw-stage mw-stage-scroll-x mw-stage-inline" tabindex="0" aria-label="Horizontally scrollable inline viewport"><p>Hover this <span class="mw-inline-reference" ${this.floating.reference()} @mouseenter=${this.trackPoint} @mousemove=${this.trackPoint}>two-line inline reference that wraps naturally</span> to choose its correct rect.</p><div class="mw-panel mw-panel-paper" ${this.floating.floating()}>Chosen inline rect</div></div><code>inline({x, y}) → offset() → flip()</code></article>`;
  }

  private trackPoint = (event: MouseEvent) => {
    this.point = {x: event.clientX, y: event.clientY};
    void this.floating.update();
  };
}

customElements.define('lit-offset-example', LitOffsetExample);
customElements.define('lit-shift-example', LitShiftExample);
customElements.define('lit-flip-example', LitFlipExample);
customElements.define('lit-arrow-example', LitArrowExample);
customElements.define('lit-size-example', LitSizeExample);
customElements.define('lit-auto-placement-example', LitAutoPlacementExample);
customElements.define('lit-inline-example', LitInlineExample);
