# `@floating-ui-plus/web`

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
} from '@floating-ui-plus/web';

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

## Declarative coordination and portal context

Tree registration, ordered collections, delay-group state, and cleanup follow
the Web controller lifecycle:

```ts
const parent = createFloating(parentOptions)
  .node({tree, id: 'parent'})
  .delayGroup({group, id: 'parent'});

const child = createFloating(childOptions)
  .node({id: 'child'})
  .delayGroup({id: 'child'})
  .setContextParent(parent.contextScope);
```

`contextScope` keeps live object references and can be attached to any
`EventTarget`. `createPortalNode({contextScope})` attaches the scope to the
portal and `removePortalNode()` releases it. This is synchronous and
framework-neutral; Lit and Vue only discover the parent scope and render into
the returned DOM node.

Use `BroadcastChannel` separately for opt-in cross-tab messages. It is not used
for portal context because controllers, functions, and DOM nodes must retain
their identity rather than be structured-cloned.

## Focus

`focusManager()` uses `focus-trap` for modal trapping and `tabbable` for
focusable ordering. Escape and outside presses remain the sole responsibility
of `dismiss()`, and Floating UI decides whether focus should return based on the
open-change reason.

Shadow-root traversal and positive `tabindex` are outside the supported focus
model. In a real browser, tabbable visibility uses `displayCheck: 'full'`; tests
may inject `displayCheck: 'none'` for JSDOM.

## Dependencies and compatibility

- `@floating-ui/dom`: direct runtime dependency for positioning and middleware.
- `@floating-ui/utils`: direct runtime dependency for DOM/platform utilities.
- `focus-trap`: modal trapping and the document-shared nested trap stack.
- `tabbable`: public focus-order utilities used outside focus-trap as well.

`focus-trap` also depends on the same compatible `tabbable` version, so package
managers deduplicate the installed module. The direct dependency is intentional
because this package imports `tabbable`'s public API itself.

The kernel preserves the repository browser targets: Chrome 73, Firefox 78,
Edge 79, Safari/iOS 12. `inert`, listener `AbortSignal`, and Popover APIs are
used only behind feature checks. Importing the package does not access `window`
or `document`.

## React parity checks

`react-parity-baseline.json` pins the audited `floating-ui/packages/react`
commit, root exports, and every interaction option. The parity test compares
the local Web API with that baseline and, when the sibling upstream checkout is
available, also detects upstream drift directly.

```sh
bun run --filter '@floating-ui-plus/web' test
bun run --filter '@floating-ui-plus/web' test:browser
```

The first command is the fast JSDOM/unit layer. `test:browser` is a separate,
headless Playwright Browser Mode layer. Its `realDom.browser.test.ts` fixture
uses provider-backed `userEvent` input and verifies native event ordering,
focus, `getBoundingClientRect()`, CSS sizing, and Floating UI coordinates in
the installed Chrome browser.

Use `test:browser:headed` only when a visible browser is useful for debugging.
