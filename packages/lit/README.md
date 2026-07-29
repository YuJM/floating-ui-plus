# `@floating-ui-plus/lit`

Light DOM ReactiveController and directives for `@floating-ui-plus/web`.

## Required Light DOM setup

```ts
import {LitElement, html, nothing} from 'lit';
import {
  autoUpdate,
  dismiss,
  flip,
  FloatingController,
  focus,
  hover,
  offset,
  role,
  shift,
} from '@floating-ui-plus/lit';

class FloatingTooltip extends LitElement {
  static properties = {open: {state: true}};
  open = false;

  protected createRenderRoot() {
    return this;
  }

  private floating = new FloatingController(this, () => ({
    open: this.open,
    onOpenChange: (open) => {
      this.open = open;
    },
    middleware: [offset(6), flip(), shift()],
    whileElementsMounted: autoUpdate,
  })).pipe(hover(), focus(), dismiss(), role({role: 'tooltip'}));

  render() {
    return html`
      <button ${this.floating.reference()}>Help</button>
      ${this.open
        ? html`<div ${this.floating.floating()}>Tooltip</div>`
        : nothing}
    `;
  }
}
```

The supported contract is `host.renderRoot === host`. Development builds warn
for a `ShadowRoot`; shadow-root focus traversal is not supported. The package
does not register custom elements and does not own your markup.

`reference()`, `floating()`, `item()`, and `arrow()` are element directives.
They add native interactions and ARIA without replacing consumer event
listeners or classes. `floating()` only controls `position`, coordinates,
transform, and `will-change`; all other inline styles are preserved.

## Common patterns

- Tooltip: `hover()`, `focus()`, `dismiss()`, `role({role: 'tooltip'})`.
- Popover: `click()`, `dismiss()`, `role({role: 'dialog'})`.
- Modal: add `focusManager({modal: true})` and render
  `floatingOverlay(content, {lockScroll: true})`.
- Menu/listbox/combobox: combine `FloatingList`, `listNavigation()`,
  `typeahead()`, `item()`, and the matching `role()`.
- Nested menus: register controllers in `FloatingTree`; an explicitly supplied
  tree/list/group takes precedence over the bubbling Light DOM Context Protocol.
- Portal: render `${this.floating.portal(template)}`. Use
  `{topLayer: 'popover'}` only to opt into native Popover; unsupported browsers
  keep the body portal fallback.

Lit 2.7 and Lit 3 are peer-supported. Runtime browser support follows Lit's own
support policy. Imports and initial rendering are SSR-safe; DOM connection is
deferred to hydration/controller connection.
