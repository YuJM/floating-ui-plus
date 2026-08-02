---
'@floating-ui-plus/web': minor
'@floating-ui-plus/web-components': minor
'@floating-ui-plus/vue': minor
---

Add a framework-neutral `FloatingPresenceStack` for bounded, pausable transient
surface lifecycles while renderers retain control of exit presence and styling.
Web Components add `<floating-presence-stack>` to render one declarative
template, bind record values, expose raw stack state, and remove clones after
their exit presence. Its `template[slot="content"]` contract matches
`floating-root`, and `top-layer="popover"` gives every clone a native manual
Popover lifecycle. Applications retain ARIA, focus, pause interaction,
layout, and styling policy. A zero timeout now correctly keeps a
framework-neutral stack record open until an explicit close.
The shared stack now exposes a renderer-neutral context contract and
`setOptions()`. Web Components accept partial code-first configuration through
`configure()` / the `options` property, and Vue adds
`useFloatingPresenceStack()` with matching actions and reactive state.
Vue also exposes `useFloatingTopLayer()` so fixed, renderer-owned surfaces can
use the same native Popover/Dialog lifecycle without introducing a framework
specific Toast component.
Native Dialog adapters now restore focus to the bound reference after close,
including backdrop dismissal; direct controller users can opt into the same
behavior with `setRestoreFocusElement(reference)`.
`<floating-composite item-selector="…">` can discover consumer-owned controls
directly, avoiding registration-only wrapper markup for dynamic templates.
Web Components now infer dialog query semantics for `<floating-query>` inside a
native `<dialog>`, while automatically generating option IDs when no prefix is
provided. List discovery now uses standard `aria-label` or text content rather
than the non-semantic `data-label` convenience attribute, and query/combobox
status output now discovers the standard `aria-live` region by default.
`<floating-results>` / `FloatingResults` are now the preferred declarative
search-phase renderers; `<floating-search>` / `FloatingSearch` remain
deprecated compatibility aliases. Web Components use one extensible
`<floating-results-status type="…">` element for idle, loading, error, and
empty phase templates; the earlier phase-specific element names remain
deprecated compatibility aliases.
Vue floating content now preserves an application-provided `id` instead of
overwriting it with a generated relationship ID.
