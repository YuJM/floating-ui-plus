# `@floating-ui-plus/lit`

Light DOM ReactiveController and directives for `@floating-ui-plus/web`.

## Placement constants

`PLACEMENT` avoids repeating placement string literals, while `PLACEMENTS`
provides all 12 typed values in clockwise visual order:

```ts
import {FloatingController, PLACEMENT, PLACEMENTS} from '@floating-ui-plus/lit';

private floating = new FloatingController(this, {
  placement: PLACEMENT.BOTTOM_START,
});

private choices = PLACEMENTS;
```

String literals such as `'bottom-start'` remain supported.

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

## Declarative services

`FloatingController` delegates tree, list, delay-group, and context ownership
to the Web coordinator. The Lit adapter only maps reactive-controller hooks to
`connect()`, `refresh()`, and `disconnect()`, so there is no lifecycle
boilerplate in the host:

```ts
private tree = new FloatingTree();

private root = new FloatingController(this, rootOptions)
  .node({tree: this.tree, id: 'root'})
  .pipe(click(), dismiss(), role({role: 'menu'}));

private child = new FloatingController(this, childOptions)
  .node({tree: this.tree, id: 'child', parentId: 'root'})
  .pipe(hover(), dismiss(), role({role: 'menu'}));
```

`listElements`, `listLabels`, and `listValues` are live `{current}` adapters
derived from `item()` registrations. They can be passed directly to
`listNavigation()` and `typeahead()` without separate `ref()` arrays.

Use `.delayGroup({group, id})` to synchronize open state with a shared
`DelayGroup`, or `.withList(list)` to supply an explicit list. Explicit
services take precedence over inherited Light DOM context.

## Portal context bridge

`.provideContext(key, value)` exposes a value from the host and every portal
owned by the controller:

```ts
private floating = new FloatingController(this, options)
  .provideContext('commands', this.commands);
```

Descendant custom elements can call `requestFloatingContext()` after being
rendered through `floating.portal()`. The Web `FloatingContextScope` is
attached to both the host and portal node; Lit only renders into that node.
Tree, node, list, and delay-group contexts therefore preserve logical service
ownership when DOM moves to `body`.

Portal roots may be resolved lazily. Web owns the pending node and context
lifecycle, while the Lit directive refreshes it from `update()` and restores it
from `reconnected()`:

```ts
this.floating.portal(content, {
  root: () => document.querySelector<HTMLElement>('#overlay-root'),
});
```

Until the resolver returns an element, no portal node is created. Disconnecting
the host removes owned nodes and reconnecting the host recreates them.

## Transition and modal directives

`transition()` keeps content mounted for its close duration and gives the
template control of markup:

```ts
${this.floating.transition(
  this.open,
  ({status, styles}) => html`
    <div
      data-status=${status}
      style=${styleMap(styles)}
      ${this.floating.floating()}
    >
      Tooltip
    </div>
  `,
  {
    duration: {open: 120, close: 80},
    initial: {opacity: '0'},
    open: {opacity: '1'},
    close: {opacity: '0'},
  },
)}
```

`modal()` combines the controller portal, overlay scroll lock, and lazily
installed focus manager:

```ts
${this.open
  ? this.floating.modal(
      html`<section ${this.floating.floating()}>Modal content</section>`,
      {
        focus: {initialFocus: 0, returnFocus: true},
        overlay: {className: 'app-overlay'},
      },
    )
  : nothing}
```

## Common patterns

- Tooltip: `hover()`, `focus()`, `dismiss()`, `role({role: 'tooltip'})`.
- Popover: `click()`, `dismiss()`, `role({role: 'dialog'})`.
- Modal: use `controller.modal(content, options)`; lower-level
  `focusManager()` and `floatingOverlay()` remain available.
- Menu/listbox/combobox: combine `FloatingList`, `listNavigation()`,
  `typeahead()`, `item()`, and the matching `role()`.
- Nested menus: call `.node({tree, id, parentId})`; registration and cleanup
  follow the controller lifecycle.
- Portal: render `${this.floating.portal(template)}`. Use
  `{topLayer: 'popover'}` only to opt into native Popover; unsupported browsers
  keep the body portal fallback.

Lit 2.7 and Lit 3 are peer-supported. Runtime browser support follows Lit's own
support policy. Imports and initial rendering are SSR-safe; DOM connection is
deferred to hydration/controller connection.
