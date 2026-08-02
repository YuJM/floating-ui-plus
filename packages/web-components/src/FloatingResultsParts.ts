/**
 * Declarative phase markup for `<floating-results>`.
 *
 * These elements are inert template parts: their children are not displayed
 * until the nearest results renderer clones the matching phase into its output.
 */
export class FloatingResultsPartElement extends HTMLElement {
  prepareTemplate() {
    const existing = this.querySelector(':scope > template');
    if (existing instanceof HTMLTemplateElement) return existing;

    const template = document.createElement('template');
    while (this.firstChild) {
      template.content.append(this.firstChild);
    }
    this.append(template);
    return template;
  }

  connectedCallback() {
    this.prepareTemplate();
  }
}

/**
 * An inert template for one non-result search phase.
 *
 * Set `type` to `idle`, `loading`, `error`, or `empty`. The host intentionally
 * accepts other strings too, so a future search phase does not require a new
 * custom-element name.
 */
export class FloatingResultsStatusElement extends FloatingResultsPartElement {
  get type() {
    return this.getAttribute('type') ?? '';
  }

  set type(value: string) {
    this.setAttribute('type', value);
  }
}

/** @deprecated Use `<floating-results-status type="idle">`. */
export class FloatingResultsIdleElement extends FloatingResultsStatusElement {
  constructor() {
    super();
    this.type = 'idle';
  }
}
/** @deprecated Use `<floating-results-status type="loading">`. */
export class FloatingResultsLoadingElement extends FloatingResultsStatusElement {
  constructor() {
    super();
    this.type = 'loading';
  }
}
/** @deprecated Use `<floating-results-status type="error">`. */
export class FloatingResultsErrorElement extends FloatingResultsStatusElement {
  constructor() {
    super();
    this.type = 'error';
  }
}
/** @deprecated Use `<floating-results-status type="empty">`. */
export class FloatingResultsEmptyElement extends FloatingResultsStatusElement {
  constructor() {
    super();
    this.type = 'empty';
  }
}
export class FloatingResultsItemElement extends FloatingResultsPartElement {}
export class FloatingResultsMoreElement extends FloatingResultsPartElement {}

declare global {
  interface HTMLElementTagNameMap {
    'floating-results-status': FloatingResultsStatusElement;
    'floating-results-idle': FloatingResultsIdleElement;
    'floating-results-loading': FloatingResultsLoadingElement;
    'floating-results-error': FloatingResultsErrorElement;
    'floating-results-empty': FloatingResultsEmptyElement;
    'floating-results-item': FloatingResultsItemElement;
    'floating-results-more': FloatingResultsMoreElement;
  }
}
