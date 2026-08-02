---
'@floating-ui-plus/web': minor
'@floating-ui-plus/web-components': minor
'@floating-ui-plus/vue': minor
---

Add a framework-neutral `FloatingPresenceStack` for bounded, pausable transient
surface lifecycles while renderers retain control of exit presence and styling.
Web Components now infer dialog query semantics for `<floating-query>` inside a
native `<dialog>`, while automatically generating option IDs when no prefix is
provided. List discovery now uses standard `aria-label` or text content rather
than the non-semantic `data-label` convenience attribute, and query/combobox
status output now discovers the standard `aria-live` region by default.
Vue floating content now preserves an application-provided `id` instead of
overwriting it with a generated relationship ID.
