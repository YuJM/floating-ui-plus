import {html, LitElement} from 'lit';
import {
  arrow,
  autoPlacement,
  autoUpdate,
  flip,
  FloatingController,
  hide,
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
    return controller.position.isPositioned
      ? controller.position.placement
      : 'measuring';
  }

  protected initializeScroll(
    selector: string,
    position: {left?: number; top?: number},
    controller: FloatingController,
  ) {
    const viewport = this.querySelector<HTMLElement>(selector);
    if (!viewport) return;
    setTimeout(() => {
      if (position.left != null) viewport.scrollLeft = position.left;
      if (position.top != null) viewport.scrollTop = position.top;
      void controller.update();
    }, 0);
  }
}

class LitOffsetExample extends MiddlewareExample {
  private readonly zero = new FloatingController(this, () => ({
    open: true,
    placement: 'top',
    middleware: [offset(0)],
    whileElementsMounted: autoUpdate,
  }));
  private readonly ten = new FloatingController(this, () => ({
    open: true,
    placement: 'top',
    middleware: [offset(10)],
    whileElementsMounted: autoUpdate,
  }));

  render() {
    return html`
      <article class="middleware-card">
        <div class="middleware-title"><span>01</span><h3>offset</h3></div>
        <p>Compare the default position with a 10px gutter on the main axis.</p>
        <div class="mw-comparison" aria-label="Offset comparison">
          <div class="mw-static-stage">
            <span class="mw-demo-label">0px</span>
            <button class="mw-reference mw-reference-static" ${this.zero.reference()}>Reference</button>
            <div class="mw-panel mw-panel-cyan" ${this.zero.floating()}>Floating</div>
          </div>
          <div class="mw-static-stage">
            <span class="mw-demo-label">10px</span>
            <button class="mw-reference mw-reference-static" ${this.ten.reference()}>Reference</button>
            <div class="mw-panel mw-panel-cyan" ${this.ten.floating()}>Floating</div>
          </div>
        </div>
        <code>offset(0) / offset(10)</code>
      </article>
    `;
  }
}

class LitShiftExample extends MiddlewareExample {
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    placement: 'top',
    middleware: [shift({padding: 8})],
    whileElementsMounted: autoUpdate,
  }));

  protected firstUpdated() {
    this.initializeScroll('.mw-stage-shift', {left: 360}, this.floating);
  }

  render() {
    return html`
      <article class="middleware-card">
        <div class="middleware-title"><span>02</span><h3>shift</h3></div>
        <p>Scroll horizontally. The panel stays on top and shifts along the x-axis to remain visible.</p>
        <div class="mw-stage mw-stage-scroll-x mw-stage-shift" tabindex="0" aria-label="Horizontally scrollable shift demo">
          <span class="mw-scroll-hint">scroll horizontally</span>
          <div class="mw-track mw-track-wide">
            <button class="mw-reference mw-reference-shift" ${this.floating.reference()}>Reference</button>
            <div class="mw-panel mw-panel-lavender" ${this.floating.floating()}>Still on top</div>
          </div>
        </div>
        <code>shift({padding: 8})</code>
      </article>
    `;
  }
}

class LitFlipExample extends MiddlewareExample {
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    placement: 'bottom',
    middleware: [offset(8), flip({padding: 8})],
    whileElementsMounted: autoUpdate,
  }));

  protected firstUpdated() {
    this.initializeScroll('.mw-stage-flip', {top: 160}, this.floating);
  }

  render() {
    return html`
      <article class="middleware-card">
        <div class="middleware-title"><span>03</span><h3>flip</h3></div>
        <p>Scroll up. The preferred bottom placement flips to top when bottom space disappears.</p>
        <div class="mw-stage mw-stage-scroll-y mw-stage-flip" tabindex="0" aria-label="Vertically scrollable flip demo">
          <span class="mw-scroll-hint">scroll up</span>
          <div class="mw-track mw-track-tall">
            <button class="mw-reference mw-reference-flip" ${this.floating.reference()}>Reference</button>
            <div class="mw-panel mw-panel-coral" data-placement=${this.floating.position.placement} ${this.floating.floating()}>
              Final: ${this.placementLabel(this.floating)}
            </div>
          </div>
        </div>
        <code>placement: 'bottom', middleware: [flip()]</code>
      </article>
    `;
  }
}

