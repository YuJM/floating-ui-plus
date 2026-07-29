# `@floating-ui/web`

Framework-neutral Floating UI positioning, interactions, focus management, and
collection services for browser DOM.

`@floating-ui/dom` remains the small positioning package. Use this package when
you also need open-state coordination, native interactions, focus management,
portals, trees, lists, delay groups, or transitions.

## Pipeline

```ts
import {
  autoUpdate,
  createFloating,
  dismiss,
  flip,
  focus,
  hover,
  offset,
  role,
  shift,
} from '@floating-ui/web';

const floating = createFloating(() => ({
  open,
  onOpenChange(nextOpen) {
    open = nextOpen;
  },
  middleware: [offset(6), flip(), shift()],
  whileElementsMounted: autoUpdate,
})).pipe(hover(), focus(), dismiss(), role({role: 'tooltip'}));

floating.setReference(button);
floating.setFloating(tooltip);
floating.connect();
```

`pipe()` injects one context from left to right. Plugins clean up in reverse
order. An interaction with `enabled: false` does not install listeners or
effects. Call `disconnect()` for temporary removal and `destroy()` for final
cleanup.

## Focus

`focusManager()` uses `focus-trap` for modal trapping and `tabbable` for
focusable ordering. Escape and outside presses remain the sole responsibility
of `dismiss()`, and Floating UI decides whether focus should return based on the
open-change reason.

Shadow-root traversal and positive `tabindex` are outside the supported focus
model. In a real browser, tabbable visibility uses `displayCheck: 'full'`; tests
may inject `displayCheck: 'none'` for JSDOM.

## Dependencies and compatibility

- `@floating-ui/dom`: positioning and middleware.
- `focus-trap`: modal trapping and the document-shared nested trap stack.
- `tabbable`: public focus-order utilities used outside focus-trap as well.

`focus-trap` also depends on the same compatible `tabbable` version, so package
managers deduplicate the installed module. The direct dependency is intentional
because this package imports `tabbable`'s public API itself.

The kernel preserves the repository browser targets: Chrome 73, Firefox 78,
Edge 79, Safari/iOS 12. `inert`, listener `AbortSignal`, and Popover APIs are
used only behind feature checks. Importing the package does not access `window`
or `document`.
