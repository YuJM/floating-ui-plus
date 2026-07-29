# `@floating-ui-plus/web`

Framework-neutral Floating UI positioning, interactions, focus management, and
collection services for browser DOM.

`@floating-ui/dom` remains the small positioning package. Use this package when
you also need open-state coordination, native interactions, focus management,
portals, trees, lists, delay groups, or transitions.

## Placement constants

Use `PLACEMENT` when an application prefers discoverable constants over string
literals. `PLACEMENTS` contains all 12 values in clockwise visual order and is
useful for controls, documentation, and tests.

```ts
import {
  createFloating,
  PLACEMENT,
  PLACEMENTS,
} from '@floating-ui-plus/web';

const floating = createFloating({
  placement: PLACEMENT.BOTTOM_START,
});

for (const placement of PLACEMENTS) {
  console.log(placement);
}
```

Both exports retain Floating UI's `Placement` literal types, so constants and
ordinary values such as `'bottom-start'` remain interoperable.

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
`EventTarget`. `createPortalBridge({contextScope, target})` owns pending target
resolution and context attachment without rendering or moving DOM. A renderer
calls `connect()`, `refresh()`, `disconnect()`, and `destroy()` from its own
lifecycle:

```ts
const portal = createPortalBridge({
  contextScope,
  target: () => document.querySelector('#portal-content'),
});

portal.connect(); // pending when the target is not available yet
portal.refresh(); // resolves and attaches after a renderer commit
```

`createPortalNodeController({root: () => portalRoot})` adds owned node creation,
root replacement, reuse, and cleanup for Lit-style renderers. Its status is
`detached`, `pending`, `attached`, or `destroyed`. Vue retains Teleport and
Suspense ownership; Lit retains template rendering.

`floating.presence.set('mounted' | 'leaving' | 'unmounted')` lets a renderer
signal its real element lifecycle, and `floating.whenPositioned()` resolves
after a mounted surface receives its next positioned update.

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