class LitArrowExample extends MiddlewareExample {
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    placement: 'top',
    middleware: [
      offset(10),
      shift({padding: 8}),
      ...(this.arrowElement
        ? [arrow({element: this.arrowElement, padding: 8})]
        : []),
    ],
    whileElementsMounted: autoUpdate,
  }));

  protected firstUpdated() {
    this.initializeScroll('.mw-stage-arrow', {left: 410}, this.floating);
  }

  render() {
    return html`
      <article class="middleware-card">
        <div class="middleware-title"><span>04</span><h3>arrow</h3></div>
        <p>Scroll horizontally. The square arrow keeps pointing toward the reference center.</p>
        <div class="mw-stage mw-stage-scroll-x mw-stage-arrow" tabindex="0" aria-label="Horizontally scrollable arrow demo">
          <span class="mw-scroll-hint">scroll horizontally</span>
          <div class="mw-track mw-track-wide">
            <button class="mw-reference mw-reference-arrow" ${this.floating.reference()}>Reference</button>
            <div class="mw-panel mw-panel-ink mw-panel-arrow" ${this.floating.floating()}>
              Floating
              <i class="mw-arrow" ${this.floating.arrow()}></i>
            </div>
          </div>
        </div>
        <code>shift() → arrow({element})</code>
      </article>
    `;
  }

  private get arrowElement() {
    return this.querySelector<HTMLElement>('.mw-arrow');
  }
}

