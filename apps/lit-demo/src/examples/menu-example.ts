import {html, LitElement, nothing} from 'lit';
import {ref} from 'lit/directives/ref.js';
import {
  autoUpdate,
  click,
  dismiss,
  flip,
  FloatingController,
  listNavigation,
  offset,
  role,
  shift,
  typeahead,
} from '@floating-ui/lit';

const labels = ['North star', 'Orbit map', 'Signal log', 'Field notes'];

class LitMenuExample extends LitElement {
  static properties = {
    open: {state: true},
    activeIndex: {state: true},
  };
  open = false;
  activeIndex: number | null = null;

  private readonly elements = {current: [] as Array<HTMLElement | null>};
  private readonly text = {current: labels as Array<string | null>};
  private readonly itemRefs = labels.map((_, index) => (element?: Element) => {
    this.elements.current[index] = (element as HTMLElement) || null;
  });

  private readonly floating = new FloatingController(this, () => ({
    open: this.open,
    onOpenChange: (open) => {
      this.open = open;
      if (!open) this.activeIndex = null;
      this.emitAction(open ? 'Menu opened · arrows and typeahead are active' : 'Menu closed');
    },
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({padding: 18})],
    whileElementsMounted: autoUpdate,
  })).pipe(
    click(),
    dismiss(),
    role({role: 'menu'}),
    listNavigation(() => ({
      listRef: this.elements,
      activeIndex: this.activeIndex,
      selectedIndex: 0,
      loop: true,
      onNavigate: (index) => {
        this.activeIndex = index;
      },
    })),
    typeahead(() => ({
      listRef: this.text,
      activeIndex: this.activeIndex,
      onMatch: (index) => {
        this.activeIndex = index;
        this.elements.current[index]?.focus({preventScroll: true});
      },
    })),
  );

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <article class="demo-card menu-card">
        <div class="card-top"><span class="number">C</span><span class="chip">roving focus</span></div>
        <h3>Command menu</h3>
        <p>Arrow keys, looping, and typeahead share one list registry. Try typing “signal”.</p>
        <div class="card-action">
          <button class="dark-button" ${this.floating.reference()}>Open navigator <span aria-hidden="true">⌄</span></button>
          ${this.open
            ? this.floating.portal(html`
                <div class="menu-panel" ${this.floating.floating()}>
                  <div class="menu-heading">Jump to a field</div>
                  ${labels.map((label, index) => html`
                    <button
                      class="menu-item"
                      role="menuitem"
                      tabindex=${this.activeIndex === index ? 0 : -1}
                      data-active=${this.activeIndex === index ? 'true' : 'false'}
                      ${ref(this.itemRefs[index])}
                      ${this.floating.item({active: this.activeIndex === index, index, label, value: label})}
                      @click=${(event: Event) => this.select(index, event)}
                    >
                      <span>${label}</span><kbd>${index + 1}</kbd>
                    </button>
                  `)}
                </div>
              `)
            : nothing}
        </div>
        <code>listNavigation() + typeahead()</code>
      </article>
    `;
  }

  private select(index: number, event: Event) {
    this.activeIndex = index;
    this.emitAction(`${labels[index]} selected`);
    this.floating.context.onOpenChange(false, event, 'click');
  }

  private emitAction(message: string) {
    this.dispatchEvent(new CustomEvent('floating-demo-action', {
      detail: message,
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('lit-menu-example', LitMenuExample);
