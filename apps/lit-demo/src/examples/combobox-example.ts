import {html, LitElement, nothing} from 'lit';
import {
  autoUpdate,
  createFuzzySearchSource,
  dismiss,
  flip,
  FloatingController,
  listNavigation,
  offset,
  role,
  SearchController,
  shift,
} from '@floating-ui-plus/lit';

import {
  multilingualDestinations,
  multilingualSearchKeys,
  multilingualSearchPrompts,
  type MultilingualDestination,
} from '../../../shared/multilingual-destinations';

const source = createFuzzySearchSource(multilingualDestinations, {
  keys: multilingualSearchKeys,
  threshold: 0.35,
});

class LitComboboxExample extends LitElement {
  private open = false;
  private activeIndex: number | null = null;
  private selectedItem: MultilingualDestination | null = null;

  private readonly search = new SearchController(this, {
    source,
    getItemKey: (item: MultilingualDestination) => item.id,
    debounceMs: 0,
  });

  private readonly floating = new FloatingController(this, () => ({
    open: this.open,
    onOpenChange: (open) => this.setOpen(open),
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({padding: 18})],
    whileElementsMounted: autoUpdate,
  })).pipe(
    dismiss(),
    role(() => ({
      role: 'combobox',
      activeIndex: this.activeIndex,
      getItemId: (index) => this.optionId(index),
    })),
    listNavigation(() => ({
      listRef: this.floating.listElements,
      activeIndex: this.activeIndex,
      virtual: true,
      loop: true,
      allowEscape: true,
      focusItemOnOpen: false,
      onNavigate: (index) => this.setActiveIndex(index),
    })),
  );

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <article class="demo-card combobox-card">
        <div class="card-top">
          <span class="number">F</span>
          <span class="chip">composed in Lit</span>
        </div>
        <h3>Multilingual combobox</h3>
        <p>Search by city, country, local script, alias, or forgiving typo.</p>

        <div class="combobox-shell">
          <label class="combobox-label" for="lit-destination-search">
            Destination
          </label>
          <input
            id="lit-destination-search"
            class="combobox-input"
            type="text"
            autocomplete="off"
            spellcheck="false"
            aria-describedby="lit-combobox-hints lit-combobox-status"
            placeholder="Search city or country…"
            .value=${this.search.query}
            ${this.floating.reference()}
            @focus=${() => this.setOpen(true)}
            @input=${this.handleInput}
            @compositionstart=${() => this.search.startComposition()}
            @compositionend=${(event: CompositionEvent) =>
              this.search.endComposition(
                (event.currentTarget as HTMLInputElement).value,
              )}
            @keydown=${this.handleKeydown}
          />
          <span class="combobox-icon" aria-hidden="true">⌕</span>
        </div>

        ${this.open
          ? this.floating.portal(html`
              <div
                class="combobox-popup"
                data-testid="lit-combobox-popup"
                ${this.floating.floating()}
              >
                ${this.search.loading
                  ? html`
                      <div
                        class="combobox-empty"
                        role="option"
                        aria-disabled="true"
                      >
                        Searching…
                      </div>
                    `
                  : this.search.error
                    ? html`
                        <div
                          class="combobox-empty"
                          role="option"
                          aria-disabled="true"
                        >
                          Search failed.
                        </div>
                      `
                    : this.search.items.length
                      ? this.search.items.map(
                          (item, index) => html`
                            <div
                              id=${this.optionId(index)}
                              class="combobox-option"
                              data-active=${this.activeIndex === index
                                ? 'true'
                                : 'false'}
                              ${this.floating.item({
                                active: this.activeIndex === index,
                                selected:
                                  this.selectedItem?.id === item.id,
                                index,
                                label: item.label,
                                value: item,
                              })}
                              @mousedown=${(event: MouseEvent) =>
                                event.preventDefault()}
                              @click=${() => this.select(item)}
                            >
                              <span>
                                <strong>${item.label}</strong>
                                <small>${item.region}</small>
                              </span>
                              <span class="language-badge">
                                ${item.language}
                              </span>
                            </div>
                          `,
                        )
                      : html`
                          <div
                            class="combobox-empty"
                            role="option"
                            aria-disabled="true"
                          >
                            No destination found for “${this.search.query}”
                          </div>
                        `}
              </div>
            `)
          : nothing}

        <div id="lit-combobox-hints" class="combobox-hints">
          ${multilingualSearchPrompts.map(
            ([sample, destination]) => html`
              <button
                type="button"
                @click=${() => this.setQuery(sample)}
              >
                <code>${sample}</code><span>→ ${destination}</span>
              </button>
            `,
          )}
        </div>
        <p id="lit-combobox-status" class="sr-only" aria-live="polite">
          ${this.statusMessage}
        </p>
        <code>SearchController + FloatingController + listNavigation()</code>
      </article>
    `;
  }

  private optionId(index: number) {
    return `lit-destination-option-${this.search.items[index]?.id ?? index}`;
  }

  private setOpen(open: boolean) {
    this.open = open;
    if (!open) this.activeIndex = null;
    this.requestUpdate();
  }

  private setActiveIndex(index: number | null) {
    this.activeIndex = index;
    this.requestUpdate();
  }

  private setQuery(query: string) {
    this.activeIndex = null;
    this.open = true;
    this.search.setQuery(query);
    this.requestUpdate();
  }

  private select(item: MultilingualDestination) {
    this.selectedItem = item;
    this.search.setQuery(item.label);
    this.activeIndex = null;
    this.open = false;
    this.emitAction(`${item.label} selected`);
    this.requestUpdate();
  }

  private get statusMessage() {
    if (!this.open) {
      return this.selectedItem
        ? `${this.selectedItem.label} selected`
        : 'Destination suggestions closed';
    }
    return this.search.items.length
      ? `${this.search.items.length} destinations available`
      : `No destinations found for ${this.search.query}`;
  }

  private handleInput(event: InputEvent) {
    this.setQuery((event.currentTarget as HTMLInputElement).value);
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || this.activeIndex == null) return;
    const item = this.search.items[this.activeIndex];
    if (!item) return;
    event.preventDefault();
    this.select(item);
  }

  private emitAction(message: string) {
    this.dispatchEvent(
      new CustomEvent('floating-demo-action', {
        detail: message,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

customElements.define('lit-combobox-example', LitComboboxExample);