class LitSizeExample extends MiddlewareExample {
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    placement: 'bottom',
    middleware: [
      offset(8),
      size({
        padding: 8,
        apply({availableWidth, availableHeight, elements}) {
          Object.assign(elements.floating.style, {
            maxWidth: `${Math.max(0, availableWidth)}px`,
            maxHeight: `${Math.max(0, availableHeight)}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  }));

  protected firstUpdated() {
    this.initializeScroll('.mw-stage-size', {top: 210}, this.floating);
  }

  render() {
    return html`
      <article class="middleware-card">
        <div class="middleware-title"><span>05</span><h3>size</h3></div>
        <p>Scroll vertically. Available height constrains the panel, whose content remains scrollable.</p>
        <div class="mw-stage mw-stage-scroll-y mw-stage-size" tabindex="0" aria-label="Vertically scrollable size demo">
          <span class="mw-scroll-hint">scroll vertically</span>
          <div class="mw-track mw-track-size">
            <button class="mw-reference mw-reference-size" ${this.floating.reference()}>Reference</button>
            <div class="mw-panel mw-panel-paper mw-panel-size" ${this.floating.floating()}>
              <strong>Floating content</strong>
              <span>One</span><span>Two</span><span>Three</span><span>Four</span><span>Five</span>
            </div>
          </div>
        </div>
        <code>size({apply: set maxWidth / maxHeight})</code>
      </article>
    `;
  }
}

class LitAutoPlacementExample extends MiddlewareExample {
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    middleware: [autoPlacement({padding: 8})],
    whileElementsMounted: autoUpdate,
  }));

  protected firstUpdated() {
    this.initializeScroll(
      '.mw-stage-auto-placement',
      {top: 130},
      this.floating,
    );
  }

  render() {
    return html`
      <article class="middleware-card">
        <div class="middleware-title"><span>06</span><h3>autoPlacement</h3></div>
        <p>Scroll vertically. The panel continuously chooses the side with the most available space.</p>
        <div class="mw-stage mw-stage-scroll-y mw-stage-auto-placement" tabindex="0" aria-label="Vertically scrollable auto placement demo">
          <span class="mw-scroll-hint">scroll vertically</span>
          <div class="mw-track mw-track-tall">
            <button class="mw-reference mw-reference-auto" ${this.floating.reference()}>Reference</button>
            <div class="mw-panel mw-panel-mint mw-panel-auto" data-placement=${this.floating.position.placement} ${this.floating.floating()}>
              Final: ${this.placementLabel(this.floating)}
            </div>
          </div>
        </div>
        <code>autoPlacement({padding: 8})</code>
      </article>
    `;
  }
}

interface HideData {
  referenceHidden?: boolean;
  escaped?: boolean;
}

class LitHideMiddlewareExample extends MiddlewareExample {
  private readonly floating = new FloatingController(this, () => ({
    open: true,
    placement: 'bottom',
    middleware: [
      offset(8),
      hide(),
      hide({strategy: 'escaped'}),
    ],
    whileElementsMounted: autoUpdate,
  }));

  protected firstUpdated() {
    this.initializeScroll('.mw-stage-hide', {top: 160}, this.floating);
  }

  render() {
    const hideData = this.floating.position.middlewareData.hide as
      | HideData
      | undefined;
    const referenceHidden = Boolean(hideData?.referenceHidden);
    const escaped = Boolean(hideData?.escaped);
    const status = referenceHidden
      ? 'reference hidden'
      : escaped
        ? 'floating escaped'
        : 'attached';

    return html`
      <article class="middleware-card">
        <div class="middleware-title"><span>07</span><h3>hide</h3></div>
        <p>Scroll up. The panel dims after escaping, then hides when its reference is fully clipped.</p>
        <div class="mw-stage mw-stage-scroll-y mw-stage-hide" tabindex="0" aria-label="Vertically scrollable hide demo">
          <span class="mw-scroll-hint">scroll up</span>
          <div class="mw-track mw-track-tall">
            <button class="mw-reference mw-reference-hide" ${this.floating.reference()}>Reference</button>
            <div
              class="mw-panel mw-panel-paper mw-panel-hide"
              data-reference-hidden=${String(referenceHidden)}
              data-escaped=${String(escaped)}
              ${this.floating.floating()}
            >
              Floating
            </div>
          </div>
        </div>
        <div class="mw-state-readout" aria-live="polite">State: ${status}</div>
        <code>hide() + hide({strategy: 'escaped'})</code>
      </article>
    `;
  }
}

class LitInlineExample extends MiddlewareExample {
  private readonly boundingBox = new FloatingController(this, () => ({
    open: true,
    placement: 'top',
    middleware: [offset(8)],
    whileElementsMounted: autoUpdate,
  }));
  private readonly clientRects = new FloatingController(this, () => ({
    open: true,
    placement: 'top',
    middleware: [inline(), offset(8)],
    whileElementsMounted: autoUpdate,
  }));

  render() {
    return html`
      <article class="middleware-card">
        <div class="middleware-title"><span>08</span><h3>inline</h3></div>
        <p>Compare the detached bounding box with the relevant client rect of a wrapped inline anchor.</p>
        <div class="mw-inline-comparison" aria-label="Inline middleware comparison">
          <div class="mw-inline-case">
            <span class="mw-demo-label">without</span>
            <p>Text before <span class="mw-inline-reference" ${this.boundingBox.reference()}>a reference that wraps over multiple lines</span> after.</p>
            <div class="mw-panel mw-panel-paper mw-panel-inline" ${this.boundingBox.floating()}>Bounding box</div>
          </div>
          <div class="mw-inline-case">
            <span class="mw-demo-label">with inline()</span>
            <p>Text before <span class="mw-inline-reference" ${this.clientRects.reference()}>a reference that wraps over multiple lines</span> after.</p>
            <div class="mw-panel mw-panel-ink mw-panel-inline" ${this.clientRects.floating()}>Client rect</div>
          </div>
        </div>
        <code>inline() → offset(8)</code>
      </article>
    `;
  }
}

customElements.define('lit-offset-example', LitOffsetExample);
customElements.define('lit-shift-example', LitShiftExample);
customElements.define('lit-flip-example', LitFlipExample);
customElements.define('lit-arrow-example', LitArrowExample);
customElements.define('lit-size-example', LitSizeExample);
customElements.define('lit-auto-placement-example', LitAutoPlacementExample);
customElements.define('lit-hide-middleware-example', LitHideMiddlewareExample);
customElements.define('lit-inline-example', LitInlineExample);
